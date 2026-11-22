"""校验 raw/articles/feeds.json；backfill.json 只在写出时检查。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import require_file  # noqa: E402


def validate(issue: Path, gaps: list[dict]) -> list[str]:
    stage = issue / "raw"
    errors = require_file(stage, "raw", "articles/feeds.json", "schemas/raw/articles/feeds.schema.json", gaps)
    errors += require_file(
        stage,
        "raw",
        "articles/backfill.json",
        "schemas/raw/articles/backfill.schema.json",
        gaps,
        optional=True,
    )
    return errors
