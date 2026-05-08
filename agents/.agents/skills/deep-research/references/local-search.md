# Local source channels

Search the user's already-curated material before going to the open web. Two channels: Zotero library and Obsidian vault.

## Zotero (local API)

Zotero ships a local HTTP API on `127.0.0.1:23119` whenever Zotero desktop is running. No auth needed. User ID `0` resolves to the active local user.

### Search by topic

```bash
curl -s "http://127.0.0.1:23119/api/users/0/items?q=<query>&qmode=everything&limit=20&format=json"
```

- `q` — query string (URL-encoded; spaces as `+`).
- `qmode=everything` searches title, creator, year, abstract, tags, and full-text content of attachments. Default `titleCreatorYear` is narrower; prefer `everything` for research.
- Returns array of items with `key`, `data.title`, `data.creators`, `data.date`, `data.url`, `data.DOI`, `data.abstractNote`, and a `links.attachment` block when a PDF is attached.

### Resolve attachment to disk path

The PDF lives under `~/Zotero/storage/<ATTACHMENT_KEY>/<filename>`. The attachment key is the `links.attachment.href` tail (e.g. `…/items/DM4D5WN3` → key `DM4D5WN3`). Get the filename:

```bash
curl -s "http://127.0.0.1:23119/api/users/0/items/<ATTACHMENT_KEY>?format=json" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['filename'])"
```

Then read the PDF text with the `pdf-reader` skill (or `pdftotext <path> -` directly).

### Resolve item to citekey

Better BibTeX exposes citekeys at:

```bash
curl -s "http://127.0.0.1:23119/better-bibtex/json-rpc" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"item.citationkey","params":[["<ITEM_KEY>"]]}'
```

Or use the `zotero-lookup` skill (`citekey-to-path.md` / `path-to-citekey.md`) for higher-level lookups.

### Example — full chain (find paper, read PDF)

```bash
# 1. Search
curl -s "http://127.0.0.1:23119/api/users/0/items?q=hermeneutical+injustice&qmode=everything&limit=5&format=json" -o /tmp/zot.json
# 2. Inspect titles + attachment keys
python3 -c "import json;[print(d['data']['title'],'->',d.get('links',{}).get('attachment',{}).get('href','no-pdf').rsplit('/',1)[-1]) for d in json.load(open('/tmp/zot.json'))]"
# 3. Get filename for attachment, then read with pdftotext or pdf-reader skill
```

### When Zotero is not running

The curl will fail with connection refused. Surface this to the user and ask whether to (a) launch Zotero, (b) skip the Zotero channel for this run, or (c) abort.

## Obsidian vault (CLI)

The user's vault is at `~/Documents/obsidian/wiki/`. Use the `obsidian` CLI when Obsidian desktop is open:

```bash
obsidian search query="<topic>" limit=20
obsidian read file="<note name>"           # by wikilink name
obsidian read path="<vault-relative path>"  # by path
obsidian backlinks file="<note name>"
```

Vault notes are user's own synthesis — when one matches the topic, treat it as a high-quality source: read it, follow its citekey references back to Zotero, mine its bibliography.

The vault uses citekey-named files for paper notes (e.g. `Fricker2007.md`). When you find one, the citekey is the filename stem.

### Fallback: ripgrep the vault

If Obsidian isn't running:

```bash
rg -l --type md "<query>" ~/Documents/obsidian/wiki/
```

Slower for large vaults but always available.

## Source-list tagging

Local-channel sources go into `sources/source-list.md` with provenance tags:

```
[S3] [zotero] **<Title>** — <Author>, <Year>. <DOI or URL>. Local PDF: ~/Zotero/storage/<KEY>/<file>.pdf. Citekey: @<key>. Retrieved <YYYY-MM-DD>.
[S4] [obsidian] **<Note title>** — your own note, dated <vault-mtime>. Path: ~/Documents/obsidian/wiki/<file>.md. Retrieved <YYYY-MM-DD>.
```

Tag the channel up front. This lets the verifier and the citation pass treat local sources as already-trusted (you've read them) versus web sources (need re-fetch to confirm).
