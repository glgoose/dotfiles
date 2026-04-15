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
