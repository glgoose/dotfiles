# denoise-compare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `bin/denoise-compare` — a one-shot test harness that runs three noise-reduction approaches on a single WAV file and outputs one result per approach with timing, so the user can listen and decide which to adopt in the real `denoise` script.

**Architecture:** Single self-contained bash script. Runs approaches A (SoX profile-based), B (ffmpeg arnndn/RNNoise), and C (DeepFilterNet via uvx) sequentially. Uses a shared temp dir cleaned up on exit. Gracefully skips any approach whose dependency is missing or whose step fails.

**Tech Stack:** bash, ffmpeg (silencedetect, arnndn), sox (noiseprof + noisered), uvx + deepfilternet (deep-filter CLI), awk for arithmetic/formatting.

---

### Task 1: Script skeleton — argument parsing, validation, dependency checks, trap

**Files:**
- Create: `bin/denoise-compare`

- [ ] **Step 1: Create the script with shebang, header, and set flags**

```bash
#!/usr/bin/env bash
# denoise-compare — compare three noise-reduction approaches on a WAV file
# Usage: denoise-compare <file.wav>
# Outputs: <name>_a_sox.wav, <name>_b_rnnoise.wav, <name>_c_deepfilter.wav
set -euo pipefail
```

- [ ] **Step 2: Add argument parsing (single positional arg, -h/--help)**

```bash
FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      echo "Usage: denoise-compare <file.wav>"
      echo ""
      echo "  Runs three denoising approaches and outputs one WAV per approach:"
      echo "    <name>_a_sox.wav        SoX profile-based (silence → noiseprof → noisered)"
      echo "    <name>_b_rnnoise.wav    RNNoise neural network (ffmpeg arnndn)"
      echo "    <name>_c_deepfilter.wav DeepFilterNet (uvx deepfilternet, uses Metal on M1)"
      echo ""
      echo "  Listen to each output and compare voice preservation and noise removal."
      exit 0 ;;
    *)
      [[ -n "$FILE" ]] && { echo "Error: unexpected argument: $1"; exit 1; }
      FILE="$1"; shift ;;
  esac
done

[[ -z "$FILE" ]] && { echo "Usage: denoise-compare <file.wav>"; exit 1; }
```

- [ ] **Step 3: Add input validation**

```bash
[[ ! -f "$FILE" ]] && { echo "Error: file not found: $FILE"; exit 1; }

EXT_LOWER=$(echo "${FILE##*.}" | tr '[:upper:]' '[:lower:]')
[[ "$EXT_LOWER" == "opus" ]] && {
  echo "Error: Opus files are lossy — apply denoising to WAV or FLAC only."
  exit 1
}
```

- [ ] **Step 4: Add dependency checks**

```bash
check_dep() {
  local cmd="$1" hint="$2"
  command -v "$cmd" &>/dev/null || { echo "Error: $cmd not found. $hint"; exit 1; }
}

check_dep ffmpeg "Install with: brew install ffmpeg"
check_dep sox    "Install with: brew install sox"
check_dep uvx    "Install with: brew install uv"
```

- [ ] **Step 5: Set up temp dir and cleanup trap**

```bash
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

BASE="${FILE%.*}"
```

- [ ] **Step 6: Make the script executable and verify it runs --help cleanly**

```bash
chmod +x bin/denoise-compare
bin/denoise-compare --help
```

Expected output:
```
Usage: denoise-compare <file.wav>

  Runs three denoising approaches and outputs one WAV per approach:
    <name>_a_sox.wav        SoX profile-based (silence → noiseprof → noisered)
    <name>_b_rnnoise.wav    RNNoise neural network (ffmpeg arnndn)
    <name>_c_deepfilter.wav DeepFilterNet (uvx deepfilternet, uses Metal on M1)

  Listen to each output and compare voice preservation and noise removal.
```

- [ ] **Step 7: Verify validation — run with a missing file**

```bash
bin/denoise-compare nonexistent.wav
```

Expected: `Error: file not found: nonexistent.wav` and exit code 1.

- [ ] **Step 8: Commit**

```bash
git add bin/denoise-compare
git commit -m "feat: add denoise-compare script skeleton with validation"
```

---

### Task 2: Helper functions

**Files:**
- Modify: `bin/denoise-compare`

- [ ] **Step 1: Add `human_size` and `elapsed` helpers after the trap line**

```bash
human_size() {
  awk -v b="$1" 'BEGIN {
    if      (b >= 1073741824) printf "%.1f GB", b/1073741824
    else if (b >= 1048576)    printf "%.1f MB", b/1048576
    else if (b >= 1024)       printf "%.1f KB", b/1024
    else                      printf "%d B",    b
  }'
}

file_bytes() { wc -c < "$1" | tr -d ' '; }
```

- [ ] **Step 2: Commit**

```bash
git add bin/denoise-compare
git commit -m "feat: add helper functions to denoise-compare"
```

---

### Task 3: Approach A — SoX profile-based noise reduction

**Files:**
- Modify: `bin/denoise-compare`

Approach: detect first silence ≥ 1.5s at -30dBFS → extract that segment → build noise profile → apply noisered with sensitivity 0.21.

- [ ] **Step 1: Add the approach A block**

```bash
echo "── A: SoX profile-based ─────────────────────────────────────────────────────"
A_OUT="${BASE}_a_sox.wav"
A_START=$(date +%s)

# Detect silences
SILENCE_INFO=$(ffmpeg -i "$FILE" -af "silencedetect=noise=-30dB:d=1.5" -f null - 2>&1 || true)
SIL_START=$(echo "$SILENCE_INFO" | grep -m1 'silence_start:' | grep -oE '[0-9]+\.[0-9]+' | tail -1)
SIL_END=$(echo "$SILENCE_INFO"   | grep -m1 'silence_end:'   | grep -oE '[0-9]+\.[0-9]+' | head -1)

if [[ -z "$SIL_START" || -z "$SIL_END" ]]; then
  echo "  [skip] No silence detected at -30dBFS — cannot build noise profile."
  echo "         Try recording a few seconds of room noise at the start of a file."
else
  SIL_DUR=$(awk -v s="$SIL_START" -v e="$SIL_END" 'BEGIN{printf "%.3f", e-s}')
  echo "  Silence found at ${SIL_START}s–${SIL_END}s (${SIL_DUR}s) — building noise profile..."

  ffmpeg -y -ss "$SIL_START" -t "$SIL_DUR" -i "$FILE" \
    "$WORK/noise_sample.wav" 2>/dev/null

  sox "$WORK/noise_sample.wav" -n noiseprof "$WORK/noise.prof"
  sox "$FILE" "$A_OUT" noisered "$WORK/noise.prof" 0.21

  A_END=$(date +%s)
  echo "  Done in $((A_END - A_START))s"
  echo "  Output: $(human_size "$(file_bytes "$A_OUT")")   $A_OUT"
fi
echo ""
```

- [ ] **Step 2: Run against a real WAV file to verify approach A works**

```bash
cd /path/to/a/lecture/folder
/path/to/dotfiles/bin/denoise-compare "some_lecture.wav"
```

Expected: silence detected, `some_lecture_a_sox.wav` created, timing printed. Listen to verify noise reduced without voice distortion.

- [ ] **Step 3: Commit**

```bash
git add bin/denoise-compare
git commit -m "feat: add approach A (SoX profile-based) to denoise-compare"
```

---

### Task 4: Approach B — RNNoise via ffmpeg arnndn

**Files:**
- Modify: `bin/denoise-compare`

Note: `arnndn` in ffmpeg may require a model file (`.rnnn`) depending on the build. The script tries without a model first and falls back gracefully with a clear message if it fails.

- [ ] **Step 1: Add the approach B block**

```bash
echo "── B: RNNoise (ffmpeg arnndn) ───────────────────────────────────────────────"
B_OUT="${BASE}_b_rnnoise.wav"
B_START=$(date +%s)

if ffmpeg -y -i "$FILE" -af "arnndn" "$B_OUT" 2>/dev/null; then
  B_END=$(date +%s)
  echo "  Done in $((B_END - B_START))s"
  echo "  Output: $(human_size "$(file_bytes "$B_OUT")")   $B_OUT"
else
  echo "  [skip] arnndn filter failed — your ffmpeg build may require a model file."
  echo "         See: https://github.com/GregorR/rnnoise-models"
  echo "         Then rerun with: ffmpeg -af \"arnndn=m=/path/to/model.rnnn\" ..."
fi
echo ""
```

- [ ] **Step 2: Run against the same WAV file to verify approach B**

```bash
bin/denoise-compare "some_lecture.wav"
```

Expected: `some_lecture_b_rnnoise.wav` created (or a clear skip message if arnndn needs a model). Listen to the output if created.

- [ ] **Step 3: If arnndn fails (skip message shown), verify the skip is non-fatal**

Confirm that approach C still runs after the skip message — the script should not abort.

- [ ] **Step 4: Commit**

```bash
git add bin/denoise-compare
git commit -m "feat: add approach B (RNNoise/arnndn) to denoise-compare"
```

---

### Task 5: Approach C — DeepFilterNet via uvx

**Files:**
- Modify: `bin/denoise-compare`

The `deep-filter` CLI (from the `deepfilternet` PyPI package) writes the output to a specified directory using the same filename as the input. On M1 Mac, PyTorch uses Metal (MPS) automatically. Model (~25 MB) is downloaded on first run by uvx.

- [ ] **Step 1: Add the approach C block**

```bash
echo "── C: DeepFilterNet (uvx deepfilternet) ─────────────────────────────────────"
C_OUT="${BASE}_c_deepfilter.wav"
C_START=$(date +%s)

mkdir -p "$WORK/df"
# deep-filter writes to output dir with same basename as input
INPUT_BASENAME=$(basename "$FILE")

if uvx --from deepfilternet deep-filter "$FILE" --output-dir "$WORK/df" 2>/dev/null; then
  C_FILE="$WORK/df/$INPUT_BASENAME"
  if [[ -f "$C_FILE" ]]; then
    mv "$C_FILE" "$C_OUT"
  else
    # Fallback: find any WAV produced in the output dir
    C_FILE=$(find "$WORK/df" -name "*.wav" | head -1)
    [[ -n "$C_FILE" ]] && mv "$C_FILE" "$C_OUT"
  fi

  if [[ -f "$C_OUT" ]]; then
    C_END=$(date +%s)
    echo "  Done in $((C_END - C_START))s"
    echo "  Output: $(human_size "$(file_bytes "$C_OUT")")   $C_OUT"
  else
    echo "  [skip] deep-filter ran but produced no output — check uvx/deepfilternet install."
  fi
else
  echo "  [skip] deep-filter failed. Try: uvx --from deepfilternet deep-filter --help"
fi
echo ""
```

- [ ] **Step 2: Run against the WAV file — first run will download the model**

```bash
bin/denoise-compare "some_lecture.wav"
```

Expected: model downloads (first run only, ~25 MB), `some_lecture_c_deepfilter.wav` created, timing printed. This approach will take longer than A and B on first run due to model download; subsequent runs should be faster.

- [ ] **Step 3: Commit**

```bash
git add bin/denoise-compare
git commit -m "feat: add approach C (DeepFilterNet) to denoise-compare"
```

---

### Task 6: Summary output and full integration test

**Files:**
- Modify: `bin/denoise-compare`

- [ ] **Step 1: Add a summary section at the end of the script**

```bash
echo "── Summary ──────────────────────────────────────────────────────────────────"
echo "  Input: $FILE"
echo ""
for label in "a_sox" "b_rnnoise" "c_deepfilter"; do
  OUT="${BASE}_${label}.wav"
  if [[ -f "$OUT" ]]; then
    printf "  %-28s %s\n" "$OUT" "$(human_size "$(file_bytes "$OUT")")"
  else
    printf "  %-28s %s\n" "${BASE}_${label}.wav" "(skipped)"
  fi
done
echo ""
echo "Listen with: ffplay <file>"
```

- [ ] **Step 2: Run the full script end-to-end on a real lecture WAV**

```bash
bin/denoise-compare "260326 intersectionality_1.wav"
```

Expected: three output files alongside the original (or skip messages for any failed approach), summary table printed.

- [ ] **Step 3: Listen to each output back-to-back**

```bash
ffplay "260326 intersectionality_1_a_sox.wav"
ffplay "260326 intersectionality_1_b_rnnoise.wav"
ffplay "260326 intersectionality_1_c_deepfilter.wav"
```

Compare: voice clarity, background noise level, artifacts.

- [ ] **Step 4: Commit**

```bash
git add bin/denoise-compare
git commit -m "feat: add summary output to denoise-compare, complete harness"
```

---

## Self-review notes

- Spec requires graceful skip if no silences found for A — covered in Task 3.
- Spec requires trap cleanup of temp files — covered in Task 1.
- Spec requires per-approach timing and file size — covered in Tasks 3–5 and summary.
- Spec requires not aborting B/C if A fails — covered by independent `if` blocks per approach.
- arnndn model issue is a known risk — handled with a skip + actionable message in Task 4.
- deep-filter output path has a fallback `find` in case the basename assumption doesn't hold.
- `set -euo pipefail` is active but all risky commands are wrapped in `if` blocks to prevent unintended exits.
