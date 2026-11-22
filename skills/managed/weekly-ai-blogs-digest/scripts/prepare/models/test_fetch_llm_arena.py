#!/usr/bin/env python3
"""Date selection for fetch_llm_arena.py. No network."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_llm_arena import as_iso_date, choose_publish_date, neighbor_dates, select_rows


def row(day: str, rank: int, model: str) -> dict:
    return {
        "rank": rank,
        "model": model,
        "organization": "x",
        "score": 1.0,
        "votes": 1,
        "leaderboard_publish_date": day,
    }


class DateSelection(unittest.TestCase):
    def test_iso_date(self) -> None:
        self.assertEqual(as_iso_date("2026-10-28"), "2026-10-28")
        self.assertEqual(as_iso_date("2026-10-28T00:00:00"), "2026-10-28")
        self.assertIsNone(as_iso_date(None))
        self.assertIsNone(as_iso_date("not-a-date"))

    def test_until_picks_latest_on_or_before(self) -> None:
        dates = ["2026-09-13", "2026-09-25", "2026-10-28", "2026-11-06"]
        self.assertEqual(choose_publish_date(dates, "2026-11-05"), "2026-10-28")
        self.assertEqual(choose_publish_date(dates, "2026-09-24"), "2026-09-13")
        self.assertEqual(choose_publish_date(dates, "2026-10-28"), "2026-10-28")
        self.assertEqual(choose_publish_date(dates, None), "2026-11-06")
        self.assertIsNone(choose_publish_date(dates, "2026-01-01"))

    def test_invalid_until_does_not_fetch(self) -> None:
        from fetch_llm_arena import main

        self.assertEqual(main(["--until", "2026/11/05"]), 1)

    def test_select_rows_drops_later_boards(self) -> None:
        rows = [
            row("2026-10-28", 2, "older"),
            row("2026-10-28", 1, "older-top"),
            row("2026-11-06", 1, "later"),
        ]
        selected = select_rows(rows, "2026-11-05", limit=20)
        self.assertEqual(selected["chosen"], "2026-10-28")
        self.assertEqual(selected["next"], "2026-11-06")
        self.assertEqual([item["model"] for item in selected["items"]], ["older-top", "older"])
        self.assertIsNone(selected["prior"])


if __name__ == "__main__":
    unittest.main()
