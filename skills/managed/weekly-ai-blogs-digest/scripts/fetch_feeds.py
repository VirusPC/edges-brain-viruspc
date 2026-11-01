#!/usr/bin/env python3
"""Read the AI Coding OPML subscription list and emit lean article JSON.

OPML is the subscription source of truth. ``feeds/ai-coding-blogs.meta.json``
holds agent-only notes (fallback policy, BestBlogs match, hosts). Sources
without a usable feed are not in the OPML; this script lists them under
``fallbacks`` and does not scrape their HTML.

Install: ``pip install -r requirements.txt`` (feedparser).

Examples
--------
python3 fetch_feeds.py --check
python3 fetch_feeds.py --self-test
python3 fetch_feeds.py --since 2026-10-23 --until 2026-10-29 --out /tmp/ai-coding-feeds.json
python3 fetch_feeds.py --since 2026-10-23 --until 2026-10-29 \\
    --compare ../../../../ai-news/2026-10-30-ai-coding-news.md --pretty
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OPML = ROOT / "feeds" / "ai-coding-blogs.opml"
DEFAULT_META = ROOT / "feeds" / "ai-coding-blogs.meta.json"

USER_AGENT = "edges-weekly-ai-blogs-digest/1.0 (+https://github.com/VirusPC/edges-brain-viruspc)"
THIN_CHARS = 280
SUMMARY_MAX = 1200
DEFAULT_TIMEOUT = 40
DEFAULT_WORKERS = 6


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in ("script", "style", "noscript"):
            self._skip += 1
        if tag in ("p", "br", "div", "li", "h1", "h2", "h3", "tr", "section"):
            self.parts.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "noscript") and self._skip:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if not self._skip:
            self.parts.append(data)


def plain_text(raw: str) -> str:
    if not raw:
        return ""
    try:
        parser = _TextExtractor()
        parser.feed(raw)
        parser.close()
        text = "".join(parser.parts)
    except Exception:
        text = re.sub(r"<[^>]+>", " ", raw)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def cap_summary(text: str) -> str:
    if len(text) <= SUMMARY_MAX:
        return text
    cut = text[:SUMMARY_MAX]
    space = cut.rfind(" ")
    if space >= SUMMARY_MAX - 200:
        cut = cut[:space]
    return cut.rstrip() + "…"


def host_of(url: str) -> str:
    host = urlsplit(url.strip()).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


_TRACKING_KEYS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "ref",
    "ref_src",
}


def normalize_link(url: str) -> str:
    parts = urlsplit(url.strip())
    host = parts.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    path = parts.path.rstrip("/")
    query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if key.lower() not in _TRACKING_KEYS and not key.lower().startswith("utm_")
    ]
    query.sort()
    encoded = urlencode(query)
    base = host + path
    return base + ("?" + encoded if encoded else "")


def load_opml(path: Path) -> list[dict]:
    tree = ET.parse(path)
    feeds: list[dict] = []
    for el in tree.iter("outline"):
        xml_url = (el.attrib.get("xmlUrl") or "").strip()
        if not xml_url:
            continue
        if (el.attrib.get("type") or "rss").lower() not in ("rss", "atom"):
            continue
        feeds.append(
            {
                "title": (el.attrib.get("title") or el.attrib.get("text") or xml_url).strip(),
                "xmlUrl": xml_url,
                "htmlUrl": (el.attrib.get("htmlUrl") or "").strip(),
            }
        )
    return feeds


def load_meta(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("sources"), list):
        raise SystemExit(f"meta 缺少 sources 数组: {path}")
    return data


def source_hosts(source: dict) -> set[str]:
    hosts: set[str] = set()
    for key in ("listUrls",):
        for url in source.get(key) or []:
            if url:
                hosts.add(host_of(url))
    for key in ("htmlUrl", "xmlUrl"):
        url = source.get(key) or ""
        if url:
            hosts.add(host_of(url))
    for host in source.get("articleHosts") or []:
        host = host.lower().strip()
        if host.startswith("www."):
            host = host[4:]
        if host:
            hosts.add(host)
    hosts.discard("")
    return hosts


def check_pair(feeds: list[dict], meta: dict) -> list[str]:
    errors: list[str] = []
    opml_urls = [f["xmlUrl"] for f in feeds]
    if len(opml_urls) != len(set(opml_urls)):
        errors.append("OPML 里有重复的 xmlUrl")
    opml_set = set(opml_urls)
    ids: list[str] = []
    meta_urls: list[str] = []
    for source in meta["sources"]:
        sid = source.get("id") or ""
        if not sid:
            errors.append("meta source 缺少 id")
            continue
        ids.append(sid)
        xml_url = source.get("xmlUrl") or ""
        if xml_url:
            meta_urls.append(xml_url)
            if xml_url not in opml_set:
                errors.append(f"meta {sid} 的 xmlUrl 不在 OPML 中: {xml_url}")
        elif source.get("feedOrigin") == "native":
            errors.append(f"meta {sid} 标了 native 但没有 xmlUrl")
        if not source.get("fallback") and not xml_url:
            errors.append(f"meta {sid} 既没有 feed 也没有 fallback")
    if len(ids) != len(set(ids)):
        errors.append("meta source id 重复")
    if len(meta_urls) != len(set(meta_urls)):
        errors.append("meta 里有重复的 xmlUrl")
    meta_set = set(meta_urls)
    for url in opml_set:
        if url not in meta_set:
            errors.append(f"OPML feed 没有 meta 条目: {url}")
    return errors


def entry_date(entry: dict) -> str | None:
    for key in ("published_parsed", "updated_parsed"):
        parsed = entry.get(key)
        if parsed:
            return f"{parsed.tm_year:04d}-{parsed.tm_mon:02d}-{parsed.tm_mday:02d}"
    # 美团技术博客的 item 没有 pubDate，日期写在链接路径里。
    link = entry_link(entry)
    match = re.search(r"/(20\d{2})/(\d{2})/(\d{2})(?:/|$)", link)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    return None


def entry_body(entry: dict) -> str:
    chunks: list[str] = []
    for block in entry.get("content") or []:
        if isinstance(block, dict) and block.get("value"):
            chunks.append(block["value"])
    summary = entry.get("summary") or entry.get("description") or ""
    if summary:
        chunks.append(summary)
    if not chunks:
        return ""
    return plain_text(max(chunks, key=len))


def entry_link(entry: dict) -> str:
    link = (entry.get("link") or "").strip()
    if link:
        return link
    for item in entry.get("links") or []:
        href = (item.get("href") or "").strip()
        if href:
            return href
    return ""


def _struct_date(parsed) -> str | None:
    if not parsed:
        return None
    return f"{parsed.tm_year:04d}-{parsed.tm_mon:02d}-{parsed.tm_mday:02d}"


def parse_feed_bytes(payload: bytes, *, fill_channel_date: bool = False) -> tuple[list[dict], str | None]:
    try:
        import feedparser
    except ImportError:
        raise SystemExit("缺少 feedparser。先执行: pip install -r scripts/requirements.txt")
    parsed = feedparser.parse(payload)
    title = ""
    channel_date = None
    if getattr(parsed, "feed", None):
        title = plain_text(parsed.feed.get("title") or "")
        channel_date = _struct_date(parsed.feed.get("published_parsed")) or _struct_date(parsed.feed.get("updated_parsed"))
    entries = []
    for entry in parsed.entries:
        link = entry_link(entry)
        day = entry_date(entry)
        if not day and fill_channel_date:
            day = channel_date
        if not link or not day:
            continue
        body = entry_body(entry)
        title_text = plain_text(entry.get("title") or "") or link
        entries.append(
            {
                "title": title_text,
                "date": day,
                "link": link,
                "body": body,
            }
        )
    return entries, title or None


def download_curl(url: str, timeout: int) -> tuple[bytes, str | None]:
    try:
        proc = subprocess.run(
            ["curl", "-fsSL", "--max-time", str(timeout), "-A", USER_AGENT, url],
            capture_output=True,
            timeout=timeout + 5,
            check=False,
        )
    except Exception as exc:  # noqa: BLE001
        return b"", f"curl: {type(exc).__name__}: {exc}"
    if proc.returncode != 0 or not proc.stdout:
        err = proc.stderr.decode("utf-8", "replace").strip()[:200]
        return b"", f"curl exit {proc.returncode}: {err}"
    return proc.stdout, None


def download(url: str, timeout: int) -> tuple[bytes, str | None]:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read(), None
    except urllib.error.HTTPError as exc:
        # linux.do 的 Discourse RSS 对 urllib 返回 403，curl 可以拿到 200。
        if exc.code == 403:
            body, curl_err = download_curl(url, timeout)
            if body:
                return body, None
            return b"", f"HTTPError: {exc}; curl fallback: {curl_err}"
        return b"", f"HTTPError: {exc}"
    except Exception as exc:  # noqa: BLE001 - surface any fetch failure to the report
        return b"", f"{type(exc).__name__}: {exc}"


def feed_report(feed: dict, meta_by_url: dict, timeout: int) -> dict:
    source = meta_by_url.get(feed["xmlUrl"], {})
    started = time.perf_counter()
    payload, error = download(feed["xmlUrl"], timeout)
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    report = {
        "id": source.get("id") or feed["title"],
        "title": feed["title"],
        "xmlUrl": feed["xmlUrl"],
        "bytes": len(payload),
        "elapsed_ms": elapsed_ms,
        "error": error,
        "entries_total": 0,
        "newest": None,
        "oldest": None,
        "truncated": False,
        "stale": False,
        "snapshot": source.get("dateMode") == "snapshot",
        "entries": [],
    }
    if error or not payload:
        return report
    try:
        entries, feed_title = parse_feed_bytes(payload, fill_channel_date=report["snapshot"])
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        report["error"] = f"parse: {type(exc).__name__}: {exc}"
        return report
    if feed_title and not source:
        report["title"] = feed_title
    report["entries_total"] = len(entries)
    if entries:
        dates = [item["date"] for item in entries]
        report["newest"] = max(dates)
        report["oldest"] = min(dates)
    report["entries"] = entries
    return report


def mark_window(report: dict, since: str, until: str) -> None:
    if report.get("snapshot"):
        # 当日榜单没有文章发布日。保留整份快照，不按博客窗口裁掉。
        report["entries_in_window"] = len(report.get("entries") or [])
        report["stale"] = False
        report["truncated"] = False
        return
    newest = report.get("newest")
    oldest = report.get("oldest")
    if newest and newest < since:
        report["stale"] = True
    # The feed never shows a post older than the window, so the early part may be cut off.
    if oldest and oldest >= since and report.get("entries_total"):
        report["truncated"] = True
    kept = []
    for entry in report["entries"]:
        if since <= entry["date"] <= until:
            kept.append(entry)
    report["entries"] = kept
    report["entries_in_window"] = len(kept)


def to_item(entry: dict, source_id: str) -> dict:
    body = entry["body"]
    thin = len(body) < THIN_CHARS
    return {
        "title": entry["title"],
        "date": entry["date"],
        "link": entry["link"],
        "summary": cap_summary(body),
        "source": source_id,
        "thin": thin,
    }


def dedupe_items(items: list[dict]) -> list[dict]:
    best: dict[str, dict] = {}
    for item in items:
        key = normalize_link(item["link"])
        current = best.get(key)
        if current is None or len(item["summary"]) > len(current["summary"]):
            best[key] = item
    ordered = list(best.values())
    ordered.sort(key=lambda item: item["title"].lower())
    ordered.sort(key=lambda item: item["date"], reverse=True)
    return ordered


def fallback_rows(meta: dict) -> list[dict]:
    rows = []
    for source in meta["sources"]:
        fallback = source.get("fallback")
        if not fallback:
            continue
        rows.append(
            {
                "id": source["id"],
                "title": source.get("title") or source["id"],
                "listUrls": source.get("listUrls") or [],
                "fallback": fallback,
                "role": "backup" if source.get("xmlUrl") else "only",
                "notes": source.get("notes") or "",
            }
        )
    return rows


def digest_links(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    return re.findall(r"原始链接：(https?://\S+)", text)


def compare_digest(digest: list[str], reports: list[dict], meta: dict, since: str, until: str) -> dict:
    feed_hosts: set[str] = set()
    fallback_hosts: set[str] = set()
    host_owner: dict[str, str] = {}
    for source in meta["sources"]:
        hosts = source_hosts(source)
        bucket = feed_hosts if source.get("xmlUrl") else fallback_hosts
        bucket.update(hosts)
        for host in hosts:
            host_owner.setdefault(host, source["id"])
    seen: dict[str, str] = {}
    for report in reports:
        if report.get("error"):
            continue
        # entries currently in the report are window-only; full map is attached separately
        for entry in report.get("all_entries") or []:
            seen[normalize_link(entry["link"])] = entry["date"]
    window_norms = set()
    for report in reports:
        for entry in report.get("entries") or []:
            window_norms.add(normalize_link(entry["link"]))

    matched = []
    misses = []
    for link in digest:
        norm = normalize_link(link)
        host = norm.split("/", 1)[0]
        if norm in window_norms:
            matched.append(link)
            continue
        if norm in seen:
            reason = "outside-window"
            detail = seen[norm]
        elif host in fallback_hosts and host not in feed_hosts:
            reason = "fallback"
            detail = host_owner.get(host, "")
        elif host in feed_hosts:
            reason = "not-in-feed"
            detail = host_owner.get(host, "")
        else:
            reason = "outside-list"
            detail = host
        misses.append({"link": link, "reason": reason, "detail": detail})

    digest_norms = {normalize_link(link) for link in digest}
    extras_by_source: dict[str, int] = {}
    for report in reports:
        count = 0
        for entry in report.get("entries") or []:
            if normalize_link(entry["link"]) not in digest_norms:
                count += 1
        if count:
            extras_by_source[report["id"]] = count
    return {
        "digest_items": len(digest),
        "matched": len(matched),
        "misses": misses,
        "extras_by_source": extras_by_source,
        "window": {"since": since, "until": until},
    }


def build_payload(reports: list[dict], meta: dict, since: str, until: str, elapsed_ms: int, compare: dict | None) -> dict:
    items: list[dict] = []
    sources = []
    feed_bytes = 0
    errors = 0
    meta_by_id = {source["id"]: source for source in meta["sources"]}
    for report in reports:
        feed_bytes += report["bytes"]
        if report["error"]:
            errors += 1
        for entry in report["entries"]:
            items.append(to_item(entry, report["id"]))
        meta_source = meta_by_id.get(report["id"], {})
        sources.append(
            {
                "id": report["id"],
                "xmlUrl": report["xmlUrl"],
                "feedOrigin": meta_source.get("feedOrigin"),
                "fallback": meta_source.get("fallback"),
                "bytes": report["bytes"],
                "elapsed_ms": report["elapsed_ms"],
                "error": report["error"],
                "entries_total": report["entries_total"],
                "entries_in_window": report.get("entries_in_window", 0),
                "newest": report["newest"],
                "oldest": report["oldest"],
                "truncated": report["truncated"],
                "stale": report["stale"],
                "snapshot": bool(report.get("snapshot")),
            }
        )
    items = dedupe_items(items)
    lean = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
    summary_lengths = [len(item["summary"]) for item in items]
    summary_lengths.sort()
    p50 = summary_lengths[len(summary_lengths) // 2] if summary_lengths else 0
    payload = {
        "window": {"since": since, "until": until},
        "elapsed_ms": elapsed_ms,
        "feed_bytes": feed_bytes,
        "stats": {
            "feeds": len(reports),
            "errors": errors,
            "items": len(items),
            "thin": sum(1 for item in items if item["thin"]),
            "summary_chars_p50": p50,
            "lean_bytes": len(lean.encode("utf-8")),
            "lean_tokens_est": len(lean) // 4,
        },
        "sources": sources,
        "fallbacks": fallback_rows(meta),
        "items": items,
    }
    if compare is not None:
        payload["compare"] = compare
    return payload


def default_window(today: date | None = None) -> tuple[str, str]:
    today = today or date.today()
    until = today - timedelta(days=1)
    since = today - timedelta(days=7)
    return since.isoformat(), until.isoformat()


def run_fetch(feeds: list[dict], meta: dict, since: str, until: str, timeout: int, workers: int) -> tuple[list[dict], int]:
    meta_by_url = {source["xmlUrl"]: source for source in meta["sources"] if source.get("xmlUrl")}
    started = time.perf_counter()
    reports: list[dict] = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(feed_report, feed, meta_by_url, timeout) for feed in feeds]
        for future in as_completed(futures):
            reports.append(future.result())
    order = {feed["xmlUrl"]: index for index, feed in enumerate(feeds)}
    reports.sort(key=lambda report: order.get(report["xmlUrl"], 10_000))
    for report in reports:
        report["all_entries"] = list(report["entries"])
        mark_window(report, since, until)
    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return reports, elapsed_ms


def self_test() -> int:
    errors = check_pair(load_opml(DEFAULT_OPML), load_meta(DEFAULT_META))
    if errors:
        print("real OPML/meta check failed:", file=sys.stderr)
        for err in errors:
            print(f"- {err}", file=sys.stderr)
        return 1

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
    report = {
        "id": "example",
        "title": "Example",
        "xmlUrl": "https://example.com/feed.xml",
        "bytes": len(sample),
        "elapsed_ms": 1,
        "error": None,
        "entries_total": len(entries),
        "newest": max(item["date"] for item in entries),
        "oldest": min(item["date"] for item in entries),
        "truncated": False,
        "stale": False,
        "entries": entries,
    }
    mark_window(report, "2026-10-23", "2026-10-29")
    assert report["entries_in_window"] == 3, report["entries_in_window"]
    assert report["truncated"] is False
    items = dedupe_items([to_item(entry, "example") for entry in report["entries"]])
    assert len(items) == 2, items
    by_link = {normalize_link(item["link"]): item for item in items}
    assert by_link["example.com/a"]["thin"] is False
    assert by_link["example.com/thin"]["thin"] is True
    undated = (
        b"""<?xml version="1.0"?><rss version="2.0"><channel><item>
        <title>No pubDate</title>
        <link>https://tech.example.com/2026/10/29/post.html</link>
        <description>body</description>
        </item></channel></rss>"""
    )
    undated_entries, _title = parse_feed_bytes(undated)
    assert undated_entries[0]["date"] == "2026-10-29", undated_entries
    snapshot_feed = b"""<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <title>Trending</title>
      <pubDate>Sat, 31 Oct 2026 06:28:41 GMT</pubDate>
      <item><title>owner/repo</title><link>https://github.com/owner/repo</link><description>a repo</description></item>
    </channel></rss>"""
    snap_entries, _title = parse_feed_bytes(snapshot_feed, fill_channel_date=True)
    assert snap_entries[0]["date"] == "2026-10-31", snap_entries
    assert parse_feed_bytes(snapshot_feed)[0] == []
    assert normalize_link("https://mp.weixin.qq.com/s?__biz=a&mid=1") != normalize_link("https://mp.weixin.qq.com/s?__biz=b&mid=2")
    assert normalize_link("https://example.com/a?utm_source=rss") == "example.com/a"
    assert "Hello world" in by_link["example.com/a"]["summary"]
    assert "<b>" not in by_link["example.com/a"]["summary"]

    stale = dict(report)
    stale["newest"] = "2026-10-01"
    stale["oldest"] = "2026-09-01"
    stale["entries"] = []
    stale["entries_total"] = 2
    mark_window(stale, "2026-10-23", "2026-10-29")
    assert stale["stale"] is True

    truncated = {
        "entries_total": 2,
        "newest": "2026-10-29",
        "oldest": "2026-10-26",
        "entries": [],
        "stale": False,
        "truncated": False,
    }
    mark_window(truncated, "2026-10-23", "2026-10-29")
    assert truncated["truncated"] is True

    meta = {
        "sources": [
            {"id": "example", "xmlUrl": "https://example.com/feed.xml", "listUrls": ["https://example.com/blog"], "htmlUrl": "https://example.com/blog"},
            {"id": "manual", "xmlUrl": None, "fallback": "list-page", "title": "Manual", "listUrls": ["https://manual.example/blog"], "notes": "no feed"},
        ]
    }
    report["all_entries"] = entries
    compared = compare_digest(
        [
            "https://www.example.com/a",
            "https://example.com/old",
            "https://example.com/missing",
            "https://manual.example/blog/post",
            "https://other.example/post",
        ],
        [report],
        meta,
        "2026-10-23",
        "2026-10-29",
    )
    reasons = {item["link"]: item["reason"] for item in compared["misses"]}
    assert compared["matched"] == 1, compared
    assert reasons["https://example.com/old"] == "outside-window"
    assert reasons["https://example.com/missing"] == "not-in-feed"
    assert reasons["https://manual.example/blog/post"] == "fallback"
    assert reasons["https://other.example/post"] == "outside-list"
    print("self-test ok")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pull AI Coding OPML feeds into lean JSON.")
    parser.add_argument("--opml", type=Path, default=DEFAULT_OPML)
    parser.add_argument("--meta", type=Path, default=DEFAULT_META)
    parser.add_argument("--since", help="YYYY-MM-DD，含当天")
    parser.add_argument("--until", help="YYYY-MM-DD，含当天")
    parser.add_argument("--out", type=Path, help="写入 JSON 文件；默认打到 stdout")
    parser.add_argument("--compare", type=Path, help="已有周报 markdown，按「原始链接」比对覆盖")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    parser.add_argument("--pretty", action="store_true", help="缩进输出。默认紧凑 JSON，省 token")
    parser.add_argument("--check", action="store_true", help="只检查 OPML 与 meta 是否对齐，不访问网络")
    parser.add_argument("--self-test", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    if args.self_test:
        return self_test()
    feeds = load_opml(args.opml)
    meta = load_meta(args.meta)
    errors = check_pair(feeds, meta)
    if args.check:
        if errors:
            for err in errors:
                print(err, file=sys.stderr)
            return 1
        print(f"ok feeds={len(feeds)} sources={len(meta['sources'])}")
        return 0
    if errors:
        for err in errors:
            print(f"warning: {err}", file=sys.stderr)
    since, until = args.since, args.until
    if not since or not until:
        default_since, default_until = default_window()
        since = since or default_since
        until = until or default_until
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", since) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", until):
        print("since/until 必须是 YYYY-MM-DD", file=sys.stderr)
        return 2
    if since > until:
        print("since 晚于 until", file=sys.stderr)
        return 2
    try:
        import feedparser  # noqa: F401
    except ImportError:
        print("缺少 feedparser。先执行: pip install -r scripts/requirements.txt", file=sys.stderr)
        return 1
    reports, elapsed_ms = run_fetch(feeds, meta, since, until, args.timeout, args.workers)
    compare = None
    if args.compare:
        compare = compare_digest(digest_links(args.compare), reports, meta, since, until)
    for report in reports:
        report.pop("all_entries", None)
    payload = build_payload(reports, meta, since, until, elapsed_ms, compare)
    if args.pretty:
        text = json.dumps(payload, ensure_ascii=False, indent=2)
    else:
        text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if args.out:
        args.out.write_text(text + "\n", encoding="utf-8")
    else:
        sys.stdout.write(text)
        sys.stdout.write("\n")
    stats = payload["stats"]
    print(
        f"feeds={stats['feeds']} errors={stats['errors']} items={stats['items']} "
        f"thin={stats['thin']} feed_bytes={payload['feed_bytes']} lean_bytes={stats['lean_bytes']} "
        f"lean_tokens_est={stats['lean_tokens_est']} elapsed_ms={payload['elapsed_ms']}",
        file=sys.stderr,
    )
    if stats["errors"] and stats["feeds"] == stats["errors"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
