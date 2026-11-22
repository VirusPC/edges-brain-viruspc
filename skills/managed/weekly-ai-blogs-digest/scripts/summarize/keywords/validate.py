"""校验 summary/keywords.json。每个目标 ID 必须已经在三路展示内容里。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import check_document, gap_covers  # noqa: E402


def validate(issue: Path, gaps: list[dict], known_ids: set[str]) -> tuple[list[str], bool]:
    path = issue / "summary" / "keywords.json"
    if not path.is_file():
        if gap_covers(gaps, "keywords.json"):
            return [], False
        return ["summary/keywords.json 缺失，summary/gaps.json 里也没有 path 为 keywords.json 的缺口"], False
    errors, data = check_document(path, "summary/keywords.json", "schemas/summary/keywords.schema.json")
    if errors or not isinstance(data, dict):
        return errors, False
    words = data.get("keywords") or []
    if not words:
        if gap_covers(gaps, "keywords.json"):
            return [], False
        return ["summary/keywords.json 没有词，summary/gaps.json 里也没有 path 为 keywords.json 的缺口"], False
    if gap_covers(gaps, "keywords.json"):
        return ["summary/keywords.json 已有词，不能再用 keywords.json 缺口代替这一章"], True
    for item in words:
        name = item.get("name")
        for target in item.get("targets") or []:
            if target not in known_ids:
                errors.append(f"summary/keywords.json 的「{name}」指向不存在的 ID {target}")
    return errors, True
