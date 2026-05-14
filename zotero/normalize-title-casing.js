// Normalize title casing by language — Actions & Tags snippet for Zotero 8
//
// Setup: register in Actions & Tags as "Normalize title casing by language"
//   Event: Create item  |  Operation: Custom script
//
// Behavior by item language field:
//   en/eng/english           -> Chicago title case (preserves ALL-CAPS,
//                               mixed-case tokens, Roman numerals when input
//                               already has mixed casing)
//   nl/fr/it/es and variants -> sentence case (first letter cap, lowercase rest;
//                               acronyms preserved only when input had mixed case)
//   de/deu/ger/etc.          -> skipped (German capitalizes all nouns)
//   anything else / empty    -> skipped
//
// Idempotent: re-running on an already-normalized title is a no-op,
// so triggering on item-add does not loop.

if (!item || !item.isRegularItem || !item.isRegularItem()) return;

function toast(headline, msg) {
    const pw = new Zotero.ProgressWindow({ closeOnClick: true });
    pw.show();
    pw.changeHeadline(headline);
    pw.addDescription(msg);
    pw.startCloseTimer(3000);
}

const LANG_MAP = {
    'en': 'title', 'eng': 'title', 'english': 'title',

    'nl': 'sentence', 'nld': 'sentence', 'dut': 'sentence',
    'dutch': 'sentence', 'nederlands': 'sentence',

    'fr': 'sentence', 'fra': 'sentence', 'fre': 'sentence',
    'french': 'sentence', 'français': 'sentence', 'francais': 'sentence',

    'it': 'sentence', 'ita': 'sentence',
    'italian': 'sentence', 'italiano': 'sentence',

    'es': 'sentence', 'spa': 'sentence',
    'spanish': 'sentence', 'español': 'sentence', 'espanol': 'sentence',

    'de': 'skip', 'deu': 'skip', 'ger': 'skip',
    'german': 'skip', 'deutsch': 'skip',
};

const SMALL_WORDS = new Set([
    'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of',
    'on', 'or', 'per', 'the', 'to', 'up', 'via', 'vs', 'vs.', 'with', 'yet',
]);

const LETTER = 'A-Za-zÀ-ÖØ-Þà-öø-ÿ';
const LOWER  = 'a-zà-öø-ÿ';
const UPPER  = 'A-ZÀ-ÖØ-Þ';

const RE_LETTER = new RegExp(`[${LETTER}]`);
const RE_LOWER  = new RegExp(`[${LOWER}]`);
const RE_UPPER  = new RegExp(`[${UPPER}]`);

function normalizeLang(raw) {
    if (!raw) return '';
    return String(raw).trim().toLowerCase().split(/[-_]/)[0];
}

function hasUpperPastFirst(tok) {
    return RE_UPPER.test(tok.slice(1));
}

function isAllUpperWord(tok) {
    if (!RE_LETTER.test(tok)) return false;
    return tok === tok.toUpperCase() && tok !== tok.toLowerCase();
}

function isRomanNumeral(tok) {
    return /^[IVXLCDM]+$/.test(tok);
}

function capFirstLetter(s) {
    // Cap first alphabetic char only when preceded by non-alphanumeric chars,
    // so "20th" stays "20th" but "(self" becomes "(Self" and '"the' becomes '"The'.
    return s.replace(
        new RegExp(`^([^${LETTER}0-9]*)([${LOWER}])`),
        (_, pre, ch) => pre + ch.toUpperCase()
    );
}

function capHyphenatedParts(tok) {
    return tok.split('-').map(capFirstLetter).join('-');
}

function tokenize(s) {
    return s.split(/(\s+)/).map(p => ({ text: p, isSpace: /^\s+$/.test(p) }));
}

function endsSentence(tok) {
    return /[:?!.]$/.test(tok.replace(/[)\]"'»›]+$/, ''));
}

function stripEdgePunct(s) {
    return s
        .replace(new RegExp(`[^${LOWER}.]+$`), '')
        .replace(new RegExp(`^[^${LOWER}]+`), '');
}

function titleCase(s) {
    const hasMixed = RE_LOWER.test(s) && RE_UPPER.test(s);
    const tokens = tokenize(s);
    const wordIdx = tokens.map((t, i) => t.isSpace ? -1 : i).filter(i => i >= 0);
    if (wordIdx.length === 0) return s;
    const firstIdx = wordIdx[0];
    const lastIdx  = wordIdx[wordIdx.length - 1];

    let prevEndsSentence = true;

    for (const i of wordIdx) {
        const tok = tokens[i].text;

        if (hasMixed && (hasUpperPastFirst(tok) || isRomanNumeral(tok))) {
            prevEndsSentence = endsSentence(tok);
            continue;
        }

        const lower = tok.toLowerCase();
        const isSmall = SMALL_WORDS.has(stripEdgePunct(lower));

        if (isSmall && i !== firstIdx && i !== lastIdx && !prevEndsSentence) {
            tokens[i].text = lower;
        } else {
            tokens[i].text = capHyphenatedParts(lower);
        }
        prevEndsSentence = endsSentence(tokens[i].text);
    }
    return tokens.map(t => t.text).join('');
}

function sentenceCase(s) {
    const hasMixed = RE_LOWER.test(s) && RE_UPPER.test(s);
    const tokens = tokenize(s);

    for (const t of tokens) {
        if (t.isSpace) continue;
        const tok = t.text;
        if (hasMixed) {
            const letterCount = (tok.match(new RegExp(`[${LETTER}]`, 'g')) || []).length;
            if (isAllUpperWord(tok) && letterCount >= 2) continue;
            if (hasUpperPastFirst(tok)) continue;
        }
        t.text = tok.toLowerCase();
    }

    let result = tokens.map(t => t.text).join('');
    result = capFirstLetter(result);
    return result.replace(
        new RegExp(`([:?!])(\\s+)([${LOWER}])`, 'g'),
        (_, sep, sp, ch) => sep + sp + ch.toUpperCase()
    );
}

// ── main ─────────────────────────────────────────────────────────────────────

try {
    const mode = LANG_MAP[normalizeLang(item.getField('language'))];
    if (!mode || mode === 'skip') return;

    const title = item.getField('title');
    if (!title || !title.trim()) return;

    const newTitle = (mode === 'title') ? titleCase(title) : sentenceCase(title);
    if (newTitle === title) return;

    Zotero.log(`[normalize-title-casing] (${mode}) "${title}" -> "${newTitle}"`);
    item.setField('title', newTitle);
    await item.saveTx();
    toast('Title normalized', newTitle);
} catch (e) {
    const msg = e && e.message ? e.message : String(e);
    Zotero.log(`[normalize-title-casing] error: ${msg}`);
    toast('Normalize title — error', msg);
}
