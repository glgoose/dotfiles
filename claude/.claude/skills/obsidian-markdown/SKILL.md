---
name: obsidian-markdown
description: Create and edit Obsidian Flavored Markdown notes in the user's vault at ~/Documents/obsidian/wiki/. Use when the user wants to save notes, create vault entries, or write Obsidian-formatted content. Handles wikilinks, frontmatter properties, callouts, and embeds.
---

# Obsidian Markdown

Write notes directly to the vault at `~/Documents/obsidian/wiki/` using the Write or Edit tools.

## Frontmatter (always include)

```yaml
---
tags: [tag1, tag2]
source: "[[Source Note]]"
author: Author Name
year: 2024
---
```

## Key syntax

**Wikilinks** — always use for vault-internal links:
- `[[Note Name]]` basic link
- `[[Note Name|Display Text]]` custom label
- `[[Note Name#Heading]]` link to section

**Embeds** — prefix wikilink with `!`:
- `![[Note Name]]` embed full note
- `![[image.png|300]]` embed image with width

**Callouts:**
```
> [!note] Optional title
> Content here
```
Types: `note`, `tip`, `warning`, `info`, `example`, `quote`, `bug`, `danger`, `success`

**Tags:** `#nested/tag` inline

**Comments (hidden):** `%%hidden text%%`

**Highlights:** `==highlighted==`

## Vault structure

- `KUL/` — philosophy seminar notes
- Root — general notes

## Workflow

1. Determine the right folder (KUL/ for seminar content)
2. Use descriptive filename: `Author - Topic.md` — lowercase all words except proper nouns and acronyms (e.g. `PaaS platforms.md`, not `PaaS Platforms.md`)
3. Write frontmatter first
4. Use wikilinks for any referenced notes/authors/concepts
5. Use standard Markdown links only for external URLs
