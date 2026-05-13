---
name: improve-transcript
description: "Verbeter een lecture-transcript: confidence-aware LLM-correctie (ASR-conf x LLM-conf decision matrix) van typos/eigennamen/boektitels en topic-paragraaf herstructurering in één enkele pass over de SRT, met versioned backup en REVIEW.md voor low-confidence kandidaten. Doet het werk direct binnen Claude. Trigger wanneer de gebruiker in een transcript-folder zit en zegt 'verbeter dit transcript', 'clean up transcript', 'fix transcription', 'improve transcription', of /improve-transcript invoceert."
---

# Improve Transcript

## Doel

Correct + topic-paragraph één transcript-pair in cwd. Eén enkele LLM-pass over de volledige SRT produceert gecorrigeerde cues, glossary, paragraaf-break indices, en een review-list in één JSON-respons. ASR (`lec-transcribe`) en diarization (`lec-diarize`) blijven out-of-band omdat dat geen LLM-werk is.

## Workflow

### 1. Inventariseer cwd

```bash
ls -la
find . -maxdepth 1 \( -iname '*.flac' -o -iname '*.wav' -o -iname '*.opus' -o -iname '*.m4a' -o -iname '*.srt' -o -iname '*.txt' -o -iname '*.words.json' -o -iname '*.glossary.txt' \) | sort
```

Identificeer per `<base>`:
- **Source SRT**: prefer `<base>.diarized.srt` boven `<base>.srt` als beide bestaan.
- **Plain text**: `<base>.txt`.
- **Audio**: `.flac/.wav/.opus/.m4a` (alleen voor pre-flight).
- **Words sidecar** (optioneel): `.<base>.words.json` (hidden dotfile). Aanwezig als `lec-transcribe` is gedraaid met word_timestamps. Bevat per-word probability voor confidence gating. Legacy ongedotte vorm `<base>.words.json` wordt ook geaccepteerd (oudere runs). `find -iname '*.words.json'` matcht beide.
- **Glossary** (optioneel): `<base>.glossary.txt`. Eén term per regel, blanke regels genegeerd.
- **Eerdere runs**: `pre-improve/v1/`, `pre-improve/v2/`, en historische flat `pre-improve/`, `pre-correct/`, `pre-paragraph/` (laat staan, niet aanraken).

Negeer `context.txt` als pair-kandidaat.

### 2. Pre-flight

| Situatie | Actie |
|---|---|
| Geen `.srt`, audio aanwezig | Stop. Zeg: `lec-transcribe <audiofile>` eerst draaien. |
| Geen `.srt`, geen audio | Stop. Vraag waar het transcript is. |
| `.srt` + `.txt` aanwezig, sidecar (`.<base>.words.json` of legacy `<base>.words.json`) ontbreekt | Door, met waarschuwing dat confidence-gating uit staat (graceful degradation: alle correcties krijgen ASR-conf = `unknown`, behandeld als `high` zodat speculatieve correcties naar review gaan). Suggereer optioneel re-run van `lec-transcribe` voor de sidecar. |
| `.srt` + `.txt` + sidecar (`.<base>.words.json` of legacy) aanwezig | Door naar stap 3. |
| Geen `<base>.glossary.txt` | Vraag de gebruiker eenmalig: "Specifieke namen, termen, of boektitels die in deze lecture voorkomen? (één per regel, blank om over te slaan)". Sla het antwoord op als `<base>.glossary.txt`. Lege input = leeg bestand maken zodat de prompt niet herhaalt op re-runs. |

Meerdere pairs: één tegelijk afhandelen (vraag welke).

### 3. Versioned backup

Bepaal volgende versie-nummer: scan `pre-improve/` voor bestaande `v<N>/` subdirs, neem `max(N) + 1`. Als geen `v<N>/` bestaat (alleen flat `pre-improve/` of niets), begin bij `v1`.

```bash
mkdir -p pre-improve/v<N>
cp "<base>.srt" pre-improve/v<N>/   # of <base>.diarized.srt
cp "<base>.txt" pre-improve/v<N>/
if [[ -f ".<base>.words.json" ]]; then
  mv ".<base>.words.json" "pre-improve/v<N>/<base>.words.json"   # strip dotprefix in archive
elif [[ -f "<base>.words.json" ]]; then
  mv "<base>.words.json" "pre-improve/v<N>/"                      # legacy visible form
fi
[[ -f "<base>.glossary.txt" ]]  && cp "<base>.glossary.txt"  pre-improve/v<N>/
```

Kopieer alleen de source-SRT die je gaat bewerken. Re-runs overschrijven nooit een eerdere `v<N>/`.

**Words sidecar wordt verplaatst, niet gekopieerd.** `.<base>.words.json` is een one-shot input voor deze pass: na archivering in `pre-improve/v<N>/<base>.words.json` (zichtbare vorm; geen dotprefix in archief) heeft de root geen sidecar meer. Re-runs van improve degradeerren gracieus (alle words `asr_confidence: unknown`, behandeld als `high`, gated naar review). Wil je opnieuw confidence-gating: kopieer de gearchiveerde `<base>.words.json` terug naar cwd als `.<base>.words.json`, of draai `lec-transcribe` opnieuw.

### 4. Single-pass correct + paragraaf-breaks + glossary + review

Lees de source-SRT met de Read tool. Tokenize naar één regel per cue-block (multi-line cues collapsen naar één regel intern; structureel blijft het block). Strip eventuele `[SPEAKER_XX]` prefixes intern, bewaar in parallelle speaker-array per cue (voor diarized output).

Bepaal pauses: voor elke cue `i > 0`, `gap[i] = start[i] - end[i-1]` in seconden.

Lees de sidecar als aanwezig (probeer `.<base>.words.json` eerst, val terug op legacy `<base>.words.json`) en groepeer per `cue_id`. Voor elke cue, bepaal de set "low-confidence words" als die met `probability < 0.6`. Als de sidecar ontbreekt, sla deze stap over en behandel alle words als `asr_confidence: unknown`.

Lees `<base>.glossary.txt` als aanwezig en parse één term per regel (negeer blanks en `#`-comments).

**LLM-payload**: één regel per cue in `<id>\t<text>` formaat. Plus:
- de pauses-array (per cue gap in seconden);
- speakers-array (per cue, indien diarized);
- low-confidence words per cue (compact: `{ "16": ["Lach", "bureaucratic"], "344": ["law"] }`); leeg/afwezig als geen sidecar;
- glossary terms (lijst), leeg als geen file.

Plus deze prompt:

> You are correcting an automatic speech recognition transcript of an academic lecture. Apply the following rules and return one JSON object with keys `cues`, `paragraph_breaks`, `glossary`, and `review`. Do not return any text outside the JSON.
>
> 1. Be conservative. If you are not certain a word is wrong, leave it exactly as-is. This applies especially to clearly garbled or unintelligible passages: preserve the gibberish verbatim rather than inventing plausible-sounding words to fill gaps. It is better to leave obvious nonsense than to introduce hallucinated content.
> 1.5 **Two-axis confidence**. For every word you change, emit an `llm_confidence` value in [0, 1]: your subjective certainty that the corrected form is right given lecture context, surrounding cues, the glossary, and your domain knowledge. The payload separately gives you per-cue `low_confidence_words` from ASR (probability < 0.6). The writer applies this decision matrix downstream — you do not implement it yourself, you just emit honest `llm_confidence`:
>
>     | ASR conf | LLM conf | Action by writer |
>     |---|---|---|
>     | low | high (>= 0.85) | apply silently (sweet spot) |
>     | low | low (< 0.85) | move to `review` |
>     | high | high (>= 0.85) | apply silently, log as glossary/normalization |
>     | high | low (< 0.85) | move to `review` |
>
>     Practical: when proposing a fix, if the original word is NOT in the cue's `low_confidence_words` set AND your `llm_confidence` is below 0.85, put the proposal in `review` instead of `cues`. When in doubt, prefer `review` over a silent application.
> 2. Never substitute a similar-sounding or visually similar word unless the original is clearly a mishearing.
> 3. Be consistent across the whole document. If a name or term appears multiple times, use the same corrected form every time. **If the payload provides a user glossary, those spellings are canonical: harmonize all variants in the document to match the glossary form, even when individual ASR confidence is high (this counts as "normalization" under rule 1.5 and applies silently).**
> 4. Do not paraphrase or summarize. Preserve the speaker's exact words and sentence structure, except where rule 9 applies.
> 5. Book and publication titles: wrap any clearly mentioned book, journal, or publication title in straight double quotes. Dutch titles use sentence case (only the first letter capitalized, plus proper nouns), example: `"Het laatkapitalisme"`, `"Inleiding in de marxistische economie"`. English titles use Title Case (capitalize all major words; keep articles, short prepositions, and conjunctions lowercase except at the start), example: `"Capital in the Twenty-First Century"`, `"The Origin of Capitalism"`. Detect language per title, not per document. Do not invent or expand abbreviated titles, and do not add quotes around generic references that are not actual titles. **For read-aloud passages from a known published work: corrections to words inside the quotation that have high ASR confidence go to `review`, never silently to `cues`, regardless of your match against published text. The user must verify quote-restoration changes.**
> 6. Same number of corrected cues as input cues, one entry per input id. Rule 9 deletes within a cue, never across; cue count is preserved.
> 7. Cross-cue duplicates: if a word at the end of cue N is repeated at the start of cue N+1 (capitalized or not, possibly with intervening punctuation), delete the duplicate from one side. Keep the version that fits the sentence grammar. Common pattern: ASR splits a sentence at a phrase boundary and re-emits the boundary word.
> 8. Sentence-start capitalization at cue boundaries: if cue N ends with `.`, `!`, or `?` (definite sentence terminator), and cue N+1 starts with a lowercase letter, capitalize the first letter of cue N+1. Skip if the previous cue ends with ellipsis, comma, or any non-sentence-terminating mark.
> 9. Speaker false-starts and self-corrections: if a cue contains an abandoned noun phrase or clause immediately followed by a restart of the same idea, delete the abandoned fragment. Conservative: only when the restart clearly reformulates the same point with overlapping content. Do not smooth filler words ("um", "uh", "well"), do not delete repeated discourse markers, do not merge cues. The cue stays one cue. Example: `this bureaucratic the dominance of bureaucracy favors` becomes `the dominance of bureaucracy favors`. Rule 1.5 still applies: if the abandoned fragment's words have high ASR confidence and your `llm_confidence` in the deletion is below 0.85, propose it in `review` instead.
> 10. Glossary harmonization in-pass: enforce rule 3 across the whole document in this same pass. The `glossary` field in the output JSON is for the user-facing report only; corrections are already applied in `cues`. Only list entries where at least two distinct surface forms appeared in the input for what is clearly the same entity, or where a user-provided glossary term was used to normalize variants.
> 11. Paragraph breaks: emit indices into the cue array where a new paragraph begins. Use pause-cues (gap >= 1.5 seconds, provided per cue), speaker turns (provided per cue for diarized input), and topic shifts. First index always 0. Indices strictly increasing, all in `[0, n_cues)`.
>
> Output schema:
> ```
> {
>   "cues": [
>     {
>       "id": 1,
>       "text": "...",
>       "corrections": [
>         { "from": "Lach", "to": "Lasch", "llm_confidence": 0.99, "reason": "glossary match" }
>       ]
>     }
>   ],
>   "paragraph_breaks": [0, 7, 23, ...],
>   "glossary": { "Lasch": ["Lach", "Lash"], "The Culture of Narcissism": ["the culture of narcissism"] },
>   "review": [
>     {
>       "cue_id": 344,
>       "before": "mother's law",
>       "after": "mother's love",
>       "llm_confidence": 0.7,
>       "reason": "Lasch published quote; rule 5 gated"
>     }
>   ]
> }
> ```
> For unchanged cues, omit `corrections` or use `[]`.

### 5. Validate, apply decision matrix, write, fallback

**Parse JSON-respons**. Bij JSON-parse-fout: stop, restore vanuit `pre-improve/v<N>/`, en rapporteer met de raw respons.

**Validatie**:
1. `len(cues) == n_input_cues`. Bij mismatch: fail, restore, rapporteer.
2. Elke `cues[i].id` matcht input cue-id i.
3. `paragraph_breaks[0] == 0`, strictly increasing, alle waarden in `[0, n_cues)`.

Bij validatie-fout op `paragraph_breaks` (maar `cues` ok): **fallback** naar deterministische pause-based breaks over de gecorrigeerde cues. Zet een break op cue-index 0, plus elke cue waar `gap >= 1.5s`, plus elke speaker-turn (diarized). Continue met write.

**Decision matrix enforcement (writer-side)**. Voor elke cue, loop over `corrections`. Bepaal `asr_confidence` per correction door `from` op te zoeken in `low_confidence_words[cue_id]`:
- als `from` (case-insensitive substring match) voorkomt in de low-conf set → `asr_confidence: low`;
- anders als sidecar afwezig → `asr_confidence: unknown` (behandeld als `high` voor de matrix);
- anders → `asr_confidence: high`.

Per correction:
- `low ASR + high LLM (>= 0.85)`: apply, log als sweet-spot in glossary section van report.
- `high ASR + high LLM` AND (glossary-match OR cross-cue normalization OR rule 9 deletion): apply, log als normalization.
- `high ASR + high LLM` zonder normalization-reden: **move to review** (was rule 5 quote-style: defaulting to review is safer).
- `low LLM (< 0.85)` (any ASR): **move to review**.

Een correction die naar `review` verhuist wordt:
1. NIET toegepast op de cue-text (revert `to` → `from`).
2. Toegevoegd aan een gecombineerde review-lijst (LLM-emitted entries + writer-promoted entries), gedupliceerd op `(cue_id, before, after)`.

**Schrijf de gecorrigeerde SRT**:
- Timestamps onaangetast.
- Eén regel tekst per block (na writer-side reverts).
- Als source `.diarized.srt` is: behoud het `[SPEAKER_XX]` prefix per block exact.
- Schrijf naar dezelfde filename (`<base>.srt` of `<base>.diarized.srt`).

**Hard parity check (fail fast)** na het schrijven van de gecorrigeerde SRT:

```bash
diff <(grep -cE '^[0-9]+$' pre-improve/v<N>/<base>.srt) <(grep -cE '^[0-9]+$' <base>.srt)
```

Verschil = bug. Stop, restore vanuit `pre-improve/v<N>/`, en rapporteer.

**Schrijf de gecorrigeerde `.txt`**:
- Splits cues volgens `paragraph_breaks`: elke index in de lijst markeert de start van een nieuwe paragraaf.
- Join cues binnen één paragraaf met spaties.
- Lege regel tussen paragrafen.
- Diarized bron: prefix elke paragraaf met `**Speaker N:**` (1-indexed, mapping `SPEAKER_00` naar `Speaker 1` etc., consistent over het hele document). Als zinnen binnen één paragraaf van verschillende sprekers zijn, splits op speaker-turn (forceer extra break).

**Schrijf `pre-improve/v<N>/REVIEW.md`** als de review-lijst niet leeg is:

```markdown
# Review needed — <base> v<N>

Deferred corrections from confidence-gated improve-transcript run.
Default: open `REVIEW.html` (`lec-review-html "<base>"`) en apply via
`lec-apply-log "<base>"`. Terminal-alternatief: `lec-review "<base>"`
(TUI). Per-cue second-opinion ASR blijft beschikbaar via
`lec-verify-cue "<base>" <cue_id>`.

## Cue 344 — 12:34.567 → 12:38.901

**Before**: `... she yearned for her mother's law ...`
**After**:  `... she yearned for her mother's love ...`
**ASR conf**: high · **LLM conf**: 0.70
**Reason**: Lasch published quote; rule 5 gated — verify before applying.
**Verify**:
~~~bash
lec-verify-cue "<base>" 344
~~~

## Cue 457 — ...
```

Timestamps lookup uit de gecorrigeerde SRT (`HH:MM:SS.mmm` formaat, kort weergegeven).

### 6. Review handoff (alleen als REVIEW.md niet leeg is)

**Default: HTML review UI.** Genereer een self-contained
`REVIEW.html` met per-cue audio (3 padding-levels), inline diff,
keyboard nav en localStorage state. Voldoet aan de [[Thariq - HTML as
agent output format]]-pattern (transcript-annotatie = single-purpose
HTML editor met round-trip via download).

Vertel de gebruiker:

```
Review queue: <N> cues in pre-improve/v<N>/REVIEW.md.

Open browser-UI:
    lec-review-html "<base>"

Decide per cue (audio + radio + custom textarea), klik "Download
decisions" wanneer klaar. Apply met:
    lec-apply-log "<base>"

Of, voor terminal-flow: `lec-review "<base>"` (TUI met ffplay).
```

**HTML flow (default)**:
- `lec-review-html "<base>"` schrijft `pre-improve/v<N>/REVIEW.html` +
  `pre-improve/v<N>/clips/<cue>.pad{0,1,3}.wav` en opent de browser.
- Gebruiker doorloopt cues, kiest accept/keep/inaudible/custom of pickt
  uit `(unclear:...)` kandidaten. State persist in localStorage zodat
  het sluiten van de browser geen werk verliest.
- Op "Download decisions" landt `REVIEW.decisions.json` (per default
  in `~/Downloads/`). Gebruiker verplaatst hem naar `pre-improve/v<N>/`
  en draait `lec-apply-log "<base>"` — dat shellt per cue naar
  `lec-review --apply`, dus splice-logic en `REVIEW.applied.log`-schema
  blijven gedeeld met de TUI.

**TUI fallback**: `lec-review "<base>"` blijft beschikbaar voor
ssh-sessies en gebruikers die liever keyboard-only werken.

**Chat-fallback**: alleen als de gebruiker expliciet vraagt het in chat
te doen (bv. "doe het hier, ik wil niet wisselen"). Per-cue loop: Bash
`--play` → AskUserQuestion (Accept / Keep / Inaudible / Replay /
Other-or-Quit) → optionele bevestigings-AskUserQuestion bij custom →
Bash `--apply`. Post één audio-waarschuwing vóór de eerste `--play`
("audio komt zo door de speakers — volume nu instellen"). Replay-optie
bij elke cue.

`lec-review --apply` details (gebruikt door zowel `lec-apply-log` als
de chat-fallback):
- Decision-kinds: `accept` | `keep` | `inaudible` | `custom` (geeft
  `--text` mee) | `pick` (caller-pre-spliced text via `--text`).
- Rewrite REVIEW.md automatisch; bij laatste cue rename naar
  REVIEW.done.md. Log in REVIEW.applied.log.
- ffplay-failures (chat-fallback): vang non-zero exit, bied beslissing
  zonder audio.
- Quit: laat overige cues in REVIEW.md staan; gebruiker kan
  `lec-review-html "<base>"` of `lec-review "<base>"` later opnieuw
  draaien.

### 7. Report

Toon na afloop:
- Versie-label van deze run (bv. `v3`).
- Aantal cue-blocks / lines changed t.o.v. input.
- Aantal paragrafen.
- Aantal sprekers (indien diarized).
- Paragrafen-bron: `llm-indices` of `pause-fallback`.
- Confidence-gating: `aan` (met aantal correcties per matrix-kwadrant: sweet-spot / normalization / review) of `uit` (geen words.json).
- Glossary harmonisatie-tabel: canonical naar variants gecollapseerd, lege tabel als rule 10 niets terugbracht.
- False-starts gedetecteerd (count + voorbeeld): aantal cues waar rule 9 een fragment heeft verwijderd.
- Review queue: aantal entries in REVIEW.md, plus pad. Lege REVIEW.md = niet schrijven, melden als "geen review nodig".
- Review verwerkt in stap 6: N van M cues afgehandeld, breakdown per actie (accept / pick / custom / keep / inaudible / quit). Bij M=0: regel weglaten. Lees uit `pre-improve/v<N>/REVIEW.applied.log` (entries van deze run sinds session-start).
- Backup-locatie: `pre-improve/v<N>/`.

## Lange transcripts

Voor cwd-bestanden die genuinely niet in één pass passen (in de praktijk > ~30000 woorden in `.txt`): splits de SRT in chunks van ~200 cue-blocks met 2 blocks overlap. Voer stap 4 per chunk met de relevante slice van `low_confidence_words` en de volledige glossary, drop de eerste 2 corrected cues van elke chunk N+1 (de overlap), concateneer corrected cues en review-entries. Voer dan rule 10 (glossary-harmonisatie) en rule 11 (paragraph breaks) één keer uit als aparte JSON-pass over de volledige gecorrigeerde cue-array. Validate + decision matrix + write zoals stap 5. Dit pad is rare; standaard is één pass.

## Out-of-band scripts

Niet in deze skill, maar relevant in dezelfde folder-flow:

- `lec-transcribe <audio>`: Whisper/Parakeet ASR. Met word_timestamps produceert `.srt` + `.txt` + `.words.json`.
- `lec-diarize <audio>`: pyannote, produceert `<base>.diarized.srt`.
- `lec-verify-cue <base> <cue_id>`: second-opinion ASR op één cue (whisper-large-v3), voor twijfelgevallen tijdens stap 6.
- `lec-review-html <base>`: genereert `pre-improve/v<N>/REVIEW.html` (single file, audio + diff + decisions UI) plus `clips/<cue>.pad{0,1,3}.wav` per cue. Opent in browser. Default review-pad sinds deze versie van de skill.
- `lec-apply-log <base>`: leest `pre-improve/v<N>/REVIEW.decisions.json` (download uit REVIEW.html) en past elke beslissing toe via `lec-review --apply`. Schrijft naar dezelfde `REVIEW.applied.log` als de TUI.
- `lec-review <base>`: TUI die REVIEW.md interactief doorwandelt vanaf de terminal. Fallback voor wie keyboard-only wil werken of ssh'ed is. Subcommands die de chat-fallback gebruikt:
  - `lec-review <base> --list-json`: cues uit REVIEW.md als JSON-array.
  - `lec-review <base> --play <cue_id>`: speel één cue af (ffplay).
  - `lec-review <base> --apply <cue_id> --decision <accept|keep|inaudible|custom|pick> [--text "..."]`: pas één beslissing toe; rewrite REVIEW.md.

Wijs gebruiker hierop in pre-flight als een van beide ontbreekt en wenselijk is.

## Wat NIET in deze skill

- ASR of diarization (echt audio-werk; staat in `lec-transcribe` / `lec-diarize`).
- Second-opinion ASR per cue blijft out-of-scope (`lec-verify-cue`). Interactieve review (stap 6) is sinds deze versie wel binnen scope.
- Inhoudelijke samenvatting van het transcript (andere skill).
- Vertaling, herformulering, of "verbeteren" van de stijl van de spreker.
- Aanraken van historische `pre-improve/` (flat) of `pre-correct/` folders.

## Gerelateerde skills

- `pdf-reader`: als de bron een transcript-PDF is in plaats van audio.
- `obsidian-markdown` / `schematic-notes`: als de eind-`.txt` daarna in de vault terecht moet.
