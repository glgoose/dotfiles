---
name: zotero-lookup
description: Resolve a Zotero citation key to the attachment filepath (PDF or EPUB) in ~/Zotero/storage/. Use when the user mentions a citation key (like @smith2020 or smith2020title) and wants to find, read, or open the corresponding file.
---

# Zotero Citation Key Lookup

Given a citation key, return the PDF/EPUB attachment path(s) from ~/Zotero.

## Data sources

- **Zotero open** (port 23119 responds): BBT JSON-RPC `item.search` → Zotero connector API `/items/{key}/children` → `links.enclosure.href` (a `file://` URI)
- **Zotero closed**: SQLite `zotero.sqlite` — has a native `citationKey` field; resolve `storage:` paths via the attachment item's `key` hash

## Lookup procedure

Extract the citation key from the user's message (strip leading `@` if present), then run:

```bash
python3 - <<'PYEOF' CITATION_KEY
import json, os, subprocess, sys
from urllib.parse import unquote

key = sys.argv[1].lstrip('@')
DB = "/Users/glenn/Zotero/zotero.sqlite"
STORAGE = "/Users/glenn/Zotero/storage"

def curl_json(url, method="GET", data=None, headers=None):
    cmd = ['curl', '-s', '--connect-timeout', '2', '-X', method, url]
    for h in (headers or []):
        cmd += ['-H', h]
    if data:
        cmd += ['-d', data]
    r = subprocess.run(cmd, capture_output=True, text=True)
    return r.stdout.strip()

# Detect Zotero
ping = curl_json('http://localhost:23119/connector/ping')
zotero_open = bool(ping)

if zotero_open:
    # Step 1: BBT item.search to find the item by citekey
    payload = json.dumps({"jsonrpc": "2.0", "method": "item.search",
                          "params": {"terms": key}, "id": 1})
    raw = curl_json('http://localhost:23119/better-bibtex/json-rpc',
                    method='POST',
                    data=payload,
                    headers=['Content-Type: application/json'])
    if not raw:
        print(f"BBT search returned empty response", file=sys.stderr); sys.exit(1)

    resp = json.loads(raw)
    if "error" in resp:
        print(f"BBT error: {resp['error']}", file=sys.stderr); sys.exit(1)

    # Find exact citekey match
    items = resp.get("result", [])
    match = next((i for i in items if i.get("citekey") == key or i.get("citation-key") == key), None)
    if not match:
        print(f"NOT FOUND: '{key}' not in Zotero", file=sys.stderr); sys.exit(1)

    # Step 2: derive local API URL from item id
    # id is like "http://zotero.org/users/13145225/items/EK4KKRGF"
    item_uri = match["id"]
    local_url = item_uri.replace("http://zotero.org", "http://localhost:23119/api") + "/children"

    children_raw = curl_json(local_url)
    if not children_raw:
        print(f"No children response for '{key}'", file=sys.stderr); sys.exit(2)

    children = json.loads(children_raw)
    paths = []
    for child in children:
        enclosure = child.get("links", {}).get("enclosure", {})
        href = enclosure.get("href", "")
        ctype = enclosure.get("type", "")
        if href.startswith("file://") and ctype in ("application/pdf", "application/epub+zip"):
            paths.append(unquote(href[7:]))  # strip "file://" and URL-decode

    if not paths:
        print(f"Found in Zotero but no PDF/EPUB attachment for '{key}'", file=sys.stderr); sys.exit(2)

    for p in paths:
        print(p)

else:
    # Zotero closed — SQLite lookup via citationKey field
    query = f"""
        SELECT i.key, ia.path
        FROM items i
        JOIN itemData cid   ON cid.itemID = i.itemID
        JOIN itemDataValues cidv ON cidv.valueID = cid.valueID
        JOIN fields cf      ON cf.fieldID = cid.fieldID AND cf.fieldName = 'citationKey'
        JOIN itemAttachments ia ON ia.parentItemID = i.itemID
        WHERE cidv.value = '{key}'
          AND ia.contentType IN ('application/pdf', 'application/epub+zip')
    """
    r = subprocess.run(['sqlite3', DB, query], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"SQLite error: {r.stderr.strip()}", file=sys.stderr); sys.exit(1)

    lines = [l for l in r.stdout.strip().splitlines() if l.strip()]
    if not lines:
        print(f"NOT FOUND: '{key}' not in Zotero (or no attachment). Open Zotero and retry for API lookup.", file=sys.stderr)
        sys.exit(1)

    for line in lines:
        parts = line.split('|', 1)
        if len(parts) == 2:
            att_key, path = parts[0].strip(), parts[1].strip()
            if path.startswith('storage:'):
                print(os.path.join(STORAGE, att_key, path[8:]))
            else:
                print(path)
PYEOF
```

Replace `CITATION_KEY` with the actual key (with or without `@`).

## Output

One or more absolute file paths, one per line. Report all to the user; prefer the first (usually primary PDF).

## Exit codes / error cases

| Code | Meaning |
|------|---------|
| 0 | Success — paths printed |
| 1 | NOT FOUND in Zotero, or API/SQLite error |
| 2 | Found in Zotero but no PDF/EPUB attached |

If Zotero is closed and key not found in SQLite: open Zotero and retry (API path may succeed).

## Chaining

After resolving the path, immediately chain to the `pdf-reader` skill to extract and read the content.
