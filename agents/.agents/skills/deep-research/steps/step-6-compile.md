# Step 6 — Compile

Final citation pass. Assemble `final/report.md`.

## Inputs

- `<run-dir>/drafts/report-v2.md`
- `<run-dir>/sources/source-list.md`

## Outputs

- `<run-dir>/final/report.md` — body + `## References` section. The deliverable.
- `<run-dir>/final/citation-issues.md` — only when problems are found. If this exists at the end of step 6, the run rewinds.

## Procedure

1. **Dispatch the CitationAgent.** Use the **CitationAgent prompt template** from `SKILL.md`. One agent, single job: walk every factual sentence in `report-v2.md`, confirm each `[Sn]` tag resolves to `source-list.md`, flag anything unsupported, and assemble `final/report.md`.
2. **Wait for the agent.**
3. **Inspect the result.**
    - If `final/citation-issues.md` exists and is non-empty: rewind. The earliest affected step is usually step 4 (drafting) or step 2 (verification), depending on whether the issue is a missing tag (drafting) or a tag that can't be supported (verification). Move v2 to archive and re-enter the pipeline.
    - If `final/report.md` exists and `citation-issues.md` does not: success.
4. **Verify the output structure.** `final/report.md` must contain:
    - The body of `report-v2.md` (prose unchanged except for any inline citation fixes the CitationAgent made).
    - A `## References` section at the bottom listing every `[Sn]` cited in the body, in numerical order, formatted:
      ```
      [Sn] **<Title>** — <Author/Org>, <YYYY-MM-DD>. <<URL>>. Retrieved <YYYY-MM-DD>.
      ```
5. **Tell the user.** Print the path to `final/report.md` and a short summary (word count, source count, key questions answered).

## Acceptance criteria (run complete)

- [ ] `final/report.md` exists.
- [ ] `final/citation-issues.md` does not exist (or is empty).
- [ ] Every `[Sn]` in the body resolves to an entry in the References section.
- [ ] References are in numerical order with no gaps.
- [ ] Every reference entry has a retrieval date.

When all boxes check, the run is done. Update `state.md` to record completion and the final-report path.
