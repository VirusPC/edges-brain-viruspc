#!/usr/bin/env python3
"""Fetch the OpenRouter official-endpoint catalog used for speed ranks.

Universe: Artificial Analysis models that have an intelligence index and
match one plain OpenRouter model id. Reasoning-effort suffixes collapse
onto that id. An id that matches more than one OpenRouter model is left
out.

For each matched id, keep official standard endpoints only. Standard means
service_tier is null or default, and no tag segment is flex, priority,
fast, or ultrafast. Official means the tag root is the author slug, starts
with that slug plus a hyphen (google-vertex, google-ai-studio), or is in
AUTHOR_TAG_ALIASES. Several official standard endpoints contribute their
median latency and median throughput.

Latency p50 is milliseconds and is stored as seconds, the same unit as the
model card. Ranking is competition on that latency, lower first.

Auth: ``Authorization: Bearer`` from ``OPENROUTER_API_KEY`` on the endpoints
call. The public model list does not send the key. If the variable is
unset, write a skipped JSON and exit 0. Never put the key in the file,
the command line, or logs.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from decimal import Decimal
from pathlib import Path

from fetch_openrouter import failure_message, fetch_json, fetched_at_shanghai, redact

_RANKS = Path(__file__).resolve().parents[2] / "clean" / "models"
if str(_RANKS) not in sys.path:
    sys.path.insert(0, str(_RANKS))
from model_release_ranks import SPEED_METRIC, SPEED_SOURCE, as_decimal, json_number, speed_ranks

ORIGIN = "https://openrouter.ai"
MODELS_URL = f"{ORIGIN}/api/v1/models"
FILE_NAME = "openrouter-official-endpoints.json"
USER_AGENT = "edges-weekly-ai-blogs-digest/1.0 (+https://github.com/VirusPC/edges-brain-viruspc)"
TIER_SEGMENTS = {"flex", "priority", "fast", "ultrafast"}
EFFORT_TOKENS = {"max", "xhigh", "high", "medium", "low", "minimal", "none"}
# Author slug on OpenRouter differs from the first-party provider tag.
AUTHOR_TAG_ALIASES = {
    "bytedance-seed": {"seed"},
    "mistralai": {"mistral"},
    "qwen": {"alibaba"},
    "rekaai": {"reka"},
    "x-ai": {"xai"},
}
MAX_ATTEMPTS = 4


def api_key() -> str:
    return (os.environ.get("OPENROUTER_API_KEY") or "").strip()


def normalize_slug(value: str) -> str:
    return value.lower().replace(".", "-").replace("_", "-")


def is_effort_remainder(rest: str) -> bool:
    if rest == "non-reasoning":
        return True
    parts = [part for part in rest.split("-") if part]
    return bool(parts) and all(part in EFFORT_TOKENS for part in parts)


def plain_models(rows: list) -> list[tuple[str, str]]:
    plain = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        ident = row.get("id")
        if not isinstance(ident, str) or "/" not in ident or ":" in ident or ident.startswith("~"):
            continue
        _author, tail = ident.split("/", 1)
        plain.append((ident, normalize_slug(tail)))
    return plain


def match_openrouter_slug(aa_slug: str, catalog: list[tuple[str, str]]) -> str | None:
    slug = normalize_slug(aa_slug)
    exact = [ident for ident, tail in catalog if tail == slug]
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        return None
    prefixed = []
    for ident, tail in catalog:
        if slug.startswith(tail + "-") and is_effort_remainder(slug[len(tail) + 1 :]):
            prefixed.append(ident)
    if len(prefixed) == 1:
        return prefixed[0]
    return None


def tag_parts(tag: object) -> list[str]:
    if not isinstance(tag, str):
        return []
    return [part for part in tag.lower().split("/") if part]


def is_standard_endpoint(endpoint: dict) -> bool:
    tier = endpoint.get("service_tier")
    if isinstance(tier, str) and tier.lower() in TIER_SEGMENTS:
        return False
    return not any(part in TIER_SEGMENTS for part in tag_parts(endpoint.get("tag")))


def is_official_endpoint(endpoint: dict, author: str) -> bool:
    parts = tag_parts(endpoint.get("tag"))
    if not parts:
        return False
    root = parts[0]
    author = author.lower()
    if root == author or root.startswith(author + "-"):
        return True
    return root in AUTHOR_TAG_ALIASES.get(author, set())


def percentile_p50(stats: object) -> int | float | None:
    if not isinstance(stats, dict):
        return None
    value = stats.get("p50")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value


def median_decimal(values: list[Decimal]) -> Decimal | None:
    if not values:
        return None
    ordered = sorted(values)
    count = len(ordered)
    if count % 2:
        return ordered[count // 2]
    return (ordered[count // 2 - 1] + ordered[count // 2]) / Decimal(2)


def summarize_endpoints(endpoints: list, author: str) -> dict | None:
    considered = []
    latencies = []
    throughputs = []
    for endpoint in endpoints:
        if not isinstance(endpoint, dict):
            continue
        if not is_standard_endpoint(endpoint) or not is_official_endpoint(endpoint, author):
            continue
        latency_ms = percentile_p50(endpoint.get("latency_last_30m"))
        throughput = percentile_p50(endpoint.get("throughput_last_30m"))
        considered.append(
            {
                "provider_name": endpoint.get("provider_name"),
                "tag": endpoint.get("tag"),
                "service_tier": endpoint.get("service_tier"),
                "latency_p50_ms": latency_ms,
                "throughput_p50": throughput,
            }
        )
        latency = as_decimal(latency_ms)
        if latency is not None:
            latencies.append(latency / Decimal(1000))
        throughput_value = as_decimal(throughput)
        if throughput_value is not None:
            throughputs.append(throughput_value)
    if not considered:
        return None
    latency = median_decimal(latencies)
    throughput = median_decimal(throughputs)
    providers = []
    for item in considered:
        name = item.get("provider_name")
        if isinstance(name, str) and name not in providers:
            providers.append(name)
    return {
        "provider_names": providers,
        "latency_s": json_number(latency) if latency is not None else None,
        "throughput_tps": json_number(throughput) if throughput is not None else None,
        "endpoints_considered": considered,
    }


def matched_slugs(aa_items: list, catalog: list[tuple[str, str]]) -> dict[str, list[str]]:
    """OpenRouter id -> AA slugs that have an intelligence index and matched it."""
    grouped: dict[str, list[str]] = {}
    for item in aa_items:
        if not isinstance(item, dict):
            continue
        score = item.get("intelligence_index")
        slug = item.get("slug")
        if isinstance(score, bool) or not isinstance(score, (int, float)) or not isinstance(slug, str):
            continue
        ident = match_openrouter_slug(slug, catalog)
        if ident is None:
            continue
        grouped.setdefault(ident, []).append(slug)
    return grouped


def skipped_payload() -> dict:
    return {
        "skipped": True,
        "ok": False,
        "source": "OpenRouter",
        "file": FILE_NAME,
        "reason": "未设置 OPENROUTER_API_KEY",
        "rank_metric": SPEED_METRIC,
        "rank_source": SPEED_SOURCE,
        "items": [],
    }


def endpoint_url(model_id: str) -> str:
    return f"{ORIGIN}/api/v1/models/{model_id}/endpoints"


def fetch_page(fetch, url: str, key: str, timeout: int, attempts: int = MAX_ATTEMPTS, sleep=time.sleep):
    status, payload, error = 0, None, "no attempt"
    for attempt in range(1, attempts + 1):
        status, payload, error = fetch(url, key, timeout)
        retry = status == 0 or status in {408, 429, 500, 502, 503, 504} or (
            isinstance(error, str) and error.startswith("JSONDecodeError")
        )
        if error is None and status == 200 and isinstance(payload, dict):
            return status, payload, None
        if not retry or attempt == attempts:
            return status, payload, error
        sleep(min(8.0, 0.5 * (2 ** (attempt - 1))))
    return status, payload, error


def collect(fetch, key: str, timeout: int, aa_items: list, *, attempts: int = MAX_ATTEMPTS, sleep=time.sleep) -> dict:
    status, payload, error = fetch_page(fetch, MODELS_URL, "", timeout, attempts=attempts, sleep=sleep)
    base = {
        "skipped": False,
        "source": "OpenRouter",
        "file": FILE_NAME,
        "models_endpoint": MODELS_URL,
        "endpoints_endpoint": f"{ORIGIN}/api/v1/models/{{id}}/endpoints",
        "window": "last_30m",
        "stat": "p50",
        "latency_unit": "seconds (OpenRouter latency_last_30m.p50 milliseconds / 1000)",
        "throughput_unit": "tokens/s (OpenRouter throughput_last_30m.p50)",
        "rank_metric": SPEED_METRIC,
        "rank_source": SPEED_SOURCE,
        "rule": "official standard; exclude tag segments flex/priority/fast/ultrafast; median of official standard endpoints",
        "fetched_at": fetched_at_shanghai(),
        "items": [],
    }
    if error or status != 200:
        base["ok"] = False
        base["error"] = failure_message(status, payload, error, key)
        return base
    rows = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        base["ok"] = False
        base["error"] = "模型目录没有 data"
        return base
    catalog = plain_models(rows)
    groups = matched_slugs(aa_items, catalog)
    items = []
    for model_id in sorted(groups):
        author = model_id.split("/", 1)[0]
        url = endpoint_url(model_id)
        status, page, error = fetch_page(fetch, url, key, timeout, attempts=attempts, sleep=sleep)
        if error or status != 200 or not isinstance(page, dict):
            base["ok"] = False
            base["error"] = f"{model_id}: {failure_message(status, page, error, key)}"
            base["items"] = []
            return base
        data = page.get("data") if isinstance(page.get("data"), dict) else page
        endpoints = data.get("endpoints") if isinstance(data, dict) else None
        if not isinstance(endpoints, list):
            base["ok"] = False
            base["error"] = f"{model_id}: 端点响应没有 endpoints"
            base["items"] = []
            return base
        summary = summarize_endpoints(endpoints, author)
        item = {
            "openrouter_slug": model_id,
            "aa_slugs": sorted(groups[model_id]),
            "latency_s": None,
            "throughput_tps": None,
            "provider_names": [],
            "endpoints_considered": [],
            "rank": None,
            "rank_of": None,
            "rank_metric": SPEED_METRIC,
            "rank_source": SPEED_SOURCE,
        }
        if summary:
            item.update(summary)
        items.append(item)
    ranks = speed_ranks(items)
    for item in items:
        info = ranks.get(item["openrouter_slug"])
        if not info:
            continue
        item["rank"] = info["rank"]
        item["rank_of"] = info["rank_of"]
    base["ok"] = True
    base["matched_models"] = len(items)
    base["ranked_models"] = len(ranks)
    base["items"] = items
    return base


def emit(payload: dict, out_path: str | None, pretty: bool) -> None:
    if pretty:
        text = json.dumps(payload, ensure_ascii=False, indent=2)
    else:
        text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if out_path:
        Path(out_path).write_text(text + "\n", encoding="utf-8")
    else:
        sys.stdout.write(text)
        sys.stdout.write("\n")


def main(argv: list[str] | None = None, *, fetch=None) -> int:
    fetch = fetch or fetch_json
    parser = argparse.ArgumentParser(description="Fetch OpenRouter official standard endpoints for speed ranks.")
    parser.add_argument("--aa", required=True, help="aa-language-models.json")
    parser.add_argument("--out", help="写入 openrouter-official-endpoints.json。默认 stdout")
    parser.add_argument("--pretty", action="store_true")
    parser.add_argument("--timeout", type=int, default=40)
    args = parser.parse_args(argv)
    key = api_key()
    if not key:
        emit(skipped_payload(), args.out, args.pretty)
        print("skip: no OPENROUTER_API_KEY", file=sys.stderr)
        return 0
    aa_payload = json.loads(Path(args.aa).read_text(encoding="utf-8"))
    items = aa_payload.get("items") if isinstance(aa_payload, dict) else None
    if not isinstance(items, list):
        print("error: AA 快照没有 items", file=sys.stderr)
        return 1
    payload = collect(fetch, key, args.timeout, items)
    text = json.dumps(payload, ensure_ascii=False)
    if key and key in text:
        payload = json.loads(redact(text, key))
    emit(payload, args.out, args.pretty)
    if not payload.get("ok"):
        print(f"error: {payload.get('error')}", file=sys.stderr)
        return 1
    print(
        f"ok matched={payload.get('matched_models')} ranked={payload.get('ranked_models')}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
