# Zotero Chapter PDF Extractor — Design Spec

**Date:** 2026-04-07  
**Status:** Approved  
**Scope:** v1 — extract chapter PDF from parent book PDF via Actions & Tags snippet

---

## 1. Problem

When working with edited volumes in Zotero, the book PDF lives on the parent book item but individual chapters (book section items) have no standalone PDF. Extracting the correct pages manually requires checking page labels with `qpdf`, running a page-extraction tool, and optionally attaching the result back to Zotero. This design automates that workflow as a right-click action in Zotero 8.

---

## 2. Components

### 2.1 Actions & Tags snippet (`~/dotfiles/zotero/extract-chapter-pdf.js`)

A custom JavaScript snippet registered in the [Actions & Tags](https://github.com/windingwind/zotero-actions-tags) plugin. Bound to the item context menu. Version-controlled in dotfiles as the source of truth; pasted into Actions & Tags UI.

### 2.2 Shell scripts (in `~/dotfiles/bin/`)

| Script | Language | Role |
|---|---|---|
| `pdflabels` | Python (PEP 723 / uv) | Given a PDF path and two page label strings, print both physical page numbers. Used by the Zotero snippet. |
| `cutpdf` | bash | CLI convenience script: extract a page range from a PDF using `qpdf`. For standalone use from the terminal. |

> **Note:** `haslabels` and `label2page` are no longer separate scripts. `haslabels` functionality is inlined into the snippet via `IOUtils.read()`. Label resolution is handled by the new combined `pdflabels` script (one subprocess instead of three).

---

## 3. Architecture

```
Zotero right-click (bookSection item)
    │
    └─► Actions & Tags snippet [extract-chapter-pdf.js]
            │
            ├─ reads:  item.getField('pages')
            ├─ reads:  parent item via Zotero.Items.get(item.parentItemID)
            ├─ reads:  best PDF via parent.getBestAttachment()
            │
            ├─ in-JS: IOUtils.read(bookPdfPath) → byte scan for '/PageLabels'
            │          (no subprocess — runs in Zotero's JS context)
            │
            ├─ shells: pdflabels <start> <end> <bookPdfPath>
            │          → stdout: "<physStart> <physEnd>"
            │          (one uv invocation resolves both labels)
            │
            ├─ shells: qpdf <bookPdf> --pages <bookPdf> <physStart>-<physEnd> -- <outPath>
            │
            └─ imports result PDF via Zotero.Attachments.importFromFile
                  (fileBaseName computed from parent item metadata)
```

**Performance:** ~0ms for label detection (in-process) + ~200ms for `pdflabels` (one Python/uv call) + ~100ms for `qpdf` (C++). Total ~300ms vs ~2–3s with the original pdftk/Python-per-call approach.

No persistent state, no plugin storage, no config files. One tunable (`AUTO_OPEN`) as a `const` at the top of the snippet.

---

## 4. Snippet behavior (`extract-chapter-pdf.js`)

### 4.1 Configuration

```js
const AUTO_OPEN   = true;   // open extracted PDF in Zotero reader after extraction
const PDFLABELS   = '/Users/glenn/dotfiles/bin/pdflabels';
const QPDF        = '/usr/local/bin/qpdf';  // or wherever brew installs it; verify with `which qpdf`
```

Absolute paths are required because Actions & Tags runs inside Zotero's JS context, which has no login-shell `$PATH`.

### 4.2 Guard sequence

Every error shows a non-modal `Zotero.ProgressWindow` toast and returns early. No modal dialogs.

| Step | Check | Error message |
|---|---|---|
| 1 | `item.itemType === 'bookSection'` | `"Extract chapter PDF only works on book section items"` |
| 2 | `item.getField('pages')` is non-empty | `"Pages field is empty — cannot extract"` |
| 3 | Range parseable (see §4.3) | `"Could not parse Pages field: <raw>"` |
| 4 | Parent item exists | `"This section has no parent book item"` |
| 5 | Parent has a PDF (`getBestAttachment`) | `"Parent book has no PDF attachment"` |
| 6 | Section has no existing PDF child | `"A PDF is already attached to this section — delete it first to re-extract"` |
| 7 | PDF byte scan contains `/PageLabels` | `"Book PDF has no page labels — add them with qpdf first"` |
| 8 | `pdflabels` resolves both labels | `"Page label '<X>' not found in book PDF"` (from pdflabels stderr) |

### 4.3 Pages field parsing

Normalization pipeline (applied in order before any other logic):

1. Strip leading `pp.`, `p.`, `pages?` (case-insensitive), optional trailing dot, surrounding whitespace.
2. Replace en-dash `–` (U+2013) and em-dash `—` (U+2014) with ASCII hyphen `-`.
3. Trim whitespace around the hyphen.
4. Match:
   - Single page: `^\w+$` → treat as `N-N` (same start and end label)
   - Range: `^\w+-\w+$` → use as-is
   - Anything else (commas, slashes, etc.) → guard 3 error

`\w+` accepts both arabic (`23`) and roman (`xxiii`) numerals; `pdflabels` matches exact strings.

### 4.4 Page label detection (in-JS)

```js
// Check for page labels by scanning the raw PDF bytes.
// qpdf writes /PageLabels as plain text in the catalog object.
// This is a reliable heuristic for PDFs processed with qpdf.
const bytes = await IOUtils.read(bookPdfPath);
const pdfText = new TextDecoder('latin1').decode(bytes);
if (!pdfText.includes('/PageLabels')) {
    showToast('Book PDF has no page labels — add them with qpdf first');
    return;
}
```

### 4.5 Label resolution + extraction

```js
// One subprocess resolves both labels in a single Python invocation
let physStart, physEnd;
try {
    const out = await subprocess(PDFLABELS, [start, end, bookPdfPath]);
    [physStart, physEnd] = out.trim().split(' ');
} catch (e) {
    // pdflabels prints "Error: Label 'X' not found in PDF" to stderr
    showToast(e.message || `Could not resolve page labels '${start}'–'${end}'`);
    return;
}

// Compute output path (same directory as source PDF)
const outPath = bookPdfPath.replace(/\.pdf$/i, `_${start}-${end}.pdf`);

// Extract pages with qpdf (C++, ~100ms, no JVM overhead)
try {
    await subprocess(QPDF, [
        bookPdfPath,
        '--pages', bookPdfPath, `${physStart}-${physEnd}`,
        '--', outPath
    ]);
} catch (e) {
    showToast(`qpdf failed: ${e.message}`);
    return;
}
```

`subprocess` = `Zotero.Utilities.Internal.subprocess`. Throws on non-zero exit.

### 4.6 Import + rename

```js
const fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(parent);
const newAttachment = await Zotero.Attachments.importFromFile({
    file: outPath,
    parentItemID: item.id,
    contentType: 'application/pdf',
    fileBaseName: fileBaseName,
});
// Delete the temp file beside the source PDF
try { await IOUtils.remove(outPath); } catch (_) {}
```

### 4.7 Auto-open + success toast

```js
if (AUTO_OPEN) {
    // Widely used in community scripts; if it fails check chrome/content/zotero/xpcom/reader.js
    await Zotero.Reader.open(newAttachment.id);
}
showToast(`Extracted pp. ${start}–${end} ✓`);
```

`showToast` helper:
```js
function showToast(msg, headline = 'Extract Chapter PDF') {
    const pw = new Zotero.ProgressWindow({ closeOnClick: true });
    pw.changeHeadline(headline);
    pw.addDescription(msg);
    pw.show();
    pw.startCloseTimer(3000);
}
```

---

## 5. Shell script changes

### 5.1 New script: `pdflabels`

Replaces the separate `label2page` calls. Takes a PDF path and two page label strings; prints both physical page numbers on one line separated by a space. One uv invocation = one Python startup cost.

```
Usage: pdflabels START_LABEL END_LABEL file.pdf
Output (stdout): "<physStart> <physEnd>"
Errors (stderr + exit 1): label not found, file unreadable, etc.
```

PEP 723 shebang, `pikepdf` dependency declared inline.

### 5.2 `cutpdf` — switch pdftk → qpdf, keep for CLI use

The existing `cutpdf` script is rewritten to use `qpdf` instead of `pdftk`:
- Removes the JVM dependency entirely
- `qpdf` extraction: `qpdf input.pdf --pages input.pdf N-M -- output.pdf`
- All other behaviour preserved: range syntax, en-dash normalization, `pp.` stripping, open-ended ranges (`5-`, `-7`), label mode via `pdflabels`
- `set -euo pipefail` per dotfiles convention
- `pdflabels` path: sibling lookup `$(dirname "$0")/pdflabels`

The Zotero snippet calls `qpdf` directly and does **not** use `cutpdf`.

### 5.3 Retired scripts

`haslabels` and `label2page` are **not** migrated to dotfiles:
- `haslabels` → replaced by inline IOUtils byte scan in the snippet
- `label2page` → replaced by `pdflabels` (combined script)

The originals in `~/scripts/` can be removed once everything is verified.

---

## 6. Dotfiles layout

```
~/dotfiles/
├── bin/
│   ├── pdflabels       # Python PEP 723: resolve two page labels → two physical page numbers
│   └── cutpdf          # bash: CLI page extraction via qpdf (no pdftk)
├── Brewfile            # add: brew "uv" (qpdf already present)
├── zotero/
│   └── extract-chapter-pdf.js   # Actions & Tags snippet source
└── docs/superpowers/specs/
    └── 2026-04-07-zotero-chapter-extractor-design.md
```

`~/dotfiles/bin` is already on `$PATH` via `.zshrc`.

---

## 7. Installing the Actions & Tags action

1. Install [Actions & Tags](https://github.com/windingwind/zotero-actions-tags) in Zotero 8.
2. In Actions & Tags preferences: click **+** to create a new action.
   - **Name:** `Extract chapter PDF`
   - **Trigger:** `Item context menu`
   - **Operation:** `Custom script`
   - **Menu label:** `Extract chapter PDF`
   - **Data:** paste contents of `~/dotfiles/zotero/extract-chapter-pdf.js`
3. Save.

---

## 8. Out of scope (v1)

- Automatic page-label generation (planned for v2: run qpdf to add labels, then re-run extraction).
- Discontinuous page ranges (`23-45, 67-89`).
- Prompting for a missing `Pages` field.
- A packaged Zotero plugin (`.xpi`).

---

## 9. Testing approach

### Scripts (terminal)

```bash
# pdflabels: happy path
pdflabels "1" "10" /path/to/labelled.pdf
# Expected stdout: "5 14"  (or whatever the physical pages are)

# pdflabels: label not found
pdflabels "9999" "10000" /path/to/labelled.pdf
# Expected: error on stderr, exit 1

# cutpdf: physical range
cutpdf 1-3 /path/to/any.pdf
# Expected: Created: /path/to/any_1-3.pdf

# cutpdf: label mode with en-dash
cutpdf $'1\xe2\x80\x933' -l /path/to/labelled.pdf
# Expected: Created: /path/to/labelled_1-3.pdf

# cutpdf: single page label mode
cutpdf 42 -l /path/to/labelled.pdf
# Expected: Created: /path/to/labelled_42-42.pdf
```

### Zotero snippet (manual, in Zotero 8)

1. **Happy path:** book section with `Pages: 23-45`, parent book PDF with page labels → attachment created, named correctly, opened in reader.
2. **En-dash:** `Pages: 23–45` → same result.
3. **Roman numerals:** `Pages: xxiii-xlv` with matching PDF labels.
4. **Single page:** `Pages: 42` → one-page attachment created.
5. **No labels:** book PDF without `/PageLabels` → toast `"Book PDF has no page labels…"`.
6. **Label not found:** valid labels, wrong value in `Pages` → toast from pdflabels stderr.
7. **Empty Pages:** → toast `"Pages field is empty"`.
8. **Already attached:** re-run → toast `"A PDF is already attached"`.
9. **No parent PDF:** → toast `"Parent book has no PDF attachment"`.
