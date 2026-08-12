# Zotero Actions & Tags — Development Notes

## Environment gotchas

### subprocess() vs exec()
- `Zotero.Utilities.Internal.subprocess(cmd, args)` — returns stdout as string, **never throws** on non-zero exit. Silent failures.
- `Zotero.Utilities.Internal.exec(cmd, args)` — throws on non-zero exit. Use this when the command must succeed.
- Pattern: use `subprocess` when you want output, `exec` when you just need it to succeed.

### PATH is not inherited
Zotero's subprocess runs with a minimal environment — the user's shell PATH is not available. Shebangs that rely on `env` to find tools (e.g. `#!/usr/bin/env uv`) will silently fail. Always use absolute paths for external binaries:
```js
const UV   = '/opt/homebrew/bin/uv';
const QPDF = '/opt/homebrew/bin/qpdf';
```
For uv scripts specifically: don't call the script directly — call `uv run --script <script>` via its absolute path.

### Binding methods
Always bind Zotero internals before use, otherwise `this` is lost:
```js
const subprocess = Zotero.Utilities.Internal.subprocess.bind(Zotero.Utilities.Internal);
const exec       = Zotero.Utilities.Internal.exec.bind(Zotero.Utilities.Internal);
```

## Data model

### Book sections are usually standalone items
Book sections in Zotero are typically **not** nested under their parent book (`item.parentItemID` is null/false). They are linked via **Related items** instead. To find the parent book:
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
`Zotero.Attachments.getFileBaseNameFromItem(item)` generates the rename-template filename. Pass the **item the attachment belongs to** (not the attachment itself, not a grandparent):
```js
const fileBaseName = Zotero.Attachments.getFileBaseNameFromItem(item); // item = book section
```

### item can be null
Actions & Tags passes `null` as `item` in some contexts. Always guard:
```js
if (!item) return;
```

## ProgressWindow
`pw.show()` must be called before `changeHeadline()` / `addDescription()`. Failing to do so produces a blank grey rectangle with no error.
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
```
After importing, clean up the temp file:
```js
try { await IOUtils.remove(outPath); } catch (_) {}
```
