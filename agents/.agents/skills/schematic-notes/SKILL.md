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
| `≠`    | negation of definitional `=` ("is not / not by"); pairs w/ `=` for "not X but Y" contrasts. **always `≠`, never `/=`** |
| `<>`   | contrasts with; in comparison to |
| `→`    | inference, leads to, implies. **always `→`, never `->`** |
| `:`    | explanation (non-definitional) |

**`≠` + `=` pairing**: when source says "not X but Y" definitionally, write `≠ X = Y` on one line. preserves the contrast as a single node ¬ 2 bullets.
- ex. `membership ≠ by shared attribute = by common orientation toward practico-inert`
- vs. flat ¬: `¬ shared attribute, but by common orientation` (reads as prose w/ negation, loses the definitional contrast structure)

**`≠` after `=` — keep negation in same register**: when a bullet's main verb is `=` (definition / "is"), additional negative claims about the same subject use `≠`, ¬ `¬`. mixing `=` w/ prose-`¬` shifts register mid-claim; `≠` keeps the symbolic-claim structure intact.
- bad: `group = individuals + relations, ¬ separate entity`
- good: `group = individuals + relations ≠ separate entity`
- diagnostic: bullet asserts `X = Y` & tacks on "is not Z" about the same subject? → `≠`, ¬ `, ¬`. reserve `¬` for negating verbs / adjectives inside prose-form bullets (`does ¬ constitute`, `¬ contingent`)

**`→` vs `:` after bold label**:

- `→` = inferential consequence. label IS the premise, gloss IS a downstream claim. asymmetric + directional.
- `:` = definition / explanation. label NAMES what the gloss spells out, OR gloss is the upstream cause/ground/mode of the label. symmetric or backward-direction.

**swap test** (the diagnostic): try swapping label ↔ gloss.
- both directions read fine (label & gloss are equivalents)? → `:`
- only one direction reads (gloss is downstream of label)? → `→`

examples:
- good (inferential): `- **membership ≠ identity** → being in the series does ¬ constitute who one is`
  - swap fails — the ≠-claim is the downstream conclusion of the non-constitution claim, not vice-versa. asymmetric → `→`
- good (definitional): `- **pilots**: real-team test before abstraction`
  - swap passes — "real-team test before abstraction = pilots". symmetric → `:`
- good (explanatory / upstream): `- **mutable**: agentic enactment opens space for transformation`
  - gloss is the *ground* of mutability (cause), ¬ a downstream consequence. backward direction → `:`

anti-patterns (mistakes that look right):
- bad: `- **rule-function** → enable + govern epistemic practice`
  - swap passes: "enable + govern" = "rule-function". label NAMES the function, gloss spells out what it is → `:`
- bad: `- **individualism** → TI happens via conventions ≠ biased minds`
  - label = name of the limitation, gloss = content of the limitation. swap passes → `:`
- bad: `- **testimonial injustice (TI)** → hearer ¬ give proper credibility via prejudice`
  - label = technical-term name, gloss = its definition. swap passes → `:`

**numbered-list trap**: in `1. **foo** ... 2. **bar** ... 3. **baz** ...` patterns it is tempting to use `→` uniformly for visual rhythm. do ¬ default — run swap test per bullet. when labels are names for the enumerated items (most cases) → `:`.

**problems as claims, ¬ questions**: philosophical problems = claims to assert, ¬ interrogatives. use `≠`, `=`, `→` to state directly.
- bad: `is individual identity an aggregate of gender, race, class identities?`
- good: `individual identity ≠ aggregate of gender, race, class identities`
- diagnostic: can the question be rewritten as a `≠` or `=` claim? → do that instead

**`¬` preserves surrounding verb morphology**: `¬` substitutes the word "not", does ¬ license dropping auxiliaries / be-verbs around it. keeps bullets grammatical & readable.
- good: `does ¬ constitute`, `are ¬ targeted`, `can ¬ alter`
- bad: `¬ constitute`, `¬ targeted`, `¬ alter` (reads as broken English, ¬ schematic)
- exception: when `¬` modifies a noun phrase / adjective directly, no auxiliary needed: `¬ contingent psychology`, `¬ 1-way deposit`

### Formatting
- short bullets; break long content into sub-bullets
- **sub-bullet indentation — fixed per parent, never mixed**: every child uses the SAME leading-space count under one parent. mixing 3 & 4 spaces in one list breaks the nesting.
  - child of a bullet (`- `) → **2 spaces**
  - child of a numbered item (`1. `) → **4 spaces** (¬ 3 — 3 is the bare CommonMark minimum & aligns ambiguously w/ the marker; 4 is the safe Obsidian depth)
  - each further level adds the same step again (bullet-under-bullet: 2, 4, 6, ...)
  - bad (mixed under `1. `):
    ```
    1. **framework**: ...
        - hinges = ...      (4 spaces)
       - reps (Part I): ... (3 spaces — breaks the list)
    ```
  - good (uniform 4 under `1. `):
    ```
    1. **framework**: ...
        - hinges = ...
        - reps (Part I): ...
    ```
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
- **web/multi-source research refs (non-Zotero)**: notes assembled from web searches or multi-source digests (`lite-research`, `deep-research` output landing in the vault) use Obsidian-native footnotes, ¬ bracket tags
  - inline: `[^1]`, `[^2]` (chain multiple: `[^1][^3]`)
  - definition, one per line under `## References`: `[^1]: **Title** — Author/Org, year. <URL>. Provenance: [...]. Retrieved YYYY-MM-DD.`
  - reason: `[^n]` is clickable in Obsidian (hover preview + jump-back) ≠ bracket tags like `[S1]`, which render as inert plain text
  - `[Sn]`-style bracket tags are a valid *intermediate* format between a subagent digest & the lead's synthesis step, but convert to `[^n]` before the note is written to the vault
- code & frameworks: include a minimal code block that illustrates the core principle — not a full tutorial, just the smallest snippet that makes the concept click

### Hierarchy & density

Schematic style rewards single-mention + structural meaning. Flat + repeated = noise. Common over-writes to avoid:

- **collapse header + qualifier into one line** when the qualifier is definitional
  - bad: `subordination → requires authority` / `authority = crucial felicity condition` (2 bullets)
  - good: `subordination → requires authority (crucial felicity condition)`

- **chain inferential bullets with `→`** instead of stacking parallel bullets
  - bad: `q1: does pornography subordinate?` / `depends on q2: do pornographers have authority?`
  - good: `q1: does pornography subordinate? → depends on q2: do pornographers have authority?`

- **break long `→` lines into sub-bullet** when post-`→` content has its own internal structure or pushes the line past scannability. inferential link is loose enough that nesting alone conveys it. counterweight to the chaining rule above: chain when consequent is short, break when it carries its own structure
  - diagnostic 1 (structural): post-`→` content has own `=` / list / enumeration shape (e.g. `X = a + b + c`, `2 axes: ...`) → it can stand as its own bullet → break
  - diagnostic 2 (length backstop): even w/o internal structure, if line exceeds ~120 chars → break
  - bad: `- journal *Extropy* (1988-) → canonical topic set = AI + nanotech + genetic eng + life extension + uploading + robotics + space settlement [S7]`
  - good:
    ```
    - journal *Extropy* (1988-)
      - canonical topic set = AI + nanotech + genetic eng + life extension + uploading + robotics + space settlement [S7]
    ```
  - **¬ apply when consequent is short** (`X → Y`): chaining still wins. rule fires only when RHS earns its own line

- **nest sub-lists for parallel attributes**, do ¬ flatten siblings
  - bad: `speech acts = illocutions that rank women` / `legitimate violence` / `→ subordinate` (3 flat siblings)
  - good: parent `speech acts:` → children `rank women` / `legitimate violence`

- **drop redundant conclusion bullets**: if header asserts the conclusion, the body should ¬ repeat it
  - bad: header `subordination → requires X` + trailing bullet `→ subordinate`

- **¬ meta-commentary on importance — bold the words in place**: bullets that gloss *what* is load-bearing / key / important / the crucial part = register switch from content to commentary. the bolding already marks it; the meta-bullet just narrates the formatting.
  - bad:
    ```
    - "...but practico-inert necessities that condition their lives..."
    - post-but is the load-bearing positive characterization
      - **practico-inert necessities** → structural mode
    ```
  - good: bold the load-bearing phrase inside the quote, drop the meta-bullet, sub-bullets unpack the bolded components directly
    ```
    - "...but **practico-inert necessities that condition their lives**..."
      - **practico-inert necessities** → structural mode
    ```
  - diagnostic: is the bullet *about* the note's structure rather than *part of* the note's content? → cut. trust the formatting.
  - applies to: "key claim", "load-bearing", "the important part is X", "note that Y", "the crucial move is Z" — anything that points at content instead of being content

- **inline parenthetical refs** when the ref qualifies a specific claim; standalone "see" bullets read like footnotes & break flow
  - bad: separate bullet `- see [[note#section]]`
  - good: `- if X → Y (see [[note#section]])`

- **integrate inline, do ¬ append**: when adding new source/commentary to an existing note, drop it as sub-bullets next to the points it reinforces. do ¬ tail-append a `## reading in X` H2 — orphan sections lose the cross-talk that makes the integration valuable
  - bad: new `## Young on Spelman` section at end with all Young quotes underneath
  - good: Young's "absurdity test" → sub-bullet under the existing tootsie-roll quote it echoes; Young's "social constructs" gloss → sub-bullet under the existing "ideologically charged" line
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
  - or collapse into one-line node w/ `→` / `=` doing the work
    - good: `- **pilots** → start w/ real product team, extract after (inverse of build-first)`
  - **¬ trailing `:` after bold label when sub-bullets follow**: redundant; nesting already signals "these elaborate the parent". `:` earns its place only when:
    - introducing an enumerable count + numbered list: `3 features:` then `1. ... 2. ... 3. ...`
    - inline non-definitional gloss on same line: `pilots: real-team test before abstraction`

- **enumerable count → always `:` + numbered list**: whenever a parent bullet flags an explicit count (`2 reasons`, `3 axes`, `4 ways`, `5 stages`), it MUST end in `:` and children MUST be numbered `1.` / `2.` / ..., ¬ `-` bullets. the count promises an ordered enumeration; bullets break the promise.
  - bad:
    ```
    - **feminist groups necessarily partial** → 2 reasons (737)
      - **multi-affinity** → ...
      - **objective-scope** → ...
    ```
  - good:
    ```
    - **feminist groups necessarily partial** → 2 reasons: (737)
      1. **multi-affinity** → ...
      2. **objective-scope** → ...
    ```
  - applies even when the children are nested under other sub-bullets — the `:` + numbering survives the nesting depth
  - non-enumerated supporting material (quotes, cross-refs) can sit as bare `-` bullets *between* the count-parent and the numbered list, or under the numbered items themselves
  - **¬ semicolons inside bullets**: `;` chains 2 clauses into prose. split into sub-bullets or use `→` if inferential
  - **¬ period-chained sentences inside bullets**: 1 bullet = 1 claim. multi-sentence = multi-bullet
  - **¬ terminal periods on fragment bullets**: 1 bullet = 1 fragment ¬ sentence → no trailing `.`
    - bad: `- tokens = subatomic particles beneath atoms.`
    - good: `- tokens = subatomic particles beneath atoms`
    - **exception**: direct quotes preserve original punctuation (incl. terminal `.`, `?`, `!`, internal `;`)
      - good: `- "imagination is bad at edge cases; the running thing exposes them"`
      - good: `- Frost: "design systems are an umbrella that a whole lot of things live under."`
    - sentences (¬ fragments) inside bullets are themselves already discouraged by the period-chained rule above; the terminal-period rule applies to the fragment style schematic notes default to

- **benefit-claim bullets — verb-led, recipient-side subject**: when a bullet names what one position gives to another, label = recipient's active verb-phrase, ¬ donor's noun-resource. naming the resource leaves the recipient's gain invisible
  - bad: `- **rich pragmatic-factors literature**` (names what donor has)
  - good: `- **learn from pragmatic-factors literature**` (names what recipient does)
  - bad: `- **creative treatments of relativism**`
  - good: `- **borrow creative treatments of relativism**`
  - diagnostic: can you read the label as "[recipient] [verb] [resource]"? if label is bare noun → recipient's action invisible → rename w/ verb (offer / learn from / borrow / inherit / adopt)
  - applies wherever lists enumerate gains, affordances, payoffs, or contributions from one side to another

- **position contrast folds into main w/ `→`**: when a bullet introduces a position against an existing one, fold the contrast inline after main bullet w/ `→ ¬ X`, ¬ as separate "corrects Y's narrow focus" sub-bullet. keeps contrast at the level the move is named + saves a bullet
  - bad:
    ```
    - **broaden justification**
      - corrects HE's narrow defense-against-skepticism focus
    ```
  - good: `- **broaden justification** → ¬ just defense against skepticism`
  - related to "collapse header + qualifier" rule but distinct move: contrast is *what the position negates*, ¬ a definitional qualifier
  - diagnostic: is the sub-bullet of the form "corrects X" / "≠ Y" / "improves on Z"? → fold w/ `→ ¬ ...` into parent

- **source-quote anchoring — end of item, ¬ middle**: anchor quotes that license a substantive item belong at the *end* after the cash-out, ¬ between the main bullet and the gains-list. reading order should be claim → cash-out → source. burying gains behind source-scaffold forces reader through citation before substance
  - bad: `main → "Ashton 2019, p. 160: 'HE could learn much from FE'" → gains list`
  - good: `main → gains list → "Ashton 2019, p. 160: 'HE could learn much from FE'"`
  - applies to longer source-quotes that justify the bullet's premise; short inline parenthetical refs (`(Ashton 2019, 160)`) follow the existing "inline parenthetical refs" rule + go where the claim sits

- **disanalogy/contrast enumerations — both poles in every bullet**: when enumerating N ways `X ≠ Y` (disanalogies, distinctions, asymmetries), each bullet should make BOTH `X` and `Y` visible w/ `<>`. don't lean on the section header to carry the contrast — bullets read in isolation, asymmetric framing forces the reader to reconstruct the missing pole from memory
  - bad: `**no harm**: FHs aim at equality, ¬ harmful to other knowers` (X-side dropped after header introduces "FHs ≠ Fricker")
  - good: `**no harm**: credibility excess harms privileged knowers (over-credited) <> FHs ¬ harm any knowers = aim at equality`
  - diagnostic: read the bullet alone, w/o the header. does it state what is being contrasted against what? if only one pole appears → restate w/ `<>`
  - uniform `<>` structure across the enumeration also signals "disanalogy list" shape at a glance
  - applies to: dedicated `X ≠ Y` sections, disanalogy lists, "differences between A and B" enumerations, asymmetry catalogs

- **anticipated-misread framing — `≠ X-in-reverse = [positive]`**: when a position contrasts with another stance that readers might mistake it for the *mirror image* of, name the misread explicitly *before* stating the positive position. forecloses the wrong reading; stating only the positive content leaves the reader to wonder if the position is just an inversion
  - ex. `**no inflation**: FHs ≠ credibility-excess-in-reverse = aim at deserved credit (¬ over-credit marginalized)`
  - rationale: pairs w/ the `≠ X = Y` schema but uses the *anticipated-misread name* as the X, not the strictly opposed stance
  - applies when the contrast partner has a clean inverted shape (Fricker's credibility excess ↔ inverted-Fricker w/ marginalized recipient). not all contrasts have this mirror-image risk; only invoke when the misread is plausible

- **straight ASCII quotes only — never curly**: author all quote marks as straight `'` & `"`, never curly `‘ ’ “ ”`. applies *even inside verbatim quotations*: when transcribing a source that prints curly quotes, normalize them to straight in the note
  - reason: these notes feed pandoc → pandoc's smart-quotes renders the correct typographic style per output `lang` & CSL at build time. hard-coding curly marks in source pre-empts that & yields wrong styles for other languages
  - bad: `"propositions – like ‘This is my hand’ … have a normative function"`
  - good: `"propositions – like 'This is my hand' … have a normative function"`
  - scope: only the quote *marks* normalize; the quoted *words* + internal punctuation stay verbatim
  - apostrophes too: `Coliva's`, ¬ `Coliva’s`

## Lint before saving

Before every Write or Edit on a file under `~/Documents/obsidian/wiki/`, run the grep checklist below on the target file and resolve hits. Some hits are false positives (most notably `;` inside a direct quote, which is allowed) — review, do ¬ blindly delete.

Forbidden patterns, in priority order:

1. `;` chaining clauses inside a bullet → split sub-bullets, or `→` when post-`;` clause = consequence of pre-`;` clause
2. `→` at start of a bullet (`- → X`) → redundant w/ nesting; fold inline into parent
3. `> ` blockquote marker inside a list item (`  - > "quote"`) → renders as literal `>`; use plain quoted text instead
4. terminal `.` on a fragment bullet (exception = direct quotes)
5. period-chained sentences inside one bullet → 1 bullet = 1 claim, split into multi-bullet
6. em-dashes (`—`) in prose anywhere → use `,` `:` `(...)` or restructure (user's global preference + AI-text tell)
7. legacy `/=` or `->` ASCII forms → replace w/ `≠` / `→`
8. prose-paragraph opener (first non-blank line after the frontmatter, skipping an optional `# Title`, is plain prose ¬ a structural markdown element) → use any of: `= ...` def line, bullet, numbered list, callout, blockquote, table, code, embed. Most common = `= ...` or `- **term** = ...`. exemptions: MOC notes (`*— MOC.md`), user's own prose work (frontmatter `author: Glenn Goossens`)
9. odd-space bullet indent (1/3/5/7 leading spaces before `-`/`*`/`+`) → indents are always even: 2 per bullet level, 4 under a numbered item. odd = the "align-to-`1. `-marker" mistake → bump to 4
10. curly quotes (`‘ ’ “ ”`) anywhere, incl. inside verbatim quotations → normalize to straight `'` / `"` (pandoc smart-quotes restyles per `lang`/CSL at build)
11. `[Sn]`-style bracket citation tags (`[S1]`, `[S2]`, ...) in a freshly-written note → convert to Obsidian footnotes (`[^n]` inline, `[^n]: ...` under References) per the web/multi-source refs rule above; `[Sn]` is only valid as a subagent-to-lead handoff format before the note is written

Lint grep (run on the file you're about to save):

```bash
grep -nE '(^[[:space:]]*-[[:space:]]*→|^[[:space:]]*-[[:space:]]*>[[:space:]]|; |—| - .*\.$|/=|->|[‘’“”]|\[S[0-9]+\])' "$NOTE_PATH"
```

Odd-indent check (flags 1/3/5/7-space bullet indentation — never valid in the 2/4 scheme):

```bash
grep -nE '^( )( {2})*[-*+] ' "$NOTE_PATH"
```

Prose-paragraph opener check (skips MOCs + user's own prose work):

```bash
case "$NOTE_PATH" in
  *"— MOC.md") ;;
  *)
    # skip if frontmatter declares user as author (= own prose work, ¬ source note)
    if awk 'BEGIN{fm=0} /^---$/{fm++; next} fm==1 && /^author:[[:space:]]*Glenn Goossens/{found=1; exit} fm>=2{exit} END{exit !found}' "$NOTE_PATH"; then
      : # own prose, skip
    else
      awk '
        /^---$/ { fm++; next }
        fm < 2  { next }            # still inside frontmatter
        NF==0   { next }
        /^# /   { next }            # optional title heading — skip, keep scanning
        {
          # accept any structural markdown element: = def line, bullet, numbered, callout/blockquote, table, embed, code block
          if ($0 ~ /^[-*+>|=]/ || $0 ~ /^≠/ || $0 ~ /^[0-9]+\./ || $0 ~ /^!\[\[/ || $0 ~ /^```/) { exit }
          print FILENAME":"NR": prose-paragraph opener — use =def/bullet/callout/table/code/embed instead"
          exit
        }
      ' "$NOTE_PATH"
    fi
    ;;
esac
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

**Title is usually redundant — default to no H1.** Obsidian already renders the filename as the note's title, so a `# <filename>` H1 just repeats it (title shows twice). Open directly with the definition.

- **default: omit the H1** → first line after the frontmatter = the definition (`= ...` or `- **term** = ...`)
- **keep an H1 only when it adds information the filename lacks**: an expansion / contrast (`# en-soi <> pour-soi → being-in-itself <> being-for-itself`), an acronym mapping, or disambiguation
- if an H1 *is* kept: **no blank line** between closing `---` and `# Title`, else Obsidian renders a visible gap between properties and title

```
---
source: "[[Caws2014]]"
---
= "contingent assembly of unrelated subjects united only by a common object"
```

title-kept (only because it adds the contrast the filename lacks):

```
---
source: "[[Engels2018]]"
---
# en-soi <> pour-soi → being-in-itself <> being-for-itself

- **en-soi** = being-in-itself
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
- good: open with the concept (1-line def or punchline tldr) → motivating problem / dilemma → concept unfolded → short methodological coda nested under the concept as a final `## ...` (method)
- reason: reader hits substance first
  - framing earns its place only as footnote to the concept it licenses, not as the gateway
  - if the methodology is the substantive contribution of the source (rare), it IS the key claim and leads — but most papers introduce a concept and frame it; the concept leads
- shape coda short: drop genealogy, polemical context, theoretical genre debates unless they bear directly on how the concept is used

### Opener form: structured, ¬ prose paragraph

First, **no redundant H1** — default to none (see Frontmatter above); the definition is the opener.

First non-blank line after the frontmatter (or after `# Title` if a title is present) MUST be a structural markdown element — ¬ a plain prose paragraph w/ period-chained sentences. The right shape depends on the content; what matters is that the reader can scan the opener instead of parsing prose.

Acceptable openers:
- bare definitional line `= ...` / `≠ ...` — preferred for definitional notes w/ no H1; multi-line `=`-stacks fine for layered defs (as in `practico-inert.md`)
- bullet (`-`, `*`, `+`) — esp. `- **term** = ...` for definitional notes
- numbered list (`1.`)
- callout (`> [!note]`) or blockquote (`>`)
- table (`|`)
- code block (` ``` `)
- embed (`![[...]]`)

Not acceptable: a prose paragraph that bundles metadata + definition + mechanism + quote into period-chained sentences.

Common shape for source/concept notes (use as default; deviate when content earns it):

```
---
source: "<url-or-citekey>"
author: <author>
year: <year>
month: <month>     # optional
---
- **<term>** = <1-line definition w/ jargon expanded on 1st use> [S1]
  1. <mechanism step>
  2. <mechanism step>
- <1 non-frontmatterable meta fact> [S?]
- <Author>: "<canonical quote>" + <positioning gloss> [S?]
```

(no `# <title>` line — add one only when it adds info the filename lacks)

Layers are optional & adapt to content:
- mechanism sub-bullets only when mechanism IS part of the definition (recipe-concepts like `autoresearch`). Skip for pure-concept terms (`facticity`)
- meta-fact bullet only for facts that ¬ fit frontmatter slots (substrate, scale, lineage)
- quote bullet only for canonical positioning quotes that fix the term's meaning; ¬ for every quote in the note
- expand jargon parenthetically on 1st use even in compressed opener: `` `val_bpb` (validation bits-per-byte) ``

Push to frontmatter (¬ opener body): date, author, repo URL, year, version.

**bad** (Wikipedia-lede, period-chained, bundles date + author + mechanism + quote into prose):
```
# Karpathy - autoresearch

autoresearch = March 2026 GitHub repo + concept from Andrej Karpathy. an LLM agent edits a single training file, trains 5 min on 1 GPU, keeps the run if `val_bpb` improves, iterates overnight [S1]. Karpathy calls it "the final boss battle" every frontier lab will run [S2].
```

**good** (bulleted, scannable):
```yaml
---
source: "https://github.com/karpathy/autoresearch"
author: Andrej Karpathy
year: 2026
month: March
---
- **autoresearch** = overnight self-improving LLM training loop on `val_bpb` (validation bits-per-byte) [S1]
  1. agent edits `train.py`
  2. train 5min on 1GPU
  3. eval `val_bpb`, keep if ↑ else revert
  4. loop
- ~630-line Python on nanochat substrate ≠ toy benchmark [S1][S4]
- Karpathy: "final boss battle" every frontier lab will run [S2]
```

Exemptions (rule does ¬ apply):
- MOC notes — filename matches `*— MOC.md`
- user's own prose work (reflection reports, seminar papers, thesis chapters, essays) — detected via frontmatter `author: Glenn Goossens`

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
