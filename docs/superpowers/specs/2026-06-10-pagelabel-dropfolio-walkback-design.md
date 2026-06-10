# pagelabel — promote drop folios during walk-back

Date: 2026-06-10
Status: design (approved for planning)
Touches: `bin/pagelabel`, `~/projects/identify-pagesnr/DESIGN.md`

## Problem

Extracting the Introduction chapter from *Readings of Wittgenstein's On
Certainty* (`Moyal-SharrockBrenner2005`) via the `extract-chapter-pdf.js`
Zotero action failed with `Error: Label '1' not found in PDF`. `pagelabel`
had written labels, but the spec contained no label `1`:

```
1: 5:D/6 9:r/8 16:D/2 45: 46:D/34 113: 114:D/104 173: 174:D/166 260: 261:D/254
```

### Root cause

The book numbers most pages at the **head-outer** corner but puts the
folio at **foot-center** on chapter-opening pages (drop folios). Examples
confirmed from `--verbose`: `vii`(p8) `ix`(p10) `xii`(p13) `1`(p15)
`16`(p30) `33`(p45) — every one is a TOC chapter-opening page.

`pagelabel` separates `top` and `bottom` into distinct zones and will not
fold a foot-center folio into a head-outer chain. The detector still builds
the correct body chain and even **knows** physical page 15 is printed `1`:

```
arabic start_phys=15 start_value=1 inferred=[p15] anchors=[p16=2, p17=3, ...]
```

But physical 15 is recorded as an **inferred walk-back page**, and
`build_spec` deliberately starts each chain at its first *confirmed* anchor
(p16 = `2`), treating inferred walk-back pages as "unnumbered front matter"
and leaving them unlabeled. So printed `1` (and the analogous `33` at the
next chapter opener) is dropped from the written spec.

The DESIGN.md drop-folio rule ("chapter opener with number at foot-center
while rest of chapter uses head-outer … allowed only when `doc.get_toc()`
corroborates a chapter entry at that physical page") was never reachable:
`_bbox_compatible` returns on `zone` mismatch *before* the `toc_pages`
escape hatch, and a foot-center drop folio is also seeded as a throwaway
singleton chain during `infer_chains` and consumed before the body chain's
backward walk can claim it.

### What is NOT a bug

The chain fragmentation (restarts `34`, `77`, `104`, `166`, `254`, `303`)
is **correct**. The book's physical→printed mapping is genuinely piecewise:
un-scanned blank versos and four unnumbered Part-divider pages (TOC: Part I
@phys44, II @112, III @172, IV @259) make the offset drift. Each segment's
restart value is the real printed number on that physical page. This design
does **not** try to merge segments.

## Design

Promote a drop folio to a confirmed chain member during the `extend_chains`
**backward** walk (step 7), which runs after chain selection. It reads from
the full candidate list (`by_page`, not filtered by `consumed`), so the
foot-center folio that `infer_chains` discarded as a singleton is still
available.

### Rule

In the walk-back loop, for the inferred page `p` with expected value `v`:

1. **Existing same-zone match** (unchanged): if `p` has a candidate with
   `style == ch.style`, `zone == ch.zone`, `value == v`, and
   `_bbox_compatible`, insert it as a confirmed member.
2. **New — drop-folio promotion**: else if `p in toc_pages` **and** `p` has
   a candidate with `style == ch.style` and `value == v` in **any** zone,
   insert that candidate as a confirmed member (`ch.members.insert(0, …)`)
   and mark `p` blocked. Do **not** update the centroid (a single
   foot-center point would skew the head-outer cluster).
3. **Else** (unchanged): record `p` as an inferred page.

Walk-back continues from the promoted member as normal (`v` decrements; the
existing `ch.first_member_idx - p <= 5` front-matter cap and `p in blocked`
guard still apply).

Because the promoted candidate becomes `ch.members[0]`, `build_spec`
naturally starts the chain at that physical page with the correct value —
no change to `build_spec`.

### Why this is safe

- **Scope:** only fires on `toc_pages` with an *exact expected-value*
  same-style candidate. Random foot-center numerals (years, footnote refs)
  on non-TOC pages are untouched and still left as inferred/unlabeled.
- **No global `_bbox_compatible` change.** The zone gate stays intact for
  inference and the loose-candidate gate, so no centroid pollution and no
  new spurious anchors (the rejected alternative — reordering the TOC check
  globally — added two bogus anchors in a spike).
- **Front matter still unlabeled.** A walk-back page with no expected-value
  candidate (truly blank front matter) falls through to branch 3 exactly as
  today.
- **Loose-candidate gate:** promoting the folio adds it to `accepted_ids`,
  removing it from the loose set. Other unpromoted foot-center duplicates
  (e.g. a `16` that also has a head-outer `16` already in the chain) remain
  zone-mismatched against the chain and so are still not flagged — no new
  refusals.

## Expected result on the fixture

Chain 1 starts at `15:D/1`; chapter-2 opener recovers `45:D/33`; analogous
openers recover their drop-folio start values. The Introduction (printed
1–15 → physical 15–29) becomes fully labeled and `pdflabels '1' …` resolves,
unblocking `extract-chapter-pdf.js`.

## Testing

- Add `Moyal-SharrockBrenner2005` (or a trimmed fixture exhibiting a
  foot-center chapter-opening folio) to `~/projects/identify-pagesnr/` and a
  golden line to `labels.csv` whose first body entry is `15:D/1` (exact spec
  TBD-from-run, pinned once the fix is in).
- Re-run the existing golden loop; confirm no regression on the other
  fixtures (Carve, Baehrens, Hall, Bidet, Harding, Hay, HillCollinsBilge).
- End-to-end: re-run the Zotero action on the Introduction item and confirm
  a chapter PDF is produced.

## DESIGN.md update

Amend the step-7 walk-back description and the "Drop folios" edge-case rule
in `~/projects/identify-pagesnr/DESIGN.md` to state that a TOC-corroborated,
expected-value, same-style folio in the opposite zone is promoted to a
confirmed member during walk-back.
