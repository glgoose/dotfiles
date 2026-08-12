#!/usr/bin/env python3
"""POST a batch of bookSection items to Zotero via the local connector.

Reads a chapters JSON file. Each chapter has either a single author via
first_name/last_name, OR multiple authors via an "authors" array of
{"firstName","lastName"} objects:
[
  {"n": "Introduction", "title": "...", "first_name": "...", "last_name": "...", "pages": "3-17"},
  {"n": 1, "title": "...", "authors": [{"firstName":"A","lastName":"B"},{"firstName":"C","lastName":"D"}], "pages": "21-30"},
  ...
]

For collected works (single-authored), omit first_name/last_name/authors in chapter
JSON and pass --author-first/--author-last instead. No editor is added in that case.

Editors are shared across all chapters: either a single editor via
--editor-first/--editor-last, OR multiple editors via --editors-json
(a JSON array of {"firstName","lastName"}).

Calls POST http://127.0.0.1:23119/connector/saveItems once per chapter with
extra="Chapter: <n>", pages, relations.dc:relation=[parent_uri], and the
shared book metadata supplied via CLI. After the batch, GETs the most recent
N bookSection items to verify the fields persisted; emits a JSON report.

No external deps; stdlib only.
"""
import argparse
import json
import sys
import time
import urllib.request
import urllib.error

ZOT = "http://127.0.0.1:23119"


def build_creators(ch, args):
    if "authors" in ch:
        authors = [
            {"creatorType": "author", "firstName": a["firstName"], "lastName": a["lastName"]}
            for a in ch["authors"]
        ]
    elif ch.get("first_name") or ch.get("last_name"):
        authors = [{"creatorType": "author", "firstName": ch["first_name"], "lastName": ch["last_name"]}]
    else:
        # Collected work: inherit author from parent
        authors = [{"creatorType": "author", "firstName": args.author_first, "lastName": args.author_last}]

    if getattr(args, "editors_json", None):
        editors = [
            {"creatorType": "editor", "firstName": e["firstName"], "lastName": e["lastName"]}
            for e in json.loads(args.editors_json)
        ]
    elif args.editor_first or args.editor_last:
        editors = [{"creatorType": "editor", "firstName": args.editor_first, "lastName": args.editor_last}]
    else:
        editors = []
    return authors + editors


def post_chapter(ch, args, ts):
    payload = {
        "items": [{
            "itemType": "bookSection",
            "title": ch["title"],
            "creators": build_creators(ch, args),
            "bookTitle": args.book_title,
            "publisher": args.publisher,
            "place": args.place,
            "date": args.date,
            "ISBN": args.isbn,
            "series": args.series,
            "language": args.language,
            "extra": f"Chapter: {ch['n']}",
            "pages": ch.get("pages", ""),
            "relations": {"dc:relation": [args.parent_uri]},
        }],
        "uri": f"zotero://chapter-items/{args.session_prefix}/{ch['n']}",
        "cookie": "",
        "sessionID": f"{args.session_prefix}-ch{ch['n']}-{ts}",
    }
    req = urllib.request.Request(
        f"{ZOT}/connector/saveItems",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def fetch_recent(n):
    url = f"{ZOT}/api/users/0/items?sort=dateAdded&direction=desc&itemType=bookSection&limit={n}"
    req = urllib.request.Request(url, headers={"Zotero-API-Version": "3"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chapters-json", required=True)
    ap.add_argument("--parent-uri", required=True,
                    help="http://zotero.org/users/<uid>/items/<key>")
    ap.add_argument("--book-title", required=True)
    ap.add_argument("--publisher", required=True)
    ap.add_argument("--place", default="")
    ap.add_argument("--date", required=True)
    ap.add_argument("--isbn", default="")
    ap.add_argument("--series", default="")
    ap.add_argument("--language", default="en")
    ap.add_argument("--author-first", default="",
                    help="Parent author first name (collected works). Used when chapter JSON has no per-chapter author.")
    ap.add_argument("--author-last", default="",
                    help="Parent author last name (collected works).")
    ap.add_argument("--editor-first", default="")
    ap.add_argument("--editor-last", default="")
    ap.add_argument("--editors-json", default="",
                    help="JSON array of {firstName,lastName} for >1 editor. Overrides --editor-first/--editor-last.")
    ap.add_argument("--session-prefix", default="chapter-items",
                    help="Used in sessionID; recommend the parent citekey.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Print payloads, don't POST.")
    args = ap.parse_args()

    with open(args.chapters_json) as f:
        chapters = json.load(f)

    ts = int(time.time())
    posts = []
    for ch in chapters:
        if args.dry_run:
            posts.append({"n": ch["n"], "title": ch["title"], "dry_run": True})
            continue
        code, body = post_chapter(ch, args, ts)
        posts.append({
            "n": ch["n"],
            "title": ch["title"],
            "http": code,
            "body": body[:200],
        })
        print(f"Ch {ch['n']}: HTTP {code}", file=sys.stderr)

    report = {"posts": posts}

    if not args.dry_run:
        # Verify: fetch the N most recent bookSection items and match by extra
        recent = fetch_recent(len(chapters) + 5)
        expected = {f"Chapter: {ch['n']}" for ch in chapters}
        found = []
        for it in recent:
            data = it["data"]
            extra = data.get("extra", "")
            if extra in expected:
                rels = (data.get("relations") or {}).get("dc:relation", [])
                found.append({
                    "key": data["key"],
                    "extra": extra,
                    "pages": data.get("pages", ""),
                    "rel_ok": args.parent_uri in rels,
                    "title": data.get("title", "")[:60],
                })
        report["verified"] = found
        report["missing"] = sorted(expected - {f["extra"] for f in found})

    json.dump(report, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0 if not report.get("missing") else 1


if __name__ == "__main__":
    sys.exit(main())
