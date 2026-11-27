#!/usr/bin/env python3
"""分阶段校验的最小样例。不读取真实期次。"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from clean.check.validate import validate as validate_clean  # noqa: E402
from prepare.check.validate import validate as validate_prepare  # noqa: E402
from summarize.check.validate import validate as validate_summary  # noqa: E402
from summarize.merge.sources import sources_document  # noqa: E402

ISSUE = "2026-11-20"
SKILL = "weekly-ai-blogs-digest"
VERSION = "0.0.1"
ARTICLE = "https://example.com/post"
REPO = "https://github.com/example/demo"
REPOS = [
    REPO,
    "https://github.com/example/demo-2",
    "https://github.com/example/demo-3",
    "https://github.com/example/demo-4",
    "https://github.com/example/demo-5",
]
MODEL = "Example Model"
BOARD = "Artificial Analysis"
BOARD_ITEM = "Artificial Analysis Example Model"
PREPARE = "skills/managed/weekly-ai-blogs-digest/references/prepare/prepare.md"
CLEAN = "skills/managed/weekly-ai-blogs-digest/references/clean/clean.md"
SUMMARIZE = "skills/managed/weekly-ai-blogs-digest/references/summarize/summarize.md"


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def stage(name: str, entry: str) -> dict:
    return {"name": name, "skill": SKILL, "version": VERSION, "path": entry}


def card_sections() -> dict:
    return {
        "解决什么问题": "它要处理一件已经写在材料里的事。",
        "如何解决": "它换了一种做法，而不是把导语再写一遍。",
        "效果怎样": "材料没有新的数字，只能定性地说它能用。",
        "洞察与启发": "值得记住的是做法和场景怎么连在一起。",
        "相关工作": "它和这一期别的条目处理的是相近的问题。",
    }


def project_card(slug: str, link: str) -> dict:
    return {
        "id": link,
        "source": f"cleaned/projects/{slug}.json",
        "title": slug,
        "link": link,
        "lede": f"{slug} 这周出现在总榜上。",
        "category": "开源",
        "company": "example",
        "sections": card_sections(),
        "purpose": "给 Agent 用的仓库。",
        "change": "这一期进了周榜。",
    }


def write_issue(root: Path) -> Path:
    issue = root / ISSUE
    raw = issue / "raw"
    write_json(raw / "stage.json", stage("raw", PREPARE))
    write_json(raw / "gaps.json", {"gaps": []})
    write_json(
        raw / "window.json",
        {"issue": ISSUE, "since": "2026-11-13", "until": "2026-11-19"},
    )
    write_json(
        raw / "articles" / "feeds.json",
        {
            "items": [
                {"title": "一篇", "link": ARTICLE, "date": "2026-11-18", "source": "openai-news"},
            ]
        },
    )
    write_json(
        raw / "projects" / "github-trending.json",
        {"items": [{"link": link} for link in REPOS]},
    )
    write_json(raw / "projects" / "releases.json", {"items": []})
    for name in (
        "aa-language-models.json",
        "openrouter-rankings-daily.json",
        "openrouter-rankings-programming.json",
        "openrouter-app-rankings.json",
        "openrouter-official-endpoints.json",
    ):
        write_json(raw / "models" / name, {"ok": True})
    write_json(raw / "models" / "llm-arena-2026-11-19.json", {"leaderboard_publish_date": "2026-11-19"})

    cleaned = issue / "cleaned"
    write_json(cleaned / "stage.json", stage("cleaned", CLEAN))
    write_json(cleaned / "gaps.json", {"gaps": []})
    write_json(cleaned / "articles" / "index.json", {"ids": [ARTICLE]})
    write_json(
        cleaned / "articles" / "post.json",
        {
            "id": ARTICLE,
            "title": "一篇",
            "date": "2026-11-18",
            "source": "raw/articles/feeds.json",
            "publisher": "OpenAI",
            "category": "博客",
            "url": "https://openai.com/news/",
            "text": "订阅里的正文。",
        },
    )
    write_json(cleaned / "projects" / "index.json", {"ids": list(REPOS)})
    for link in REPOS:
        slug = link.rsplit("/", 1)[-1]
        write_json(
            cleaned / "projects" / f"{slug}.json",
            {
                "id": link,
                "source": "raw/projects/github-trending.json",
                "publisher": "GitHub",
                "category": "GitHub Trending",
                "url": "https://github.com/trending?since=weekly",
            },
        )
    write_json(cleaned / "models" / "index.json", {"ids": [MODEL]})
    write_json(
        cleaned / "models" / "example-model.json",
        {
            "id": MODEL,
            "name": MODEL,
            "source": "raw/models/aa-language-models.json",
            "publisher": "Artificial Analysis",
            "category": "模型榜单",
            "url": "https://artificialanalysis.ai/leaderboards/models",
        },
    )
    write_json(
        cleaned / "models" / "boards" / "aa.json",
        {
            "id": BOARD,
            "source": "raw/models/aa-language-models.json",
            "publisher": "Artificial Analysis",
            "category": "模型榜单",
            "url": "https://artificialanalysis.ai/leaderboards/models",
            "items": [{"name": MODEL, "value": 61}],
        },
    )

    summary = issue / "summary"
    write_json(summary / "stage.json", stage("summary", SUMMARIZE))
    write_json(summary / "gaps.json", {"gaps": []})
    write_json(
        summary / "articles" / "post.json",
        {
            "id": ARTICLE,
            "source": "cleaned/articles/post.json",
            "title": "一篇",
            "link": ARTICLE,
            "lede": "一句已经写在材料里的变化。",
            "category": "产品",
            "company": "Example",
            "sections": card_sections(),
        },
    )
    for link in REPOS:
        slug = link.rsplit("/", 1)[-1]
        write_json(summary / "projects" / f"{slug}.json", project_card(slug, link))
    write_json(
        summary / "models" / "example-model.json",
        {
            "id": MODEL,
            "source": "cleaned/models/example-model.json",
            "title": MODEL,
            "link": "https://example.com/example-model",
            "lede": "Example Model 这周发布。",
            "price": {"text": "暂无"},
            "speed": {"text": "暂无"},
            "effect": {"text": "暂无"},
            "points": [{"label": "上线", "text": "这周发布。"}],
        },
    )
    write_json(
        summary / "models" / "boards" / "aa.json",
        {
            "id": BOARD,
            "source": "cleaned/models/boards/aa.json",
            "caption": "这一期没有可核验的名次变化。",
            "highlights": [],
            "arena_publish_date": None,
            "items": [{"id": BOARD_ITEM, "name": MODEL, "value": 61}],
        },
    )
    write_json(
        summary / "keywords.json",
        {"keywords": [{"name": "Example", "weight": 1.4, "targets": [ARTICLE, BOARD_ITEM]}]},
    )
    write_json(
        summary / "overview.json",
        {
            "skill": {"name": SKILL, "version": "0.0.8"},
            "themes": [
                {
                    "kind": "model",
                    "text": "Example Model 写在这一期已经展示的模型卡里。卡片交代了它这周被选进来的原因，读者可以回到那张卡核对原话，而不是只看到一个名字。",
                    "refs": [{"id": MODEL, "label": "Example Model"}],
                },
                {
                    "kind": "other",
                    "text": "一篇说明了产品这周的变化。正文写了具体做了什么，也把它和同页其他条目连在一起，读者顺着句子就能回到这篇文章。",
                    "refs": [{"id": ARTICLE, "label": "一篇"}],
                },
                {
                    "kind": "other",
                    "text": "example/demo 进入这周的开源项目。卡片写了它为什么被留下，读者可以回到仓库条目看它和文章、模型是不是同一类变化。",
                    "refs": [{"id": REPO, "label": "example/demo"}],
                },
            ],
        },
    )
    write_json(
        summary / "index.json",
        {
            "skill": {"name": SKILL, "version": "0.0.12"},
            "routine": {
                "repo": "VirusPC/edges-brain-viruspc",
                "commit": "a" * 40,
                "path": ".edges/routines/weekly-ai-blogs-digest/INDEX.md",
            },
            "articles_coverage": {"raw": 1, "selected": 1},
            "window": {"issue": ISSUE, "since": "2026-11-13", "until": "2026-11-19"},
            "sources": sources_document(issue),
            "chapters": [
                {"title": "本周概览"},
                {"title": "模型进展", "boards": [BOARD], "cards": [MODEL]},
                {"title": "项目开源", "cards": list(REPOS)},
                {"title": "精选文章", "groups": [{"title": "国外非模型厂", "cards": [ARTICLE]}]},
                {"title": "精选推文", "cards": []},
                {"title": "精选播客", "cards": []},
            ],
        },
    )
    return issue


class ValidateStages(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.issue = write_issue(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_minimal_issue_passes_all_stages(self) -> None:
        self.assertEqual(validate_prepare(self.issue), [])
        self.assertEqual(validate_clean(self.issue), [])
        self.assertEqual(validate_summary(self.issue), [])

    def test_projects_follow_trending_order_and_keep_five_sections(self) -> None:
        index_path = self.issue / "summary" / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8"))
        chapter = next(item for item in index["chapters"] if item["title"] == "项目开源")
        chapter["cards"] = list(reversed(chapter["cards"]))
        write_json(index_path, index)
        errors = validate_summary(self.issue)
        self.assertTrue(any("榜单顺序" in item for item in errors), errors)
        chapter["cards"] = list(reversed(chapter["cards"]))
        write_json(index_path, index)
        project = self.issue / "summary" / "projects" / "demo.json"
        data = json.loads(project.read_text(encoding="utf-8"))
        del data["sections"]["洞察与启发"]
        write_json(project, data)
        errors = validate_summary(self.issue)
        self.assertTrue(any("洞察与启发" in item for item in errors), errors)
        data["sections"]["洞察与启发"] = "值得记住的是做法和场景怎么连在一起。"
        write_json(project, data)

        article = self.issue / "summary" / "articles" / "post.json"
        data = json.loads(article.read_text(encoding="utf-8"))
        data["sections"]["相关工作"] = ""
        write_json(article, data)
        errors = validate_summary(self.issue)
        self.assertTrue(any("summary/articles" in item and "相关工作" in item for item in errors), errors)

    def test_trending_top_accepts_url_or_link(self) -> None:
        from summarize.projects.validate import trending_top

        with tempfile.TemporaryDirectory() as tmp:
            issue = Path(tmp) / "issue"
            path = issue / "raw" / "projects" / "github-trending.json"
            write_json(path, {"items": [{"url": link} for link in REPOS]})
            self.assertEqual(trending_top(issue), list(REPOS))
            write_json(path, {"items": [{"link": link} for link in REPOS]})
            self.assertEqual(trending_top(issue), list(REPOS))

    def test_weixin_biz_in_article_id_is_not_markdown(self) -> None:
        from summarize.cards import card_problems

        url = "https://mp.weixin.qq.com/s?__biz=Mzk0OTYwNzc3NQ==&mid=2247485884"
        item = {
            "id": url,
            "source": "cleaned/articles/post.json",
            "title": "一篇",
            "link": url,
            "lede": "一句已经写在材料里的变化。",
            "category": "产品",
            "company": "Example",
            "sections": card_sections(),
        }
        self.assertEqual(card_problems(item, "weixin"), [])

    def test_project_stars_and_license_must_match_cleaned(self) -> None:

        cleaned_path = self.issue / "cleaned" / "projects" / "demo.json"
        cleaned = json.loads(cleaned_path.read_text(encoding="utf-8"))
        cleaned["stars"] = 1200
        cleaned["license"] = "MIT"
        write_json(cleaned_path, cleaned)
        errors = validate_summary(self.issue)
        self.assertTrue(any("stars" in item and "cleaned" in item for item in errors), errors)

        project_path = self.issue / "summary" / "projects" / "demo.json"
        project = json.loads(project_path.read_text(encoding="utf-8"))
        project["stars"] = 1200
        project["license"] = "MIT"
        write_json(project_path, project)
        self.assertEqual(validate_summary(self.issue), [])

        project["stars"] = 1201
        project["license"] = "Apache-2.0"
        write_json(project_path, project)
        errors = validate_summary(self.issue)
        self.assertTrue(any("stars" in item for item in errors), errors)
        self.assertTrue(any("license" in item for item in errors), errors)

    def test_project_category_is_open_source(self) -> None:
        project_path = self.issue / "summary" / "projects" / "demo.json"
        project = json.loads(project_path.read_text(encoding="utf-8"))
        project["category"] = "产品"
        write_json(project_path, project)
        errors = validate_summary(self.issue)
        self.assertTrue(any("category" in item and "开源" in item for item in errors), errors)

    def test_summary_field_rules_apply_to_every_recorded_version(self) -> None:
        index_path = self.issue / "summary" / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8"))
        index["skill"]["version"] = "0.0.10"
        project_chapter = next(item for item in index["chapters"] if item["title"] == "项目开源")
        project_chapter["cards"] = list(reversed(project_chapter["cards"]))
        write_json(index_path, index)

        project = self.issue / "summary" / "projects" / "demo.json"
        data = json.loads(project.read_text(encoding="utf-8"))
        del data["sections"]["如何解决"]
        write_json(project, data)
        errors = validate_summary(self.issue)
        self.assertTrue(any("如何解决" in item for item in errors), errors)
        self.assertTrue(any("榜单顺序" in item for item in errors), errors)

        project_chapter["cards"] = project_chapter["cards"][:-1]
        write_json(index_path, index)
        errors = validate_summary(self.issue)
        self.assertTrue(any("榜单顺序" in item for item in errors), errors)

    def test_invalid_summary_version_does_not_relax_summary_rules(self) -> None:
        index_path = self.issue / "summary" / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8"))
        index["skill"]["version"] = "unknown"
        chapter = next(item for item in index["chapters"] if item["title"] == "项目开源")
        chapter["cards"] = list(reversed(chapter["cards"]))
        write_json(index_path, index)
        errors = validate_summary(self.issue)
        self.assertTrue(any("skill.version" in item and "不符合" in item for item in errors), errors)

    def test_cli_exits_zero(self) -> None:
        script = SCRIPTS / "summarize" / "check" / "validate.py"
        result = subprocess.run([sys.executable, str(script), str(self.issue)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ok summary", result.stdout)

    def test_missing_required_file_fails_until_gap_has_reason(self) -> None:
        feeds = self.issue / "raw" / "articles" / "feeds.json"
        feeds.unlink()
        errors = validate_prepare(self.issue)
        self.assertTrue(any("articles/feeds.json" in item for item in errors))
        write_json(
            self.issue / "raw" / "gaps.json",
            {"gaps": [{"path": "articles/feeds.json", "reason": "主源和备源都没有拉到"}]},
        )
        self.assertEqual(validate_prepare(self.issue), [])

    def test_empty_file_and_skipped_snapshot_do_not_count(self) -> None:
        (self.issue / "raw" / "articles" / "feeds.json").write_text("\n", encoding="utf-8")
        self.assertTrue(any("空文件" in item for item in validate_prepare(self.issue)))
        write_json(self.issue / "raw" / "articles" / "feeds.json", {"items": []})
        write_json(self.issue / "raw" / "models" / "aa-language-models.json", {"skipped": True, "reason": "没有密钥"})
        write_json(
            self.issue / "raw" / "gaps.json",
            {"gaps": [{"path": "models/aa-language-models.json", "reason": "没有 AA_API_KEY"}]},
        )
        errors = validate_prepare(self.issue)
        self.assertTrue(any("skipped" in item for item in errors))

    def test_schema_rejects_bad_stage_name(self) -> None:
        write_json(
            self.issue / "raw" / "stage.json",
            {"name": "cleaned", "skill": SKILL, "version": VERSION, "path": PREPARE},
        )
        self.assertTrue(validate_prepare(self.issue))

    def test_index_must_match_item_files(self) -> None:
        write_json(self.issue / "cleaned" / "articles" / "index.json", {"ids": [ARTICLE, "https://example.com/missing"]})
        errors = validate_clean(self.issue)
        self.assertTrue(any("没有对应条目文件" in item for item in errors))

    def test_source_must_point_at_previous_stage(self) -> None:
        payload = json.loads((self.issue / "cleaned" / "articles" / "post.json").read_text(encoding="utf-8"))
        payload["source"] = "cleaned/articles/post.json"
        write_json(self.issue / "cleaned" / "articles" / "post.json", payload)
        errors = validate_clean(self.issue)
        self.assertTrue(any("必须回指 raw/" in item for item in errors))

        payload["source"] = "raw/articles/missing.json"
        write_json(self.issue / "cleaned" / "articles" / "post.json", payload)
        errors = validate_clean(self.issue)
        self.assertTrue(any("不存在" in item for item in errors))

    def test_articles_coverage_must_match_feeds_and_cleaned_ids(self) -> None:
        index_path = self.issue / "summary" / "index.json"
        index = json.loads(index_path.read_text(encoding="utf-8"))
        index["articles_coverage"] = {"raw": 1, "selected": 0}
        write_json(index_path, index)
        errors = validate_summary(self.issue)
        self.assertTrue(any("articles_coverage" in item and "精选 1 篇" in item for item in errors))

    def test_raw_must_not_be_below_cleaned(self) -> None:
        extras = ["https://example.com/extra", "https://example.com/extra-2"]
        for extra in extras:
            write_json(
                self.issue / "cleaned" / "articles" / f"{extra.rsplit('/', 1)[-1]}.json",
                {
                    "id": extra,
                    "title": "多出来的",
                    "date": "2026-11-18",
                    "source": "raw/articles/feeds.json",
                    "publisher": "OpenAI",
                    "category": "博客",
                    "url": "https://openai.com/news/",
                    "text": "没有对应原文。",
                },
            )
        write_json(self.issue / "cleaned" / "articles" / "index.json", {"ids": [ARTICLE, *extras]})
        errors = validate_summary(self.issue)
        self.assertTrue(any("少于清洗后 3 篇" in item for item in errors), errors)

    def test_overview_tag_rules_follow_the_recorded_version(self) -> None:
        self.assertEqual(validate_summary(self.issue), [])
        overview_path = self.issue / "summary" / "overview.json"
        overview = json.loads(overview_path.read_text(encoding="utf-8"))
        overview["skill"]["version"] = "0.0.9"
        write_json(overview_path, overview)
        errors = validate_summary(self.issue)
        self.assertTrue(any("缺少 tag" in item for item in errors), errors)
        overview["themes"][0]["tag"] = "能力方向"
        overview["themes"][1]["tag"] = "产品实践"
        overview["themes"][2]["tag"] = "开源变化"
        write_json(overview_path, overview)
        write_json(
            self.issue / "summary" / "keywords.json",
            {
                "keywords": [
                    {"name": "Example", "weight": 1.4, "targets": [ARTICLE, BOARD_ITEM]},
                    {"name": "能力方向", "weight": 5, "targets": [MODEL]},
                    {"name": "产品实践", "weight": 5, "targets": [ARTICLE]},
                    {"name": "开源变化", "weight": 5, "targets": [REPO]},
                ]
            },
        )
        self.assertEqual(validate_summary(self.issue), [])

    def test_keyword_target_must_exist(self) -> None:
        write_json(
            self.issue / "summary" / "keywords.json",
            {"keywords": [{"name": "Example", "weight": 1.4, "targets": ["https://example.com/missing"]}]},
        )
        errors = validate_summary(self.issue)
        self.assertTrue(any("不存在的 ID" in item for item in errors))

    def test_clean_stops_when_prepare_fails(self) -> None:
        (self.issue / "raw" / "window.json").unlink()
        errors = validate_clean(self.issue)
        self.assertTrue(errors[0].startswith("准备校验未通过"))

    def test_summary_stops_when_clean_fails(self) -> None:
        shutil.rmtree(self.issue / "cleaned" / "articles")
        errors = validate_summary(self.issue)
        self.assertTrue(errors[0].startswith("清洗校验未通过"))


if __name__ == "__main__":
    unittest.main()
