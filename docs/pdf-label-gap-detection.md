# pdf-label: gap detection implementation notes

Lessons learned while implementing deterministic arabic-range detection
(`detect_arabic_ranges`, `extract_all_footers`, `_estimate_arabic_start`).

## 1. Max vs mode for offset estimation

**Offset property:** For any arabic range, `offset = physical_page - label + 1` is
constant within that range. Each page-label gap decreases the offset by the gap size,
so the earliest arabic range always has the largest offset.

**Why `max` beats `mode`:** Sampling 15 pages from a book with many gaps almost always
over-represents the longest range (mid-book), so the mode of sampled offsets points to
the mid-book start — not the first arabic page. `max(offsets)` is strictly correct:
the largest observed offset can only come from the earliest range.

## 2. Back-shift: chapter openers that lack running headers

Chapter title pages often have no running header, so `_detect_arabic_page` gets nothing
from them. The first detection in the new range is at `p_cur`, not the actual start.

**Back-shift formula:**
```
p_start = p_prev + 1           # first undetected page after old range
l_start = l_cur - (p_cur - p_start)
```

**Safety when chapter opener IS detected:** If the chapter opener carries a detectable
number, it passes the noise filter and lands in `filtered` as its own element — becoming
`p_prev`. Back-shift then computes `p_start = p_prev + 1 = p_cur`, a no-op. No special
case needed.

## 3. Forward scan: old-range pages between gap boundaries

Between `p_prev` and `p_cur`, some pages may still belong to the *old* range (e.g., the
last chapter page still carries its running header). These pass the noise filter as part
of the old range but don't appear in `filtered` as their own gap boundary.

Fix: before applying back-shift, scan `range(p_prev+1, p_cur)` for any page whose
detected label matches the old-range offset. Advance `p_start` past each such page.

## 4. First-label-1 normalization: direct observation beats estimate

When `ranges[0][1] == 1`, the arabic sequence was directly observed starting at label 1
(e.g., a chapter title page showing a standalone "1"). Use `ranges[0][0]` directly as
`arabic_start` — no estimation needed.

When `ranges[0][1] > 1`, infer as `ranges[0][0] - ranges[0][1] + 1` and cross-check
against `_estimate_arabic_start`: prefer the estimate if it's within 3 pages (absorbs
sampling noise), otherwise trust the inferred value.

## 6. extend_chains forward walk needs a gap limit

The forward walk in `extend_chains` was unbounded — it inferred pages indefinitely until
hitting a blocked page. On the Sartre *Critique of Dialectical Reason* Vol. 2 PDF, this
bridged a 33-page gap (p162→p195), adding a spurious third confirmed anchor. The chain
ended up with 3 confirmed anchors across a 39-page span (7% density), triggering the
density-gate refusal even though the rest of the book detected cleanly.

**Fix:** added `gap_since_confirmed` counter to the forward walk; break after
`MAX_CHAIN_SKIP` consecutive empty (no-matching-style) pages. Symmetric with the chain
builder's per-step skip budget.

**Why only empty pages count:** pages with matching style but wrong/incompatible values
are noise (footnote refs, chapter numbers) and should be transparent to the gap counter.
Only truly unlabelled pages (no matching-style candidate at all) indicate the chain has
run out of evidence.

## 7. Loose-candidate false positive from centroid drift

`_bbox_compatible` compares against the chain's running centroid, which evolves as
`extend_chains` adds members. During chain building the centroid is tighter (fewer
members). A candidate can be bbox-rejected at build time — so the builder steps k=2
to find the next member — then pass `_bbox_compatible` at confidence-gate time after the
centroid has drifted slightly from dozens of new members.

Concretely: p230=223 was rejected at build time (the builder stepped k=2 and consumed
p231=224 instead). After `extend_chains` refined the centroid, the loose-candidate check
accepted p230=223 as "missed", causing a false Refused.

**Fix:** before raising Refused, check whether the candidate falls inside a valid
chain-builder skip: adjacent chain members whose gap is ≤ `MAX_CHAIN_SKIP`. If so, the
builder intentionally stepped over the candidate and the check is suppressed.

**Why this is safe:** only skips with gap ≤ MAX_CHAIN_SKIP are exempted — those the
builder could have consumed but chose not to (bbox-rejected at build time). Larger gaps
produced by `extend_chains` are not exempt and still trigger the check.

## 5. pdftotext `-layout` and running headers

`pdftotext -layout` preserves horizontal spacing. Running headers span the full page
width with large internal gaps (title on the left, page number on the right). A reliable
heuristic: a line containing `\s{8,}` followed by a digit-only token is a running header.

This matters for `_detect_arabic_page`: body text with incidental numbers must not be
mistaken for page numbers. Prefer the running-header line when present; fall back to
the last line of the strip (the footer position) otherwise.
