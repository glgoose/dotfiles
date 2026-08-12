# Zotero local API & connector — operational reference

Tested against **Zotero 9.0.3** (the bundled `localhost:23119` server). All facts below were verified in a live run on Benhabib1996. Keep this file as the source of truth; do not rely on Claude memory.

## Endpoints summary

| Path | Method | Works? | Notes |
|------|--------|--------|-------|
| `/api/users/0/items` | GET | ✅ | Read-only library API. `Zotero-API-Version: 3` header. Supports `q`, `qmode`, `itemType`, `sort`, `direction`, `limit`. |
| `/api/users/0/items/<key>` | GET | ✅ | Single item with full `data`. |
| `/api/users/0/items/<key>` | PATCH | ❌ HTTP 501 | "Method not implemented". Cannot update fields on existing items via API. |
| `/api/users/0/items/<key>` | DELETE | ❌ HTTP 501 | Same. Cannot delete via API. |
| `/api/users/0/items` | POST | ❌ HTTP 501 | "Endpoint does not support method". |
| `/connector/ping` | GET | ✅ | Health check — returns HTML. |
| `/connector/saveItems` | POST | ✅ | **Only write path.** Creates items. Body must include `items[]`, `uri`, `cookie`, `sessionID`. HTTP 201, empty response body. |
| `/connector/updateSession` | POST | △ | Returns SESSION_NOT_FOUND if session closed (saveItems closes immediately). Not useful for post-hoc updates. |
| `/better-bibtex/json-rpc` | POST | ✅ read-only | Methods: `item.search`, `item.attachments`, `item.export`, `item.citationkey`, `library.*`, `collection.*`, `autoexport.*`. **No write methods.** Param form: `{"method":"item.search","params":["<citekey>"]}` — single string, not an array. |

## Connector `saveItems` request schema

```json
{
  "items": [{
    "itemType": "bookSection",
    "title": "Chapter Title",
    "creators": [
      {"creatorType": "author", "firstName": "X", "lastName": "Y"},
      {"creatorType": "editor", "firstName": "Z", "lastName": "W"}
    ],
    "bookTitle": "Parent Book Title",
    "publisher": "...",
    "place": "...",
    "date": "1996",
    "ISBN": "978-...",
    "series": "...",
    "language": "en",
    "extra": "Chapter: 1",
    "pages": "21-30",
    "relations": {"dc:relation": ["http://zotero.org/users/<uid>/items/<parent-key>"]}
  }],
  "uri": "any string — used as the source URL in Zotero's UI",
  "cookie": "",
  "sessionID": "must be unique per call"
}
```

Confirmed pass-through fields: `itemType`, `title`, `creators[]`, `bookTitle`, `publisher`, `place`, `date`, `ISBN`, `series`, `language`, `extra`, `relations.dc:relation`. Highly likely (same family): `pages`, `volume`, `numberOfVolumes`, `edition`, `numPages`, `shortTitle`, `url`, `accessDate`, `archive`, `archiveLocation`, `libraryCatalog`, `callNumber`, `rights`, `abstractNote`.

## Connector `saveItems` response

- HTTP `201 Created`. Body is **empty** — the new item key is NOT returned.
- Recover the key immediately after by:
  ```
  GET /api/users/0/items?sort=dateAdded&direction=desc&itemType=<t>&limit=<N>
  ```
  and matching by `data.extra` or `data.title`.

## Quirks

- **All-caps titles** are title-cased by the translator pipeline (`"CONNECTOR TEST"` → `"Connector Test"`). Send normal proper case.
- **`relations` is uni-directional in storage** but Zotero's UI Related tab queries both directions, so setting `dc:relation` only on the child is enough — the parent's Related tab will display the child.
- **`sessionID`** must be unique per call. The session closes when saveItems returns; `updateSession` cannot patch it afterwards.
- Better BibTeX **auto-assigns a citationKey** to newly-created items (e.g. `Habermas1996a`). No need to set it yourself.
- New items land in **My Library root**, not in any collection. Add `collections: ["<collectionKey>"]` to the item dict to file them.

## When you must mutate an existing item

You cannot. The only path is JavaScript pasted into Zotero's **Tools → Developer → Run JavaScript** dialog:

```js
const libID = Zotero.Libraries.userLibraryID;
const it = await Zotero.Items.getByLibraryAndKeyAsync(libID, "<key>");
it.setField("pages", "21-30");
await it.saveTx();
```

To delete: `await it.eraseTx();`

GUI scripting Zotero's menus via `osascript` requires accessibility permission for your terminal in **System Settings → Privacy & Security → Accessibility**. Without it: `osascript is not allowed assistive access`.

## Resolving a citekey to a parent URI

```bash
curl -s -X POST -H 'Content-Type: application/json' \
  http://127.0.0.1:23119/better-bibtex/json-rpc \
  -d '{"jsonrpc":"2.0","method":"item.search","params":["<citekey>"]}' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin)["result"][0]; print(d["id"])'
```

The `id` field IS the parent URI (`http://zotero.org/users/<uid>/items/<key>`). Use it directly in `relations.dc:relation`.

## Adding items by ISBN (batch import)

Prefer Zotero's internal `Zotero.Translate.Search` over building your own metadata pipeline. Run via **Tools > Developer > Run JavaScript**:

```js
const isbns = ["9781032156323", "9780415327862" /*, ... */];

for (const isbn of isbns) {
  const search = new Zotero.Translate.Search();
  search.setIdentifier({ ISBN: isbn });
  const translators = await search.getTranslators();
  search.setTranslator(translators);
  await search.translate({ libraryID: Zotero.Libraries.userLibraryID });
  Zotero.debug(`Imported ${isbn}`);
}
```

This uses Zotero's own translator pipeline (WorldCat, Library of Congress, etc.) — the same as the "Add by Identifier" wand — and returns full metadata without external API rate limits. No need for Open Library / Google Books scraping.

## Probing for new Zotero versions

If Zotero's local API gains write support in a future version, re-probe:
```bash
curl -s -X PATCH 'http://127.0.0.1:23119/api/users/0/items/<some-key>' \
  -H 'Zotero-API-Version: 3' \
  -H 'If-Unmodified-Since-Version: <version>' \
  -H 'Content-Type: application/json' \
  -d '{"pages":"1-2"}' -w "\n%{http_code}\n"
```

If it returns `204 No Content` (success) instead of `501 Method not implemented`, this skill can shift to PATCH-based field updates and the JS-paste fallback becomes optional.
