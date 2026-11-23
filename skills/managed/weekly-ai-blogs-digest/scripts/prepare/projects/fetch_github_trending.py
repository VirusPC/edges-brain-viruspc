#!/usr/bin/env python3
"""抓 GitHub Trending 每周总榜，按 XML 原始顺序写入 github-trending.json。

只读 OPML 里那一条 weekly/all。不从文章 feeds.json 抽取，也不按日期或标题重排。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from prepare.articles.feedlib import DEFAULT_META, DEFAULT_OPML, DEFAULT_TIMEOUT, download, load_meta, load_opml, parse_feed_bytes, require_window  # noqa: E402
from prepare.projects.trending import WEEKLY_ALL_TRENDING_ID, WEEKLY_ALL_TRENDING_XML  # noqa: E402


def resolve_subscription(feeds: list[dict], meta: dict) -> str | None:
    source = next((item for item in meta.get("sources") or [] if item.get("id") == WEEKLY_ALL_TRENDING_ID), None)
    if source is None:
        return f"meta 里没有 {WEEKLY_ALL_TRENDING_ID}"
    xml_url = source.get("xmlUrl") or ""
    if xml_url != WEEKLY_ALL_TRENDING_XML:
        return f"每周总榜 xmlUrl 应为 {WEEKLY_ALL_TRENDING_XML}，实际是 {xml_url}"
    if not any(item["xmlUrl"] == WEEKLY_ALL_TRENDING_XML for item in feeds):
        return f"OPML 里没有每周总榜: {WEEKLY_ALL_TRENDING_XML}"
    return None


def document_from_bytes(payload: bytes, since: str, until: str) -> dict:
    entries, title = parse_feed_bytes(payload, fill_channel_date=True)
    items = [
        {
            "title": entry["title"],
            "date": entry["date"],
            "link": entry["link"],
            "summary": entry["body"],
            "source": WEEKLY_ALL_TRENDING_ID,
        }
        for entry in entries
    ]
    issues = [] if items else ["empty"]
    return {
        "source": WEEKLY_ALL_TRENDING_ID,
        "xmlUrl": WEEKLY_ALL_TRENDING_XML,
        "title": title,
        "window": {"since": since, "until": until},
        "status": "ok" if not issues else "empty",
        "issues": issues,
        "error": None,
        "items": items,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="抓 GitHub Trending 每周总榜")
    parser.add_argument("--opml", type=Path, default=DEFAULT_OPML)
    parser.add_argument("--meta", type=Path, default=DEFAULT_META)
    parser.add_argument("--since")
    parser.add_argument("--until")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)
    window_error = require_window(args.since, args.until)
    if window_error:
        print(window_error, file=sys.stderr)
        return 2
    if args.out is None:
        print("缺少 --out。写入 issues/<生成日>/raw/projects/github-trending.json", file=sys.stderr)
        return 2
    feeds = load_opml(args.opml)
    meta = load_meta(args.meta)
    subscription_error = resolve_subscription(feeds, meta)
    if subscription_error:
        print(subscription_error, file=sys.stderr)
        return 2
    try:
        import feedparser  # noqa: F401
    except ImportError:
        print("缺少 feedparser。用 Python 3.12 虚拟环境执行: pip install -r scripts/requirements.txt", file=sys.stderr)
        return 1
    payload, error = download(WEEKLY_ALL_TRENDING_XML, args.timeout)
    if error or not payload:
        failed = {
            "source": WEEKLY_ALL_TRENDING_ID,
            "xmlUrl": WEEKLY_ALL_TRENDING_XML,
            "window": {"since": args.since, "until": args.until},
            "status": "error",
            "issues": ["error"],
            "error": error or "空响应",
            "items": [],
        }
        sys.stdout.write(json.dumps(failed, ensure_ascii=False) + "\n")
        print(failed["error"], file=sys.stderr)
        return 1
    document = document_from_bytes(payload, args.since, args.until)
    if document["status"] != "ok":
        sys.stdout.write(json.dumps(document, ensure_ascii=False) + "\n")
        print("每周总榜没有条目", file=sys.stderr)
        return 1
    if args.pretty:
        text = json.dumps(document, ensure_ascii=False, indent=2)
    else:
        text = json.dumps(document, ensure_ascii=False, separators=(",", ":"))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text + "\n", encoding="utf-8")
    print(f"items={len(document['items'])} order=xml", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
