#!/usr/bin/env python3
"""按 OPML 汇总 summary/index.json 的 sources，并算出 cleaned 条目该写的发布方。

不改 raw，也不写 cleaned。发布方戳记由清洗阶段的 stamp_publishers.py 写入。
发布方显示名、分类和读者看到的网站来自 OPML；模型榜单来自
feeds/ai-coding-blogs.meta.json 的 boards。备源并进同一个发布方，不单列 feed 名。
"""

from __future__ import annotations

import fnmatch
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import SKILL_ROOT  # noqa: E402
from lib.links import normalize_link  # noqa: E402

CATEGORIES = ["模型榜单", "GitHub Trending", "博客", "国内互联网"]
OPML_PATH = SKILL_ROOT / "feeds" / "ai-coding-blogs.opml"
META_PATH = SKILL_ROOT / "feeds" / "ai-coding-blogs.meta.json"


def load_catalog() -> tuple[dict[str, dict], dict[str, str], list[dict], dict[str, dict]]:
    opml = _load_opml(OPML_PATH)
    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    by_id: dict[str, str] = {}
    meta_by_id: dict[str, dict] = {}
    for source in meta.get("sources") or []:
        sid = source.get("id")
        if not sid:
            continue
        meta_by_id[sid] = source
        xml = (source.get("xmlUrl") or "").strip()
        if xml:
            by_id[sid] = xml
    boards = list(meta.get("boards") or [])
    return opml, by_id, boards, meta_by_id


def sources_document(issue: Path) -> dict:
    """四类固定顺序。已订阅的发布方即使本周 0 条也列出。模型榜单没有条数时用 null。"""
    opml, by_id, boards, meta_by_id = load_catalog()
    grouped, errors = _grouped_links(Path(issue), opml, by_id, meta_by_id)
    if errors:
        raise ValueError("\n".join(errors))
    subscribed = _subscribed_publishers(opml)
    categories = [_model_category(Path(issue), boards)]
    for title in CATEGORIES:
        if title == "模型榜单":
            continue
        publishers = []
        seen: set[str] = set()
        for row in subscribed[title]:
            bucket = grouped[title].get(row["name"])
            count = _bucket_count(bucket)
            publishers.append({"name": row["name"], "url": row["url"], "count": count})
            seen.add(row["name"])
        for name in sorted(grouped[title]):
            if name in seen:
                continue
            bucket = grouped[title][name]
            count = _bucket_count(bucket)
            if count <= 0:
                continue
            publishers.append({"name": name, "url": bucket["url"], "count": count})
        categories.append({
            "title": title,
            "count": sum(item["count"] for item in publishers),
            "publishers": publishers,
        })
    return {"categories": categories}


def _bucket_count(bucket: dict | None) -> int:
    if not bucket:
        return 0
    return len(bucket["links"]) + bucket["rows"]


def _subscribed_publishers(opml: dict[str, dict]) -> dict[str, list[dict]]:
    """按 OPML 出现顺序。同一发布方的备源并进主源网址。"""
    found: dict[str, dict[str, dict]] = {title: {} for title in CATEGORIES}
    for info in opml.values():
        category = info["category"]
        if category not in found or not info["publisher"]:
            continue
        current = found[category].get(info["publisher"])
        url = _summary_url(info)
        if current is None:
            found[category][info["publisher"]] = {"name": info["publisher"], "url": url, "backup": info["backup"]}
        elif current["backup"] and not info["backup"]:
            current["url"] = url
            current["backup"] = False
    return {
        title: [{"name": row["name"], "url": row["url"]} for row in rows.values()]
        for title, rows in found.items()
    }


def _model_category(issue: Path, boards: list[dict]) -> dict:
    publishers = []
    counted: list[int] = []
    for board in boards:
        count = _board_item_count(issue, board)
        number = count if count > 0 else None
        publishers.append({"name": board["publisher"], "url": board["url"], "count": number})
        if number is not None:
            counted.append(number)
    return {
        "title": "模型榜单",
        "count": sum(counted) if counted else None,
        "publishers": publishers,
    }


def stamp_map(issue: Path, *, lanes: tuple[str, ...] = ("articles", "projects", "models")) -> tuple[dict[str, dict], list[str]]:
    """cleaned 相对路径 → publisher / category / url。对不上就返回错误。只读，不写文件。"""
    issue = Path(issue)
    opml, by_id, boards, meta_by_id = load_catalog()
    _grouped, errors = _grouped_links(issue, opml, by_id, meta_by_id)
    if errors:
        return {}, errors
    link_info = _link_info(issue, opml, by_id, meta_by_id)
    out: dict[str, dict] = {}
    if "articles" in lanes:
        errors.extend(_stamp_lane(issue, "articles", "id", link_info, out))
    if "projects" in lanes:
        errors.extend(_stamp_lane(issue, "projects", "id", link_info, out))
    if "models" in lanes:
        errors.extend(_stamp_models(issue, link_info, boards, opml, by_id, meta_by_id, out))
        errors.extend(_stamp_boards(issue, boards, out))
    return out, errors


def _load_opml(path: Path) -> dict[str, dict]:
    tree = ET.parse(path)
    body = tree.getroot().find("body")
    feeds: dict[str, dict] = {}
    groups = [] if body is None else list(body)
    for group in groups:
        category = (group.attrib.get("text") or "").strip()
        for feed in list(group):
            xml = (feed.attrib.get("xmlUrl") or "").strip()
            if not xml:
                continue
            feeds[xml] = {
                "category": (feed.attrib.get("category") or category).strip(),
                "publisher": (feed.attrib.get("publisher") or "").strip(),
                "html_url": (feed.attrib.get("htmlUrl") or "").strip(),
                "publisher_url": (feed.attrib.get("publisherUrl") or "").strip(),
                "backup": (feed.attrib.get("role") or "") == "backup",
                "title": (feed.attrib.get("text") or "").strip(),
            }
    return feeds


def _grouped_links(issue: Path, opml: dict[str, dict], by_id: dict[str, str], meta_by_id: dict[str, dict]) -> tuple[dict, list[str]]:
    grouped = {title: {} for title in CATEGORIES}
    errors: list[str] = []
    seen: dict[str, str] = {}

    def take(origin: str, item: dict) -> None:
        info = _info_for_item(item, opml, by_id, meta_by_id)
        if info is None:
            if not _ignored_source(item.get("source")):
                errors.append(f"{origin} 的条目对不上 OPML 发布方: {item.get('link') or item.get('title')}")
            return
        if info["category"] not in grouped:
            errors.append(f"分类不在四类里: {info['category']}")
            return
        link = item.get("link")
        if not isinstance(link, str) or not link.strip():
            return
        key = normalize_link(link)
        if not key or key in seen:
            return
        seen[key] = info["publisher"]
        bucket = grouped[info["category"]].setdefault(info["publisher"], {"url": "", "links": set(), "rows": 0})
        url = _summary_url(info)
        if bucket["url"] and url and bucket["url"] != url:
            errors.append(f"{info['publisher']} 的网站不一致: {bucket['url']} / {url}")
        bucket["url"] = url or bucket["url"]
        bucket["links"].add(key)

    for origin in ("raw/articles/feeds.json", "raw/articles/backfill.json"):
        for item in _items(issue / origin):
            take(origin, item)
    for path in _trending_files(issue):
        for item in _trending_items(path):
            take(f"raw/projects/{path.name}", item)
    return grouped, errors


def _board_item_count(issue: Path, board: dict) -> int:
    raw = issue / "raw" / "models"
    total = 0
    if not raw.is_dir():
        return 0
    names = {path.name for path in raw.glob("*.json")}
    for pattern in board.get("files") or []:
        for name in sorted(names):
            if not fnmatch.fnmatch(name, pattern):
                continue
            data = _read(raw / name)
            if not isinstance(data, dict) or data.get("skipped") is True or data.get("ok") is False:
                continue
            items = data.get("items")
            if not isinstance(items, list):
                items = data.get("data") if isinstance(data.get("data"), list) else None
            if isinstance(items, list):
                total += len(items)
    return total


def _link_info(issue: Path, opml: dict[str, dict], by_id: dict[str, str], meta_by_id: dict[str, dict]) -> dict[str, dict]:
    found: dict[str, dict] = {}
    batches = [
        ("raw/articles/feeds.json", _items(issue / "raw/articles/feeds.json")),
        ("raw/articles/backfill.json", _items(issue / "raw/articles/backfill.json")),
    ]
    for path in _trending_files(issue):
        batches.append((f"raw/projects/{path.name}", _trending_items(path)))
    for _origin, items in batches:
        for item in items:
            info = _info_for_item(item, opml, by_id, meta_by_id)
            link = item.get("link")
            if info is None or not isinstance(link, str):
                continue
            key = normalize_link(link)
            if key and key not in found:
                found[key] = {
                    "publisher": info["publisher"],
                    "category": info["category"],
                    "url": info["html_url"] or _summary_url(info),
                }
    return found


def _ignored_source(source_id: object) -> bool:
    return False


def _linux_feed(source_id: object) -> dict | None:
    if not isinstance(source_id, str) or not source_id.startswith("linux-do"):
        return None
    return {
        "category": "博客",
        "publisher": "linux.do",
        "html_url": "https://linux.do/",
        "publisher_url": "https://linux.do/",
        "backup": False,
        "title": "linux.do",
    }


def _info_for_item(item: dict, opml: dict[str, dict], by_id: dict[str, str], meta_by_id: dict[str, dict]) -> dict | None:
    source_id = item.get("source")
    linux = _linux_feed(source_id)
    if linux:
        return linux
    github = _github_feed(source_id if isinstance(source_id, str) else "", item.get("xmlUrl") or "", opml)
    if github:
        return github
    if isinstance(source_id, str) and source_id in by_id:
        info = opml.get(by_id[source_id])
        if info:
            return info
    if isinstance(source_id, str) and source_id in meta_by_id:
        info = _from_meta_source(meta_by_id[source_id], opml, by_id)
        if info:
            return info
    link = item.get("link")
    if isinstance(link, str):
        return _match_host(link, opml)
    return None


def _github_feed(source_id: str, xml_url: str, opml: dict[str, dict]) -> dict | None:
    text = f"{source_id} {xml_url}"
    if "GitHubTrendingRSS" not in text and not source_id.startswith("github-trending"):
        return None
    page = "https://github.com/trending?since=weekly"
    canonical = page
    for info in opml.values():
        if info["publisher"] == "GitHub" and info["publisher_url"]:
            canonical = info["publisher_url"]
            break
    return {
        "category": "GitHub Trending",
        "publisher": "GitHub",
        "html_url": page,
        "publisher_url": canonical,
        "backup": False,
        "title": "GitHub",
    }


def _from_meta_source(source: dict, opml: dict[str, dict], by_id: dict[str, str]) -> dict | None:
    """OPML 里没有的退路页：能并进已有发布方就并，否则用 meta 的标题和 htmlUrl。"""
    sid = str(source.get("id") or "")
    best = ""
    for other in by_id:
        if sid.startswith(other) and len(other) > len(best):
            best = other
    if best:
        info = opml.get(by_id[best])
        if info:
            page = (source.get("htmlUrl") or "").strip() or _summary_url(info)
            return {**info, "html_url": page, "backup": False}
    title = str(source.get("title") or "").strip()
    page = (source.get("htmlUrl") or "").strip()
    if not title or not page:
        return None
    name = title[:-5].strip() if title.endswith(" Blog") else title
    group = str(source.get("group") or "")
    category = group if group in CATEGORIES else "博客"
    return {
        "category": category,
        "publisher": name,
        "html_url": page,
        "publisher_url": page,
        "backup": False,
        "title": title,
    }


def _trending_files(issue: Path) -> list[Path]:
    directory = issue / "raw" / "projects"
    if not directory.is_dir():
        return []
    return sorted(path for path in directory.glob("github-trending*.json") if path.is_file())


def _trending_items(path: Path) -> list:
    data = _read(path)
    if not isinstance(data, dict):
        return []
    boards = data.get("boards")
    if isinstance(boards, dict):
        items = []
        for key, rows in boards.items():
            if isinstance(rows, dict):
                rows = rows.get("items") or rows.get("entries") or []
            if not isinstance(rows, list):
                continue
            period, _, language = str(key).partition("/")
            for row in rows:
                if not isinstance(row, dict):
                    continue
                copied = dict(row)
                if not copied.get("link") and copied.get("url"):
                    copied["link"] = copied["url"]
                copied["source"] = f"github-trending-{period}-{language or 'all'}"
                items.append(copied)
        if items:
            return items
    items = []
    for item in data.get("items") or []:
        if not isinstance(item, dict):
            continue
        copied = dict(item)
        if not copied.get("link") and copied.get("url"):
            copied["link"] = copied["url"]
        items.append(copied)
    return items


def _match_host(url: str, opml: dict[str, dict]) -> dict | None:
    """用网站主机名和路径前缀对上发布方。同长度时只接受同一个发布方。"""
    host = _host(url)
    if not host:
        return None
    path = urlsplit(url.strip()).path or "/"
    ranked = []
    for info in opml.values():
        page = info["html_url"] or info["publisher_url"]
        page_host = _host(page)
        if not page_host or not (host == page_host or host.endswith("." + page_host)):
            continue
        page_path = urlsplit(page).path or "/"
        prefix = page_path.rstrip("/") or "/"
        if prefix != "/" and not path.startswith(prefix):
            continue
        ranked.append((len(prefix) if prefix != "/" else 0, not info["backup"], info))
    if ranked:
        ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
        best_len, best_primary, _info = ranked[0]
        top = [item[2] for item in ranked if item[0] == best_len and item[1] == best_primary]
        names = {(info["publisher"], info["category"]) for info in top}
        if len(names) == 1:
            return top[0]
    host_hits = []
    for info in opml.values():
        page_host = _host(info["html_url"] or info["publisher_url"])
        if page_host and (host == page_host or host.endswith("." + page_host)) and not info["backup"]:
            host_hits.append(info)
    names = {(info["publisher"], info["category"]) for info in host_hits}
    if len(names) == 1:
        return host_hits[0]
    return None


def _summary_url(info: dict) -> str:
    return info["publisher_url"] or info["html_url"]


def _stamp_lane(issue: Path, lane: str, id_key: str, link_info: dict[str, dict], out: dict[str, dict]) -> list[str]:
    errors = []
    directory = issue / "cleaned" / lane
    if not directory.is_dir():
        return errors
    for path in sorted(directory.glob("*.json")):
        if path.name == "index.json":
            continue
        data = _read(path)
        if not isinstance(data, dict):
            errors.append(f"cleaned/{lane}/{path.name} 无法读取")
            continue
        key = normalize_link(str(data.get(id_key) or ""))
        info = link_info.get(key)
        rel = f"cleaned/{lane}/{path.name}"
        if info is None:
            errors.append(f"{rel} 对不上 raw 里的发布方")
            continue
        out[rel] = info
    return errors


def _stamp_models(
    issue: Path,
    link_info: dict[str, dict],
    boards: list[dict],
    opml: dict[str, dict],
    by_id: dict[str, str],
    meta_by_id: dict[str, dict],
    out: dict[str, dict],
) -> list[str]:
    errors = []
    directory = issue / "cleaned" / "models"
    if not directory.is_dir():
        return errors
    biz_map = _biz_map(issue, opml, by_id, meta_by_id)
    publishers = _publisher_names(opml)
    for path in sorted(directory.glob("*.json")):
        if path.name == "index.json":
            continue
        data = _read(path)
        rel = f"cleaned/models/{path.name}"
        if not isinstance(data, dict):
            errors.append(f"{rel} 无法读取")
            continue
        release = data.get("release_url")
        info = _match_host(release, opml) if isinstance(release, str) else None
        if info is None and isinstance(release, str):
            info = biz_map.get(_biz(release))
        if info is None:
            info = _publisher_named(str(data.get("id") or data.get("name") or ""), publishers)
        if info is None:
            info = _board_for_source(str(data.get("source") or ""), boards)
        if info is None:
            errors.append(f"{rel} 对不上发布方")
            continue
        if "html_url" in info:
            out[rel] = {
                "publisher": info["publisher"],
                "category": info["category"],
                "url": info["html_url"] or _summary_url(info),
            }
        else:
            out[rel] = info
    return errors


def _stamp_boards(issue: Path, boards: list[dict], out: dict[str, dict]) -> list[str]:
    errors = []
    directory = issue / "cleaned" / "models" / "boards"
    if not directory.is_dir():
        return errors
    for path in sorted(directory.glob("*.json")):
        data = _read(path)
        rel = f"cleaned/models/boards/{path.name}"
        if not isinstance(data, dict):
            errors.append(f"{rel} 无法读取")
            continue
        info = _board_for_source(str(data.get("source") or ""), boards)
        if info is None:
            errors.append(f"{rel} 的 source 不在榜单元数据里")
            continue
        out[rel] = info
    return errors


def _biz(url: str) -> str:
    from urllib.parse import parse_qs
    return (parse_qs(urlsplit(url).query).get("__biz") or [""])[0]


def _biz_map(issue: Path, opml: dict[str, dict], by_id: dict[str, str], meta_by_id: dict[str, dict]) -> dict[str, dict]:
    found: dict[str, dict] = {}
    for origin in ("raw/articles/feeds.json", "raw/articles/backfill.json"):
        for item in _items(issue / origin):
            link = item.get("link")
            if not isinstance(link, str):
                continue
            biz = _biz(link)
            if not biz or biz in found:
                continue
            info = _info_for_item(item, opml, by_id, meta_by_id)
            if info:
                found[biz] = info
    return found


def _publisher_names(opml: dict[str, dict]) -> list[dict]:
    seen = []
    names = set()
    for info in opml.values():
        if info["backup"] or info["publisher"] in names:
            continue
        names.add(info["publisher"])
        seen.append(info)
    seen.sort(key=lambda info: len(info["publisher"]), reverse=True)
    return seen


def _publisher_named(text: str, publishers: list[dict]) -> dict | None:
    for info in publishers:
        if text.startswith(info["publisher"]):
            return info
    return None


def _board_for_source(source: str, boards: list[dict]) -> dict | None:
    name = Path(source.split("#", 1)[0]).name
    for board in boards:
        for pattern in board.get("files") or []:
            if fnmatch.fnmatch(name, pattern):
                return {
                    "publisher": board["publisher"],
                    "category": board["category"],
                    "url": board["url"],
                }
    return None


def _items(path: Path) -> list:
    data = _read(path)
    if isinstance(data, dict) and isinstance(data.get("items"), list):
        return [item for item in data["items"] if isinstance(item, dict)]
    return []


def _read(path: Path):
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _host(url: str) -> str:
    host = urlsplit(url.strip()).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host
