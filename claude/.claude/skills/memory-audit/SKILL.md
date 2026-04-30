---
name: memory-audit
description: "Audit ~/.claude/projects/-Users-glenn/memory/ entries and promote durable items into versioned CLAUDE.md files. Use when invoking /memory-audit, when memory has accumulated, or when the user asks to clean up / consolidate / promote auto-memory entries. Memory is a working buffer; this skill moves long-lived knowledge into stow-backed durable files."
---

# /memory-audit — Promote durable memory into versioned files

## Why

Auto-memory (`~/.claude/projects/-Users-glenn/memory/`) is a working buffer — not under `~/dotfiles/`, not pushed to remote, lost on disk failure. Durable knowledge (cross-project feedback rules, developer profile, project facts that outlive a session) belongs in versioned files like the global `~/.claude/CLAUDE.md` (stow-backed) or per-project `CLAUDE.md`.

Run this skill periodically to migrate qualifying entries out of memory and into their durable home.

## Inputs

- `~/.claude/projects/-Users-glenn/memory/MEMORY.md` — the index
- Each linked entry file in the same dir (frontmatter classifies type)

## Classification → destination

| Frontmatter `type` | Destination                                                                           |
| ------------------ | ------------------------------------------------------------------------------------- |
| `feedback`         | Append to `~/.claude/CLAUDE.md` under `## Feedback`                                   |
| `user`             | Append to `~/.claude/CLAUDE.md` under `## About me`                                   |
| `project`          | Append to that project's `CLAUDE.md` under `## Project`, if it exists; else skip      |
| `reference`        | If pointer to a project-local doc and that project has a `CLAUDE.md`, move to its `## References`; else keep in memory |
| anything ambiguous | skip with one-line reason                                                             |

## Workflow

1. **Read** `MEMORY.md` and every linked file. Parse frontmatter.
2. **Plan** — for each entry, determine destination per the table. Build a per-entry record: `{file, type, action: "promote" | "skip", destination?, reason?}`.
3. **Preview** — print a diff-style summary to the user:
   - For each promote: source file → destination file + section, with the appended snippet shown.
   - For each skip: file name + reason.
   - List of memory files that will be deleted and the `MEMORY.md` lines that will be pruned.
4. **Confirm** — wait for explicit user approval. Do not write anything before approval.
5. **Apply** on approval, in this order:
   - Append to each destination file. For new sections, create the heading.
   - Delete each promoted memory file (`rm`, not `git rm` — memory dir isn't versioned).
   - Edit `MEMORY.md` to remove the corresponding index lines.
6. **Idempotent** — re-running on an already-clean memory dir produces no changes; nothing to promote, nothing to delete.

## Format conventions when appending

- Strip the source file's frontmatter before appending — destination files are human-readable, not memory-format.
- Lead with a one-line rule/fact (the title or first sentence).
- For `feedback`: keep `**Why:**` and `**How to apply:**` lines if present in source.
- Use plain paragraphs, no `<entry>` tags or YAML.
- Group multiple appends under the same section, separated by `---`.

## Section headings (create if missing)

In `~/.claude/CLAUDE.md`:

```markdown
## About me

…

## Feedback

…
```

Append below the existing content; do not rewrite.

## Edge cases

- **Multiple feedback entries on append**: separate with `---` between entries.
- **Destination missing** (e.g. project with no `CLAUDE.md`): skip with reason `"no CLAUDE.md at <path>"`.
- **Memory file with no `type` frontmatter**: skip with reason `"unclassifiable: missing type"`.
- **Duplicate content** (rule already in destination): skip with reason `"duplicate of existing line in <dest>"`.
- **`reference` to durable doc** (e.g. dotfiles file): keep in memory if no project `CLAUDE.md` accepts it; the durable doc itself is the canonical source.

## Trigger

Manual `/memory-audit`. Not automated. After running, the memory dir should be near-empty and `~/.claude/CLAUDE.md` (stow-backed) is the durable source of truth for cross-project rules and profile.
