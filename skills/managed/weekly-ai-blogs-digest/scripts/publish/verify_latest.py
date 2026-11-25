#!/usr/bin/env python3
"""核验已部署的 latest.json 是否指向指定期，以及该期页面是否返回 200。

只取一次 latest.json，再取一次它给出的页面。不重试。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import unquote, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lib.issue import print_result  # noqa: E402

DEFAULT_LATEST = "https://viruspc.github.io/edges-brain-viruspc/ai-news/latest.json"
ISSUE_ID = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def points_at_issue(url: str, issue_id: str) -> bool:
    if not isinstance(url, str) or not url.strip():
        return False
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return False
    path = unquote(parsed.path or "")
    if path.endswith("/index.html"):
        path = path[: -len("/index.html")]
    path = path.rstrip("/")
    return path.endswith(f"/ai-news/{issue_id}")


def same_origin(left: str, right: str) -> bool:
    a = urlparse(left)
    b = urlparse(right)
    return (a.scheme, a.netloc) == (b.scheme, b.netloc)


def evaluate(
    document,
    issue_id: str,
    *,
    latest_url: str,
    page_status: int | None,
    final_url: str | None,
) -> list[str]:
    if not ISSUE_ID.fullmatch(issue_id or ""):
        return [f"期号不是 YYYY-MM-DD: {issue_id}"]
    if not isinstance(document, dict):
        return ["latest.json 不是对象"]
    errors: list[str] = []
    got = document.get("id")
    if got != issue_id:
        errors.append(f"latest.json 的 id 是 {got!r}，不是 {issue_id}")
    url = document.get("url")
    url_text = url if isinstance(url, str) else ""
    if not points_at_issue(url_text, issue_id) or not same_origin(url_text, latest_url):
        errors.append(f"latest.json 的 url 没有指向 {issue_id} 的页面: {url!r}")
        return errors
    if page_status != 200:
        errors.append(f"该期页面返回 {page_status}，不是 200: {final_url or url_text}")
        return errors
    if not final_url or not points_at_issue(final_url, issue_id) or not same_origin(final_url, latest_url):
        errors.append(f"该期页面最终地址不是这一期: {final_url!r}")
    return errors


def fetch_once(url: str, timeout: float) -> tuple[int, str, bytes]:
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "weekly-ai-blogs-digest/verify-latest",
            "Accept-Encoding": "identity",
        },
    )
    try:
        with opener.open(request, timeout=timeout) as response:
            return response.status, response.geturl(), response.read()
    except urllib.error.HTTPError as exc:
        body = exc.read()
        return exc.code, getattr(exc, "url", None) or url, body


def run(issue_id: str, latest_url: str, timeout: float) -> list[str]:
    parsed = urlparse(latest_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return [f"latest.json 地址无效: {latest_url}"]
    try:
        status, final_latest, body = fetch_once(latest_url, timeout)
    except Exception as exc:  # noqa: BLE001 — 网络失败是核验结果，不重试
        return [f"读不到 latest.json: {exc}"]
    if status != 200:
        return [f"latest.json 返回 {status}: {final_latest}"]
    if not same_origin(final_latest, latest_url):
        return [f"latest.json 跳到了别的站点: {final_latest}"]
    try:
        document = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        return [f"latest.json 无法解析: {exc}"]
    if not isinstance(document, dict):
        return evaluate(document, issue_id, latest_url=latest_url, page_status=None, final_url=None)
    url = document.get("url")
    page_status = None
    final_page = None
    if isinstance(url, str) and points_at_issue(url, issue_id) and same_origin(url, latest_url):
        try:
            page_status, final_page, _body = fetch_once(url, timeout)
        except Exception as exc:  # noqa: BLE001
            return [f"读不到该期页面: {exc}"]
    return evaluate(
        document,
        issue_id,
        latest_url=latest_url,
        page_status=page_status,
        final_url=final_page,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="核验线上 latest.json 是否指向指定期")
    parser.add_argument("--issue", required=True)
    parser.add_argument("--latest", default=DEFAULT_LATEST)
    parser.add_argument("--timeout", type=float, default=30)
    args = parser.parse_args(argv)
    return print_result(run(args.issue, args.latest, args.timeout), f"latest.json 指向 {args.issue}")


if __name__ == "__main__":
    raise SystemExit(main())
