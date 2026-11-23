"""校验 raw/articles/feeds.json；backfill.json 只在写出时检查。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import require_file  # noqa: E402
from prepare.articles.fetch_feeds import WEEKLY_ALL_TRENDING_ID, WEEKLY_ALL_TRENDING_XML  # noqa: E402


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
        bad.append(f"raw/articles/feeds.json 只保留 {WEEKLY_ALL_TRENDING_ID}，发现 {token}")
    return bad


def _collect_extra_trending(row: dict, seen: set[str]) -> None:
    tokens = [row.get("id"), row.get("source"), row.get("xmlUrl")]
    for token in tokens:
        if not isinstance(token, str) or not token:
            continue
        is_trending = token.startswith("github-trending") or "GitHubTrendingRSS" in token
        if not is_trending:
            continue
        if token in {WEEKLY_ALL_TRENDING_ID, WEEKLY_ALL_TRENDING_XML}:
            continue
        seen.add(token)
