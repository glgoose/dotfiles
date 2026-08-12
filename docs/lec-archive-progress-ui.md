# lec-archive — progress UI and per-file timing

Two display features in `bin/lec-archive` that exist purely for legibility while a
batch is running, and for retrospection after it finishes.

## Live status area (TTY only, `both` mode)

In `both` mode the script runs FLAC and Opus encoding in parallel. While they
work, two persistent status lines redraw in place at ~5 Hz:

```
  audio.wav  (123 MB)
    FLAC  ✓  0:12  done
    Opus  ⠹  0:12  analyzing loudness
```

Each line shows:

| Column | Meaning |
|--------|---------|
| label  | `FLAC` or `Opus` |
| mark   | braille spinner while running, `✓` when complete |
| time   | elapsed since that task's launch, `M:SS` |
| phase  | `starting` / `analyzing loudness` / `encoding` / `done` |

Both tasks share the same launch timestamp, so the elapsed values are directly
comparable. FLAC typically finishes first (no loudness normalization pass), and
the user can see it sit at `✓` while Opus continues.

Once both tasks finish, the live area is cleared (one `ESC[2A ESC[J`) and
replaced by the standard one-line-per-format result block (file path, size
delta, sample-rate / channel changes). The transient timer goes away, but the
authoritative per-file time is recorded for the summary table below.

## Per-file summary table

After the existing summary block, if two or more files were processed, a table
prints with one row per file:

```
── Per-file times ──────────────────────────────────────────────────────────
  File                                            FLAC    Opus
  lecture-01.wav                                  0:42    1:11
  lecture-02.wav                                  0:38    1:05
  lecture-03.wav                                  0:51    1:20
```

Columns shown match the active mode:

| Mode | Columns |
|------|---------|
| `both` | `FLAC`, `Opus` |
| `--flac` | `FLAC` |
| `--opus` | `Opus` |

Filenames are left-justified to 46 characters and truncated with an ellipsis if
longer. Times are `M:SS`. Single-file runs skip the table (the per-task time is
already visible during the live phase and the work is over).

## Non-TTY behavior

When stdout is not a TTY (piped, redirected to a file, running in CI), the
script falls back to the pre-existing output: spawn both encodes, wait silently
until both finish, then print both result lines. No ANSI escapes leak into the
log file.

Per-task timing is still captured in non-TTY mode via a lightweight 0.5 Hz poll
loop, so the summary table still works in piped runs.

Detection is plain `[[ -t 1 ]]`.

## Implementation notes

A few things worth knowing before editing the renderer.

### Phase markers are file-based, not in-band

Each background encoder writes its current phase (a short string) to a temp
file via `write_phase`. The parent shell reads the file on each redraw with
`read_phase` (a bash builtin substitution, no fork). This is the simplest way
to get a one-way status channel from a backgrounded function whose stdout is
captured to a log file.

### Process completion is detected with `kill -0`, not `wait`

The renderer cannot `wait` on the background PIDs because that blocks. Instead
it polls `kill -0 "$PID" 2>/dev/null`. Once both polls fail, the renderer
returns and the caller runs `wait` separately to capture the exit code (this
returns immediately because the process is already gone).

### `set -e` and `[[ -n "" ]] && cmd`

This script runs under `set -euo pipefail`. The pattern
`[[ -n "${PHASE_FILE:-}" ]] && write_phase ...` is the last statement of
`encode_flac` / `encode_opus`. When `PHASE_FILE` is unset (single-format modes,
where no live UI runs), the `[[ ]]` is false, the `&&` short-circuits, and the
compound returns 1. That return value becomes the function's exit status, and
because the function is called as a top-level statement in `flac` / `opus`
modes (not inside an `if` / `||` / pipeline), `set -e` fires and the script
exits silently between files.

The fix is an explicit `return 0` at the bottom of any function whose last
statement is a short-circuit chain. This applies to `encode_flac`,
`encode_opus`, `poll_until_both_exit`, and `live_progress_both`.

### Cursor positioning

Layout in the live loop, one iteration:

```
\e[2A         # cursor up 2 (back to start of FLAC line)
\e[2K\r…\n    # clear FLAC line, write it, advance to Opus line
\e[2K\r…\n    # clear Opus line, write it, cursor now below
```

After the loop, `\e[2A\e[J` moves up to the start of the FLAC line and clears
to end of screen, freeing the two lines for the size-delta result block that
follows.

No cursor hide / show; the blinking cursor sits at the end of the rendered
area, which is fine.

## Things deliberately left out

- **Live UI in single-format modes.** No parallelism means no comparative
  benefit to a redraw area. Output stays a single inline line per file.
- **Failure log replay.** If an encode fails, both temp logs print before exit
  regardless of TTY state. The summary table is not printed (the failure
  message comes first and the script exits non-zero).
- **Resilience to terminal resize.** The status lines are short (under 60
  chars in practice), so wrapping is unlikely. If it ever happens, redraws will
  leave stale fragments. Not worth handling until it bites.

## Related

- `docs/lec-archive-flac-settings.md` — encoding-settings rationale for the
  same script.
