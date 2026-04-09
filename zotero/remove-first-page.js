// Remove first page of PDF — Actions & Tags snippet for Zotero 8
// Spec: docs/superpowers/specs/2026-04-09-zotero-remove-first-page-design.md
//
// Setup: register in Actions & Tags as "Remove first page of PDF"
//   Trigger: Item context menu  |  Operation: Custom script

const AUTO_OPEN = true;
const QPDF = '/opt/homebrew/bin/qpdf';

// ── helpers ──────────────────────────────────────────────────────────────────

function showToast(msg, headline = 'Remove First Page') {
    const pw = new Zotero.ProgressWindow({ closeOnClick: true });
    pw.show();
    pw.changeHeadline(headline);
    pw.addDescription(msg);
    pw.startCloseTimer(3000);
}

const exec       = Zotero.Utilities.Internal.exec.bind(Zotero.Utilities.Internal);
const subprocess = Zotero.Utilities.Internal.subprocess.bind(Zotero.Utilities.Internal);

// exec() rejects on any non-zero exit, but qpdf uses exit code 3 for "success with warnings".
// Catch that specific code and let it through; re-throw everything else.
async function runQpdf(args) {
    try {
        await exec(QPDF, args);
    } catch (e) {
        if ((e.message || '').includes('exit status 3')) {
            Zotero.debug('[remove-first-page] qpdf exit 3 (success with warnings) — ok');
            return;
        }
        throw e;
    }
}

// ── main ─────────────────────────────────────────────────────────────────────

if (!item) return;

// Allow triggering from a parent item if it has exactly one PDF attachment
if (item.attachmentContentType !== 'application/pdf') {
    const pdfAttachments = item.getAttachments()
        .map(id => Zotero.Items.get(id))
        .filter(a => a && a.attachmentContentType === 'application/pdf');
    if (pdfAttachments.length === 0) {
        showToast('No PDF attachment found');
        return;
    }
    if (pdfAttachments.length > 1) {
        showToast('Multiple PDFs attached — right-click the specific PDF to use this action');
        return;
    }
    item = pdfAttachments[0];
}

const pdfPath = await item.getFilePathAsync();
if (!pdfPath) {
    showToast('Could not resolve PDF file path');
    return;
}

// Get page count — take last non-empty line in case qpdf emits warnings first
const countOut = await subprocess(QPDF, ['--show-npages', pdfPath]);
console.log('[remove-first-page] --show-npages raw output:', JSON.stringify(countOut));
const countLine = countOut.trim().split('\n').filter(l => l.trim()).pop() || '';
const pageCount = parseInt(countLine, 10);
console.log('[remove-first-page] pageCount:', pageCount);
if (!pageCount || pageCount <= 1) {
    showToast(pageCount === 1 ? 'PDF has only one page — cannot remove'
                              : `Could not read page count (got: ${countOut.trim()})`);
    return;
}

// ── annotation check ─────────────────────────────────────────────────────────

const annotations = item.getAnnotations();
console.log(`[remove-first-page] ${annotations.length} annotation(s) found`);

// ── no-annotations path ───────────────────────────────────────────────────────

if (annotations.length === 0) {
    const trimmedPath = pdfPath.replace(/\.pdf$/i, '_trimmed_tmp.pdf');

    console.log(`[remove-first-page] running qpdf: pages 2-${pageCount} -> ${trimmedPath}`);
    try {
        await runQpdf([pdfPath, '--pages', pdfPath, `2-${pageCount}`, '--', trimmedPath]);
    } catch (e) {
        console.error('[remove-first-page] qpdf error:', e);
        showToast(`qpdf failed: ${e.message || String(e)}`);
        return;
    }

    const parentItemID = item.parentItemID;
    const fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(item);
    await item.eraseTx();

    const newAttachment = await Zotero.Attachments.importFromFile({
        file: trimmedPath,
        parentItemID,
        contentType: 'application/pdf',
        fileBaseName,
    });

    try { await IOUtils.remove(trimmedPath); } catch (_) {}

    if (AUTO_OPEN) await Zotero.Reader.open(newAttachment.id);

    showToast('First page removed ✓');
    return;
}

// ── has-annotations path ──────────────────────────────────────────────────────

const page1Annotations = annotations.filter(a => a.annotationPageIndex === 0);
console.log(`[remove-first-page] ${page1Annotations.length} annotation(s) on page 1`);

const exportPath = pdfPath.replace(/\.pdf$/i, '_export_tmp.pdf');
const trimmedPath = pdfPath.replace(/\.pdf$/i, '_trimmed_tmp.pdf');

// Embed all annotations into a temp PDF and clear them from Zotero DB.
// transfer: true is critical — prevents duplicates when re-importing below.
console.log(`[remove-first-page] exporting annotations to ${exportPath}`);
try {
    await Zotero.PDFWorker.export(item.id, exportPath, false, null, true);
} catch (e) {
    console.log(`[remove-first-page] PDFWorker.export error: ${e}`);
    showToast(`Failed to export annotations: ${e.message || String(e)}`);
    return;
}

// Remove first page from the annotation-embedded PDF.
console.log(`[remove-first-page] running qpdf: pages 2-${pageCount} -> ${trimmedPath}`);
try {
    await runQpdf([exportPath, '--pages', exportPath, `2-${pageCount}`, '--', trimmedPath]);
} catch (e) {
    console.error('[remove-first-page] qpdf error (annotations path):', e);
    // Annotations are now only in exportPath — tell user so they can recover.
    showToast(`qpdf failed. Annotation backup at: ${exportPath}`);
    return;
}

try { await IOUtils.remove(exportPath); } catch (_) {}

const parentItemID = item.parentItemID;
const fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(item);
await item.eraseTx();

const newAttachment = await Zotero.Attachments.importFromFile({
    file: trimmedPath,
    parentItemID,
    contentType: 'application/pdf',
    fileBaseName,
});

// Reimport annotations from the embedded PDF into Zotero DB.
console.log(`[remove-first-page] reimporting annotations into item ${newAttachment.id}`);
await Zotero.PDFWorker.import(newAttachment.id);

try { await IOUtils.remove(trimmedPath); } catch (_) {}

if (page1Annotations.length > 0) {
    showToast(`First page removed ✓ (${page1Annotations.length} annotation(s) on page 1 were deleted)`);
} else {
    showToast('First page removed ✓');
}

if (AUTO_OPEN) await Zotero.Reader.open(newAttachment.id);
