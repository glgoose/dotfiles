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

// Guard: single-page PDFs
const countOut = await subprocess(QPDF, ['--show-npages', pdfPath]);
const pageCount = parseInt(countOut.trim().split('\n').filter(l => l.trim()).pop() || '', 10);
if (!pageCount || pageCount <= 1) {
    showToast('PDF has only one page — cannot remove');
    return;
}

// ── annotation check ─────────────────────────────────────────────────────────

const annotations = item.getAnnotations();
Zotero.log(`[remove-first-page] ${annotations.length} annotation(s), ${pageCount} pages`);

// Temp files go to /tmp with ASCII-only names to avoid encoding issues
// with non-ASCII characters in Zotero storage filenames.
const tmpDir = PathUtils.tempDir;
const ts     = Date.now();

// ── no-annotations path ───────────────────────────────────────────────────────

if (annotations.length === 0) {
    const trimmedPath = PathUtils.join(tmpDir, `zotero_trimmed_${ts}.pdf`);

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

// ── has-annotations path ──────────────────────────────────────────────────────

const page1Annotations = annotations.filter(a => a.annotationPageIndex === 0);

const exportPath  = PathUtils.join(tmpDir, `zotero_export_${ts}.pdf`);
const trimmedPath = PathUtils.join(tmpDir, `zotero_trimmed_${ts}.pdf`);

// Embed all annotations into a temp PDF and clear them from Zotero DB.
// transfer: true prevents duplicates when re-importing below.
try {
    await Zotero.PDFWorker.export(item.id, exportPath, false, null, true);
} catch (e) {
    showToast(`Failed to export annotations: ${e.message || String(e)}`);
    return;
}

try {
    await exec(QPDF, [exportPath, '--pages', exportPath, '2-z', '--', trimmedPath]);
} catch (e) {
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
await Zotero.PDFWorker.import(newAttachment.id);

try { await IOUtils.remove(trimmedPath); } catch (_) {}

if (page1Annotations.length > 0) {
    showToast(`First page removed ✓ (${page1Annotations.length} annotation(s) on page 1 were deleted)`);
} else {
    showToast('First page removed ✓');
}

if (AUTO_OPEN) await Zotero.Reader.open(newAttachment.id);
