# Zotero Chapter PDF Extractor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Right-click a book section item in Zotero 8 → automatically extract the chapter's pages from the parent book PDF and attach the result to the section item.

**Architecture:** The snippet does the page-label check inline via `IOUtils.read()` (no subprocess), resolves both labels in one call to `pdflabels` (~200ms), extracts pages with `qpdf` (~100ms), and imports the result as an attachment. `cutpdf` is a separate CLI convenience script rewritten to use `qpdf` for terminal use.

**Tech Stack:** bash, Python 3 + pikepdf (via uv PEP 723), Zotero 8 JavaScript API, Actions & Tags plugin, qpdf.

**Spec:** `docs/superpowers/specs/2026-04-07-zotero-chapter-extractor-design.md`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `~/dotfiles/Brewfile` | Modify | Add `uv` |
| `~/dotfiles/bin/pdflabels` | Create | PEP 723 Python: resolve two page labels → two physical page numbers in one call |
| `~/dotfiles/bin/cutpdf` | Create | bash: CLI page extraction rewritten to use `qpdf` instead of `pdftk` |
| `~/dotfiles/zotero/extract-chapter-pdf.js` | Create | Actions & Tags snippet: full extraction workflow |

The originals `~/scripts/cutpdf`, `~/scripts/label2page`, `~/scripts/haslabels` remain untouched until Task 5 (after verification).

---

## Task 1: Add uv to Brewfile

**Files:**
- Modify: `~/dotfiles/Brewfile`

- [ ] **Step 1: Add uv**

Edit `~/dotfiles/Brewfile` — add a `# Python tooling` section:

```
# Core dotfiles tooling
brew "stow"

# Shell
brew "fzf"
brew "jq"

# Python tooling
brew "uv"

# Git
brew "git-delta"

# Add more tools here as you decide they belong on every machine
```

- [ ] **Step 2: Install uv if not already present**

```bash
brew install uv
uv --version
```

Expected: prints a version string like `uv 0.x.x`.

- [ ] **Step 3: Commit**

```bash
cd ~/dotfiles
git add Brewfile
git commit -m "feat: add uv to Brewfile for PEP 723 Python scripts"
```

---

## Task 2: Create pdflabels

**Files:**
- Create: `~/dotfiles/bin/pdflabels`

Replaces the separate `label2page` calls. Resolves two page labels in one Python startup, printing `"<physStart> <physEnd>"` to stdout.

- [ ] **Step 1: Write pdflabels**

Create `~/dotfiles/bin/pdflabels`:

```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = ["pikepdf"]
# ///

import sys
import pikepdf

def error(msg):
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(1)

if len(sys.argv) != 4:
    error("Usage: pdflabels START_LABEL END_LABEL file.pdf")

start_label = sys.argv[1]
end_label   = sys.argv[2]
pdf_file    = sys.argv[3]

try:
    with pikepdf.open(pdf_file) as pdf:
        labels = {page.label: (i + 1) for i, page in enumerate(pdf.pages)}
except Exception as e:
    error(str(e))

if start_label not in labels:
    error(f"Label '{start_label}' not found in PDF")
if end_label not in labels:
    error(f"Label '{end_label}' not found in PDF")

print(f"{labels[start_label]} {labels[end_label]}")
```

- [ ] **Step 2: Make executable**

```bash
chmod +x ~/dotfiles/bin/pdflabels
```

- [ ] **Step 3: Verify with a labelled PDF**

Use any PDF from your library that has page labels. Substitute real labels that exist in the file (e.g. `"1"` and `"10"` for a book with arabic numerals starting at 1):

```bash
pdflabels "1" "10" /path/to/labelled.pdf
```

Expected stdout: two numbers separated by a space, e.g. `5 14`.

- [ ] **Step 4: Verify single-page (same label for start and end)**

```bash
pdflabels "42" "42" /path/to/labelled.pdf
```

Expected stdout: same number twice, e.g. `46 46`.

- [ ] **Step 5: Verify label-not-found**

```bash
pdflabels "9999" "10000" /path/to/labelled.pdf
echo "exit: $?"
```

Expected: `Error: Label '9999' not found in PDF` on stderr, exit code 1, nothing on stdout.

- [ ] **Step 6: Commit**

```bash
cd ~/dotfiles
git add bin/pdflabels
git commit -m "feat: add pdflabels script (PEP 723, resolves two labels in one call)"
```

---

## Task 3: Create cutpdf (rewritten for qpdf)

**Files:**
- Create: `~/dotfiles/bin/cutpdf`

Rewrite of `~/scripts/cutpdf` using `qpdf` instead of `pdftk`. Interface unchanged: same flags, same range syntax. Label mode uses the sibling `pdflabels` script.

`qpdf` extraction syntax:
```bash
qpdf input.pdf --pages input.pdf N-M -- output.pdf
```

For open-ended ranges (`5-`, `-7`), we still need the total page count — use `qpdf --show-npages` instead of `pdftk dump_data`.

- [ ] **Step 1: Write cutpdf**

Create `~/dotfiles/bin/cutpdf`:

```bash
#!/usr/bin/env bash
# Usage: cutpdf RANGE [-l|--label] file.pdf
# Examples:
#   cutpdf 5-7 file.pdf           # extract physical pages 5 through 7
#   cutpdf -7 file.pdf            # extract from page 1 to 7
#   cutpdf 5- file.pdf            # extract from page 5 to last
#   cutpdf 20-23 -l file.pdf      # extract logical pages 20 to 23 (via pdflabels)
#   cutpdf "pp. 20-23" -l file.pdf  # strips 'pp.' prefix automatically

set -euo pipefail

LABEL_MODE=0
POSITIONAL=()

for arg in "$@"; do
  case "$arg" in
    -l|--label) LABEL_MODE=1 ;;
    *.pdf)      PDF_FILE="$arg" ;;
    *)          POSITIONAL+=("$arg") ;;
  esac
done

if [ ${#POSITIONAL[@]} -eq 0 ] || [ -z "${PDF_FILE:-}" ]; then
  echo "Usage: cutpdf RANGE [-l|--label] file.pdf" >&2
  exit 1
fi

# Normalize range: strip pp./p./pages? prefix, replace en/em-dash with hyphen
RANGE=$(echo "${POSITIONAL[0]}" | sed \
  -e 's/^[Pp][Aa][Gg][Ee][Ss]*[.] *//; s/^[Pp][Pp][.] *//; s/^[Pp][.] *//' \
  -e $'s/\xe2\x80\x93/-/g; s/\xe2\x80\x94/-/g' \
  -e 's/ *- */-/')

expand_range() {
  local range="$1"
  local total
  total=$(qpdf --show-npages "$PDF_FILE")
  if [[ "$range" =~ ^([0-9]+)-$ ]]; then
    echo "${BASH_REMATCH[1]}-${total}"
  elif [[ "$range" =~ ^-([0-9]+)$ ]]; then
    echo "1-${BASH_REMATCH[1]}"
  else
    echo "$range"
  fi
}

PDFLABELS_BIN="$(dirname "$0")/pdflabels"
if ! [ -x "$PDFLABELS_BIN" ]; then
  PDFLABELS_BIN="pdflabels"
fi

if [ $LABEL_MODE -eq 1 ]; then
  IFS='-' read -r LSTART LEND <<< "$RANGE"
  if [ -z "${LEND:-}" ]; then
    LEND="$LSTART"
  fi

  PAGES=$("$PDFLABELS_BIN" "$LSTART" "$LEND" "$PDF_FILE")
  PSTART="${PAGES%% *}"
  PEND="${PAGES##* }"

  if [ -z "$PSTART" ] || [ -z "$PEND" ]; then
    echo "Error: Could not resolve label range." >&2
    exit 1
  fi
  RANGE="${PSTART}-${PEND}"
else
  RANGE=$(expand_range "$RANGE")
fi

BASENAME="${PDF_FILE%.pdf}"
OUT="${BASENAME}_${RANGE}.pdf"

qpdf "$PDF_FILE" --pages "$PDF_FILE" "$RANGE" -- "$OUT"

echo "Created: $OUT"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x ~/dotfiles/bin/cutpdf
```

- [ ] **Step 3: Test physical page range**

```bash
cutpdf 1-3 /path/to/any.pdf
```

Expected: `Created: /path/to/any_1-3.pdf`. Verify page count:

```bash
qpdf --show-npages /path/to/any_1-3.pdf
```

Expected: `3`

- [ ] **Step 4: Test open-ended range**

```bash
cutpdf 5- /path/to/any.pdf
```

Expected: `Created: /path/to/any_5-N.pdf` (where N = last page of source).

- [ ] **Step 5: Test en-dash normalization**

```bash
cutpdf $'1\xe2\x80\x933' /path/to/any.pdf
```

Expected: `Created: /path/to/any_1-3.pdf` (normalized filename, same as ASCII hyphen input).

- [ ] **Step 6: Test label mode**

```bash
cutpdf 1-10 -l /path/to/labelled.pdf
```

Expected: `Created: /path/to/labelled_1-10.pdf`

- [ ] **Step 7: Test single-page label mode**

```bash
cutpdf 42 -l /path/to/labelled.pdf
```

Expected: `Created: /path/to/labelled_42-42.pdf`

- [ ] **Step 8: Test pp. prefix stripping**

```bash
cutpdf "pp. 1-3" -l /path/to/labelled.pdf
```

Expected: `Created: /path/to/labelled_1-3.pdf`

- [ ] **Step 9: Commit**

```bash
cd ~/dotfiles
git add bin/cutpdf
git commit -m "feat: add cutpdf (qpdf-based, replaces pdftk; en-dash normalization, single-page fix)"
```

---

## Task 4: Create the Actions & Tags snippet

**Files:**
- Create: `~/dotfiles/zotero/extract-chapter-pdf.js`

- [ ] **Step 1: Find qpdf path**

```bash
which qpdf
```

Note the output — you'll need it for the `QPDF` constant below (typically `/opt/homebrew/bin/qpdf` on Apple Silicon or `/usr/local/bin/qpdf` on Intel).

- [ ] **Step 2: Create zotero directory**

```bash
mkdir -p ~/dotfiles/zotero
```

- [ ] **Step 3: Write the snippet**

Create `~/dotfiles/zotero/extract-chapter-pdf.js`. Substitute the correct `qpdf` path from Step 1:

```js
// Extract chapter PDF — Actions & Tags snippet for Zotero 8
// Spec: docs/superpowers/specs/2026-04-07-zotero-chapter-extractor-design.md
//
// Setup: register in Actions & Tags as "Extract chapter PDF"
//   Trigger: Item context menu  |  Operation: Custom script

const AUTO_OPEN  = true;   // set false to skip auto-opening extracted PDF
const PDFLABELS  = '/Users/glenn/dotfiles/bin/pdflabels';
const QPDF       = '/opt/homebrew/bin/qpdf';  // verify with: which qpdf

// ── helpers ──────────────────────────────────────────────────────────────────

function showToast(msg, headline = 'Extract Chapter PDF') {
    const pw = new Zotero.ProgressWindow({ closeOnClick: true });
    pw.changeHeadline(headline);
    pw.addDescription(msg);
    pw.show();
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

// ── main ─────────────────────────────────────────────────────────────────────

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

const parent = Zotero.Items.get(item.parentItemID);
if (!parent) {
    showToast('This section has no parent book item');
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
if (existingPdfs.length > 0) {
    showToast('A PDF is already attached to this section — delete it first to re-extract');
    return;
}

const bookPdfPath = await bookPdf.getFilePathAsync();

// Check for page labels by scanning raw PDF bytes (in-process, no subprocess).
// qpdf writes /PageLabels as plain text in the catalog object.
const bytes = await IOUtils.read(bookPdfPath);
const pdfText = new TextDecoder('latin1').decode(bytes);
if (!pdfText.includes('/PageLabels')) {
    showToast('Book PDF has no page labels — add them with qpdf first');
    return;
}

// Resolve both labels to physical page numbers in one Python invocation
let physStart, physEnd;
try {
    const out = await subprocess(PDFLABELS, [start, end, bookPdfPath]);
    [physStart, physEnd] = out.trim().split(' ');
} catch (e) {
    showToast(e.message || `Could not resolve page labels '${start}'–'${end}'`);
    return;
}

// Compute output path beside source PDF
const outPath = bookPdfPath.replace(/\.pdf$/i, `_${start}-${end}.pdf`);

// Extract pages with qpdf
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

// Import into Zotero with parent-metadata filename
const fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(parent);
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
```

- [ ] **Step 4: Commit**

```bash
cd ~/dotfiles
git add zotero/extract-chapter-pdf.js
git commit -m "feat: add Zotero chapter PDF extractor Actions & Tags snippet"
```

---

## Task 5: Install Actions & Tags + configure the action (manual steps)

- [ ] **Step 1: Install Actions & Tags plugin**

In Zotero 8: Tools → Add-ons → search "Actions & Tags" (author: windingwind) → Install → restart Zotero.

If not in the add-on store: download from https://github.com/windingwind/zotero-actions-tags/releases

- [ ] **Step 2: Create the action**

Edit → Preferences → Actions & Tags → click **+**:

| Field | Value |
|---|---|
| Name | `Extract chapter PDF` |
| Trigger | `Item context menu` |
| Operation | `Custom script` |
| Menu label | `Extract chapter PDF` |
| Data | *(paste full contents of `~/dotfiles/zotero/extract-chapter-pdf.js`)* |

Click **Save**.

- [ ] **Step 3: Happy path test**

Find a book section item with a non-empty `Pages` field (e.g. `23-45`) whose parent book item has a PDF with page labels.

Right-click the section → "Extract chapter PDF".

Expected: toast briefly, then the chapter PDF opens in the reader. The section item has a new PDF child attachment named after the book's metadata.

- [ ] **Step 4: Test all error paths (spec §9)**

| Test | Setup | Expected toast |
|---|---|---|
| En-dash `23–45` | Edit Pages to en-dash | Extraction succeeds |
| Roman numerals `xxiii-xlv` | Section with roman-numeral labels | Extraction succeeds |
| Single page `42` | Set `Pages: 42` | One-page attachment |
| No labels | Book PDF without `/PageLabels` | `"Book PDF has no page labels…"` |
| Label not found | `Pages: 9999` on labelled PDF | Error from pdflabels stderr |
| Empty Pages | Clear Pages field | `"Pages field is empty…"` |
| Already attached | Run extraction twice | `"A PDF is already attached…"` |
| No parent PDF | Remove PDF from book item | `"Parent book has no PDF attachment"` |

---

## Task 6: Retire original scripts from ~/scripts/

Only do this after all Task 5 tests pass.

- [ ] **Step 1: Check for references to old scripts**

```bash
grep -r "scripts/label2page\|scripts/haslabels\|scripts/cutpdf" ~/scripts/ 2>/dev/null
```

Check hits — in particular `cutpdf2` and `csvlabel2page` may reference `label2page`. Update any found references to use the dotfiles path or the `pdflabels` script as appropriate.

- [ ] **Step 2: Remove originals**

```bash
rm ~/scripts/cutpdf ~/scripts/label2page ~/scripts/haslabels
```

- [ ] **Step 3: Commit**

```bash
cd ~/dotfiles
git commit --allow-empty -m "chore: retire ~/scripts/cutpdf, label2page, haslabels (superseded by dotfiles/bin)"
```
