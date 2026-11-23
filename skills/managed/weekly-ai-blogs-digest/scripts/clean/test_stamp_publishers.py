#!/usr/bin/env python3
"""清洗阶段把发布方写进对应一路，不改其他路。"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from clean.stamp_publishers import stamp_lane  # noqa: E402

ARTICLE = "https://openai.com/index/example"
REPO = "https://github.com/example/demo"


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


class StampLane(unittest.TestCase):
    def test_articles_lane_gets_publisher_and_projects_stay(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            issue = Path(tmp) / "2026-11-20"
            write_json(
                issue / "raw" / "articles" / "feeds.json",
                {"items": [{"title": "一篇", "link": ARTICLE, "date": "2026-11-18", "source": "openai-news"}]},
            )
            write_json(
                issue / "raw" / "projects" / "github-trending.json",
                {"items": [{"link": REPO, "source": "github-trending-weekly-all"}]},
            )
            write_json(
                issue / "cleaned" / "articles" / "example.json",
                {
                    "id": ARTICLE,
                    "title": "一篇",
                    "date": "2026-11-18",
                    "source": "raw/articles/feeds.json",
                    "publisher": "WRONG",
                    "category": "博客",
                    "url": "https://example.com/wrong",
                    "text": "正文",
                },
            )
            write_json(
                issue / "cleaned" / "projects" / "demo.json",
                {
                    "id": REPO,
                    "source": "raw/projects/github-trending.json",
                    "publisher": "WRONG",
                    "category": "GitHub Trending",
                    "url": "https://example.com/wrong",
                },
            )
            errors = stamp_lane(issue, "articles")
            self.assertEqual(errors, [], errors)
            article = json.loads((issue / "cleaned" / "articles" / "example.json").read_text(encoding="utf-8"))
            project = json.loads((issue / "cleaned" / "projects" / "demo.json").read_text(encoding="utf-8"))
            self.assertEqual(article["publisher"], "OpenAI")
            self.assertEqual(article["category"], "博客")
            self.assertEqual(article["url"], "https://openai.com/news/")
            self.assertEqual(project["publisher"], "WRONG")


if __name__ == "__main__":
    unittest.main()
