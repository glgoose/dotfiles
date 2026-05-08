# Note Architecture, Research Digest

Research date: 2026-05-08. Use case: KU Leuven research-master vault, continental + Marxist philosophy, Zotero w/ Better BibTeX citekeys.

## Authority profiles

- **Kepano (Steph Ango)**: CEO of Obsidian; pragmatic minimalist who treats files as the primary unit ("file over app") and avoids folders for organization. Sources: [How I use Obsidian](https://stephango.com/vault), [File over app](https://stephango.com/file-over-app).
- **Andy Matuschak**: Researcher at the formalism end of evergreen-notes practice; his public "working notes" site is itself the canonical artifact. Sources: [Evergreen notes should be atomic](https://notes.andymatuschak.org/Evergreen_notes_should_be_atomic), [Evergreen notes should be densely linked](https://notes.andymatuschak.org/Evergreen_notes_should_be_densely_linked).
- **Sönke Ahrens**: Author of *How to Take Smart Notes* (2017), the modern English-language exposition of Luhmann's Zettelkasten. Source: [zettelkasten.de summary](https://zettelkasten.de/posts/concepts-sohnke-ahrens-explained/).
- **Nick Milo**: Founder of Linking Your Thinking (LYT); strong advocate of Maps of Content (MOCs) as active workspaces, not just indexes. Sources: [LYT site](https://www.linkingyourthinking.com/), [Bob Doto, Zettelkasten, LYT, and Nick Milo's search for ground](https://writing.bobdoto.computer/zettelkasten-linking-your-thinking-and-nick-milos-search-for-ground/).
- **r/ObsidianMD + Obsidian Forum**: Community wisdom on contested practical questions. Sources: [Long Notes or Short Notes: 5-Year Reflections](https://forum.obsidian.md/t/long-notes-or-short-notes-my-5-year-reflections/102138), [Debating the usefulness of atomic notes](https://forum.obsidian.md/t/debating-the-usefulness-of-atomic-notes-a-novel-pragmatic-obsidian-based-approach-to-pkm-strategies/38077), [Is There a Good Reason to make Citekeys Links?](https://forum.obsidian.md/t/is-there-a-good-reason-to-make-citekeys-links/4854), [Literature/Reference Notes in Obsidian](https://forum.obsidian.md/t/literature-reference-notes-in-obsidian/26815).

---

## Q1, Atomicity: how small?

- **Kepano**: Notes are granular by default; quotes, ideas, and references each become files in the vault root. No explicit splitting rule. ([vault](https://stephango.com/vault))
- **Matuschak**: A note should be "only about one thing, but which, as much as possible, capture the entirety of that thing." Failure modes are stated symmetrically: too broad means new ideas land elsewhere and links are "muddied"; too fragmented means "you'll also fragment your link network, which may make it harder to see certain connections." No litmus test, "a bunch of tradeoffs." ([atomic](https://notes.andymatuschak.org/Evergreen_notes_should_be_atomic))
- **Ahrens**: One Zettel per idea, written "as if for print," self-contained, "permanently understandable." Literature notes are one per *source*; permanent notes are one per *idea*. ([summary](https://zettelkasten.de/posts/concepts-sohnke-ahrens-explained/))
- **Milo**: Atomicity is downstream of usefulness. Notes can be longer if they are coherent; the MOC is where atomicity gets stress-tested ("places to examine how notes interact"). ([Doto](https://writing.bobdoto.computer/zettelkasten-linking-your-thinking-and-nick-milos-search-for-ground/))
- **r/ObsidianMD consensus**: Mixed. The 5-year reflection thread argues atomicity was a *physical-media* constraint and "what's more important is how to connect a note with other notes." But the Zettelkasten orthodoxy ("one main idea per note, interlink them") still dominates instructional posts. ([forum thread](https://forum.obsidian.md/t/long-notes-or-short-notes-my-5-year-reflections/102138))

**Disagreement**: Matuschak and Ahrens push hard atomicity as a *cognitive* discipline; Milo and forum veterans treat it as a *means*, expendable when notes already cohere.

**Recommended default**: One note per concept that has its own *handle* (a name a future reader could plausibly link to). Split when (a) a section keeps getting cited from elsewhere, or (b) the note's title no longer covers everything in it. Don't split for hygiene alone.

## Q2, Link vs embed

- **Kepano**: "Use internal links profusely" and "always link the first mention of something." Embeds are not foregrounded; he treats unresolved `[[wikilinks]]` as "breadcrumbs for future connections." ([vault](https://stephango.com/vault))
- **Matuschak**: All connection is via links. Section/block embeds are not part of his published vocabulary; the working notes page itself uses link-only navigation with stacked panes. ([densely linked](https://notes.andymatuschak.org/Evergreen_notes_should_be_densely_linked))
- **Ahrens**: Folgezettel (sequence IDs) and free links between Zettels; embeds are not a Zettelkasten primitive.
- **Milo**: MOCs are *composed* of links, not transclusions. Embeds appear in LYT mostly as quote-blocks inside MOCs, not as a primary structural device.
- **r/ObsidianMD**: Embeds (`![[note]]`) are common for (a) atomic claim-blocks pulled into a synthesis note, and (b) `![[note#section]]` for quoting a stable passage. Block embeds (`![[note#^id]]`) are advanced and used when a *single sentence* is the citable unit (e.g., a thesis claim). Community caution: heavy embedding hides the source's title and breaks if the source is renamed.

**Disagreement**: Authority writers (Kepano, Matuschak, Ahrens, Milo) barely discuss embeds; the community uses them. Mostly a power-user feature.

**Recommended default**: `[[link]]` is the primary connective. Use `![[note#section]]` only for stable quotation (e.g., pulling a passage of a primary text into your reading note). Use `![[note#^block]]` only when the block is a *named claim* that earns reuse. Never embed a whole note unless you genuinely want it inlined in two places.

## Q3, MOC: when, if ever?

- **Kepano**: No dedicated MOC notes. Equivalent function is provided by a `categories` frontmatter property + Obsidian Bases queries. Hub-views are *generated*, not authored. ([vault](https://stephango.com/vault))
- **Matuschak**: Explicitly hostile to hub-and-spoke: "Prefer associative ontologies to hierarchical taxonomies." He warns against "the temptation to navigate hierarchically." MOCs are not part of his published architecture. ([densely linked](https://notes.andymatuschak.org/Evergreen_notes_should_be_densely_linked))
- **Ahrens**: Luhmann had *Schlagwortverzeichnis* (keyword index) and a few "structure notes." These are minimal indexes, not workspaces. ([summary](https://zettelkasten.de/posts/concepts-sohnke-ahrens-explained/))
- **Milo**: MOCs are central. Per Doto, they are "places to examine how notes interact... Rather than being a representation of previously made connections, MOCs are where connections are made anew." ([Doto](https://writing.bobdoto.computer/zettelkasten-linking-your-thinking-and-nick-milos-search-for-ground/))
- **r/ObsidianMD**: Pragmatic middle. MOCs are used when (a) backlinks alone become unreadable, or (b) a topic spans many notes that need a reading order.

**Disagreement**: Sharp. Matuschak: MOCs are a hierarchy in disguise. Milo: MOCs are where thinking happens.

**Recommended default**: Light MOCs only, and lazily. Don't author a MOC until a topic has accumulated enough notes that backlinks alone don't disclose the structure. When a MOC exists, treat it as a *reading order* + commentary, not a taxonomy. Don't make MOCs for every "topic"; make them for projects, courses, and unsettled research questions.

## Q4, Folders vs tags vs links

- **Kepano**: "Avoid folders for organization." Most notes live in vault root. Frontmatter properties (especially `categories`, pluralized) carry structure; tags exist but are secondary; links are primary. ([vault](https://stephango.com/vault))
- **Matuschak**: Links primary. Has a published note "Tags are an ineffective association structure." Folders are not part of the architecture. ([densely linked](https://notes.andymatuschak.org/Evergreen_notes_should_be_densely_linked))
- **Ahrens**: Slip-box has no folders by design; structure is the link graph + a thin index.
- **Milo**: Folders permitted but minimized; MOCs replace folder navigation.
- **r/ObsidianMD**: Long-running consensus that folders are a *trap* for cross-cutting topics; tags work as a folksonomy if disciplined; links are the durable layer.

**Agreement**: Strong. All five authorities deprioritize folders. None recommend folders as the primary organizational axis.

**Recommended default**: Vault root for synthesis/concept notes. Two or three folders for *kinds* of artifact that genuinely don't mix (e.g., `sources/`, `daily/`, `attachments/`). Tags as a small controlled vocabulary (statuses, project codes), not a folksonomy. Properties (frontmatter) for structured queryable metadata. Links carry the meaning.

## Q5, Filename conventions

- **Kepano**: Subject-titled files for reference notes; `YYYY-MM-DD` for daily; `YYYY-MM-DD HHmm` for journal fragments. ([vault](https://stephango.com/vault))
- **Matuschak**: Concept-named, short, treated as APIs ("Evergreen note titles are like APIs"), declarative phrases ("Evergreen notes should be atomic").
- **Ahrens**: Luhmann used numeric IDs (folgezettel); modern translations use either IDs or descriptive titles.
- **Milo**: Concept-named for synthesis; sources can be citekey or full title.
- **r/ObsidianMD**: For literature notes specifically, `@citekey.md` (or `Smith2020.md`) is widely used because it (a) is unique, (b) survives re-titling of the source, (c) plays nicely with Better BibTeX. Concept notes use plain English titles. The forum thread "Is There a Good Reason to make Citekeys Links?" notes citekeys are ugly inside prose, so use aliases.

**Agreement**: Concept notes get human-readable titles. Source notes can use citekeys.

**Recommended default**: Two filename namespaces. (1) Source notes: `@Fricker2007.md` (Better BibTeX citekey, prefix `@` to make them sortable + visually distinct). Add a frontmatter `aliases:` with the human title. (2) Concept/synthesis notes: lowercase short noun phrase, e.g., `epistemic injustice.md`, `real abstraction.md`. Avoid dates in titles except for journal/daily.

## Q6, Note types: distinguish or collapse?

- **Kepano**: Functional types: daily, journal, reference, evergreen, clipping. Lives them as distinct file conventions but in one vault. ([vault](https://stephango.com/vault))
- **Matuschak**: Collapses to one type ("evergreen") with an inbox in front. Drafts and project notes are separate but evergreens are the unit. ([atomic](https://notes.andymatuschak.org/Evergreen_notes_should_be_atomic))
- **Ahrens**: Three+two: fleeting (paper, discarded), literature (per source, in reference manager or vault), permanent (per idea, in slip-box), project notes (transient), Zettel (= permanent in slip-box). ([summary](https://zettelkasten.de/posts/concepts-sohnke-ahrens-explained/))
- **Milo**: Notes have a *lifecycle* (seedling, evergreen, MOC). Same file can move stages.
- **r/ObsidianMD**: Convergence on three: inbox/fleeting, literature (one per source), permanent/evergreen. Daily notes are an *inbox surface*, not a separate ontological type.

**Disagreement**: Matuschak collapses, Ahrens distinguishes. The split is consequential for the user.

**Recommended default**: Keep Ahrens's three-way split because it matches an academic workflow with Zotero. (a) **Daily notes** as the fleeting-capture surface (no permanence assumed). (b) **Literature notes**, one per Zotero source, citekey-named, summarizing the source and quoting key passages. (c) **Concept/permanent notes**, one per idea, concept-named, written in your own voice, drawing on multiple sources. Project notes (e.g., a thesis chapter) are scratch space and should not be confused with permanent notes.

## Q7, Linking density

- **Kepano**: Link the *first mention* of any nameable thing. ([vault](https://stephango.com/vault))
- **Matuschak**: Use links "as much as is possible"; prefer "fine-grained associations." Dense linking is what makes the system *think*: it forces noticing relations and acts as a passive review mechanism. ([densely linked](https://notes.andymatuschak.org/Evergreen_notes_should_be_densely_linked))
- **Ahrens**: Each new permanent note must connect to at least one existing note; "in context to other permanent notes."
- **Milo**: Density emerges through MOCs; not every mention needs a link if a MOC already routes you there.
- **r/ObsidianMD**: Common heuristic: link the first mention in a note + any second mention that introduces a *new claim about* the linked concept. Dead-link forests (`[[every word]]`) are widely warned against.

**Failure modes**: Too sparse means the graph carries no signal and your future self can't navigate by association. Too dense means link-blindness (you stop reading the names) and false positives in graph view.

**Recommended default**: Link the *first mention* of any concept, person, work, or term that has (or could have) its own note. Don't relink the same concept later in the same note unless you're saying something new about it. Always link to *exactly one* canonical note per concept (see Q8).

## Q8, Aliases & redirects

- **Kepano**: Properties + aliases (Obsidian frontmatter `aliases:`) is the standard pattern; one note per concept, multiple inbound names. ([vault](https://stephango.com/vault))
- **Matuschak**: Concept handles ("Evergreen note titles are like APIs"); each concept has one stable handle that other notes call. Synonyms are not separate notes. ([atomic](https://notes.andymatuschak.org/Evergreen_notes_should_be_atomic))
- **Ahrens**: Not addressed directly; Luhmann's keyword index handled synonyms.
- **Milo**: Aliases used pragmatically; MOCs can also bridge synonyms.
- **r/ObsidianMD**: Strong consensus on `aliases:` frontmatter. Multiple notes for synonyms = duplication and link-graph fragmentation.

**Agreement**: Strong. One canonical note per concept; synonyms via `aliases:`.

**Recommended default**: One canonical concept note. Put every synonym (English, original-language, common variant spellings) in `aliases:` frontmatter. For "real abstraction" / "Realabstraktion" / "exchange-abstraction": one note (`real abstraction.md`), three aliases. Use `[[real abstraction|Realabstraktion]]` only when the German word is what the prose actually needs.

---

## Synthesis: prescriptions for the user's vault

- **One note per handle**: Create a new note when a concept earns its own name (something you could plausibly link to from elsewhere). Otherwise, keep it as a section. *Why:* Matches Matuschak's "titles are like APIs" while avoiding over-fragmentation flagged by the long-form forum thread.
- **Two filename namespaces**: Source notes are `@Citekey.md` (Better BibTeX). Concept notes are lowercase noun phrases. *Why:* Forum consensus + plays nicely with Zotero/Better BibTeX, keeps source vs synthesis visually distinguishable.
- **Aliases, not duplicates**: Each concept has one canonical note; all synonyms (incl. original-language terms) go in `aliases:` frontmatter. *Why:* Universal agreement across Kepano, Matuschak, and the forum.
- **Links over folders over tags**: Vault root holds concept notes. Folders only for `sources/`, `daily/`, `attachments/`. Tags only for status/projects, not topics. Topics live in the link graph. *Why:* Kepano "avoid folders for organization"; Matuschak "tags are an ineffective association structure."
- **Three note types**: daily (fleeting capture), literature (one per source, citekey-named), concept/permanent (one per idea, concept-named). Project notes are scratch, not permanent. *Why:* Ahrens's split fits an academic Zotero workflow.
- **Link the first mention**: Of any nameable concept/work/person, exactly once per note, to the canonical note. *Why:* Kepano's stated rule; matches Matuschak's "as much as possible" without dead-link forests.
- **Embeds are quotation, not structure**: Default is `[[link]]`. Use `![[note#section]]` to pull stable quoted text into a reading note. Reserve `![[note#^block]]` for citable atomic claims. Never embed an entire note. *Why:* Authority writers don't structure with embeds; community uses them only for quotation.
- **Lazy MOCs only**: Don't pre-author MOCs. Create one when a topic's backlinks become unreadable, or when a project/seminar needs a reading order. Treat the MOC as commentary + ordering, not a taxonomy. *Why:* Splits the difference between Milo (MOCs are workspaces) and Matuschak (no hierarchies).
- **Literature note = source-bound, concept note = idea-bound**: Literature notes summarize *a source*; concept notes synthesize *across sources*. A claim that lives in a literature note long enough to be cited from a third place should be promoted to a concept note. *Why:* Ahrens's literature/permanent split mapped to Obsidian.
- **Concept-handle test for splitting**: Split a section into its own note when (a) you cite it from a third location, or (b) the parent note's title no longer covers what's inside. *Why:* Operationalizes Matuschak's "titles are like APIs" without forcing premature atomization.
- **Frontmatter for queryable structure**: Use properties (`tags`, `aliases`, `status`, `source::`, etc.) for anything you might want to query. Don't encode structure in folder paths. *Why:* Kepano's pattern; survives Obsidian's eventual replacement (file-over-app).
- **Plain markdown stays portable**: Avoid Obsidian-only syntax inside note *bodies* where a plain alternative exists. Frontmatter and `[[wikilinks]]` are acceptable; Bases queries should live in dedicated query notes, not inside concept notes. *Why:* Kepano "file over app"; ensures vault outlives the app.

## Open questions / contested territory

- **Atomicity threshold for philosophy notes**: A 1500-word reading note on Adorno's "Subject-Object" essay may be more useful as one cohesive note than ten atomic ones, but the literature/concept split says synthesis claims should be promoted. Where exactly? The user should decide per source.
- **MOC vs Bases query**: Kepano replaces hand-authored MOCs with Bases queries; Milo wants the human-curated MOC. For an active research project (e.g., MA thesis), a hand-authored MOC seems right; for stable concept domains (e.g., "epistemology"), a Bases query might suffice. The user should pick per topic.
- **Citekey-as-filename vs title-as-filename for sources**: `@Fricker2007.md` is unambiguous but ugly in graph view; `Epistemic Injustice (Fricker, 2007).md` is readable but breaks if the source is re-titled. The forum thread on citekey links shows this is genuinely contested.
- **Folgezettel-style numeric IDs**: Pure Luhmann would have notes like `1a3b2`. None of the modern authorities recommend this for digital vaults, but a minority on r/ObsidianMD swears by it. The user should ignore this unless they want a strict Zettelkasten.
