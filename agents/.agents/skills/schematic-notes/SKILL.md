---
name: schematic-notes
description: Write philosophy notes to the Obsidian vault in the user's schematic style (symbols, lowercase bullets, wikilinks, citekeys). Default skill for all vault note creation — use whenever the user asks to write, save, or create any note in Obsidian, even without the word "schematic".
---

# Schematic Notes

Write notes to the Obsidian vault at `~/Documents/obsidian/wiki/` using the Write tool.

## Style

### Case
- **titles (H1/H2/H3 headings & filenames)**: lowercase, except abbreviations (CPU, API, DB, CRM, LLM, etc.) and proper nouns
- bullets, table cells, numbered list items: lowercase first letter
- keep uppercase: proper nouns, logical variables (A, B, *p*), italic named positions (*moderate*, *radical*)
- **acronym-introducing headings**: when a heading introduces an acronym in parens, capitalize the source words so the letter mapping is visible
  - good: `## Feminist Hinge Epistemology (FHE)`
  - bad: `## feminist hinge epistemology (FHE)` (reader can ¬ see F/H/E mapping)
  - applies only on first introduction; later mentions of `FHE` in body stay lowercase context as normal

### Symbols — use instead of words

| symbol | meaning |
| ------ | ------- |
| `&`    | and |
| `\|`   | or |
| `¬`    | not |
| `=`    | definition or "is" (definitional) |
| `->`   | inference, leads to, implies |
| `:`    | explanation (non-definitional) |

### Formatting
- short bullets; break long content into sub-bullets
- numerals not words: 3 not "three"
- examples: prefix with `ex.`
- examples reinforce the label: when a bullet defines/names a concept, restate the label phrase (or its key verb) in examples where relevant, and **bold** the repeated form to make the link visible
  - ex. under bullet "**best explanation**": "invitation **best explains** arrival at party", not "invitation explains arrival at party"
  - ex. under bullet "**necessary condition**": "oxygen is **necessary** for fire", not "no fire without oxygen"
  - skip when forced repetition would feel awkward or the example is already self-evident
- paper refs: Zotero citekey, pandoc style: `[@Ranalli2020, p. 4977]`
  - **single-source notes** (file is `<citekey>.md` and content is summary of that one source): bare page numbers `(201)` are sufficient. context (filename + frontmatter) makes referent unambiguous, full citekey on every quote = redundant
  - use full `[@citekey, p. X]` only when citing *other* sources within a single-source note, or in cross-source notes where referent could be ambiguous
- **classical-text abbreviations**: canonical philosophical works use standard abbreviations w/ edition-independent section/marginal numbering. preferred over citekey form for these works since `§25` resolves across editions where `p. 25` does ¬
  - common: `OC` (On Certainty), `PI` (Philosophical Investigations), `TLP` (Tractatus), `CPR` (Critique of Pure Reason, w/ A/B pagination: `CPR A51/B75`), `SZ` (Sein und Zeit, marginal nums: `SZ 42`), `BT` (Being and Time, English SZ), `BGE` (Beyond Good and Evil), `GM` (On the Genealogy of Morals), `EN` (Nicomachean Ethics, Bekker: `EN 1094a1`)
  - inline form: `(OC §25)`, `(CPR A51/B75)`, `(SZ 42)`
  - declare on first use in a cross-source note: `Wittgenstein's *On Certainty* (OC) ...` or via frontmatter `abbreviations: {OC: "On Certainty"}`
  - **single-source notes** on canonical works: bare `§25` sufficient (same logic as bare page numbers)
  - mix freely w/ citekeys when note cites both canonical work & secondary lit: `(OC §25)` for primary, `[@Moyal-Sharrock2005, p. 12]` for commentary
- code & frameworks: include a minimal code block that illustrates the core principle — not a full tutorial, just the smallest snippet that makes the concept click

### Hierarchy & density

Schematic style rewards single-mention + structural meaning. Flat + repeated = noise. Common over-writes to avoid:

- **collapse header + qualifier into one line** when the qualifier is definitional
  - bad: `subordination -> requires authority` / `authority = crucial felicity condition` (2 bullets)
  - good: `subordination -> requires authority (crucial felicity condition)`

- **chain inferential bullets with `->`** instead of stacking parallel bullets
  - bad: `q1: does pornography subordinate?` / `depends on q2: do pornographers have authority?`
  - good: `q1: does pornography subordinate? -> depends on q2: do pornographers have authority?`

- **nest sub-lists for parallel attributes**, do ¬ flatten siblings
  - bad: `speech acts = illocutions that rank women` / `legitimate violence` / `-> subordinate` (3 flat siblings)
  - good: parent `speech acts:` -> children `rank women` / `legitimate violence`

- **drop redundant conclusion bullets**: if header asserts the conclusion, the body should ¬ repeat it
  - bad: header `subordination -> requires X` + trailing bullet `-> subordinate`

- **inline parenthetical refs** when the ref qualifies a specific claim; standalone "see" bullets read like footnotes & break flow
  - bad: separate bullet `- see [[note#section]]`
  - good: `- if X -> Y (see [[note#section]])`

## Note structure

### Frontmatter (always include)
```yaml
---
tags: []
source: "[[Source Note]]"
author: Author Name
year: 2020
---
```

**Tags**: omit or leave empty by default. Only add a tag if it already exists in the vault and is clearly relevant — never invent new tags.

**CRITICAL:** No blank line between closing `---` and the first `# Title` heading. Otherwise Obsidian renders a visible gap between properties and title.

```
---
year: 2013
---
# title here
```

### Wikilinks — use for all vault-internal references
- `[[Note Name]]` — link
- `[[Note Name|Display Text]]` — custom label
- `![[Note Name]]` — embed full note
- `![[Note Name#Heading]]` — embed section
- `![[Note Name#^blockid]]` — embed specific block (e.g. just a table)

To add a block ID to a table or paragraph so it can be embedded elsewhere, append `^blockid` on the line immediately after the last row (no blank line between).

## Vault structure
- root: `~/Documents/obsidian/wiki/`
- `KUL/` — philosophy seminar notes (hinge epistemology, feminist philosophy, philosophical anthropology)
- filename: `<citekey>.md` (e.g., `Ashton2019.md`) — Better BibTeX citekey, matches the inline `[@citekey]` form used throughout notes
  - fall back to `Author - Topic.md` only when no citekey exists (vault-only notes, working drafts)

## Workflow
1. determine right folder (KUL/ for seminar content)
2. resolve filename:
   - if user provided a Zotero PDF path or attachment item key, invoke `zotero-lookup` (path-to-citekey direction) to get the citekey
   - if user gave a citekey directly, use it
   - otherwise fall back to `Author - Topic.md`
3. write frontmatter
4. write schematic content with symbols & wikilinks throughout
5. save with Write tool
