"""校验 cleaned/projects。ID 是仓库地址，来源回指 raw/。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import align_index, gaps_for_lane, print_result  # noqa: E402

REPO_ID = r"https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+"


def validate(issue: Path, gaps: list[dict]) -> list[str]:
    errors, _items = align_index(
        issue,
        "cleaned",
        "projects",
        "schemas/cleaned/projects/index.schema.json",
        "schemas/cleaned/projects/item.schema.json",
        gaps,
        source_prefix="raw/",
        id_pattern=REPO_ID,
    )
    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/clean/projects/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    issue = Path(argv[0])
    gaps, gap_errors = gaps_for_lane(issue, "cleaned")
    return print_result(gap_errors + validate(issue, gaps), "ok cleaned/projects")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
