# lec-process: add --engine flag, delete lec-process-parakeet

**Date:** 2026-04-06

## Goal

Fold `lec-process-parakeet` (marked TEMPORARY) into `lec-process` as an `--engine` flag, then delete the redundant script.

## Changes

### lec-process

Add `--engine|-e [whisper|parakeet]` argument (default: `whisper`).

**Argument parsing:** add the new flag alongside the existing ones. Reject `--lang` (or any non-default `LANG_CODE`) if `--engine parakeet` with a clear error message: parakeet is English-only.

**Transcription block:** wrap in a conditional on `$ENGINE`:
- `whisper` path — unchanged: `uvx --from mlx-whisper mlx_whisper` with `--language`, `--model`, tmpdir output, move `.srt` and `.txt` into cwd.
- `parakeet` path — `uvx parakeet-mlx "$FILE" --output-format all` (outputs to cwd by default, no language flag, no tmpdir needed).

**Summary:** add `Engine:` row to the printed summary table.

**Help text:** update usage line to include `[-e|--engine whisper|parakeet]`.

### lec-process-parakeet

Delete the file. It is marked TEMPORARY in its own header and is now fully superseded.

## What is NOT changed

- `lec-archive`, `lec-correct`, `lec-diarize` — untouched.
- The `--context` flag from `lec-process-parakeet` is dropped (it was never implemented in `lec-correct` and would have silently failed).
- No new features, no refactoring of unrelated logic.

## Verification

After the change:
- `lec-process --engine whisper` behaves identically to current `lec-process`
- `lec-process --engine parakeet` produces the same output as current `lec-process-parakeet` (minus `--context`)
- `lec-process --engine parakeet --lang nl` exits with an error
- `lec-process-parakeet` no longer exists in `bin/`
