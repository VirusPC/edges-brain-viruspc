"""校验 summary/articles。ID 沿用清洗阶段，来源回指同 ID 的 cleaned 条目。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import SUMMARY_RULES_SINCE, collect_items, print_result, summary_version, version_reached  # noqa: E402
from summarize.cards import card_problems, details_class_problem  # noqa: E402

ARTICLE_ID = r"https?://\S+"


def validate(issue: Path) -> tuple[list[str], dict]:
    errors, items = collect_items(
        issue,
        "summary",
        "articles",
        "schemas/summary/articles/item.schema.json",
        source_prefix="cleaned/",
        id_pattern=ARTICLE_ID,
        source_id=True,
    )
    version = summary_version(issue)
    for item_id, item in items.items():
        where = f"summary/articles {item_id}"
        text = item.get("text")
        detail_error, warning = details_class_problem(text, where, version)
        if detail_error:
            errors.append(detail_error)
        if warning:
            print(warning, file=sys.stderr)
        if version_reached(version, SUMMARY_RULES_SINCE):
            errors.extend(card_problems(text, where))
    return errors, items


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/summarize/articles/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    errors, _items = validate(Path(argv[0]))
    return print_result(errors, "ok summary/articles")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
