---
name: quote-check
description: "Verify a quoted or attributed passage against its cited source BEFORE interpreting, glossing, or arguing from it. Triggers whenever a message quotes a text with a citekey and page (\"@DeVos2016, p. 74\"), asks \"why does X say Y\", \"what does X mean by Y\", or attributes a claim to a source (\"De Vos argues that...\"). Resolves citekey to PDF or EPUB, corrects printed-vs-physical page offset, returns the actual passage with a VERBATIM/DRIFT/NOT FOUND verdict. Run this before any interpretation. NOT for auditing many cites across a finished draft, that is the sibling skill sources-review."
---

# Quote Check

Read the source before saying what it means. One command. This skill enforces ordering: verification first, interpretation second, never the reverse.

Scope covers quoted text *and* unquoted attribution ("De Vos argues that...", "what does Lasch mean by therapeutic culture"). Both make claims about what a text says.

## The command

```
quote-find @DeVos2016 --page 74 --phrase "the political and the subjective or the physical"
```

One call resolves the citekey, corrects the page offset, extracts the text, normalizes both sides, locates the phrase, and reports a verdict with the surrounding paragraph. Roughly 2 KB of output.

```
DRIFT  De Vos - 2016 - The Metamorphoses of the Brain.pdf
  printed p.74 = physical 83  [pdf]  match 0.88
  source: 'the political and the subjective or the psychical'
  yours:  'the political and the subjective or the physical'
  diff:   'physical' -> 'psychical'

  context: ...
```

Verdicts and exit codes:

| Exit | Verdict | Meaning |
|---|---|---|
| 0 | `VERBATIM` | Word for word. Differences in the source's own quote marks or commas do not count as drift. |
| 3 | `DRIFT` | Close match found. The `diff` line names exactly which words moved. **Read it before interpreting**, because a one-word substitution can carry an entire reading. |
| 4 | `NOT FOUND` | No close match anywhere in the source. The passage is not there as quoted. Do not interpret it. |
| 2 | `NO TEXT` | Scanned PDF with no text layer. Use the multimodal `Read` tool. An empty extraction is not an absent passage. |
| 1 | error | Citekey did not resolve, file missing, unsupported format. |

Flags: `--page N` (cited printed page), `--phrase "..."` (what to verify), `--context N` (context characters, default 700), `--max-chars N` (output cap, default 2000). Omit `--phrase` to just read a page.

## Workflow

1. **Extract** the citekey, page, and quoted or attributed phrase from the message. No citekey but a recognizable author and year? Try plausible keys, `quote-find` exits 1 on a miss.
2. **Run `quote-find`.** With `--page`, it searches the cited page first and widens to the whole document only on a miss, reporting the true printed page when the cite was wrong. Whole-document text is never printed.
3. **Read the verdict, then interpret.** Never invert that order, and never let an unverified gloss reach the user first.

## What the tool handles for you

Do not hand-roll these. Each one silently produced false negatives before:

- **Printed vs physical pages.** `pdftotext` counts physical pages; citations give printed ones. On the De Vos PDF the offset is 9, so a naive read of "page 74" returns printed page 65.
- **Line-wrapped and hyphen-split text.** `-layout` extraction breaks words across lines (`intrascien-` / `tific`), so a correct quote gets 0 grep hits.
- **Curly quotes and ligatures.** Typing `Lasch's` will not grep-match a source containing `Lasch’s`.
- **Punctuation welded to words.** A phrase typed without the source's surrounding quote marks still matches.
- **Quotes spanning a page break.** Running heads and page numbers sitting between the halves are skipped, and the verdict line says `spans a page break, cite as 74–75`. Pass that page range on to the user, since the cite should name both pages.
- **EPUBs**, including printed-page anchors when the file has them.

## Guard rails

**The user's paraphrase is a pointer, not evidence.** It names a page. It does not report what is on it. Mistyped and half-remembered words are common, and the mistyped word is often the one the whole question turns on. Never treat the wording of the request as the wording of the text.

**A citekey plus a page number is not verification, it is an invitation to verify.** Precise-looking citation data makes an unread answer feel grounded. It is not.

**EPUBs without pagination.** Many EPUBs carry no page anchors. `quote-find` then says `cited p.N UNVERIFIABLE` and names the chapter instead. Report that honestly: the wording verdict stands, the page claim does not. Never infer a page number from position in the text.

**When the source is unreachable, the answer is one line.** Name where you looked. Speculation gets no headings, no bullet structure, no confident register. Long structured prose about a text you have not read is itself the failure mode, because format signals rigor the content lacks. If a guess is genuinely worth offering, mark it as a guess in one sentence and invite the user to point at the file.

**Never dump a whole book into context.** `pdftotext <pdf> -` is ~600 KB for a 250-page book. Use `quote-find`, or `doc-read <path> <first> <last>` for a page window. A bare extraction with no page range and no downstream filter is always wrong.

## Manual fallback

If `quote-find` cannot handle something, the underlying chain is:

```
zotero-lookup @Key                 # citekey -> attachment path
pdflabels --check "<pdf>"          # printed-to-physical offset
doc-read "<path>" <first> <last>   # page window (pdf or epub)
doc-read "<path>" --list-pages     # printed labels an EPUB actually has
```

## Related skills

- `sources-review` — audit many cites across finished writing, post hoc. This skill is the mid-conversation single-quote case.
- `pdf-reader` — general extraction, including scanned files with no text layer.
- `zotero-lookup` — resolution mechanics and the rules about what not to query.
