# filepath → citekey

Given a Zotero attachment filepath or a bare 8-character item key, return the Better BibTeX citation key.

## Data source

SQLite `~/Zotero/zotero.sqlite`, opened read-only with `?mode=ro&immutable=1` so it works whether or not Zotero is running. The citekey lives in `itemDataValues` under fieldName `citationKey`, attached to the parent item of the attachment.

`immutable=1` ignores the WAL — fine for citekey lookup; very recent edits may be invisible until Zotero next checkpoints.

## Input forms

The skill accepts any of:

- absolute filepath under `~/Zotero/storage/<KEY>/<filename>` (the common case — folder name is the attachment item key)
- bare 8-char attachment item key (e.g., `IV4X7GRL`)
- absolute filepath outside `~/Zotero/storage/` (linked file) — falls back to matching `itemAttachments.path`

## Lookup procedure

```bash
python3 - <<'PYEOF' INPUT
import os, re, sqlite3, sys

arg = sys.argv[1].strip()
arg = os.path.expanduser(arg)
DB = "/Users/glenn/Zotero/zotero.sqlite"

# 1. Extract attachment item key
m = re.search(r"/Zotero/storage/([A-Z0-9]{8})(?:/|$)", arg)
if m:
    att_key = m.group(1)
elif re.fullmatch(r"[A-Z0-9]{8}", arg):
    att_key = arg
else:
    att_key = None

# 2. Connect read-only
try:
    conn = sqlite3.connect(f"file:{DB}?mode=ro&immutable=1", uri=True)
except sqlite3.Error as e:
    print(f"SQLite open error: {e}", file=sys.stderr); sys.exit(1)

CITEKEY_SQL_BY_KEY = """
SELECT v.value
FROM items a
JOIN itemAttachments ia ON ia.itemID = a.itemID
JOIN itemData d        ON d.itemID = ia.parentItemID
JOIN fields f          ON f.fieldID = d.fieldID AND f.fieldName = 'citationKey'
JOIN itemDataValues v  ON v.valueID = d.valueID
WHERE a.key = ?
LIMIT 1
"""

CITEKEY_SQL_BY_PATH = """
SELECT v.value
FROM itemAttachments ia
JOIN itemData d        ON d.itemID = ia.parentItemID
JOIN fields f          ON f.fieldID = d.fieldID AND f.fieldName = 'citationKey'
JOIN itemDataValues v  ON v.valueID = d.valueID
WHERE ia.path = ? OR ia.path = ?
LIMIT 1
"""

row = None
if att_key:
    row = conn.execute(CITEKEY_SQL_BY_KEY, (att_key,)).fetchone()

if not row:
    # Linked-file fallback: try absolute path and Zotero's "attachments:<basename>" form
    base = os.path.basename(arg) if os.path.sep in arg else arg
    row = conn.execute(CITEKEY_SQL_BY_PATH, (arg, f"attachments:{base}")).fetchone()

if row:
    print(row[0]); sys.exit(0)
else:
    print(f"NOT FOUND: no citekey for input '{arg}'", file=sys.stderr); sys.exit(1)
PYEOF
```

Replace `INPUT` with the filepath or attachment key.

## Output

A single line with the citekey, e.g. `Ashton2019`. Empty stdout + exit 1 on miss.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success — citekey printed |
| 1 | Not found, or SQLite error |

## Common use

- naming an Obsidian note for a paper the user has shared by Zotero PDF path (see `schematic-notes` skill)
- resolving a citekey for inline `[@citekey]` references when the user gives only the path
