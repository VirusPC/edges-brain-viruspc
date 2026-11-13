#!/usr/bin/env python3
"""Fetch OpenRouter rankings for the weekly digest.

Not an RSS feed. Auth is ``Authorization: Bearer`` from ``OPENROUTER_API_KEY``.
Do not pass the key on the command line, write it into the JSON, or print it.
If the variable is unset, write a skipped JSON and exit 0.

Three boards, each dropped from the article on its own when this file says
``ok`` is false:

* usage: ``GET /api/v1/datasets/rankings-daily?period=day``, summed over the
  inclusive UTC window. Excludes the aggregated ``other`` row. Top 15 by
  ``total_tokens`` (prompt + completion). Does not use ``period=week``.
  The previous 7 UTC days are ``prior_items`` for the notes file only.
* programming: ``rankings-daily?category=programming&period=week``. Sampled
  weekly estimates. Keeps the latest complete Monday–Sunday week whose
  Sunday is on or before the window end, and also on or before today (UTC).
* apps: ``GET /api/v1/datasets/app-rankings?sort=popular`` on the same window.
  ``--no-coding`` skips the coding-category sidecar.

Docs: https://openrouter.ai/docs/cookbook/administration/data-api
License: CC BY 4.0.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ORIGIN = "https://openrouter.ai"
RANKINGS_PATH = "/api/v1/datasets/rankings-daily"
APPS_PATH = "/api/v1/datasets/app-rankings"
MODELS_URL = f"{ORIGIN}/api/v1/models"
RANKINGS_PAGE = "https://openrouter.ai/rankings"
APPS_PAGE = "https://openrouter.ai/apps"
USER_AGENT = "edges-weekly-ai-blogs-digest/1.0 (+https://github.com/VirusPC/edges-brain-viruspc)"
FILE_NAMES = {
    "usage": "openrouter-rankings-daily.json",
    "programming": "openrouter-rankings-programming.json",
    "apps": "openrouter-app-rankings.json",
    "apps-coding": "openrouter-app-rankings-coding.json",
}
MAIN_BOARDS = ("usage", "programming", "apps")
ORG_ALIASES = {"moonshotai": "moonshot"}
TRILLION = 1_000_000_000_000


def api_key() -> str:
    return (os.environ.get("OPENROUTER_API_KEY") or "").strip()


def redact(text: str, key: str) -> str:
    if not text or not key:
        return text
    return text.replace(key, "[redacted]")


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


def fetched_at_shanghai() -> str:
    """Asia/Shanghai is UTC+8 year-round. Keep seconds and an explicit offset."""
    clock = datetime.now(timezone(timedelta(hours=8)))
    return clock.isoformat(timespec="seconds")


def parse_iso_date(value: str) -> date:
    if not isinstance(value, str):
        raise ValueError(f"无效日期: {value!r}")
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValueError(f"无效日期: {value}") from exc


def parse_row_date(value: object) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def resolve_window(since: str | None, until: str | None) -> tuple[date, date]:
    if (since is None) != (until is None):
        raise ValueError("须同时提供 --since 和 --until")
    if since is None:
        until_day = datetime.now(timezone.utc).date() - timedelta(days=1)
        return until_day - timedelta(days=6), until_day
    start = parse_iso_date(since)
    end = parse_iso_date(until or "")
    if start > end:
        raise ValueError("--since 不能晚于 --until")
    return start, end


def complete_week_monday(until: date) -> date:
    """Monday of the latest Mon–Sun week whose Sunday is on or before ``until``."""
    this_monday = until - timedelta(days=until.weekday())
    if until.weekday() == 6:
        return this_monday
    return this_monday - timedelta(days=7)


def select_programming_monday(
    dates: list[date] | tuple[date, ...] | set[date],
    until: date,
    today: date | None = None,
) -> date | None:
    """Latest complete programming week that does not run past the window or today.

    Bucket dates are Mondays. A week is complete when its Sunday is on or
    before both ``until`` and, when given, ``today`` (UTC). An in-progress
    week is never selected. If the target Monday is missing, use the latest
    older complete Monday that is actually present.
    """
    ref = until if today is None else min(until, today)
    mondays = sorted({day for day in dates if isinstance(day, date) and day.weekday() == 0})
    target = complete_week_monday(ref)
    if target in mondays:
        return target
    complete = [day for day in mondays if day + timedelta(days=6) <= ref]
    if complete:
        return max(complete)
    return None


def each_day(start: date, end: date):
    day = start
    while day <= end:
        yield day
        day += timedelta(days=1)


def parse_tokens(value: object) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdecimal():
        return int(value)
    return None


def row_tokens(row: dict) -> int | None:
    """Prefer ``total_tokens``, which the API defines as prompt + completion."""
    total = parse_tokens(row.get("total_tokens"))
    if total is not None:
        return total
    prompt = parse_tokens(row.get("prompt_tokens"))
    completion = parse_tokens(row.get("completion_tokens"))
    if prompt is None and completion is None:
        return None
    return (prompt or 0) + (completion or 0)


def tokens_in_trillions(tokens: int) -> float:
    return round(tokens / TRILLION, 2)


def citation_line(page: str, as_of: str) -> str:
    host_path = page.removeprefix("https://")
    return f"Source: OpenRouter ({host_path}), as of {as_of}. Licensed under CC BY 4.0."


class ModelCatalog:
    """Public ``/api/v1/models`` names. Missing entries stay as the permaslug."""

    def __init__(self, models: list[dict] | None) -> None:
        self.by_canonical: dict[str, list[dict]] = {}
        self.by_id: dict[str, dict] = {}
        for model in models or []:
            if not isinstance(model, dict):
                continue
            ident = model.get("id")
            if isinstance(ident, str):
                self.by_id[ident] = model
            slug = model.get("canonical_slug")
            if isinstance(slug, str):
                self.by_canonical.setdefault(slug, []).append(model)

    def lookup(self, permaslug: str) -> tuple[str, str]:
        org = permaslug.split("/", 1)[0] if "/" in permaslug else "unknown"
        org = ORG_ALIASES.get(org, org)
        model = self._match(permaslug)
        if not model:
            return permaslug, org
        name = model.get("name") or permaslug
        if not isinstance(name, str):
            name = permaslug
        elif ": " in name:
            name = name.split(": ", 1)[1]
        return name, org

    def _match(self, permaslug: str) -> dict | None:
        if ":" in permaslug:
            base, variant = permaslug.rsplit(":", 1)
        else:
            base, variant = permaslug, ""
        candidates = self.by_canonical.get(base, [])
        if variant:
            for model in candidates:
                ident = str(model.get("id") or "")
                if ident.endswith(":" + variant):
                    return model
            return self.by_id.get(permaslug)
        plain = [model for model in candidates if ":" not in str(model.get("id") or "")]
        if plain:
            return plain[0]
        if candidates:
            return candidates[0]
        return self.by_id.get(permaslug)


def aggregate_rankings(
    rows: list,
    start: date,
    end: date,
    limit: int,
    catalog: ModelCatalog,
) -> tuple[list[dict], list[str]]:
    totals: dict[str, int] = {}
    seen: set[date] = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        day = parse_row_date(row.get("date"))
        if day is None or day < start or day > end:
            continue
        seen.add(day)
        slug = row.get("model_permaslug")
        if not isinstance(slug, str) or slug == "other":
            continue
        tokens = row_tokens(row)
        if tokens is None:
            continue
        totals[slug] = totals.get(slug, 0) + tokens
    missing = [day.isoformat() for day in each_day(start, end) if day not in seen]
    ranked = sorted(totals.items(), key=lambda item: (-item[1], item[0]))
    if limit > 0:
        ranked = ranked[:limit]
    items = []
    for index, (slug, tokens) in enumerate(ranked, start=1):
        label, org = catalog.lookup(slug)
        items.append(
            {
                "rank": index,
                "model": label,
                "organization": org,
                "score": tokens_in_trillions(tokens),
                "total_tokens": str(tokens),
                "model_permaslug": slug,
            }
        )
    return items, missing


def app_items(rows: list, limit: int) -> list[dict]:
    usable = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        name = row.get("app_name")
        tokens = row_tokens(row)
        if not isinstance(name, str) or tokens is None:
            continue
        usable.append(row)
    if usable and all(isinstance(row.get("rank"), int) for row in usable):
        usable.sort(key=lambda row: int(row["rank"]))
    else:
        usable.sort(key=lambda row: (-(row_tokens(row) or 0), str(row.get("app_name"))))
    if limit > 0:
        usable = usable[:limit]
    items = []
    for index, row in enumerate(usable, start=1):
        tokens = row_tokens(row) or 0
        item = {
            "rank": index,
            "model": row["app_name"],
            "organization": "app",
            "score": tokens_in_trillions(tokens),
            "total_tokens": str(tokens),
            "app_id": row.get("app_id"),
        }
        if row.get("total_requests") is not None:
            item["total_requests"] = row["total_requests"]
        items.append(item)
    return items


def with_query(path: str, params: list[tuple[str, str]]) -> str:
    return f"{ORIGIN}{path}?{urllib.parse.urlencode(params)}"


def fetch_json(url: str, key: str, timeout: int) -> tuple[int, dict | list | None, str | None]:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"
    request = urllib.request.Request(url, headers=headers)
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
        return 0, None, redact(f"{type(exc).__name__}: {exc}", key)
    try:
        return status, json.loads(body.decode("utf-8")), None
    except json.JSONDecodeError as exc:
        return status, None, redact(f"JSONDecodeError: {exc}", key)


def failure_message(status: int, payload: object, error: str | None, key: str) -> str:
    message = error or f"HTTP {status}"
    if isinstance(payload, dict):
        err = payload.get("error")
        if isinstance(err, dict) and err.get("message"):
            message = f"HTTP {status}: {err.get('message')}"
        elif isinstance(err, str):
            message = f"HTTP {status}: {err}"
    return redact(str(message), key)


def response_meta(payload: object) -> dict:
    if isinstance(payload, dict) and isinstance(payload.get("meta"), dict):
        return payload["meta"]
    return {}


def response_rows(payload: object) -> list:
    if isinstance(payload, dict) and isinstance(payload.get("data"), list):
        return payload["data"]
    return []


def skipped_payload(board: str) -> dict:
    return {
        "skipped": True,
        "ok": False,
        "board": board,
        "source": "OpenRouter",
        "license": "CC BY 4.0",
        "reason": "未设置 OPENROUTER_API_KEY",
        "items": [],
    }


def load_catalog(fetch, timeout: int) -> tuple[ModelCatalog, bool]:
    status, payload, error = fetch(MODELS_URL, "", timeout)
    rows = response_rows(payload)
    if error or status != 200 or not rows:
        return ModelCatalog([]), False
    return ModelCatalog(rows), True


def collect_usage(fetch, key: str, timeout: int, since: date, until: date, limit: int, catalog: ModelCatalog, names_ok: bool) -> dict:
    prior_end = since - timedelta(days=1)
    prior_start = prior_end - timedelta(days=6)
    url = with_query(
        RANKINGS_PATH,
        [
            ("start_date", prior_start.isoformat()),
            ("end_date", until.isoformat()),
            ("period", "day"),
        ],
    )
    status, payload, error = fetch(url, key, timeout)
    meta = response_meta(payload)
    as_of = str(meta.get("as_of") or "")
    base = {
        "skipped": False,
        "board": "usage",
        "source": "OpenRouter",
        "source_url": RANKINGS_PAGE,
        "endpoint": f"{ORIGIN}{RANKINGS_PATH}",
        "license": "CC BY 4.0",
        "citation": citation_line(RANKINGS_PAGE, as_of),
        "meta": meta,
        "fetched_at": fetched_at_shanghai(),
        "names_resolved": names_ok,
        "period": "day",
        "unit": "trillion tokens (prompt+completion)",
        "excluded": ["other"],
        "window": {"start_date": since.isoformat(), "end_date": until.isoformat()},
        "prior_window": {"start_date": prior_start.isoformat(), "end_date": prior_end.isoformat()},
        "items": [],
        "prior_items": [],
    }
    if error or status != 200:
        base["ok"] = False
        base["error"] = failure_message(status, payload, error, key)
        return base
    rows = response_rows(payload)
    items, missing = aggregate_rankings(rows, since, until, limit, catalog)
    prior_items, prior_missing = aggregate_rankings(rows, prior_start, prior_end, limit, catalog)
    base["data"] = rows
    base["items"] = items
    base["missing_dates"] = missing
    base["prior_items"] = prior_items
    base["prior_missing_dates"] = prior_missing
    if missing:
        base["ok"] = False
        base["error"] = "窗口内缺少日期: " + ", ".join(missing)
        return base
    base["ok"] = True
    return base


def programming_buckets(rows: list, selected: date | None, ref: date) -> list[dict]:
    dates = sorted(
        {
            day
            for row in rows
            if isinstance(row, dict)
            for day in [parse_row_date(row.get("date"))]
            if day is not None and day.weekday() == 0
        }
    )
    described = []
    for day in dates:
        sunday = day + timedelta(days=6)
        described.append(
            {
                "date": day.isoformat(),
                "sunday": sunday.isoformat(),
                "status": "complete" if sunday <= ref else "incomplete",
                "selected": day == selected,
            }
        )
    return described


def collect_programming(
    fetch,
    key: str,
    timeout: int,
    since: date,
    until: date,
    limit: int,
    catalog: ModelCatalog,
    names_ok: bool,
    today: date,
) -> dict:
    ref = min(until, today)
    target = complete_week_monday(ref)
    fetch_start = target - timedelta(days=14)
    url = with_query(
        RANKINGS_PATH,
        [
            ("start_date", fetch_start.isoformat()),
            ("end_date", until.isoformat()),
            ("category", "programming"),
            ("period", "week"),
        ],
    )
    status, payload, error = fetch(url, key, timeout)
    meta = response_meta(payload)
    as_of = str(meta.get("as_of") or "")
    base = {
        "skipped": False,
        "board": "programming",
        "source": "OpenRouter",
        "source_url": RANKINGS_PAGE,
        "endpoint": f"{ORIGIN}{RANKINGS_PATH}",
        "license": "CC BY 4.0",
        "citation": citation_line(RANKINGS_PAGE, as_of),
        "meta": meta,
        "fetched_at": fetched_at_shanghai(),
        "names_resolved": names_ok,
        "category": "programming",
        "period": "week",
        "sampled": True,
        "quality_ranking": False,
        "unit": "trillion tokens (prompt+completion)",
        "excluded": ["other"],
        "coverage_window": {"start_date": since.isoformat(), "end_date": until.isoformat()},
        "items": [],
    }
    if error or status != 200:
        base["ok"] = False
        base["error"] = failure_message(status, payload, error, key)
        return base
    rows = response_rows(payload)
    bucket_dates = [
        day
        for row in rows
        if isinstance(row, dict)
        for day in [parse_row_date(row.get("date"))]
        if day is not None
    ]
    selected = select_programming_monday(bucket_dates, until, today)
    base["data"] = rows
    base["buckets"] = programming_buckets(rows, selected, ref)
    if selected is None:
        base["ok"] = False
        base["error"] = "没有已结束的完整采样周"
        return base
    sunday = selected + timedelta(days=6)
    items, _missing = aggregate_rankings(rows, selected, selected, limit, catalog)
    prior_monday = selected - timedelta(days=7)
    prior_items, _prior_missing = aggregate_rankings(rows, prior_monday, prior_monday, limit, catalog)
    base["bucket_date"] = selected.isoformat()
    base["window"] = {"start_date": selected.isoformat(), "end_date": sunday.isoformat()}
    base["items"] = items
    base["prior_window"] = {
        "start_date": prior_monday.isoformat(),
        "end_date": (prior_monday + timedelta(days=6)).isoformat(),
    }
    base["prior_items"] = prior_items
    if not items:
        base["ok"] = False
        base["error"] = f"采样周 {selected.isoformat()} 没有模型行"
        return base
    base["ok"] = True
    return base


def collect_apps(
    fetch,
    key: str,
    timeout: int,
    since: date,
    until: date,
    limit: int,
    category: str | None,
) -> dict:
    board = "apps-coding" if category else "apps"
    params = [
        ("sort", "popular"),
        ("start_date", since.isoformat()),
        ("end_date", until.isoformat()),
        ("limit", str(limit if limit > 0 else 15)),
    ]
    if category:
        params.append(("category", category))
    url = with_query(APPS_PATH, params)
    status, payload, error = fetch(url, key, timeout)
    meta = response_meta(payload)
    as_of = str(meta.get("as_of") or "")
    base = {
        "skipped": False,
        "board": board,
        "source": "OpenRouter",
        "source_url": APPS_PAGE,
        "endpoint": f"{ORIGIN}{APPS_PATH}",
        "license": "CC BY 4.0",
        "citation": citation_line(APPS_PAGE, as_of),
        "meta": meta,
        "fetched_at": fetched_at_shanghai(),
        "sort": "popular",
        "category": category,
        "unit": "trillion tokens (prompt+completion)",
        "window": {"start_date": since.isoformat(), "end_date": until.isoformat()},
        "items": [],
    }
    if error or status != 200:
        base["ok"] = False
        base["error"] = failure_message(status, payload, error, key)
        return base
    rows = response_rows(payload)
    items = app_items(rows, limit)
    base["data"] = rows
    base["items"] = items
    if not items:
        base["ok"] = False
        base["error"] = "应用榜没有数据"
        return base
    base["ok"] = True
    return base


def write_payloads(payloads: dict[str, dict], out_dir: str | None, out_path: str | None, pretty: bool) -> None:
    if out_dir:
        dest = Path(out_dir)
        dest.mkdir(parents=True, exist_ok=True)
        for board, payload in payloads.items():
            emit(payload, str(dest / FILE_NAMES[board]), pretty)
        return
    emit(payloads, out_path, pretty)


def main(argv: list[str] | None = None, *, fetch=None, today: date | None = None) -> int:
    fetch = fetch or fetch_json
    parser = argparse.ArgumentParser(description="Fetch OpenRouter usage, programming, and app rankings.")
    parser.add_argument("--since", help="覆盖窗口起，YYYY-MM-DD（UTC，含当天）")
    parser.add_argument("--until", help="覆盖窗口止，YYYY-MM-DD（UTC，含当天）")
    parser.add_argument("--out-dir", help="写入四份快照 JSON 的目录")
    parser.add_argument("--out", help="不写目录时，把全部榜写进这一个 JSON；默认 stdout")
    parser.add_argument("--pretty", action="store_true")
    parser.add_argument("--limit", type=int, default=15, help="每张榜保留前 N 条，0 表示不截断")
    parser.add_argument("--timeout", type=int, default=40)
    parser.add_argument("--no-coding", action="store_true", help="不拉 app-rankings category=coding")
    args = parser.parse_args(argv)
    try:
        since, until = resolve_window(args.since, args.until)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    boards = list(MAIN_BOARDS)
    if not args.no_coding:
        boards.append("apps-coding")
    key = api_key()
    if not key:
        write_payloads({board: skipped_payload(board) for board in boards}, args.out_dir, args.out, args.pretty)
        print("skip: no OPENROUTER_API_KEY", file=sys.stderr)
        return 0
    catalog, names_ok = load_catalog(fetch, args.timeout)
    if not names_ok:
        print("warn: model catalog unavailable; labels fall back to permaslug", file=sys.stderr)
    clock = today or datetime.now(timezone.utc).date()
    payloads = {
        "usage": collect_usage(fetch, key, args.timeout, since, until, args.limit, catalog, names_ok),
        "programming": collect_programming(
            fetch, key, args.timeout, since, until, args.limit, catalog, names_ok, clock
        ),
        "apps": collect_apps(fetch, key, args.timeout, since, until, args.limit, None),
    }
    if not args.no_coding:
        payloads["apps-coding"] = collect_apps(fetch, key, args.timeout, since, until, args.limit, "coding")
    write_payloads(payloads, args.out_dir, args.out, args.pretty)
    failed = []
    for board, payload in payloads.items():
        if payload.get("ok"):
            print(f"ok {board} items={len(payload.get('items') or [])}", file=sys.stderr)
            continue
        message = payload.get("error") or payload.get("reason") or "failed"
        if board in MAIN_BOARDS:
            failed.append(board)
            print(f"error: {board} {message}", file=sys.stderr)
        else:
            print(f"warn: {board} {message}", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
