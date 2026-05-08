---
name: obsidian-cli
description: Interact with the running Obsidian instance using the obsidian CLI. Use when the user wants to search the vault, read notes, append to daily notes, manage tasks, or inspect vault metadata. Requires Obsidian to be open.
---

# Obsidian CLI

Use the `obsidian` CLI to interact with a running Obsidian instance.

## File targeting

- `file=<name>` — resolves like a wikilink (name only, no path/extension)
- `path=<path>` — exact path from vault root, e.g. `KUL/note.md`

## Common commands

```bash
obsidian read file="My Note"
obsidian create name="New Note" content="# Hello" silent
obsidian append file="My Note" content="New line"
obsidian search query="search term" limit=10
obsidian daily:read
obsidian daily:append content="- [ ] New task"
obsidian property:set name="status" value="done" file="My Note"
obsidian tags sort=count counts
obsidian backlinks file="My Note"
```

## Vault targeting

```bash
obsidian vault="wiki" search query="test"
```

Run `obsidian help` for full command reference.
