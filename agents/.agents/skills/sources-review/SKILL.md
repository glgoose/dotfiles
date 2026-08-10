---
name: sources-review
description: Review academic writing against its cited sources. Audits claim attribution against the author's actual argumentative move, verbatim quote accuracy, page-citation correctness, quote provenance (A endorsing B vs A merely citing B), logical flow, and citation lint. Scales from a single paragraph to a full reflection report or thesis chapter. Use when user invokes /sources-review, says "review against sources", "check this citation", "did I get X's argument right", "verify these quotes / page cites", or asks for a source-accuracy audit of academic writing (reflection reports, thesis chapters, seminar response papers, papers). NOT for grammar/spelling/punctuation/style — that is the sibling skill prose-review.
---

# Sources Review

Audit academic writing against its cited sources. Works at any scale: a sentence, a paragraph, a section, or a whole text. Output: numbered findings, not a rewrite. This skill owns the **sources** axis only; for grammar, spelling, punctuation, and style use the sibling skill `prose-review`. A full review runs both.

## Workflow

1. Confirm scope if ambiguous: one paragraph, one section, or the whole file. Default to whatever the user pasted or pointed at.

2. Verify each quote with one call. For every quoted or closely paraphrased passage:

   ```
   quote-find @Smith2020 --page 42 --phrase "the quoted words as written"
   ```

   This resolves the citekey, corrects the printed-to-physical page offset, extracts a page window, and matches against normalized text, so line-wrapped, hyphen-split, and curly-quoted sources still match. It searches the cited page first and widens to the whole document only on a miss, reporting the true printed page when the cite is wrong. Exit codes: `0` VERBATIM, `3` DRIFT with a word-level diff, `4` NOT FOUND, `2` no text layer, `1` unresolved citekey. Note unresolved keys at the end of the review.

   Do not hand-roll page arithmetic, `pdftotext | grep`, or quote-mark normalization. Each one produced false negatives: printed vs physical pages differ by the front matter (offset 9 in one tested book), `-layout` extraction splits words across lines, and a typed `'` will not match a source's `’`.

3. Read the argumentative context. `quote-find` returns the surrounding paragraph, which is usually enough. When you need more, `doc-read <path> <first> <last>` gives a page window on *offset-corrected physical* indices for PDFs, or printed anchors for EPUBs. Never extract a whole book.

4. Check 6 axes in order:

   - **Claim attribution** — does the paraphrase match the author's actual argumentative move? Watch for reversals: a paraphrase casting a premise as the conclusion, or shifting where the load-bearing step sits.
   - **Verbatim quotes** — every quoted phrase must match the source word-for-word. Flag drift, paraphrase-in-quotes, assembled quotes, missing ellipses, smart-vs-straight quote-mark mismatches.
   - **Page citations** — does the cite point at the page where the quoted/cited material actually appears? `quote-find` reports the true printed page on a miss, and prints `spans a page break, cite as N–N+1` when the passage continues onto the next page. Flag both, plus off-by-one errors.
   - **Quote provenance** — when author A quotes or paraphrases author B, distinguish "A endorses B's claim" from "A merely cites B". Flag silent promotion of a downstream quote into the upstream author's voice.
   - **Logical flow** — setup → charge → evidence → conclusion. Across multiple paragraphs, also check that each paragraph earns its place in the argument. Flag missing premises and unsupported jumps.
   - **Lint** — no em-dashes (`—`); citekey style consistent (`@Author2020 [p. N]` or `[@Author2020, N]`); for bullet-style notes apply schematic-notes lint (no `;`-chaining of bullets, no period-chained fragments, no `->`-start, no trailing `.` on fragments).

5. Report. For each finding: state the issue, quote the offending text, name the source page or line to verify against, and propose a minimal rephrase. Group findings by paragraph for longer texts. Do not rewrite end-to-end unless asked.

## Tools

- `quote-find <citekey|path> --page N --phrase "..."` — the workhorse. Resolve, offset-correct, extract, normalize, match, verdict, in one call. Use this per cite.
- `doc-read <path> [start] [end]` — page range of a PDF or EPUB. PDF pages are **physical** indices while cites give **printed** pages, so pass offset-corrected numbers. EPUB pages use printed anchor labels when the file has them. `--list-pages` shows what an EPUB actually offers. (Formerly `pdf-read`, still available as a symlink.)
- `zotero-lookup @key` — citekey → attachment path. Reverse: `zotero-lookup -r <path-or-8char-key>`.
- `pdflabels --check <path>` — printed-page labels and the printed→physical offset, if you need it directly.

For a single quote mid-conversation, before you interpret it, use the sibling skill `quote-check` instead. This skill is the post-hoc audit of finished writing.

## What this skill does NOT do

- Grammar, spelling, punctuation, style (use `prose-review`).
- End-to-end rewrites (use schematic-notes for vault prose, or direct edits).
- Fetching new sources / research (use lite-research or deep-research).
- Philosophical evaluation of the argument's quality (use tutor for INTERROGATE / UNPACK).
