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

ISSUE = "2026-11-20"
SKILL = "weekly-ai-blogs-digest"
VERSION = "0.0.1"
ARTICLE = "https://example.com/post"
REPO = "https://github.com/example/demo"
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
                {"title": "仓库", "link": REPO, "date": "2026-11-18", "source": "github-trending-weekly-all"},
            ]
        },
    )
    write_json(raw / "projects" / "github-trending.json", {"items": [{"link": REPO}]})
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
    write_json(cleaned / "projects" / "index.json", {"ids": [REPO]})
    write_json(
        cleaned / "projects" / "demo.json",
        {
            "id": REPO,
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
            "sentence": "一句。",
            "category": "产品",
            "company": "Example",
        },
    )
    write_json(
        summary / "projects" / "demo.json",
        {
            "id": REPO,
            "source": "cleaned/projects/demo.json",
            "purpose": "给 Agent 用的仓库。",
            "change": "这一期进了周榜。",
        },
    )
    write_json(
        summary / "models" / "example-model.json",
        {
            "id": MODEL,
            "source": "cleaned/models/example-model.json",
            "price": {"text": "暂无"},
            "speed": {"text": "暂无"},
            "effect": {"text": "暂无"},
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
        summary / "index.json",
        {
            "skill": {"name": SKILL, "version": "0.0.5"},
            "routine": {
                "repo": "VirusPC/edges-brain-viruspc",
                "commit": "a" * 40,
                "path": ".edges/routines/weekly-ai-blogs-digest/INDEX.md",
            },
            "data": {"commit": None},
            "articles_coverage": {"raw": 2, "selected": 1},
            "window": {"issue": ISSUE, "since": "2026-11-13", "until": "2026-11-19"},
            "sources": {
                "categories": [
                    {"title": "模型榜单", "count": 0, "publishers": []},
                    {
                        "title": "GitHub Trending",
                        "count": 1,
                        "publishers": [
                            {
                                "name": "GitHub",
                                "url": "https://github.com/trending?since=weekly",
                                "count": 1,
                            }
                        ],
                    },
                    {
                        "title": "博客",
                        "count": 1,
                        "publishers": [
                            {"name": "OpenAI", "url": "https://openai.com/news/", "count": 1}
                        ],
                    },
                    {"title": "国内互联网", "count": 0, "publishers": []},
                ]
            },
            "chapters": [
                {"title": "本周关键词"},
                {"title": "模型进展", "boards": [BOARD], "cards": [MODEL]},
                {"title": "项目开源", "cards": [REPO]},
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
