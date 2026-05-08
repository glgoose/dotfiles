---
name: pdf-reader
description: Extract and read PDF content efficiently using pdftotext instead of rendering as images. Use whenever the user shares a PDF path or asks to read/analyze a PDF document. This avoids expensive multimodal image rendering (20-30x token savings).
---

Use `pdf-read` CLI — outputs text to stdout.

```bash
pdf-read /path/to/file.pdf           # full PDF
pdf-read /path/to/file.pdf 1 5       # pages 1–5
```

Only fall back to Read tool on PDF if content is purely visual (scanned images, no text layer).
