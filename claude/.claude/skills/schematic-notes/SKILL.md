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
- paper refs: Zotero citekey, pandoc style — `[@Ranalli2020, p. 4977]`
- code & frameworks: include a minimal code block that illustrates the core principle — not a full tutorial, just the smallest snippet that makes the concept click

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
- filename: `Author - Topic.md` or `Author - Year - Title.md`

## Workflow
1. determine right folder (KUL/ for seminar content)
2. write frontmatter
3. write schematic content with symbols & wikilinks throughout
4. save with Write tool
