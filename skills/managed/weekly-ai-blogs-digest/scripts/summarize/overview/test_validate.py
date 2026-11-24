#!/usr/bin/env python3
"""overview.json 的报错和警告。不读取真实期次。"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from summarize.merge.write_index import skill_version  # noqa: E402
from summarize.overview.validate import NO_MODEL, validate  # noqa: E402

ARTICLE = "https://example.com/post"
MODEL = "Example Model"
THEME = "主题词"


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def overview(themes: list[dict], version: str | None = None) -> dict:
    return {
        "skill": {"name": "weekly-ai-blogs-digest", "version": version or skill_version()},
        "themes": themes,
    }


def theme(kind: str, text: str, refs: list[dict] | None = None, tag: str | None = None) -> dict:
    payload: dict = {"kind": kind, "text": text, "refs": [] if refs is None else refs}
    if tag is not None:
        payload["tag"] = tag
    return payload


def long_text(label: str) -> str:
    return (
        f"{label}写在这一期已经展示的内容里。"
        "正文交代了它这周具体发生了什么，也写了它和同页其他条目怎么连在一起，而不是只报一个名字。"
        "读者顺着这句就能回到对应的卡片，核对数字和原话，看它为什么会被留在这页上，而不是被放进缺口。"
        "这一句只复述已经写进卡片的内容，不另加材料里没有的判断。"
    )


def valid_themes(*, tagged: bool = True) -> list[dict]:
    return [
        theme(
            "model",
            long_text("Example Model"),
            [{"id": MODEL, "label": "Example Model"}],
            "能力方向" if tagged else None,
        ),
        theme(
            "other",
            long_text("一篇"),
            [{"id": ARTICLE, "label": "一篇"}],
            "产品实践" if tagged else None,
        ),
        theme(
            "other",
            long_text(THEME),
            [{"id": ARTICLE, "label": THEME}],
            "共同主题" if tagged else None,
        ),
    ]


def build(root: Path, *, model: bool = True, theme_flag: bool = False) -> Path:
    issue = root / "2026-11-20"
    write_json(
        issue / "summary" / "articles" / "post.json",
        {"id": ARTICLE, "title": "一篇", "sentence": "一句。"},
    )
    if model:
        write_json(issue / "summary" / "models" / "example.json", {"id": MODEL})
    write_json(
        issue / "summary" / "keywords.json",
        {"keywords": [{"name": THEME, "weight": 2, "theme": theme_flag, "targets": [ARTICLE]}]},
    )
    return issue


class OverviewValidate(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.issue = build(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def save(self, payload) -> None:
        write_json(self.issue / "summary" / "overview.json", payload)

    def errors(self) -> list[str]:
        found, _warnings = validate(self.issue)
        return found

    def test_valid_passes(self) -> None:
        self.save(overview(valid_themes()))
        errors, warnings = validate(self.issue)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_missing_file_fails(self) -> None:
        self.assertIn("summary/overview.json 缺失", self.errors())

    def test_count_and_version(self) -> None:
        themes = valid_themes()[:2]
        self.save(overview(themes, version="0.0.0"))
        text = "\n".join(self.errors())
        self.assertIn("不是 3 到 5 条", text)
        self.assertNotIn("skill.version", text)
        self.save(overview(valid_themes(), version="99.0.0"))
        self.assertTrue(any("新于当前 skill" in item for item in self.errors()))
        self.save(overview(valid_themes(), version="nope"))
        self.assertTrue(any("不是 semver" in item for item in self.errors()))

    def test_over_280_characters(self) -> None:
        themes = valid_themes()
        themes[1] = theme("other", "字" * 281, [{"id": ARTICLE, "label": "字"}], "产品实践")
        self.save(overview(themes))
        self.assertTrue(any("超过 280 字" in item for item in self.errors()))

    def test_short_text_warns_but_the_empty_model_sentence_does_not(self) -> None:
        themes = valid_themes()
        themes[1] = theme("other", "一篇太短。", [{"id": ARTICLE, "label": "一篇"}], "产品实践")
        self.save(overview(themes))
        _errors, warnings = validate(self.issue)
        self.assertTrue(any("少于 120 字" in item for item in warnings))
        self.tmp.cleanup()
        self.tmp = tempfile.TemporaryDirectory()
        self.issue = build(Path(self.tmp.name), model=False)
        themes = [
            theme("model", NO_MODEL, [], "无重要发布"),
            theme("other", long_text("一篇"), [{"id": ARTICLE, "label": "一篇"}], "产品实践"),
            theme("other", long_text(THEME), [{"id": ARTICLE, "label": THEME}], "共同主题"),
        ]
        self.save(overview(themes))
        _errors, warnings = validate(self.issue)
        self.assertFalse(any("少于 120 字" in item and "第 1 条" in item for item in warnings))

    def test_projects_and_articles_cannot_both_be_missing_a_category(self) -> None:
        write_json(
            self.issue / "summary" / "projects" / "demo.json",
            {"id": "https://github.com/example/demo"},
        )
        self.save(overview(valid_themes()))
        self.assertTrue(any("没有引用项目" in item for item in self.errors()))
        themes = valid_themes()
        themes[1] = theme(
            "other",
            long_text("example/demo"),
            [{"id": "https://github.com/example/demo", "label": "example/demo"}],
            "开源变化",
        )
        self.save(overview(themes))
        self.assertFalse(any("没有引用" in item for item in self.errors()))

    def test_first_must_be_the_only_model(self) -> None:
        themes = valid_themes()
        themes[0] = theme("other", "一篇在第一条。", [{"id": ARTICLE, "label": "一篇"}], "产品实践")
        themes[1] = theme("model", "Example Model 写在后面。", [{"id": MODEL, "label": "Example Model"}], "能力方向")
        self.save(overview(themes))
        text = "\n".join(self.errors())
        self.assertIn("首条 kind 不是 model", text)
        self.assertIn("首条之外还有 kind=model", text)

    def test_model_cards_reject_the_empty_sentence(self) -> None:
        themes = valid_themes()
        themes[0] = theme("model", NO_MODEL, [], "无重要发布")
        self.save(overview(themes))
        self.assertTrue(any("本期有模型卡片" in item for item in self.errors()))

    def test_no_model_card_does_not_require_the_empty_sentence(self) -> None:
        self.tmp.cleanup()
        self.tmp = tempfile.TemporaryDirectory()
        self.issue = build(Path(self.tmp.name), model=False)
        write_json(
            self.issue / "summary" / "projects" / "demo.json",
            {"id": "https://github.com/example/demo"},
        )
        themes = [
            theme(
                "model",
                long_text("example/demo"),
                [{"id": "https://github.com/example/demo", "label": "example/demo"}],
                "能力方向",
            ),
            theme("other", long_text("一篇"), [{"id": ARTICLE, "label": "一篇"}], "产品实践"),
            theme("other", long_text("Example"), [{"id": ARTICLE, "label": "Example"}], "共同主题"),
        ]
        self.save(overview(themes))
        text = "\n".join(self.errors())
        self.assertNotIn("不是这句原文", text)
        self.assertNotIn("本周无重要模型发布", text)
        self.assertEqual(self.errors(), [])

    def test_unknown_id_empty_refs_and_missing_label(self) -> None:
        themes = valid_themes()
        themes[1] = theme("other", "没有引用。", [], "产品实践")
        themes[2] = theme(
            "other",
            "正文里没有这个锚。",
            [{"id": "missing-id", "label": "锚文字"}],
            "共同主题",
        )
        self.save(overview(themes))
        text = "\n".join(self.errors())
        self.assertIn("refs 为空", text)
        self.assertIn("不在本期 summary 里", text)
        self.assertIn("在正文里找不到", text)

    def test_three_articles_need_one_other_theme_and_the_first_theme_stays_a_model(self) -> None:
        write_json(
            self.issue / "summary" / "articles" / "second.json",
            {"id": "https://example.com/second", "title": "第二篇", "sentence": "二。"},
        )
        write_json(
            self.issue / "summary" / "articles" / "third.json",
            {"id": "https://example.com/third", "title": "第三篇", "sentence": "三。"},
        )
        themes = valid_themes()
        self.save(overview(themes))
        self.assertTrue(any("不少于 3 篇" in item for item in self.errors()))
        themes[0] = theme(
            "model",
            long_text("一篇"),
            [{"id": ARTICLE, "label": "一篇"}],
            "能力方向",
        )
        clustered = long_text("一篇") + "第二篇和第三篇也写在这一条里。"
        themes[1] = theme(
            "other",
            clustered,
            [
                {"id": ARTICLE, "label": "一篇"},
                {"id": "https://example.com/second", "label": "第二篇"},
                {"id": "https://example.com/third", "label": "第三篇"},
            ],
            "聚合主题",
        )
        self.save(overview(themes))
        text = "\n".join(self.errors())
        self.assertIn("首条引用了文章", text)
        self.assertNotIn("不少于 3 篇", text)
        themes[0] = theme("model", long_text("Example Model"), [{"id": MODEL, "label": "Example Model"}], "能力方向")
        self.save(overview(themes))
        self.assertEqual(self.errors(), [])

    def test_repeated_label_and_missing_theme_are_warnings(self) -> None:
        self.tmp.cleanup()
        self.tmp = tempfile.TemporaryDirectory()
        self.issue = build(Path(self.tmp.name), theme_flag=True)
        themes = valid_themes()
        themes[1] = theme("other", "一篇，还是一篇。", [{"id": ARTICLE, "label": "一篇"}], "产品实践")
        themes[2] = theme("other", "这里不写那个词。", [{"id": ARTICLE, "label": "这里"}], "共同主题")
        self.save(overview(themes))
        errors, warnings = validate(self.issue)
        self.assertEqual(errors, [])
        text = "\n".join(warnings)
        self.assertIn("出现多次", text)
        self.assertIn("theme 为 true", text)
        script = Path(__file__).resolve().parent / "validate.py"
        result = subprocess.run([sys.executable, str(script), str(self.issue)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("ok summary/overview", result.stdout)
        self.assertIn("警告:", result.stderr)

    def test_version_0_0_8_does_not_require_tags(self) -> None:
        self.save(overview(valid_themes(tagged=False), version="0.0.8"))
        self.assertEqual(self.errors(), [])
        themes = valid_themes(tagged=False)
        themes[0]["tag"] = MODEL
        self.save(overview(themes, version="0.0.8"))
        self.assertEqual(self.errors(), [])

    def test_current_version_requires_one_tag_per_theme(self) -> None:
        self.save(overview(valid_themes(tagged=False)))
        self.assertTrue(any("缺少 tag" in item for item in self.errors()))
        themes = valid_themes()
        themes[0]["tag"] = " 能力方向 "
        self.save(overview(themes))
        self.assertTrue(any("首尾空白" in item for item in self.errors()))
        themes = valid_themes()
        themes[2] = theme(
            "other",
            long_text(THEME),
            [{"id": ARTICLE, "label": THEME}],
            "产品实践",
        )
        self.save(overview(themes))
        self.assertTrue(any("重复" in item for item in self.errors()))

    def test_model_tag_is_a_direction_and_other_tags_are_not_item_names(self) -> None:
        themes = valid_themes()
        themes[0] = theme(
            "model",
            long_text("Example Model"),
            [{"id": MODEL, "label": "Example Model"}],
            MODEL,
        )
        self.save(overview(themes))
        self.assertTrue(any("不得是型号名" in item for item in self.errors()))
        themes[0] = theme(
            "model",
            long_text("Example Model"),
            [{"id": MODEL, "label": "Example Model"}],
            "GPT-6.2 Astra",
        )
        self.save(overview(themes))
        self.assertTrue(any("不得是型号名" in item for item in self.errors()))
        themes = valid_themes()
        themes[1] = theme(
            "other",
            long_text("一篇"),
            [{"id": ARTICLE, "label": "一篇"}],
            "一篇",
        )
        self.save(overview(themes))
        self.assertTrue(any("不得是单篇文章或单个项目、产品名" in item for item in self.errors()))

    def test_empty_model_sentence_uses_the_fixed_tag(self) -> None:
        self.tmp.cleanup()
        self.tmp = tempfile.TemporaryDirectory()
        self.issue = build(Path(self.tmp.name), model=False)
        themes = [
            theme("model", NO_MODEL, [], "GPT-6"),
            theme("other", long_text("一篇"), [{"id": ARTICLE, "label": "一篇"}], "产品实践"),
            theme("other", long_text(THEME), [{"id": ARTICLE, "label": THEME}], "共同主题"),
        ]
        self.save(overview(themes))
        self.assertTrue(any("必须是「无重要发布」" in item for item in self.errors()))
        themes[0] = theme("model", NO_MODEL, [], "无重要发布")
        self.save(overview(themes))
        self.assertEqual(self.errors(), [])


if __name__ == "__main__":
    unittest.main()
