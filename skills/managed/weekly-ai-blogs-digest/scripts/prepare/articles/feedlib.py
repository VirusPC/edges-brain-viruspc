"""读 OPML、解析 feed、按窗口裁剪，并给单个源做体检。

这里不决定备源开不开，也不把多个源的条目并成一份。调用方点名哪些源，就只返回那些源自己的原文和状态。
"""

from __future__ import annotations

import html
import json
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.links import normalize_link  # noqa: E402
from prepare.projects.trending import WEEKLY_ALL_TRENDING_ID, WEEKLY_ALL_TRENDING_XML  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OPML = ROOT / "feeds" / "ai-coding-blogs.opml"
DEFAULT_META = ROOT / "feeds" / "ai-coding-blogs.meta.json"

USER_AGENT = "edges-weekly-ai-blogs-digest/1.0 (+https://github.com/VirusPC/edges-brain-viruspc)"
THIN_CHARS = 280
DEFAULT_TIMEOUT = 40
DEFAULT_WORKERS = 6
STOPPED_DAYS = 31
TITLE_PREFIX_MIN = 16

__all__ = [
    "DEFAULT_META",
    "DEFAULT_OPML",
    "DEFAULT_TIMEOUT",
    "DEFAULT_WORKERS",
    "THIN_CHARS",
    "check_pair",
    "date_conflicts",
    "dedupe_items",
    "download",
    "feed_report",
    "load_meta",
    "load_opml",
    "mark_window",
    "normalize_link",
    "normalize_title",
    "parse_feed_bytes",
    "payload_from_reports",
    "require_window",
    "source_issues",
    "source_result",
    "titles_match",
    "to_item",
]


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
    """feed 转成纯文本后的全文。短文只标 thin，不裁切。"""
    return text


def require_window(since: str | None, until: str | None) -> str | None:
    """缺窗口就返回错误。不用运行当天补上。"""
    if not since or not until:
        return "缺少 --since 或 --until。没有生成日就停止，不用运行当天补窗口。"
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", since) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", until):
        return "since/until 必须是 YYYY-MM-DD"
    if since > until:
        return "since 晚于 until"
    return None


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


def check_pair(feeds: list[dict], meta: dict) -> list[str]:
    errors: list[str] = []
    opml_urls = [item["xmlUrl"] for item in feeds]
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
        if "GitHubTrendingRSS" not in url:
            continue
        if url != WEEKLY_ALL_TRENDING_XML:
            errors.append(f"GitHub Trending 只订每周总榜，发现: {url}")
    trending_ids = [
        str(source.get("id") or "")
        for source in meta.get("sources") or []
        if str(source.get("id") or "").startswith("github-trending-")
    ]
    if trending_ids != [WEEKLY_ALL_TRENDING_ID]:
        errors.append(f"GitHub Trending 订阅 id 只能是 {WEEKLY_ALL_TRENDING_ID}，现在是 {trending_ids}")
    return errors


def entry_date(entry: dict) -> str | None:
    for key in ("published_parsed", "updated_parsed"):
        parsed = entry.get(key)
        if parsed:
            return f"{parsed.tm_year:04d}-{parsed.tm_mon:02d}-{parsed.tm_mday:02d}"
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
        entries.append({"title": title_text, "date": day, "link": link, "body": body})
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
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read(), None
    except urllib.error.HTTPError as exc:
        if exc.code == 403:
            body, curl_err = download_curl(url, timeout)
            if body:
                return body, None
            return b"", f"HTTPError: {exc}; curl fallback: {curl_err}"
        return b"", f"HTTPError: {exc}"
    except Exception as exc:  # noqa: BLE001
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
        report["entries_in_window"] = len(report.get("entries") or [])
        report["stale"] = False
        report["truncated"] = False
        return
    newest = report.get("newest")
    oldest = report.get("oldest")
    if newest and newest < since:
        report["stale"] = True
    if oldest and oldest >= since and report.get("entries_total"):
        report["truncated"] = True
    kept = [entry for entry in report["entries"] if since <= entry["date"] <= until]
    report["entries"] = kept
    report["entries_in_window"] = len(kept)


def to_item(entry: dict, source_id: str, lane: str | None = None) -> dict:
    body = entry["body"]
    item = {
        "title": entry["title"],
        "date": entry["date"],
        "link": entry["link"],
        "summary": cap_summary(body),
        "source": source_id,
        "thin": len(body) < THIN_CHARS,
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


def source_result(report: dict, meta_source: dict, until: str) -> dict:
    """一个源自己的体检和窗口内原文。不读别的源。"""
    issues = source_issues(report, until)
    lane = meta_source.get("lane") or None
    items = [to_item(entry, report["id"], lane) for entry in report.get("entries") or []]
    return {
        "id": report["id"],
        "title": report.get("title") or meta_source.get("title") or report["id"],
        "xmlUrl": report.get("xmlUrl") or meta_source.get("xmlUrl"),
        "publisher": meta_source.get("publisher"),
        "role": meta_source.get("role"),
        "lane": meta_source.get("lane"),
        "status": "ok" if not issues else issues[0],
        "issues": issues,
        "error": report.get("error"),
        "entries_total": report.get("entries_total") or 0,
        "entries_in_window": report.get("entries_in_window", len(report.get("entries") or [])),
        "newest": report.get("newest"),
        "oldest": report.get("oldest"),
        "truncated": bool(report.get("truncated")),
        "stale": bool(report.get("stale")),
        "items": items,
    }


def payload_from_reports(pairs: list[tuple[dict, dict]], since: str, until: str) -> dict:
    """逐源列出原文和体检。没有合并后的 items，也没有备源目录。"""
    return {
        "window": {"since": since, "until": until},
        "sources": [source_result(report, meta_source, until) for report, meta_source in pairs],
    }


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


def lookup_article_source(feeds: list[dict], meta: dict, sid: str) -> tuple[dict, dict] | str:
    """按调用方给的 id 找文章源。周榜和没有 xmlUrl 的列表页不在这里抓。"""
    if sid == WEEKLY_ALL_TRENDING_ID or sid.startswith("github-trending"):
        return f"{sid} 不是文章源。开源项目用 scripts/prepare/projects/fetch_github_trending.py"
    source = next((item for item in meta["sources"] if item.get("id") == sid), None)
    if source is None:
        return f"meta 里没有 {sid}"
    xml_url = source.get("xmlUrl") or ""
    if not xml_url:
        return f"{sid} 没有 xmlUrl。列表页不由这个脚本抓。"
    feed = next((item for item in feeds if item["xmlUrl"] == xml_url), None)
    if feed is None:
        return f"{sid} 的 xmlUrl 不在 OPML 里: {xml_url}"
    return source, feed
