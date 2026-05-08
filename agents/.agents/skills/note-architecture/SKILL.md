---
name: note-architecture
description: Structural rules for the Obsidian vault — when to split a note, when to embed vs link, MOC policy, filename conventions, note types, linking density, aliases. Use alongside `schematic-notes` (which owns visual style) whenever creating, splitting, or restructuring vault notes. Trigger when deciding "should this be one note or two", "where does this go", "should I create a MOC", or when a research workflow needs to lay down multiple linked notes.
---

# Note Architecture

Sister to `schematic-notes`. That skill owns *style* (symbols, lowercase, citekey format, schematic bullets). This skill owns *structure*: how many notes, where they live, how they connect, what they are named.

Synthesised from kepano (Steph Ango), Andy Matuschak, Sönke Ahrens, Nick Milo (LYT), and the r/ObsidianMD community. Full source notes in `research-digest.md`.

## Vault layout

- **Root** (`~/Documents/obsidian/wiki/`): concept and synthesis notes, lowercase noun-phrase filenames.
- **`KUL/`**: philosophy seminar notes (existing convention; keep).
- **`Projects/`**: project-bound material (existing convention; keep).
- **`Clippings/`, `academic/`**: existing artifact buckets; do not re-purpose.
- **No new topical folders.** Topics live in the link graph, not the folder tree.

## Three note types

Adopt Ahrens's split, mapped to the user's Zotero workflow.

1. **Daily / fleeting** — capture surface, no permanence assumed. Lives wherever daily notes already live.
2. **Literature notes** — one note per Zotero source. Filename: `@Citekey.md` (Better BibTeX, with `@` prefix). Frontmatter: `aliases: ["Human Title"]`, `source: "[[@Citekey]]"`-not-needed-since-self, `author`, `year`. Body summarises the source and quotes load-bearing passages. Single-source notes use bare page numbers `(p. 42)` per `schematic-notes`.
3. **Concept / permanent notes** — one note per idea, drawing across sources. Filename: lowercase short noun phrase, e.g. `real abstraction.md`, `epistemic injustice.md`. Written in your own voice. Cites multiple literature notes by `[[@Citekey]]` and other concept notes by `[[concept name]]`.

Project notes (e.g. thesis-chapter scratch) are transient and do not get the permanent-note treatment.

## When to create a new note (concept-handle test)

Create a new note when **the section earns its own handle** — a name you could plausibly link to from another note. Otherwise, leave it as a section.

Concrete triggers to split:
- The same section keeps getting cited from other notes (the cited section deserves to be its own linkable thing).
- The parent note's title no longer covers what is inside.
- You catch yourself wanting to write `[[parent#section]]` — that section wants to be `[[section]]`.

Do **not** split for hygiene alone. Atomicity is a means; coherence is the end.

## Filenames

- **Source notes**: `@Citekey.md` — Better BibTeX citekey, prefix `@` so they sort and visually segregate from concept notes. Add `aliases: ["Author Year — Short Title"]` for human-readable display.
- **Concept notes**: lowercase noun phrase, no date, no author. Examples: `real abstraction.md`, `hinge epistemology.md`, `epistemic injustice.md`.
- **Working drafts** (no citekey, no canonical concept): `Author - Topic.md` is the schematic-notes fallback. Use only when neither source-bound nor a settled concept.

## Aliases — one canonical note per concept

Each concept gets exactly one canonical note. Synonyms — including original-language terms, common variant spellings, abbreviations — go in `aliases:` frontmatter. Never create a second note for a synonym.

```yaml
---
aliases:
  - Realabstraktion
  - exchange-abstraction
---
# real abstraction
```

Use the alias inline only when the prose specifically calls for that surface form: `[[real abstraction|Realabstraktion]]`.

## Links

- **Primary connective.** Vault structure is the link graph. Folders, tags, and embeds are secondary.
- **Link the first mention** of any concept, work, or person that has (or could plausibly have) its own note. Exactly once per note, unless a later mention makes a *new* claim about the linked thing.
- **Always link to the canonical note**, not a synonym. Use the alias-display form `[[canonical|surface]]` if needed.
- **Unresolved links are fine.** A red `[[concept]]` is a breadcrumb for a future note; it is not a bug.

## Embeds

Default is `[[link]]`. Embeds are for **quotation**, not structure.

- `![[note#section]]` — pull stable quoted text into a reading note (e.g. a primary-text passage into a literature note about it).
- `![[note#^blockid]]` — pull a single citable claim. Add the `^blockid` only on lines that earn citation reuse.
- **Never embed a whole note** unless you genuinely want it inlined in two places.

Embeds break silently when the source is renamed or restructured. Do not use them as the spine of a note.

## MOCs (Maps of Content) — lazy only

Do not pre-author MOCs. Create one only when:
- A topic has accumulated enough notes that backlinks alone do not disclose the structure, **or**
- A project, seminar, or research question needs a deliberate reading order.

When a MOC exists:
- Treat it as **reading order + commentary**, not a taxonomy.
- Filename: `<topic> — MOC.md` or simply `<topic>.md` if the topic note *is* the MOC.
- Allow it to be opinionated: order matters, brief annotations between links are encouraged.

Do not make a MOC for every concept domain. For stable domains (`epistemology`, `value-form theory`), trust the link graph.

## Tags

- Small **controlled vocabulary** only. Reserve for status flags (`#draft`, `#stub`, `#needs-rereading`) or project codes (`#thesis`, `#KUL-seminar-X`).
- **Not for topics.** Topics live in the link graph. A topical tag is a duplicate of a missing link.
- Do not invent new tags during a note write; only reuse tags already present in the vault.

## Frontmatter

Use frontmatter for anything you might want to query later:

```yaml
---
tags: []
aliases: []
source: "[[@Citekey]]"
author: ...
year: ...
status: draft | active | evergreen
---
```

`status` is optional but useful when reviewing the vault. Keep frontmatter properties valid YAML; survives Obsidian replacement (file-over-app).

## Plain-markdown discipline

Bodies of concept and literature notes should use plain markdown plus `[[wikilinks]]` and standard frontmatter. Avoid Obsidian-only syntax (Bases queries, dataview, callouts) inside concept-note bodies. Put queries and dashboards in dedicated `<topic> — dashboard.md` files if needed. The file outlives the app.

## Decision shortcuts

| Situation | Default |
| --------- | ------- |
| New idea, has its own name | new concept note, lowercase noun-phrase filename |
| Summarising a source | literature note, `@Citekey.md` |
| Same idea by another name | alias on the canonical note, no new file |
| Quoting a primary text | `![[@Citekey#section]]` in the literature note |
| Topic with 12+ notes, hard to navigate | author a lazy MOC |
| Concept domain with 6 notes | trust the link graph; no MOC |
| Status of a note (draft, stub) | tag |
| Topic of a note | link, not tag |

## When a workflow uses this skill

`lite-research` and `/deep-research` produce multi-note output. They invoke this skill for the output shape:

- **Main note** = a concept or MOC note, depending on whether the topic has settled into a single concept handle (concept note) or spans multiple notes that need a reading order (MOC).
- **Per-source satellites** = literature notes (`@Citekey.md`) for sources cited in the main note, when the source is read closely enough to be worth a permanent note. Web-only or skim-level sources stay in the main note's References section, not their own files.
- **Light MOC pattern** for research output: main note carries the prose; a "see also" section at the bottom links to the literature-note satellites that exist. Do not auto-create a satellite per source; only when the source is substantive.
