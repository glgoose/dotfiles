# KOReader highlights → Zotero — sketch, not yet built

Status: proved out manually once (2026-08-07, De Vos 2013 *Psychologization and the
Subject of Late Modernity*). Not automated. This doc is the plan to pick back up
when we decide to build it — see [[reference-zotero-actions-tags]] and
[[reference-zotero-db-locking]] for the underlying constraints this reuses.

## The core insight (already validated)

KOReader's PDF engine and PyMuPDF (`fitz`) both wrap **MuPDF**. KOReader's
per-highlight `pboxes` (`{x, y, w, h}` in PDF page-point space) are therefore
already in PyMuPDF's native page coordinate system — no y-flip, no DPI
conversion, no reflow-mode math. This is what makes writing highlights
straight back into the PDF trivial instead of a coordinate-transform project.

KOReader's highlight color names (yellow/orange/red/green/blue/purple/gray)
map ~1:1 onto Zotero's own annotation palette hex values, so highlights written
this way *look* native once imported, not like a foreign import.

## Where the data lives

`<book>.sdr/metadata.pdf.lua` next to the book on the device (Lua table, not
inside the PDF). Not synced anywhere by default — lives on the e-reader,
mounted over USB (`/Volumes/Kindle/documents/...` for this Kindle) or wherever
KOReader's sync target is.

Each annotation: `page`, `color` (KOReader name), `text`, `pboxes` (list of
boxes, one per line the highlight spans).

## What worked (manual one-off)

Script: `~/dotfiles/zotero/koreader-highlights-poc.py` (proof-of-concept,
not wired into anything).

1. Parse `.lua` sidecar with `slpp` (pure-Python Lua table parser) — no need
   for a real Lua interpreter, the format's simple enough.
2. For each annotation: build a `pymupdf.Rect` per pbox → `.quad` → pass all
   quads for that highlight to `page.add_highlight_annot(quads)`.
3. Map KOReader color name → RGB, `annot.set_colors(stroke=...)`.
4. Save the PDF. This writes a **standard PDF `/Highlight` annotation** —
   nothing Zotero-specific, any PDF viewer would show it.
5. Zotero's reader diffs a PDF's embedded annotations against what's already
   in its DB on each open, and offers to **import** ones it hasn't seen. That's
   the whole integration point — no Zotero-side JS, no DB writes at all.

Verified by rendering the annotated page to PNG with `page.get_pixmap()`
before touching the real Zotero-stored file, and by testing against a copy
first. Original file backed up before overwrite.

## Why this beats the earlier note-based plan

Earlier discussion (before this was tried) assumed the target was a Zotero
child *note* summarizing highlights, built via an Actions & Tags JS script —
following the same split as `isbn-download.md` (external tool reads/matches,
JS Action inside Zotero writes, because of DB locking). That's still valid for
*notes*, but for highlights specifically it's unnecessary complexity: writing
real PDF annotations sidesteps the DB-locking problem entirely, because it's a
plain filesystem write to the attachment file, not a DB write. Zotero's own
"detect annotations in file" flow does the import step for free.

## Open questions before automating

- **Book matching.** One-off matched by already knowing the Zotero item. For
  many books, need filename/title matching against Zotero — same problem
  `attach-isbn-downloads.js` solves for ISBNs, but matching key would be
  filename/title here (no ISBN in a `.sdr` sidecar to key off).
- **Reflow-mode books.** Only tested on a non-reflow PDF
  (`highlight_write_into_pdf = true` in the sidecar, standard paged rendering).
  KOReader books read in reflow/k2pdfopt mode may not have `pboxes` in native
  PDF page space — unverified, could need the coordinate transform this
  approach otherwise avoids.
- **Idempotency.** Re-running against a book that already had some highlights
  imported would duplicate them — needs a diff step (e.g. skip
  page+text+color combos already present as PDF annotations) before writing.
- **Trigger.** Fully automatic would mean: watch the mounted device (or a
  sync folder) for new/changed `.sdr` files, run the script, done — no Zotero
  JS action needed this time (unlike the note-based plan), since the write
  target is the PDF file itself, not the DB. Could run as a `launchd` job
  triggered on device mount, or a manual `dotfiles/bin/koreader-highlights-sync`
  invoked after a reading session.
- **Multi-line-highlight annotation content.** Currently sets `annot.set_info(content=...)`
  to KOReader's highlight text; worth checking Zotero surfaces that as the
  annotation's comment/text correctly on import, vs re-deriving it from the
  quads itself.

## When picking this up

Read this doc and `~/dotfiles/zotero/koreader-highlights-poc.py` first, don't
re-derive the MuPDF-coordinate-compatibility insight — that was the expensive
part to discover, trivial once known.
