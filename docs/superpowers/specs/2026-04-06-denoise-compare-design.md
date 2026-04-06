# denoise-compare — design spec
_2026-04-06_

## Goal

Produce a throwaway test harness (`bin/denoise-compare`) that runs three noise-reduction approaches on a single WAV file and outputs one result per approach. The user listens to the outputs, compares quality and runtime, and picks an approach to implement in the real `denoise` script.

The current `denoise` script uses `afftdn` (blind FFT denoiser), which can subtly affect voice. This comparison will determine whether a profile-based or ML-based approach better preserves voice while removing room noise from Zoom H1 lecture hall recordings.

---

## Approaches

### A — SoX profile-based noise reduction
1. Run `ffmpeg silencedetect` on the input (threshold: `-30dB`, min duration: `1.5s`)
2. Extract the first detected silence segment into a temp WAV
3. Build a noise profile from that segment: `sox silence.wav -n noiseprof noise.prof`
4. Apply noise reduction to the full file: `sox input.wav output.wav noisered noise.prof 0.21`

The profile captures the actual noise fingerprint of the recording. Only frequencies that match the profile are attenuated, leaving speech frequencies untouched.

Dependency: `sox` (install: `brew install sox`). Script checks for `sox` at startup and prints an install hint if missing.

### B — RNNoise via ffmpeg arnndn
Apply ffmpeg's built-in RNNoise neural network filter:
```
ffmpeg -i input.wav -af "arnndn" output.wav
```
RNNoise is a lightweight recurrent neural network trained to separate speech from noise. Runs on CPU, very fast, no model file needed (built into ffmpeg). Does not use a noise profile — the model has learned speech characteristics during training.

Dependency: `ffmpeg` (already present)

### C — DeepFilterNet via uvx
```
uvx deep-filter input.wav -o output_dir/
```
DeepFilterNet is a deep learning model (~25 MB) trained for speech enhancement. On M1 Mac, PyTorch automatically uses Metal (MPS) for acceleration. Produces the highest theoretical quality but is slower than A or B.

Dependency: `uvx` (already present); model is downloaded on first run by `uvx`

---

## Script behaviour

```
Usage: denoise-compare <file.wav>
```

- Validates input: file must exist, must not be Opus
- Runs A, B, C sequentially
- Outputs alongside the input:
  - `<name>_a_sox.wav`
  - `<name>_b_rnnoise.wav`
  - `<name>_c_deepfilter.wav`
- Prints per-approach: elapsed time and output file size
- If `silencedetect` finds no silences for approach A, prints a warning and skips A (does not abort B and C)
- Cleans up all temp files on exit (trap)

---

## Silence detection parameters (approach A)

- Threshold: `-30dB` — conservative for Zoom H1 in lecture halls; ambient floor is typically -40 to -45 dBFS, giving ~10-15 dB margin
- Min duration: `1.5s` — avoids brief transients
- Profile source: first detected silence segment only — one clean segment is sufficient for `noiseprof`
- SoX sensitivity: `0.21` — standard starting point for speech recordings

---

## Constraints

- Target hardware: MacBook Air M1 8 GB unified RAM
- All approaches must run locally with no cloud calls
- Script follows `bin/` conventions: `set -euo pipefail`, short+long flags, no `pip install`
- This script is a test harness — not a permanent workflow tool. It will be superseded once an approach is chosen.

---

## Out of scope

- `--review` flag for silence playback (deferred to final `denoise` enhancement)
- `--sample` flag for separate room recording (deferred to final `denoise` enhancement)
- Automated quality measurement (listening test is sufficient)
- Integration with `lec-process`
