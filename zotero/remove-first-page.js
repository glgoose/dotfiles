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
