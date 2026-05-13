# Slider panel — canonical widget for tunable variants

Companion doc to `SKILL.md` step 4b. Read this when a mockup includes interactive sliders for continuous tokens. Defines the widget HTML, the prompt format contract, and worked examples per component type.

## Prompt format contract (REQUIRED)

The "Copy as prompt" button MUST emit text matching this exact shape:

```
apply variant <ID> tuned values to the real component:
<token>: <value>
<token>: <value>
...
```

Rules:
- First line is fixed-prefix: `apply variant <ID> tuned values to the real component:`.
- `<ID>` is the single uppercase letter (`A`, `B`, …) matching `data-variant`.
- Each subsequent line is `key: value`, one per slider/toggle, blank-line or end-of-paste terminated.
- Numeric values include units (`220ms`, `8px`, `1.04` for unitless ratios).
- Booleans stringify to readable labels (`spring` / `ease-out`, not `true` / `false`). Each toggle declares its on-label and off-label.

The iteration parser at the top of "On iteration feedback" in SKILL.md depends on this format. If you change the prefix or the `key: value` shape, update the parser too.

## Canonical widget HTML

Drop into each variant card after `.variant-body`. Substitute defaults to match the rendered variant's design choices.

```html
<div class="tune-panel" x-data="{
  duration: 220, scale: 1.04, shadow: 8, spring: true
}">
  <div class="tune-row">
    <label>duration</label>
    <input type="range" min="80" max="600" step="10" x-model.number="duration">
    <span class="tune-val" x-text="duration + 'ms'"></span>
  </div>
  <div class="tune-row">
    <label>scale</label>
    <input type="range" min="1" max="1.2" step="0.01" x-model.number="scale">
    <span class="tune-val" x-text="scale.toFixed(2)"></span>
  </div>
  <div class="tune-row">
    <label>shadow blur</label>
    <input type="range" min="0" max="40" step="1" x-model.number="shadow">
    <span class="tune-val" x-text="shadow + 'px'"></span>
  </div>
  <div class="tune-row tune-toggle">
    <label>spring easing</label>
    <input type="checkbox" x-model="spring">
  </div>

  <div class="tune-actions">
    <button class="copy-prompt" @click="
      navigator.clipboard.writeText(
        `apply variant B tuned values to the real component:\n` +
        `duration: ${duration}ms\n` +
        `scale: ${scale}\n` +
        `shadow: ${shadow}px\n` +
        `easing: ${spring ? 'spring' : 'ease-out'}`
      );
      $event.target.textContent = 'copied ✓';
      setTimeout(() => $event.target.textContent = 'Copy as prompt', 1500);
    ">Copy as prompt</button>
    <button class="reset" @click="duration=220; scale=1.04; shadow=8; spring=true">reset</button>
  </div>
</div>
```

The rendered variant body lives in the same `x-data` scope and binds the values via CSS vars:

```html
<div class="variant-body">
  <button class="real-button"
    :style="`--dur:${duration}ms; --scale:${scale}; --shadow:${shadow}px;`"
    :class="{ 'spring': spring }">
    Confirm
  </button>
</div>
```

Two scoping options work:
1. **Single `x-data` on `.variant-card`** — slider state shared by `.variant-body` and `.tune-panel`. Cleanest when both are in the same card. Move `x-data` up to `.variant-card`.
2. **Wrapper `<div x-data>` enclosing both** — when you don't want to touch the card-level Alpine scope.

Pick (1) for new variants; pick (2) only when retro-fitting onto an existing `x-data`.

## Widget rules

- **Variant ID hard-coded in the clipboard string** — `apply variant B …` — so the parser can route the paste to the right variant without inference. Update both the `x-data` defaults AND this string when copy-pasting the widget across variants.
- **Defaults equal the rendered variant's design values** — slider starts where the variant was designed; reset returns to that exact state.
- **CSS-var binding only on tunable subset** — Tailwind classes for static styling, CSS vars for slider-driven values. One variable layer keeps the variant CSS readable.
- **3–5 controls max** — more is cognitive overload. Drop to the most-impactful tokens.
- **Units in the displayed value AND the copied prompt** — `220ms` in the `<span class="tune-val">` and `220ms` in the clipboard payload. Real components need units.
- **Toggles use human labels in the clipboard** — `easing: spring` / `easing: ease-out`, not `easing: true` / `easing: false`.

## Worked examples by component type

### A. Hover animation (matches Thariq's example)

Tokens: `duration`, `scale`, `shadow`, `easing` (toggle).

```js
x-data="{ duration: 220, scale: 1.04, shadow: 8, spring: true }"
```

CSS in variant:
```css
.real-button { transition: transform var(--dur), box-shadow var(--dur); }
.real-button:hover { transform: scale(var(--scale)); box-shadow: 0 4px var(--shadow) rgba(0,0,0,0.18); }
.real-button.spring { transition-timing-function: cubic-bezier(0.34,1.56,0.64,1); }
```

Copy-as-prompt output:
```
apply variant B tuned values to the real component:
duration: 220ms
scale: 1.04
shadow: 8px
easing: spring
```

### B. Card spacing & radius

Tokens: `padding`, `radius`, `gap`, `border` (toggle: hairline vs solid).

```js
x-data="{ pad: 16, radius: 10, gap: 12, hairline: true }"
```

CSS in variant uses `--pad`, `--radius`, `--gap`. Toggle swaps a class:
```html
<div class="real-card" :class="{ hairline: hairline }"
  :style="`--pad:${pad}px; --radius:${radius}px; --gap:${gap}px;`">
```

Copy-as-prompt output:
```
apply variant C tuned values to the real component:
padding: 16px
radius: 10px
gap: 12px
border: hairline
```

### C. Modal sizing

Tokens: `width`, `padX`, `padY`, `backdrop-blur`.

```js
x-data="{ width: 480, padX: 32, padY: 28, blur: 12 }"
```

Copy-as-prompt output:
```
apply variant A tuned values to the real component:
width: 480px
padX: 32px
padY: 28px
backdrop-blur: 12px
```

## Anti-patterns

- ❌ **Sliders on every variant when variants differ structurally** — icon vs no-icon, modal vs inline. That's a kind difference. Sliders only help on degree differences.
- ❌ **More than 5 controls per variant** — user can't compare 3 variants × 7 knobs.
- ❌ **Booleans serialized as `true`/`false`** in the clipboard — parser handles human labels and real components use human labels.
- ❌ **Missing variant ID in the copy-prompt string** — parser can't route the paste.
- ❌ **Sliders bound directly to element style props** instead of CSS vars — slider state then scatters across child selectors and gets unreadable.
