"""三路展示内容汇合：目录都在，ID 不互相覆盖。汇合不另建目录。"""

from __future__ import annotations


def validate(article_ids: set[str], project_ids: set[str], model_ids: set[str], board_item_ids: set[str]) -> list[str]:
    owners = {
        "summary/articles": article_ids,
        "summary/projects": project_ids,
        "summary/models": model_ids,
        "summary/models/boards 条目": board_item_ids,
    }
    seen: dict[str, str] = {}
    errors: list[str] = []
    for place, ids in owners.items():
        for item_id in sorted(ids):
            if item_id in seen:
                errors.append(f"ID {item_id} 同时出现在 {seen[item_id]} 和 {place}")
            else:
                seen[item_id] = place
    return errors
