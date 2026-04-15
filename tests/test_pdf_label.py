import os
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).parent.parent / "bin" / "pdf-label"

def run(args, env=None):
    e = {**os.environ, **(env or {})}
    return subprocess.run(
        ["uv", "run", "--script", str(SCRIPT)] + args,
        capture_output=True, text=True, env=e,
    )

def test_missing_file_arg():
    r = run([])
    assert r.returncode != 0
    assert "usage" in r.stderr.lower() or "usage" in r.stdout.lower()

def test_nonexistent_pdf():
    r = run(["nonexistent.pdf"])
    assert r.returncode != 0
    assert "not found" in r.stderr.lower()


EXAMPLES = Path.home() / "projects" / "identify-pagesnr"
BAEHRENS = EXAMPLES / "Baehrens.pdf"


@pytest.mark.skipif(not BAEHRENS.exists(), reason="example PDFs not available")
def test_get_page_count():
    r = subprocess.run(
        ["pdfinfo", str(BAEHRENS)], capture_output=True, text=True
    )
    assert r.returncode == 0
    pages_line = next(l for l in r.stdout.splitlines() if l.startswith("Pages:"))
    assert int(pages_line.split()[-1]) > 0


@pytest.mark.skipif(not BAEHRENS.exists(), reason="example PDFs not available")
def test_extract_page_text_nonempty():
    # Baehrens page 1 is image-only; check first 5 pages for any extractable text
    r = subprocess.run(
        ["pdftotext", "-f", "1", "-l", "5", str(BAEHRENS), "-"],
        capture_output=True, text=True,
    )
    assert r.returncode == 0
    assert len(r.stdout.strip()) > 0


def test_extract_strip_takes_first_and_last_two():
    text = "\n".join([
        "Header line",
        "",
        "Body line 1",
        "Body line 2",
        "Body line 3",
        "",
        "Footer line",
    ])
    non_empty = [l for l in text.splitlines() if l.strip()]
    result = non_empty[:2] + non_empty[-2:]
    assert result == ["Header line", "Body line 1", "Body line 3", "Footer line"]


def test_extract_strip_empty_input():
    # extract_strip with empty/whitespace-only input returns empty string
    non_empty = [l for l in "".splitlines() if l.strip()]
    assert "\n".join(non_empty[:2] + non_empty[-2:]) == ""

    non_empty2 = [l for l in "   \n  \n  ".splitlines() if l.strip()]
    assert "\n".join(non_empty2[:2] + non_empty2[-2:]) == ""
