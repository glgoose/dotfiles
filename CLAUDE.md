# dotfiles — Claude Code conventions

## bin/ scripts

- All scripts start with `set -euo pipefail`.
- Secrets are stored in macOS Keychain via `security add-generic-password` and exported in `~/.zshrc`.
- Python CLI tools: use `uvx <tool-name>` (e.g. `uvx mlx-whisper`).
- Python libraries in inline scripts: use `uv run --with <pkg> python3 -`.
- Never require `pip install` or `uv tool install` — only `uv` itself needs to be present.
- For every long flag, also define a short flag: e.g. `--rename, -r`, `--dry-run, -n`, `--force, -f`. Keep short flags unique within the command. Prefer conventional shorthands where they exist.

## Git commits

- One commit per script or config file — never bundle unrelated files.
- Commit message describes what the script does differently, not just "update X".
