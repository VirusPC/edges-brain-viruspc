#!/usr/bin/env python3
"""统计本期原文篇数和清洗后篇数，写入 summary/index.json 的 articles_coverage。

这不是精选入选数。口径见 references/summarize/merge.md。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from prepare.articles.fetch_feeds import normalize_link  # noqa: E402


def article_coverage(issue: Path) -> dict[str, int]:
    """raw 是 feeds 去重后再加 feeds 里没有的补录；cleaned 是清洗后的 id 数。"""
    issue = Path(issue)
    seen: set[str] = set()
    raw = _count_new_links(issue / "raw" / "articles" / "feeds.json", seen)
    raw += _count_new_links(issue / "raw" / "articles" / "backfill.json", seen)
    return {"raw": raw, "cleaned": _cleaned_count(issue / "cleaned" / "articles" / "index.json")}


def _count_new_links(path: Path, seen: set[str]) -> int:
    added = 0
    for item in _items(path):
        link = item.get("link")
        if not isinstance(link, str) or not link.strip():
            continue
        key = normalize_link(link)
        if not key or key in seen:
            continue
        seen.add(key)
        added += 1
    return added


def _items(path: Path) -> list:
    data = _read(path)
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return [item for item in data["items"] if isinstance(item, dict)]
    return []


def _cleaned_count(path: Path) -> int:
    data = _read(path)
    ids = data.get("ids") if isinstance(data, dict) else None
    if not isinstance(ids, list):
        return 0
    return sum(1 for item in ids if isinstance(item, str) and item)


def _read(path: Path):
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(
            "用法: python3 scripts/summarize/merge/article_coverage.py issues/<生成日>",
            file=sys.stderr,
        )
        return 2
    print(json.dumps(article_coverage(Path(argv[0])), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
