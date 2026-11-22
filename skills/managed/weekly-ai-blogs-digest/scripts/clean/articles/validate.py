"""校验 cleaned/articles 的 index 与一条一个文件，来源回指 raw/。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import align_index  # noqa: E402

ARTICLE_ID = r"https?://\S+"


def validate(issue: Path, gaps: list[dict]) -> list[str]:
    errors, _items = align_index(
        issue,
        "cleaned",
        "articles",
        "schemas/cleaned/articles/index.schema.json",
        "schemas/cleaned/articles/item.schema.json",
        gaps,
        source_prefix="raw/",
        id_pattern=ARTICLE_ID,
    )
    return errors
