"""校验 summary/articles。ID 沿用清洗阶段，来源回指同 ID 的 cleaned 条目。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import collect_items, print_result  # noqa: E402

ARTICLE_ID = r"https?://\S+"


def validate(issue: Path) -> tuple[list[str], dict]:
    return collect_items(
        issue,
        "summary",
        "articles",
        "schemas/summary/articles/item.schema.json",
        source_prefix="cleaned/",
        id_pattern=ARTICLE_ID,
        source_id=True,
    )


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/summarize/articles/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    errors, _items = validate(Path(argv[0]))
    return print_result(errors, "ok summary/articles")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
