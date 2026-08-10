---
name: pdf-reader
description: Extract and read PDF or EPUB content efficiently using doc-read instead of rendering as images. Use whenever the user shares a PDF or EPUB path or asks to read/analyze such a document. This avoids expensive multimodal image rendering (20-30x token savings).
model: haiku
---

Use the `doc-read` CLI — outputs text to stdout. Dispatches on extension: PDF via `pdftotext -layout`, EPUB via its spine XHTML.

```bash
doc-read /path/to/file.pdf           # whole PDF
doc-read /path/to/file.pdf 1 5       # pages 1-5
doc-read /path/to/book.epub          # whole EPUB
doc-read /path/to/book.epub 12 14    # printed pages 12-14, if the EPUB has anchors
doc-read /path/to/book.epub --list-pages   # which printed labels it actually has
```

`pdf-read` still works as a symlink to the same tool.

## Page numbers

**PDF page arguments are physical indices**, as `pdftotext` counts them, not the printed numbers in the book. In most books these differ by the length of the front matter. Run `pdflabels --check <pdf>` to get the offset: output `yes (256 pages; samples p129='120')` means physical 129 carries printed label 120, so add 9 to any printed page.

**EPUB page arguments are printed labels**, taken from `epub:type="pagebreak"` anchors. Many EPUBs have none, in which case page arguments cannot be honored, a warning goes to stderr, and the whole text is printed. No page number is ever invented from position in the text.

## When not to use this

- Verifying a specific quote against a cited page: use the `quote-check` skill, whose `quote-find` handles offsets, hyphen-split words, and quote-mark normalization in one call.
- Purely visual PDFs (scanned images, no text layer): `doc-read` exits 2 saying so. Then use the multimodal `Read` tool. An empty extraction is not an absent passage.
- Whole books into context: a 250-page book is ~600 KB of text. Pass a page range.
