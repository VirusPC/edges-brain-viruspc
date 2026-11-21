#!/usr/bin/env python3
"""Price and speed rank tests. No network."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from model_release_ranks import (  # noqa: E402
    annotate_model,
    blended_price,
    price_ranks,
    speed_ranks,
)

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "aa-intelligence-priced-2026-11-20.json"


def aa(slug: str, name: str, score: float, incoming: float, outgoing: float) -> dict:
    return {
        "slug": slug,
        "name": name,
        "intelligence_index": score,
        "price_1m_input_tokens": incoming,
        "price_1m_output_tokens": outgoing,
    }


class Blend(unittest.TestCase):
    def test_output_weighted_blend(self) -> None:
        self.assertEqual(blended_price(8, 40), 32)
        self.assertEqual(blended_price(1.5, 4.5), 3.75)
        self.assertIsNone(blended_price(1, None))


class PriceRank(unittest.TestCase):
    def test_issue_snapshot_matches_the_checked_places(self) -> None:
        items = json.loads(FIXTURE.read_text(encoding="utf-8"))
        table = price_ranks(items)
        self.assertEqual(len(table), 142)
        self.assertEqual(table["gpt-6-2-astra"]["rank"], 123)
        self.assertEqual(table["gemini-4-neon"]["rank"], 107)
        self.assertEqual(table["gpt-6-2-sol"]["rank"], 87)
        self.assertEqual(table["qwen4-max"]["rank"], 69)
        for slug in ("gpt-6-2-astra", "gemini-4-neon", "gpt-6-2-sol", "qwen4-max"):
            self.assertEqual(table[slug]["rank_of"], 142)
            self.assertEqual(table[slug]["rank_metric"], "blended_input_plus_3_output_over_4")
            self.assertEqual(table[slug]["rank_source"], "artificial_analysis")
        self.assertEqual(table["qwen4-max"]["rank_value"], 3.75)
        self.assertEqual(table["qwen4-max"]["rank_variant"], "Qwen4 Max")

    def test_competition_rank_skips_after_a_tie(self) -> None:
        items = [
            aa("cheap", "Cheap", 1, 0, 0),
            aa("tie-a", "Tie A", 1, 1, 1),
            aa("tie-b", "Tie B", 1, 1, 1),
            aa("dear", "Dear", 1, 4, 4),
        ]
        table = price_ranks(items)
        self.assertEqual(table["cheap"]["rank"], 1)
        self.assertEqual(table["tie-a"]["rank"], 2)
        self.assertEqual(table["tie-b"]["rank"], 2)
        self.assertEqual(table["dear"]["rank"], 4)
        self.assertEqual(table["dear"]["rank_of"], 4)

    def test_scored_without_price_and_priced_without_score_stay_out(self) -> None:
        items = [
            aa("both", "Both", 10, 2, 2),
            {"slug": "score-only", "name": "Score", "intelligence_index": 9, "price_1m_input_tokens": None},
            {"slug": "price-only", "name": "Price", "intelligence_index": None, "price_1m_input_tokens": 0.1, "price_1m_output_tokens": 0.1},
        ]
        table = price_ranks(items)
        self.assertEqual(list(table), ["both"])
        self.assertEqual(table["both"]["rank_of"], 1)

    def test_card_price_is_not_what_gets_ranked(self) -> None:
        items = [
            aa("mid", "Mid", 20, 1.2, 4.4),
            aa("qwen4-max", "Qwen4 Max", 42.9, 1.5, 4.5),
        ]
        table = price_ranks(items)
        # Card shows OpenRouter $1.425/$4.275 (blend 3.5625), which would beat Mid's 3.6.
        # AA $1.5/$4.5 blends to 3.75 and ranks behind Mid.
        self.assertEqual(table["mid"]["rank_value"], 3.6)
        self.assertEqual(table["qwen4-max"]["rank_value"], 3.75)
        self.assertEqual(table["mid"]["rank"], 1)
        self.assertEqual(table["qwen4-max"]["rank"], 2)
        model = annotate_model(
            {
                "name": "Qwen4-Max",
                "openrouter_slug": "qwen/qwen4-max",
                "price": {"input": 1.425, "output": 4.275, "cache_read": 0.07125, "source": "openrouter"},
                "speed": {"latency_s": 2.5875, "throughput_tps": 42},
                "aa": {"intelligence_index": 42.9, "rank": 52, "rank_of": 156, "aa_slug": "qwen4-max"},
            },
            table,
            {},
        )
        self.assertEqual(model["price"]["input"], 1.425)
        self.assertEqual(model["price"]["output"], 4.275)
        self.assertEqual(model["price"]["rank"], 2)
        self.assertEqual(model["price"]["rank_value"], 3.75)
        self.assertEqual(model["speed"]["latency_s"], 2.5875)
        self.assertIsNone(model["speed"]["rank"])
        self.assertEqual(model["aa"]["rank"], 52)
        self.assertEqual(model["aa"]["rank_of"], 156)


class SpeedRank(unittest.TestCase):
    def test_lower_latency_ranks_first_and_ties_skip(self) -> None:
        table = speed_ranks(
            [
                {"openrouter_slug": "slow", "latency_s": 4},
                {"openrouter_slug": "a", "latency_s": 2},
                {"openrouter_slug": "b", "latency_s": 2},
                {"openrouter_slug": "fast", "latency_s": 1},
                {"openrouter_slug": "missing", "latency_s": None},
            ]
        )
        self.assertEqual(table["fast"]["rank"], 1)
        self.assertEqual(table["a"]["rank"], 2)
        self.assertEqual(table["b"]["rank"], 2)
        self.assertEqual(table["slow"]["rank"], 4)
        self.assertEqual(table["slow"]["rank_of"], 4)
        self.assertNotIn("missing", table)


if __name__ == "__main__":
    unittest.main()
