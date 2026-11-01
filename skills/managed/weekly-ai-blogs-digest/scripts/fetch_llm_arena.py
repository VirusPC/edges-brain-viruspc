#!/usr/bin/env python3
"""Pull the latest LLM Arena overall ranking from a Hugging Face dataset.

This is not an OPML subscription and not a public REST API. Source:

    dataset: lmarena-ai/leaderboard-dataset
    config:  text_style_control (override with --config text)
    split:   latest
    category: overall

No API key. Needs pyarrow (``pip install -r scripts/requirements-leaderboard.txt``).
License of the dataset is CC-BY-4.0. Cite the dataset, not a scraped arena.ai page.
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import urllib.request

DATASET = "lmarena-ai/leaderboard-dataset"
DEFAULT_CONFIG = "text_style_control"
PARQUET = (
    "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset/"
    "resolve/main/{config}/latest-00000-of-00001.parquet"
)
ATTRIBUTION = (
    "LLM Arena rankings from the Hugging Face dataset "
    "lmarena-ai/leaderboard-dataset (CC-BY-4.0). Not an RSS/OPML feed."
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
                "leaderboard_publish_date": row.get("leaderboard_publish_date"),
            }
        )
    picked.sort(key=lambda item: (item["rank"] is None, item["rank"] if item["rank"] is not None else 10**9))
    return picked


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch LLM Arena overall rankings from Hugging Face.")
    parser.add_argument("--config", default=DEFAULT_CONFIG, choices=("text_style_control", "text"))
    parser.add_argument("--category", default="overall")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--out")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args(argv)
    url = PARQUET.format(config=args.config)
    try:
        payload = download(url, args.timeout)
        rows = rows_from_parquet(payload, args.category)
    except SystemExit as exc:
        print(exc, file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    publish_dates = sorted({row["leaderboard_publish_date"] for row in rows if row.get("leaderboard_publish_date")})
    kept = rows[: args.limit] if args.limit > 0 else rows
    result = {
        "source": "Hugging Face dataset",
        "dataset": DATASET,
        "config": args.config,
        "split": "latest",
        "category": args.category,
        "opml": False,
        "leaderboard_publish_date": publish_dates[-1] if publish_dates else None,
        "attribution": ATTRIBUTION,
        "parquet": url,
        "rows": len(rows),
        "items": kept,
    }
    emit(result, args.out, args.pretty)
    print(
        f"ok config={args.config} category={args.category} rows={len(rows)} kept={len(kept)} "
        f"date={result['leaderboard_publish_date']}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    # pyarrow 17 在 NumPy 1.26 上会在解释器退出时 abort。结果已经写完，直接结束进程。
    import os
    os._exit(main())
