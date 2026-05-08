---
name: zotero-lookup
description: Resolve between Zotero citation keys and attachment filepaths in ~/Zotero/storage/. Forward direction (citekey → PDF/EPUB path) when the user mentions a citation key like @smith2020. Reverse direction (filepath or 8-char attachment item key like IV4X7GRL → citekey) when the user shares a Zotero attachment path or asks for the citekey of a paper.
---

# Zotero Lookup

Bidirectional resolver. Pick the subfile based on what the user gave you, then follow it.

## Routing

| Input | Direction | Read |
|------|-----------|------|
| citation key, with or without `@` (e.g., `@smith2020`, `Ashton2019`) | citekey → filepath | `citekey-to-path.md` |
| absolute filepath under `~/Zotero/storage/<KEY>/...` | filepath → citekey | `path-to-citekey.md` |
| bare 8-char attachment item key (e.g., `IV4X7GRL`) | item key → citekey | `path-to-citekey.md` |
| absolute filepath outside `~/Zotero/storage/` (linked file) | filepath → citekey | `path-to-citekey.md` |

If the input is ambiguous (e.g., a short string that could be either a citekey or an item key), prefer the citekey direction first; on miss, fall back to the path direction.

## Common chains

- citekey → path → `pdf-reader` to read content
- path → citekey → use as Obsidian note filename (`schematic-notes` skill)
