#!/usr/bin/env python3
"""文章抓取：备源不自动并入，缺窗口即失败。不访问网络。"""

from __future__ import annotations

import io
import json
import sys
import unittest
from contextlib import redirect_stderr
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from prepare.articles.feedlib import (  # noqa: E402
    dedupe_items,
    lookup_article_source,
    mark_window,
    normalize_title,
    parse_feed_bytes,
    payload_from_reports,
    titles_match,
    to_item,
)
from prepare.articles.fetch_source import main as fetch_main  # noqa: E402
from prepare.articles.write_feeds import assemble, main as write_main  # noqa: E402
from prepare.projects.fetch_github_trending import document_from_bytes, main as trending_main  # noqa: E402
from lib.links import normalize_link  # noqa: E402


def report(sid: str, entries: list[dict], *, error: str | None = None) -> dict:
    dates = [entry["date"] for entry in entries]
    return {
        "id": sid,
        "title": sid,
        "xmlUrl": f"https://example.com/{sid}.xml",
        "error": error,
        "entries_total": 0 if error else len(entries),
        "newest": max(dates) if dates and not error else None,
        "oldest": min(dates) if dates and not error else None,
        "truncated": False,
        "stale": False,
        "snapshot": False,
        "entries": [] if error else entries,
    }


def entry(title: str, link: str, day: str, body: str) -> dict:
    return {"title": title, "date": day, "link": link, "body": body}


SINCE = "2026-11-13"
UNTIL = "2026-11-19"
PRIMARY = {"id": "xai", "publisher": "xai", "role": "primary", "lane": "product", "xmlUrl": "https://example.com/xai.xml"}
BACKUP = {"id": "xai-b", "publisher": "xai", "role": "backup", "lane": "product", "xmlUrl": "https://example.com/xai-b.xml"}


class FallbackStaysSeparate(unittest.TestCase):
    def test_stopped_primary_does_not_absorb_backup_items(self) -> None:
        primary = report("xai", [entry("Old", "https://x.ai/news/old", "2026-09-28", "old")])
        mark_window(primary, SINCE, UNTIL)
        backup_body = "y" * 80
        backup = report(
            "xai-b",
            [
                entry("Accounting", "https://x.ai/news/accounting/", "2026-11-16", backup_body),
                entry("Introducing Grok Bot 1.0. Bots can be shared.", "https://x.com/xai/status/1", "2026-11-16", "z" * 50),
            ],
        )
        mark_window(backup, SINCE, UNTIL)
        payload = payload_from_reports([(primary, PRIMARY), (backup, BACKUP)], SINCE, UNTIL)
        self.assertNotIn("items", payload)
        self.assertNotIn("fallbacks", payload)
        self.assertNotIn("publisherFallback", payload)
        by_id = {row["id"]: row for row in payload["sources"]}
        self.assertEqual(by_id["xai"]["status"], "stopped")
        self.assertEqual(by_id["xai"]["issues"], ["stopped"])
        self.assertEqual(by_id["xai"]["items"], [])
        self.assertNotIn("included", by_id["xai"])
        self.assertEqual(by_id["xai-b"]["status"], "ok")
        self.assertEqual(len(by_id["xai-b"]["items"]), 2)
        only_primary = assemble([{"window": payload["window"], "sources": [by_id["xai"]]}], SINCE, UNTIL)
        self.assertEqual(only_primary["items"], [])
        self.assertNotIn("fallbacks", only_primary)
        self.assertEqual([row["id"] for row in only_primary["sources"]], ["xai"])

    def test_empty_primary_is_reported_and_not_filled(self) -> None:
        primary = report("xai", [])
        mark_window(primary, SINCE, UNTIL)
        payload = payload_from_reports([(primary, PRIMARY)], SINCE, UNTIL)
        self.assertEqual(payload["sources"][0]["status"], "empty")
        self.assertEqual(payload["sources"][0]["items"], [])

    def test_title_dedupe_only_runs_on_items_the_caller_passed(self) -> None:
        self.assertEqual(normalize_title("  Introducing Grok Bot 1.0. "), "introducing grok bot 1.0")
        self.assertTrue(
            titles_match(
                normalize_title("Introducing Grok Bot 1.0"),
                normalize_title("Introducing Grok Bot 1.0. Bots can be shared and are more collaborative."),
            )
        )
        self.assertFalse(titles_match(normalize_title("How we built X"), normalize_title("How we built X for ads")))
        long_body = "x" * 400
        short_body = "z" * 50
        chosen = assemble(
            [
                {
                    "window": {"since": SINCE, "until": UNTIL},
                    "sources": [
                        {
                            "id": "xai-b",
                            "xmlUrl": "https://example.com/xai-b.xml",
                            "status": "ok",
                            "issues": [],
                            "items": [
                                to_item(entry("Introducing Grok Bot 1.0", "https://x.ai/news/bot", "2026-11-11", long_body), "xai-b"),
                                to_item(entry("Introducing Grok Bot 1.0. Bots can be shared.", "https://x.com/xai/status/1", "2026-11-11", short_body), "xai-b"),
                            ],
                        }
                    ],
                }
            ],
            SINCE,
            UNTIL,
        )
        self.assertEqual(len(chosen["items"]), 1)
        self.assertEqual(chosen["items"][0]["summary"], long_body)


class ArticleToolBoundary(unittest.TestCase):
    def test_trending_id_is_not_an_article_source(self) -> None:
        message = lookup_article_source([], {"sources": []}, "github-trending-weekly-all")
        self.assertIsInstance(message, str)
        self.assertIn("fetch_github_trending.py", message)


class MissingWindow(unittest.TestCase):
    def test_fetch_source_exits_when_window_missing(self) -> None:
        err = io.StringIO()
        with redirect_stderr(err):
            code = fetch_main(["--id", "openai-news", "--until", UNTIL])
        self.assertEqual(code, 2)
        self.assertIn("没有生成日就停止", err.getvalue())

    def test_write_feeds_exits_when_window_missing(self) -> None:
        err = io.StringIO()
        with redirect_stderr(err):
            code = write_main(["--out", "/tmp/feeds.json", "--source", "/tmp/nope.json"])
        self.assertEqual(code, 2)
        self.assertIn("没有生成日就停止", err.getvalue())

    def test_trending_exits_when_window_missing(self) -> None:
        err = io.StringIO()
        with redirect_stderr(err):
            code = trending_main(["--out", "/tmp/github-trending.json"])
        self.assertEqual(code, 2)
        self.assertIn("没有生成日就停止", err.getvalue())


class FeedParsing(unittest.TestCase):
    def test_window_dedupe_and_link_normalization(self) -> None:
        sample = b"""<?xml version="1.0"?>
        <rss version="2.0"><channel>
          <item><title>In window</title><link>https://example.com/a</link>
            <pubDate>Wed, 28 Oct 2026 00:00:00 GMT</pubDate>
            <description><![CDATA[<p>Hello <b>world</b>. This description is intentionally long enough to clear the thin threshold. """ + b"word " * 80 + b"""</p>]]></description>
          </item>
          <item><title>Old</title><link>https://example.com/old</link>
            <pubDate>Wed, 01 Oct 2026 00:00:00 GMT</pubDate>
            <description>too old</description>
          </item>
          <item><title>Thin</title><link>https://example.com/thin</link>
            <pubDate>Thu, 29 Oct 2026 00:00:00 GMT</pubDate>
            <description>short</description>
          </item>
          <item><title>Dup longer</title><link>https://example.com/a/</link>
            <pubDate>Wed, 28 Oct 2026 00:00:00 GMT</pubDate>
            <description>""" + b"x" * 400 + b"""</description>
          </item>
        </channel></rss>"""
        entries, _title = parse_feed_bytes(sample)
        parsed = {
            "id": "example",
            "entries_total": len(entries),
            "newest": max(item["date"] for item in entries),
            "oldest": min(item["date"] for item in entries),
            "entries": entries,
            "stale": False,
            "truncated": False,
            "snapshot": False,
        }
        mark_window(parsed, "2026-10-23", "2026-10-29")
        self.assertEqual(parsed["entries_in_window"], 3)
        items = dedupe_items([to_item(item, "example") for item in parsed["entries"]])
        self.assertEqual(len(items), 2)
        by_link = {normalize_link(item["link"]): item for item in items}
        self.assertFalse(by_link["example.com/a"]["thin"])
        self.assertTrue(by_link["example.com/thin"]["thin"])
        self.assertIn("Hello world", by_link["example.com/a"]["summary"])
        self.assertNotIn("<b>", by_link["example.com/a"]["summary"])
        long = ("甲" * 1500) + " 结尾还在"
        long_item = to_item({"title": "长文", "date": "2026-11-13", "link": "https://example.com/long", "body": long}, "example")
        self.assertEqual(long_item["summary"], long)
        self.assertFalse(long_item["thin"])

    def test_utc_calendar_day_and_snapshot_order(self) -> None:
        boundary = b"""<?xml version="1.0"?><rss version="2.0"><channel>
          <item><title>Beijing next day</title><link>https://example.com/bj</link>
            <pubDate>Fri, 20 Nov 2026 00:30:00 +0800</pubDate><description>x</description></item>
          <item><title>UTC end</title><link>https://example.com/utc-end</link>
            <pubDate>Thu, 19 Nov 2026 23:59:59 GMT</pubDate><description>x</description></item>
          <item><title>Before since UTC</title><link>https://example.com/early</link>
            <pubDate>Fri, 13 Nov 2026 00:30:00 +0800</pubDate><description>x</description></item>
        </channel></rss>"""
        entries, _title = parse_feed_bytes(boundary)
        by_title = {item["title"]: item["date"] for item in entries}
        self.assertEqual(by_title["Beijing next day"], "2026-11-19")
        self.assertEqual(by_title["Before since UTC"], "2026-11-12")
        parsed = {
            "snapshot": False,
            "newest": max(by_title.values()),
            "oldest": min(by_title.values()),
            "entries_total": len(entries),
            "entries": entries,
            "stale": False,
            "truncated": False,
        }
        mark_window(parsed, "2026-11-13", "2026-11-19")
        self.assertEqual({item["title"] for item in parsed["entries"]}, {"Beijing next day", "UTC end"})
        trending = b"""<?xml version="1.0"?>
        <rss version="2.0"><channel>
          <title>Trending</title>
          <pubDate>Sat, 31 Oct 2026 06:28:41 GMT</pubDate>
          <item><title>zebra/repo</title><link>https://github.com/zebra/repo</link><description>z</description></item>
          <item><title>alpha/repo</title><link>https://github.com/alpha/repo</link><description>a</description></item>
        </channel></rss>"""
        document = document_from_bytes(trending, SINCE, UNTIL)
        self.assertEqual([item["title"] for item in document["items"]], ["zebra/repo", "alpha/repo"])
        self.assertEqual(document["items"][0]["date"], "2026-10-31")
        self.assertEqual(json.loads(json.dumps(document))["source"], "github-trending-weekly-all")
        self.assertNotEqual(normalize_link("https://mp.weixin.qq.com/s?__biz=a&mid=1"), normalize_link("https://mp.weixin.qq.com/s?__biz=b&mid=2"))
        self.assertEqual(normalize_link("https://example.com/a?utm_source=rss"), "example.com/a")


if __name__ == "__main__":
    unittest.main()
