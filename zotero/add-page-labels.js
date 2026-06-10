// Add Page Labels — Actions & Tags snippet for Zotero 8
//
// Setup: register in Actions & Tags as "Add Page Labels"
//   Trigger: Item context menu  |  Operation: Custom script
//
// Works on: book, bookSection, or a PDF attachment item.
// Calls bin/pagelabel to auto-detect and write /PageLabels.
// Skips PDFs that already have labels (use --force to overwrite).

const FORCE      = false;  // set true to overwrite existing labels
const UV         = '/opt/homebrew/bin/uv';
const PAGELABEL  = '/Users/glenn/dotfiles/bin/pagelabel';

// ── helpers ──────────────────────────────────────────────────────────────────

function showToast(msg, headline = 'Add Page Labels', ms = 4000) {
    const pw = new Zotero.ProgressWindow({ closeOnClick: true });
    pw.show();
    pw.changeHeadline(headline);
    pw.addDescription(msg);
    pw.startCloseTimer(ms);
}

function dbg(msg) { Zotero.debug(`[add-page-labels] ${msg}`); }
function err(msg) { Zotero.log(`[add-page-labels] ${msg}`); }

// ── main ─────────────────────────────────────────────────────────────────────

try {

const subprocess = Zotero.Utilities.Internal.subprocess.bind(Zotero.Utilities.Internal);

if (!item) { dbg('aborted: item is null'); return; }

// Resolve PDF attachment: accept the item itself if it's an attachment,
// otherwise look for the best attachment on a regular item.
let pdfAttachment = null;

if (item.isAttachment()) {
    if (item.attachmentContentType === 'application/pdf') {
        pdfAttachment = item;
    } else {
        showToast('Selected attachment is not a PDF');
        return;
    }
} else {
    const att = await item.getBestAttachment();
    if (!att || att.attachmentContentType !== 'application/pdf') {
        dbg(`aborted: no PDF attachment on item ${item.id}`);
        showToast('No PDF attachment found on this item');
        return;
    }
    pdfAttachment = att;
}

const pdfPath = await pdfAttachment.getFilePathAsync();
if (!pdfPath) {
    err(`could not resolve file path for attachment ${pdfAttachment.id}`);
    showToast('Could not resolve PDF file path');
    return;
}

dbg(`item=${item.id} pdf=${pdfPath} force=${FORCE}`);
showToast('Detecting page labels…', 'Add Page Labels', 20000);

const args = FORCE
    ? ['-c', `PATH="/opt/homebrew/bin:$PATH" "${UV}" run --quiet --script "${PAGELABEL}" --force "${pdfPath}" 2>&1; echo "EXITCODE:$?"`]
    : ['-c', `PATH="/opt/homebrew/bin:$PATH" "${UV}" run --quiet --script "${PAGELABEL}" "${pdfPath}" 2>&1; echo "EXITCODE:$?"`];

let raw = '';
try {
    raw = await subprocess('/bin/bash', args);
} catch (e) {
    raw = `EXITCODE:1\n${e.message || String(e)}`;
}

const lines    = (raw || '').trim().split('\n');
const exitLine = lines.find(l => l.startsWith('EXITCODE:')) || 'EXITCODE:1';
const codeRaw  = parseInt(exitLine.replace('EXITCODE:', ''), 10);
const code     = isNaN(codeRaw) ? 1 : codeRaw;
const output   = lines.filter(l => !l.startsWith('EXITCODE:')).join('\n').trim();

err(`pagelabel exit=${code} output='${output}'`);

if (code === 0) {
    // output contains lines like "file.pdf: labeled (1: 7:D)" or "file.pdf: already labeled, skipping"
    const labelLine = output.split('\n').pop() || '';
    const alreadyDone = labelLine.includes('already labeled');
    if (alreadyDone) {
        showToast('Already has page labels (use FORCE=true to overwrite)');
    } else {
        const specMatch = labelLine.match(/labeled \((.+)\)/);
        const spec = specMatch ? specMatch[1] : output;
        showToast(`Labels added: ${spec}`);
    }
} else if (code === 2) {
    // refused — detection failed or ambiguous
    const m = output.match(/refused,\s*(.+)$/m);
    const reason = m ? m[1].trim() : (output.split('\n').pop() || 'detection refused');
    err(`pagelabel refused: ${reason}`);
    showToast(`Refused: ${reason}`);
} else {
    err(`pagelabel error: ${output}`);
    showToast(`Error: ${output || 'unknown error'}`);
}

} catch (e) {
    err('unexpected: ' + (e.message || e));
    showToast('Error: ' + (e.message || e));
}
