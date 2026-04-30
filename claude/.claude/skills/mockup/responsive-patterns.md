# Responsive mockup pattern

Companion doc to `SKILL.md` step 4a. Read this when generating a mockup for a component whose layout actually changes per breakpoint.

## Rule

**Variants = design directions. Viewports = nested sub-sections inside each variant card.** Each sub-section shows the layout that is genuinely correct at that breakpoint.

This lets the user say *"A is good overall, but the base sub-section in A needs the tags shifted."* — they critique design × breakpoint, not design alone.

## When to use

Trigger cues in the user's request:

- *responsive*, *breakpoint*, *viewport*, *mobile/tablet/desktop*, *xl/lg/md/sm*
- *grid cell at different widths*, *cell shrinks*, *fits on phone*
- Any component where content visibility, line count, or flex direction depends on container width.

Example invocations that fit:

- `/mockup grid cell card, 3 variants` — cell width changes per breakpoint.
- `/mockup nav menu responsive, 2 variants` — collapses to hamburger at md.
- `/mockup table row mobile-friendly, 2 variants` — wraps to 2 lines under sm.

If the component renders identically at every width: **drop this pattern, show one width only.**

## HTML structure inside `{{VARIANTS_HTML}}`

Each variant card holds N viewport sub-blocks. Fixed `width` on each sub-block simulates the cell/container width — no media queries.

```html
<div class="variant-card" data-variant="A">
  <div class="variant-label">A — with tags</div>
  <div class="variant-desc">Tags rechts, partner+stad zichtbaar op xl</div>
  <div class="variant-body">
    <div class="vp" data-vp="xl" style="width:261px">
      <div class="vp-caption">xl ≥1280px · 261px cel</div>
      <!-- 1-line layout: naam · partner · stad · [TAG][TAG] -->
    </div>
    <div class="vp" data-vp="lg" style="width:197px">
      <div class="vp-caption">lg ≥1024px · 197px cel</div>
      <!-- 1-line: naam · [TAG] (partner/stad hidden) -->
    </div>
    <div class="vp" data-vp="base" style="width:134px">
      <div class="vp-caption">base &lt;1024px · 134px cel</div>
      <!-- 2-line: naam / partner (no tags) -->
    </div>
  </div>
</div>
```

CSS to add to the grid template `<style>` block:

```css
.vp { border:1px dashed #cbd5e0; padding:8px; margin-bottom:8px; }
.vp-caption { font-size:11px; color:#64748b; margin-bottom:4px; font-family:ui-monospace,monospace; }
```

## Anti-patterns

- ❌ **Same card layout at three widths** just to demonstrate ellipsis truncation. Truncation is automatic and obvious — three copies teach nothing.
- ❌ **`@media` queries inside the mockup** that depend on browser width. The whole point of side-by-side sub-sections is comparing all breakpoints at once; media queries make sub-sections behave like the user's actual viewport, defeating the comparison.
- ❌ **Skipping `vp-caption`**. Without captions the user can't reference sub-sections precisely.
- ❌ **Mixing scopes**: do not put one breakpoint per variant (`A=xl, B=lg, C=base`). That conflates design alternative with breakpoint and makes critique ambiguous.

## Breakpoints reference

Generic Tailwind only. Project-specific cell widths are not listed here intentionally.

| Prefix | Min-width | Typical |
|--------|-----------|---------|
| `sm`   | 640px     | large phone |
| `md`   | 768px     | tablet |
| `lg`   | 1024px    | small laptop |
| `xl`   | 1280px    | desktop |
| `2xl`  | 1536px    | wide |

## Project-specific breakpoint choices

Search the project repo before inventing widths. Path conventions vary — do not assume `docs/breakpoints.md` exists.

Probe in this order:

1. Grep `CLAUDE.md` and `README*` for "breakpoint" / "viewport".
2. `find . -iname '*breakpoint*' -o -iname '*viewport*'` (could be under `docs/`, `docs/design/`, `frontend/`, root, etc.).
3. Check the Tailwind config for `theme.extend.screens` overrides.
4. Look at existing CSS for `@media` queries to infer chosen breakpoints.

If nothing is found, **ask the user** which widths to mock — do not invent.
