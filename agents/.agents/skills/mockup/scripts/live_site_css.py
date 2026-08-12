#!/usr/bin/env python3
"""Emit built site CSS for standalone file:// mockups.

The mockup skill keeps output as one HTML file. This helper reads the project's
built CSS from dist/_astro, rewrites root-relative asset URLs to file:// URLs,
and prints a style block payload suitable for the {{LIVE_SITE_CSS}} template
placeholder.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import quote


URL_RE = re.compile(r"url\((['\"]?)(/[^)'\"\s]+)\1\)")
STYLE_RE = re.compile(r"<style(?:\s[^>]*)?>(.*?)</style>", re.DOTALL | re.IGNORECASE)


def file_url(path: Path) -> str:
    return "file://" + quote(str(path.resolve()))


def rewrite_urls(css: str, project_root: Path) -> str:
    public_root = project_root / "public"

    def repl(match: re.Match[str]) -> str:
        raw_url = match.group(2)
        local_path = public_root / raw_url.lstrip("/")
        if not local_path.exists():
            return match.group(0)
        return f'url("{file_url(local_path)}")'

    return URL_RE.sub(repl, css)


def collect_css_files(project_root: Path) -> list[tuple[str, str]]:
    css_files = sorted((project_root / "dist").rglob("*.css"))
    return [(str(css_file.relative_to(project_root)), css_file.read_text(encoding="utf-8")) for css_file in css_files]


def collect_inline_styles(project_root: Path, html_path: Path | None) -> list[tuple[str, str]]:
    html_files = [html_path] if html_path else sorted((project_root / "dist").rglob("*.html"))
    chunks: list[tuple[str, str]] = []
    seen: set[str] = set()

    for html_file in html_files:
        if not html_file.exists():
            continue
        html = html_file.read_text(encoding="utf-8")
        for index, style in enumerate(STYLE_RE.findall(html), start=1):
            normalized = style.strip()
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            label = f"{html_file.relative_to(project_root)} inline style {index}"
            chunks.append((label, normalized))
    return chunks


def collect_css(project_root: Path, html_path: Path | None) -> str:
    chunks = collect_css_files(project_root)
    if not chunks:
        chunks = collect_inline_styles(project_root, html_path)
    if not chunks:
        raise FileNotFoundError(
            "No built CSS found in dist. Run the project build first."
        )

    rendered = []
    for label, css in chunks:
        css = rewrite_urls(css, project_root)
        css = css.replace("</style", "<\\/style")
        rendered.append(f"/* {label} */\n{css}")
    return "\n\n".join(rendered)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "project_root",
        nargs="?",
        default=".",
        help="Project root containing dist/_astro and public/",
    )
    parser.add_argument(
        "--html",
        help="Optional built HTML file to read inline styles from when no CSS files exist.",
    )
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    html_path = Path(args.html).resolve() if args.html else None
    try:
        sys.stdout.write(collect_css(project_root, html_path))
    except FileNotFoundError as exc:
        print(f"live_site_css.py: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
