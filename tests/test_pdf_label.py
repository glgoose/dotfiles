import importlib.util
import os
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
