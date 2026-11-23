"""校验 raw/projects 的周榜和发布记录。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import gaps_for_lane, print_result, require_file  # noqa: E402
from prepare.projects.trending import WEEKLY_ALL_TRENDING_ID, WEEKLY_ALL_TRENDING_XML  # noqa: E402

ALLOWED_BOARD = "weekly/all"
ALLOWED_SOURCES = {WEEKLY_ALL_TRENDING_ID, WEEKLY_ALL_TRENDING_XML, ALLOWED_BOARD}


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
    errors += _trending_is_weekly_all(stage / "projects" / "github-trending.json")
    return errors


def _trending_is_weekly_all(path: Path) -> list[str]:
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"raw/projects/github-trending.json 不是合法 JSON: {exc}"]
    if not isinstance(data, dict):
        return ["raw/projects/github-trending.json 必须是对象"]
    errors: list[str] = []
    source = data.get("source")
    if isinstance(source, str) and source and source not in ALLOWED_SOURCES:
        errors.append(f"raw/projects/github-trending.json 只接受每周总榜，source 是 {source}")
    xml = data.get("xmlUrl")
    if isinstance(xml, str) and xml and xml != WEEKLY_ALL_TRENDING_XML:
        errors.append(f"raw/projects/github-trending.json 只接受每周总榜，xmlUrl 是 {xml}")
    for key in ("category", "board"):
        value = data.get(key)
        if isinstance(value, str) and value and value not in {ALLOWED_BOARD, WEEKLY_ALL_TRENDING_ID}:
            errors.append(f"raw/projects/github-trending.json 只接受 weekly/all，{key} 是 {value}")
    boards = data.get("boards")
    if isinstance(boards, dict):
        extra = [key for key in boards if str(key) != ALLOWED_BOARD]
        if extra:
            errors.append(f"raw/projects/github-trending.json 不得保留语言榜或其它榜: {extra}")
    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/prepare/projects/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    issue = Path(argv[0])
    gaps, gap_errors = gaps_for_lane(issue, "raw")
    return print_result(gap_errors + validate(issue, gaps), "ok raw/projects")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
