import csv
import importlib.machinery
import importlib.util
import os
import shutil
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

SCRIPT = Path(__file__).parent.parent / "bin" / "pdf-label"


def _load_script():
    loader = importlib.machinery.SourceFileLoader("pdf_label", str(SCRIPT))
    spec = importlib.util.spec_from_loader("pdf_label", loader)
    mod = importlib.util.module_from_spec(spec)
    loader.exec_module(mod)
    return mod

_mod = _load_script()
_is_toc_page = _mod._is_toc_page
_sample_pages = _mod._sample_pages
extract_strip = _mod.extract_strip
validate_spec = _mod.validate_spec
confirm_flow = _mod.confirm_flow
detect_arabic_ranges = _mod.detect_arabic_ranges
arabic_ranges_to_spec_part = _mod.arabic_ranges_to_spec_part

def run(args, env=None, input=None):
    e = {**os.environ, **(env or {})}
    return subprocess.run(
        ["uv", "run", "--script", str(SCRIPT)] + args,
        capture_output=True, text=True, env=e,
        input=input,
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
    result = extract_strip(text)
    assert result == "Header line\nBody line 1\nBody line 3\nFooter line"


def test_extract_strip_empty_input():
    assert extract_strip("") == ""
    assert extract_strip("   \n  \n  ") == ""


def test_is_toc_page_positive():
    text = """
Table of Contents

Introduction . . . . . . . . . . . . . . 1
Chapter 1 . . . . . . . . . . . . . . . . 15
"""
    assert _is_toc_page(text) is True


def test_is_toc_page_no_dotleader():
    text = "This book contains many interesting topics."
    assert _is_toc_page(text) is False


def test_is_toc_page_dotleader_no_contents():
    text = "Some chapter . . . . . . . . . 42"
    assert _is_toc_page(text) is False


def test_sample_pages_count():
    pages = _sample_pages(total=400, n=15)
    assert len(pages) == 15
    assert pages[0] == 1
    assert pages[-1] == 400


def test_sample_pages_small_pdf():
    pages = _sample_pages(total=10, n=15)
    assert pages == list(range(1, 11))


def test_sample_pages_no_duplicates():
    pages = _sample_pages(total=400, n=15)
    assert len(pages) == len(set(pages))


@pytest.mark.skipif(not BAEHRENS.exists(), reason="example PDFs not available")
def test_build_context_contains_sections():
    ctx = _mod.build_context(BAEHRENS)
    assert "[PAGES 1-3]" in ctx
    assert "[SAMPLED FOOTERS/HEADERS]" in ctx
    assert "Total pages:" in ctx
    assert "[TABLE OF CONTENTS" in ctx


def test_validate_spec_valid_simple():
    assert validate_spec("1: 2:r 60:D") is True

def test_validate_spec_valid_gap():
    assert validate_spec("1:r 28:D 29:D/3 60:D/35") is True

def test_validate_spec_single_entry():
    assert validate_spec("1:D") is True

def test_validate_spec_no_label():
    assert validate_spec("1:") is True

def test_validate_spec_invalid_empty():
    assert validate_spec("") is False

def test_validate_spec_invalid_garbage():
    assert validate_spec("here are the page labels: 1: 2:r") is False

def test_validate_spec_invalid_page_zero():
    assert validate_spec("0:D 1:r") is False

def _footers(pairs: list[tuple[int, int]]) -> list[tuple[int, str]]:
    """Build synthetic footer list: (physical, strip_with_page_num)."""
    return [(p, str(l)) for p, l in pairs]


def test_detect_arabic_ranges_simple():
    footers = _footers([(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)])
    assert detect_arabic_ranges(footers) == [(1, 1)]


def test_detect_arabic_ranges_with_gap():
    # Physical 3 shows label 4 → gap: new range at (3, 4)
    footers = _footers([(1, 1), (2, 2), (3, 4), (4, 5), (5, 6)])
    assert detect_arabic_ranges(footers) == [(1, 1), (3, 4)]


def test_detect_arabic_ranges_noise_filtered():
    # Physical 3 shows label 100 (false positive) — neighbors (2,2) and (4,4) agree
    footers = _footers([(1, 1), (2, 2), (3, 100), (4, 4), (5, 5)])
    assert detect_arabic_ranges(footers) == [(1, 1)]


def test_detect_arabic_ranges_empty():
    assert detect_arabic_ranges([]) == []
    assert detect_arabic_ranges([(1, "(no text)"), (2, "(no text)")]) == []


def test_detect_arabic_ranges_hay_prefix():
    # Simulate Hay.pdf: physical 28=1, 29=3 (gap), 30=4, 31=5
    footers = _footers([(28, 1), (29, 3), (30, 4), (31, 5)])
    ranges = detect_arabic_ranges(footers)
    assert ranges == [(28, 1), (29, 3)]


def test_detect_arabic_ranges_backshift_chapter_opener():
    # Physical 14 is a chapter opener — has text but no running header, so not detected.
    # Physical 15 is first detected page of new range (label 7, offset 9).
    # Back-shift: new range start = 14, label = 7-(15-14) = 6.
    # Old range: 10=1,11=2,12=3,13=4 (offset 10). New range offset 9.
    footers = (
        _footers([(10, 1), (11, 2), (12, 3), (13, 4)])
        + [(14, "Chapter Two")]          # text but no running header → no detection
        + _footers([(15, 7), (16, 8)])   # new range, 15-7+1=9
    )
    assert detect_arabic_ranges(footers) == [(10, 1), (14, 6)]


def test_detect_arabic_ranges_backshift_two_undetected():
    # Two consecutive undetected pages at gap boundary (blank + chapter opener).
    # Physical 14: blank section page (no text). Physical 15: chapter opener (text, no detect).
    # Physical 16: first detected of new range, label 9 (offset 8).
    # Back-shift: p_start = 13+1 = 14, l_start = 9-(16-14) = 7.
    footers = (
        _footers([(10, 1), (11, 2), (12, 3), (13, 4)])  # old range, offset 10
        + [(14, "(no text)"), (15, "Chapter Three")]      # blank + chapter opener
        + _footers([(16, 9), (17, 10)])                   # new range, 16-9+1=8
    )
    assert detect_arabic_ranges(footers) == [(10, 1), (14, 7)]


def test_detect_arabic_ranges_backshift_respects_old_range():
    # Between the old range and new range, physical 14 has a detectable number
    # matching the OLD range (label 5, old offset 10: 14-5+1=10). The new range
    # starts AFTER physical 14 — at physical 15 (chapter opener, no detect).
    # Physical 16 is first detected of new range, label 7 (offset 10? No: 16-7+1=10,
    # same offset means no gap). Use offset 9: physical 16=8 (16-8+1=9).
    # Old: 10=1,...,14=5 (offset 10). Physical 14 detectable (standalone "5").
    # → Physical 14 would be in filtered (consistent with prev 13=4).
    # → p_prev becomes 14, not 13. Back-shift scans from 15 only.
    # Physical 15: chapter opener "Chapter" → no detect → p_start=15.
    # l_start = 8-(16-15) = 7.
    footers = (
        _footers([(10, 1), (11, 2), (12, 3), (13, 4), (14, 5)])  # old range
        + [(15, "Chapter Four")]                                     # chapter opener
        + _footers([(16, 8), (17, 9)])                              # new range, offset 9
    )
    assert detect_arabic_ranges(footers) == [(10, 1), (15, 7)]


def test_arabic_ranges_to_spec_part():
    assert arabic_ranges_to_spec_part([(28, 1)]) == "28:D"
    assert arabic_ranges_to_spec_part([(28, 1), (29, 3)]) == "28:D 29:D/3"
    assert arabic_ranges_to_spec_part([(18, 1), (33, 17), (60, 45)]) == "18:D 33:D/17 60:D/45"


def test_arabic_ranges_to_spec_part_empty():
    assert arabic_ranges_to_spec_part([]) == ""


def test_confirm_flow_yes():
    with patch("builtins.input", return_value="y"):
        result = confirm_flow("1: 2:r 60:D")
    assert result == "1: 2:r 60:D"

def test_confirm_flow_no():
    with patch("builtins.input", return_value="n"):
        result = confirm_flow("1: 2:r 60:D")
    assert result is None

def test_confirm_flow_edit():
    with patch("builtins.input", side_effect=["e", "1: 2:r 58:D"]):
        result = confirm_flow("1: 2:r 60:D")
    assert result == "1: 2:r 58:D"

def test_confirm_flow_edit_invalid_then_valid():
    with patch("builtins.input", side_effect=["e", "bad spec!!!", "1: 2:r 58:D"]):
        result = confirm_flow("1: 2:r 60:D")
    assert result == "1: 2:r 58:D"


def load_known_labels() -> dict[str, str]:
    labels_csv = EXAMPLES / "labels.csv"
    result = {}
    with open(labels_csv) as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        for row in reader:
            if len(row) >= 2:
                filename = row[0].strip()
                spec = row[1].strip()
                result[filename] = spec
    return result


@pytest.mark.skipif(not EXAMPLES.exists(), reason="example PDFs not available")
@pytest.mark.skipif(not os.environ.get("ANTHROPIC_API_KEY"), reason="no API key")
@pytest.mark.parametrize("filename", ["Baehrens.pdf", "Carve.pdf", "Hall.pdf"])
def test_integration_label_detection(filename, tmp_path):
    """Script proposes correct labels for clean example PDFs."""
    known = load_known_labels()
    pdf = EXAMPLES / filename
    test_pdf = tmp_path / filename
    shutil.copy(pdf, test_pdf)

    r = run(["--confirm", str(test_pdf)], input="n\n")
    # Script blocks on input in confirm mode — but output up to the prompt is captured
    assert "Proposed labels:" in r.stdout, f"Script output: {r.stdout}\nStderr: {r.stderr}"
    for line in r.stdout.splitlines():
        if line.startswith("Proposed labels:"):
            proposed = line.split(":", 1)[1].strip()
            expected = known.get(filename, "")
            # At minimum: same number of label segments (colon count matches)
            assert proposed.count(":") == expected.count(":"), (
                f"{filename}: proposed '{proposed}' vs expected '{expected}'"
            )
