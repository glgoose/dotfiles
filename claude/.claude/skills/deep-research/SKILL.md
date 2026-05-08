---
name: deep-research
user-invocable: true
description: Heavy multi-step source-grounded research pipeline (gatherers + verifiers + citation pass + run dir). Use ONLY when the user asks for thesis-grade research with explicit signals like "deep-dive on X", "thorough research on X", "source-grade report on X", "source-backed report with citations". Produces a single Markdown report where every factual claim is tagged to a real source with retrieval date. NOT for first-pass orientation (use `lite-research` instead, which is the default for plain "research X for me"). NOT for comparative-table research across many items (use /research for that). Trigger phrase examples - "deep-dive on X with sources", "thorough source-backed report on X", "source-grade research on X".
allowed-tools: Read, Write, Glob, Grep, WebSearch, WebFetch, Task, AskUserQuestion, Bash
---

# Deep Research

A guided, multi-step research pipeline that takes a topic from raw exploration to a polished, source-backed Markdown report. The process is **strictly sequential** and **gated**: each step has its own instruction file under `steps/`. Do not skip ahead. Do not start a step until the previous step's output exists and has met its acceptance criteria.

You play the **lead agent** in this pipeline. You plan, you spawn subagents via the `Task` tool, you synthesize their outputs from disk, and you gate progress between steps. Subagents do not talk to each other; they read inputs and write outputs to fixed paths, then you stitch the artifacts together.

## Trigger

`/deep-research <topic>` or any natural-language prompt asking for source-backed research on a single topic ("research X for me", "deep dive on X with citations", "do real research on X").

## Source channels

Search this priority cascade. Earlier channels are higher quality and lower cost than later ones; only fall through when the earlier channel is exhausted.

1. **Local — Zotero library** (`~/Zotero/` via local API on `127.0.0.1:23119`). The user has already curated and often already read these. See `references/local-search.md` for the API recipe. Zotero must be running.
2. **Local — Obsidian vault** (`~/Documents/obsidian/wiki/` via `obsidian` CLI). The user's own notes on prior reading. A vault hit on the topic is itself a high-quality source and a bibliography of further sources to mine. See `references/local-search.md`. Obsidian must be running; falls back to `rg` if not.
3. **Academic databases** — free, structured, no-key APIs:
    - General: OpenAlex (broadest), Crossref (DOI metadata).
    - STEM: arXiv (preprints), Semantic Scholar (CS / ML, citation graph), PubMed (biomedical).
    - Philosophy: PhilPapers / PhilArchive (discipline standard), SEP (Stanford Encyclopedia of Philosophy, authoritative tertiary).
    - Marxist theory / *Historical Materialism*: Brill catalog (HM journal + book series, mostly paywalled, KU Leuven access), Marxists Internet Archive (primary sources in full text).
    - Humanities paywalled: JSTOR / Project MUSE (abstracts only, tag `[paywalled]`).
    See `references/academic-search.md` for curl / WebFetch recipes and the per-topic channel-selection table.
4. **Open web** — `WebSearch` for discovery, `WebFetch` for full-text. Last resort: use when local + academic channels miss (e.g. recent industry news, release notes, blog posts, regulatory filings, gov reports).

The lead decides per-topic which channels are relevant: a Marxist-theory topic likely needs Zotero + Obsidian + PhilPapers + Brill HM + Marxists Internet Archive + Crossref but not arXiv / PubMed; a general philosophy topic uses PhilPapers + SEP + Zotero + OpenAlex + Crossref; a CS / ML topic flips to arXiv + Semantic Scholar + OpenAlex; a current-events topic skips academic DBs entirely. Record the channel plan in `state.md`.

For non-academic topics (release notes, current events, product / market research) skip Zotero + Obsidian + academic DBs and go straight to the open web.

## Run directory

Each run gets its own folder. Default: `~/research-runs/<topic-slug>-<YYYYMMDD>/`. If the user is already inside a `~/research-runs/*` directory when they invoke, reuse it (resume mode).

The lead creates this layout up front:

```
<run-dir>/
├── brief.md
├── state.md
├── sources/
├── drafts/
│   └── archive/
└── final/
```

`state.md` holds the lead's plan, current step, effort decisions, and any rewind reasons. It exists so a fresh session can pick up the run mid-way.

## Procedure

1. **Parse trigger.** Extract the topic from the user prompt. Slugify for the directory name (lowercase, spaces to `-`, strip special chars).
2. **Locate / create run dir.** If `~/research-runs/<slug>-*` exists, enter resume mode and skip to step 5. Otherwise create `~/research-runs/<slug>-<YYYYMMDD>/` and the subdirs above.
3. **Draft `brief.md`.** Before drafting, **check the Obsidian vault for an existing main note on this topic** (search `~/Documents/obsidian/wiki/` via `obsidian search` or `rg --type md` for filename + content match — likely produced by `lite-research` on a prior pass). If found, read it. Use it as a bibliography seed (its References section pre-populates `sources/source-list.md` with `[lite-research]` provenance), and align the brief's key questions with the prior orientation rather than re-inventing them. Treat the existing note as user-authored prior art, not authoritative.

   Then extract from the user's prompt: topic, key questions (3–5), audience, scope, length target, deadline. When the prompt is silent, infer reasonable defaults: audience = generally-informed reader; ~1500–2500 words; no deadline. Write `brief.md` and print a 5-line summary ("Here's the brief I'm working from: ..."). Use `AskUserQuestion` only if the prompt is genuinely ambiguous (e.g. truly competing interpretations, not just under-specified).
4. **Plan effort.** Read the brief. Decide the subagent count for step 1 based on scope:
    - simple narrow topic → 1 subagent, 3–10 tool calls
    - broad multi-angle topic → 3–6 subagents with divided angles
    - deep technical topic with many subdomains → up to 10 subagents
   Record the decision and the angle assignments in `state.md`. Effort scales with the brief, never hardcoded.
5. **March through steps 1–6.** For each step:
    - Read `~/.claude/skills/deep-research/steps/step-N-*.md`.
    - Print a progress line and update `state.md`:
      ```
      ▶ Step N — <name>
        Step 1 — Research      ✓
        Step 2 — Verify        ▶
        Step 3 — Synthesize    ·
        Step 4 — Draft         ·
        Step 5 — Review        ·
        Step 6 — Compile       ·
      ```
    - Execute the step's procedure exactly. Write outputs to the fixed paths the step file specifies.
    - Verify every checkbox in the step's `## Acceptance criteria` before moving on. If any is unchecked, do not advance — fix or rewind.
6. **Failure backtracking.** If a step uncovers a problem with an upstream artifact (e.g. step 5 review finds an unsupported claim), move the affected downstream artifacts into `drafts/archive/<timestamp>/`, return to the earliest affected step, and re-run forward from there. Do not patch the symptom in place. Note the rewind reason in `state.md`.
7. **Final output.** `final/report.md` only (no PDF). Every factual claim carries a `[Sn]` tag that resolves to the `## References` section, formatted `[Sn] **Title** — Author/Org, date. <URL>. Retrieved YYYY-MM-DD.`

## Conventions

- **One artifact per step.** Each step writes a fixed path. Do not invent new filenames — downstream steps look for these exact paths.
- **Cite as you go.** Every factual claim in any draft must point to a source ID from `sources/source-list.md` (e.g. `[S3]`). No bare claims, ever.
- **Filesystem hand-off.** Subagents write their work to disk. The lead reads paths back, never asks subagents to return long content in the conversation. This keeps the lead's context window clean.
- **Resume by artifact presence.** A step is "done" iff its acceptance criteria are met. If you re-enter the run dir, find the first step whose outputs are missing or incomplete, and resume there.
- **No symptom patching.** Downstream problems mean an upstream rewind, not a local edit.

## Subagent dispatch templates

The lead spawns three kinds of subagent via the `Task` tool with `subagent_type: web-search-agent` (or `general-purpose` for the citation pass — it has no web needs).

### Gatherer (step 1)

Each gatherer owns a slice of angles from the coverage plan. Prompt template:

```
## Task
Source gathering for topic: <topic>
You own these angles from the coverage plan: <angles for this gatherer>
Other angles are owned by other agents — do NOT cover them.

## Channels (priority cascade — use in this order)
1. Local Zotero library — `http://127.0.0.1:23119/api/users/0/items?q=<q>&qmode=everything&format=json`
2. Local Obsidian vault — `obsidian search query="<q>" limit=20` (or `rg --type md ~/Documents/obsidian/wiki/` fallback)
3. Academic DBs — OpenAlex / arXiv / Semantic Scholar / Crossref / PubMed (per-topic selection)
4. Open web — WebSearch + WebFetch (last resort)

Recipes for channels 1–3: `~/.claude/skills/deep-research/references/local-search.md` and `references/academic-search.md`. The lead has noted in `state.md` which channels apply to this topic; stick to those.

## Output
Write your findings to:
- <run-dir>/sources/raw-notes.frag-<n>.md  (every line tagged with the [Sn] for the source it came from)
- <run-dir>/sources/source-list.frag-<n>.md  (your sources with provenance tag, e.g. [zotero] / [obsidian] / [openalex] / [arxiv] / [crossref] / [s2] / [pubmed] / [web], formatted per the references files)

## Strategy
- Walk channels in order: local first (Zotero, Obsidian), then academic DBs, then open web. Cheaper and higher quality earlier.
- Within a channel: start broad (short wide queries to map the landscape), then narrow (drill into specifics once you see what exists).
- For Zotero hits: resolve to the local PDF path and read with the pdf-reader skill or `pdftotext`.
- For academic-DB hits: prefer the OA PDF when available; otherwise log abstract + DOI and tag `[paywalled]`.
- Prefer primary sources (papers, official docs, release notes) over commentary.
- Fire 3+ tool calls in parallel whenever possible.
- Use interleaved thinking after each result to spot gaps and refine your next query.

## Boundaries
- Do not write to any path outside your two fragment files.
- Do not edit other agents' fragments.
- Stop when your angles are covered with at least 2 independent sources each.
```

### Verifier (step 2)

Each verifier gets a shard of claims to check. Prompt template:

```
## Task
Verify the following claims against <run-dir>/sources/source-list.md and the underlying sources.

Claims (your shard):
<claim list>

## Output
Write to <run-dir>/sources/verified-claims.frag-<n>.md, one entry per claim:

- claim: "<claim text>"
  status: verified | partial | unsupported
  sources: [S3], [S7]
  notes: "<one-line evidence summary or what's missing>"

## Strategy
- Resolve each cited source to its underlying text:
  - `[zotero]` → read the local PDF (path is in source-list).
  - `[obsidian]` → read the local note via `obsidian read` or direct file read.
  - `[openalex]`/`[arxiv]`/`[s2]`/`[crossref]`/`[pubmed]` → fetch the OA PDF or DOI landing page; for paywalled, work from the abstract and flag the limit.
  - `[web]` → WebFetch the URL.
- A claim is `verified` only if at least one source explicitly supports it.
- A claim is `partial` if a source supports part of it but not the strongest reading.
- A claim is `unsupported` otherwise — do not soften this; flag clearly.
- A claim supported only by an abstract (not full text) is `partial` at best.

## Boundaries
- Only verify the claims in your shard.
- Do not edit any file other than your fragment.
```

### CitationAgent (step 6)

One agent, single job. Prompt template:

```
## Task
Walk every factual sentence in <run-dir>/drafts/report-v2.md.

For each sentence:
1. Confirm it carries a [Sn] tag.
2. Confirm [Sn] resolves to an entry in <run-dir>/sources/source-list.md.
3. Flag any unsupported sentence to <run-dir>/final/citation-issues.md (this should be empty if the pipeline ran cleanly).

Then assemble <run-dir>/final/report.md:
- Body = report-v2.md prose, unchanged except for any inline citation fixes you make.
- Append a "## References" section listing every [Sn] cited in the body, in numerical order, formatted:
  [Sn] **Title** — Author/Org, date. <URL>. Retrieved YYYY-MM-DD.

## Boundaries
- Do not rewrite prose. Only fix citation tags and add the References section.
- If you find unsupported claims, write final/citation-issues.md and stop — do not produce final/report.md. The lead will rewind.
```

## Evaluation rubric (used in step 5)

Score the draft 0.0–1.0 on each axis. Anything below 0.7 triggers a rewind to the earliest affected step.

- **Factual accuracy** — claims match the cited source.
- **Citation accuracy** — every `[Sn]` resolves; every factual claim has one.
- **Completeness** — every key question from `brief.md` is addressed.
- **Source quality** — primary sources where available, ≥2 independent sources per load-bearing claim, ≥1 dissenting view if applicable.
- **Tool efficiency** — no obvious waste (redundant agents, missed parallelism). Soft signal only.

## Hallucination guard

If the topic is plainly outside Claude's training data (e.g. release notes for software released after the knowledge cutoff), the gatherer step *must* find sources before any draft is written. If gatherers come back with thin coverage, the lead surfaces this to the user with `AskUserQuestion` ("Found only N independent sources; proceed, narrow scope, or abort?") rather than papering over the gap with confident prose.

## Reused machinery

- Parallel `Task` dispatch with hard-constraint prompt templates: pattern adopted from `~/.claude/skills/research-deep/SKILL.md`.
- `AskUserQuestion` for gating expensive phases: pattern adopted from `~/.claude/skills/research/SKILL.md`.
- Resume-by-artifact: pattern adopted from `~/.claude/skills/research-deep/SKILL.md` step 2, extended with `state.md`.
- Orchestrator-worker design, effort scaling, broad-to-narrow search, parallel tool calling, dedicated CitationAgent, evaluation rubric: adopted from Anthropic's multi-agent research system writeup (https://www.anthropic.com/engineering/multi-agent-research-system).
