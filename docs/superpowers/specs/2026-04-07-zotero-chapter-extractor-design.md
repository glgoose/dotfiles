# Zotero Chapter PDF Extractor — Design Spec

**Date:** 2026-04-07  
**Status:** Approved  
**Scope:** v1 — extract chapter PDF from parent book PDF via Actions & Tags snippet

---

## 1. Problem

When working with edited volumes in Zotero, the book PDF lives on the parent book item but individual chapters (book section items) have no standalone PDF. Extracting the correct pages manually requires checking page labels with `qpdf`, running `cutpdf`, and optionally attaching the result back to Zotero. This design automates that workflow as a right-click action in Zotero 8.

---

## 2. Components

### 2.1 Actions & Tags snippet (`~/dotfiles/zotero/extract-chapter-pdf.js`)

A custom JavaScript snippet registered in the [Actions & Tags](https://github.com/windingwind/zotero-actions-tags) plugin. Bound to the item context menu. Version-controlled in dotfiles as the source of truth; pasted into Actions & Tags UI.

### 2.2 Shell scripts (moved to `~/dotfiles/bin/`)

| Script | Language | Role |
|---|---|---|
| `cutpdf` | bash | Extract a page range from a PDF using `pdftk`. |
| `label2page` | Python (PEP 723 / uv) | Map a page label string to a physical 1-based page index. |
| `haslabels` | Python (PEP 723 / uv) | Check whether a PDF has page label data. |

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
            ├─ shells: haslabels <bookPdfPath>        [subprocess → stdout "true"/"false"]
            ├─ shells: label2page <start> <bookPdf>   [subprocess → stdout page number]
            ├─ shells: label2page <end>   <bookPdf>   [subprocess → stdout page number]
            ├─ shells: cutpdf <range> -l <bookPdf>    [subprocess → stdout "Created: <path>"]
            │
            └─ imports result PDF via Zotero.Attachments.importFromFile
                  (fileBaseName computed from parent item metadata)
```

No persistent state, no plugin storage, no config files. One tunable (`AUTO_OPEN`) as a `const` at the top of the snippet.

---

## 4. Snippet behavior (`extract-chapter-pdf.js`)

### 4.1 Configuration

```js
const AUTO_OPEN  = true;   // open extracted PDF in Zotero reader after extraction
const CUTPDF     = '/Users/glenn/dotfiles/bin/cutpdf';
const HASLABELS  = '/Users/glenn/dotfiles/bin/haslabels';
const LABEL2PAGE = '/Users/glenn/dotfiles/bin/label2page';
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
| 7 | `haslabels` → `"true"` | `"Book PDF has no page labels — add them with qpdf first"` |
| 8 | `label2page <start>` → non-empty | `"Page label '<start>' not found in book PDF"` |
| 8 | `label2page <end>` → non-empty | `"Page label '<end>' not found in book PDF"` |

### 4.3 Pages field parsing

Normalization pipeline (applied in order before any other logic):

1. Strip leading `pp.`, `p.`, `pages?` (case-insensitive), optional trailing dot, surrounding whitespace.
2. Replace en-dash `–` (U+2013) and em-dash `—` (U+2014) with ASCII hyphen `-`.
3. Trim whitespace around the hyphen.
4. Match:
   - Single page: `^\w+$` → treat as `N-N` for cutpdf
   - Range: `^\w+-\w+$` → use as-is
   - Anything else (commas, slashes, etc.) → guard 3 error

`\w+` accepts both arabic (`23`) and roman (`xxiii`) numerals; label2page matches exact strings.

### 4.4 Extraction

```js
// Resolve labels to physical pages
const pStart = (await subprocess(LABEL2PAGE, [start, bookPdfPath])).trim();
const pEnd   = (await subprocess(LABEL2PAGE, [end,   bookPdfPath])).trim();
const physRange = `${pStart}-${pEnd}`;

// Extract pages (cutpdf prints "Created: /path/to/out.pdf" to stdout)
// Note: cutpdf arg order is: <range> -l <file>
const stdout = await subprocess(CUTPDF, [physRange, '-l', bookPdfPath]);
const outPath = stdout.trim().replace(/^Created:\s*/, '');
```

`subprocess` = `Zotero.Utilities.Internal.subprocess`. Throws on non-zero exit; we wrap in try/catch and surface the error as a toast.

### 4.5 Import + rename

```js
const fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(parentItem);
const newAttachment = await Zotero.Attachments.importFromFile({
    file: outPath,
    parentItemID: item.id,
    contentType: 'application/pdf',
    fileBaseName: fileBaseName,   // Zotero names file <basename>.pdf
});
// Delete the temp file beside the source PDF
await IOUtils.remove(outPath);
```

The `fileBaseName` from `getFileBaseNameFromItem` follows the user's Zotero rename template (typically `AuthorYear_Title`), making the attachment filename consistent with the rest of the library.

### 4.6 Auto-open + success toast

```js
if (AUTO_OPEN) {
    // Zotero.Reader.open() is widely used in community scripts but not formally documented.
    // Verify against source at chrome/content/zotero/xpcom/reader.js if it fails.
    await Zotero.Reader.open(newAttachment.id);
}
showToast(`Extracted pp. ${start}–${end} ✓`);
```

`showToast` is a small helper at the top of the snippet:
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

### 5.1 `cutpdf` patches

1. **Shebang / strict mode:** add `set -euo pipefail` (currently only `set -e`), per dotfiles convention.
2. **En-dash / `pp.` normalization** in the range argument (strip `pp.`/`p.` prefix, replace en-dash with hyphen).
3. **Single-page label mode fix:** if `LEND` is empty after `IFS='-' read`, set `LEND=$LSTART`.
4. **Output filename** uses the normalized range, not the raw user-supplied string.
5. **`label2page` path** becomes a sibling lookup: `$(dirname "$0")/label2page` (falls back to PATH).

### 5.2 `label2page` changes

1. **Shebang** → PEP 723 format:
   ```python
   #!/usr/bin/env -S uv run --script
   # /// script
   # requires-python = ">=3.9"
   # dependencies = ["pikepdf"]
   # ///
   ```
   Per dotfiles convention (`uv` must be present; no `pip install` or `uv tool install` needed).
2. **Error message** normalized to English: `f"Label '{label}' not found in PDF"`.

### 5.3 `haslabels` changes

1. **Shebang** → PEP 723 / uv (same format as label2page).
2. **stdout output**: print `"true"` or `"false"` to stdout (always exit 0) instead of relying on exit codes. `Zotero.Utilities.Internal.subprocess()` captures stdout but not exit codes.
   - `"true"` → PDF has `/PageLabels`
   - `"false"` → PDF lacks `/PageLabels`
   - Error → print to stderr, exit 1 (snippet wraps in try/catch)

---

## 6. Dotfiles layout

```
~/dotfiles/
├── bin/
│   ├── cutpdf          # bash, patched per §5.1
│   ├── label2page      # Python PEP 723, patched per §5.2
│   └── haslabels       # Python PEP 723, patched per §5.3
├── Brewfile            # add: brew "uv"
├── zotero/
│   └── extract-chapter-pdf.js   # Actions & Tags snippet source
└── docs/superpowers/specs/
    └── 2026-04-07-zotero-chapter-extractor-design.md
```

`~/dotfiles/bin` should be on `$PATH` (expected to already be wired in dotfiles `zsh/` config). If not, add `export PATH="$HOME/dotfiles/bin:$PATH"` to zsh config.

---

## 7. Installing the Actions & Tags action

1. Install [Actions & Tags](https://github.com/windingwind/zotero-actions-tags) in Zotero 8.
2. In Actions & Tags preferences: click **+** to create a new action.
   - **Name:** `Extract chapter PDF`
   - **Trigger:** `Item context menu`
   - **Operation:** `Custom script`
   - **Data:** paste contents of `~/dotfiles/zotero/extract-chapter-pdf.js`
   - **Item type filter:** `bookSection` (if Actions & Tags supports type filtering; otherwise guard 1 handles it)
3. Save.

---

## 8. Out of scope (v1)

- Automatic page-label generation (planned for v2: run qpdf to add labels, then re-run extraction).
- Discontinuous page ranges (`23-45, 67-89`).
- Prompting for a missing `Pages` field.
- A packaged Zotero plugin (`.xpi`).
- Portability of dotfiles Python venvs to Linux/Windows.

---

## 9. Testing approach

Manual testing in Zotero 8:

1. **Happy path:** book section with `Pages: 23-45`, parent book PDF with page labels → confirm attachment created, named correctly, opened in reader.
2. **En-dash:** `Pages: 23–45` → same result as above.
3. **Roman numerals:** `Pages: xxiii-xlv` with matching PDF labels.
4. **Single page:** `Pages: 42` → attachment created for one page.
5. **No labels:** book PDF without `/PageLabels` → toast `"Book PDF has no page labels"`.
6. **Label not found:** valid labels but `Pages` value doesn't match any → toast `"Page label '...' not found"`.
7. **Empty Pages field:** → toast `"Pages field is empty"`.
8. **Already attached:** re-run on a section with existing PDF child → toast `"A PDF is already attached"`.
9. **No parent PDF:** book item with no PDF attachment → toast `"Parent book has no PDF"`.
