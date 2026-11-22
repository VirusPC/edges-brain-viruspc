"""校验 summary/projects。ID 是仓库地址。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import collect_items  # noqa: E402

REPO_ID = r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+"


def validate(issue: Path) -> tuple[list[str], dict]:
    return collect_items(
        issue,
        "summary",
        "projects",
        "schemas/summary/projects/item.schema.json",
        source_prefix="cleaned/",
        id_pattern=REPO_ID,
        source_id=True,
    )
