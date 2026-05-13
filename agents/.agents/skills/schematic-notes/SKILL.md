---
name: schematic-notes
description: Write or edit philosophy notes in the Obsidian vault in the user's schematic style (symbols, lowercase bullets, wikilinks, citekeys). Default skill for any vault note work — use whenever the user asks to write, save, create, edit, extend, append-to, or modify any note in Obsidian (`~/Documents/obsidian/wiki/`), even without the word "schematic". Includes a pre-save lint checklist that must run before every Write/Edit.
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
| `/=`   | negation of definitional `=` ("is not / not by"); pairs w/ `=` for "not X but Y" contrasts |
| `->`   | inference, leads to, implies |
| `:`    | explanation (non-definitional) |

**`/=` + `=` pairing**: when source says "not X but Y" definitionally, write `/= X = Y` on one line. preserves the contrast as a single node ¬ 2 bullets.
- ex. `membership /= by shared attribute = by common orientation toward practico-inert`
- vs. flat ¬: `¬ shared attribute, but by common orientation` (reads as prose w/ negation, loses the definitional contrast structure)

**`->` vs `:` after bold label**: when the post-label gloss IS the inferential unfolding / consequence of the label, use `->`. reserve `:` for tangential explanation that does ¬ flow from the label.
- good (unfolding): `- **membership /= identity** -> being in the series does ¬ constitute who one is`
- good (explanation): `- **pilots**: real-team test before abstraction`
- diagnostic: can you read the bullet as "label, therefore gloss"? -> `->`. else `:`.

**`¬` preserves surrounding verb morphology**: `¬` substitutes the word "not", does ¬ license dropping auxiliaries / be-verbs around it. keeps bullets grammatical & readable.
- good: `does ¬ constitute`, `are ¬ targeted`, `can ¬ alter`
- bad: `¬ constitute`, `¬ targeted`, `¬ alter` (reads as broken English, ¬ schematic)
- exception: when `¬` modifies a noun phrase / adjective directly, no auxiliary needed: `¬ contingent psychology`, `¬ 1-way deposit`

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
  - **single-source → multi-source transition**: when an existing single-source note picks up a 2nd source, new material from the 2nd source uses full `[@citekey2, p. X]`; existing bare-page refs `(186)` to source #1 stay as-is — filename + their position in the note still resolve them unambiguously, no need to retro-add citekeys
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

- **¬ meta-commentary on importance — bold the words in place**: bullets that gloss *what* is load-bearing / key / important / the crucial part = register switch from content to commentary. the bolding already marks it; the meta-bullet just narrates the formatting.
  - bad:
    ```
    - "...but practico-inert necessities that condition their lives..."
    - post-but is the load-bearing positive characterization
      - **practico-inert necessities** -> structural mode
    ```
  - good: bold the load-bearing phrase inside the quote, drop the meta-bullet, sub-bullets unpack the bolded components directly
    ```
    - "...but **practico-inert necessities that condition their lives**..."
      - **practico-inert necessities** -> structural mode
    ```
  - diagnostic: is the bullet *about* the note's structure rather than *part of* the note's content? -> cut. trust the formatting.
  - applies to: "key claim", "load-bearing", "the important part is X", "note that Y", "the crucial move is Z" — anything that points at content instead of being content

- **inline parenthetical refs** when the ref qualifies a specific claim; standalone "see" bullets read like footnotes & break flow
  - bad: separate bullet `- see [[note#section]]`
  - good: `- if X -> Y (see [[note#section]])`

- **integrate inline, do ¬ append**: when adding new source/commentary to an existing note, drop it as sub-bullets next to the points it reinforces. do ¬ tail-append a `## reading in X` H2 — orphan sections lose the cross-talk that makes the integration valuable
  - bad: new `## Young on Spelman` section at end with all Young quotes underneath
  - good: Young's "absurdity test" -> sub-bullet under the existing tootsie-roll quote it echoes; Young's "social constructs" gloss -> sub-bullet under the existing "ideologically charged" line
  - top-of-note framing blockquote is fine when the new material's meta-claim does ¬ map to any single existing bullet

- **¬ `**label**. prose. prose.` pattern**: bullets written as bold label + period + running prose sentences = prose w/ a tag, ¬ schematic. punctuation makes it a paragraph, ¬ a node.
  - bad: `**pilots beat top-down rollouts**. start by piloting w/ a real product team; extract & abstract afterward. inverse of the build-system-first model.`
  - good: bold label as parent, supporting claims as bare sub-bullets (no trailing `:`)
    ```
    - **pilots beat top-down rollouts**
      - pilot w/ real product team first
      - extract & abstract after
      - inverse of build-system-first model (fails)
    ```
  - or collapse into one-line node w/ `->` / `=` doing the work
    - good: `- **pilots** -> start w/ real product team, extract after (inverse of build-first)`
  - **¬ trailing `:` after bold label when sub-bullets follow**: redundant; nesting already signals "these elaborate the parent". `:` earns its place only when:
    - introducing an enumerable count + numbered list: `3 features:` then `1. ... 2. ... 3. ...`
    - inline non-definitional gloss on same line: `pilots: real-team test before abstraction`

- **enumerable count -> always `:` + numbered list**: whenever a parent bullet flags an explicit count (`2 reasons`, `3 axes`, `4 ways`, `5 stages`), it MUST end in `:` and children MUST be numbered `1.` / `2.` / ..., ¬ `-` bullets. the count promises an ordered enumeration; bullets break the promise.
  - bad:
    ```
    - **feminist groups necessarily partial** -> 2 reasons (737)
      - **multi-affinity** -> ...
      - **objective-scope** -> ...
    ```
  - good:
    ```
    - **feminist groups necessarily partial** -> 2 reasons: (737)
      1. **multi-affinity** -> ...
      2. **objective-scope** -> ...
    ```
  - applies even when the children are nested under other sub-bullets — the `:` + numbering survives the nesting depth
  - non-enumerated supporting material (quotes, cross-refs) can sit as bare `-` bullets *between* the count-parent and the numbered list, or under the numbered items themselves
  - **¬ semicolons inside bullets**: `;` chains 2 clauses into prose. split into sub-bullets or use `->` if inferential
  - **¬ period-chained sentences inside bullets**: 1 bullet = 1 claim. multi-sentence = multi-bullet
  - **¬ terminal periods on fragment bullets**: 1 bullet = 1 fragment ¬ sentence -> no trailing `.`
    - bad: `- tokens = subatomic particles beneath atoms.`
    - good: `- tokens = subatomic particles beneath atoms`
    - **exception**: direct quotes preserve original punctuation (incl. terminal `.`, `?`, `!`, internal `;`)
      - good: `- "imagination is bad at edge cases; the running thing exposes them"`
      - good: `- Frost: "design systems are an umbrella that a whole lot of things live under."`
    - sentences (¬ fragments) inside bullets are themselves already discouraged by the period-chained rule above; the terminal-period rule applies to the fragment style schematic notes default to

## Lint before saving

Before every Write or Edit on a file under `~/Documents/obsidian/wiki/`, run the grep checklist below on the target file and resolve hits. Some hits are false positives (most notably `;` inside a direct quote, which is allowed) — review, do ¬ blindly delete.

Forbidden patterns, in priority order:

1. `;` chaining clauses inside a bullet -> split sub-bullets, or `->` when post-`;` clause = consequence of pre-`;` clause
2. `->` at start of a bullet (`- -> X`) -> redundant w/ nesting; fold inline into parent
3. `> ` blockquote marker inside a list item (`  - > "quote"`) -> renders as literal `>`; use plain quoted text instead
4. terminal `.` on a fragment bullet (exception = direct quotes)
5. period-chained sentences inside one bullet -> 1 bullet = 1 claim, split into multi-bullet
6. em-dashes (`—`) in prose anywhere -> use `,` `:` `(...)` or restructure (user's global preference + AI-text tell)

Lint grep (run on the file you're about to save):

```bash
grep -nE '(^[[:space:]]*-[[:space:]]*->|^[[:space:]]*-[[:space:]]*>[[:space:]]|; |—| - .*\.$)' "$NOTE_PATH"
```

When extending an existing note, only fix violations in lines you authored this session. Pre-existing legacy violations are out of scope unless user asks for a sweep.

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

### Ordering: concepts first, framing last

Note opens with the key claim or concept the source contributes. Methodological framing (universal vs pragmatic theorizing, theoretical stance debates, genre genealogy, "what kind of theory is this") goes to a short coda at the end, not the top. The coda is nested under the concept it licenses, not given its own top-level H1, unless the framing has independent weight.

- bad: open with author's methodological stance (e.g. `# universal vs pragmatic theorizing`), then unfold the concept
- good: open with the concept (1-line def or punchline tldr) -> motivating problem / dilemma -> concept unfolded -> short methodological coda nested under the concept as a final `## ...` (method)
- reason: reader hits substance first
  - framing earns its place only as footnote to the concept it licenses, not as the gateway
  - if the methodology is the substantive contribution of the source (rare), it IS the key claim and leads — but most papers introduce a concept and frame it; the concept leads
- shape coda short: drop genealogy, polemical context, theoretical genre debates unless they bear directly on how the concept is used

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
