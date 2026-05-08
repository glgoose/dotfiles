# Step 3 — Synthesize

Group verified claims into themes. Build the report's skeleton.

## Inputs

- `<run-dir>/sources/verified-claims.md`
- `<run-dir>/brief.md`

## Outputs

- `<run-dir>/drafts/themes.md` — 3–6 themes that emerge from the verified claims. Each theme:
  ```
  ## <Theme name>

  <2–4 sentence summary of what this theme covers and why it matters to a key question.>

  Claims clustered here:
  - [S3, S7] <claim>
  - [S2] <claim>
  ```
- `<run-dir>/drafts/outline.md` — the report's section-by-section plan:
  ```
  # <Working title>

  ## 1. <Section name>
  - addresses key question(s): <Q1, Q3>
  - draws on themes: <Theme A, Theme B>
  - load-bearing claims: [S3], [S7], [S12]

  ## 2. <Section name>
  ...

  ## References
  (auto-generated in step 6)
  ```

## Procedure

1. Re-read `brief.md` for the key questions and the audience.
2. Cluster the verified claims into themes by topic / mechanism / position. Aim for 3–6 themes — fewer is fine if claims really do cohere.
3. Draft `themes.md`. For each theme, write the summary first, then list the claims with their `[Sn]` tags. Skip `unsupported` claims; mark `partial` claims as such inline if they appear.
4. Draft `outline.md`. Each top-level section maps to one or more key questions and pulls from one or more themes. Order sections so an informed reader can follow the argument cold; do not chronologize when a logical order serves better.
5. Sanity-check: every key question from `brief.md` is addressed by at least one section. If not, either add a section or surface the gap to the user.

## Acceptance criteria (gate to step 4)

- [ ] `themes.md` exists with 3–6 themes; every theme references at least one verified claim.
- [ ] `outline.md` exists; every key question from `brief.md` maps to at least one outline section.
- [ ] Every load-bearing claim listed in the outline carries a `[Sn]` tag from `verified-claims.md`.

When all boxes check, proceed to `step-4-draft.md`.
