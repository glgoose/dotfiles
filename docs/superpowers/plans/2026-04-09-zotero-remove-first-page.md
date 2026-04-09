# Remove First Page of PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `zotero/remove-first-page.js`, a Zotero Actions & Tags script that removes the first page of a PDF attachment while preserving annotations.

**Architecture:** Single Zotero JS script. Branches on annotation presence: no-annotations path uses qpdf directly; has-annotations path uses `Zotero.PDFWorker.export(..., transfer: true)` to embed and clear annotations before trimming, then reimports them with `Zotero.PDFWorker.import()`. Follows patterns from `zotero/extract-chapter-pdf.js`.

**Tech Stack:** Zotero Actions & Tags JS scripting, `qpdf` (page extraction + page count), `Zotero.PDFWorker` (annotation embed/reimport), `Zotero.Attachments` (importFromFile), `IOUtils` (temp file cleanup).

---

## Files

- **Create:** `zotero/remove-first-page.js`

---

### Task 1: Skeleton, constants, guards

**Files:**
- Create: `zotero/remove-first-page.js`

- [ ] **Step 1: Create the file with header, constants, helpers, and guards**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add zotero/remove-first-page.js
git commit -m "feat: add remove-first-page.js skeleton with guards"
```

---

### Task 2: No-annotations path

**Files:**
- Modify: `zotero/remove-first-page.js`

- [ ] **Step 1: Append the no-annotations path after the guards**

```js
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
```

- [ ] **Step 2: Manually test no-annotations path in Zotero**

1. Open Zotero. Find or create a book/article with a multi-page PDF attachment that has **no annotations**.
2. Register the script in Actions & Tags: Name "Remove first page of PDF", Trigger "Item", Operation "Custom script".
3. Right-click the PDF attachment → "Remove first page of PDF".
4. Verify: attachment is replaced with a new PDF that has one fewer page, correct filename, auto-opens in reader.
5. Verify: original PDF is gone from the item.

- [ ] **Step 3: Commit**

```bash
git add zotero/remove-first-page.js
git commit -m "feat: implement no-annotations path for remove-first-page"
```

---

### Task 3: Has-annotations path

**Files:**
- Modify: `zotero/remove-first-page.js`

- [ ] **Step 1: Append the has-annotations path after the no-annotations path**

```js
// ── has-annotations path ──────────────────────────────────────────────────────

const page1Annotations = annotations.filter(a => a.annotationPageIndex === 0);

const exportPath = pdfPath.replace(/\.pdf$/i, '_export_tmp.pdf');
const trimmedPath = pdfPath.replace(/\.pdf$/i, '_trimmed_tmp.pdf');

// Embed all annotations into a temp PDF and clear them from Zotero DB.
// transfer: true is critical — prevents duplicates when re-importing below.
try {
    await Zotero.PDFWorker.export(item.id, exportPath, false, null, true);
} catch (e) {
    showToast(`Failed to export annotations: ${e.message || String(e)}`);
    return;
}

// Remove first page from the annotation-embedded PDF.
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
```

- [ ] **Step 2: Manually test has-annotations path in Zotero**

1. Find or create a PDF attachment with annotations on pages **other than** page 1. Note what they say.
2. Right-click the PDF attachment → "Remove first page of PDF".
3. Verify: attachment is replaced, auto-opens, annotations on pages 2+ are present and correctly positioned (now on page N-1 due to the embedded PDF having the page removed).
4. Verify: page count is one fewer.

- [ ] **Step 3: Manually test page-1 annotation warning**

1. Add an annotation on page 1 of a PDF.
2. Run the action. Verify the success toast mentions "N annotation(s) on page 1 were deleted".
3. Verify the annotation is gone in the new attachment.

- [ ] **Step 4: Commit**

```bash
git add zotero/remove-first-page.js
git commit -m "feat: implement has-annotations path for remove-first-page"
```

---

## Final file: `zotero/remove-first-page.js`

For reference, the complete assembled file:

```js
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

// ── has-annotations path ──────────────────────────────────────────────────────

const page1Annotations = annotations.filter(a => a.annotationPageIndex === 0);

const exportPath = pdfPath.replace(/\.pdf$/i, '_export_tmp.pdf');
const trimmedPath = pdfPath.replace(/\.pdf$/i, '_trimmed_tmp.pdf');

// Embed all annotations into a temp PDF and clear them from Zotero DB.
// transfer: true is critical — prevents duplicates when re-importing below.
try {
    await Zotero.PDFWorker.export(item.id, exportPath, false, null, true);
} catch (e) {
    showToast(`Failed to export annotations: ${e.message || String(e)}`);
    return;
}

// Remove first page from the annotation-embedded PDF.
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
```
