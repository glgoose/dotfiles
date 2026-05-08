# Step 5 — Review

Critical pass. Score the draft. Fix or rewind.

## Inputs

- `<run-dir>/drafts/report-v1.md`
- `<run-dir>/sources/verified-claims.md`
- `<run-dir>/sources/source-list.md`
- `<run-dir>/brief.md`

## Outputs

- `<run-dir>/drafts/review-notes.md` — the rubric scores and the specific issues found. Structure:
  ```
  # Review of report-v1.md

  ## Scores (0.0–1.0)
  - Factual accuracy:      <score>
  - Citation accuracy:     <score>
  - Completeness:          <score>
  - Source quality:        <score>
  - Tool efficiency:       <score>

  ## Issues
  - [severity: high|med|low] <location> — <problem> — <fix or rewind?>
  ...

  ## Decision
  Either: "Proceed to step 6" — all axes ≥ 0.7 and no high-severity issues remain.
  Or:    "Rewind to step <N>" — reason: <...>.
  ```
- `<run-dir>/drafts/report-v2.md` — the report with all fixable issues addressed in place. Only produced when the decision is "Proceed to step 6". When the decision is rewind, no v2 is produced.

## Procedure

1. **Read everything in.** Draft, verified claims, source list, brief.
2. **Score the draft on five axes** (0.0–1.0 each):
    - **Factual accuracy** — every claim in the draft matches what the cited source actually says. Walk a sample of citations end-to-end if anything reads suspect.
    - **Citation accuracy** — every `[Sn]` resolves to an entry in `source-list.md`; every factual sentence has at least one tag.
    - **Completeness** — every key question in `brief.md` is genuinely answered, not just touched.
    - **Source quality** — primary sources where available, ≥2 independent sources for any load-bearing claim, ≥1 dissenting view when applicable.
    - **Tool efficiency** — soft signal; flag obvious waste (redundant gatherers, claims left unverified, missed parallelism).
3. **Enumerate issues.** For each problem found, write a line in `review-notes.md` with severity, location, problem, and proposed fix or rewind.
4. **Decide.**
    - If every axis ≥ 0.7 and no high-severity issues remain (or all high-sev issues are fixable in place without changing what the draft claims), proceed: apply the in-place fixes and write `report-v2.md`.
    - If any axis < 0.7, or any high-severity issue requires more sources / different claims / a re-synthesis, **rewind**:
      - Move `report-v1.md` (and any partial `report-v2.md`) to `<run-dir>/drafts/archive/<timestamp>/`.
      - Update `state.md` with the rewind step and reason.
      - Re-enter the pipeline at the earliest affected step (1 if sources are thin, 2 if claims need re-verification, 3 if synthesis is wrong, 4 if only the prose needs redoing).
      - Do **not** patch the symptom in v1.
5. **Cite-as-you-go check** during in-place fixes: any sentence whose `[Sn]` you change must still resolve and still match `verified-claims.md`.

## Acceptance criteria (gate to step 6)

- [ ] `review-notes.md` exists with all five axis scores.
- [ ] Decision is recorded explicitly.
- [ ] If "Proceed", `report-v2.md` exists, every axis ≥ 0.7, no unresolved high-severity issues.
- [ ] If "Rewind", v1 archived and `state.md` updated.

When all boxes check and the decision is "Proceed", advance to `step-6-compile.md`. When the decision is "Rewind", re-enter the named earlier step.
