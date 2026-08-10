@RTK.md

## After completing work
Always end by telling me where I can see the changes:
- If changes are in a worktree: give the `cd` command + server start command
- If changes are in the main checkout and a server is running: give the URL and relevant path
- If CSS was rebuilt: say so; if it still needs rebuilding: say that too
- If Python code changed: note that a server restart is needed

## Model Tier Policy

Skills declare `model_tier` in their frontmatter. Map tiers to provider models when configuring a new agent:

| Tier | Task type | Copilot | Antigravity (Gemini) | Claude Team |
|------|-----------|---------|----------------------|-------------|
| `minimal` | CLI relay, lookup, boilerplate | GPT-5 mini (0x free) | Gemini 2.0 Flash | Haiku 4.5 |
| `moderate` | Drafting, light analysis | GPT-5.4 mini (0.33x) | Gemini 2.5 Flash | Haiku / Sonnet |
| `heavy` | Architecture, long reasoning | GPT-5.2-Codex (1x) | Gemini 2.5 Pro | Sonnet / Opus |

Per-agent config:
- **Claude Code**: set `model: haiku` in skill frontmatter for `minimal` skills
- **Pi**: map `minimal` → SLOW tier, `moderate` → TASK tier, `heavy` → PLANNING tier (verify Pi docs)
- **Aider**: `weak-model` in `.aider.conf.yml` handles `minimal` tasks
- **Gemini CLI (Antigravity)**: `--model gemini-2.0-flash` or equivalent config key (verify their docs)
- **LiteLLM proxy** (future): virtual model names (`minimal-model`) map to any provider -- adopt if agent count grows

## About me

Full-stack developer, primary background in TypeScript/React. Did a data science course last year, now knows Python. Team has 2 data scientists proficient in Python but no web dev background.

Currently taking over a Flask/SQLAlchemy demo app (rivnox-stage-allocatie) from a departing team member. Project is in pre-sales/demo phase for UHasselt. When explaining Python/Flask concepts, draw analogies to React/TS equivalents where helpful.

## Feedback

Avoid em-dashes (—) when writing or editing prose for this user.

**Why:** Em-dashes are a tell-tale sign of AI-generated text and the user wants writing to read naturally.

**How to apply:** Use alternative constructions instead: commas, parentheses, colons, or restructured sentences.

---

Drop time/effort estimates ("1 day", "2 weeks", "~3-5 days") when proposing work. User considers them unrealistic and unhelpful.

**Why:** LLMs consistently mis-estimate engineering effort; it's noise that undermines plan credibility.

**How to apply:** In plans, recommendations, and scoping discussions, use *relative* effort language if needed ("small", "moderate", "large upfront"), or order by sequence rather than duration. Never give day/week numbers unless the user explicitly asks.

---

Before working with any third-party service or platform (Cloudflare, Vercel, Supabase, GitHub, etc.), check what tooling exists and pick in this order: official CLI > MCP server > REST API/SDK > web dashboard walkthrough.

**Why:** CLIs are fastest, simplest, and most token-efficient. MCP integrates cleanly. SDK/API is verbose but scriptable. Dashboard steps waste tokens and can't be executed.

**How to apply:** When the user mentions a service (e.g. "deploy to Cloudflare Pages"), first run `which <tool>` or check `--help` for the official CLI (`wrangler`, `vercel`, `gh`, `supabase`, etc.). If absent, check available MCP servers. Only fall back to API calls or describing dashboard clicks if no tooling exists. State which tool you picked and why.

---

Never interpret, paraphrase, gloss, or build an argument on a quoted or attributed passage until the source text is actually in context.

**Why:** Asked why De Vos glosses *Spaltung* as a split between the political and "the physical" (`@DeVos2016, p. 74`), I produced a full confident reading about neuro-materialism and brain-as-substrate. The book says "psychical". One mistyped word in the request carried the entire invented argument, and the PDF was one `zotero-lookup` call away.

**How to apply:** A citekey or page number in the message is a pointer, not evidence, and precise-looking citation data makes an unread answer feel grounded when it is not. Run the `quote-check` skill first. Scope covers unquoted attribution ("X argues that...", "what does X mean by Y") as well as quoted text. Note that `pdf-read` takes physical page indices while cites give printed pages, so run `pdflabels --check` to get the offset. If the source is genuinely unreachable, the answer is one line naming where you looked: no headings, no bullet structure, no confident register around a guess.

# graphify
- **graphify** (`~/.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
