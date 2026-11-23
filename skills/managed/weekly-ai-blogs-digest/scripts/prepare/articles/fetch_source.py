#!/usr/bin/env python3
"""抓取调用方点名的文章源，逐源返回窗口内原文和体检。

不追加没有点名的备源，也不把多源条目并成一份。备源开不开由子步骤说明决定，决定之后再带那个 id 调一次本脚本。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from prepare.articles.feedlib import (  # noqa: E402
    DEFAULT_META,
    DEFAULT_OPML,
    DEFAULT_TIMEOUT,
    feed_report,
    load_meta,
    load_opml,
    lookup_article_source,
    mark_window,
    payload_from_reports,
    require_window,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="抓取点名的文章源，返回各源原文和体检")
    parser.add_argument("--opml", type=Path, default=DEFAULT_OPML)
    parser.add_argument("--meta", type=Path, default=DEFAULT_META)
    parser.add_argument("--since", help="YYYY-MM-DD，含当天（UTC 日历日）")
    parser.add_argument("--until", help="YYYY-MM-DD，含当天（UTC 日历日）")
    parser.add_argument("--id", action="append", default=[], help="meta 里的 source id，可重复")
    parser.add_argument("--out", type=Path, help="写入 JSON。默认 stdout")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)
    window_error = require_window(args.since, args.until)
    if window_error:
        print(window_error, file=sys.stderr)
        return 2
    if not args.id:
        print("用 --id 点名要抓的源。本脚本不默认抓全部订阅，也不自动抓备源。", file=sys.stderr)
        return 2
    try:
        import feedparser  # noqa: F401
    except ImportError:
        print("缺少 feedparser。用 Python 3.12 虚拟环境执行: pip install -r scripts/requirements.txt", file=sys.stderr)
        return 1
    feeds = load_opml(args.opml)
    meta = load_meta(args.meta)
    chosen: list[tuple[dict, dict]] = []
    for sid in args.id:
        found = lookup_article_source(feeds, meta, sid)
        if isinstance(found, str):
            print(found, file=sys.stderr)
            return 2
        chosen.append((found[1], found[0]))
    meta_by_url = {item["xmlUrl"]: item for _feed, item in chosen}
    pairs = []
    for feed, source in chosen:
        report = feed_report(feed, meta_by_url, args.timeout)
        mark_window(report, args.since, args.until)
        pairs.append((report, source))
    payload = payload_from_reports(pairs, args.since, args.until)
    if args.pretty:
        text = json.dumps(payload, ensure_ascii=False, indent=2)
    else:
        text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text + "\n", encoding="utf-8")
    else:
        sys.stdout.write(text)
        sys.stdout.write("\n")
    for row in payload["sources"]:
        flags = "/".join(row["issues"]) if row["issues"] else "ok"
        print(f"{row['id']}={flags} items={len(row['items'])}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
