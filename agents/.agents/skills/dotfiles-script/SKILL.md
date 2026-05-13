---
name: dotfiles-script
description: Conventions for writing or editing bash CLI scripts in ~/dotfiles/bin/ — argument parsing, validation, error format, file structure. Use when creating a new script in ~/dotfiles/bin/, refactoring an existing one, or when the user asks for a "robust" / "best-practice" shell script. Do NOT use for one-off shell commands, Python tooling, or non-dotfiles scripts.
---

# Dotfiles bash script conventions

Scope: bash scripts in `~/dotfiles/bin/` invoked as CLI commands. Not for sourced shell config, Python, or one-off commands.

## Header & shell setup

Every script starts with:

```bash
#!/usr/bin/env bash
# <name> — <one-line purpose>
# Usage: <name> [flags] [args...]
# <one or two extra lines describing context: where to run, what it produces>
set -euo pipefail
```

- `env bash` shebang (portable, no hard-coded `/bin/bash` path).
- `set -euo pipefail`: errexit, nounset, pipefail. Fail fast and loud.
- Header comment is the only documentation. Keep usage line in sync with the parser.

## Bash version — 3.2 floor

macOS ships `/bin/bash` at version 3.2; `#!/usr/bin/env bash` resolves to whatever is first in `PATH`, which on this machine is bash 3.2. Don't reach for bash-4 features. They fail at runtime, not parse time, so the script looks fine until it doesn't.

One-line substitutes (drop-in):

| Bash 4+ feature           | Added in | Portable substitute                                       |
|---------------------------|----------|-----------------------------------------------------------|
| `&>> file`                | 4.0      | `>>file 2>&1`                                             |
| `${var,,}`, `${var^^}`    | 4.0      | `$(tr '[:upper:]' '[:lower:]' <<<"$var")` (and inverse)   |
| `${arr[-1]}`              | 4.2      | `${arr[${#arr[@]}-1]}`                                    |
| `{1..10..2}` (brace step) | 4.0      | `seq 1 2 10`                                              |

Multi-line cases:

**`mapfile -t arr < <(cmd)` / `readarray`**: read lines into an array. Substitute:

```bash
arr=()
while IFS= read -r line; do
  arr+=("$line")
done < <(cmd)
```

**Associative arrays (`declare -A`)**: no native equivalent in 3.2. Options: (1) parallel indexed arrays for keys and values, walked together; (2) shell out to `jq` for JSON-shaped data; (3) `awk` for tabular lookups. If you find yourself wanting `declare -A`, that is usually the signal the script outgrew bash; consider rewriting in Python or `uv run --script`.

**Recursive glob `**` (with `shopt -s globstar`)**: bash 4 only. Substitute with `find`:

```bash
while IFS= read -r f; do
  ...
done < <(find . -type f -name '*.txt')
```

## Argument parsing — `while + case`, never `getopts`

`getopts` is POSIX-only and doesn't understand long options. Use this pattern:

```bash
# ── Defaults ──────────────────────────────────────────────────────────────────
FOO=false
BAR="default"
INPUT_FILES=()

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --foo|-f) FOO=true; shift ;;
    --bar|-b)
      [[ $# -lt 2 ]] && { echo "Error: --bar requires a value"; exit 1; }
      BAR="$2"; shift 2 ;;
    --) shift; while [[ $# -gt 0 ]]; do INPUT_FILES+=("$1"); shift; done ;;
    -*) echo "Error: unknown option: $1"; echo "$USAGE"; exit 1 ;;
    *)  INPUT_FILES+=("$1"); shift ;;
  esac
done
```

Rules:

1. **Both forms** for every flag: `--long|-s`. Long is canonical, short is shorthand.
2. **Value-taking flags** check `$# -lt 2` before reading `$2`, then `shift 2`. Boolean flags just `shift`.
3. **`--` end-of-options separator** so files starting with `-` work (`cmd -- -weird.txt`). Always include if the script accepts files.
4. **`-*` arm rejects unknown flags**, `*` arm collects positional args. Never reject positional args generically as "Unknown option" — they are not options.
5. **Mixed order tolerated for free**: this loop already handles flags before, after, or between positional args. Don't add ordering constraints.
6. **No `getopts`, no argparse-style libraries.** This pattern is the dotfiles standard.

## Positional args — accept files, fall back sensibly

CLI standard is `cmd [flags] [files...]` (`cp`, `ffmpeg`, `prettier`, `git add`). When no files passed, either:

- **Auto-discover** in cwd (preferred for "run from inside folder X" scripts like `lec-archive`, `lec-rename`).
- **Error with hint** if there is no sensible default.

Either way, validate explicit files before doing work:

```bash
if [[ ${#INPUT_FILES[@]} -gt 0 ]]; then
  for f in "${INPUT_FILES[@]}"; do
    [[ -f "$f" ]] || { echo "Error: not a file: $f"; exit 1; }
    case "${f,,}" in
      *.flac|*.wav) ;;
      *) echo "Error: unsupported extension: $f"; exit 1 ;;
    esac
  done
else
  # auto-discover or error
  ...
fi
```

Rules:

- Validate existence and extension before the main loop. Fail before doing work.
- Glob expansion is the shell's job (`cmd *.flac` works for free).
- One collection (`INPUT_FILES`), one downstream loop. Don't fork the logic.
- Variable name should not lie about contents (`WAV_FILES` holding flacs = bug).

## Value validation

When a flag accepts a fixed set of values, validate inline:

```bash
[[ "$PROVIDER" != "openai" && "$PROVIDER" != "anthropic" ]] && {
  echo "Error: --provider must be 'openai' or 'anthropic'"; exit 1; }
```

(Pattern from `lec-correct`.) Validate as soon as the flag is parsed, not later.

## Errors and usage

- Format: `echo "Error: <what failed>"`, then exit non-zero.
- On unknown flag: print error, then the usage line, then exit 1.
- `USAGE` as a string variable if reused; otherwise inline echo is fine.
- No colors or emoji in errors. These scripts run in pipes, cron, hooks.

## Structure & style

- Section dividers: `# ── Section name ────────────────────────`. Boundaries between defaults, parsing, validation, helpers, main loop, summary.
- Helpers as small functions above main logic. Use `local` for function variables.
- Quote every variable expansion: `"$var"`, `"${arr[@]}"`. No exceptions.
- Don't `cd` without checking it succeeded. `set -e` covers this, but be aware.
- Temp files: `mktemp`, plus `trap 'rm -f "$tmp"' EXIT` for cleanup.
- Comments explain *why*, not *what*. Don't narrate the code.

## Dependency check

If the script needs external commands, check up front:

```bash
REQUIRED_CMDS=(ffmpeg jq)
for cmd in "${REQUIRED_CMDS[@]}"; do
  command -v "$cmd" &>/dev/null || {
    echo "Error: $cmd not found. Install with: brew install $cmd"; exit 1; }
done
```

(Pattern from `lec-archive`.) Brew is the assumed package manager on this machine.

## Before committing

Always run, in order:

```bash
bash -n path/to/script        # syntax check, must pass
shellcheck path/to/script     # lint, must exit 0
```

`shellcheck` is installed (`brew install shellcheck`). A clean shellcheck run is a hard requirement, not a suggestion. Don't commit with warnings outstanding.

If a warning is a genuine false positive, suppress it inline with a one-line justification:

```bash
# shellcheck disable=SC2086  # word-splitting is intended here for ffmpeg flags
```

Never blanket-disable at the top of the file.

### Common warnings and fixes

| Code   | What it means                                          | Fix                                                       |
|--------|--------------------------------------------------------|-----------------------------------------------------------|
| SC2086 | Unquoted variable; will word-split on whitespace       | Quote it: `"$var"`, `"${arr[@]}"`                         |
| SC2207 | `arr=($(cmd))` splits on `$IFS` and globs              | Use `mapfile -t arr < <(cmd)`                             |
| SC2155 | `local x=$(cmd)` masks the exit status of `cmd`        | Split: `local x; x=$(cmd)`                                |
| SC2046 | Unquoted `$(cmd)` word-splits the output               | Quote: `"$(cmd)"`, or `mapfile` for arrays                |
| SC2128 | Expanding an array without index gives only first elt  | Use `"${arr[@]}"` or `"${arr[0]}"` deliberately           |
| SC2164 | `cd $dir` without `||` may continue if cd fails        | `cd "$dir" || exit` (or rely on `set -e` + verify)        |
| SC2181 | Checking `$?` instead of running the command in `if`   | `if cmd; then …` rather than `cmd; if [[ $? -eq 0 ]]`     |

Empty arrays under `set -u`: `"${arr[@]}"` errors if `arr` was never appended to. Either initialise (`arr=()` *and* append at least once before expansion), or guard with `"${arr[@]+"${arr[@]}"}"` when expansion is conditional.

## Self-check before declaring done

- [ ] Shebang `#!/usr/bin/env bash` and `set -euo pipefail` present.
- [ ] No bash-4-only features (`mapfile`, `declare -A`, `${var,,}`, `${var^^}`, `&>>`, `**` globstar, `${arr[-1]}`, brace-step).
- [ ] Header comment matches actual usage line.
- [ ] Every flag has long+short form.
- [ ] Value-taking flags check `$# -lt 2`.
- [ ] `--` end-of-options arm present if files accepted.
- [ ] `-*` arm rejects unknown flags; `*` arm collects positional.
- [ ] Inputs validated before main work.
- [ ] No unquoted variable expansions.
- [ ] `bash -n` and `shellcheck` clean.
