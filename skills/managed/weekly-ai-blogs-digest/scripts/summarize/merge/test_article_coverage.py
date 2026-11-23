#!/usr/bin/env python3
"""articles_coverage 的口径：规范化 URL 去重，补录只加 feeds 里没有的。"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from prepare.articles.fetch_feeds import normalize_link  # noqa: E402
from summarize.merge.article_coverage import article_coverage  # noqa: E402


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


class ArticleCoverage(unittest.TestCase):
    def test_normalize_link_matches_prepare(self) -> None:
        self.assertEqual(normalize_link("https://example.com/a?utm_source=rss"), "example.com/a")
        self.assertNotEqual(
            normalize_link("https://mp.weixin.qq.com/s?__biz=a&mid=1"),
            normalize_link("https://mp.weixin.qq.com/s?__biz=b&mid=2"),
        )

    def test_feeds_dedup_plus_backfill_not_already_in_feeds(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            issue = Path(tmp)
            write_json(
                issue / "raw" / "articles" / "feeds.json",
                {
                    "items": [
                        {"title": "甲", "link": "https://example.com/a?utm_source=rss", "date": "2026-11-18"},
                        {"title": "甲重复", "link": "https://www.example.com/a/", "date": "2026-11-18"},
                        {"title": "乙", "link": "https://example.com/b", "date": "2026-11-18"},
                    ]
                },
            )
            write_json(
                issue / "raw" / "articles" / "backfill.json",
                {
                    "items": [
                        {"title": "乙已在 feeds", "link": "https://example.com/b?ref=1", "date": "2026-11-01"},
                        {"title": "丙", "link": "https://example.com/c", "date": "2026-11-01"},
                        {"title": "丙重复", "link": "https://example.com/c/", "date": "2026-11-01"},
                    ]
                },
            )
            write_json(
                issue / "cleaned" / "articles" / "index.json",
                {"ids": ["https://example.com/a", "https://example.com/b", "https://example.com/c"]},
            )
            self.assertEqual(article_coverage(issue), {"raw": 3, "cleaned": 3})

    def test_missing_backfill_does_not_add_and_cleaned_counts_ids(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            issue = Path(tmp)
            write_json(
                issue / "raw" / "articles" / "feeds.json",
                {"items": [{"title": "甲", "link": "https://example.com/a", "date": "2026-11-18"}]},
            )
            write_json(
                issue / "cleaned" / "articles" / "index.json",
                {"ids": ["https://example.com/a", "https://example.com/extra"]},
            )
            self.assertEqual(article_coverage(issue), {"raw": 1, "cleaned": 2})


if __name__ == "__main__":
    unittest.main()
