"""校验 summary/models 的卡片和只含绘图数据的榜单。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import collect_items, read_json, require_board_dir, source_file  # noqa: E402


def validate(issue: Path, gaps: list[dict]) -> tuple[list[str], dict, list[str], set[str]]:
    errors, cards = collect_items(
        issue,
        "summary",
        "models",
        "schemas/summary/models/item.schema.json",
        source_prefix="cleaned/",
        source_id=True,
    )
    board_errors, boards = require_board_dir(
        issue / "summary",
        "summary",
        "models/boards",
        "models/boards",
        "schemas/summary/models/board.schema.json",
        gaps,
    )
    errors.extend(board_errors)
    board_ids: list[str] = []
    item_ids: set[str] = set()
    for path, data in boards:
        rel = path.relative_to(issue).as_posix()
        board_id = data.get("id")
        if isinstance(board_id, str):
            board_ids.append(board_id)
        source = data.get("source")
        if not isinstance(source, str) or not source.split("#", 1)[0].startswith("cleaned/models/"):
            errors.append(f"{rel} 的 source 必须回指 cleaned/models/")
        else:
            upstream, source_error = source_file(issue, source)
            if source_error:
                errors.append(f"{rel}: {source_error}")
            elif upstream is not None:
                try:
                    previous = read_json(upstream)
                except ValueError as exc:
                    errors.append(f"{rel}: {exc}")
                else:
                    if not isinstance(previous, dict) or previous.get("id") != board_id:
                        errors.append(f"{rel} 的 source 对不上上一阶段里 ID 为 {board_id} 的榜单")
        for item in data.get("items") or []:
            if isinstance(item, dict) and isinstance(item.get("id"), str):
                item_ids.add(item["id"])
    return errors, cards, board_ids, item_ids
