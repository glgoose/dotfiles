# Snippet preview — canonical opt-in code panel

Companion doc to `SKILL.md` step 4c. Read this when a mockup includes a collapsible code panel per variant — used for port-to-real-component workflows (React, Flask templates, Swift, etc.).

## Canonical block

Append to each variant card after `.tune-panel` if present, else after `.variant-body`.

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

## What goes in `{{ESCAPED_HTML}}`

The variant body's HTML + any per-variant `<style>` block, HTML-escaped. Strip everything that's not portable:

**Include:**
- The actual rendered markup (button, card, modal — whatever the variant is).
- Per-variant `<style>` block if present (the variant's own typography / color / motion declarations).
- Tailwind utility classes inline on elements (those port directly to React/JSX with `className=`).

**Strip:**
- `.variant-card` wrapper and its CSS.
- `data-variant` attribute.
- `.variant-label` and `.variant-desc` and `.variant-tradeoff` (comparison chrome — not part of the design).
- `.tune-panel` block in its entirety (mockup-only knobs — slider values get baked in via `## Tuned values` in the handoff).
- `<script src="...tailwindcss.com">` — port target has its own Tailwind setup.
- Mockup-only Alpine `x-data` unless the real component genuinely uses Alpine.

## Escaping rule

Replace `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`. Leave whitespace (indentation, newlines) untouched — readability of the pre/code matters for the port.

No syntax-highlighting JS. Plain `<pre><code>` keeps the dependency surface zero. If the user wants highlighting, that's a separate skill.

## Worked example

Source variant body (hover animation, before escaping):
```html
<style>
  .btn-b { background: #1e293b; color: #fff; padding: 0.6rem 1.4rem; border-radius: 8px; transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms; }
  .btn-b:hover { transform: scale(1.04); box-shadow: 0 6px 14px rgba(0,0,0,0.18); }
</style>
<button class="btn-b">Confirm</button>
```

What goes into `{{ESCAPED_HTML}}`:
```
&lt;style&gt;
  .btn-b { background: #1e293b; color: #fff; padding: 0.6rem 1.4rem; border-radius: 8px; transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms; }
  .btn-b:hover { transform: scale(1.04); box-shadow: 0 6px 14px rgba(0,0,0,0.18); }
&lt;/style&gt;
&lt;button class="btn-b"&gt;Confirm&lt;/button&gt;
```

Renders as a copy-pasteable code block. Click "copy snippet" → clipboard gets the unescaped source (the browser unescapes the `textContent` on read).

## Anti-patterns

- ❌ **Include the `.tune-panel` in the snippet.** That's mockup-only chrome. Port target doesn't have sliders.
- ❌ **Include the Tailwind CDN script.** Real components import Tailwind via their build chain.
- ❌ **`<details>` open by default.** Three open panels in a 3-variant grid drowns the visual comparison.
- ❌ **Auto-add a syntax-highlighter library.** Adds a dependency for marginal value; keep `<pre><code>` plain.
- ❌ **Include `.variant-card` wrapper.** Mockup chrome, not design.
