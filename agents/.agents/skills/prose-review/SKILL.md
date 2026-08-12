---
name: prose-review
description: Grammar, spelling, punctuation, and style review of formal academic prose (philosophy papers, seminar papers, theses, reflection reports). Checks quote punctuation, spelling-convention consistency, comma splices, subject-verb agreement, hyphenation, and whitespace, leaving verbatim quotations untouched. Use when user invokes /prose-review, says "proofread this", "check grammar/spelling", "check my punctuation", "copyedit this", "review for grammar", "is my punctuation right", or asks for a final language pass on an academic paper. NOT for citation accuracy, quote-against-source verification, or claim attribution — that is the sibling skill sources-review.
---

# Prose Review

Copyedit formal academic prose for grammar, spelling, punctuation, and style. Works at any scale: a sentence, a paragraph, a section, or a whole paper. Output: numbered findings, not a silent rewrite. This skill owns the **language** axis only; for citation accuracy, quote-against-source verification, claim attribution, and page cites use the sibling skill `sources-review`. A full review runs both.

## Workflow

1. **Confirm scope** if ambiguous: a paragraph, a section, or the whole file. Default to whatever the user pasted or pointed at.

2. **Verbatim quotes are sacrosanct.** Never alter wording, spelling, or punctuation *inside* quotation marks (inline `"..."` or `>` block quotes), even if it looks wrong or uses a different spelling convention than the author's prose. If a quoted word seems off, **check the source before flagging** — e.g. "imbibes" turned out to be genuinely Sartre's translated verb; only the author's surrounding construction was wrong. Flag a quote only as a suspected misquote routed to `sources-review`, never silently fix it.

3. **Quote punctuation (American style).** Periods and commas go **inside** the closing quote: `"series."` not `"series".`. **Exception:** when a citation immediately follows the quote — a `[@key, N]` bracket or a `(NN)` parenthetical — the period/comma goes **after** the citation and the quote carries none: `"...groups" [@Young2000a, 88].` and `"...groups" (98).`. Colons and semicolons stay **outside** the closing quote.
   - Scan: `grep -nE '"[.,]'` finds closing quotes with punctuation sitting outside. The regex requires the punctuation immediately after the quote, so `" [@cite]` (space before bracket) is correctly excluded — citation cases are not false positives.
   - Eyeball the matches and **exclude any inside verbatim block quotes** (lines starting `>`). Then flip the rest: `perl -i -pe 's/"\./."/g; s/",/,"/g;'`. If block quotes fall in range, fix per-edit instead so their internal punctuation is preserved.

4. **Spelling-convention consistency.** Default to US spelling in the author's *own* prose; flag UK/US mixing (`labor`/`labour`, `color`/`colour`, `-ize`/`-ise`). Leave UK spelling untouched **inside verbatim quotes** — a quote may legitimately differ from the surrounding prose.

5. **No semicolons in prose** (author preference): prefer a period or a restructure. Caveat: semicolons inside multi-cite brackets `[@A, 1; @B, 2]` are required pandoc syntax — leave them.

6. **Mechanical grammar pass:**
   - subject-verb agreement (compound/plural subjects: "the concepts ... allow", "gender and class consist");
   - comma splices → period or colon (not semicolon);
   - missing articles ("a member of **a** structural group");
   - run-on / fragment balance; commas wrongly separating subject from verb;
   - hyphenation: `large-scale` as an adjective vs `large scale` as a noun;
   - word-choice slips ("counter to the best intentions", not "counter best-intentions").

7. **Whitespace:** collapse doubled spaces — `grep -nE '\S  \S'`.

8. **Report.** For each finding: state the issue, quote the offending text with a line reference, give the minimal fix. Group by line/paragraph for longer texts. Offer to apply all, or a subset, after the user has seen the list — do not rewrite end-to-end.

## Tools

- `grep -nE '"[.,]'` — quote-punctuation violations (punctuation outside the closing quote).
- `perl -i -pe 's/"\./."/g; s/",/,"/g;'` — flip period/comma inside the quote, in bulk, after eyeballing for block-quote exclusions.
- `grep -nE '\S  \S'` — doubled spaces.

## What this skill does NOT do

- Citation accuracy, quote-against-source verification, page cites, claim attribution (use `sources-review`).
- End-to-end rewrites or restructuring (use schematic-notes for vault prose, or direct edits).
- Editing anything inside a verbatim quotation.
