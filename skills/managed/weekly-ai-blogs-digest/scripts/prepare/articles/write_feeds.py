#!/usr/bin/env python3
"""把调用方已经选定的各源结果写成 raw/articles/feeds.json。

只处理 --source 点名的文件。不读 meta 去补备源，也不访问网络。
同一篇按规范化 URL、再按标题留下正文更长的一条。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from prepare.articles.feedlib import date_conflicts, dedupe_items, require_window  # noqa: E402

HEALTH_KEYS = (
    "id",
    "title",
    "xmlUrl",
    "publisher",
    "role",
    "lane",
    "status",
    "issues",
    "error",
    "entries_total",
    "entries_in_window",
    "newest",
    "oldest",
    "truncated",
    "stale",
)


def assemble(documents: list[dict], since: str, until: str) -> dict:
    items: list[dict] = []
    sources: list[dict] = []
    for doc in documents:
        window = doc.get("window") if isinstance(doc.get("window"), dict) else {}
        if window and (window.get("since") != since or window.get("until") != until):
            raise ValueError(f"源文件窗口是 {window.get('since')} 至 {window.get('until')}，与 {since} 至 {until} 不一致")
        rows = doc.get("sources")
        if not isinstance(rows, list):
            raise ValueError("每个 --source 文件都要有 sources 数组")
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError("sources 里的每一项都要是对象")
            sid = str(row.get("id") or "")
            xml_url = str(row.get("xmlUrl") or "")
            if sid.startswith("github-trending") or "GitHubTrendingRSS" in xml_url:
                raise ValueError(f"{sid or xml_url} 不写入文章 feeds.json。周榜用开源项目脚本。")
            sources.append({key: row.get(key) for key in HEALTH_KEYS})
            for item in row.get("items") or []:
                if isinstance(item, dict):
                    items.append(item)
    conflicts = date_conflicts(items)
    return {
        "window": {"since": since, "until": until},
        "sources": sources,
        "dateConflicts": conflicts,
        "items": dedupe_items(items),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="把已选定的各源结果写成 feeds.json")
    parser.add_argument("--since")
    parser.add_argument("--until")
    parser.add_argument("--source", action="append", default=[], type=Path, help="fetch_source.py 写出的 JSON，可重复")
    parser.add_argument("--out", type=Path, required=False)
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)
    window_error = require_window(args.since, args.until)
    if window_error:
        print(window_error, file=sys.stderr)
        return 2
    if not args.source or args.out is None:
        print("用法: write_feeds.py --since DATE --until DATE --source 源.json --out issues/<生成日>/raw/articles/feeds.json", file=sys.stderr)
        return 2
    documents = []
    for path in args.source:
        documents.append(json.loads(path.read_text(encoding="utf-8")))
    try:
        payload = assemble(documents, args.since, args.until)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    if args.pretty:
        text = json.dumps(payload, ensure_ascii=False, indent=2)
    else:
        text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text + "\n", encoding="utf-8")
    print(f"sources={len(payload['sources'])} items={len(payload['items'])}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
