// Attach ISBN downloads — Actions & Tags snippet for Zotero 8
// Spec: ~/dotfiles/docs/isbn-download.md
//
// Setup: register in Actions & Tags as "Attach ISBN downloads"
//   Trigger: Menubar (Tools menu) AND keyboard shortcut.
//   Operation: Custom script. No item selection required.
//
// Pairs with ~/dotfiles/bin/isbn-download, which saves files to ~/Downloads/.
// This script scans ~/Downloads/ for PDF/EPUB files whose name contains any
// valid ISBN (check-digit validated), looks the ISBN up in Zotero, and
// attaches the file. The Python script only saves files for ISBNs it already
// matched against Zotero, so a miss here is a bug, not a missing item — we
// move the file to unmatched/ rather than auto-creating a duplicate item.
//
// Disposition after processing:
//   - newly attached / already-attached in Zotero  → macOS Trash (osascript)
//   - ISBN not found in Zotero                     → ~/Downloads/unmatched/
//   - importFromFile threw                         → ~/Downloads/unmatched/
//   - no valid ISBN in filename                    → left in ~/Downloads/

const DOWNLOADS = '/Users/glenn/Downloads';
const UNMATCHED = `${DOWNLOADS}/unmatched`;
const EXT_RE    = /\.(pdf|epub)$/i;
const DIGIT_RUN = /(?<!\d)\d{10,13}(?!\d)/g;

const exec = Zotero.Utilities.Internal.exec.bind(Zotero.Utilities.Internal);

// ── helpers ──────────────────────────────────────────────────────────────────

function showToast(msg, headline = 'Attach ISBN downloads') {
    const pw = new Zotero.ProgressWindow({ closeOnClick: true });
    pw.show();
    pw.changeHeadline(headline);
    pw.addDescription(msg);
    pw.startCloseTimer(8000);
}

// All check-digit-valid ISBNs found anywhere in `name`, in filename order,
// deduped. `bin/isbn-download` writes the searched ISBN first in the filename,
// but AA-derived names can carry alternate-edition ISBNs too, so we try them
// all rather than committing to the first.
function findIsbnsInName(name) {
    const candidates = name.match(DIGIT_RUN) || [];
    const out = [];
    const seen = new Set();
    for (const c of candidates) {
        const clean = Zotero.Utilities.cleanISBN(c);
        if (clean && !seen.has(clean)) {
            seen.add(clean);
            out.push(clean);
        }
    }
    return out;
}

// ISBN-10 ↔ ISBN-13 conversion so a Zotero item stored as one form still
// matches a filename carrying the other. Zotero.Utilities.cleanISBN validates
// but doesn't convert across formats.
function isbn10to13(isbn10) {
    if (!/^\d{9}[\dX]$/i.test(isbn10)) return null;
    const core = '978' + isbn10.slice(0, 9);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(core[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return core + check;
}

function isbn13to10(isbn13) {
    if (!/^978\d{10}$/.test(isbn13)) return null;
    const core = isbn13.slice(3, 12);
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(core[i], 10) * (10 - i);
    }
    const r = (11 - (sum % 11)) % 11;
    const check = r === 10 ? 'X' : String(r);
    return core + check;
}

function isbnVariants(isbn) {
    const out = new Set([isbn]);
    if (isbn.length === 10) {
        const v = isbn10to13(isbn);
        if (v) out.add(v);
    } else if (isbn.length === 13) {
        const v = isbn13to10(isbn);
        if (v) out.add(v);
    }
    return out;
}

// AppleScript Finder "delete" = move to Trash, preserves Put Back metadata.
async function moveToTrash(path) {
    const script = `tell application "Finder" to delete POSIX file "${path.replace(/"/g, '\\"')}"`;
    await exec('/usr/bin/osascript', ['-e', script]);
}

async function moveToUnmatched(path, filename) {
    await IOUtils.makeDirectory(UNMATCHED, { ignoreExisting: true });
    await IOUtils.move(path, `${UNMATCHED}/${filename}`);
}

// ── build ISBN → item index ─────────────────────────────────────────────────
//
// Register every ISBN that appears in any regular item's ISBN field, in both
// the as-stored form and the cleanISBN-normalized form (so a 13-digit lookup
// hits items stored as 10-digit and vice versa).

const libraryID = Zotero.Libraries.userLibraryID;
const allItems  = await Zotero.Items.getAll(libraryID, true);

const byIsbn = new Map();
for (const it of allItems) {
    if (!it.isRegularItem()) continue;
    const raw = it.getField('ISBN', false, true) || '';
    for (const part of raw.split(/\s+/)) {
        if (!part) continue;
        const stripped = part.replace(/[-\s]/g, '');
        if (stripped) byIsbn.set(stripped, it);
        const clean = Zotero.Utilities.cleanISBN(stripped);
        if (!clean) continue;
        for (const v of isbnVariants(clean)) byIsbn.set(v, it);
    }
}

// ── scan ~/Downloads/ ───────────────────────────────────────────────────────

let children;
try {
    children = await IOUtils.getChildren(DOWNLOADS);
} catch (e) {
    showToast(`Cannot read ${DOWNLOADS}: ${e.message || e}`);
    return;
}

let attached = 0, skipped = 0, unmatched = 0, noIsbn = 0, errored = 0;

async function safeTrash(path, filename) {
    try {
        await moveToTrash(path);
    } catch (e) {
        Zotero.debug(`attach-isbn-downloads: trash failed for ${filename}: ${e.message || e}`);
    }
}

async function safeUnmatched(path, filename) {
    try {
        await moveToUnmatched(path, filename);
    } catch (e) {
        Zotero.debug(`attach-isbn-downloads: move-to-unmatched failed for ${filename}: ${e.message || e}`);
    }
}

for (const path of children) {
    const filename = path.split('/').pop();
    const extMatch = filename.match(EXT_RE);
    if (!extMatch) continue;
    const ext = extMatch[1].toLowerCase();

    const isbns = findIsbnsInName(filename);
    if (!isbns.length) { noIsbn++; continue; }

    let target = null;
    for (const isbn of isbns) {
        for (const v of isbnVariants(isbn)) {
            if (byIsbn.has(v)) { target = byIsbn.get(v); break; }
        }
        if (target) break;
    }
    if (!target) {
        await safeUnmatched(path, filename);
        unmatched++;
        continue;
    }

    // Already-attached in Zotero — file is redundant, trash it.
    const has = target.getAttachments()
        .map(aid => Zotero.Items.get(aid))
        .some(a => {
            if (!a) return false;
            const ct = a.attachmentContentType || '';
            return (ext === 'pdf'  && ct.includes('pdf'))
                || (ext === 'epub' && ct.includes('epub'));
        });
    if (has) {
        await safeTrash(path, filename);
        skipped++;
        continue;
    }

    const contentType = ext === 'pdf' ? 'application/pdf' : 'application/epub+zip';
    try {
        await Zotero.Attachments.importFromFile({
            file: path,
            parentItemID: target.id,
            contentType,
            fileBaseName: Zotero.Attachments.getFileBaseNameFromItem(target),
        });
    } catch (e) {
        Zotero.debug(`attach-isbn-downloads: importFromFile failed on ${filename}: ${e.message || e}`);
        await safeUnmatched(path, filename);
        errored++;
        continue;
    }

    await safeTrash(path, filename);
    attached++;
}

const parts = [`Attached ${attached}`, `Skipped ${skipped}`];
if (unmatched) parts.push(`Unmatched ${unmatched}`);
if (errored)   parts.push(`Errors ${errored}`);
if (noIsbn)    parts.push(`No ISBN ${noIsbn}`);
showToast(parts.join(' · '));
