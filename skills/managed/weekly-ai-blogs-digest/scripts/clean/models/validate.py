"""校验 cleaned/models 的模型事实和榜单数字。榜单不含 GitHub 项目。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import align_index, gaps_for_lane, print_result, require_board_dir  # noqa: E402


def validate(issue: Path, gaps: list[dict]) -> list[str]:
    errors, _items = align_index(
        issue,
        "cleaned",
        "models",
        "schemas/cleaned/models/index.schema.json",
        "schemas/cleaned/models/item.schema.json",
        gaps,
        source_prefix="raw/",
        name_is_id=True,
    )
    board_errors, _boards = require_board_dir(
        issue / "cleaned",
        "cleaned",
        "models/boards",
        "models/boards",
        "schemas/cleaned/models/board.schema.json",
        gaps,
    )
    errors.extend(board_errors)
    for path, data in _boards:
        rel = path.relative_to(issue).as_posix()
        source = data.get("source")
        if not isinstance(source, str) or not source.split("#", 1)[0].startswith("raw/models/"):
            errors.append(f"{rel} 的 source 必须回指 raw/models/")
    return errors


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/clean/models/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    issue = Path(argv[0])
    gaps, gap_errors = gaps_for_lane(issue, "cleaned")
    return print_result(gap_errors + validate(issue, gaps), "ok cleaned/models")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
