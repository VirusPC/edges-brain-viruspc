#!/usr/bin/env python3
"""OPML 与 meta 对齐。不访问网络。"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from prepare.articles.feedlib import DEFAULT_META, DEFAULT_OPML, check_pair, load_meta, load_opml  # noqa: E402
from prepare.projects.trending import WEEKLY_ALL_TRENDING_ID, WEEKLY_ALL_TRENDING_XML  # noqa: E402


class Subscription(unittest.TestCase):
    def test_real_opml_matches_meta_and_only_weekly_all(self) -> None:
        feeds = load_opml(DEFAULT_OPML)
        meta = load_meta(DEFAULT_META)
        errors = check_pair(feeds, meta)
        self.assertEqual(errors, [], errors)
        got = {
            source["id"]: source.get("xmlUrl")
            for source in meta["sources"]
            if str(source.get("id") or "").startswith("github-trending-")
        }
        self.assertEqual(got, {WEEKLY_ALL_TRENDING_ID: WEEKLY_ALL_TRENDING_XML})
        opml_trending = [feed["xmlUrl"] for feed in feeds if "GitHubTrendingRSS" in feed["xmlUrl"]]
        self.assertEqual(opml_trending, [WEEKLY_ALL_TRENDING_XML])
        by_id = {source["id"]: source for source in meta["sources"]}
        self.assertEqual(by_id["xai-news"]["role"], "primary")
        self.assertEqual(by_id["xai-news-olshansk"]["role"], "backup")
        self.assertFalse(by_id["meta-ai-research"].get("xmlUrl"))
        self.assertEqual(by_id["meta-ai-research"]["fallback"], "list-page")
        urls = " ".join(source.get("xmlUrl") or "" for source in meta["sources"])
        self.assertNotIn("rsshub.app", urls)

    def test_language_and_daily_boards_are_rejected(self) -> None:
        extra = {
            "xmlUrl": "https://mshibanami.github.io/GitHubTrendingRSS/weekly/python.xml",
            "id": "github-trending-weekly-python",
            "lane": "special",
        }
        rejected = check_pair(
            [{"xmlUrl": extra["xmlUrl"]}],
            {"sources": [{"id": WEEKLY_ALL_TRENDING_ID, "xmlUrl": WEEKLY_ALL_TRENDING_XML, "lane": "special"}, extra]},
        )
        self.assertTrue(any("只订每周总榜" in err for err in rejected), rejected)
        daily = check_pair(
            [{"xmlUrl": "https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml"}],
            {"sources": [{"id": "github-trending-daily-all", "xmlUrl": "https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml", "lane": "special"}]},
        )
        self.assertTrue(any("只订每周总榜" in err or "订阅 id 只能是" in err for err in daily), daily)
        broken = {
            "sources": [
                {"id": "a", "publisher": "lab", "role": "primary", "lane": "product"},
                {"id": "b", "publisher": "lab", "role": "primary", "xmlUrl": "https://example.com/b.xml", "lane": "product"},
            ]
        }
        pair_errors = check_pair([], broken)
        self.assertTrue(any("只有一个主源" in err for err in pair_errors), pair_errors)


if __name__ == "__main__":
    unittest.main()
