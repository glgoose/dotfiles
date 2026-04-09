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

const exec = Zotero.Utilities.Internal.exec.bind(Zotero.Utilities.Internal);
const subprocess = Zotero.Utilities.Internal.subprocess.bind(Zotero.Utilities.Internal);

// ── main ─────────────────────────────────────────────────────────────────────

if (!item) return;

if (item.attachmentContentType !== 'application/pdf') {
    showToast('This action only works on PDF attachments');
    return;
}

const pdfPath = await item.getFilePathAsync();
if (!pdfPath) {
    showToast('Could not resolve PDF file path');
    return;
}

// Get page count
const countOut = await subprocess(QPDF, ['--show-npages', pdfPath]);
const pageCount = parseInt(countOut.trim(), 10);
if (pageCount <= 1) {
    showToast('PDF has only one page — cannot remove');
    return;
}

// ── annotation check ─────────────────────────────────────────────────────────

const annotations = item.getAnnotations();

// ── no-annotations path ───────────────────────────────────────────────────────

if (annotations.length === 0) {
    const trimmedPath = pdfPath.replace(/\.pdf$/i, '_trimmed_tmp.pdf');

    try {
        await exec(QPDF, [pdfPath, '--pages', pdfPath, '2-z', '--', trimmedPath]);
    } catch (e) {
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
