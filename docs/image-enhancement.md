# image-enhancement

Enhancement recipes for derivative PDFs from flatbed scans. Applied after resampling to 300 DPI — never touches the archival TIFF master.

## Why global ops fail at page edges

Flatbed CCDs have measurable illuminance non-uniformity worst at platen edges (FADGI 3rd ed.; PMC5148133). Global operators (`-level`, `-contrast-stretch`, `-sigmoidal-contrast`) compute one transfer curve from the whole frame — dominated by the well-lit centre. Faint grey ink near the edge barely moves.

## CLAHE: the right tool for edge vignetting

CLAHE (Contrast Limited Adaptive Histogram Equalization) partitions the image into tiles, equalises each tile locally, bilinearly interpolates between them. Each peripheral tile gets its own stretch against local paper-white. The clip limit prevents noise and paper grain from being amplified.

### Critical parameters

**Tile size** — use `8x8%`, not `50x50%`. At 50% you get 2×2 tiles (essentially global). At 8% you get 144 tiles, tracking the slow vignette gradient.

**Clip limit** — start at `+3` (ImageMagick recommendation). `+2` safe, `+4` risks paper grain.

**L-channel only** — apply CLAHE only to the L component of LAB space to avoid RGB colour drift. In ImageMagick, L maps to the R channel after `-colorspace LAB`:

```bash
-colorspace LAB -channel R -clahe 8x8%+256+3 +channel -colorspace sRGB
```

### Full syntax

```
-clahe widthxheight{%}{+}bins{+}clip-limit
```

## USM (Unsharp Mask) — grain threshold

USM is a high-pass filter: amplifies all frequencies above ~1/radius. Paper grain at 300 DPI sits at 2–4% gradient. Default threshold `0.02` = grain gets sharpened.

**Use threshold `0.05`** to skip paper grain, only fire on text-stroke edges:

```bash
-unsharp 0x1+0.5+0.05
```

**Order:** always CLAHE then USM, never reversed.

## Recipes

### CLAHE only (L-channel)
```bash
magick input.tif \
  -colorspace LAB -channel R -clahe 8x8%+256+3 +channel -colorspace sRGB \
  output.png
```

### CLAHE + grain-safe USM
```bash
magick input.tif \
  -colorspace LAB -channel R -clahe 8x8%+256+3 +channel -colorspace sRGB \
  -unsharp 0x1+0.5+0.05 \
  output.png
```

### Background divide + CLAHE (strongest vignette correction)
Estimate paper surface with large Gaussian, divide it out, then CLAHE:
```bash
magick input.tif \
  \( +clone -blur 0x80 \) -compose Divide_Src -composite -auto-level \
  -colorspace LAB -channel R -clahe 8x8%+256+3 +channel -colorspace sRGB \
  output.png
```

## Integration with scan-to-pdf

Once a recipe is confirmed from `scan-enhance-test` runs, fold it into `scan-to-pdf` under a new `--enhance` flag in the `MAGICK_ENCODE` block (lines ~99–102):

```bash
[[ $ENHANCE -eq 1 ]] && MAGICK_ENCODE+=(-colorspace LAB -channel R -clahe 8x8%+256+3 +channel -colorspace sRGB)
```

Keep as opt-in (off by default) — not all documents have edge vignetting.

## Test harness

`~/dotfiles/bin/scan-enhance-test` — crops right 20% of ROI after rotation, runs a grid of labeled variants, outputs montage for visual comparison.

```bash
scan-enhance-test -R ref.tif input.tif     # ref = unprocessed reference cell
```

## Known ImageMagick CLAHE bugs

- 7.0.8-23: clip-limit ignored (all values identical output)
- 7.0.9: crashes on <640 px or >5000 px images
- Fixed in 7.1.x+ — check `magick --version`

## Sources

- [ImageMagick `-clahe` docs](https://imagemagick.org/script/clahe.php)
- [Wikipedia: Adaptive histogram equalization](https://en.wikipedia.org/wiki/Adaptive_histogram_equalization)
- [IEEE 9688796 — CLAHE + USM frequency split](https://ieeexplore.ieee.org/document/9688796/)
- [PMC5148133 — Flatbed CCD lateral drift](https://pmc.ncbi.nlm.nih.gov/articles/PMC5148133/)
- [Siril CLAHE docs](https://siril.readthedocs.io/en/latest/processing/clahe.html)
- FADGI Technical Guidelines 3rd ed. (2023)
