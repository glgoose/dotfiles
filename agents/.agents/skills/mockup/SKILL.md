---
name: mockup
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
description: Generate side-by-side UI variant mockups in browser for fast design iteration, AND resume implementation from a previously picked mockup winner. Use when user asks to "try designs for X", "compare layouts", "mockup 3 buttons", "iterate on UI", or invokes /mockup — skill produces a single HTML file with all variants visible at once (or tabs for full-page mockups), opens in browser, user picks winner via TUI, skill writes a self-contained HANDOFF.md (winner ID, embedded HTML, target file, recipe) plus a project-level LATEST_HANDOFF.md pointer, then stops — no worktree, no plan, no auto-implementation. ALSO use when user says "implement the latest mockup winner", "build the picked mockup", "implement the winner from <path>", "resume the mockup handoff" — skill reads the handoff file(s) and follows the embedded recipe to apply the winning design to the real codebase.
---

# /mockup — UI variant iteration

## Trigger

`/mockup <topic> [, <count> variants] [, full page|small component] [, <modifier>...]`

Examples:
- `/mockup confirm button, 4 variants`
- `/mockup toolbar redesign, 3 variants, full page`
- `/mockup empty state for grid`
- `/mockup checkout button hover, 3 variants, tunable, with snippets`

### Modifier flags

| Flag | Effect | Default |
|------|--------|---------|
| `tunable` / `with sliders` / `knobs` / `tune` | Force sliders on (§4b) | auto-detect |
| `no sliders` / `static` | Force sliders off | auto-detect |
| `with snippets` / `show code` / `with code` | Add collapsible code panel per variant (§4c) | off (auto-on if invocation mentions *port*, *port to React*, *port to Flask*, *for the real component*) |
| `full page` / `full screen` | Use tabs layout (§3) | grid |

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

**Project-level tokens file**: also check `~/.claude/mockups/<project-slug>/_tokens.css`. If it does not exist, generate it now (and its companion `_tokens.html`). If it exists, leave it alone — the user may have hand-edited it.

To generate `_tokens.css`:

1. Read the project repo's `CLAUDE.md` (in repo root) for design tokens. Probe in order: a `## Design tokens` / `## Colors` / `## Styling` section, `:root { ... }` snippets, or explicit `--primary` / `bg` mentions. For uhasselt-stage: `--primary:#003D6B; --primary-light:#dce8f2; bg:#f5f4f2`.
2. If tokens found, write them to `_tokens.css` as a `:root { ... }` block plus a `body { background: <bg>; }` rule. If nothing found, write a minimal default (`:root { --primary: #475569; --primary-light: #e2e8f0; } body { background: #f5f4f2; }`).
3. Also write a sibling `_tokens.html` — a small browseable swatch page with a `<link rel="stylesheet" href="_tokens.css">`, an `<h1>{{project}} design tokens</h1>`, and colored squares per token plus a font-family preview. The user can `open file://…/_tokens.html` to inspect. Pure convenience; mockups don't depend on it.

Templates `<head>` already contains `<link rel="stylesheet" href="../_tokens.css">` — that's why the file must exist by render time.

### 3. Pick layout

- **Default: grid** (`templates/grid.html`) — all variants visible on one page.
- **Tabs only when**: user said "full page" / "full screen" / "view" / individual variants exceed ~400px height. Use `templates/tabs.html`.

The user has explicitly stated grid is preferred unless content can't fit. **Bias hard toward grid.**

### 4. Generate variants

**Design thinking phase** (principles from `frontend-design` skill — apply before writing any HTML):

For the mockup as a whole, anchor on:
- **Purpose**: What problem does this component solve? Who uses it?
- **Differentiation**: What makes each variant UNFORGETTABLE vs. the others?

Each variant must commit to a **bold, distinct aesthetic pole** — not just a color swap. Think: "editorial hairline serif", "industrial monospace utility", "art deco geometric with a gold accent", "brutalist raw ink on paper". Use this vocabulary, not "pastel fill / ghost / solid".

**Aesthetic rules (apply to every variant's HTML):**
- **Typography**: Import a distinctive Google Font per variant (`<link>` or `@import`). Never Arial, Inter, Roboto, Space Grotesk, or system-ui. Pair a display font with a refined body font when the variant has a hierarchy.
- **Color**: Dominant color + sharp accent, defined as CSS variables. Avoid purple-gradient-on-white. Dominant with one punch beats evenly distributed palette.
- **Motion**: One well-timed CSS transition or hover state per variant beats scattered micro-interactions. CSS-only preferred.
- **Spatial composition**: Lean into asymmetry, generous negative space, OR controlled density. Avoid the default "centered box with border-radius and drop shadow".
- **Depth / atmosphere**: Use gradient mesh, subtle texture, layered transparencies, or dramatic shadows where they serve the concept. Flat solid white is only acceptable when "stark void" IS the design intent.

**Anti-patterns — never let two variants share these traits:**
- Same font family, just different weight
- Same layout, different color
- All variants = centered card + drop shadow + rounded corners
- Any variant using Inter / Roboto / Arial / system-ui
- **Variant without a stated tradeoff** — implies it dominates the others, which would mean the comparison is fake. Regenerate.

For each variant (typically 3, range 2–6):
- Assign letter ID: A, B, C, …
- Name the aesthetic direction explicitly in the description (e.g. "industrial mono utility" not "compact dark").
- Write a **two-line description**:
  - Line 1 (`{{DESCRIPTION}}`): one-line aesthetic direction (e.g. *"industrial mono utility — tight monospace, ink-on-paper"*).
  - Line 2 (`{{TRADEOFF}}`): the cost this variant accepts, framed as `<strength> / <cost>` (e.g. *"dense + fast / cramped on mobile"*, *"editorial gravitas / heavier visual weight"*, *"spacious + readable / takes more vertical real estate"*).
- Produce HTML body (Tailwind classes + inline `<style>` for per-variant typography / Google Fonts imports). Project-wide tokens (`--primary`, `--primary-light`, body bg) come from `~/.claude/mockups/<project>/_tokens.css` linked in the template `<head>` — don't redeclare them inline.
- If interactive (button click, toggle), wrap in per-variant Alpine `x-data`.

Match existing project tokens when known (look at recent CSS in repo). For uhasselt-stage: `--primary:#003D6B; --primary-light:#dce8f2; bg:#f5f4f2` — treat these as the base palette; each variant can extend or contrast against them but should not ignore them entirely.

**Responsive component?** If the component looks different per viewport (mobile/tablet/desktop, breakpoint-driven content swap, grid cell at different widths), see step 4a before generating.

**Tunable component?** If variants differ along continuous numeric tokens (spacing, duration, radius, shadow, scale, hue), see step 4b — embed sliders + a Copy-as-prompt button so the user tunes in-browser instead of round-tripping freeform "tighter padding" feedback.

### 4a. Responsive / viewport-aware components

Trigger words: *responsive*, *breakpoint*, *mobile/tablet/desktop*, *viewport*, *xl/lg/md/sm*, *grid cell at different widths*.

Rule: **variants = design ideas. viewports = sub-sections inside each variant card.**

Each sub-section must render the layout that is genuinely correct at that breakpoint — different content shown/hidden, flex direction change, element repositioned. Same card at narrower width is an anti-pattern (truncation is automatic and obvious; user gains nothing from seeing it three times).

Each sub-section needs a short caption (e.g. `xl ≥1280px · 261px cel`) so user can reference it precisely (*"base in A is wrong"*).

Full HTML structure, anti-pattern catalogue, breakpoints reference: see [`responsive-patterns.md`](responsive-patterns.md).

### 4b. Tunable parameters (sliders + Copy as prompt)

When variants differ by **degree** along continuous numeric tokens, embed a per-variant slider panel + a "Copy as prompt" button. User tunes in-browser, clicks copy, pastes the resulting text in the TUI: plain paste rewrites that variant's slider defaults in `mockup.html`; paste containing `go with <ID>` / `pick <ID>` jumps to the pick flow with the tuned values baked into the handoff.

**Auto-detect rules — include sliders when:**
- Variants share ≥1 continuous numeric token: padding/gap, border-radius, font-size, duration, scale, shadow blur/offset, opacity, hue/lightness.
- ≥2 variants would expose the same control set (otherwise sliders are noise).
- Invocation contains `tunable`, `with sliders`, `knobs`, `tune` &rarr; forced on.

**Skip sliders when:**
- Variants differ structurally — icon vs no-icon, modal vs inline, single-line vs stacked. That's a *kind* difference; sliders only help on degree.
- Invocation contains `no sliders` / `static`.

**Per-variant budget**: 3–5 controls max. More overloads the comparison.

**Widget shape (per variant, dropped after `.variant-body`):**

```html
<div class="tune-panel" x-data="{ duration: 220, scale: 1.04, shadow: 8, spring: true }">
  <div class="tune-row">
    <label>duration</label>
    <input type="range" min="80" max="600" step="10" x-model.number="duration">
    <span class="tune-val" x-text="duration + 'ms'"></span>
  </div>
  <!-- more .tune-row entries... -->
  <div class="tune-actions">
    <button class="copy-prompt" @click="
      navigator.clipboard.writeText(
        `apply variant B tuned values to the real component:\n` +
        `duration: ${duration}ms\nscale: ${scale}\nshadow: ${shadow}px\n` +
        `easing: ${spring ? 'spring' : 'ease-out'}`
      );
      $event.target.textContent = 'copied ✓';
      setTimeout(() => $event.target.textContent = 'Copy as prompt', 1500);
    ">Copy as prompt</button>
    <button class="reset" @click="duration=220; scale=1.04; shadow=8; spring=true">reset</button>
  </div>
</div>
```

Bind the variant body to the same `x-data` scope via CSS vars: `:style="`--dur:${duration}ms; --scale:${scale}; --shadow:${shadow}px;`"`. One variable layer keeps the variant CSS clean.

**Widget rules:**
- Variant ID is hard-coded into the clipboard string (`variant B` above) so the parser routes the paste to the right variant.
- Slider defaults equal the variant's designed values; reset returns to those.
- Numeric values include units in display AND clipboard (`220ms`, `8px`); toggles stringify as human labels (`spring` / `ease-out`, never `true` / `false`).

**Prompt format contract — Copy as prompt MUST emit:**

```
apply variant <ID> tuned values to the real component:
<token>: <value>
<token>: <value>
...
```

If you change this shape, also update the iteration parser in "On iteration feedback" below.

**Full widget HTML, CSS expectations, and three worked examples** (hover animation / card spacing / modal sizing): see [`templates/slider-panel.md`](templates/slider-panel.md).

### 4c. Code-snippet preview (opt-in)

When the invocation contains `with snippets` / `show code` / `with code`, OR the topic mentions intent to port (*port*, *port to React*, *port to Flask*, *for the real component*), append a `<details class="snippet">` block to each variant card — after `.tune-panel` if present, else after `.variant-body`:

```html
<details class="snippet">
  <summary>show code</summary>
  <pre><code class="lang-html">{{ESCAPED_HTML}}</code></pre>
  <button class="copy-snippet" onclick="
    navigator.clipboard.writeText(this.previousElementSibling.textContent);
    this.textContent = 'copied ✓';
    setTimeout(() => this.textContent = 'copy snippet', 1500);
  ">copy snippet</button>
</details>
```

`{{ESCAPED_HTML}}` rules:
- Includes the variant's rendered HTML body + any per-variant `<style>` block, HTML-escaped (`&amp;`, `&lt;`, `&gt;`).
- **Strips** `.variant-card` wrapper, `data-variant`, `.variant-label`, `.variant-desc`, `.variant-tradeoff`, `.tune-panel`, Tailwind CDN script, and mockup-only Alpine `x-data`.
- Keeps Tailwind utility classes inline on elements (they port directly to React `className=`).
- Keeps whitespace/indentation untouched — readability matters for the port.
- `<details>` defaults to closed; user expands per-variant when comparing code.

Full markup, escaping rules, worked example, anti-patterns: see [`templates/snippet-preview.md`](templates/snippet-preview.md).

### 5. Render template

Read `templates/grid.html` or `templates/tabs.html`. Replace placeholders:
- `{{TOPIC}}` — human-readable topic
- `{{VARIANTS_HTML}}` — concatenated variant blocks

Each variant block (grid):
```html
<div class="variant-card" data-variant="{{ID}}" x-data='{{ALPINE_STATE}}'>
  <div class="variant-label">{{ID}} — {{TITLE}}</div>
  <div class="variant-desc">{{DESCRIPTION}}</div>
  <div class="variant-tradeoff">{{TRADEOFF}}</div>
  <div class="variant-body">{{HTML}}</div>
  <!-- .tune-panel (if §4b applies) goes here -->
  <!-- <details class="snippet"> (if §4c applies) goes here -->
</div>
```

Each variant block (tabs):
```html
<div x-show="active === '{{id_lower}}'" data-variant="{{ID}}">
  <p class="section-label">{{ID}} — {{DESCRIPTION}}</p>
  <div class="variant-tradeoff">{{TRADEOFF}}</div>
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

- **Paste of tuned values** (input matches `^apply variant ([A-Z]) tuned values`): parse the variant ID and the `key: value` lines. Rewrite that variant's `tune-panel` `x-data` defaults in `mockup.html` to the pasted values (so reload preserves them) — and update any matching defaults referenced in a `reset` handler on the same panel. Reply: "Updated variant `<ID>` defaults — reload Cmd+R."
- **Paste of tuned values + pick** (same paste also contains `go with <ID>` / `pick <ID>` case-insensitive, anywhere): jump straight to the pick flow ("On pick" section) using the pasted values as authoritative — they override the `x-data` defaults still in `mockup.html`.
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

   **Capture tuned values too.** If the winning variant has a `.tune-panel`, also extract the current `x-data` defaults (key + value for each slider/toggle). These become the `## Tuned values` block in the handoff. If the pick was triggered by a paste containing `apply variant <ID> tuned values to the real component:`, **prefer the pasted values** over the file's `x-data` defaults — the paste IS the user's final answer, the file may not have been rewritten yet.

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

   <one-paragraph description: visual choices, structure, key tokens, why it won over the other variants — reference each loser's stated tradeoff explicitly ("A was too cramped on mobile, C's editorial gravitas felt too heavy")>

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

   ## Tuned values

   <!-- Only present when the winning variant had a .tune-panel. Authoritative over slider defaults in the embedded HTML above. -->

   - duration: 220ms
   - scale: 1.04
   - shadow: 8px
   - easing: spring

   ## How to implement (recipe for the next session)

   1. Read the **Winning variant — embedded source** section above. The fenced HTML block is the design to apply.
   2. Open `<target file>` and replace the corresponding region with the variant body. Strip the `variant-card` wrapper, the `data-variant` attribute, the entire `.tune-panel` block, the `<details class="snippet">` block (if present), and any mockup-only Alpine `x-data` (unless the real component genuinely uses Alpine). **If a `## Tuned values` section is present above, those are the exact numbers to apply — slider defaults in the embedded HTML may be stale, the Tuned values block is authoritative.** If `with snippets` was used during iteration, the user has already vetted the markup in-browser; the port is mostly mechanical.
   3. Reconcile design tokens with project tokens. The mockup pulled tokens from `~/.claude/mockups/<project>/_tokens.css` — confirm the values there still match the live project before substituting. For uhasselt-stage the canonical values are `--primary:#003D6B; --primary-light:#dce8f2; bg:#f5f4f2`. If the variant uses inline Tailwind classes, those work as-is; if it uses custom CSS, move declarations into the project stylesheet.
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

Sliders + Copy-as-prompt are **in scope** (§4b). Still out of scope — if user requests any of these, **do not silently add them**. Surface the skill is intentionally minimal and ask if they want to extend:

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
  ├── _tokens.css               # project design tokens (CSS) — generated on first mockup; preserved on subsequent runs
  ├── _tokens.html              # browseable swatch page — open file://… for visual reference
  ├── LATEST_HANDOFF.md         # project-level pointer to most recent pick — enables "implement the latest mockup winner"
  └── <topic-slug>/
      ├── mockup.html           # variants — overwritten on each iteration; cleared on re-run
      └── HANDOFF.md            # written on winner pick — self-contained (embeds winning HTML + recipe), durable across mockup.html regeneration
```

## Templates

- `templates/grid.html` — default layout, all variants in CSS grid
- `templates/tabs.html` — fallback for full-page-sized variants
- `templates/slider-panel.md` — reference for §4b tunable widget
- `templates/snippet-preview.md` — reference for §4c code-snippet panel
- `responsive-patterns.md` — reference for §4a viewport-aware variants
