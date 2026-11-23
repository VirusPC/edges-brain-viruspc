"""校验 raw/articles/feeds.json；backfill.json 只在写出时检查。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import gaps_for_lane, print_result, require_file, stage_version, version_reached  # noqa: E402

# 0.0.7 起文章 feed 不再收录 GitHub Trending。更早的 raw 按自己的 stage.json 版本看。
FEEDS_EXCLUDE_TRENDING_SINCE = "0.0.7"


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
    if version_reached(stage_version(issue, "raw"), FEEDS_EXCLUDE_TRENDING_SINCE):
        errors += _trending_only_weekly_all(stage / "articles" / "feeds.json")
    return errors


def _trending_only_weekly_all(path: Path) -> list[str]:
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return [f"raw/articles/feeds.json 不是合法 JSON: {exc}"]
    if not isinstance(data, dict):
        return ["raw/articles/feeds.json 必须是对象"]
    bad: list[str] = []
    seen: set[str] = set()
    for source in data.get("sources") or []:
        if isinstance(source, dict):
            _collect_extra_trending(source, seen)
    for item in data.get("items") or []:
        if isinstance(item, dict):
            _collect_extra_trending(item, seen)
    for token in sorted(seen):
        bad.append(f"raw/articles/feeds.json 不收 GitHub Trending，发现 {token}。周榜由开源项目脚本写入 raw/projects/github-trending.json")
    return bad


def _collect_extra_trending(row: dict, seen: set[str]) -> None:
    tokens = [row.get("id"), row.get("source"), row.get("xmlUrl")]
    for token in tokens:
        if not isinstance(token, str) or not token:
            continue
        is_trending = token.startswith("github-trending") or "GitHubTrendingRSS" in token
        if not is_trending:
            continue
        seen.add(token)


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/prepare/articles/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    issue = Path(argv[0])
    gaps, gap_errors = gaps_for_lane(issue, "raw")
    return print_result(gap_errors + validate(issue, gaps), "ok raw/articles")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
