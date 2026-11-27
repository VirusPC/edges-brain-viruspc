#!/usr/bin/env python3
"""主线 tag 并入 keywords.json 的校验。不读取真实期次。"""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from summarize.keywords.validate import validate  # noqa: E402

ARTICLE = "https://example.com/post"
MODEL = "Example Model"


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def overview(version: str, themes: list[dict]) -> dict:
    return {"skill": {"name": "weekly-ai-blogs-digest", "version": version}, "themes": themes}


class KeywordThemeTags(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.issue = Path(self.tmp.name) / "2026-11-20"
        write_json(
            self.issue / "summary" / "articles" / "post.json",
            {"id": ARTICLE, "title": "一篇", "lede": "一句。"},
        )
        write_json(self.issue / "summary" / "models" / "example.json", {"id": MODEL})

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def save_keywords(self, keywords: list[dict]) -> None:
        write_json(self.issue / "summary" / "keywords.json", {"keywords": keywords})

    def errors(self) -> list[str]:
        found, _present = validate(self.issue, [], {ARTICLE, MODEL})
        return found

    def test_current_tags_need_weight_and_targets(self) -> None:
        write_json(
            self.issue / "summary" / "overview.json",
            overview(
                "0.0.9",
                [
                    {
                        "kind": "model",
                        "tag": "能力方向",
                        "text": "方向里点了 Example Model。",
                        "refs": [{"id": MODEL, "label": "Example Model"}],
                    },
                    {
                        "kind": "other",
                        "tag": "产品实践",
                        "text": "一篇。",
                        "refs": [{"id": ARTICLE, "label": "一篇"}],
                    },
                    {
                        "kind": "other",
                        "tag": "无重要发布",
                        "text": "本周无重要模型发布",
                        "refs": [],
                    },
                ],
            ),
        )
        self.save_keywords([{"name": "Example Model", "weight": 2.2, "targets": [MODEL]}])
        text = "\n".join(self.errors())
        self.assertIn("缺少主线 tag「能力方向」", text)
        self.assertIn("缺少主线 tag「产品实践」", text)
        self.assertNotIn("无重要发布", text)

        self.save_keywords(
            [
                {"name": "能力方向", "weight": 2.2, "targets": [MODEL]},
                {"name": "产品实践", "weight": 5, "targets": [MODEL]},
                {"name": "Example Model", "weight": 2.2, "targets": [MODEL]},
            ]
        )
        text = "\n".join(self.errors())
        self.assertIn("低于主线 tag 下限 5", text)
        self.assertIn("没有盖住 https://example.com/post", text)

        self.save_keywords(
            [
                {"name": "能力方向", "weight": 5, "targets": [MODEL]},
                {"name": "产品实践", "weight": 5, "targets": [ARTICLE, MODEL]},
                {"name": "Example Model", "weight": 2.2, "targets": [MODEL]},
            ]
        )
        self.assertEqual(self.errors(), [])

    def test_locked_0_0_8_overview_does_not_require_tags_in_the_cloud(self) -> None:
        write_json(
            self.issue / "summary" / "overview.json",
            overview(
                "0.0.8",
                [
                    {
                        "kind": "model",
                        "text": "Example Model 写在模型卡里。",
                        "refs": [{"id": MODEL, "label": "Example Model"}],
                    },
                    {
                        "kind": "other",
                        "text": "一篇说明了变化。",
                        "refs": [{"id": ARTICLE, "label": "一篇"}],
                    },
                    {
                        "kind": "other",
                        "text": "另一条也在。",
                        "refs": [{"id": ARTICLE, "label": "一篇"}],
                    },
                ],
            ),
        )
        self.save_keywords([{"name": "Example Model", "weight": 2.2, "targets": [MODEL]}])
        self.assertEqual(self.errors(), [])


if __name__ == "__main__":
    unittest.main()
