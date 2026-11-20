#!/usr/bin/env python3
"""Axis tests for render_arena_chart.py. No network and no PNG export."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from render_arena_chart import render_svg  # noqa: E402


def _svg(scores: list[float]) -> str:
    items = [
        {"rank": index, "model": f"M{index}", "organization": "openai", "score": score}
        for index, score in enumerate(scores, start=1)
    ]
    return render_svg(
        items,
        title="t",
        subtitle="",
        footnote="",
        new_models=set(),
        axis_label="Token 用量（T）",
    )


class AxisTests(unittest.TestCase):
    def test_nonnegative_scores_do_not_draw_a_negative_tick(self) -> None:
        svg = _svg([69.27, 2.98])
        self.assertIn(">0</text>", svg)
        self.assertNotIn(">-5</text>", svg)
        self.assertNotIn(">-1</text>", svg)

    def test_high_scores_can_still_start_above_zero(self) -> None:
        svg = _svg([64.6, 56.9])
        self.assertIn(">50</text>", svg)
        self.assertNotIn(">0</text>", svg)


if __name__ == "__main__":
    unittest.main()
