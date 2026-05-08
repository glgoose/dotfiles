---
name: syntra-logboek
description: "Genereer een ingevuld Syntra-stagelogboek (.ods) per week op basis van git-commits van Glenn's stage-projecten. Trigger: 'stagedagboek', 'stage logboek', 'syntra logboek', 'logboek week X', of als de gebruiker vraagt om een nieuwe week toe te voegen aan ~/Documents/syntra-ds/stage/logboeken/. Het logboek dient puur administratief; toon is zakelijk en generiek."
---

# Syntra Stagelogboek Generator

## Doel

Per week één LibreOffice/OpenOffice spreadsheet (`.ods`) maken die Glenn kan inleveren als stagedagboek. Alle bestanden komen in `~/Documents/syntra-ds/stage/logboeken/`.

## Outputformaat (vast)

- Eén `.ods`-bestand **per week**: `stagedagboek_weekN.ods` (N = weeknummer in stageperiode).
- Daarnaast altijd een lege `stagedagboek_template.ods` aanwezig houden.
- Vier kolommen: **Dag en datum | Tijdstip | Taak/activiteit | Persoonlijke evaluatie**.
- Per dag **twee rijen** (twee blokken):
  - voormiddag `09:00 - 12:30` (3.5u)
  - namiddag `13:00 - 16:30` (3.5u)
- Dag-en-datum-cel staat alleen op de eerste rij van elke dag, tweede rij blijft leeg.
- Onderaan elke week één **totaalregel**:
  - kolom 1 (Dag): `Totaal week N`
  - kolom 2 (Tijdstip): `<n>u` (5 dagen × 7u = 35u, 4 dagen × 7u = 28u, etc.)
  - kolommen 3-4 leeg
- **Geen** week-header-rij erboven (de bestandsnaam volstaat).
- Kolombreedtes: 3.8cm / 2.8cm / 9cm / 9cm.
- Header-rij met grijze achtergrond (`#d9d9d9`), totaalrij met groene achtergrond (`#e2efda`).

## Toon

Zakelijk, kort, generiek genoeg voor administratief gebruik. Het is een logboek voor de school, niet een technisch dagboek. Concrete techniek mag genoemd worden waar dat natuurlijk uit de commits volgt, maar overdrijf niet. **Geen em-dashes (—)** in de tekst, gebruik komma's, dubbele punten of haakjes.

## Inputs die nodig zijn voor een nieuwe week

Vraag de gebruiker (of leid af uit de vraag):

1. **Weeknummer** in de stage (bv. week 3).
2. **Dagen** waarop gewerkt is (bv. ma-vr 04-08 mei 2026; of een deelweek).
3. Eventuele **bijzondere events** die niet in commits staan (meetings, demos, ziekte, vakantie). Op maandag van week 1 was er bv. een kick-off met Tim.
4. Eventuele uitzonderingen op het standaardrooster.

Als de gebruiker zegt "kijk naar de commits en verzin de rest", neem dan de vrijheid om generieke administratieve activiteiten te bedenken (verkennen, plannen, testen, wrap-up) voor dagen zonder commits.

## Bronrepos voor commit-data

- `~/projects/rivnox/syntra` — Syntra stage-management project (Django).
- `~/projects/rivnox/UHasselt/uhasselt-stage` — UHasselt rivnox-stage-allocatie (Flask/SQLAlchemy).

Gebruik:

```bash
cd ~/projects/rivnox/UHasselt/uhasselt-stage && git log \
  --since="YYYY-MM-DD" --until="YYYY-MM-DD" \
  --pretty=format:"%ad|%s" --date=format:"%Y-%m-%d %H:%M"
```

(En idem voor `~/projects/rivnox/syntra`.)

Groepeer commits per dag, dan per voor-/namiddag op basis van timestamp (vóór ~13u = vm, daarna = nm). Op rustige dagen mag je commits van een paar uur samenvoegen tot één activiteit.

## Per dag invullen

Voor elke dag, voor elk blok (vm + nm), schrijf:

- **Taak/activiteit**: één tot drie zinnen, beschrijft concreet wat er gedaan is. Mag verwijzen naar commits met *(commits)* of zonder, doet er niet toe.
- **Persoonlijke evaluatie**: één tot twee zinnen reflectie. Niet té enthousiast, niet té negatief. Wat ging goed, wat was lastig, wat is de volgende stap.

Mapping commit-types op evaluatie-tone:
- `feat:` → "werkt zoals bedoeld", "voelt goed in praktijk", "stap vooruit voor X"
- `fix:` → "kostte even, opgelost", "leerzaam"
- `refactor:` / `chore:` → "schoner nu", "scheelt straks tijd"
- `docs:` → "scheelt voor wie het overneemt"
- `db:` / `sec:` → "belangrijke pass, checklist groen(er)"

Voor dagen zonder commits, kies één van: codebase verkennen, datamodellen vergelijken, vragen verzamelen, capaciteit/invarianten op papier, testsuite draaien, backlog uitwerken, stakeholderfeedback verwerken, weekly wrap-up met Tim.

## Implementatie

Gebruik het bestaande generatorscript op `~/.claude/skills/syntra-logboek/build_ods.py` als startpunt. Belangrijke functies daarin:

- `write_ods(path, content_body)` — bouwt minimaal-conforme `.ods` (zip met `mimetype`, `META-INF/manifest.xml`, `meta.xml`, `styles.xml`, `content.xml`).
- `header_row()` — vier kolomkoppen, grijs.
- `empty_day_rows()` — twee rijen, voormiddag + namiddag, leeg.
- `total_row(label, hours_text)` — totaalregel met label in kolom 1 en uren in kolom 2.
- `render_week(week_data, total_label, total_hours)` — bouwt alle rijen voor één week.
- `WEEK1`, `WEEK2`, ... — lijst van `(day_label, [(time, task, eval), (time, task, eval)])`.

Stappen:

1. Voeg een nieuwe `WEEKN` constante toe aan het script (of maak een variant `/tmp/build_ods_weekN.py`).
2. Roep `write_ods(os.path.join(OUT_DIR, "stagedagboek_weekN.ods"), table("Week N", render_week(WEEKN, "Totaal week N", "<uren> u")))` aan.
3. Voer uit: `python3 ~/.claude/skills/syntra-logboek/build_ods.py`.
4. Verifieer:
   - `ls ~/Documents/syntra-ds/stage/logboeken/` — nieuw bestand aanwezig.
   - XML valid: `python3 -c "import zipfile,xml.etree.ElementTree as ET; z=zipfile.ZipFile('<pad>'); [ET.fromstring(z.read(n)) for n in ['content.xml','styles.xml','meta.xml','META-INF/manifest.xml']]"`.
   - Render check: `soffice --headless --convert-to pdf <pad> --outdir /tmp` levert een PDF zonder errors.
5. Open in LibreOffice voor visuele controle: `open ~/Documents/syntra-ds/stage/logboeken/stagedagboek_weekN.ods`.

## Skelet voor een nieuwe week (vul in)

```python
WEEKN = [
    ("Maandag DD-MM-YYYY", [
        ("09:00 - 12:30",
         "<voormiddag taak>",
         "<voormiddag evaluatie>"),
        ("13:00 - 16:30",
         "<namiddag taak>",
         "<namiddag evaluatie>"),
    ]),
    # ... idem voor di/wo/do/vr
]

write_ods(
    os.path.join(OUT_DIR, "stagedagboek_weekN.ods"),
    table("Week N", render_week(WEEKN, "Totaal week N", "35 u")),
)
```

## Belangrijke randvoorwaarden

- **`mimetype`** moet de eerste entry in de zip zijn én ongecomprimeerd opgeslagen (`ZIP_STORED`). Anders weigert LibreOffice het bestand.
- Tekst via `xml.sax.saxutils.escape` zodat `&`, `<`, `>` in commit-messages het bestand niet breken.
- Multi-line tekst in een cel: split op `\n` en wrap elke regel in `<text:p>`.
- Cellen die je leeg wil tonen maar wel een border/style moeten hebben: gebruik `<table:table-cell table:style-name="cell"/>` (geen `office:value-type`).

## Antwoord aan de gebruiker

Sluit af met:
- Pad naar het nieuwe bestand.
- Bevestiging dat het opent in LibreOffice (eventueel via `open <pad>`).
- Korte samenvatting (welke dagen, welke hoofdactiviteiten, totaalaantal uren).
