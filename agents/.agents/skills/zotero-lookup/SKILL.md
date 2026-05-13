---
name: zotero-lookup
description: Resolve between Zotero citation keys and attachment filepaths in ~/Zotero/storage/. Forward direction (citekey → PDF/EPUB path) when the user mentions a citation key like @smith2020. Reverse direction (filepath or 8-char attachment item key like IV4X7GRL → citekey) when the user shares a Zotero attachment path or asks for the citekey of a paper.
---

Run the CLI at `~/dotfiles/bin/zotero-lookup`:

- Forward: `zotero-lookup <citekey>` — prints absolute path(s), one per line. Strip-`@` is automatic.
- Reverse: `zotero-lookup -r <path-or-8char-attachment-key>` — prints the citekey.

Exit 0 on success, 1 on miss or error. Errors go to stderr. Run `zotero-lookup --help` for full usage.

Common chains:
- citekey → path → `pdf-reader` skill to read content.
- path → citekey → use as Obsidian note filename (`schematic-notes` skill).
