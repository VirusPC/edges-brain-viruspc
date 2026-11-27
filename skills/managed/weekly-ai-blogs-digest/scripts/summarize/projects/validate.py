"""校验 summary/projects。ID 是仓库地址。顺序跟本周 GitHub Trending 前 5。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import collect_items, print_result, read_json  # noqa: E402
from summarize.cards import card_problems, title_line_problems  # noqa: E402

REPO_ID = r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+"
TOP = 5


def trending_top(issue: Path, count: int = TOP) -> list[str]:
    path = issue / "raw" / "projects" / "github-trending.json"
    try:
        data = read_json(path)
    except (OSError, ValueError):
        return []
    found: list[str] = []
    for item in data.get("items") or [] if isinstance(data, dict) else []:
        link = str((item or {}).get("link") or "").split("?", 1)[0].rstrip("/")
        if not link.startswith("https://github.com/") or link in found:
            continue
        found.append(link)
        if len(found) == count:
            break
    return found


def validate(issue: Path) -> tuple[list[str], dict]:
    errors, items = collect_items(
        issue,
        "summary",
        "projects",
        "schemas/summary/projects/item.schema.json",
        source_prefix="cleaned/",
        id_pattern=REPO_ID,
        source_id=True,
    )
    expected = trending_top(issue)
    if len(expected) != TOP:
        errors.append(f"GitHub Trending 每周总榜不足 {TOP} 个仓库")
    elif set(items) != set(expected):
        errors.append("项目应正好是本周 GitHub Trending 前 5，不跳过上周已经入选的")
    for item_id, item in items.items():
        where = f"summary/projects {item_id}"
        errors.extend(card_problems(item.get("text"), where))
        cleaned = _cleaned(issue, item.get("source"))
        errors.extend(title_line_problems(item.get("text") or "", cleaned.get("stars"), cleaned.get("license"), where))
    return errors, items


def _cleaned(issue: Path, source) -> dict:
    if not isinstance(source, str):
        return {}
    path = issue / source
    try:
        data = read_json(path)
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/summarize/projects/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    errors, _items = validate(Path(argv[0]))
    return print_result(errors, "ok summary/projects")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
