# pdf-label — Design Spec

**Date:** 2026-04-14  
**Status:** Approved

## Overview

`bin/pdf-label` — AI-assisted script that detects and applies logical page labels to a PDF. Uses Claude (text model) to reason about page structure from targeted extracts. Applies labels via `qpdf`.

## Interface

```
pdf-label [--confirm|-c] <file.pdf>
```

- Default: fully automatic — detect, apply, done
- `--confirm` / `-c`: show proposed spec, prompt before applying (for initial validation runs)
- Modifies PDF in-place (writes to temp, replaces on success)

## Dependencies

System tools (checked at startup with clear install hints):
- `pdftotext` — poppler: `brew install poppler`
- `qpdf` — `brew install qpdf`

Environment:
- `ANTHROPIC_API_KEY` (via Keychain, as per dotfiles pattern)

Runtime: Python uv script with inline deps:
```python
#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["anthropic"]
# ///
```

## Extraction Pipeline (code-side, no LLM)

1. `pdfinfo <file>` → total page count
2. TOC search limit = `max(20, total_pages × 10%)`
3. Scan pages 1→limit one-by-one (`pdftotext -f N -l N`):
   - Detect TOC page: `"contents"` (case-insensitive) + at least one dot-leader line (`word ... number`)
   - Stop on first match; record page number(s)
4. Extract pages 1–3 full text
5. Extract TOC page(s) full text
6. Sample 15 evenly-spaced pages across whole doc → extract first 2 + last 2 non-empty lines (header/footer strips)
7. If no extractable text found anywhere → exit: `"PDF has no extractable text — run OCR first"`

## LLM Call

Single Claude call. System prompt explains qpdf label format:
- `N:` = no label (cover/blank)
- `N:r` = roman numerals starting at i
- `N:D` = arabic numerals starting at 1
- `N:D/K` = arabic numerals starting at K (gap — physical page N gets label K)

User message contains:
- Pages 1–3 text
- TOC page(s) text
- 15 header/footer strips with physical page numbers
- Total page count

Claude returns only the label spec string, e.g. `1: 2:r 60:D`.

Script validates output with regex before proceeding. On validation failure: error + raw LLM output shown.

## Applying Labels

```
qpdf --set-page-labels "<spec>" input.pdf tmp.pdf && mv tmp.pdf input.pdf
```

On qpdf failure: show stderr, leave original untouched.

## Confirm Mode Flow

```
Proposed labels: 1: 2:r 60:D
Apply? [y/n/edit]: e
Enter corrected spec: 1: 2:r 58:D
Applied.
```

Options: `y` apply, `n` abort, `e` re-prompt for corrected spec then apply.

## Error Handling

| Condition | Behavior |
|---|---|
| `pdftotext` not found | Error + `brew install poppler` |
| `qpdf` not found | Error + `brew install qpdf` |
| `ANTHROPIC_API_KEY` not set | Error + Keychain hint |
| No extractable text | Error: run OCR first |
| TOC not found | Warn, proceed with pages 1–3 + sampled footers only |
| LLM output fails validation | Error + raw output shown |
| qpdf fails | Error + stderr, original untouched |

## Happy Path Examples

```
$ pdf-label Baehrens.pdf
Extracting structure...
Querying Claude...
Applying labels: 1: 2:r 60:D
Done.

$ pdf-label --confirm Carve.pdf
Extracting structure...
Querying Claude...
Proposed labels: 1: 2:r 15:D
Apply? [y/n/edit]: y
Done.
```

## Test Data

`~/projects/identify-pagesnr/` — 4 example PDFs with known labels in `labels.csv`:
- `Baehrens.pdf` — cover + roman + arabic (clean modern PDF)
- `Carve.pdf` — cover + roman + arabic (page before half-title)
- `Hall.pdf` — cover + roman + arabic (short roman section)
- `Hay.pdf` — roman only start, many gaps (complex case)
