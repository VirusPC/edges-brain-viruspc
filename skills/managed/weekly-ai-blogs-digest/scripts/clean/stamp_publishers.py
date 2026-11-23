#!/usr/bin/env python3
"""把 OPML 上的发布方、分类和网站写进 cleaned 的一路条目。

汇合阶段只读这些字段。本脚本按 --lane 只写那一路，方便三路并行。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from summarize.merge.sources import stamp_map  # noqa: E402

LANES = ("articles", "projects", "models")


def write_fields(path: Path, data: dict, info: dict) -> None:
    out = {}
    for key, value in data.items():
        if key in ("publisher", "category", "url"):
            continue
        out[key] = value
        if key == "source":
            out["publisher"] = info["publisher"]
            out["category"] = info["category"]
            out["url"] = info["url"]
    if "publisher" not in out:
        out["publisher"] = info["publisher"]
        out["category"] = info["category"]
        out["url"] = info["url"]
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def stamp_lane(issue: Path, lane: str) -> list[str]:
    if lane not in LANES:
        return [f"lane 只能是 {'、'.join(LANES)}"]
    mapping, errors = stamp_map(issue, lanes=(lane,))
    if errors:
        return errors
    issue = Path(issue)
    for rel, info in mapping.items():
        path = issue / rel
        data = json.loads(path.read_text(encoding="utf-8"))
        write_fields(path, data, info)
    return []


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="给 cleaned 的一路写入发布方")
    parser.add_argument("issue")
    parser.add_argument("--lane", required=True, choices=LANES)
    args = parser.parse_args(argv)
    errors = stamp_lane(Path(args.issue), args.lane)
    if errors:
        for item in errors:
            print(item, file=sys.stderr)
        return 1
    print(f"ok cleaned/{args.lane}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
