---
name: zotero-lookup
description: Resolve between Zotero citation keys and attachment filepaths in ~/Zotero/storage/. Forward direction (citekey → PDF/EPUB path) when the user mentions a citation key like @smith2020. Reverse direction (filepath, 8-char attachment key, or 8-char parent item key like IV4X7GRL → citekey) when the user shares a Zotero attachment path/key or asks for the citekey of a paper.
model: haiku
model_tier: minimal
---

Minimal reasoning required -- use your cheapest/fastest available model.

Run the CLI at `~/dotfiles/bin/zotero-lookup`:

- Forward: `zotero-lookup <citekey>` — prints absolute path(s), one per line. Strip-`@` is automatic.
- Reverse: `zotero-lookup -r <path-or-8char-key>` — prints the citekey. Accepts an attachment key, a `storage/` path, OR a parent item key.

Exit 0 on success, 1 on miss or error. Errors go to stderr. Run `zotero-lookup --help` for full usage.

To find a paper's attachment, ALWAYS resolve the citekey with this CLI. Never sweep `~/Zotero/storage/` with `pdftotext | grep` to locate a file — it is slow across large PDFs and misses content outside the scanned page range (a paper's key terms may start dozens of pages in).

ALWAYS use this CLI (or, for batch item-key→citekey, the live BBT JSON-RPC `item.citationkey` at `http://127.0.0.1:23119/better-bibtex/json-rpc`) to read citekeys. Never hand-query the `better-bibtex.migrated` table or other BBT-internal snapshots — they go stale and miss recent adds, yielding false "no pinned key" results. The CLI reads live keys via JSON-RPC when Zotero is running and the current Zotero `citationKey` field otherwise.

Pitfalls the CLI now handles for you (don't re-diagnose these by hand):
- **attachment-less duplicate** — a citekey can be pinned to a duplicate item with no attachment while a title-twin holds the PDF. Forward lookup falls back to the title-twin and warns (`resolved via title-duplicate item`). If you see that warning, the file is real; flag the duplicate for merging.
- **null / dynamic keys** — an item with no pinned key returns "Not found" on reverse (correct: it has no stable citekey to cite). Pin it in Zotero before citing.

Common chains:
- citekey → path → `pdf-reader` skill to read content.
- path | item key → citekey → use as Obsidian note filename (`schematic-notes` skill).
