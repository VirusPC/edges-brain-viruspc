#!/usr/bin/env python3
"""Feed fallback, health, and title dedupe. No network."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_feeds import (  # noqa: E402
    assert_fallback_rules,
    list_fallback_reason,
    parse_aws_blog_cards,
    parse_hf_blog_cards,
    sitemap_lastmods,
)


class FallbackRules(unittest.TestCase):
    def test_primary_backup_and_title_dedupe(self) -> None:
        assert_fallback_rules()

    def test_list_fallback_stays_off_while_the_feed_covers_the_window(self) -> None:
        source = {"fallback": "list-page", "xmlUrl": "https://example.com/feed.xml"}
        report = {
            "error": None,
            "entries_total": 4,
            "newest": "2026-10-22",
            "snapshot": False,
            "truncated": False,
        }
        self.assertIsNone(list_fallback_reason(report, source, "2026-10-22"))
        self.assertIsNone(list_fallback_reason(report, {"fallback": None, "xmlUrl": "x"}, "2026-10-22"))

    def test_truncated_stopped_and_missing_feed_open_the_declared_list(self) -> None:
        source = {"fallback": "list-page", "xmlUrl": "https://example.com/feed.xml"}
        stopped = {"error": None, "entries_total": 3, "newest": "2026-07-27", "snapshot": False, "truncated": False}
        truncated = {"error": None, "entries_total": 20, "newest": "2026-11-22", "snapshot": False, "truncated": True}
        self.assertEqual(list_fallback_reason(stopped, source, "2026-10-22"), "stopped")
        self.assertEqual(list_fallback_reason(truncated, source, "2026-10-22"), "truncated")
        self.assertEqual(list_fallback_reason({}, {"fallback": "list-page"}, "2026-10-22"), "no-feed")

    def test_sitemap_and_list_cards_keep_dates_without_article_bodies(self) -> None:
        dates = sitemap_lastmods(
            "<urlset><url><loc>https://x.ai/news/data-bot</loc><lastmod>2026-11-02T00:00:00.000Z</lastmod></url>"
            "<url><loc>https://x.ai/</loc></url></urlset>"
        )
        self.assertEqual(dates, {"https://x.ai/news/data-bot": "2026-11-02"})
        cards = parse_aws_blog_cards(
            '<h2 class="lb-bold blog-post-title"><a href="/blogs/machine-learning/example/">'
            '<span property="name headline">Example</span></a></h2>'
            '<time datetime="2026-10-22T00:00:00-08:00">22 OCT 2026</time>'
        )
        self.assertEqual(cards[0]["date"], "2026-10-22")
        self.assertEqual(cards[0]["link"], "https://aws.amazon.com/blogs/machine-learning/example/")
        self.assertNotIn("summary", cards[0])
        hf = parse_hf_blog_cards(
            '&quot;publishedAt&quot;:&quot;2026-10-21T14:58:18.184Z&quot;,'
            '&quot;slug&quot;:&quot;granite-speech-5&quot;,&quot;title&quot;:&quot;Granite Speech 5.0&quot;'
        )
        self.assertEqual(hf[0]["link"], "https://huggingface.co/blog/granite-speech-5")
        self.assertEqual(hf[0]["date"], "2026-10-21")


if __name__ == "__main__":
    unittest.main()
