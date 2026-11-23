#!/usr/bin/env python3
"""文章 feed 里的 Trending 只在 raw 版本达到 0.0.7 之后才算错误。"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from prepare.articles.validate import validate  # noqa: E402

PREPARE = "skills/managed/weekly-ai-blogs-digest/references/prepare/prepare.md"


def write(issue: Path, version: str) -> None:
    raw = issue / "raw"
    raw.mkdir(parents=True)
    (raw / "stage.json").write_text(
        json.dumps(
            {"name": "raw", "skill": "weekly-ai-blogs-digest", "version": version, "path": PREPARE},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (raw / "articles").mkdir()
    (raw / "articles" / "feeds.json").write_text(
        json.dumps(
            {
                "items": [
                    {
                        "title": "周榜",
                        "link": "https://github.com/example/demo",
                        "date": "2026-11-18",
                        "source": "github-trending-weekly-all",
                    }
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )


class FeedsTrendingVersion(unittest.TestCase):
    def test_old_raw_keeps_trending_in_the_article_feed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            issue = Path(tmp) / "2026-11-20"
            write(issue, "0.0.6")
            errors = validate(issue, [])
            self.assertFalse(any("不收 GitHub Trending" in item for item in errors))

    def test_raw_from_0_0_7_rejects_trending_in_the_article_feed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            issue = Path(tmp) / "2026-11-20"
            write(issue, "0.0.7")
            errors = validate(issue, [])
            self.assertTrue(any("不收 GitHub Trending" in item for item in errors))


if __name__ == "__main__":
    unittest.main()
