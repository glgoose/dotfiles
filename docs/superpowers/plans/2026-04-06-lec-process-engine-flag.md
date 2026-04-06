# lec-process Engine Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `--engine|-e [whisper|parakeet]` to `lec-process` and delete the now-redundant `lec-process-parakeet`.

**Architecture:** Single file change to `bin/lec-process` — add ENGINE default, add flag parsing, guard against `--lang` + parakeet, branch transcription on ENGINE, update summary. Then delete `bin/lec-process-parakeet`.

**Tech Stack:** bash, `uvx` (uv), `mlx-whisper` (whisper engine), `parakeet-mlx` (parakeet engine), `ffprobe`

---

### Task 1: Add ENGINE default and argument parsing to lec-process

**Files:**
- Modify: `bin/lec-process`

- [ ] **Step 1: Add ENGINE default**

  In the `── Defaults ──` section (around line 10), add `ENGINE` and `LANG_SET` after the existing defaults:

  ```bash
  RENAME=false
  LANG_CODE="en"
  LANG_SET=false
  CORRECT=false
  DIARIZE=false
  PROVIDER="openai"
  ENGINE="whisper"
  ```

- [ ] **Step 2: Add --engine case to argument parsing**

  In the `while [[ $# -gt 0 ]]` block, add the `--engine|-e` case immediately before the `*)` catch-all:

  ```bash
      --engine|-e)
        [[ $# -lt 2 ]] && { echo "Error: --engine requires whisper or parakeet"; exit 1; }
        ENGINE="$2"
        [[ "$ENGINE" != "whisper" && "$ENGINE" != "parakeet" ]] && {
          echo "Error: --engine must be 'whisper' or 'parakeet'"; exit 1; }
        shift 2
        ;;
  ```

- [ ] **Step 3: Mark --lang as explicitly set**

  In the `--lang|-l` case, add `LANG_SET=true` after setting `LANG_CODE`:

  ```bash
      --lang|-l)
        [[ $# -lt 2 ]] && { echo "Error: --lang requires a language code (e.g. --lang nl, --lang fr, --lang de)"; exit 1; }
        LANG_CODE="$2"
        LANG_SET=true
        shift 2
        ;;
  ```

- [ ] **Step 4: Update usage lines**

  There are three places with the usage string: the `-h|--help` block, the `--lang` error, and the `*)` error. Update all three to:

  ```
  Usage: lec-process [-r|--rename] [-e|--engine whisper|parakeet] [-l|--lang LANGCODE] [-c|--correct] [-d|--diarize] [-p|--provider openai|anthropic]
  ```

  Also update the header comment on line 3:

  ```bash
  # Usage: lec-process [-r|--rename] [-e|--engine whisper|parakeet] [-l|--lang LANGCODE] [-c|--correct] [-d|--diarize] [-p|--provider openai|anthropic]
  ```

- [ ] **Step 5: Add guard after argument parsing, before dependency checks**

  Insert this block immediately after the `done` that closes the `while [[ $# -gt 0 ]]` loop:

  ```bash
  # Parakeet is English-only
  if [[ "$ENGINE" == "parakeet" && "$LANG_SET" == true ]]; then
    echo "Error: --engine parakeet is English-only; --lang is not supported."
    exit 1
  fi
  ```

- [ ] **Step 6: Verify the file parses correctly (no syntax errors)**

  ```bash
  bash -n bin/lec-process
  ```

  Expected: no output (exit 0).

- [ ] **Step 7: Commit**

  ```bash
  git add bin/lec-process
  git commit -m "lec-process: add --engine|-e flag (whisper|parakeet), guard --lang+parakeet"
  ```

---

### Task 2: Branch transcription on ENGINE

**Files:**
- Modify: `bin/lec-process`

The current transcription block (inside the `for FILE in "${WAV_FILES[@]}"` loop) starts at roughly line 120 with the `uvx --from mlx-whisper` call. Replace the entire transcription section inside the loop — from `# Output to a temp dir...` through `rm -rf "$TMPDIR"` — with an ENGINE branch.

- [ ] **Step 1: Replace the transcription block**

  Remove this existing block:
  ```bash
    # Output to a temp dir so we can pick only .srt and .txt
    TMPDIR=$(mktemp -d)
    uvx --from mlx-whisper mlx_whisper "$FILE" \
      --model "$MLX_MODEL" \
      --language "$LANG_CODE" \
      --output-format all \
      --output-name "$NAME" \
      --output-dir "$TMPDIR" \
      --condition-on-previous-text False \
      --verbose False

    mv "$TMPDIR/${NAME}.srt" "./${NAME}.srt"
    mv "$TMPDIR/${NAME}.txt" "./${NAME}.txt"
    rm -rf "$TMPDIR"
  ```

  Replace with:
  ```bash
    if [[ "$ENGINE" == "whisper" ]]; then
      # Output to a temp dir so we can pick only .srt and .txt
      TMPDIR=$(mktemp -d)
      uvx --from mlx-whisper mlx_whisper "$FILE" \
        --model "$MLX_MODEL" \
        --language "$LANG_CODE" \
        --output-format all \
        --output-name "$NAME" \
        --output-dir "$TMPDIR" \
        --condition-on-previous-text False \
        --verbose False

      mv "$TMPDIR/${NAME}.srt" "./${NAME}.srt"
      mv "$TMPDIR/${NAME}.txt" "./${NAME}.txt"
      rm -rf "$TMPDIR"
    else
      # parakeet-mlx writes srt/txt to cwd directly
      uvx parakeet-mlx "$FILE" --output-format all
    fi
  ```

- [ ] **Step 2: Update the summary section**

  The current summary prints `Model:` unconditionally. Change it to print `Engine:` always and `Model:` only for whisper:

  Replace:
  ```bash
  printf "  %-18s %s\n" "Model:"           "$MLX_MODEL"
  ```

  With:
  ```bash
  printf "  %-18s %s\n" "Engine:"          "$ENGINE"
  [[ "$ENGINE" == "whisper" ]] && printf "  %-18s %s\n" "Model:" "$MLX_MODEL"
  ```

- [ ] **Step 3: Syntax check**

  ```bash
  bash -n bin/lec-process
  ```

  Expected: no output (exit 0).

- [ ] **Step 4: Smoke test — whisper path flag parsing (no WAV files needed)**

  ```bash
  cd /tmp && lec-process --engine whisper 2>&1 | head -3
  ```

  Expected: `Error: no .wav files found in the current directory.`

- [ ] **Step 5: Smoke test — parakeet path flag parsing**

  ```bash
  cd /tmp && lec-process --engine parakeet 2>&1 | head -3
  ```

  Expected: `Error: no .wav files found in the current directory.`

- [ ] **Step 6: Smoke test — --lang guard**

  ```bash
  lec-process --engine parakeet --lang nl 2>&1
  ```

  Expected: `Error: --engine parakeet is English-only; --lang is not supported.`

- [ ] **Step 7: Smoke test — invalid engine**

  ```bash
  lec-process --engine wav2vec 2>&1
  ```

  Expected: `Error: --engine must be 'whisper' or 'parakeet'`

- [ ] **Step 8: Commit**

  ```bash
  git add bin/lec-process
  git commit -m "lec-process: branch transcription on engine, update summary"
  ```

---

### Task 3: Delete lec-process-parakeet

**Files:**
- Delete: `bin/lec-process-parakeet`

- [ ] **Step 1: Delete the file**

  ```bash
  git rm bin/lec-process-parakeet
  ```

- [ ] **Step 2: Verify it's gone**

  ```bash
  ls bin/lec-*
  ```

  Expected output lists: `lec-archive`, `lec-correct`, `lec-diarize`, `lec-process` — no `lec-process-parakeet`.

- [ ] **Step 3: Commit**

  ```bash
  git commit -m "lec-process: delete lec-process-parakeet (superseded by --engine flag)"
  ```

---

## Verification Checklist

After all three tasks:

- [ ] `bash -n bin/lec-process` exits 0
- [ ] `lec-process --engine whisper` (in a dir with no WAVs) → `Error: no .wav files found`
- [ ] `lec-process --engine parakeet` (in a dir with no WAVs) → `Error: no .wav files found`
- [ ] `lec-process --engine parakeet --lang nl` → `Error: --engine parakeet is English-only`
- [ ] `lec-process --engine bad` → `Error: --engine must be 'whisper' or 'parakeet'`
- [ ] `ls bin/lec-*` — no `lec-process-parakeet`
- [ ] `lec-archive`, `lec-correct`, `lec-diarize` untouched (`git diff HEAD~3 -- bin/lec-archive bin/lec-correct bin/lec-diarize` → empty)
