# Step 4 — Draft

Turn the outline into prose. Cite as you go.

## Inputs

- `<run-dir>/drafts/outline.md`
- `<run-dir>/drafts/themes.md`
- `<run-dir>/sources/verified-claims.md` (reference for tags and notes)
- `<run-dir>/brief.md` (audience, length target)

## Outputs

- `<run-dir>/drafts/report-v1.md` — full first draft of the report, structured per the outline. Every factual claim carries an inline `[Sn]` tag matching `<run-dir>/sources/source-list.md`. No `## References` section yet — that's step 6.

## Procedure

1. Re-read `outline.md` and the brief's audience + length target.
2. Write the report section by section, in the outline's order. For each section:
    - Pull claims from the relevant theme(s) in `themes.md`.
    - Stay close to what the verified claims actually support; do not extrapolate.
    - Cite at the level of the sentence: every factual sentence ends with `[Sn]` (or `[Sn], [Sm]` when multiple sources support it).
    - When a claim is `partial` in `verified-claims.md`, hedge accordingly ("appears to", "one early study reports") rather than asserting.
    - Where the brief calls for a dissenting view and the sources have one, give it real space, not a token sentence.
3. Add an opening paragraph that names the topic, the audience, and the questions being addressed. Add a closing paragraph that summarizes the answer to each key question.
4. Aim for the length target in `brief.md` (default ~1500–2500 words). Going short is fine when the sources are thin; going long is not — tighten instead.
5. Self-check before saving: every paragraph has at least one `[Sn]`. If a paragraph has no citation, either add one or remove the paragraph.

## Acceptance criteria (gate to step 5)

- [ ] `report-v1.md` exists.
- [ ] Every paragraph that makes a factual claim ends with at least one `[Sn]` tag.
- [ ] Every key question from `brief.md` is addressed in the body.
- [ ] Length is within ±25% of the brief's target.
- [ ] No `unsupported` claims from `verified-claims.md` appear in the draft.

When all boxes check, proceed to `step-5-review.md`.
