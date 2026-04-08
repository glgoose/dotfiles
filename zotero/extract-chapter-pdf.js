// Extract chapter PDF — Actions & Tags snippet for Zotero 8
// Spec: docs/superpowers/specs/2026-04-07-zotero-chapter-extractor-design.md
//
// Setup: register in Actions & Tags as "Extract chapter PDF"
//   Trigger: Item context menu  |  Operation: Custom script

const AUTO_OPEN  = true;   // set false to skip auto-opening extracted PDF
const UV         = '/opt/homebrew/bin/uv';
const PDFLABELS  = '/Users/glenn/dotfiles/bin/pdflabels';
const QPDF       = '/opt/homebrew/bin/qpdf';

// ── helpers ──────────────────────────────────────────────────────────────────

function showToast(msg, headline = 'Extract Chapter PDF') {
    const pw = new Zotero.ProgressWindow({ closeOnClick: true });
    pw.show();
    pw.changeHeadline(headline);
    pw.addDescription(msg);
    pw.startCloseTimer(3000);
}

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

if (!item) return;  // guard against null context (e.g. right-click in metadata panel)

if (item.itemType !== 'bookSection') {
    showToast('Extract chapter PDF only works on book section items');
    return;
}

const rawPages = item.getField('pages').trim();
if (!rawPages) {
    showToast('Pages field is empty — cannot extract');
    return;
}

const parsed = parsePages(rawPages);
if (!parsed) {
    showToast(`Could not parse Pages field: ${rawPages}`);
    return;
}
const { start, end } = parsed;

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
    showToast('No book found — link the book as a parent or Related item');
    return;
}

const bookPdf = await parent.getBestAttachment();
if (!bookPdf || bookPdf.attachmentContentType !== 'application/pdf') {
    showToast('Parent book has no PDF attachment');
    return;
}

const existingPdfs = item.getAttachments()
    .map(id => Zotero.Items.get(id))
    .filter(a => a && a.attachmentContentType === 'application/pdf');
for (const a of existingPdfs) {
    await a.eraseTx();
}

const bookPdfPath = await bookPdf.getFilePathAsync();

// Resolve both labels to physical page numbers in one Python invocation.
// pdflabels also detects missing page labels and errors with a clear message.
let physStart, physEnd;
{
    const out = await subprocess(UV, ['run', '--script', PDFLABELS, start, end, bookPdfPath]);
    const parts = out.trim().split(' ');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        showToast(`Could not resolve page labels '${start}'–'${end}'`);
        return;
    }
    [physStart, physEnd] = parts;
}

// Compute output path beside source PDF
const outPath = bookPdfPath.replace(/\.pdf$/i, `_${start}-${end}.pdf`);

// Extract pages with qpdf
try {
    await exec(QPDF, [bookPdfPath, '--pages', bookPdfPath, `${physStart}-${physEnd}`, '--', outPath]);
} catch (e) {
    showToast(`qpdf failed: ${e.message || String(e)}`);
    return;
}

// Import into Zotero with parent-metadata filename
const fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(item);
const newAttachment = await Zotero.Attachments.importFromFile({
    file: outPath,
    parentItemID: item.id,
    contentType: 'application/pdf',
    fileBaseName: fileBaseName,
});

// Clean up temp file
try { await IOUtils.remove(outPath); } catch (_) {}

if (AUTO_OPEN) {
    // Widely used in community scripts; if it fails check chrome/content/zotero/xpcom/reader.js
    await Zotero.Reader.open(newAttachment.id);
}

showToast(`Extracted pp. ${start}–${end} ✓`);
