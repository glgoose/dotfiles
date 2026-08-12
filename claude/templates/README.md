# Claude Code project templates

Per-project plugin enablement. Copy the matching `.claude` dir into a project root to re-enable plugins disabled globally.

## Available templates

| Template | Re-enables | Use for |
|----------|------------|---------|
| `webdev/` | chrome-devtools-mcp, playwright | Web/frontend projects, anything browser-debuggable |
| `code-review/` | compound-engineering | Heavy code review, multi-persona analysis, PR workflows |
| `memory-search/` | claude-mem | Projects where cross-session memory recall matters |
| `full-stack/` | webdev + code-review | Big web projects with serious review needs |

## Bootstrap

```bash
# In project root
cp -r ~/dotfiles/claude/templates/webdev/.claude .
```

Or symlink to keep template updates flowing:

```bash
ln -s ~/dotfiles/claude/templates/webdev/.claude .claude
```

## How it works

Global `~/.claude/settings.json` keeps heavy plugins disabled to save ~5k tokens per session. Project-level `.claude/settings.json` overrides the global flag, re-enabling only what that project needs.

Result: lean baseline, opt-in heavy plugins where they earn their cost.

## Adding a new template

```bash
mkdir -p ~/dotfiles/claude/templates/<name>/.claude
# Create settings.json with desired enabledPlugins map
```
