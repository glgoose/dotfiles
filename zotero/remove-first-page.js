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

const subprocess = Zotero.Utilities.Internal.subprocess.bind(Zotero.Utilities.Internal);

// qpdf-aware runner: waits for process to exit, treats exit 3 (success+warnings) as ok.
// Cannot use exec() — it rejects on any non-zero exit including qpdf's exit 3.
// Cannot use subprocess() — it only reads stdout without waiting for process exit.
async function runQpdf(args) {
    const proc = await Subprocess.call({ command: QPDF, arguments: args });
    let str;
    while (str = await proc.stdout.readString()) {}  // drain stdout (usually empty)
    const exitCode = await proc.wait();
    Zotero.debug(`[remove-first-page] qpdf exit code: ${exitCode}`);
    if (exitCode !== 0 && exitCode !== 3) {
        throw new Error(`qpdf exited with code ${exitCode}`);
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

// Get page count
const countOut = await subprocess(QPDF, ['--show-npages', pdfPath]);
const pageCount = parseInt(countOut.trim(), 10);
Zotero.debug(`[remove-first-page] ${pdfPath} has ${pageCount} pages`);
if (pageCount <= 1) {
    showToast('PDF has only one page — cannot remove');
    return;
}

// ── annotation check ─────────────────────────────────────────────────────────

const annotations = item.getAnnotations();
Zotero.debug(`[remove-first-page] ${annotations.length} annotation(s) found`);

// ── no-annotations path ───────────────────────────────────────────────────────

if (annotations.length === 0) {
    const trimmedPath = pdfPath.replace(/\.pdf$/i, '_trimmed_tmp.pdf');

    // subprocess instead of exec: qpdf exits with code 3 on success+warnings,
    // which exec() incorrectly treats as failure.
    Zotero.debug(`[remove-first-page] running qpdf: pages 2-${pageCount} -> ${trimmedPath}`);
    try {
        await runQpdf([pdfPath, '--pages', pdfPath, `2-${pageCount}`, '--', trimmedPath]);
    } catch (e) {
        Zotero.debug(`[remove-first-page] qpdf error: ${e}`);
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
Zotero.debug(`[remove-first-page] ${page1Annotations.length} annotation(s) on page 1`);

const exportPath = pdfPath.replace(/\.pdf$/i, '_export_tmp.pdf');
const trimmedPath = pdfPath.replace(/\.pdf$/i, '_trimmed_tmp.pdf');

// Embed all annotations into a temp PDF and clear them from Zotero DB.
// transfer: true is critical — prevents duplicates when re-importing below.
Zotero.debug(`[remove-first-page] exporting annotations to ${exportPath}`);
try {
    await Zotero.PDFWorker.export(item.id, exportPath, false, null, true);
} catch (e) {
    Zotero.debug(`[remove-first-page] PDFWorker.export error: ${e}`);
    showToast(`Failed to export annotations: ${e.message || String(e)}`);
    return;
}

// Remove first page from the annotation-embedded PDF.
Zotero.debug(`[remove-first-page] running qpdf: pages 2-${pageCount} -> ${trimmedPath}`);
try {
    await runQpdf([exportPath, '--pages', exportPath, `2-${pageCount}`, '--', trimmedPath]);
} catch (e) {
    Zotero.debug(`[remove-first-page] qpdf error: ${e}`);
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
Zotero.debug(`[remove-first-page] reimporting annotations into item ${newAttachment.id}`);
await Zotero.PDFWorker.import(newAttachment.id);

try { await IOUtils.remove(trimmedPath); } catch (_) {}

if (page1Annotations.length > 0) {
    showToast(`First page removed ✓ (${page1Annotations.length} annotation(s) on page 1 were deleted)`);
} else {
    showToast('First page removed ✓');
}

if (AUTO_OPEN) await Zotero.Reader.open(newAttachment.id);
