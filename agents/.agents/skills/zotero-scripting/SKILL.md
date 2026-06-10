---
name: zotero-scripting
description: Write or edit Zotero Actions & Tags custom scripts (.js). Covers the script skeleton, environment gotchas (PATH, bindings, silent swallowing), data model, ProgressWindow API, and subprocess patterns. Use whenever writing or modifying any Zotero A&T script in zotero/*.js.
---

## Script skeleton

Every A&T script follows this structure — no code outside the `try {}`:

```js
// ── helpers ──────────────────────────────────────────────────────────────────

function showToast(msg, headline = 'Action Name', ms = 4000) {
    const pw = new Zotero.ProgressWindow({ closeOnClick: true });
    pw.show();                    // must come before changeHeadline/addDescription
    pw.changeHeadline(headline);
    pw.addDescription(msg);
    pw.startCloseTimer(ms);
}

function dbg(msg) { Zotero.debug('[script-name] ' + msg); }
function err(msg) { Zotero.log('[script-name] ' + msg); }

// ── main ─────────────────────────────────────────────────────────────────────

try {

// ALL setup code lives here — bindings, constants, everything
const subprocess = Zotero.Utilities.Internal.subprocess.bind(Zotero.Utilities.Internal);
const exec       = Zotero.Utilities.Internal.exec.bind(Zotero.Utilities.Internal);

if (!item) { dbg('aborted: item is null'); return; }

// ... script logic ...

} catch (e) {
    err('unexpected: ' + (e.message || e));
    showToast('Error: ' + (e.message || e));
}
```

## Critical footgun: nothing before `try {}`

**Anything before `try {` that throws is silently swallowed** — no toast, no Error Console
entry. This includes bindings, `const` declarations, any initialization. Put everything inside
the `try` block. Discovered during `add-page-labels.js` debugging: the `subprocess` binding
was outside `try`, crashed silently, left zero trace.

## Logging

- `err(msg)` → `Zotero.log()` → surfaces in **Error Console** (`Tools → Error Console`). Use for anything that ends a flow or signals a problem.
- `dbg(msg)` → `Zotero.debug()` → Debug Output only. Use for verbose trace.
- `showToast(msg)` → visible popup. Use for user-facing status.

## Environment

### PATH is not inherited

Zotero's subprocess runs with a minimal environment. Shell PATH is unavailable; shebangs
like `#!/usr/bin/env uv` silently fail. Always use absolute paths:

```js
const UV   = '/opt/homebrew/bin/uv';
const QPDF = '/opt/homebrew/bin/qpdf';
```

For uv inline scripts: call `uv run --script <path>` via its absolute path, not the script directly.

### subprocess vs exec

- `subprocess(cmd, args)` — returns stdout as string, **never throws** on non-zero exit. Silent failures on error.
- `exec(cmd, args)` — throws on non-zero exit.
- Use `subprocess` when you need output; `exec` when the command must succeed.
- Guard subprocess output: `(result || '').trim()` — returns `undefined` if no stdout.

### Capturing exit code with subprocess

```js
const args = ['-c', `"${UV}" run --script "${SCRIPT}" "${pdfPath}" 2>&1; echo "EXITCODE:$?"`];
let raw = '';
try {
    raw = await subprocess('/bin/bash', args);
} catch (e) {
    raw = 'EXITCODE:1\n' + (e.message || String(e));
}
const lines    = (raw || '').trim().split('\n');
const exitLine = lines.find(l => l.startsWith('EXITCODE:')) || 'EXITCODE:1';
const code     = parseInt(exitLine.replace('EXITCODE:', ''), 10) || 1;
const output   = lines.filter(l => !l.startsWith('EXITCODE:')).join('\n').trim();
```

## Data model

### item can be null

A&T passes `null` as `item` in some contexts (e.g. triggered outside a library selection).
Always guard early inside `try`:

```js
if (!item) { dbg('aborted: item is null'); return; }
```

### Book sections are standalone, not nested

Book sections typically have no `parentItemID`. Link to parent book via **Related items**:

```js
let parent = item.parentItemID ? Zotero.Items.get(item.parentItemID) : null;
if (!parent) {
    for (const key of item.relatedItems) {
        const rel = Zotero.Items.getByLibraryAndKey(item.libraryID, key);
        if (rel && rel.itemType === 'book') { parent = rel; break; }
    }
}
```

### Attachment filename

Pass the item the attachment belongs to (not the attachment, not the grandparent):

```js
const fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(parentItem);
```

### Getting a PDF path

```js
const att = await item.getBestAttachment();
if (!att || att.attachmentContentType !== 'application/pdf') {
    showToast('No PDF attachment'); return;
}
const pdfPath = await att.getFilePathAsync();
```

## ProgressWindow

`pw.show()` must come before `changeHeadline()` / `addDescription()`. Wrong order produces a blank grey rectangle with no error:

```js
const pw = new Zotero.ProgressWindow({ closeOnClick: true });
pw.show();
pw.changeHeadline('My Action');
pw.addDescription('Done!');
pw.startCloseTimer(3000);
```

## Importing an attachment

```js
const attachment = await Zotero.Attachments.importFromFile({
    file: outPath,
    parentItemID: item.id,
    contentType: 'application/pdf',
    fileBaseName: fileBaseName,
});
try { await IOUtils.remove(outPath); } catch (_) {}
```
