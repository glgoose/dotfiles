---
name: zotero-chapter-items
description: "Extract a Zotero book's chapters from its TOC and add each one as a bookSection item with Extra 'Chapter: N', page range, and a Related link back to the parent book. Works for both edited volumes (different chapter authors) and single-authored collected works (same author throughout). Trigger when the user names a Zotero citekey (e.g. @Benhabib1996, @Habermas1992) together with phrasing like 'extract chapters', 'add TOC as items', 'split into bookSections', 'create chapter items from this book', or 'make each chapter a separate Zotero item'."
model: sonnet
---

# zotero-chapter-items

## What this skill does

Given a Zotero citekey of a book, turn its TOC into individual `bookSection` items. Handles two book types:

**Edited volume** — each chapter has its own author; the parent item has an `editor` creator.
- Creators per item: chapter `author` + parent `editor`

**Collected work** — single-authored essay collection; the parent item has an `author` creator, no editor.
- Creators per item: parent `author` only (no editor added)

All items carry:
- `Extra: Chapter: <N>` (`Chapter: Introduction` for front matter)
- `pages: <start>-<end>` derived from the TOC
- `relations.dc:relation` pointing at the parent book
- Shared `bookTitle`, `publisher`, `place`, `date`, `ISBN`, `series`, `language` from the parent

## Detecting book type

After fetching parent metadata via BBT JSON-RPC, inspect `creators`:
- Any creator with `creatorType == "editor"` → **edited volume**
- All creators have `creatorType == "author"`, none `"editor"` → likely **collected work**, but **cross-check the TOC** (see below)

**Cross-check (mandatory):** Scan the first few TOC entries. If different author names appear per chapter, it's an **edited volume** regardless of the Zotero record's creator type. Zotero records frequently catalogue edited volumes with the editor listed as `author`. When in doubt, treat as edited volume and parse per-chapter authors.

**Exception — single-authored collected works:** A volume where all chapters are by the same person (e.g. a Habermas essay collection) legitimately has `author` on the parent and uses the collected-work path. Only reclassify and fix the parent creator type when chapters have genuinely different authors.

## Quick start

```
1. zotero-lookup <citekey>                       → PDF path
2. pdf-read <pdf> 1 15                           → TOC text
3. Detect book type from parent metadata + cross-check TOC for per-chapter author names
4. Dedup gate: GET items by bookTitle; if any Extra: Chapter: N already exists → STOP and report to user
5. Parse TOC:
   - Edited volume:  [{n, title, first_name, last_name, start_page}]  (per-chapter authors from TOC)
   - Collected work: [{n, title, start_page}]  (author inherited from parent)
6. Compute end_page = next start − 1 (minus part-divider pages)
   If TOC page numbers are missing (dot-leader dropout) → use author-scan method (see Failure modes)
7. Show parsed table to user; AskUserQuestion to confirm
8. Resolve parent URI via BBT JSON-RPC item.search
9. If book type was corrected to edited volume but parent has editor as `author` → emit JS to fix parent first (see Failure modes)
10. python3 scripts/post_chapters.py --parent-uri <uri> --book-title "…" --publisher "…" --place "…" --date "…" --isbn "…" --series "…" --language "…" [--editor-first "…" --editor-last "…" | --author-first "…" --author-last "…"] --chapters-json <path>
    Pass --editor-first/--editor-last for edited volumes; --author-first/--author-last for collected works.
11. Verify each new item has extra + pages + relations populated
12. Fallback only if a field didn't persist → fix-pages.js JS paste
```

## Pre-POST checklist (mandatory)

- [ ] Citekey resolved via `zotero-lookup`; PDF path captured
- [ ] Parent metadata fetched via BBT JSON-RPC `item.search`; parent URI = `http://zotero.org/users/<uid>/items/<key>`
- [ ] Book type confirmed via TOC cross-check (not metadata alone)
- [ ] For edited volumes: each chapter's author confirmed from TOC body — NOT inferred from parent metadata
- [ ] TOC captured fully (last entry matches what's at the bottom of the printed TOC); re-run `pdf-read` with deeper page range if not
- [ ] Page ranges computed; spot-check Part-divider transitions
- [ ] **Dedup gate passed**: no existing `Extra: Chapter: N` items for this bookTitle
- [ ] User confirmed the parsed table via `AskUserQuestion` — **mandatory before any POST**

## Front matter

Include Introduction / Preface / Foreword / Afterword by default. Use the literal string in the Extra field, e.g. `Chapter: Introduction`, `Chapter: Preface`. Skip only when the user explicitly asks for numbered chapters only.

## Page-range derivation

Chapter `n` ends at `start_page(n+1) − 1`, **minus** any Part-divider title pages that sit between the two chapter starts. Spot the Part dividers as TOC entries like `PART ONE …`, `PART TWO …` with their own page numbers. The last chapter ends at `start_page(back-matter entry) − 1` (`List of Contributors`, `Index`, `Bibliography`).

## Field set per bookSection (sent to `/connector/saveItems`)

**Edited volume** (chapter author + parent editor):
```
{
  "itemType": "bookSection",
  "title": "<chapter title>",
  "creators": [
    {"creatorType": "author", "firstName": "<chapter author first>", "lastName": "<chapter author last>"},
    {"creatorType": "editor", "firstName": "<parent editor first>", "lastName": "<parent editor last>"}
  ],
  "bookTitle": "<parent title>",
  "publisher": "...", "place": "...", "date": "...",
  "ISBN": "...", "series": "...", "language": "...",
  "extra": "Chapter: <n>",
  "pages": "<start>-<end>",
  "relations": {"dc:relation": ["<parent URI>"]}
}
```

**Collected work** (parent author only, no editor):
```
{
  "itemType": "bookSection",
  "title": "<chapter title>",
  "creators": [
    {"creatorType": "author", "firstName": "<parent author first>", "lastName": "<parent author last>"}
  ],
  "bookTitle": "<parent title>",
  "publisher": "...", "place": "...", "date": "...",
  "ISBN": "...", "series": "...", "language": "...",
  "extra": "Chapter: <n>",
  "pages": "<start>-<end>",
  "relations": {"dc:relation": ["<parent URI>"]}
}
```

POST one item per request. Use a unique `sessionID` per call, e.g. `"<citekey>-ch<n>-<unix-ts>"`.

## Failure modes / fallbacks

- **`pages` field empty after POST.** Zotero local API can't PATCH (HTTP 501). Emit a JS snippet like:
  ```js
  const libID = Zotero.Libraries.userLibraryID;
  const pages = { "<key1>": "<a-b>", ... };
  for (const [k,p] of Object.entries(pages)) {
    const it = await Zotero.Items.getByLibraryAndKeyAsync(libID,k);
    if (it){ it.setField("pages",p); await it.saveTx(); }
  }
  ```
  Write to `/tmp/zotero-chapter-items-<run-id>/fix-pages.js`, `pbcopy` it, instruct user to paste into **Zotero → Tools → Developer → Run JavaScript**.

- **Wrong title / extra field on a posted item.** Local API can't DELETE. Same JS-paste route with `eraseTx()`.

- **TOC not in first 15 pages.** Re-run `pdf-read <path> 1 30` or read targeted pages around `pdf-read <path> N M`.

- **Connector returns HTTP 201 with empty body.** Expected on Zotero 9.0.3 — new keys aren't returned. Recover by `GET /api/users/0/items?sort=dateAdded&direction=desc&itemType=bookSection&limit=<N>` immediately after the batch.

- **TOC page numbers missing (dot-leader dropout).** `pdftotext` frequently drops dot leaders (`.....`), leaving chapter titles with no page numbers in the extracted text. Use the **author-scan method**:
  1. Determine `offset`: find one chapter whose book page is known (e.g. from a partial TOC line or the index). Compute `offset = file_page − book_page`. Verify with a second data point — the offset is consistent across the whole book.
  2. Scan the PDF **past the front matter** for each chapter author's name. Author names appear in both the Contributors section (front matter) and the chapter opening pages — start scanning from the file page corresponding to chapter 1 onward, not from file page 1.
  3. `book_page = file_page_of_author_name − offset`. This is the chapter's start page.
  4. End page of chapter N = start page of chapter N+1 minus 1.

- **Parent item has editor miscatalogued as `author`.** If the TOC cross-check confirms a multi-author edited volume but the parent Zotero item has the editor listed as `creatorType: "author"`, fix the parent via JS paste before or alongside posting chapters:
  ```js
  const libID = Zotero.Libraries.userLibraryID;
  const it = await Zotero.Items.getByLibraryAndKeyAsync(libID, "<parent-key>");
  it.setCreators([{creatorType: "editor", firstName: "<first>", lastName: "<last>"}]);
  await it.saveTx();
  ```
  Only applies to edited volumes with chapters by different authors. Single-authored collected works legitimately keep `author` on the parent.

## What this skill never does

- PATCH/DELETE via local API (HTTP 501 on Zotero 9.0.3)
- Recreate existing items to "fix" fields (would break BBT citekeys + Related links)
- POST without showing the user the parsed chapter table first

## Reference

All Zotero API operational facts (endpoints, what works, what doesn't, schemas, quirks, version-re-probing recipe) live in [REFERENCE.md](REFERENCE.md). Consult it before touching any HTTP call this skill makes.

Quick cheat sheet:
- Parent resolution: `POST /better-bibtex/json-rpc` `{"method":"item.search","params":["<citekey>"]}` → `result[0].id` IS the parent URI.
- Create item: `POST /connector/saveItems` (only working write path).
- Verify item: `GET /api/users/0/items/<key>` with `Zotero-API-Version: 3`.
- Mutate existing: only via JS paste (Tools → Developer → Run JavaScript).
- Helper script: `scripts/post_chapters.py` (use `--dry-run` first to inspect payloads).
