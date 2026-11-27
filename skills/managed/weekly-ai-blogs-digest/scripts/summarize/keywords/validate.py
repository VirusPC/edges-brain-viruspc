"""校验 summary/keywords.json。每个目标 ID 必须已经在三路展示内容里。

记录版本 >= 0.0.9 的主线 tag 必须出现在这份词表里。仍锁在 0.0.8 的 overview 没有 tag，不因此失败。
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import check_document, gap_covers, gaps_for_lane, print_result, version_reached  # noqa: E402
from summarize.overview.validate import NO_MODEL, TAG_SINCE, THEME_TAG_WEIGHT  # noqa: E402


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
    errors.extend(_theme_tag_errors(issue, words))
    return errors, True


def _theme_tag_errors(issue: Path, words: list) -> list[str]:
    overview = _overview(issue)
    if overview is None:
        return []
    skill = overview.get("skill") if isinstance(overview.get("skill"), dict) else {}
    recorded = skill.get("version") if isinstance(skill.get("version"), str) else None
    if not version_reached(recorded, TAG_SINCE):
        return []
    errors: list[str] = []
    themes = overview.get("themes") if isinstance(overview.get("themes"), list) else []
    for index, theme in enumerate(themes, start=1):
        if not isinstance(theme, dict):
            continue
        tag = theme.get("tag")
        if not isinstance(tag, str) or tag != tag.strip() or not tag:
            continue
        refs = theme.get("refs") if isinstance(theme.get("refs"), list) else []
        text = theme.get("text") if isinstance(theme.get("text"), str) else ""
        if text == NO_MODEL and not refs:
            continue
        match = _keyword_named(words, tag)
        if match is None:
            errors.append(f"summary/keywords.json 缺少主线 tag「{tag}」")
            continue
        weight = match.get("weight")
        if isinstance(weight, bool) or not isinstance(weight, (int, float)) or float(weight) < THEME_TAG_WEIGHT:
            errors.append(
                f"summary/keywords.json 的「{tag}」权重 {weight} 低于主线 tag 下限 {THEME_TAG_WEIGHT}"
            )
        targets = match.get("targets") if isinstance(match.get("targets"), list) else []
        for ref in refs:
            if not isinstance(ref, dict) or not isinstance(ref.get("id"), str):
                continue
            if ref["id"] not in targets:
                errors.append(f"summary/keywords.json 的「{tag}」targets 没有盖住 {ref['id']}")
    return errors


def _overview(issue: Path) -> dict | None:
    path = issue / "summary" / "overview.json"
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _keyword_named(words: list, tag: str) -> dict | None:
    folded = tag.casefold()
    for item in words:
        if not isinstance(item, dict) or not isinstance(item.get("name"), str):
            continue
        if item["name"].strip().casefold() == folded:
            return item
    return None


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
