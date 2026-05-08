# Step 1 — Research

Open exploration of the topic. Capture everything; defer judgement.

## Inputs

- `<run-dir>/brief.md` — confirms topic, key questions, audience, scope.
- `<run-dir>/state.md` — your effort plan from the SKILL.md procedure (subagent count, angle assignments).

## Outputs

- `<run-dir>/sources/source-list.md` — every source you consult, with provenance tag, formatted per channel:
  ```
  [S1] [zotero]    **<Title>** — <Author>, <Year>. DOI:<doi>. Local PDF: ~/Zotero/storage/<KEY>/<file>.pdf. Citekey: @<key>. Retrieved <YYYY-MM-DD>.
  [S2] [obsidian]  **<Note title>** — your own note. Path: ~/Documents/obsidian/wiki/<file>.md. Retrieved <YYYY-MM-DD>.
  [S3] [openalex]  **<Title>** — <Authors>, <Year>. DOI:<doi>. <OA URL or [paywalled]>. Retrieved <YYYY-MM-DD>.
  [S4] [arxiv]     **<Title>** — <Authors>, <Year>. arXiv:<id>. <URL>. Retrieved <YYYY-MM-DD>.
  [S5] [crossref]  **<Title>** — <Authors>, <Year>. <Journal>. DOI:<doi>. Retrieved <YYYY-MM-DD>.
  [S6] [s2]        **<Title>** — <Authors>, <Year>. S2:<id>. Cited by <N>. <URL>. Retrieved <YYYY-MM-DD>.
  [S7] [pubmed]    **<Title>** — <Authors>, <Year>. PMID:<id>. Retrieved <YYYY-MM-DD>.
  [S8] [web]       **<Title>** — <Author/Org>, <YYYY-MM-DD>. <URL>. Retrieved <YYYY-MM-DD>.
  ```
  IDs assigned sequentially across all gatherers' fragments after the lead concatenates.
- `<run-dir>/sources/raw-notes.md` — running notebook of facts, quotes, statistics, paraphrases. Every line carries the source ID it came from. Top of the file holds the coverage checklist (one box per angle).

## Procedure

1. **Re-read `brief.md`.** If anything is genuinely ambiguous (not just under-specified), ask the user. Otherwise proceed.
2. **Pick channels.** Decide which source channels apply to this topic. Detect the topic flavor from the brief and route to the matching channel set:
    - **Marxist theory / *Historical Materialism* / critical theory** → Zotero + Obsidian + PhilPapers + Brill HM + Marxists Internet Archive + Crossref + open web as fallback.
    - **Philosophy (analytic / general / continental)** → Zotero + Obsidian + PhilPapers + SEP + OpenAlex + Crossref + open web as fallback.
    - **CS / ML / NLP / physics / math** → Zotero + Obsidian + arXiv + Semantic Scholar + OpenAlex + open web as fallback.
    - **Biomedical** → Zotero + Obsidian + PubMed + OpenAlex + open web as fallback.
    - **Other humanities / social sciences** → Zotero + Obsidian + OpenAlex + Crossref + open web as fallback.
    - **Current events / release notes / product / market** → open web only; skip local + academic DBs.
   Full per-topic channel-selection table and recipes: `~/.claude/skills/deep-research/references/academic-search.md` (per-channel curl recipes, philosophy-discipline channels) and `references/local-search.md` (Zotero + Obsidian).
   Probe local channels: `curl -sf http://127.0.0.1:23119/api/users/0/items?limit=1 >/dev/null` for Zotero, `obsidian help >/dev/null 2>&1` for Obsidian. If a needed local channel is down, ask the user (launch / skip / abort) before continuing.
   Record the channel plan in `state.md` under `## Channels`.
3. **Plan coverage.** For each key question, list 2–4 angles to investigate (e.g. primary sources, expert opinion, opposing views, recent developments). Write the full plan to the top of `<run-dir>/sources/raw-notes.md` as a checkbox list. This is the master coverage checklist.
4. **Gather (parallel).** Dispatch the gatherer subagents per the effort plan in `state.md`. Use the **Gatherer prompt template** from `SKILL.md` and inject the channel plan from step 2 into each gatherer's prompt. Each gatherer:
    - Owns a slice of angles (no overlap).
    - Writes to `<run-dir>/sources/raw-notes.frag-<n>.md` and `<run-dir>/sources/source-list.frag-<n>.md`.
    - Walks channels in priority order: Zotero → Obsidian → academic DBs → open web. Skips channels not in the channel plan.
    - For Zotero hits: resolves to local PDF and reads with `pdftotext` or pdf-reader skill.
    - For OA academic hits: fetches the PDF; for paywalled, logs abstract + DOI and tags `[paywalled]`.
    - Prefers primary sources over commentary.
    - Starts broad, narrows progressively. Fires 3+ tool calls in parallel where possible.
5. **Wait, then merge.** When all gatherers return, the lead:
    - Reads each `*.frag-*.md` pair.
    - De-duplicates sources across provenance (same DOI / URL / Zotero key → single `[Sn]`; prefer the local-PDF version when both local and web surface the same paper), assigns final sequential IDs.
    - Concatenates raw notes into `<run-dir>/sources/raw-notes.md`, rewriting fragment-local source IDs to the final IDs.
    - Writes the merged `<run-dir>/sources/source-list.md` with each entry's provenance tag preserved.
    - Ticks every covered angle in the coverage checklist.
    - Deletes the `.frag-*.md` files (keep on disk for audit if you prefer).
6. **Coverage check.** If any angle's box is unticked, dispatch a follow-up gatherer for the missing angles before advancing.

## Acceptance criteria (gate to step 2)

- [ ] At least 8 distinct sources in `source-list.md`, covering every key question from the brief.
- [ ] At least 2 independent sources for any factual claim that will likely appear in the final report.
- [ ] Every line in `raw-notes.md` carries a `[Sn]` source tag.
- [ ] Every source in `source-list.md` carries a provenance tag (`[zotero]`, `[obsidian]`, `[openalex]`, `[arxiv]`, `[crossref]`, `[s2]`, `[pubmed]`, `[web]`, or `[paywalled]`).
- [ ] For academic topics, at least one source from a local channel (Zotero / Obsidian) when the topic is in the user's research area, and at least one source from an academic DB.
- [ ] For philosophy / Marxist-theory topics, at least one source from a discipline channel (`[philpapers]`, `[sep]`, `[brill-hm]`, or `[marxists-archive]`) in addition to the local + academic-DB requirement above.
- [ ] At least one source represents a dissenting or skeptical view, if applicable to the topic.
- [ ] Coverage checklist at the top of `raw-notes.md` is fully ticked.

When all boxes check, proceed to `step-2-verify.md`.
