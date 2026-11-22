"""校验 raw/projects 的周榜和发布记录。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import require_file  # noqa: E402


def validate(issue: Path, gaps: list[dict]) -> list[str]:
    stage = issue / "raw"
    errors = require_file(
        stage,
        "raw",
        "projects/github-trending.json",
        "schemas/raw/projects/github-trending.schema.json",
        gaps,
    )
    errors += require_file(
        stage,
        "raw",
        "projects/releases.json",
        "schemas/raw/projects/releases.schema.json",
        gaps,
    )
    return errors
