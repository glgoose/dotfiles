# Academic database channels

Free, no-key APIs that return structured citation metadata. Use these *before* the open web for any topic that lives in academic literature (sciences, humanities, philosophy, medicine, CS papers, social science).

All endpoints reachable via `curl` or `WebFetch`. Be polite: include a `User-Agent` (or Crossref's `mailto`) when you can.

## OpenAlex — broadest coverage, best default

[openalex.org](https://openalex.org) — open catalog of ~250M scholarly works. Free, no key, generous rate limit.

```bash
curl -s "https://api.openalex.org/works?search=<query>&per_page=10&select=id,title,authorships,publication_year,doi,abstract_inverted_index,primary_location,open_access" \
  -H "User-Agent: deep-research-skill (mailto:glenn@rivnox.ai)"
```

- `search` searches title, abstract, fulltext.
- `select` picks fields to keep response small.
- Response: `results[].title`, `results[].authorships[].author.display_name`, `results[].doi`, `results[].open_access.oa_url` (direct PDF link when OA).
- Filters: `&filter=publication_year:2020-2026` for recency, `&filter=is_oa:true` to restrict to open access.
- Sort: `&sort=cited_by_count:desc` for impact, `&sort=publication_date:desc` for newest.

## arXiv — preprints (CS, physics, math, quant-bio, etc.)

```bash
curl -s "http://export.arxiv.org/api/query?search_query=all:<query>&start=0&max_results=10&sortBy=relevance"
```

- Returns Atom XML (parse with `python -c "import feedparser; ..."` or `xmllint`).
- `search_query=all:` searches all fields. Restrict: `ti:` title, `abs:` abstract, `au:` author, `cat:cs.CL` category.
- Each entry has `<id>` (arXiv URL → PDF at `https://arxiv.org/pdf/<id>.pdf`), `<title>`, `<author>`, `<published>`, `<summary>`.
- Combine: `search_query=ti:RAG+AND+abs:faithfulness`

## Semantic Scholar — strong CS / ML / multidisciplinary

```bash
curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query=<query>&limit=10&fields=title,authors,year,abstract,openAccessPdf,citationCount,externalIds"
```

- Free without key (rate limit ~100 req / 5 min). Optional API key removes the limit.
- `openAccessPdf.url` gives a direct PDF when available.
- Useful for: citation counts, related-paper graph (`/paper/<id>/references`, `/paper/<id>/citations`).

## Crossref — DOI metadata, all disciplines

```bash
curl -s "https://api.crossref.org/works?query=<query>&rows=10&select=DOI,title,author,issued,abstract,URL,container-title" \
  -H "User-Agent: deep-research-skill (mailto:glenn@rivnox.ai)"
```

- `mailto` puts you in the polite pool (faster, more reliable).
- Use when you need authoritative bibliographic metadata for a known DOI/title, or when other DBs miss the venue (humanities journals, monographs sometimes only here).
- Subqueries: `&query.title=`, `&query.author=`, `&query.container-title=` (journal/book).

## PubMed (biomedical)

Use only when topic is biomedical. Two-step: search returns IDs, fetch returns metadata.

```bash
# Search
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=<query>&retmode=json&retmax=10"
# Fetch
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=<id1>,<id2>&retmode=json"
```

## PhilPapers / PhilArchive (philosophy — discipline standard)

[philpapers.org](https://philpapers.org) is the discipline index for academic philosophy. PhilArchive (philarchive.org) is its OA preprint repository. Use this *first* for any philosophy topic, before OpenAlex / Crossref. API docs at <https://philpapers.org/help/api>.

```bash
# HTML search (always works, parse with WebFetch)
# https://philpapers.org/s/<URL-encoded query>

# JSON-ish endpoints (per philpapers.org/help/api; validate exact path on first run)
curl -s "https://philpapers.org/asearch.pl?searchStr=<query>&format=json&limit=20"
```

Each result row has title, author(s), year, abstract, publication venue, and a PhilArchive link when an OA copy exists. PhilArchive entries serve PDFs at `https://philarchive.org/archive/<KEY>` (key from the entry URL).

When the API path is unclear, fall back to `WebFetch` on `https://philpapers.org/s/<query>` and parse the result list. PhilPapers also exposes a structured topic taxonomy (`/browse/`); useful for narrowing by subfield (e.g. `/browse/marxism`).

## Stanford Encyclopedia of Philosophy (SEP)

[plato.stanford.edu](https://plato.stanford.edu). Authoritative tertiary source. Each entry is peer-reviewed, dated, and carries an extensive bibliography (worth mining straight into Zotero / OpenAlex follow-up queries). No public JSON API; use stable URLs.

```bash
# Search (HTML)
# https://plato.stanford.edu/search/searcher.py?query=<query>

# Direct entry by slug
# https://plato.stanford.edu/entries/<slug>/   (e.g. /entries/marx/, /entries/critical-theory/)

# Archive (versioned snapshots, citable):
# https://plato.stanford.edu/archives/<season-year>/entries/<slug>/
```

Cite SEP with the exact archive snapshot URL when accuracy matters (entries get revised). Otherwise the live entry is fine. The bibliography at the bottom of each entry is a curated reading list, treat each item as a candidate for the source list.

## Brill catalog (Historical Materialism, Marxist theory)

[brill.com](https://brill.com) hosts *Historical Materialism* (the journal, ISSN 1465-4466, plus the Brill HM book series). Mostly paywalled; abstracts and DOIs are public. User has KU Leuven institutional access for full text.

```bash
# Site search (HTML, parse with WebFetch)
# https://brill.com/search?q=<query>

# Filter to the HM journal:
# https://brill.com/search?q=<query>&access=all&series=hima

# Filter to the HM book series:
# https://brill.com/search?q=<query>&series=hm
```

For paywalled hits: log title, authors, year, DOI, abstract, and tag `[brill-hm]` plus `[paywalled]`. Note in the source-list line that KU Leuven institutional access is needed for full text. Resolve DOI via Crossref to confirm metadata.

## Marxists Internet Archive (primary Marxist sources)

[marxists.org](https://www.marxists.org). Free full-text archive of Marx, Engels, Lenin, Luxemburg, Lukács, Gramsci, Adorno, and many others. Use whenever a topic touches classical Marxist theory and you need the primary text rather than commentary.

```bash
# Site search via Google (more reliable than the on-site search):
# WebSearch query: site:marxists.org <query>

# Direct path pattern:
# https://www.marxists.org/archive/<author>/works/<year>/<slug>.htm
# e.g. https://www.marxists.org/archive/marx/works/1867-c1/ for Capital Vol 1
```

Cite with the stable archive URL. The archive preserves canonical English translations; note translator and edition in the source-list entry when relevant.

## JSTOR and Project MUSE (paywalled, abstracts only)

JSTOR (jstor.org) and Project MUSE (muse.jhu.edu) host most humanities journals behind paywalls. Their abstract pages are public and indexed by Google. Workflow:

1. Discover via `WebSearch` (e.g. `site:jstor.org <query>` or via OpenAlex / Crossref which surface JSTOR DOIs).
2. `WebFetch` the abstract page for title, authors, year, abstract.
3. Log to source-list tagged `[paywalled]`. If KU Leuven access is needed for full text, mention that in the entry.
4. Do not attempt to scrape full text.

## Channel selection per topic

| Topic flavor | Primary channel(s) |
| --- | --- |
| CS / ML / NLP | arXiv + Semantic Scholar + OpenAlex |
| Philosophy (analytic / general) | PhilPapers + Zotero + Obsidian + SEP + OpenAlex + Crossref |
| Marxist theory / *Historical Materialism* | PhilPapers + Brill HM + Marxists Internet Archive + Zotero + Obsidian + Crossref |
| Continental philosophy / critical theory | PhilPapers + SEP + Brill + Zotero + Obsidian + OpenAlex |
| Other humanities | OpenAlex + Crossref + Zotero (often user already has key works) |
| Social sciences | OpenAlex + Crossref |
| Biomedical | PubMed + OpenAlex |
| Law / policy | Crossref (gov reports often via WebSearch as fallback) |
| Current events / industry / product | open web (WebSearch / WebFetch); academic DBs unlikely to help |

When unsure, run OpenAlex first — broadest coverage — and add specialty DBs based on what comes back.

## Full-text retrieval

Hits from any channel give you a title and (usually) a DOI or URL. To get full text:

1. **OA URL or PDF link** in the response → `WebFetch` directly, or `curl -L -o /tmp/paper.pdf <url>` then `pdf-reader` / `pdftotext`.
2. **DOI without OA link** → try `https://doi.org/<DOI>` via WebFetch; many publishers serve abstracts. For paywalled, log to `sources/source-list.md` with the abstract only and tag `[paywalled]`.
3. **Already in Zotero** → check `local-search.md`'s Zotero search before web-fetching; if a hit exists, prefer the local PDF.

## Source-list tagging

Mark academic-DB sources with provenance:

```
[S5] [arxiv] **<Title>** — <Authors>, <Year>. arXiv:<id>. <URL>. Retrieved <YYYY-MM-DD>.
[S6] [openalex] **<Title>** — <Authors>, <Year>. DOI:<doi>. <OA URL or paywalled note>. Retrieved <YYYY-MM-DD>.
[S7] [crossref] **<Title>** — <Authors>, <Year>. <Journal>. DOI:<doi>. Retrieved <YYYY-MM-DD>.
[S8] [s2] **<Title>** — <Authors>, <Year>. S2:<id>. <URL>. Cited by <N>. Retrieved <YYYY-MM-DD>.
[S9] [philpapers] **<Title>** — <Authors>, <Year>. <Venue>. PhilPapers:<id>. <URL or PhilArchive PDF>. Retrieved <YYYY-MM-DD>.
[S10] [sep] **<Entry title>** — <Author>, SEP <season-year> edition. <Archive URL>. Retrieved <YYYY-MM-DD>.
[S11] [brill-hm] **<Title>** — <Authors>, <Year>. *Historical Materialism* <vol(issue)>:<pp>. DOI:<doi>. [paywalled — KU Leuven access]. Retrieved <YYYY-MM-DD>.
[S12] [marxists-archive] **<Title>** — <Author>, <Year orig.>. Trans. <Translator>. <URL>. Retrieved <YYYY-MM-DD>.
```

The provenance tag tells the verifier and citation pass whether to re-fetch (web) or trust (local + structured-DB metadata).
