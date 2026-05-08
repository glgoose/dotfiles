# Step 2 — Verify

Cross-check every claim worth putting in the final report. Anything not directly supported by a source gets flagged or dropped.

## Inputs

- `<run-dir>/sources/raw-notes.md`
- `<run-dir>/sources/source-list.md`

## Outputs

- `<run-dir>/sources/verified-claims.md` — one entry per claim, structured:
  ```
  - claim: "<claim text>"
    status: verified | partial | unsupported
    sources: [S3], [S7]
    notes: "<one-line evidence summary or what's missing>"
  ```

## Procedure

1. **Extract claims.** Read `raw-notes.md` and pull out every assertion likely to land in the report (facts, statistics, dates, attributed positions). Skip background framing that won't make it to the draft. Aim for a clean list — duplicates collapsed, paraphrases merged.
2. **Shard.** Split the claim list into 2–3 shards (one per verifier subagent), grouped so related claims stay together where possible.
3. **Dispatch verifiers (parallel).** Use the **Verifier prompt template** from `SKILL.md`. Each verifier writes its shard to `<run-dir>/sources/verified-claims.frag-<n>.md`. Verifiers may use `WebFetch` to retrieve the actual source page when reachable; they do not invent new sources.
4. **Merge.** Concatenate fragments into `<run-dir>/sources/verified-claims.md`. De-duplicate any claims that ended up in two shards.
5. **Triage.**
    - `verified` claims survive into step 3.
    - `partial` claims survive but with a note that the strongest reading is unsupported.
    - `unsupported` claims do not advance. If any is load-bearing for a key question, return to step 1 and gather more sources for that angle.

## Acceptance criteria (gate to step 3)

- [ ] Every claim from `raw-notes.md` that is destined for the report appears in `verified-claims.md` with a status.
- [ ] No `unsupported` claim is load-bearing for an unaddressed key question (otherwise rewind to step 1).
- [ ] Every `verified` and `partial` claim has at least one `[Sn]` source.

When all boxes check, proceed to `step-3-synthesize.md`.
