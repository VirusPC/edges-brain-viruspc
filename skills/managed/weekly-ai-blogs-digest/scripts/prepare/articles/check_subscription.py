#!/usr/bin/env python3
"""核对 OPML 和 meta 是否对齐。不访问网络。"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from prepare.articles.feedlib import DEFAULT_META, DEFAULT_OPML, check_pair, load_meta, load_opml  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="核对 OPML 与 meta 是否对齐，不访问网络")
    parser.add_argument("--opml", type=Path, default=DEFAULT_OPML)
    parser.add_argument("--meta", type=Path, default=DEFAULT_META)
    args = parser.parse_args(argv)
    feeds = load_opml(args.opml)
    meta = load_meta(args.meta)
    errors = check_pair(feeds, meta)
    if errors:
        for err in errors:
            print(err, file=sys.stderr)
        return 1
    print(f"ok feeds={len(feeds)} sources={len(meta['sources'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
