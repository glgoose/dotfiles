---
name: lite-research
user-invocable: true
description: Fast first-pass research on a topic. Spawns 2 parallel subagents, capped depth, produces a 1000-1500 word main note in the Obsidian vault with inline citations and a References section. Default skill for "research X for me", "research X", "background on X", "what's the state of the debate on X", "first-pass on X", "orient me on X". Cheaper sibling of `/deep-research`. Use for orientation passes; escalate to `/deep-research` when the user asks for "deep-dive on X", "thorough research", or "source-grade report on X".
allowed-tools: Read, Write, Glob, Grep, WebSearch, WebFetch, Task, AskUserQuestion, Bash
---

# Lite Research

Fast, source-tagged orientation pass on a topic. Single session, no run directory, no verification stage, output lands in the Obsidian vault.

If the user asked for a thorough or source-grade report ("deep-dive on X", "thorough research", "source-grade", "real research with sources"), run `/deep-research` instead.

## Trigger

Default skill for any natural-language prompt of the form "research X for me", "research X", "background on X", "what's the state of the debate on X", "first-pass on X", "orient me on X". Slash form: `/lite-research <topic>`.

## Pipeline (six steps, all in one session)

### 1. Parse topic + cleave into 2 angles

Read the user's prompt. Extract:
- **Topic** — short slug-able phrase, e.g. `real abstraction in Sohn-Rethel`.
- **Angles** — exactly 2 complementary slices that together cover the topic. Cleave by the most natural binary for the topic. Common cleavages:
  - concept + reception (history-of-ideas topic)
  - concept + critique (philosophical position)
  - what + how (technical / methodological topic)
  - background + current state (current-events topic)
  - primary + secondary (source-driven topic)
- If the topic is genuinely too narrow to cleave (one paper, one definition), make 1 subagent instead of 2 and skip angle 2 in step 2.
- If the topic is genuinely too broad to cleave into just 2 angles (multi-decade survey, "everything about X"), tell the user this is `/deep-research` territory and ask whether to escalate via `AskUserQuestion`.

Do **not** write a `brief.md` or any `~/research-runs/` artifact. lite-research is purely vault-output.

### 2. Spawn 2 parallel subagents (Task tool)

One `Task` call per angle, both in the same message so they run in parallel. `subagent_type: web-search-agent`.

**Hard caps per subagent** (state in the prompt):
- ≤ 5 tool calls total.
- Output ≤ ~1500 words / 8K tokens.
- Stop when the angle is covered with 3-5 distinct sources.

**Channel cascade for each subagent** (in this order, fall through only if earlier tier misses):

1. **Zotero (search only)** — `curl http://127.0.0.1:23119/api/users/0/items?q=<query>&qmode=everything&format=json&limit=10` (Zotero must be running). Return matched items as candidate sources. **Read at most 1 PDF in full** for each subagent's angle, only when the Zotero hit is clearly load-bearing for the angle. Otherwise just record metadata + abstract.
2. **Obsidian vault (search only)** — `obsidian search query="<query>" limit=10` (or `rg --type md ~/Documents/obsidian/wiki/` fallback). Treat hits as both potential sources and a bibliography of further references. **Read at most 1 vault note in full** per angle.
3. **Academic DB (one, topic-routed)** — pick by field: PhilPapers (philosophy), arXiv + Semantic Scholar (CS / ML), PubMed (biomedical), OpenAlex (general fallback), Brill HM catalog (Marxist theory). Fetch abstracts + DOI metadata only; do not read full PDFs in this step.
4. **Open web** — `WebSearch` then `WebFetch` for ≤ 2 high-signal pages.

`schematic-notes`, `note-architecture`, and `references/academic-search.md` (in `~/.claude/skills/deep-research/references/`) document recipes for the channels in detail; reuse them rather than re-deriving.

**Subagent prompt template** (inline in the `Task` call):

```
## Task
First-pass source gathering on: <topic>
You own this angle: <angle>

## Hard caps
- ≤ 5 tool calls total
- ≤ 1500 words output
- Stop when 3-5 distinct sources cover the angle

## Channels (cascade, search-only for locals)
1. Zotero: GET 127.0.0.1:23119/api/users/0/items?q=<q>&qmode=everything&format=json&limit=10. Read at most 1 PDF in full if the hit is load-bearing.
2. Obsidian: `obsidian search query="<q>" limit=10` or `rg` fallback. Read at most 1 vault note in full.
3. Academic DB (one, topic-routed): <pick>. Abstracts + DOIs only.
4. Web: WebSearch + ≤ 2 WebFetch for high-signal pages.

See ~/.claude/skills/deep-research/references/local-search.md and academic-search.md for recipes.

## Output (return inline, not to disk)
A markdown digest with this skeleton:

### Sources
[S1] **Title** — Author/Org, year. <URL or local path>. Provenance: [zotero | obsidian | philpapers | openalex | web]. Retrieved YYYY-MM-DD.
[S2] ...

### Findings
A 600-1000 word summary covering your angle. Every factual sentence carries a [Sn] tag. No bare claims. Use plain prose, not schematic style; the lead will reformat.

### Open questions
2-4 things you couldn't resolve in the budget — for the lead to address or surface.

## Boundaries
- Do not write to disk.
- Do not exceed the tool-call cap.
- If your channel cascade misses on locals + academic DB, fall through to web — do not retry the same query against the same channel.
```

### 3. Merge subagent outputs

When both subagents return, the lead:
- Reads both digests inline (subagent outputs land as Task tool results).
- Merges source lists, renumbering to a single `[S1]..[Sn]`.
- Note any conflicting findings between angles to address in the synthesis.
- If a subagent returned thin coverage (< 3 sources), do **not** rerun it. Note the gap and continue.

### 4. Synthesise main note

Decide output shape via `note-architecture` skill:
- Default: **single concept-named main note**, 1000-1500 words, in the appropriate vault folder (`KUL/` for philosophy/academic; vault root for general topics; `Projects/<project>/` for project-bound material).
- Filename: lowercase noun-phrase, e.g. `real abstraction.md`. Use `<Author> - <Topic>.md` only when the topic is single-source-driven and no settled concept handle exists yet.
- Per `note-architecture`, do **not** auto-create per-source satellite notes. Substantive Zotero sources that the user is likely to come back to may get a literature-note satellite (`@Citekey.md`) at lead's discretion, but the default is "all sources stay in the main note's References section."

Apply `schematic-notes` style (symbols, lowercase headings, citekeys, wikilinks). Body structure:

```
---
tags: []
aliases: [synonyms, original-language terms]
status: draft
---
# <topic>

<1-2 sentence framing of the topic>

## <angle 1 heading>
<prose, every factual claim tagged [Sn]>

## <angle 2 heading>
<prose, every factual claim tagged [Sn]>

## open questions
<bullets — surfaced from subagents + your synthesis>

## see also
- [[related concept 1]]
- [[related concept 2]]
- [[@Citekey1]] (if literature-note satellite was created)

## References
[S1] **Title** — Author/Org, year. <URL>. Provenance: [...]. Retrieved YYYY-MM-DD.
[S2] ...
```

Constraints:
- 1000-1500 words in the body (excluding frontmatter and References).
- Every factual sentence carries an `[Sn]` tag. No bare claims.
- Use `[[wikilinks]]` for the first mention of any concept, person, or work that has (or plausibly should have) a vault note. Per `note-architecture`, link first mention only.
- No em-dashes. Use commas, parentheses, colons.
- No effort or duration estimates anywhere in the output.

### 5. Citation pass

Walk every factual sentence in the draft:
- Confirm it carries an `[Sn]` tag.
- Confirm `[Sn]` resolves to an entry in the `## References` section.
- Fix orphan tags (sentence with no `[Sn]`) by either adding the right tag or removing the claim.
- Fix dangling tags (`[Sn]` with no matching reference entry) by adding the reference or deleting the tag.

This is an inline read-through by the lead. **Do not spawn a subagent for this step**; do **not** re-fetch sources. Trust the subagent digests; the citation pass guards against tag-drift only.

If the citation pass reveals more than ~3 unsupported claims or systemic citation failure, surface it to the user via `AskUserQuestion`: "Coverage was thin / citations are unreliable. Continue, narrow scope, or escalate to `/deep-research`?"

### 6. Write to vault + report

Use `Write` tool to create the main note at the chosen vault path. If a literature-note satellite was justified, create it after the main note.

Tell the user:
- Path of the main note (full path).
- Word count of body.
- Number of distinct sources cited.
- Any flagged open questions or coverage gaps.
- One-line offer to escalate: "Want me to `/deep-research` this for source-grade depth?" Do not insist; offer once and stop.

## Anti-bloat rules

- **No `~/research-runs/`** dir. lite-research never writes there.
- **No `brief.md` / `state.md`.** State is the conversation.
- **No verifier subagent.** Trust gatherers; the citation pass is the only accuracy gate.
- **No rewinds.** If something is wrong, surface it and let the user decide whether to escalate.
- **No retries on a missed channel.** If Zotero misses, fall through to the next channel; do not vary the query and re-hit Zotero.
- **No more than 2 subagents.** If the topic seems to need 3+, the user should escalate to `/deep-research`.

## Hand-off to /deep-research

lite-research writes nothing extra for `/deep-research`. The handoff is via the Obsidian main note: when `/deep-research` runs on the same topic later, it will detect the existing vault note and use it as a bibliography seed. lite-research itself does not write to `~/research-runs/`.

## Failure cases

- **Topic too broad / too thin.** If during step 1 the topic looks like it should be `/deep-research`, ask the user up front via `AskUserQuestion` — do not silently produce a thin main note.
- **All channels miss.** If both subagents return < 3 sources combined, surface this and ask the user whether to widen, narrow, or abort. Do not paper over with confident prose. Hallucination guard.
- **Conflicting findings between angles.** Note the conflict in the body (e.g. "X claim per [S2]; contested per [S5]"). Do not adjudicate beyond what sources warrant.
