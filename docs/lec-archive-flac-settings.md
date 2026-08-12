# lec-archive — FLAC settings for speech archival

Background research and rationale for the FLAC encoding choices in `bin/lec-archive`.
The script archives lectures, panels, presentations, and read-aloud books captured
on a Zoom recorder.

## Defaults

The script encodes FLAC with: **mono, signed 16-bit (`s16`), sample rate capped at
48 kHz, compression level 8.** A `--strict-lossless` flag preserves the source
exactly (no channel/depth/rate change).

These are the smallest settings that remain functionally lossless for spoken-word
content while staying inside the IASA archival sample-rate floor.

## Definitions

- **Sample rate**: number of amplitude snapshots per second. 44.1 kHz = CD; 48 kHz =
  pro audio / video; 96–192 kHz = mastering / ultrasonic capture.
- **Bit depth**: precision of each amplitude snapshot.
  - **`s16`** = signed 16-bit integer per sample. ~96 dB dynamic range. CD spec.
  - **`s24`** / **`s32`** = 24-bit / 32-bit. ~144 dB / ~192 dB. Studio/mastering use.
- **Channels**: mono = 1, stereo = 2. Lectures captured with one microphone source
  are inherently mono even when the recorder writes a stereo file.
- **Compression level (FLAC)**: 0 (fast, larger) to 8 (slow, smallest). Lossless
  at every level. `-8` is the highest standard preset; no further lossless gains
  exist within FLAC.

## Why the chosen defaults

### Sample rate cap of 48 kHz

Speech information lives below 8 kHz. Sibilants and timbre top out around 10–12 kHz.
By Nyquist, a sample rate of 22.05 kHz already captures everything audible in
speech; 48 kHz captures the full audible band (up to 24 kHz) with margin.

| Source SR | After 48 kHz cap | Audible difference for speech |
|-----------|-----------------|-------------------------------|
| 44.1 kHz  | unchanged       | none |
| 48 kHz    | unchanged       | none |
| 96 kHz    | downsampled     | none |
| 192 kHz   | downsampled     | none |

The Zoom H1 records 44.1 kHz / 16-bit stereo by default; the cap is a no-op for
those files. The cap exists to protect against accidentally archiving a 192 kHz
file at 4× the necessary size.

### Mono

Speech is one source. Recording stereo doubles the file size while encoding the
same content twice (the two channels are nearly identical). A panel discussion
captured by a single recorder placed centrally does not resolve into spatial
separation, so stereo offers no useful spatial cue. `-ac 1` downmixes both
channels into one.

`--strict-lossless` skips this when stereo separation matters (multi-mic
recording, music in the room, future spatial analysis).

### `s16` bit depth

16-bit covers ~96 dB of dynamic range. Speech occupies maybe 30–40 dB. There is
no headroom argument for archiving born-digital speech at 24-bit. The Zoom H1
records at 16-bit by default, so this is also a no-op for that recorder.

### Compression level 8

`-8` is FLAC's highest preset (`-l 12 -b 4096 -m -r 6 -A "subdivide_tukey(3)"`).
Slower than the default `-5` but still encodes faster than realtime on modern
hardware. There is no higher lossless setting.

## When to use `--strict-lossless`

Reach for it when "I might want this exact bit-pattern back" outweighs file
size. Examples:

- Recordings of a person you cannot record again (deceased speaker, one-off
  event, historic moment).
- Multi-mic captures where channel separation might be useful for later cleanup.
- Recordings that contain music you might extract (book reading with musical
  interludes, panel with live performance).
- Anything captured at non-standard rates *intentionally* (ultrasonic, pitch
  research).

For typical lectures, books, panels, presentations: the default is correct.

## Comparison to institutional preservation standards

| Standard | Sample rate | Bit depth | Format | Context |
|----------|------------|-----------|--------|---------|
| IASA TC-04 | ≥ 48 kHz | ≥ 24-bit | BWF / FLAC | Analog → digital preservation transfers |
| Library of Congress | 96 kHz | 24-bit | BWF | Same |
| **lec-archive default** | **≤ 48 kHz** | **16-bit** | **FLAC mono** | **Born-digital speech, daily use** |
| Podcast / lecture archives | 22.05 / 44.1 kHz | 16-bit | FLAC / MP3 | Born-digital speech, distribution |

IASA and LOC standards are written for institutions digitising unique analog
masters once and storing them forever. They are not the right yardstick for
born-digital speech recordings made on a consumer recorder. `lec-archive`'s
default sits at the IASA sample-rate floor, drops bit depth where it is not
audible, and drops a redundant channel.

## Comparison to even smaller targets (not chosen)

A 22.05 kHz mono `s16` FLAC ("compact archive") is roughly half the size of the
44.1 kHz default. It is a defensible setting for a speech archive. It is not the
default because:

- The savings only matter at scale; one lecture at 44.1 kHz is ~100 MB/hour.
- It introduces a roll-off above 11 kHz that is in principle audible (sibilants,
  consonant edges) even if hard to hear in casual playback.
- A 22.05 kHz file cannot be upgraded later; a 44.1 kHz file can be downsampled
  any time disk pressure becomes real.

If `--compact` is ever added, it should be a flag, not a default.

## Verification

After encoding, confirm the output settings match expectation:

```bash
ffprobe -v error -show_entries stream=sample_rate,channels,sample_fmt \
  -of default=noprint_wrappers=1 OUTPUT.flac
# Expected (default mode): sample_rate ≤ 48000, channels=1, sample_fmt=s16
# Expected (--strict-lossless): matches the source file's stream parameters
```

To confirm a strict-lossless re-encode is bit-identical to the source PCM:

```bash
ffmpeg -i SOURCE.wav -f md5 -
ffmpeg -i OUTPUT.flac -f md5 -
# MD5s must match
```

The default mode is intentionally not bit-identical (downmix, downsample, depth
clamp), so this check applies only to `--strict-lossless`.

## Sources

- [IASA TC-04 §2: Key Digital Principles](https://www.iasa-web.org/tc04/key-digital-principles)
- [Library of Congress — Recommended Formats Statement: Audio](https://www.loc.gov/preservation/resources/rfs/audio.html)
- [FLAC command-line reference](https://xiph.org/flac/documentation_tools_flac.html)
- [Audacity Manual — Sample Rates](https://manual.audacityteam.org/man/sample_rates.html)
- [Zoom H4n manual](https://zoomcorp.com/media/documents/H4n-manual.pdf) (default 44.1 kHz / 16-bit, max 96 kHz)
