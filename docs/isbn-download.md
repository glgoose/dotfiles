# isbn-download — Zotero locking workflow

## The core constraint

Zotero's `~/Zotero/zotero.sqlite` runs in **DELETE** journal mode, not WAL. Verify with:

```sh
sqlite3 ~/Zotero/zotero.sqlite.bak "PRAGMA journal_mode;"
# → delete
```

In DELETE mode, an active Zotero process holds locks that block external SQLite reads **and** writes. WAL would allow concurrent readers plus one writer, DELETE does not. There's also a `zotero.sqlite-journal` rollback journal file (no `-wal` file).

This rules out "one Python script writes everything while Zotero stays open".

## The split: Python downloads, Zotero attaches

Responsibilities are split along the locking boundary:

| Tool | Does | Why it can run with Zotero open |
|---|---|---|
| `~/dotfiles/bin/isbn-download` (Python) | Search Anna's Archive, follow CDN, save files to `~/Downloads/` under `{safe_title}_{searched_isbn}.{pdf,epub}`. AA's `Content-Disposition` is discarded — AA filenames sometimes carry alternate-edition ISBNs, which would confuse the JS matcher. | No SQLite writes. Reads use Zotero's local HTTP API (port 23119) when available, SQLite fallback when not. |
| `~/dotfiles/zotero/attach-isbn-downloads.js` (Zotero Action) | Scan `~/Downloads/`, extract every valid ISBN from each PDF/EPUB filename, look them up in Zotero (10/13 cross-matched), attach via `Zotero.Attachments.importFromFile()`, dispose of the source file (see "File disposition" below). Misses go to `unmatched/`; the action never creates new items. | Runs *inside* Zotero, so it shares the same DB connection. No external lock contention. |

### Reads (`build_isbn_index`, `get_attached_formats`)

Hybrid. Prefer the local HTTP API when Zotero is running, fall back to direct SQLite reads when it isn't.

```
zotero_api_running()  ──true──►  HTTP GET /api/users/0/items
                      ──false──►  sqlite3.connect(ZOTERO_DB, timeout=30)
```

The cache `_zotero_api_cache` makes the running-check happen once per invocation.

### Writes

Done by the JS Action only. Python never touches the DB for writes.

## Setting up the JS Action

Requires the `Zotero Actions & Tags` plugin (windingwind/zotero-actions-tags).

1. Zotero, Edit menu, Preferences, Actions & Tags.
2. Add action, paste `~/dotfiles/zotero/attach-isbn-downloads.js`.
3. Name: "Attach ISBN downloads".
4. Triggers: enable **Menubar** (adds an entry under Tools) **and** **Shortcut** (bind a hotkey). Both fire the same script with no item-selection requirement.
5. Operation: Custom script.

The action:

- Indexes every regular item by every ISBN it has (space-separated multi-ISBN fields, as-stored form, `Zotero.Utilities.cleanISBN`-normalized form, plus ISBN-10↔ISBN-13 conversions so an item stored as one form still matches a filename carrying the other).
- Scans `~/Downloads/` for `.pdf`/`.epub` files. Extracts every 10-13 digit run from each filename, keeps the ones that pass `Zotero.Utilities.cleanISBN()` (check-digit validated), and tries each against the index (in filename order, both 10 and 13 variants). Hex hashes and stray phone numbers are rejected.
- If no ISBN in the filename matches any Zotero item, the file is moved to `~/Downloads/unmatched/`. The action **does not** create new Zotero items — that path produced duplicates in practice when AA filenames embedded alternate-edition ISBNs. `bin/isbn-download` is responsible for ensuring items exist before downloading.
- Skips items that already have a PDF/EPUB attachment of the same type, and trashes the redundant source file.
- Calls `Zotero.Attachments.importFromFile()` with `fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(item)` so attachments follow the user's existing rename template.
- Disposes of the source file based on outcome (see "File disposition" below) so re-running the action is idempotent.
- Reports counts via `Zotero.ProgressWindow`: `Attached · Skipped · Unmatched · Errors · No ISBN`.

### File disposition

| Outcome | Where the source file ends up |
|---|---|
| Newly attached to an existing Zotero item | macOS Trash (recoverable via Finder, "Put Back" intact) |
| Skipped because Zotero already has that attachment | macOS Trash |
| ISBN extracted but no matching Zotero item | `~/Downloads/unmatched/` |
| `importFromFile` threw | `~/Downloads/unmatched/` |
| No valid ISBN in filename | Left in `~/Downloads/` (out of the action's domain) |

Trashing uses `osascript -e 'tell application "Finder" to delete POSIX file ...'`, so the action is macOS-specific. `~/Downloads/unmatched/` is the user's inbox of "needs manual attention" files: fix the ISBN, add the item manually, or delete, then move the file back into `~/Downloads/` to retry.

Because the matching is filename-only, anything you drop into `~/Downloads/` whose name contains a valid ISBN (a manually-saved PDF, a friend's EPUB) will be picked up too.

## End-to-end workflow

1. `isbn-download <isbn_file>` while Zotero is open.
   - Files land in `~/Downloads/` as `{safe_title}_{searched_isbn}.{pdf,epub}` so the JS Action matches them against the same ISBN that was looked up against Zotero.
2. In Zotero: Tools menu → "Attach ISBN downloads" (or press the hotkey).
   - Attached and already-attached files go to Trash; unmatched/errored files go to `~/Downloads/unmatched/`.

If the Python step is re-run, ISBNs whose files are still sitting in `~/Downloads/` are detected by `already_downloaded()` (`glob(*{isbn}*.{ext})`, matches both AA and renamed shapes) and skipped, so re-runs don't redownload.

## Anna's Archive: the 169KB HTML trap

Independent of locking. The "no redirect" Fast Partner Server link returns an HTML intermediate page titled "Download from partner website", not the file. Always check `Content-Type` on the response. If `text/html`, parse for the first non-`annas-archive` `<a href>` ending in `.pdf|.epub|.djvu|.mobi`, then follow that CDN URL. See `download_file()` in the script.

Symptom of the bug: every downloaded file is around 169-170KB and `file` reports `HTML document text`.

## Schema reference (Zotero 7+)

```
items:           itemID, itemTypeID, libraryID, key, dateAdded, ...
itemAttachments: itemID, parentItemID, linkMode, contentType, path,
                 storageHash, storageModTime, syncState, ...
itemData:        itemID, fieldID, valueID
itemDataValues:  valueID, value
itemTypes:       itemTypeID, typeName    (typeName='attachment' → 2)
fields:          fieldID, fieldName      (fieldName='ISBN' → 25)
deletedItems:    itemID, dateDeleted
```

`linkMode=0` means `imported_file` (stored under `~/Zotero/storage/{8-char-key}/{filename}`), which is what dragging a PDF into Zotero creates. `Zotero.Attachments.importFromFile()` produces the same layout.

ISBN values can be space-separated multi-value strings, e.g. `"978-0-19-517532-5 978-0-19-978470-7"`. Split before normalizing. Both the Python read code and the JS Action handle this.
