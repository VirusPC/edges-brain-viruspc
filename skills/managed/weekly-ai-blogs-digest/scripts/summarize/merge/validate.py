"""三路展示内容汇合：目录都在，ID 不互相覆盖。汇合不另建目录，也不写 cleaned。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import gaps_for_lane, print_result  # noqa: E402


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


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/summarize/merge/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    issue = Path(argv[0])
    from summarize.articles.validate import validate as validate_articles
    from summarize.models.validate import validate as validate_models
    from summarize.projects.validate import validate as validate_projects

    gaps, gap_errors = gaps_for_lane(issue, "summary")
    article_errors, articles = validate_articles(issue)
    project_errors, projects = validate_projects(issue)
    model_errors, models, _boards, board_items = validate_models(issue, gaps)
    overlap = validate(set(articles), set(projects), set(models), set(board_items))
    return print_result(gap_errors + article_errors + project_errors + model_errors + overlap, "ok summary/merge")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
