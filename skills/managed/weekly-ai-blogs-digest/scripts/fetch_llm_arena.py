#!/usr/bin/env python3
"""Pull LLM Arena overall rankings from a Hugging Face dataset.

This is not an OPML subscription and not a public REST API. No API key.
License of the dataset is CC-BY-4.0. Cite the dataset, not a scraped arena.ai page.

Dataset: lmarena-ai/leaderboard-dataset
Default config: text_style_control (override with --config text)

Parquet files on the dataset repo (one file per config):

    latest  {config}/latest-00000-of-00001.parquet
            only the newest leaderboard_publish_date
    full    {config}/full-00000-of-00001.parquet
            every historical publish date in one file

The 2026-11 backfill of older weekly issues used the full file.
``--until YYYY-MM-DD`` reads ``full`` and keeps the latest publish date
that is still on or before that day. Omitting ``--until`` reads ``latest``.

    https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/resolve/main/{config}/{split}-00000-of-00001.parquet

Needs pyarrow (``pip install -r scripts/requirements-leaderboard.txt``).
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import urllib.request

DATASET = "lmarena-ai/leaderboard-dataset"
DEFAULT_CONFIG = "text_style_control"
LATEST_SPLIT = "latest"
FULL_SPLIT = "full"
PARQUET = (
    "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/"
    "resolve/main/{config}/{split}-00000-of-00001.parquet"
)
ATTRIBUTION = (
    "LLM Arena rankings from the Hugging Face dataset "
    "lmarena-ai/leaderboard-dataset (CC-BY-4.0). Not an RSS/OPML feed. "
    "Historical boards are the full parquet "
    "({config}/full-00000-of-00001.parquet), not the latest split."
)
USER_AGENT = "edges-weekly-ai-blogs-digest/1.0 (+https://github.com/VirusPC/edges-brain-viruspc)"


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


def download(url: str, timeout: int) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def number(value):
    if value is None:
        return None
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


def as_iso_date(value) -> str | None:
    """Normalize a parquet date/datetime/string to YYYY-MM-DD."""
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        text = value.isoformat()
    else:
        text = str(value).strip()
    if len(text) >= 10 and text[4] == "-" and text[7] == "-":
        day = text[:10]
        if day[0:4].isdigit() and day[5:7].isdigit() and day[8:10].isdigit():
            return day
    return None


def rows_from_parquet(payload: bytes, category: str) -> list[dict]:
    try:
        import pyarrow.parquet as pq
    except ImportError as exc:
        raise SystemExit(
            "缺少 pyarrow。先执行: pip install -r scripts/requirements-leaderboard.txt"
        ) from exc
    table = pq.read_table(io.BytesIO(payload))
    data = table.to_pylist()
    picked = []
    for row in data:
        if (row.get("category") or "") != category:
            continue
        score = row.get("rating")
        if score is None:
            score = row.get("score")
        votes = row.get("vote_count")
        if votes is None:
            votes = row.get("observation_count")
        if isinstance(votes, float) and votes.is_integer():
            votes = int(votes)
        rank = row.get("rank")
        try:
            rank_num = int(rank) if rank is not None and float(rank) == int(float(rank)) else rank
        except (TypeError, ValueError):
            rank_num = rank
        picked.append(
            {
                "rank": rank_num,
                "model": row.get("model_name"),
                "organization": row.get("organization"),
                "score": number(score),
                "votes": votes if isinstance(votes, int) else number(votes),
                "leaderboard_publish_date": as_iso_date(row.get("leaderboard_publish_date")),
            }
        )
    return picked


def neighbor_dates(dates: list[str], chosen: str) -> tuple[str | None, str | None]:
    unique = sorted(set(dates))
    prior = next((day for day in reversed(unique) if day < chosen), None)
    nxt = next((day for day in unique if day > chosen), None)
    return prior, nxt


def choose_publish_date(dates: list[str], until: str | None) -> str | None:
    """Latest publish date. With until, the latest date that is still <= until."""
    unique = sorted({day for day in dates if day})
    if not unique:
        return None
    if until is None:
        return unique[-1]
    eligible = [day for day in unique if day <= until]
    if not eligible:
        return None
    return eligible[-1]


def select_rows(rows: list[dict], until: str | None, limit: int) -> dict:
    dates = [row["leaderboard_publish_date"] for row in rows if row.get("leaderboard_publish_date")]
    chosen = choose_publish_date(dates, until)
    if chosen is None:
        return {"chosen": None, "prior": None, "next": None, "items": [], "rows": 0}
    prior, nxt = neighbor_dates(dates, chosen)
    kept = [row for row in rows if row.get("leaderboard_publish_date") == chosen]
    kept.sort(key=lambda item: (item["rank"] is None, item["rank"] if item["rank"] is not None else 10**9))
    total = len(kept)
    if limit > 0:
        kept = kept[:limit]
    return {"chosen": chosen, "prior": prior, "next": nxt, "items": kept, "rows": total}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch LLM Arena overall rankings from Hugging Face.")
    parser.add_argument("--config", default=DEFAULT_CONFIG, choices=("text_style_control", "text"))
    parser.add_argument("--category", default="overall")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument(
        "--until",
        metavar="YYYY-MM-DD",
        help="取 leaderboard_publish_date ≤ 该日的最近一份。读 full parquet，不读 latest。",
    )
    parser.add_argument("--out")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)
    if args.until is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.until):
        print("--until 必须是 YYYY-MM-DD", file=sys.stderr)
        return 1
    split = FULL_SPLIT if args.until else LATEST_SPLIT
    url = PARQUET.format(config=args.config, split=split)
    try:
        payload = download(url, args.timeout)
        rows = rows_from_parquet(payload, args.category)
        selected = select_rows(rows, args.until, args.limit)
    except SystemExit as exc:
        print(exc, file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        print(f"parquet: {url}", file=sys.stderr)
        return 1
    if selected["chosen"] is None:
        if args.until:
            print(f"full parquet 里没有 publish_date ≤ {args.until} 的 {args.category} 榜。parquet: {url}", file=sys.stderr)
        else:
            print(f"parquet 里没有 {args.category} 榜。parquet: {url}", file=sys.stderr)
        return 1
    result = {
        "source": "Hugging Face dataset",
        "dataset": DATASET,
        "config": args.config,
        "split": split,
        "category": args.category,
        "opml": False,
        "until": args.until,
        "leaderboard_publish_date": selected["chosen"],
        "prior_publish_date": selected["prior"],
        "next_publish_date": selected["next"],
        "attribution": ATTRIBUTION.format(config=args.config),
        "parquet": url,
        "rows": selected["rows"],
        "items": selected["items"],
    }
    emit(result, args.out, args.pretty)
    print(
        f"ok config={args.config} split={split} category={args.category} rows={selected['rows']} "
        f"kept={len(selected['items'])} date={selected['chosen']} "
        f"prior={selected['prior']} next={selected['next']} until={args.until or '-'}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    # pyarrow 17 在 NumPy 1.26 上会在解释器退出时 abort。结果已经写完，直接结束进程。
    import os
    os._exit(main())
