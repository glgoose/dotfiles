---
name: zotero-scripting
description: Write or edit Zotero Actions & Tags custom scripts (.js), or run one-off JS against the Zotero library via the Run JavaScript console. Covers the script skeleton, environment gotchas (PATH, bindings, silent swallowing), data model, ProgressWindow API, and subprocess patterns. Use whenever writing or modifying any Zotero A&T script in zotero/*.js, or when a task needs a quick script run against Zotero without installing an Action.
---

## Two execution contexts — don't mix up the bindings

- **Actions & Tags scripts** (installed as an Action, triggered from a selected item):
  get `item`/`items` bound automatically by the plugin. Everything below this section
  assumes this context.
- **Tools → Developer → Run JavaScript console**: a plain sandbox. There is **no
  implicit `item`/`items` binding** — referencing `item` throws `item is not defined`
  (or silently no-ops if guarded with `if (!item) return`, which looks like success but
  isn't). Fetch items explicitly instead:

  ```js
  const libraryID = Zotero.Libraries.userLibraryID;
  const item = await Zotero.Items.getByLibraryAndKeyAsync(libraryID, 'ABCD1234');
  ```

  Wrap the whole thing in `try/catch` and `return` a short status string (e.g.
  `'OK: set 3 fields'` / `'EXCEPTION: ' + e.message`) — that's what shows up in the
  console's Result pane. Check "Run as async function" if the script uses top-level
  `await`/`return`.

  To run one of these non-interactively (e.g. from Claude Code) instead of pasting it
  into the console by hand, use `~/dotfiles/bin/zotero-run-js <script.js>` — it drives
  the console via AppleScript and prints the Result pane back. It activates Zotero and
  pops the console window each time, so use it deliberately for one-off fixes, not in a
  loop — it will steal window focus from whatever else you're doing.

  **`zotero-run-js` may silently run your script twice.** If the AppleScript reads the
  Result pane before Zotero has populated it (a timing race, not a Zotero failure), the
  runner can't tell "nothing ran yet" apart from "it ran but the pane isn't updated," so
  it retries by clicking Run again. This is harmless for read-only scripts and safe for
  mutations keyed by an existing item (setting a field, trashing by key), but **any
  script that creates a new item must check for an existing match first**, or a flaky
  read turns into a real duplicate:

  ```js
  const s = new Zotero.Search();
  s.libraryID = Zotero.Libraries.userLibraryID;
  s.addCondition('ISBN', 'is', isbn);
  const ids = await s.search();
  if (ids.length) return 'OK: already exists, key=' + Zotero.Items.get(ids[0]).key;
  ```

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
