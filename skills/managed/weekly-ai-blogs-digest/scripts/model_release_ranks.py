#!/usr/bin/env python3
"""Attach price and speed ranks to a model-releases snapshot.

Price uses the same Artificial Analysis file as the intelligence rank.
The blend is (input + 3 * output) / 4 on AA list prices. Cheaper ranks
higher. The denominator is models in that file that have both an
intelligence index and both list prices. Competition rank: ties share a
place and the next place skips.

Speed uses the OpenRouter official-endpoint catalog
(openrouter-official-endpoints.json). Lower latency p50 ranks higher.
That is the same latency the card already shows. A missing catalog, or a
model the catalog did not rank, leaves rank null.

This does not change price numbers, speed numbers, or the intelligence
rank already stored on the model.
"""

from __future__ import annotations

import argparse
import copy
import json
import math
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path

PRICE_METRIC = "blended_input_plus_3_output_over_4"
PRICE_SOURCE = "artificial_analysis"
SPEED_METRIC = "latency_p50_s"
SPEED_SOURCE = "openrouter_official_standard"
RANK_KEYS = ("rank", "rank_of", "rank_metric", "rank_source", "rank_value", "rank_variant")


def is_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def as_decimal(value: object) -> Decimal | None:
    if isinstance(value, bool) or isinstance(value, float) and not math.isfinite(value):
        return None
    if not isinstance(value, (int, float, str, Decimal)):
        return None
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None
    if not number.is_finite():
        return None
    return number


def json_number(number: Decimal) -> int | float:
    text = format(number, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    if text in {"", "-"}:
        text = "0"
    return json.loads(text)


def blended_price(input_price: object, output_price: object) -> Decimal | None:
    """(input + 3 * output) / 4. None when either list price is missing."""
    incoming = as_decimal(input_price)
    outgoing = as_decimal(output_price)
    if incoming is None or outgoing is None:
        return None
    return (incoming + (Decimal(3) * outgoing)) / Decimal(4)


def competition_ranks(rows: list[dict], value_of, identity_of) -> dict[str, dict]:
    """Lower value ranks first. Equal values share a rank; the next rank skips."""
    usable = []
    for row in rows:
        value = value_of(row)
        identity = identity_of(row)
        if value is None or not identity:
            continue
        usable.append((value, str(identity), row))
    usable.sort(key=lambda item: (item[0], item[1]))
    ranked: dict[str, dict] = {}
    index = 0
    while index < len(usable):
        end = index + 1
        while end < len(usable) and usable[end][0] == usable[index][0]:
            end += 1
        place = index + 1
        for cursor in range(index, end):
            _value, identity, row = usable[cursor]
            ranked[identity] = {
                "rank": place,
                "rank_of": len(usable),
                "row": row,
                "value": usable[cursor][0],
            }
        index = end
    return ranked


def price_ranks(items: list) -> dict[str, dict]:
    universe = []
    for item in items:
        if not isinstance(item, dict) or not is_number(item.get("intelligence_index")):
            continue
        blend = blended_price(item.get("price_1m_input_tokens"), item.get("price_1m_output_tokens"))
        slug = item.get("slug")
        if blend is None or not isinstance(slug, str) or not slug:
            continue
        universe.append(item)
    ranked = competition_ranks(
        universe,
        lambda item: blended_price(item.get("price_1m_input_tokens"), item.get("price_1m_output_tokens")),
        lambda item: item.get("slug"),
    )
    table = {}
    for slug, info in ranked.items():
        row = info["row"]
        table[slug] = {
            "rank": info["rank"],
            "rank_of": info["rank_of"],
            "rank_metric": PRICE_METRIC,
            "rank_source": PRICE_SOURCE,
            "rank_value": json_number(info["value"]),
            "rank_variant": row.get("name"),
            "aa_slug": slug,
        }
    return table


def speed_ranks(items: list) -> dict[str, dict]:
    universe = []
    for item in items or []:
        if not isinstance(item, dict):
            continue
        latency = as_decimal(item.get("latency_s"))
        slug = item.get("openrouter_slug")
        if latency is None or not isinstance(slug, str) or not slug:
            continue
        universe.append(item)
    ranked = competition_ranks(
        universe,
        lambda item: as_decimal(item.get("latency_s")),
        lambda item: item.get("openrouter_slug"),
    )
    table = {}
    for slug, info in ranked.items():
        table[slug] = {
            "rank": info["rank"],
            "rank_of": info["rank_of"],
            "rank_metric": SPEED_METRIC,
            "rank_source": SPEED_SOURCE,
            "rank_value": json_number(info["value"]),
            "openrouter_slug": slug,
        }
    return table


def _without_rank_keys(payload: dict) -> dict:
    return {key: value for key, value in payload.items() if key not in RANK_KEYS}


def _attach(payload: dict | None, fields: dict) -> dict | None:
    if not isinstance(payload, dict):
        return payload
    cleaned = _without_rank_keys(payload)
    cleaned.update(fields)
    return cleaned


def annotate_model(model: dict, prices: dict[str, dict], speeds: dict[str, dict]) -> dict:
    updated = copy.deepcopy(model)
    aa = updated.get("aa") if isinstance(updated.get("aa"), dict) else {}
    aa_slug = aa.get("aa_slug") if isinstance(aa.get("aa_slug"), str) else ""
    price_info = prices.get(aa_slug)
    if isinstance(updated.get("price"), dict):
        if price_info:
            fields = {
                "rank": price_info["rank"],
                "rank_of": price_info["rank_of"],
                "rank_metric": PRICE_METRIC,
                "rank_source": PRICE_SOURCE,
                "rank_value": price_info["rank_value"],
                "rank_variant": price_info["rank_variant"],
            }
        else:
            fields = {
                "rank": None,
                "rank_of": None,
                "rank_metric": PRICE_METRIC,
                "rank_source": PRICE_SOURCE,
            }
        updated["price"] = _attach(updated["price"], fields)
    slug = updated.get("openrouter_slug") if isinstance(updated.get("openrouter_slug"), str) else ""
    speed_info = speeds.get(slug)
    if isinstance(updated.get("speed"), dict):
        if speed_info:
            fields = {
                "rank": speed_info["rank"],
                "rank_of": speed_info["rank_of"],
                "rank_metric": SPEED_METRIC,
                "rank_source": SPEED_SOURCE,
            }
        else:
            fields = {
                "rank": None,
                "rank_of": None,
                "rank_metric": SPEED_METRIC,
                "rank_source": SPEED_SOURCE,
            }
        updated["speed"] = _attach(updated["speed"], fields)
    return updated


def annotate_releases(payload: dict, aa_items: list, endpoint_items: list | None) -> dict:
    prices = price_ranks(aa_items)
    speeds = speed_ranks(endpoint_items or [])
    updated = copy.deepcopy(payload)
    models = updated.get("models")
    if isinstance(models, list):
        updated["models"] = [
            annotate_model(model, prices, speeds) if isinstance(model, dict) else model for model in models
        ]
    return updated


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def endpoint_items(payload: dict | None) -> list:
    if not isinstance(payload, dict) or payload.get("skipped") or not payload.get("ok"):
        return []
    items = payload.get("items")
    return items if isinstance(items, list) else []


def aa_items(payload: dict) -> list:
    items = payload.get("items")
    return items if isinstance(items, list) else []


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Write price and speed ranks into model-releases.json.")
    parser.add_argument("--aa", required=True, help="aa-language-models.json")
    parser.add_argument("--releases", required=True, help="model-releases.json to annotate")
    parser.add_argument("--endpoints", help="openrouter-official-endpoints.json；没有或 skipped 时速度排名为 null")
    parser.add_argument("--out", help="写入路径。默认覆盖 --releases")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)
    aa_path = Path(args.aa)
    releases_path = Path(args.releases)
    aa_payload = load_json(aa_path)
    releases = load_json(releases_path)
    endpoints = None
    if args.endpoints:
        endpoint_path = Path(args.endpoints)
        if endpoint_path.exists():
            endpoints = load_json(endpoint_path)
        else:
            print(f"warn: 没有端点目录 {endpoint_path}，速度排名为 null", file=sys.stderr)
    if isinstance(endpoints, dict) and (endpoints.get("skipped") or not endpoints.get("ok")):
        reason = endpoints.get("reason") or endpoints.get("error") or "端点目录不可用"
        print(f"warn: 速度排名为 null（{reason}）", file=sys.stderr)
    annotated = annotate_releases(releases, aa_items(aa_payload), endpoint_items(endpoints))
    if args.pretty:
        text = json.dumps(annotated, ensure_ascii=False, indent=2)
    else:
        text = json.dumps(annotated, ensure_ascii=False, separators=(",", ":"))
    dest = Path(args.out) if args.out else releases_path
    dest.write_text(text + "\n", encoding="utf-8")
    priced = sum(
        1
        for model in annotated.get("models") or []
        if isinstance(model, dict) and isinstance(model.get("price"), dict) and model["price"].get("rank")
    )
    sped = sum(
        1
        for model in annotated.get("models") or []
        if isinstance(model, dict) and isinstance(model.get("speed"), dict) and model["speed"].get("rank")
    )
    print(f"ok price_ranked={priced} speed_ranked={sped}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
