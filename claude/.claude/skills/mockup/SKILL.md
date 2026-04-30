---
name: mockup
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
description: Generate side-by-side UI variant mockups in browser for fast design iteration, AND resume implementation from a previously picked mockup winner. Use when user asks to "try designs for X", "compare layouts", "mockup 3 buttons", "iterate on UI", or invokes /mockup — skill produces a single HTML file with all variants visible at once (or tabs for full-page mockups), opens in browser, user picks winner via TUI, skill writes a self-contained HANDOFF.md (winner ID, embedded HTML, target file, recipe) plus a project-level LATEST_HANDOFF.md pointer, then stops — no worktree, no plan, no auto-implementation. ALSO use when user says "implement the latest mockup winner", "build the picked mockup", "implement the winner from <path>", "resume the mockup handoff" — skill reads the handoff file(s) and follows the embedded recipe to apply the winning design to the real codebase.
---

# /mockup — UI variant iteration

## Trigger

`/mockup <topic> [, <count> variants] [, full page|small component]`

Examples:
- `/mockup confirm button, 4 variants`
- `/mockup toolbar redesign, 3 variants, full page`
- `/mockup empty state for grid`

## Purpose

Spin up a single HTML file with multiple UI variants visible at once, opened in the user's browser. User compares, picks a winner in the TUI ("B" / "B tighter padding" / "go with B"), skill iterates or — on pick — writes a small `HANDOFF.md` next to the mockup and stops. No worktree creation, no plan generation, no auto-implementation. User clears context window and resumes later with "implement it" / "build it".

**Intentionally minimal**: no local server, no JSON feedback, no comment forms, no element annotations, no polling. Pure file-based, browser-reload workflow.

## When NOT to use

- Final visual polish on already-decided design — just edit the real template.
- Conceptual UX questions ("should this be a modal?") — discuss in chat, no mockup needed.
- Animations / interactions that need real backend data — mockups are static prototypes.

## Visual confirmation questions (replaces AskUserQuestion for visual choices)

When about to use `AskUserQuestion` for a question where options have a **visual dimension** (toolbar layout, button style, component arrangement, color choice) — **do NOT use AskUserQuestion**. ASCII previews render as plain text in the TUI; the user cannot evaluate them.

Instead, build a mini confirmation mockup:

1. Create 2–4 variants (one per option), labelled A, B, C…
2. Each variant shows the real rendered HTML of that option.
3. Follow normal steps: write file, open browser.
4. Reply in plain text what the choice is about and wait for TUI input.

**Triggers for visual confirmation mockup:**
- Toolbar element order / layout ("search left or right of year-dropdown?")
- Button style options ("filled vs ghost vs outline?")
- Any "which of these layouts do you prefer?" during planning
- Any question where the user would need to see it to decide

**Never** use `AskUserQuestion` with `preview` field for visual UI choices — the preview box renders monospace plain text, not HTML.

## Inputs to gather

If invocation is incomplete, use `AskUserQuestion` to fill in:

1. **Topic** — kebab-case slug (e.g. `confirm-button`, `toolbar-redesign`). Required.
2. **Variant count** — default 3. Skip asking if user already specified.
3. **Scope hint** — "small component" or "full page". Default: small component (grid). Only ask if ambiguous.

## Steps

### 1. Detect project slug

```bash
basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
```

Slug used as `<project>` segment in mockup path. Falls back to cwd basename if not in a git repo.

### 2. Compute output path

```
~/.claude/mockups/<project-slug>/<topic-slug>/mockup.html
```

Same topic = same file. Iterations overwrite.

**Re-run cleanup**: if a `HANDOFF.md` already exists at `~/.claude/mockups/<project-slug>/<topic-slug>/HANDOFF.md`, **delete it before regenerating `mockup.html`**. Re-running `/mockup` on a topic that was already picked signals the previous winner is being reconsidered — leaving a stale handoff would silently disagree with the fresh variants. Also clear `~/.claude/mockups/<project-slug>/LATEST_HANDOFF.md` if it pointed at this topic.

```bash
rm -f ~/.claude/mockups/<project>/<topic>/HANDOFF.md
# clear LATEST pointer only if it referenced this topic:
grep -q "Topic: <topic>" ~/.claude/mockups/<project>/LATEST_HANDOFF.md 2>/dev/null && rm -f ~/.claude/mockups/<project>/LATEST_HANDOFF.md
```

### 3. Pick layout

- **Default: grid** (`templates/grid.html`) — all variants visible on one page.
- **Tabs only when**: user said "full page" / "full screen" / "view" / individual variants exceed ~400px height. Use `templates/tabs.html`.

The user has explicitly stated grid is preferred unless content can't fit. **Bias hard toward grid.**

### 4. Generate variants

For each variant (typically 3, range 2–6):
- Assign letter ID: A, B, C, …
- Invent a distinct design direction: e.g. "pastel fill", "outline", "solid", "ghost", "icon-only", "compact".
- Write a one-line description.
- Produce HTML body (Tailwind classes + inline `<style>` for tokens).
- If interactive (button click, toggle), wrap in per-variant Alpine `x-data`.

Match existing project tokens when known (look at recent CSS in repo). For uhasselt-stage: `--primary:#003D6B; --primary-light:#dce8f2; bg:#f5f4f2`.

**Responsive component?** If the component looks different per viewport (mobile/tablet/desktop, breakpoint-driven content swap, grid cell at different widths), see step 4a before generating.

### 4a. Responsive / viewport-aware components

Trigger words: *responsive*, *breakpoint*, *mobile/tablet/desktop*, *viewport*, *xl/lg/md/sm*, *grid cell at different widths*.

Rule: **variants = design ideas. viewports = sub-sections inside each variant card.**

Each sub-section must render the layout that is genuinely correct at that breakpoint — different content shown/hidden, flex direction change, element repositioned. Same card at narrower width is an anti-pattern (truncation is automatic and obvious; user gains nothing from seeing it three times).

Each sub-section needs a short caption (e.g. `xl ≥1280px · 261px cel`) so user can reference it precisely (*"base in A is wrong"*).

Full HTML structure, anti-pattern catalogue, breakpoints reference: see [`responsive-patterns.md`](responsive-patterns.md).

### 5. Render template

Read `templates/grid.html` or `templates/tabs.html`. Replace placeholders:
- `{{TOPIC}}` — human-readable topic
- `{{VARIANTS_HTML}}` — concatenated variant blocks

Each variant block (grid):
```html
<div class="variant-card" data-variant="{{ID}}" x-data='{{ALPINE_STATE}}'>
  <div class="variant-label">{{ID}} — {{TITLE}}</div>
  <div class="variant-desc">{{DESCRIPTION}}</div>
  <div class="variant-body">{{HTML}}</div>
</div>
```

Each variant block (tabs):
```html
<div x-show="active === '{{id_lower}}'" data-variant="{{ID}}">
  <p class="section-label">{{ID}} — {{DESCRIPTION}}</p>
  {{HTML}}
</div>
```

### 6. Write file

`Write` tool to absolute path. Create dirs first: `mkdir -p` parent.

### 7. Open browser

```bash
open "file://<absolute-path>"
```

macOS only. Run as background-safe (file:// open does not block).

### 8. Reply to user and STOP

Reply format:
```
Opened <topic> mockup with N variants.

Path: ~/.claude/mockups/<project>/<topic>/mockup.html
Layout: grid (or: tabs)

Type:
  • `B`                       — pick variant B, write HANDOFF.md and stop
  • `B tighter padding`       — tweak variant B
  • `redo with bigger labels` — regenerate all variants
  • `add a 4th: ghost style`  — add variant
  • `go with B`               — explicit pick + handoff
```

Then **stop**. Wait for user TUI input.

## On iteration feedback

User types in TUI. Parse intent:

- **Tweak one variant** (`B tighter padding`): regenerate `mockup.html` with only that variant changed. Tell user "Reload (Cmd+R)."
- **Regenerate all** (`redo with X`): same path, fresh variants applying X.
- **Add variant** (`add D: ghost`): append to existing file.
- **Drop variant** (`drop A`): remove from file.

Always overwrite the same `mockup.html`. User reloads browser manually.

## On pick / "go with X"

When user signals a winner (`B`, `go with B`, `B looks good`, `pick B`):

**Do NOT** invoke `superpowers:writing-plans`. **Do NOT** create a worktree. **Do NOT** start editing real code. The skill ends with a self-contained handoff file so the user can clear context and resume later.

Steps:

1. **Parse winning variant.** Read `mockup.html`, locate `data-variant="<ID>"`, extract the full inner block (`.variant-label`, `.variant-desc`, `.variant-body` and any per-variant `<style>` / Alpine `x-data`). Capture the title and description text.

2. **Resolve target file aggressively.** Search the originating conversation for the most recently mentioned template / blueprint / page / partial path. Strong signals: a path the user said `/mockup` was *for* ("mockup the toolbar in `templates/grid.html`"), the file the conversation was already editing, the screen name in the topic slug. Only fall back to `TBD — confirm before implementing` if there is genuinely no signal in the conversation. **Do NOT** ask the user — by pick time the signal is either there or it isn't, and the next session can disambiguate.

3. **Detect dev-server hint.** Read the project's `CLAUDE.md` (in repo root) for a port number and how the user runs the server. If found, store the exact `http://localhost:<port>` URL and start command. If not found, store `TBD` for the verify step.

4. **Write `HANDOFF.md`** at `~/.claude/mockups/<project>/<topic>/HANDOFF.md`. The file MUST be self-contained — a future `/mockup` re-run on the same topic overwrites `mockup.html`, so the embedded HTML is the durable copy:

   ````markdown
   # Mockup winner — <topic>

   - **Winner**: <ID> — <title>
   - **Picked**: <ISO date>
   - **Project**: <project-slug>
   - **Mockup file** (may be overwritten by future /mockup runs): `~/.claude/mockups/<project>/<topic>/mockup.html`
   - **Likely target file(s)**: `<path>` (or `TBD — confirm before implementing`)

   ## What the winner is

   <one-paragraph description: visual choices, structure, key tokens, why it won over the other variants>

   ## Tweak notes accumulated during iteration

   - <bullet>  (or `(none)`)

   ## Winning variant — embedded source

   Copied verbatim from `mockup.html` at pick time. **This is the source of truth** even if `mockup.html` is later regenerated.

   ```html
   <!-- variant <ID> — <title> -->
   <div class="variant-card" data-variant="<ID>" x-data='<ALPINE_STATE>'>
     <div class="variant-label"><ID> — <title></div>
     <div class="variant-desc"><description></div>
     <div class="variant-body"><FULL_HTML_BODY></div>
   </div>
   ```

   <!-- if the variant relied on per-variant <style> blocks or non-trivial CSS tokens, embed them here too -->

   ## How to implement (recipe for the next session)

   1. Read the **Winning variant — embedded source** section above. The fenced HTML block is the design to apply.
   2. Open `<target file>` and replace the corresponding region with the variant body. Strip the `variant-card` wrapper, the `data-variant` attribute, and any mockup-only Alpine `x-data` (unless the real component genuinely uses Alpine).
   3. Reconcile design tokens with project tokens. For uhasselt-stage: `--primary:#003D6B; --primary-light:#dce8f2; bg:#f5f4f2`. If the variant uses inline Tailwind classes, those work as-is; if it uses custom CSS, move declarations into the project stylesheet.
   4. **Rebuild Tailwind** if the project has a CSS build step (look for `tailwind.in.css` / `npm run build:css` in repo root) — `npm run build:css`.
   5. Verify on the dev server: `<dev-server-url-or-TBD>`. Restart needed only if Python/config changed (templates auto-reload).

   ## To resume in a fresh context

   In a clean session, type one of:

   - `implement the latest mockup winner` — Claude reads `~/.claude/mockups/<project>/LATEST_HANDOFF.md`
   - `implement the winner from ~/.claude/mockups/<project>/<topic>/HANDOFF.md` — explicit path
   ````

5. **Write project-level pointer** at `~/.claude/mockups/<project>/LATEST_HANDOFF.md` (overwriting any previous one):

   ```markdown
   # Latest mockup handoff — <project>

   - **Topic**: <topic>
   - **Winner**: <ID> — <title>
   - **Picked**: <ISO date>
   - **Full handoff**: `~/.claude/mockups/<project>/<topic>/HANDOFF.md`
   ```

6. **Reply to user** (plain text, no skill invocation):

   ```
   Winner: <ID>. Handoff written.

   Handoff:        ~/.claude/mockups/<project>/<topic>/HANDOFF.md
   Latest pointer: ~/.claude/mockups/<project>/LATEST_HANDOFF.md
   Mockup (live):  ~/.claude/mockups/<project>/<topic>/mockup.html

   Clear context (/clear) and type `implement the latest mockup winner` to resume.
   ```

7. **Stop.** Do not call any other skill, do not edit code, do not create a branch or worktree.

## On resume — "implement the latest mockup winner" / "implement the winner from <path>"

This is the second mode the skill operates in. Triggered by phrases listed in the `description:` frontmatter (`implement the latest mockup winner`, `build the picked mockup`, `implement the winner from <path>`, `resume the mockup handoff`).

Steps:

1. **Locate the handoff.**
   - If the user gave an explicit `<path>`, read that file directly.
   - Otherwise, detect project slug (same `git rev-parse` step as section 1 of the main flow), then read `~/.claude/mockups/<project>/LATEST_HANDOFF.md` to find the topic, then read `~/.claude/mockups/<project>/<topic>/HANDOFF.md`.
   - If neither exists, tell the user no handoff was found and stop.

2. **Read the handoff completely.** Note: target file, embedded HTML, tweak notes, recipe steps.

3. **If target file is `TBD`**, ask the user once via `AskUserQuestion` for the file path. This is the one round-trip the original session was allowed to skip.

4. **Apply the recipe.** Follow the embedded "How to implement" steps verbatim. The embedded HTML block is authoritative — do **not** re-read `mockup.html` (it may have been regenerated since the pick).

5. **Verify** on the dev server URL recorded in the handoff. Per project CLAUDE.md instructions on what to do if a port is busy / a restart is needed.

6. **Do NOT** delete the handoff after implementation. The user may want to refer back. Cleanup (`rm -rf ~/.claude/mockups/<project>/<topic>/`) is a separate, user-initiated action.

## Out-of-scope guardrails

If user requests any of these, **do not silently add them**. Surface the skill is intentionally minimal and ask if they want to extend:

- Local HTTP server for the mockup
- JSON feedback files
- In-page Pick buttons or comment textareas
- Element-level click-to-annotate
- Live reload / file watching
- `/loop` polling

These were all explicitly designed out. Adding them is a design change, not a routine extension.

## Output paths

```
~/.claude/mockups/<project-slug>/
  ├── LATEST_HANDOFF.md         # project-level pointer to most recent pick — enables "implement the latest mockup winner"
  └── <topic-slug>/
      ├── mockup.html           # variants — overwritten on each iteration; cleared on re-run
      └── HANDOFF.md            # written on winner pick — self-contained (embeds winning HTML + recipe), durable across mockup.html regeneration
```

## Templates

- `templates/grid.html` — default layout, all variants in CSS grid
- `templates/tabs.html` — fallback for full-page-sized variants
