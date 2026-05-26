// Extract chapter PDF — Actions & Tags snippet for Zotero 8
// Spec: docs/superpowers/specs/2026-04-07-zotero-chapter-extractor-design.md
//
// Setup: register in Actions & Tags as "Extract chapter PDF"
//   Trigger: Item context menu  |  Operation: Custom script

const AUTO_OPEN     = true;   // set false to skip auto-opening extracted PDF
const UV            = '/opt/homebrew/bin/uv';
const PDFLABELS     = '/Users/glenn/dotfiles/bin/pdflabels';
const PAGELABEL     = '/Users/glenn/dotfiles/bin/pagelabel';
const PDFPRUNE_TOC  = '/Users/glenn/dotfiles/bin/pdfprune-outline';
const QPDF          = '/opt/homebrew/bin/qpdf';

// ── helpers ──────────────────────────────────────────────────────────────────

function showToast(msg, headline = 'Extract Chapter PDF', ms = 3000) {
    const pw = new Zotero.ProgressWindow({ closeOnClick: true });
    pw.show();
    pw.changeHeadline(headline);
    pw.addDescription(msg);
    pw.startCloseTimer(ms);
}

function dbg(msg) { Zotero.debug(`[extract-chapter] ${msg}`); }
function err(msg) { Zotero.log(`[extract-chapter] ${msg}`); }

function parsePages(raw) {
    let s = raw.trim();
    s = s.replace(/^pages?\.*\s*/i, '').replace(/^pp?\.\s*/i, '');
    s = s.replace(/[\u2013\u2014]/g, '-');   // en-dash, em-dash → hyphen
    s = s.replace(/\s*-\s*/, '-');
    if (/^\w+$/.test(s))       return { start: s, end: s };   // single page
    if (/^\w+-\w+$/.test(s)) {
        const [start, end] = s.split('-');
        return { start, end };
    }
    return null;
}

const subprocess = Zotero.Utilities.Internal.subprocess.bind(Zotero.Utilities.Internal);
const exec       = Zotero.Utilities.Internal.exec.bind(Zotero.Utilities.Internal);

// ── main ─────────────────────────────────────────────────────────────────────

try {

if (!item) { dbg('aborted: item is null'); return; }

if (item.itemType !== 'bookSection') {
    dbg(`aborted: itemType=${item.itemType}, id=${item.id}`);
    showToast('Extract chapter PDF only works on book section items');
    return;
}

const rawPages = item.getField('pages').trim();
if (!rawPages) {
    dbg(`aborted: pages field empty on item ${item.id}`);
    showToast('Pages field is empty — cannot extract');
    return;
}

const parsed = parsePages(rawPages);
if (!parsed) {
    dbg(`aborted: unparseable pages='${rawPages}'`);
    showToast(`Could not parse Pages field: ${rawPages}`);
    return;
}
const { start, end } = parsed;
dbg(`item=${item.id} pages='${rawPages}' parsed=${start}-${end}`);

// Find the source book: first try Zotero parent item, then fall back to Related items.
// In Zotero, book sections are often standalone items linked via Related, not nested children.
let parent = item.parentItemID ? Zotero.Items.get(item.parentItemID) : null;

if (!parent) {
    const relatedKeys = item.relatedItems;  // array of item keys
    for (const key of relatedKeys) {
        const rel = Zotero.Items.getByLibraryAndKey(item.libraryID, key);
        if (rel && rel.itemType === 'book') {
            parent = rel;
            break;
        }
    }
}

if (!parent) {
    dbg(`aborted: no parent book for item ${item.id}`);
    showToast('No book found — link the book as a parent or Related item');
    return;
}

const bookPdf = await parent.getBestAttachment();
if (!bookPdf || bookPdf.attachmentContentType !== 'application/pdf') {
    dbg(`aborted: parent ${parent.id} has no PDF attachment`);
    showToast('Parent book has no PDF attachment');
    return;
}

const existingPdfs = item.getAttachments()
    .map(id => Zotero.Items.get(id))
    .filter(a => a && a.attachmentContentType === 'application/pdf');
if (existingPdfs.length > 1) {
    dbg(`aborted: ${existingPdfs.length} PDFs already on ${item.id}`);
    showToast('Multiple PDFs already attached — remove extras manually before re-extracting');
    return;
}
if (existingPdfs.length === 1) {
    await existingPdfs[0].eraseTx();
}

const bookPdfPath = await bookPdf.getFilePathAsync();
dbg(`parent=${parent.id} bookPdf=${bookPdfPath}`);

// Resolve both labels to physical page numbers. If the PDF has no /PageLabels,
// pdflabels fails; attempt to add them via bin/pagelabel, then retry.
let physStart, physEnd;
{
    const resolveLabels = () =>
        subprocess(UV, ['run', '--script', PDFLABELS, start, end, bookPdfPath]);

    let out = await resolveLabels();
    let trimmed = out.trim();
    let parts = trimmed.split(/\s+/);

    if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) {
        dbg(`pdflabels failed ('${trimmed}'), attempting pagelabel`);
        showToast('No page labels — adding…', 'Extract Chapter PDF', 20000);

        let plOut = '';
        try {
            plOut = await subprocess('/bin/bash', ['-c',
                `PATH="/opt/homebrew/bin:$PATH" "${UV}" run --quiet --script "${PAGELABEL}" --force "${bookPdfPath}" 2>&1; echo "EXITCODE:$?"`]);
        } catch (e) {
            plOut = `EXITCODE:1\n${e.message || String(e)}`;
        }

        const plLines = (plOut || '').trim().split('\n');
        const exitLine = plLines.find(l => l.startsWith('EXITCODE:')) || 'EXITCODE:1';
        const _plCodeRaw = parseInt(exitLine.replace('EXITCODE:', ''), 10);
        const plCode   = isNaN(_plCodeRaw) ? 1 : _plCodeRaw;
        const plMsg    = plLines.filter(l => !l.startsWith('EXITCODE:')).join('\n').trim();
        err(`pagelabel exit=${plCode} output='${plMsg}'`);

        if (plCode !== 0) {
            if (plCode === 2) {
                const m = plMsg.match(/refused,\s*(.+)$/m);
                const reason = m ? m[1].trim() : (plMsg.split('\n').pop() || 'refused');
                err(`pagelabel refused: ${reason}`);
                showToast(`Labels refused: ${reason}`);
            } else {
                err(`pagelabel unexpected error: ${plMsg}`);
                showToast(`Labels error: ${plMsg || 'unknown'}`);
            }
            return;
        }

        // pagelabel succeeded — retry pdflabels
        out     = await resolveLabels();
        trimmed = out.trim();
        parts   = trimmed.split(/\s+/);

        if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d+$/.test(parts[1])) {
            dbg(`pdflabels retry failed: '${trimmed}'`);
            showToast(trimmed || `Could not resolve '${start}'–'${end}' after adding labels`);
            return;
        }
    }

    [physStart, physEnd] = parts;
}
dbg(`pdflabels: '${start}'-'${end}' -> '${physStart}'-'${physEnd}'`);

// Compute output path beside source PDF
const outPath = bookPdfPath.replace(/\.pdf$/i, `_${start}-${end}.pdf`);
dbg(`qpdf out=${outPath}`);

// Extract pages with qpdf. qpdf exits 3 on success-with-warnings (xref issues);
// the output file IS created. Use IOUtils.exists below as the real success check,
// matching the pattern used in the "rm p1" rule.
try {
    await exec(QPDF, [bookPdfPath, '--pages', bookPdfPath, `${physStart}-${physEnd}`, '--', outPath]);
    dbg('qpdf exec returned without error');
} catch (e) {
    dbg(`qpdf exec threw (may be exit-3 warning): ${e.message || String(e)}`);
}

if (!await IOUtils.exists(outPath)) {
    // Re-run via subprocess to surface stderr for diagnostics.
    let stderrMsg = '';
    try {
        stderrMsg = await subprocess(QPDF, [bookPdfPath, '--pages', bookPdfPath, `${physStart}-${physEnd}`, '--', outPath]);
    } catch (_) {}
    err(`qpdf produced no output. physStart=${physStart} physEnd=${physEnd} stderr=${stderrMsg}`);
    showToast(`qpdf produced no output (pp ${physStart}-${physEnd}). See Error Console.`);
    return;
}

// Prune the outline so the sidebar TOC reflects only the extracted chapter.
// qpdf copies the source outline verbatim, leaving dangling entries; this
// rewrites them to keep only entries inside the page range, remapped.
// Non-fatal: a stale outline does not invalidate the chapter PDF.
try {
    await exec(UV, ['run', '--script', PDFPRUNE_TOC, bookPdfPath, outPath, String(physStart), String(physEnd)]);
} catch (e) {
    Zotero.debug(`pdfprune-outline failed (non-fatal): ${e.message || String(e)}`);
}

// Import into Zotero with parent-metadata filename
const fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(item);
const newAttachment = await Zotero.Attachments.importFromFile({
    file: outPath,
    parentItemID: item.id,
    contentType: 'application/pdf',
    fileBaseName: fileBaseName,
});

// Clean up temp file (lives next to the parent book's PDF in its storage folder)
try {
    await IOUtils.remove(outPath);
    dbg(`removed temp ${outPath}`);
} catch (e) {
    dbg(`failed to remove temp ${outPath}: ${e.message || String(e)}`);
}

if (AUTO_OPEN) {
    // Widely used in community scripts; if it fails check chrome/content/zotero/xpcom/reader.js
    await Zotero.Reader.open(newAttachment.id);
}

showToast(`Extracted pp. ${start}–${end} ✓`);

} catch (e) {
    const msg = e.message || String(e);
    err(`unexpected error: ${msg}\n${e.stack || ''}`);
    showToast(`Error: ${msg}`);
}
