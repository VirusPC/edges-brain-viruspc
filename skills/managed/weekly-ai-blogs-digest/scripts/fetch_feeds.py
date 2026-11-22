#!/usr/bin/env python3
"""Read the AI Coding OPML subscription list and emit lean article JSON.

OPML is the subscription source of truth. ``feeds/ai-coding-blogs.meta.json``
holds agent-only notes (lane, fallback policy, BestBlogs match, hosts).
``publisher`` plus ``role`` (``primary`` / ``backup``) groups one publisher's
feeds. A backup is its own source. When the primary errors, is empty, or its
newest item is older than about a month, backup items are merged; otherwise
they stay in the health report only. A source that already declares
``fallback: list-page`` is also listed in ``listFallback`` when it has no feed,
or the feed errors, is empty, has stopped, or does not reach back to the
window (``truncated``). A healthy feed is not listed there, so a WeChat primary
that still covers the window is not paired with the official site. This script
records that reason and does not open list pages or article pages. A short feed
body stays short.

Install: Python 3.12 venv, then ``pip install -r requirements.txt`` (feedparser).
The skill section「运行环境」也把榜单依赖装进同一个环境。

Examples
--------
python3 fetch_feeds.py --check
python3 fetch_feeds.py --self-test
python3 fetch_feeds.py --since 2026-10-23 --until 2026-10-29 --out /tmp/ai-coding-feeds.json
python3 fetch_feeds.py --since 2026-10-23 --until 2026-10-29 \\
    --compare ../../../../ai-news/2026-10-30-ai-news.md --pretty
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
import time
import unicodedata
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
THIN_CHARS = 280  # 只标记 feed 正文偏短，不触发文章页补抓
PREVIEW_CHARS = 400
DEFAULT_TIMEOUT = 40
DEFAULT_WORKERS = 6
STOPPED_DAYS = 31  # 最新条目早于约一个月
TITLE_PREFIX_MIN = 16


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
    """Return the feed's full plain text. Short items are flagged thin, not cut."""
    return text


def preview_text(text: str, limit: int = PREVIEW_CHARS) -> str:
    """Opening slice for the index. The stored summary stays complete."""
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "…"


def index_from_payload(payload: dict) -> dict:
    """Title, link, source, and a short opening. No full summary."""
    items = []
    for item in payload.get("items") or []:
        row = {
            "title": item.get("title") or "",
            "date": item.get("date") or "",
            "link": item.get("link") or "",
            "source": item.get("source") or "",
            "thin": bool(item.get("thin")),
            "preview": preview_text(item.get("summary") or ""),
        }
        if item.get("lane"):
            row["lane"] = item["lane"]
        items.append(row)
    stats = payload.get("stats") or {}
    return {
        "window": payload.get("window") or {},
        "stats": {
            "feeds": stats.get("feeds", 0),
            "errors": stats.get("errors", 0),
            "items": stats.get("items", len(items)),
            "thin": stats.get("thin", sum(1 for row in items if row["thin"])),
        },
        "items": items,
    }


def pick_items(path: Path, links: list[str]) -> int:
    """Print only the requested articles from a full JSON file."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    wanted = list(dict.fromkeys(links))
    if not wanted:
        print("请用 --link 指定要读的文章", file=sys.stderr)
        return 2
    by_link = {item.get("link"): item for item in payload.get("items") or []}
    chosen = []
    missing = []
    for link in wanted:
        item = by_link.get(link)
        if item is None:
            missing.append(link)
        else:
            chosen.append(item)
    if missing:
        print("全文里没有这些链接:", file=sys.stderr)
        for link in missing:
            print(f"- {link}", file=sys.stderr)
        return 2
    json.dump(chosen, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


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
    allowed_lanes = set((meta.get("lanes") or {"product": "", "tech": "", "mixed": "", "special": ""}).keys())
    ids: list[str] = []
    meta_urls: list[str] = []
    publishers: dict[str, dict[str, list[str]]] = {}
    for source in meta["sources"]:
        sid = source.get("id") or ""
        if not sid:
            errors.append("meta source 缺少 id")
            continue
        ids.append(sid)
        lane = source.get("lane")
        if lane not in allowed_lanes:
            errors.append(f"meta {sid} 的 lane 无效: {lane!r}")
        xml_url = source.get("xmlUrl") or ""
        if xml_url:
            meta_urls.append(xml_url)
            if xml_url not in opml_set:
                errors.append(f"meta {sid} 的 xmlUrl 不在 OPML 中: {xml_url}")
        elif source.get("feedOrigin") == "native":
            errors.append(f"meta {sid} 标了 native 但没有 xmlUrl")
        if not source.get("fallback") and not xml_url:
            errors.append(f"meta {sid} 既没有 feed 也没有 fallback")
        publisher = (source.get("publisher") or "").strip()
        role = (source.get("role") or "").strip()
        if bool(publisher) != bool(role):
            errors.append(f"meta {sid} 的 publisher 与 role 要一起写")
        elif role and role not in ("primary", "backup"):
            errors.append(f"meta {sid} 的 role 无效: {role!r}")
        elif publisher:
            slot = publishers.setdefault(publisher, {"primary": [], "backup": []})
            slot[role].append(sid)
            if role == "backup" and not xml_url:
                errors.append(f"meta {sid} 是备源，但没有 xmlUrl")
    for publisher, slot in publishers.items():
        if len(slot["primary"]) != 1:
            errors.append(f"publisher {publisher} 要有且只有一个主源，现在是 {slot['primary']}")
        if not slot["backup"]:
            errors.append(f"publisher {publisher} 没有备源")
    if len(ids) != len(set(ids)):
        errors.append("meta source id 重复")
    if len(meta_urls) != len(set(meta_urls)):
        errors.append("meta 里有重复的 xmlUrl")
    meta_set = set(meta_urls)
    for url in opml_set:
        if url not in meta_set:
            errors.append(f"OPML feed 没有 meta 条目: {url}")
    for url in sorted(set(opml_urls) | set(meta_urls)):
        if "GitHubTrendingRSS" in url and "/daily/" in url:
            errors.append(f"GitHub Trending 仍在订 daily: {url}")
    return errors


def entry_date(entry: dict) -> str | None:
    # feedparser 的 published_parsed / updated_parsed 是 UTC。
    # 窗口只比较这个 YYYY-MM-DD，含当天。+0800 的 00:30 仍算前一个 UTC 日。
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
        raise SystemExit("缺少 feedparser。用 Python 3.12 虚拟环境执行: pip install -r scripts/requirements.txt")
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
        # 有的站点对 urllib 返回 403，curl 可以拿到正文。
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
    # since/until 是 UTC 日历日，闭区间，不是北京时间。
    if report.get("snapshot"):
        # Trending 榜没有条目发布日。保留整份快照，不按博客窗口裁掉。
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


def to_item(entry: dict, source_id: str, lane: str | None = None) -> dict:
    body = entry["body"]
    thin = len(body) < THIN_CHARS
    item = {
        "title": entry["title"],
        "date": entry["date"],
        "link": entry["link"],
        "summary": cap_summary(body),
        "source": source_id,
        "thin": thin,
    }
    if lane:
        item["lane"] = lane
    return item


def normalize_title(title: str) -> str:
    text = unicodedata.normalize("NFKC", title or "")
    text = text.casefold()
    text = re.sub(r"\s+", " ", text).strip()
    return text.strip(" .!?。！？:：,，;；\"'“”‘’")


def titles_match(left: str, right: str) -> bool:
    """完全相同，或较短标题后紧跟句末标点才算同一篇。"""
    if not left or not right:
        return False
    if left == right:
        return True
    short, long = (left, right) if len(left) <= len(right) else (right, left)
    if len(short) < TITLE_PREFIX_MIN or not long.startswith(short):
        return False
    return long[len(short)] in ".!?。！？:："


def dedupe_items(items: list[dict]) -> list[dict]:
    by_link: dict[str, dict] = {}
    for item in items:
        key = normalize_link(item["link"])
        current = by_link.get(key)
        if current is None or len(item.get("summary") or "") > len(current.get("summary") or ""):
            by_link[key] = item
    seen_links: set[str] = set()
    url_kept: list[dict] = []
    for item in items:
        key = normalize_link(item["link"])
        if key in seen_links:
            continue
        seen_links.add(key)
        url_kept.append(by_link[key])
    kept: list[dict] = []
    for item in url_kept:
        title = normalize_title(item.get("title") or "")
        match_at = None
        if title:
            for index, prev in enumerate(kept):
                if titles_match(title, normalize_title(prev.get("title") or "")):
                    match_at = index
                    break
        if match_at is None:
            kept.append(item)
            continue
        prev = kept[match_at]
        if len(item.get("summary") or "") > len(prev.get("summary") or ""):
            kept[match_at] = item
    kept.sort(key=lambda item: (item.get("title") or "").lower())
    kept.sort(key=lambda item: item.get("date") or "", reverse=True)
    return kept


def sitemap_lastmods(xml: str) -> dict[str, str]:
    """Map sitemap <loc> to YYYY-MM-DD. URLs without lastmod are omitted."""
    rows: dict[str, str] = {}
    for block in re.findall(r"<url>(.*?)</url>", xml, flags=re.S):
        loc = re.search(r"<loc>([^<]+)</loc>", block)
        modified = re.search(r"<lastmod>([^<]+)</lastmod>", block)
        if loc and modified:
            rows[loc.group(1).strip()] = modified.group(1).strip()[:10]
    return rows


def parse_aws_blog_cards(html: str) -> list[dict]:
    """Title, link, and date from an AWS Machine Learning Blog index card. No article page."""
    rows = []
    for chunk in re.split(r'<h2 class="lb-bold blog-post-title">', html)[1:]:
        href = re.search(r'href="([^"]+)"', chunk)
        name = re.search(r'property="name headline">(.*?)</span>', chunk, flags=re.S)
        stamp = re.search(r'datetime="([^"]+)"', chunk)
        if not href or not stamp:
            continue
        url = href.group(1)
        if url.startswith("/"):
            url = "https://aws.amazon.com" + url
        title = plain_text(name.group(1) if name else "")
        rows.append({"title": title, "link": url, "date": stamp.group(1)[:10]})
    return rows


def parse_hf_blog_cards(page: str) -> list[dict]:
    """Title, link, and published day from the blog index payload. No article page."""
    rows = []
    seen: set[str] = set()
    pattern = re.compile(
        r"publishedAt&quot;:&quot;(\d{4}-\d{2}-\d{2})T[^&]{0,40}&quot;"
        r".{0,240}?slug&quot;:&quot;([A-Za-z0-9][A-Za-z0-9-]*)&quot;"
        r".{0,80}?title&quot;:&quot;([^&]{1,240})&quot;"
    )
    for match in pattern.finditer(page):
        slug = match.group(2)
        title = html.unescape(match.group(3)).strip()
        if slug in seen or "upvotes" in title or len(title) > 240:
            continue
        seen.add(slug)
        window = page[match.end() : match.end() + 2500]
        url_match = re.search(r"url&quot;:&quot;(/blog/[^&]*" + re.escape(slug) + r")&quot;", window)
        link = "https://huggingface.co" + url_match.group(1) if url_match else f"https://huggingface.co/blog/{slug}"
        rows.append({"title": title, "link": link, "date": match.group(1)})
    return rows


def list_fallback_reason(report: dict, source: dict, until: str) -> str | None:
    """When an already declared list page may be used. A healthy feed stays the only source."""
    if source.get("fallback") != "list-page":
        return None
    if not source.get("xmlUrl"):
        return "no-feed"
    if report.get("error"):
        return "error"
    issues = source_issues(report, until)
    if "empty" in issues:
        return "empty"
    if "stopped" in issues:
        return "stopped"
    if report.get("truncated"):
        return "truncated"
    return None


def source_issues(report: dict, until: str) -> list[str]:
    """报错、0 条、最新条目早于约一个月。快照源只看报错和 0 条。"""
    if report.get("error"):
        return ["error"]
    if not report.get("entries_total"):
        return ["empty"]
    if report.get("snapshot"):
        return []
    newest = report.get("newest")
    if not newest:
        return []
    age = (date.fromisoformat(until) - date.fromisoformat(newest)).days
    if age > STOPPED_DAYS:
        return ["stopped"]
    return []


def publisher_plan(meta: dict) -> dict[str, dict]:
    plan: dict[str, dict] = {}
    for source in meta["sources"]:
        publisher = (source.get("publisher") or "").strip()
        role = (source.get("role") or "").strip()
        if not publisher or role not in ("primary", "backup"):
            continue
        slot = plan.setdefault(publisher, {"primary": None, "backups": []})
        if role == "primary":
            slot["primary"] = source["id"]
        else:
            slot["backups"].append(source["id"])
    return plan


_UNUSABLE = ("error", "empty", "stopped", "missing")


def inclusion_plan(reports: list[dict], meta: dict, until: str) -> tuple[dict[str, bool], dict[str, list[str]], list[dict]]:
    issues = {report["id"]: source_issues(report, until) for report in reports}
    include = {report["id"]: True for report in reports}
    groups = []
    for publisher, slot in publisher_plan(meta).items():
        primary = slot["primary"]
        primary_issues = issues.get(primary, ["missing"])
        unusable = any(flag in primary_issues for flag in _UNUSABLE)
        used: list[str] = []
        for backup in slot["backups"]:
            if backup not in include:
                continue
            include[backup] = unusable
            if unusable:
                used.append(backup)
        backup_failed = [
            backup
            for backup in slot["backups"]
            if any(flag in issues.get(backup, ["missing"]) for flag in _UNUSABLE)
        ]
        groups.append(
            {
                "publisher": publisher,
                "primary": primary,
                "primaryIssues": primary_issues,
                "usedBackups": used,
                "needsListPage": unusable and len(backup_failed) == len(slot["backups"]),
            }
        )
    return include, issues, groups


def date_conflicts(items: list[dict]) -> list[dict]:
    groups: list[list[dict]] = []
    for item in items:
        title = normalize_title(item.get("title") or "")
        if len(title) < TITLE_PREFIX_MIN:
            continue
        placed = False
        for group in groups:
            if titles_match(title, normalize_title(group[0].get("title") or "")):
                group.append(item)
                placed = True
                break
        if not placed:
            groups.append([item])
    conflicts = []
    for group in groups:
        dates = {(item.get("date") or "") for item in group}
        if len(group) > 1 and len(dates) > 1:
            conflicts.append(
                {
                    "title": group[0].get("title") or "",
                    "items": [
                        {"date": item.get("date") or "", "link": item.get("link") or "", "source": item.get("source") or ""}
                        for item in group
                    ],
                }
            )
    return conflicts


def list_fallback_rows(reports: list[dict], meta: dict, until: str) -> list[dict]:
    """Sources whose declared list page is in play. Healthy feeds are absent."""
    rows = []
    seen: set[str] = set()
    by_id = {report["id"]: report for report in reports}
    for source in meta["sources"]:
        report = by_id.get(source["id"])
        if report is None:
            if source.get("fallback") == "list-page" and not source.get("xmlUrl"):
                reason = "no-feed"
            else:
                continue
        else:
            reason = list_fallback_reason(report, source, until)
        if not reason or source["id"] in seen:
            continue
        seen.add(source["id"])
        rows.append(
            {
                "id": source["id"],
                "reason": reason,
                "listUrls": source.get("listUrls") or [],
            }
        )
    return rows


def fallback_rows(meta: dict) -> list[dict]:
    rows = []
    for source in meta["sources"]:
        fallback = source.get("fallback")
        if not fallback:
            continue
        row = {
            "id": source["id"],
            "title": source.get("title") or source["id"],
            "listUrls": source.get("listUrls") or [],
            "fallback": fallback,
            "role": "backup" if source.get("xmlUrl") else "only",
            "lane": source.get("lane"),
            "notes": source.get("notes") or "",
        }
        if source.get("publisher"):
            row["publisher"] = source["publisher"]
            row["feedRole"] = source.get("role")
        rows.append(row)
    return rows


_MD_HTTP_LINK = re.compile(r"(?<!!)\[([^\[\]]*)\]\((https?://[^)\s]+)\)")
_BARE_SOURCE = re.compile(r"原始链接：[ \t]*(https?://\S+)")


def extract_digest_links(text: str) -> list[str]:
    """周报里的来源 URL：标题链接、短述和列表里的行内链接。

    旧稿若把裸 URL 写在「原始链接：」后面，也一并收回。
    """
    links = [url for _label, url in _MD_HTTP_LINK.findall(text)]
    links.extend(_BARE_SOURCE.findall(text))
    return links


def digest_links(path: Path) -> list[str]:
    return extract_digest_links(path.read_text(encoding="utf-8"))


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
    include, issues, groups = inclusion_plan(reports, meta, until)
    for report in reports:
        feed_bytes += report["bytes"]
        if report["error"]:
            errors += 1
        meta_source = meta_by_id.get(report["id"], {})
        lane = meta_source.get("lane") or None
        if include.get(report["id"], True):
            for entry in report["entries"]:
                items.append(to_item(entry, report["id"], lane))
        sources.append(
            {
                "id": report["id"],
                "xmlUrl": report["xmlUrl"],
                "lane": meta_source.get("lane"),
                "publisher": meta_source.get("publisher"),
                "role": meta_source.get("role"),
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
                "issues": issues.get(report["id"]) or [],
                "included": include.get(report["id"], True),
            }
        )
    conflicts = date_conflicts(items)
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
        "health": [
            {
                "id": row["id"],
                "publisher": row.get("publisher"),
                "role": row.get("role"),
                "issues": row["issues"],
                "newest": row["newest"],
                "entries_total": row["entries_total"],
                "error": row["error"],
                "included": row["included"],
            }
            for row in sources
            if row["issues"]
        ],
        "publisherFallback": groups,
        "listFallback": list_fallback_rows(reports, meta, until),
        "dateConflicts": conflicts,
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


def _report(sid: str, entries: list[dict], *, error: str | None = None, snapshot: bool = False) -> dict:
    dates = [entry["date"] for entry in entries]
    return {
        "id": sid,
        "title": sid,
        "xmlUrl": f"https://example.com/{sid}.xml",
        "bytes": 1,
        "elapsed_ms": 1,
        "error": error,
        "entries_total": 0 if error else len(entries),
        "newest": max(dates) if dates and not error else None,
        "oldest": min(dates) if dates and not error else None,
        "truncated": False,
        "stale": False,
        "snapshot": snapshot,
        "entries": [] if error else entries,
    }


def _entry(title: str, link: str, day: str, body: str) -> dict:
    return {"title": title, "date": day, "link": link, "body": body}


def assert_fallback_rules() -> None:
    assert normalize_title("  Introducing Grok Bot 1.0. ") == "introducing grok bot 1.0"
    assert titles_match(
        normalize_title("Introducing Grok Bot 1.0"),
        normalize_title("Introducing Grok Bot 1.0. Bots can be shared and are more collaborative."),
    )
    assert not titles_match(normalize_title("How we built X"), normalize_title("How we built X for ads"))
    primary_body = "x" * 400
    backup_body = "y" * 80
    tweet_body = "z" * 50
    meta = {
        "sources": [
            {"id": "xai", "publisher": "xai", "role": "primary", "lane": "product", "xmlUrl": "https://example.com/xai.xml", "fallback": "list-page"},
            {"id": "xai-b", "publisher": "xai", "role": "backup", "lane": "product", "xmlUrl": "https://example.com/xai-b.xml", "fallback": "list-page"},
        ]
    }
    fresh = _report("xai", [_entry("Accounting", "https://x.ai/news/accounting", "2026-11-16", primary_body)])
    backup = _report(
        "xai-b",
        [
            _entry("Accounting", "https://x.ai/news/accounting/", "2026-11-02", backup_body),
            _entry("Introducing Grok Bot 1.0. Bots can be shared.", "https://x.com/xai/status/1", "2026-11-16", tweet_body),
        ],
    )
    payload = build_payload([fresh, backup], meta, "2026-11-13", "2026-11-19", 1, None)
    assert payload["publisherFallback"][0]["usedBackups"] == []
    assert [item["link"] for item in payload["items"]] == ["https://x.ai/news/accounting"]
    assert payload["health"] == []
    stopped = _report("xai", [_entry("Old", "https://x.ai/news/old", "2026-09-28", "old")])
    stopped_payload = build_payload([stopped, backup], meta, "2026-11-13", "2026-11-19", 1, None)
    assert stopped_payload["publisherFallback"][0]["usedBackups"] == ["xai-b"]
    assert stopped_payload["publisherFallback"][0]["needsListPage"] is False
    assert any(row["id"] == "xai" and row["issues"] == ["stopped"] for row in stopped_payload["health"])
    titles = {item["title"] for item in stopped_payload["items"]}
    assert "Introducing Grok Bot 1.0. Bots can be shared." in titles
    longer = _report("xai", [_entry("Introducing Grok Bot 1.0", "https://x.ai/news/bot", "2026-11-16", primary_body)])
    # 主源报错后备源才进入合并；两条标题规范化后是同一篇，留下正文更完整的一条。
    longer["error"] = "HTTPError"
    longer["entries_total"] = 0
    longer["entries"] = []
    longer["newest"] = None
    merged = build_payload(
        [
            longer,
            _report("xai-b", [_entry("Introducing Grok Bot 1.0", "https://x.ai/news/bot", "2026-11-11", primary_body), _entry("Introducing Grok Bot 1.0. Bots can be shared.", "https://x.com/xai/status/1", "2026-11-11", tweet_body)]),
        ],
        meta,
        "2026-11-13",
        "2026-11-19",
        1,
        None,
    )
    assert len(merged["items"]) == 1
    assert merged["items"][0]["link"] == "https://x.ai/news/bot"
    assert merged["items"][0]["summary"] == primary_body
    assert merged["dateConflicts"] == []
    conflicted = build_payload(
        [
            _report("xai", [], error="down"),
            _report(
                "xai-b",
                [
                    _entry("Introducing Grok Bot 1.0", "https://x.ai/news/bot", "2026-11-02", primary_body),
                    _entry("Introducing Grok Bot 1.0. Extra sentence.", "https://x.com/xai/status/9", "2026-11-11", primary_body),
                ],
            ),
        ],
        meta,
        "2026-11-13",
        "2026-11-19",
        1,
        None,
    )
    assert len(conflicted["dateConflicts"]) == 1
    assert {row["date"] for row in conflicted["dateConflicts"][0]["items"]} == {"2026-11-02", "2026-11-11"}
    empty = _report("xai", [])
    empty_payload = build_payload([empty, backup], meta, "2026-11-13", "2026-11-19", 1, None)
    assert any(row["issues"] == ["empty"] for row in empty_payload["health"])
    assert empty_payload["publisherFallback"][0]["usedBackups"] == ["xai-b"]
    broken = {
        "sources": [
            {"id": "a", "publisher": "lab", "role": "primary"},
            {"id": "b", "publisher": "lab", "role": "primary", "xmlUrl": "https://example.com/b.xml"},
        ]
    }
    pair_errors = check_pair([], broken)
    assert any("只有一个主源" in err for err in pair_errors), pair_errors
    assert not titles_match("hello", "hello. more words here please")


def self_test() -> int:
    feeds = load_opml(DEFAULT_OPML)
    meta = load_meta(DEFAULT_META)
    errors = check_pair(feeds, meta)
    if errors:
        print("real OPML/meta check failed:", file=sys.stderr)
        for err in errors:
            print(f"- {err}", file=sys.stderr)
        return 1
    expected_trending = {
        "github-trending-weekly-all": "https://mshibanami.github.io/GitHubTrendingRSS/weekly/all.xml",
        "github-trending-weekly-python": "https://mshibanami.github.io/GitHubTrendingRSS/weekly/python.xml",
        "github-trending-weekly-typescript": "https://mshibanami.github.io/GitHubTrendingRSS/weekly/typescript.xml",
    }
    got_trending = {
        source["id"]: source.get("xmlUrl")
        for source in meta["sources"]
        if str(source.get("id") or "").startswith("github-trending-")
    }
    assert got_trending == expected_trending, got_trending
    opml_trending = [feed["xmlUrl"] for feed in feeds if "GitHubTrendingRSS" in feed["xmlUrl"]]
    assert opml_trending == list(expected_trending.values()), opml_trending
    by_id = {source["id"]: source for source in meta["sources"]}
    assert by_id["xai-news"]["xmlUrl"] == "https://raw.githubusercontent.com/0xSMW/rss-feeds/main/feeds/feed_xai_news.xml"
    assert by_id["xai-news"]["role"] == "primary" and by_id["xai-news"]["publisher"] == "xai"
    assert by_id["xai-news-olshansk"]["xmlUrl"] == "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_xainews.xml"
    assert by_id["xai-news-olshansk"]["role"] == "backup"
    assert by_id["xai-news-xgo"]["xmlUrl"] == "https://api.xgo.ing/rss/user/3953aa71e87a422eb9d7bf6ff1c7c43e"
    assert by_id["meta-ai"]["publisher"] == "meta-ai" and by_id["meta-ai"]["role"] == "primary"
    assert by_id["meta-ai-rsshub"]["xmlUrl"] == "https://rsshub.bestblogs.dev/meta/ai/blog"
    assert by_id["meta-ai-rsshub"]["role"] == "backup"
    assert not by_id["meta-ai-research"].get("xmlUrl")
    assert by_id["meta-ai-research"]["fallback"] == "list-page"
    assert by_id["meta-engineering"]["xmlUrl"] == "https://engineering.fb.com/feed/"
    urls = " ".join(source.get("xmlUrl") or "" for source in meta["sources"])
    assert "rsshub.app" not in urls
    assert "about.fb.com" not in urls
    assert "research.fb.com" not in urls
    assert "feedseek" not in urls
    assert "trvny" not in urls
    assert_fallback_rules()

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
    assert to_item(report["entries"][0], "example", "tech")["lane"] == "tech"
    undated = (
        b"""<?xml version="1.0"?><rss version="2.0"><channel><item>
        <title>No pubDate</title>
        <link>https://tech.example.com/2026/10/29/post.html</link>
        <description>body</description>
        </item></channel></rss>"""
    )
    undated_entries, _title = parse_feed_bytes(undated)
    assert undated_entries[0]["date"] == "2026-10-29", undated_entries
    boundary = b"""<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Beijing next day</title><link>https://example.com/bj</link>
        <pubDate>Fri, 20 Nov 2026 00:30:00 +0800</pubDate><description>x</description></item>
      <item><title>UTC end</title><link>https://example.com/utc-end</link>
        <pubDate>Thu, 19 Nov 2026 23:59:59 GMT</pubDate><description>x</description></item>
      <item><title>Before since UTC</title><link>https://example.com/early</link>
        <pubDate>Fri, 13 Nov 2026 00:30:00 +0800</pubDate><description>x</description></item>
    </channel></rss>"""
    boundary_entries, _title = parse_feed_bytes(boundary)
    by_title = {item["title"]: item["date"] for item in boundary_entries}
    assert by_title["Beijing next day"] == "2026-11-19", by_title
    assert by_title["UTC end"] == "2026-11-19", by_title
    assert by_title["Before since UTC"] == "2026-11-12", by_title
    boundary_report = {
        "snapshot": False,
        "newest": max(by_title.values()),
        "oldest": min(by_title.values()),
        "entries_total": len(boundary_entries),
        "entries": boundary_entries,
        "stale": False,
        "truncated": False,
    }
    mark_window(boundary_report, "2026-11-13", "2026-11-19")
    assert {item["title"] for item in boundary_report["entries"]} == {"Beijing next day", "UTC end"}
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
    long = ("甲" * 1500) + " 结尾还在"
    assert cap_summary(long) == long
    assert not cap_summary(long).endswith("…")
    long_item = to_item({"title": "长文", "date": "2026-11-13", "link": "https://example.com/long", "body": long}, "example")
    assert long_item["summary"] == long
    assert long_item["thin"] is False
    indexed = index_from_payload(
        {
            "window": {"since": "2026-11-13", "until": "2026-11-19"},
            "stats": {"feeds": 1, "errors": 0, "items": 1, "thin": 0},
            "items": [long_item],
        }
    )
    assert "summary" not in indexed["items"][0]
    assert indexed["items"][0]["preview"].endswith("…")
    assert len(indexed["items"][0]["preview"]) <= PREVIEW_CHARS + 1
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        full_path = Path(tmp) / "full.json"
        full_path.write_text(
            json.dumps({"items": [long_item, {"title": "短", "date": "2026-11-14", "link": "https://example.com/b", "source": "s", "thin": True, "summary": "只有一句"}]}, ensure_ascii=False),
            encoding="utf-8",
        )
        saved_out, saved_err = sys.stdout, sys.stderr
        sys.stdout = io_out = __import__("io").StringIO()
        sys.stderr = __import__("io").StringIO()
        try:
            assert pick_items(full_path, ["https://example.com/b"]) == 0
            picked = json.loads(io_out.getvalue())
            assert picked[0]["summary"] == "只有一句"
            assert pick_items(full_path, []) == 2
            assert pick_items(full_path, ["https://example.com/missing"]) == 2
        finally:
            sys.stdout, sys.stderr = saved_out, saved_err

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
    sample = """#### &lt;标签&gt;[标题](https://openai.com/a)

短述。 [社区帖](https://linux.do/t/1)

#### 整体排名

![图](llm-arena.png)
![外链图](https://example.com/chart.png)

#### 其他短讯

- **[名称](https://huggingface.co/blog/x)**：一句。

> 原始链接：https://example.com/bare
"""
    assert extract_digest_links(sample) == [
        "https://openai.com/a",
        "https://linux.do/t/1",
        "https://huggingface.co/blog/x",
        "https://example.com/bare",
    ]
    assert_fallback_rules()
    print("self-test ok")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Pull AI Coding OPML feeds into lean JSON.")
    parser.add_argument("--opml", type=Path, default=DEFAULT_OPML)
    parser.add_argument("--meta", type=Path, default=DEFAULT_META)
    parser.add_argument("--since", help="YYYY-MM-DD，含当天（UTC 日历日）")
    parser.add_argument("--until", help="YYYY-MM-DD，含当天（UTC 日历日）")
    parser.add_argument("--out", type=Path, help="全文 JSON。summary 是完整纯文本")
    parser.add_argument("--index-out", type=Path, help="索引 JSON：标题、链接、来源、开头约 400 字，不含全文")
    parser.add_argument("--pick", type=Path, help="从已有的全文 JSON 按 --link 抽出若干篇，不重新抓取")
    parser.add_argument("--link", action="append", default=[], help="配合 --pick，可重复")
    parser.add_argument("--compare", type=Path, help="已有周报 markdown，按标题链接和行内链接比对覆盖")
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
    if args.pick:
        return pick_items(args.pick, args.link or [])
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
        print("缺少 feedparser。用 Python 3.12 虚拟环境执行: pip install -r scripts/requirements.txt", file=sys.stderr)
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
    elif not args.index_out:
        sys.stdout.write(text)
        sys.stdout.write("\n")
    if args.index_out:
        index_text = json.dumps(index_from_payload(payload), ensure_ascii=False, separators=(",", ":"))
        args.index_out.write_text(index_text + "\n", encoding="utf-8")
    stats = payload["stats"]
    print(
        f"feeds={stats['feeds']} errors={stats['errors']} items={stats['items']} "
        f"thin={stats['thin']} feed_bytes={payload['feed_bytes']} lean_bytes={stats['lean_bytes']} "
        f"lean_tokens_est={stats['lean_tokens_est']} elapsed_ms={payload['elapsed_ms']}",
        file=sys.stderr,
    )
    health = payload.get("health") or []
    if health:
        print(
            "health " + ", ".join(f"{row['id']}={'/'.join(row['issues'])}" for row in health),
            file=sys.stderr,
        )
    if stats["errors"] and stats["feeds"] == stats["errors"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
