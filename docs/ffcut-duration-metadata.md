# ffcut & ffmpeg stream-copy duration-metadata gotchas

## Symptom

After cutting a media file with `ffmpeg -ss <t> -i in.ext -c copy out.ext`, the
file plays back the *correct* trimmed audio, but some players display the
*original* (longer) duration. Most visible in macOS Preview/QuickTime.

Concrete reproduction (before the fix shipped in `bin/ffcut`):

```
ffmpeg -ss 03 -i ZOOM0022.flac -c copy ZOOM0022-cut.flac
# audio is 7s, Preview shows 10s
```

ffmpeg's own log already reports the truth (`time=00:00:06.79`); the disagreement
comes from container-level duration headers that stream-copy fails to refresh.

## Why it happens, per container

Stream copy keeps the encoded packets untouched, but each container also stores
a duration in its own header/metadata. When the cut moves the start (or end),
some containers do not get rewritten correctly:

| Container | Where duration lives | Stream-copy result | Risk |
|-----------|---------------------|--------------------|------|
| **FLAC** | `STREAMINFO.total_samples` (mandatory metadata block) | Field retains the original sample count; ffmpeg does not recompute it during `-c copy`. | High — confirmed |
| **MP4 / M4A / MOV** | `mvhd`/`tkhd` durations + edit list (`elst` atom) | With `-ss` *before* `-i`, ffmpeg can write an edit list pointing past the original start. QuickTime/Preview honour the edit list, show the original duration, and silently skip the leading section. | High |
| **MP3 (VBR with Xing/LAME)** | Xing/Info frame at start of file (frame count + TOC) | The frame count may be carried over instead of being regenerated for the cut output. | Medium |
| **OGG / Opus** | Granule positions on each page | ffmpeg rewrites pages on remux, generally correct. | Low |
| **WAV** | RIFF `data` chunk size (duration = data_size / byte_rate) | ffmpeg updates chunk size on remux. | Low |
| **MKV / WebM** | Matroska segment duration | ffmpeg recomputes on remux. | Low |
| **MP3 CBR (no Xing)** | None — duration estimated from `file_size / bitrate` | Reliable. | Low |

## Fix strategy (what `bin/ffcut` does)

The aim is to keep stream copy where it works, and only depart from it when a
header genuinely cannot be repaired any other way.

| Format | Strategy | ffmpeg flags |
|--------|----------|--------------|
| FLAC | **Lossless re-encode**. Decoding and re-encoding FLAC produces bit-identical samples (verified with `-f md5`); the new STREAMINFO is computed correctly. | `-c:a flac` |
| MP4 / M4A / MOV | Stream copy, but suppress the edit list by shifting the cut to t=0. | `-c copy -avoid_negative_ts make_zero` |
| MP3 | Stream copy, force regeneration of the Xing header from the output frames. | `-c copy -write_xing 1` |
| WAV / MKV / WebM / OGG / Opus / other | Plain stream copy (current behaviour). | `-c copy` |

No format is re-encoded lossily. FLAC re-encode is lossless and takes
milliseconds for short clips.

## Verifying losslessness (FLAC)

Compare PCM sample MD5s between the original (with the same `-ss` offset
applied at decode time) and the cut output:

```bash
ffmpeg -ss 03 -i ZOOM0022.flac -f md5 -
ffmpeg -i ZOOM0022-cut.flac -f md5 -
# MD5s must match → samples are bit-identical
```

`-f md5` hashes the decoded PCM stream, not the file bytes, so it is robust
against container/header differences.

## Why not a metadata-only post-fix for FLAC?

`metaflac` cannot recompute `STREAMINFO.total_samples` without scanning every
audio frame; in practice that costs the same as a re-encode and adds an extra
binary dependency. `flac` CLI's `--skip` / `--until` also decode + re-encode
internally. ffmpeg's built-in FLAC encoder is the simplest path.

## Why not always re-encode?

For lossy formats (MP3, AAC, Opus) re-encoding adds generation loss every cut.
The MP4 edit-list and MP3 Xing problems are pure metadata issues, fixable with
a flag. Re-encoding them would solve the symptom but hurt audio quality, which
is the opposite of what `ffcut` promises.

## Related ffmpeg flags worth knowing

- `-avoid_negative_ts make_zero` — shifts timestamps so the first sample is at
  t=0; eliminates negative DTS warnings and edit lists in MP4.
- `-write_xing 0|1` — toggles the Xing/Info frame in MP3 output. Keep at `1`
  for accurate duration in players that read it.
- `-fflags +genpts` — regenerate presentation timestamps; useful when the
  source has missing or broken PTS.
- `-movflags +faststart` — relocate the `moov` atom to the front of an MP4 so
  it can stream without downloading the full file. Not needed for local cuts,
  but cheap.
