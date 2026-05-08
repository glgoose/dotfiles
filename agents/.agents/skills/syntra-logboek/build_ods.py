#!/usr/bin/env python3
"""Build minimal ODS spreadsheets: blank template + filled stagedagboek."""
import os
import zipfile
from xml.sax.saxutils import escape

OUT_DIR = os.path.expanduser("~/Documents/syntra-ds/stage/logboeken")
os.makedirs(OUT_DIR, exist_ok=True)

MIMETYPE = "application/vnd.oasis.opendocument.spreadsheet"

MANIFEST = """<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
 <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.spreadsheet"/>
 <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
 <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
 <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>
"""

META = """<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"
 xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.2">
 <office:meta>
  <dc:title>Stagedagboek</dc:title>
  <meta:generator>handcrafted</meta:generator>
 </office:meta>
</office:document-meta>
"""

STYLES = """<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:fo="urn:oasis:names:tc:xsl-fo-compatible:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 office:version="1.2">
 <office:styles>
  <style:default-style style:family="table-cell">
   <style:text-properties fo:font-family="Liberation Sans" fo:font-size="10pt"/>
  </style:default-style>
 </office:styles>
</office:document-styles>
"""

CONTENT_HEAD = """<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:fo="urn:oasis:names:tc:xsl-fo-compatible:1.0"
 office:version="1.2">
 <office:automatic-styles>
  <style:style style:name="col-dag" style:family="table-column">
   <style:table-column-properties style:column-width="3.8cm"/>
  </style:style>
  <style:style style:name="col-tijd" style:family="table-column">
   <style:table-column-properties style:column-width="2.8cm"/>
  </style:style>
  <style:style style:name="col-taak" style:family="table-column">
   <style:table-column-properties style:column-width="9cm"/>
  </style:style>
  <style:style style:name="col-eval" style:family="table-column">
   <style:table-column-properties style:column-width="9cm"/>
  </style:style>
  <style:style style:name="hdr" style:family="table-cell">
   <style:table-cell-properties fo:background-color="#d9d9d9" fo:border="0.05pt solid #000000"/>
   <style:text-properties fo:font-weight="bold"/>
  </style:style>
  <style:style style:name="cell" style:family="table-cell">
   <style:table-cell-properties fo:border="0.05pt solid #000000" style:vertical-align="top" fo:wrap-option="wrap"/>
   <style:text-properties fo:font-size="10pt"/>
  </style:style>
  <style:style style:name="weekhdr" style:family="table-cell">
   <style:table-cell-properties fo:background-color="#b4c7e7" fo:border="0.05pt solid #000000"/>
   <style:text-properties fo:font-weight="bold" fo:font-size="11pt"/>
  </style:style>
  <style:style style:name="totaal" style:family="table-cell">
   <style:table-cell-properties fo:background-color="#e2efda" fo:border="0.05pt solid #000000"/>
   <style:text-properties fo:font-weight="bold"/>
  </style:style>
 </office:automatic-styles>
 <office:body>
  <office:spreadsheet>
"""

CONTENT_TAIL = """  </office:spreadsheet>
 </office:body>
</office:document-content>
"""


def cell(text, style="cell"):
    if text == "":
        return f'    <table:table-cell table:style-name="{style}"/>\n'
    lines = text.split("\n")
    inner = "".join(f"<text:p>{escape(ln)}</text:p>" for ln in lines)
    return (
        f'    <table:table-cell table:style-name="{style}" '
        f'office:value-type="string">{inner}</table:table-cell>\n'
    )


def row(cells, style="cell"):
    out = "   <table:table-row>\n"
    for c in cells:
        out += cell(c, style)
    out += "   </table:table-row>\n"
    return out


def weekheader_row(label):
    return (
        '   <table:table-row>\n'
        f'    <table:table-cell table:style-name="weekhdr" office:value-type="string" '
        f'table:number-columns-spanned="4"><text:p>{escape(label)}</text:p></table:table-cell>\n'
        '    <table:covered-table-cell/>\n'
        '    <table:covered-table-cell/>\n'
        '    <table:covered-table-cell/>\n'
        '   </table:table-row>\n'
    )


def total_row(label, hours_text):
    """Total row: label in col 1 (Dag), uren in col 2 (Tijdstip), rest leeg."""
    return (
        '   <table:table-row>\n'
        f'    <table:table-cell table:style-name="totaal" office:value-type="string">'
        f'<text:p>{escape(label)}</text:p></table:table-cell>\n'
        f'    <table:table-cell table:style-name="totaal" office:value-type="string">'
        f'<text:p>{escape(hours_text)}</text:p></table:table-cell>\n'
        '    <table:table-cell table:style-name="totaal"/>\n'
        '    <table:table-cell table:style-name="totaal"/>\n'
        '   </table:table-row>\n'
    )


def header_row():
    cells = ["Dag en datum", "Tijdstip", "Taak/activiteit", "Persoonlijke evaluatie"]
    return row(cells, style="hdr")


def empty_day_rows():
    """Two blocks per day, day-cell only on first row."""
    out = ""
    out += row(["", "09:00 - 12:30", "", ""])
    out += row(["", "13:00 - 16:30", "", ""])
    return out


def table(name, body):
    return (
        f'   <table:table table:name="{escape(name)}">\n'
        '    <table:table-column table:style-name="col-dag"/>\n'
        '    <table:table-column table:style-name="col-tijd"/>\n'
        '    <table:table-column table:style-name="col-taak"/>\n'
        '    <table:table-column table:style-name="col-eval"/>\n'
        f"{body}"
        "   </table:table>\n"
    )


def write_ods(path, content_body):
    content = CONTENT_HEAD + content_body + CONTENT_TAIL
    if os.path.exists(path):
        os.remove(path)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        zi = zipfile.ZipInfo("mimetype")
        zi.compress_type = zipfile.ZIP_STORED
        z.writestr(zi, MIMETYPE)
        z.writestr("META-INF/manifest.xml", MANIFEST)
        z.writestr("meta.xml", META)
        z.writestr("styles.xml", STYLES)
        z.writestr("content.xml", content)


# ---- Template (single week) ----
def build_template():
    body = header_row()
    for _ in range(5):
        body += empty_day_rows()
    body += total_row("Totaal week", "... u")
    return table("Stagedagboek", body)


write_ods(os.path.join(OUT_DIR, "stagedagboek_template.ods"), build_template())


# ---- Filled stagedagboek ----
# Each entry: (day_label, [(time, task, evaluation), (time, task, evaluation)])
WEEK1 = [
    ("Maandag 20-04-2026", [
        ("09:00 - 12:30",
         "Kick-off meeting met Tim: scope, planning en verwachtingen voor de stage doorgenomen. Afspraken gemaakt rond beide sporen (Syntra stage-management en UHasselt stage-allocatie).",
         "Goede aftrap. Duidelijk beeld van wat er van mij verwacht wordt en in welke richting we gaan."),
        ("13:00 - 16:30",
         "Toegang tot beide repos geregeld en lokale dev-omgeving opgezet (Python, dependencies, .env-bestanden). README's van beide projecten doorgenomen.",
         "Setup verliep vlot. Klein beetje gedoe met versies, maar uiteindelijk alles werkend gekregen."),
    ]),
    ("Dinsdag 21-04-2026", [
        ("09:00 - 12:30",
         "Syntra Django-codebase verkend: modules accounts, companies, internships, management. Routing en templates doorgelopen.",
         "Architectuur grotendeels helder. Een paar plekken waar logica wat verspreid zit, daar moet ik later op terugkomen."),
        ("13:00 - 16:30",
         "UHasselt Flask-app verkend (blueprints, modellen). Datamodellen van beide projecten naast elkaar gelegd en eerste vragenlijst opgesteld.",
         "Nuttig om de twee modellen te vergelijken. Verschillen zitten vooral rond hoe stages aan studenten gekoppeld worden."),
    ]),
    ("Woensdag 22-04-2026", [
        ("09:00 - 12:30",
         "Syntra: walking skeleton sprint 1 opgezet. Basisstructuur, routing en eerste templates op hun plek gezet.",
         "Eerste werkende versie staat. Klein maar voldoende om verder op door te bouwen."),
        ("13:00 - 16:30",
         "Seed data toegevoegd voor de Data Scientist VDO 2025-2026 cohorte. README bijgewerkt met setup-instructies.",
         "Met realistische seed data is het meteen makkelijker om de UI uit te proberen. Documentatie meteen mee bijgewerkt."),
    ]),
    ("Donderdag 23-04-2026", [
        ("09:00 - 12:30",
         "UHasselt: dieper in de bestaande blueprints en SQLAlchemy-modellen gedoken, vooral rond capaciteit per masterjaar.",
         "Het stuk rond capaciteit is wat complex. Heb tijd genomen om de invarianten op papier te zetten."),
        ("13:00 - 16:30",
         "Testsuite lokaal gedraaid, kleine inconsistenties in de seed gefixt en docs bijgewerkt.",
         "Niets spannends, maar wel handig om de testsuite te zien draaien voor ik begin met grotere wijzigingen."),
    ]),
    ("Vrijdag 24-04-2026", [
        ("09:00 - 12:30",
         "Backlog uitgewerkt op basis van stakeholderfeedback en input van Tim. Prioritering voor week 2 vastgelegd.",
         "Plan voelt realistisch. Focus voor volgende week ligt op security/correctheid en UI-polish van de toewijzingsschermen."),
        ("13:00 - 16:30",
         "Wekelijkse wrap-up: stand van zaken doorgegeven aan Tim, openstaande vragen genoteerd, agenda voor week 2 afgesproken.",
         "Goeie afsluiter van week 1. Voldoende grip op beide codebases om volgende week productiever te zijn."),
    ]),
]

WEEK2 = [
    ("Maandag 27-04-2026", [
        ("09:00 - 12:30",
         "UHasselt: vaste demo-accounts toegevoegd voor de stakeholderdemo en login-flow getest.",
         "Kleine quality-of-life-verbetering. Demo's worden hierdoor een stuk minder hectisch."),
        ("13:00 - 16:30",
         "Migratie naar uv voor dependency management voorbereid. Plan voor de security-fase opgesteld.",
         "Plan is concreet genoeg om er morgen direct aan te beginnen."),
    ]),
    ("Dinsdag 28-04-2026", [
        ("09:00 - 12:30",
         "Migratie naar uv afgerond, setup-docs bijgewerkt. Port 5001 + TEMPLATES_AUTO_RELOAD ingesteld. Phase 1 security pass: CSRF, secret key, sessies, PDF magic bytes, rate limiting.",
         "Builds zijn merkbaar sneller met uv. De security-checklist is na deze pass voor het grootste deel groen."),
        ("13:00 - 16:30",
         "Phase 2 correctheidsbugs aangepakt. Phase 3 db: FK cascades, indexes, status checks, invite-tz. Phase 4 a11y/ops polish + topnav v5 redesign + Toewijzingen-merge.",
         "Lange middag, maar veel verzet. Phase 3-migratie op een gevulde SQLite gaf gedoe, opgelost."),
    ]),
    ("Woensdag 29-04-2026", [
        ("09:00 - 12:30",
         "Drag-and-drop swap op de assignment-grid afgewerkt. UNIQUE constraint bij swap met delete-and-insert opgelost. Per-master remaining capacity zichtbaar in de grid.",
         "Drag-and-drop voelt goed in de praktijk. Capaciteitsindicatie geeft meteen visueel feedback."),
        ("13:00 - 16:30",
         "Toolbar redesign geimplementeerd met Alpine.js (single-row toolbar, inline legend, .btn-confirm-all). Grid gesplitst per masterjaar in drie cohort-tabellen (M1, M2, vervroegd).",
         "Mooie UI-stap. Stakeholders vroegen al een tijd om de split per masterjaar, fijn dat het nu staat."),
    ]),
    ("Donderdag 30-04-2026", [
        ("09:00 - 12:30",
         "/assign geconsolideerd op mockup-C toolbar. Breakpoints gedocumenteerd. Responsive cell card met progressive disclosure ingebouwd.",
         "Workflow is nu goed beschreven, scheelt straks tijd voor wie het overneemt."),
        ("13:00 - 16:30",
         "Onderlijnde tab bar met url-param (m1/m2/vervroegd) + responsive toolbar reflow + grotere celfont (locatie weggelaten, 2-line tot xl). Wrap-up week 2 met Tim.",
         "Goede afsluiter. Demo-klare staat van de UI; volgende stap is feedback van de stakeholders inwerken."),
    ]),
]


def render_week(week_data, total_label, total_hours):
    out = header_row()
    for day_label, blocks in week_data:
        first = True
        for time, task, evalu in blocks:
            day_cell = day_label if first else ""
            out += row([day_cell, time, task, evalu])
            first = False
    out += total_row(total_label, total_hours)
    return out


write_ods(
    os.path.join(OUT_DIR, "stagedagboek_week1.ods"),
    table("Week 1", render_week(WEEK1, "Totaal week 1", "35 u")),
)
write_ods(
    os.path.join(OUT_DIR, "stagedagboek_week2.ods"),
    table("Week 2", render_week(WEEK2, "Totaal week 2", "28 u")),
)

# Clean up older combined output if present
old = os.path.join(OUT_DIR, "stagedagboek_week1-2.ods")
if os.path.exists(old):
    os.remove(old)

print("done")
print(sorted(os.listdir(OUT_DIR)))
