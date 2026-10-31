#!/usr/bin/env python3
"""Fetch the Artificial Analysis language-model list.

Not an RSS feed and not part of the OPML. Weekly digest uses this as an
optional leaderboard section.

Auth: header ``x-api-key`` from ``AA_API_KEY`` or ``ARTIFICIAL_ANALYSIS_API_KEY``.
Do not pass the key on the command line. If neither variable is set, write a
skipped JSON and exit 0 so a run without the secret still succeeds.

The documented list URL is ``/api/v2/language/models`` (Pro+). A free key is
rejected there with 403; this script then calls ``/api/v2/language/models/free``,
which is the free-tier list. Free tier is about 10 requests per day.

Displaying the data requires attribution to Artificial Analysis:
https://artificialanalysis.ai/
Optional MCP: https://mcp.artificialanalysis.ai/mcp
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

PRO_URL = "https://artificialanalysis.ai/api/v2/language/models"
FREE_URL = "https://artificialanalysis.ai/api/v2/language/models/free"
ATTRIBUTION = "Data from Artificial Analysis (https://artificialanalysis.ai/)."
USER_AGENT = "edges-weekly-ai-blogs-digest/1.0 (+https://github.com/VirusPC/edges-brain-viruspc)"


def api_key() -> str:
    return (os.environ.get("AA_API_KEY") or os.environ.get("ARTIFICIAL_ANALYSIS_API_KEY") or "").strip()


def emit(payload: dict, out_path: str | None, pretty: bool) -> None:
    if pretty:
        text = json.dumps(payload, ensure_ascii=False, indent=2)
    else:
        text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if out_path:
        with open(out_path, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.write("\n")
    else:
        sys.stdout.write(text)
        sys.stdout.write("\n")


def fetch_json(url: str, key: str, timeout: int) -> tuple[int, dict | list | None, str | None]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "x-api-key": key,
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read()
            status = response.status
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        try:
            parsed = json.loads(raw.decode("utf-8", "replace"))
        except json.JSONDecodeError:
            parsed = None
        return exc.code, parsed, None
    except Exception as exc:  # noqa: BLE001
        return 0, None, f"{type(exc).__name__}: {exc}"
    try:
        return status, json.loads(body.decode("utf-8")), None
    except json.JSONDecodeError as exc:
        return status, None, f"JSONDecodeError: {exc}"


def lean_model(row: dict) -> dict:
    creator = row.get("model_creator") or {}
    evaluations = row.get("evaluations") or {}
    pricing = row.get("pricing") or {}
    return {
        "name": row.get("name"),
        "slug": row.get("slug"),
        "creator": creator.get("name") if isinstance(creator, dict) else None,
        "intelligence_index": evaluations.get("artificial_analysis_intelligence_index"),
        "coding_index": evaluations.get("artificial_analysis_coding_index"),
        "price_1m_input_tokens": pricing.get("price_1m_input_tokens"),
        "price_1m_output_tokens": pricing.get("price_1m_output_tokens"),
        "release_date": row.get("release_date"),
    }


def sort_key(item: dict) -> tuple:
    score = item.get("intelligence_index")
    if isinstance(score, (int, float)):
        return (0, -float(score), item.get("name") or "")
    return (1, 0, item.get("name") or "")


def collect(key: str, timeout: int, limit: int, max_pages: int) -> dict:
    url = PRO_URL
    status, payload, error = fetch_json(url, key, timeout)
    if status == 403:
        url = FREE_URL
        status, payload, error = fetch_json(url, key, timeout)
    if error or status != 200 or not isinstance(payload, dict):
        message = error or f"HTTP {status}"
        if isinstance(payload, dict) and payload.get("error"):
            message = str(payload.get("error"))
        return {
            "skipped": False,
            "ok": False,
            "error": message,
            "endpoint": url,
            "attribution": ATTRIBUTION,
            "mcp": "https://mcp.artificialanalysis.ai/mcp",
            "items": [],
        }
    rows = list(payload.get("data") or [])
    pagination = payload.get("pagination") or {}
    pages = 1
    while pagination.get("has_more") and pages < max_pages:
        pages += 1
        next_url = f"{url}?page={pages}"
        status, page_payload, error = fetch_json(next_url, key, timeout)
        if error or status != 200 or not isinstance(page_payload, dict):
            break
        rows.extend(page_payload.get("data") or [])
        pagination = page_payload.get("pagination") or {}
    items = [lean_model(row) for row in rows if isinstance(row, dict)]
    items.sort(key=sort_key)
    if limit > 0:
        items = items[:limit]
    return {
        "skipped": False,
        "ok": True,
        "source": "Artificial Analysis",
        "endpoint": url,
        "tier": payload.get("tier"),
        "intelligence_index_version": payload.get("intelligence_index_version"),
        "attribution": ATTRIBUTION,
        "mcp": "https://mcp.artificialanalysis.ai/mcp",
        "fetched_models": len(rows),
        "items": items,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch Artificial Analysis language models.")
    parser.add_argument("--out", help="写入 JSON。默认 stdout")
    parser.add_argument("--pretty", action="store_true")
    parser.add_argument("--limit", type=int, default=20, help="按 Intelligence Index 保留前 N 条，0 表示不截断")
    parser.add_argument("--max-pages", type=int, default=3, help="免费档每天大约 10 次，默认最多翻 3 页")
    parser.add_argument("--timeout", type=int, default=40)
    args = parser.parse_args(argv)
    key = api_key()
    if not key:
        payload = {
            "skipped": True,
            "ok": False,
            "reason": "未设置 AA_API_KEY 或 ARTIFICIAL_ANALYSIS_API_KEY",
            "attribution": ATTRIBUTION,
            "mcp": "https://mcp.artificialanalysis.ai/mcp",
            "items": [],
        }
        emit(payload, args.out, args.pretty)
        print("skip: no AA_API_KEY or ARTIFICIAL_ANALYSIS_API_KEY", file=sys.stderr)
        return 0
    payload = collect(key, args.timeout, args.limit, args.max_pages)
    emit(payload, args.out, args.pretty)
    if not payload.get("ok"):
        print(f"error: {payload.get('error')}", file=sys.stderr)
        return 1
    print(
        f"ok endpoint={payload['endpoint']} models={payload['fetched_models']} kept={len(payload['items'])}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
