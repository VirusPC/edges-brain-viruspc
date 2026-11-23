"""校验 summary/keywords.json。每个目标 ID 必须已经在三路展示内容里。"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import check_document, gap_covers, gaps_for_lane, print_result  # noqa: E402


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


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/summarize/keywords/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    issue = Path(argv[0])
    gaps, gap_errors = gaps_for_lane(issue, "summary")
    from summarize.articles.validate import validate as validate_articles
    from summarize.models.validate import validate as validate_models
    from summarize.projects.validate import validate as validate_projects

    article_errors, articles = validate_articles(issue)
    project_errors, projects = validate_projects(issue)
    model_errors, models, _boards, board_items = validate_models(issue, gaps)
    known = set(articles) | set(projects) | set(models) | set(board_items)
    keyword_errors, _present = validate(issue, gaps, known)
    return print_result(gap_errors + article_errors + project_errors + model_errors + keyword_errors, "ok summary/keywords")


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
