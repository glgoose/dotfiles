# Zotero: Remove First Page of PDF

**Date:** 2026-04-09
**Script:** `zotero/remove-first-page.js`
**Trigger:** Item context menu on a PDF attachment

## Overview

A Zotero Actions & Tags script that removes the first page of a PDF attachment while preserving annotations. Branches based on whether annotations exist, using Zotero's `PDFWorker` API to safely embed and reimport annotations without direct SQLite modification.

## Constants

```js
const AUTO_OPEN = true;
const QPDF = '/opt/homebrew/bin/qpdf';
```

## Flow

### Guards (abort with toast on failure)

1. `item.attachmentContentType !== 'application/pdf'` → "This action only works on PDF attachments"
2. Page count via `qpdf --show-npages` → if 1 page, abort: "PDF has only one page — cannot remove"

### No-annotations path

1. `qpdf input.pdf --pages input.pdf 2-z -- tempOutput.pdf`
2. `item.eraseTx()`
3. `Zotero.Attachments.importFromFile({ file: tempOutput, parentItemID: item.parentItemID, fileBaseName })`
4. `IOUtils.remove(tempOutput)`
5. Auto-open new attachment

### Has-annotations path

1. Count annotations on page 1: `annotations.filter(a => a.annotationPageIndex === 0)`
   - If any: show warning toast "N annotation(s) on page 1 will be deleted"
2. `Zotero.PDFWorker.export(item.id, tempExport, false, null, true)` — embeds all annotations into PDF and clears them from Zotero DB (`transfer: true` prevents duplicates on reimport)
3. `qpdf tempExport.pdf --pages tempExport.pdf 2-z -- tempFinal.pdf`
4. `IOUtils.remove(tempExport)`
5. `item.eraseTx()`
6. `Zotero.Attachments.importFromFile({ file: tempFinal, parentItemID: item.parentItemID, fileBaseName })`
7. `Zotero.PDFWorker.import(newAttachment.id)` — reimports annotations from embedded PDF (page-1 annotations are gone since that page no longer exists)
8. `IOUtils.remove(tempFinal)`
9. Auto-open new attachment

### Success toast

"First page removed ✓"

## Key API Decisions

- **`PDFWorker.export(..., transfer: true)`**: The `transfer` flag removes annotations from Zotero's DB after embedding. This is critical — without it, `PDFWorker.import()` would create duplicates since internal annotations are not deduplicated.
- **No direct SQLite**: The Zotero JS API (`PDFWorker.export/import`) handles annotation persistence fully, avoiding the risks of direct database writes.
- **Annotations on page 1**: Deleted (option C). The user is warned with a count before the operation proceeds. No interactive confirmation — the toast is informational only, shown after the fact.

## Error Handling

- `qpdf` failure: catch exception, toast "qpdf failed: <message>", abort (temp files may remain)
- `PDFWorker.export` failure: toast error, abort before erasing original attachment
- `IOUtils.remove` failures: silently swallowed (temp file cleanup, non-critical)

## Temp File Paths

Temp files are written beside the source PDF:
- `<original>_export_tmp.pdf` — full PDF with embedded annotations
- `<original>_trimmed_tmp.pdf` — page-trimmed version before import

## Out of Scope

- Removing pages other than page 1 (separate script)
- Interactive confirmation before deleting page-1 annotations
- Testing/adjusting annotation page offsets via SQLite (separate investigation)
