#!/usr/bin/env python3
"""整页校验。清洗校验通过、三路和关键词都对齐之后，这一期 summary 才可交给博客。"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from clean.check.validate import validate as validate_clean  # noqa: E402
from lib.issue import check_document, check_stage_file, load_gaps  # noqa: E402
from summarize.articles.validate import validate as validate_articles  # noqa: E402
from summarize.keywords.validate import validate as validate_keywords  # noqa: E402
from summarize.merge.article_coverage import article_coverage, cleaned_article_count  # noqa: E402
from summarize.merge.sources import CATEGORIES, sources_document, stamp_map  # noqa: E402
from summarize.merge.validate import validate as validate_merge  # noqa: E402
from summarize.merge.write_index import skill_version  # noqa: E402
from summarize.models.validate import validate as validate_models  # noqa: E402
from summarize.projects.validate import validate as validate_projects  # noqa: E402

CHAPTERS = ["本周关键词", "模型进展", "项目开源", "精选文章", "精选推文", "精选播客"]
GROUP_ORDER = ["国内模型厂", "国外模型厂", "国内非模型厂", "国外非模型厂"]


def validate(issue: Path) -> list[str]:
    issue = Path(issue)
    clean_errors = validate_clean(issue)
    if clean_errors:
        return ["清洗校验未通过，不能进入总结", *clean_errors]
    summary = issue / "summary"
    if not summary.is_dir():
        return ["summary/ 缺失"]
    errors = check_stage_file(issue, "summary")
    gaps, gap_errors = load_gaps(summary, "summary")
    errors.extend(gap_errors)
    if gap_errors:
        gaps = []
    article_errors, articles = validate_articles(issue)
    project_errors, projects = validate_projects(issue)
    model_errors, models, board_ids, board_item_ids = validate_models(issue, gaps)
    errors.extend(article_errors)
    errors.extend(project_errors)
    errors.extend(model_errors)
    errors.extend(validate_merge(set(articles), set(projects), set(models), set(board_item_ids)))
    known = set(articles) | set(projects) | set(models) | set(board_item_ids)
    keyword_errors, keywords_present = validate_keywords(issue, gaps, known)
    errors.extend(keyword_errors)
    errors.extend(_index(issue, set(articles), set(projects), set(models), board_ids, keywords_present))
    return errors


def _index(
    issue: Path,
    articles: set[str],
    projects: set[str],
    models: set[str],
    board_ids: list[str],
    keywords_present: bool,
) -> list[str]:
    path = issue / "summary" / "index.json"
    if not path.is_file():
        return ["summary/index.json 缺失"]
    errors, data = check_document(path, "summary/index.json", "schemas/summary/index.schema.json")
    if errors or not isinstance(data, dict):
        return errors
    if "blocks" in data or "version" in data:
        errors.append("summary/index.json 不能再写 blocks 或顶层 version")
    errors.extend(_no_provenance_comment(issue))
    skill = data.get("skill") if isinstance(data.get("skill"), dict) else {}
    if skill.get("version") != skill_version():
        errors.append(f"summary/index.json 的 skill.version 应为 {skill_version()}")
    try:
        got_sources = data.get("sources")
        expect_sources = sources_document(issue)
        if got_sources != expect_sources:
            errors.append("summary/index.json 的 sources 和 raw + OPML 汇总不一致")
    except ValueError as exc:
        errors.append(str(exc))
    mapping, stamp_errors = stamp_map(issue)
    errors.extend(stamp_errors)
    errors.extend(_stamps_match(issue, mapping))
    window = data.get("window") if isinstance(data.get("window"), dict) else {}
    raw_window = _read_window(issue)
    if raw_window and (
        window.get("since") != raw_window.get("since") or window.get("until") != raw_window.get("until")
    ):
        errors.append("summary/index.json 的 window 和 raw/window.json 不一致")
    titles = [item.get("title") for item in (data.get("sources") or {}).get("categories") or []]
    if titles != CATEGORIES:
        errors.append("sources 的分类顺序应为模型榜单、GitHub Trending、博客、国内互联网")
    coverage = article_coverage(issue)
    got = data.get("articles_coverage")
    if got != coverage:
        errors.append(
            "summary/index.json 的 articles_coverage 应为 "
            f"原文 {coverage['raw']} 篇、精选 {coverage['selected']} 篇"
            "（原文是 feeds 按规范化 URL 去重，再加不在 feeds 里的补录；精选是 summary 文章数）"
        )
    if coverage["selected"] != len(articles):
        errors.append(
            "articles_coverage.selected 应等于 summary 文章数 "
            f"{len(articles)}，实际是 {coverage['selected']}"
        )
    cleaned = cleaned_article_count(issue)
    if coverage["raw"] < cleaned:
        errors.append(f"原文 {coverage['raw']} 篇少于清洗后 {cleaned} 篇")
    chapters = data.get("chapters") or []
    titles = [chapter.get("title") for chapter in chapters]
    expected = list(CHAPTERS)
    if not keywords_present:
        expected.remove("本周关键词")
    if titles != expected:
        errors.append(
            "summary/index.json 章节顺序应为 "
            + "、".join(expected)
            + "，实际是 "
            + "、".join(str(item) for item in titles)
        )
        return errors
    by = {chapter["title"]: chapter for chapter in chapters}
    if keywords_present and (by["本周关键词"].get("cards") or by["本周关键词"].get("boards") or by["本周关键词"].get("groups")):
        errors.append("本周关键词只引用 keywords.json，不在 index 里列卡片")
    model_chapter = by["模型进展"]
    if "boards" not in model_chapter or "cards" not in model_chapter:
        errors.append("模型进展要先有 boards，再有卡片 ID")
    else:
        if model_chapter["boards"] != board_ids and set(model_chapter["boards"]) != set(board_ids):
            errors.append("模型进展的 boards 和 summary/models/boards 对不上")
        elif len(model_chapter["boards"]) != len(set(model_chapter["boards"])):
            errors.append("模型进展的 boards 有重复")
        if set(model_chapter["cards"]) != models:
            errors.append("模型进展的卡片 ID 和 summary/models 对不上")
    project_cards = set(by["项目开源"].get("cards") or [])
    if project_cards != projects:
        errors.append("项目开源的卡片 ID 和 summary/projects 对不上")
    groups = by["精选文章"].get("groups") or []
    group_titles = [group.get("title") for group in groups]
    if group_titles != [title for title in GROUP_ORDER if title in group_titles]:
        errors.append("精选文章分组顺序应为国内模型厂、国外模型厂、国内非模型厂、国外非模型厂，空组不写")
    flat: list[str] = []
    for group in groups:
        flat.extend(group.get("cards") or [])
    if len(flat) != len(set(flat)):
        errors.append("精选文章 ID 在分组里重复")
    if set(flat) != articles:
        errors.append("精选文章分组里的 ID 和 summary/articles 对不上")
    for title in ("精选推文", "精选播客"):
        if by[title].get("cards") or by[title].get("groups") or by[title].get("boards"):
            errors.append(f"{title} 建设中，不能有条目")
    return errors


def _no_provenance_comment(issue: Path) -> list[str]:
    errors = []
    summary = issue / "summary"
    if not summary.is_dir():
        return errors
    for path in summary.rglob("*.json"):
        text = path.read_text(encoding="utf-8")
        if "<!-- provenance" in text:
            errors.append(f"{path.relative_to(issue)} 还留着 provenance 注释")
    return errors


def _stamps_match(issue: Path, mapping: dict) -> list[str]:
    errors = []
    for rel, info in mapping.items():
        path = issue / rel
        if not path.is_file():
            errors.append(f"{rel} 缺失")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for key in ("publisher", "category", "url"):
            if data.get(key) != info[key]:
                errors.append(f"{rel} 的 {key} 应为 {info[key]}")
    return errors


def _read_window(issue: Path) -> dict:
    path = issue / "raw" / "window.json"
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/summarize/check/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    errors = validate(Path(argv[0]))
    if errors:
        for item in errors:
            print(item, file=sys.stderr)
        return 1
    print("ok summary")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
