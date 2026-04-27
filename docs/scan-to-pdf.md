# scan-to-pdf

Script at `~/dotfiles/bin/scan-to-pdf`.

## What it does

Converts a scanned TIFF to a compressed PDF via a single JPEG pass — no generation loss. Based on FADGI archival standards research.

## Usage

```bash
scan-to-pdf -r 90 input.tif output.pdf                        # basic, rotate 90 right
scan-to-pdf -r 90 -e input.tif output.pdf                     # + CLAHE local contrast
scan-to-pdf -r 90 --sharpen input.tif output.pdf              # + unsharp mask
scan-to-pdf -r 90 --pdfa input.tif output.pdf                 # + OCR + PDF/A-2b
scan-to-pdf -r 90 --pdfa -l nld+lat input.tif output.pdf      # with Latin honorifics
scan-to-pdf --contrast input.tif output.pdf                    # + contrast stretch
```

## Pipeline

```
TIFF (600 DPI master)
  → rotate (if needed)
  → Lanczos resample to 300 DPI
  → [CLAHE on L-channel]           (-e/--enhance — recovers faint ink near page edges)
  → [contrast stretch 0.5%x0.5%]  (--contrast only — darkens text, lightens paper)
  → [unsharp mask 0x1+0.5+0.03]   (--sharpen only — edge crispness)
  → JPEG q90, no chroma subsampling (1x1)
  → img2pdf lossless wrap          (JPEG bytes embedded verbatim, zero re-encode)
  → [ocrmypdf --pdfa-2b]           (optional)
```

## Key decisions

- **img2pdf not Ghostscript**: GS always re-encodes (second JPEG pass). img2pdf embeds verbatim.
- **`-e/--enhance` (CLAHE, off by default)**: local contrast on L-channel only — equalises each tile of the image independently, recovering faint ink near the page edge where flatbed CCD illumination drops off. Recipe: `-colorspace LAB -channel R -clahe 50x50%+256+3 +channel -colorspace sRGB`. Confirmed on degree certificate (2026-04-27). May become default if it proves useful on all scans.
- **Contrast stretch opt-in (`--contrast`)**: not the primary fix in practice. Available but off by default. FADGI allows contrast correction on derivatives without logging.
- **USM opt-in**: sharpening on derivative is fine per FADGI, but threshold 0.03 skips paper grain. Made opt-in because contrast stretch alone usually sufficient.
- **600 DPI scan → 300 DPI PDF**: marginally better than scanning at 300 DPI directly due to Lanczos anti-aliasing. Visually confirmed on this certificate's circular arc text.
- **Scanner sharpening OFF**: correct per FADGI — baked in and irreversible. Do it in software on the derivative instead.

## Scanner settings (for important documents)

| Setting | Value | Reason |
|---------|-------|--------|
| DPI | 600 | Keep as archival master; downsample in script |
| Color | 24-bit color | Preserves seals, colored ink, embossed shadows |
| Format | TIFF | Lossless master. Never JPEG, never scan-to-PDF |
| Sharpening | OFF | Do it in software on derivative |
| B&W docs | Grayscale | Never use scanner's "Black & White" mode — hard threshold loses detail |

## Expected output size (single A4 page)

| Settings | Size |
|----------|------|
| Default (q90, contrast) | ~1–2 MB |
| + sharpen | ~1–2 MB |
| + --pdfa | ~1–2 MB + OCR layer |

## Todo / pick up later

- [ ] Test contrast stretch + sharpen on actual degree rescan and compare to GS version
- [ ] Consider `--deskew` flag (ImageMagick `-deskew 40%`) for auto-straighten
- [ ] Update Obsidian note (`scanning documents to PDF.md`) with final script params after testing
- [ ] Rescan the degree at 600 DPI TIFF with scanner sharpening OFF, then run script
