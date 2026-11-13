#!/usr/bin/env python3
"""Window, aggregation, and redaction tests for fetch_openrouter.py. No network."""

from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_openrouter import (  # noqa: E402
    ModelCatalog,
    aggregate_rankings,
    citation_line,
    complete_week_monday,
    main,
    select_programming_monday,
    tokens_in_trillions,
)

SECRET = "test-key-should-not-leak"
SINCE = "2026-11-06"
UNTIL = "2026-11-12"


def day_range(start: str, end: str):
    cursor = date.fromisoformat(start)
    last = date.fromisoformat(end)
    while cursor <= last:
        yield cursor
        cursor += timedelta(days=1)


def daily_rows(start: str, end: str, amounts: dict[str, int]) -> list[dict]:
    rows = []
    for day in day_range(start, end):
        for slug, tokens in amounts.items():
            rows.append(
                {
                    "date": day.isoformat(),
                    "model_permaslug": slug,
                    "total_tokens": str(tokens),
                }
            )
        rows.append({"date": day.isoformat(), "model_permaslug": "other", "total_tokens": "9"})
    return rows


CATALOG = {
    "data": [
        {
            "id": "deepseek/deepseek-v4.1-flash-1017",
            "name": "DeepSeek: DeepSeek V4.1 Flash 1017",
            "canonical_slug": "deepseek/deepseek-v4.1-flash-20261017",
        },
        {
            "id": "deepseek/deepseek-v4.1-flash-1017:batch",
            "name": "DeepSeek: DeepSeek V4.1 Flash 1017 (batch)",
            "canonical_slug": "deepseek/deepseek-v4.1-flash-20261017",
        },
        {
            "id": "moonshotai/kimi-k3.1-pro",
            "name": "MoonshotAI: Kimi K3.1 Pro",
            "canonical_slug": "moonshotai/kimi-k3.1-pro-20261023",
        },
        {
            "id": "nvidia/nemotron-3-ultra-550b-a55b:free",
            "name": "NVIDIA: Nemotron 3 Ultra (free)",
            "canonical_slug": "nvidia/nemotron-3-ultra-550b-a55b-20260604",
        },
        {
            "id": "nvidia/nemotron-3-ultra-550b-a55b",
            "name": "NVIDIA: Nemotron 3 Ultra",
            "canonical_slug": "nvidia/nemotron-3-ultra-550b-a55b-20260604",
        },
    ]
}


def meta(start: str, end: str) -> dict:
    return {
        "as_of": "2026-11-13T14:55:01.681Z",
        "version": "v1",
        "start_date": start,
        "end_date": end,
    }


class WeekSelection(unittest.TestCase):
    def test_complete_week_monday(self) -> None:
        self.assertEqual(complete_week_monday(date(2026, 11, 12)), date(2026, 11, 2))
        self.assertEqual(complete_week_monday(date(2026, 11, 8)), date(2026, 11, 2))
        self.assertEqual(complete_week_monday(date(2026, 11, 9)), date(2026, 11, 2))

    def test_selects_latest_complete_week_and_skips_partial(self) -> None:
        dates = [date(2026, 10, 26), date(2026, 11, 2), date(2026, 11, 9)]
        chosen = select_programming_monday(dates, date(2026, 11, 12), date(2026, 11, 13))
        self.assertEqual(chosen, date(2026, 11, 2))

    def test_falls_back_when_target_week_is_missing(self) -> None:
        dates = [date(2026, 10, 26), date(2026, 11, 9)]
        chosen = select_programming_monday(dates, date(2026, 11, 12), date(2026, 11, 13))
        self.assertEqual(chosen, date(2026, 10, 26))

    def test_does_not_use_a_week_that_is_still_in_progress(self) -> None:
        dates = [date(2026, 11, 9)]
        self.assertIsNone(select_programming_monday(dates, date(2026, 11, 12), date(2026, 11, 13)))

    def test_future_window_end_does_not_select_the_current_week(self) -> None:
        dates = [date(2026, 11, 2), date(2026, 11, 9)]
        chosen = select_programming_monday(dates, date(2026, 11, 15), date(2026, 11, 13))
        self.assertEqual(chosen, date(2026, 11, 2))


class Aggregation(unittest.TestCase):
    def test_sums_window_excludes_other_and_outside_days(self) -> None:
        rows = daily_rows("2026-11-06", "2026-11-12", {
            "deepseek/deepseek-v4.1-flash-20261017": 10,
            "moonshotai/kimi-k3.1-pro-20261023": 4,
        })
        rows.append(
            {
                "date": "2026-11-05",
                "model_permaslug": "deepseek/deepseek-v4.1-flash-20261017",
                "total_tokens": "999",
            }
        )
        rows.append(
            {
                "date": "2026-11-06",
                "model_permaslug": "openai/from-parts",
                "prompt_tokens": "3",
                "completion_tokens": "4",
            }
        )
        items, missing = aggregate_rankings(
            rows,
            date(2026, 11, 6),
            date(2026, 11, 12),
            15,
            ModelCatalog(CATALOG["data"]),
        )
        self.assertEqual(missing, [])
        self.assertEqual(items[0]["model"], "DeepSeek V4.1 Flash 1017")
        self.assertEqual(items[0]["organization"], "deepseek")
        self.assertEqual(items[0]["total_tokens"], "70")
        self.assertEqual([item["model_permaslug"] for item in items], [
            "deepseek/deepseek-v4.1-flash-20261017",
            "moonshotai/kimi-k3.1-pro-20261023",
            "openai/from-parts",
        ])
        self.assertEqual(items[1]["organization"], "moonshot")
        self.assertEqual(items[1]["model"], "Kimi K3.1 Pro")
        self.assertNotIn("other", {item["model_permaslug"] for item in items})

    def test_free_variant_is_not_labeled_as_the_paid_model(self) -> None:
        catalog = ModelCatalog(CATALOG["data"])
        label, org = catalog.lookup("nvidia/nemotron-3-ultra-550b-a55b-20260604:free")
        self.assertEqual(label, "Nemotron 3 Ultra (free)")
        self.assertEqual(org, "nvidia")

    def test_unknown_slug_stays_untranslated(self) -> None:
        label, org = ModelCatalog([]).lookup("stealth/crouton-alpha")
        self.assertEqual(label, "stealth/crouton-alpha")
        self.assertEqual(org, "stealth")

    def test_trillion_rounding_matches_the_chart_scale(self) -> None:
        self.assertEqual(tokens_in_trillions(55788461567730), 55.79)

    def test_tie_breaks_on_permaslug(self) -> None:
        rows = [
            {"date": "2026-11-06", "model_permaslug": "b/model", "total_tokens": "5"},
            {"date": "2026-11-06", "model_permaslug": "a/model", "total_tokens": "5"},
        ]
        items, missing = aggregate_rankings(rows, date(2026, 11, 6), date(2026, 11, 6), 15, ModelCatalog([]))
        self.assertEqual(missing, [])
        self.assertEqual([item["model_permaslug"] for item in items], ["a/model", "b/model"])

    def test_citation(self) -> None:
        self.assertEqual(
            citation_line("https://openrouter.ai/rankings", "2026-11-13T14:55:01.681Z"),
            "Source: OpenRouter (openrouter.ai/rankings), as of 2026-11-13T14:55:01.681Z. Licensed under CC BY 4.0.",
        )
        self.assertEqual(
            citation_line("https://openrouter.ai/apps", "2026-11-13T14:55:01.681Z"),
            "Source: OpenRouter (openrouter.ai/apps), as of 2026-11-13T14:55:01.681Z. Licensed under CC BY 4.0.",
        )


def query(url: str) -> dict[str, list[str]]:
    return parse_qs(urlparse(url).query)


class FetchCommand(unittest.TestCase):
    def setUp(self) -> None:
        self.saved = os.environ.pop("OPENROUTER_API_KEY", None)

    def tearDown(self) -> None:
        if self.saved is None:
            os.environ.pop("OPENROUTER_API_KEY", None)
        else:
            os.environ["OPENROUTER_API_KEY"] = self.saved

    def test_invalid_date_does_not_fetch(self) -> None:
        def boom(*_args, **_kwargs):
            raise AssertionError("fetch called")

        err = io.StringIO()
        with redirect_stderr(err):
            code = main(["--since", "2026-02-30", "--until", "2026-03-01"], fetch=boom)
        self.assertEqual(code, 1)
        self.assertNotIn(SECRET, err.getvalue())

    def test_missing_key_skips_without_fetching(self) -> None:
        def boom(*_args, **_kwargs):
            raise AssertionError("fetch called")

        with tempfile.TemporaryDirectory() as tmp:
            err = io.StringIO()
            out = io.StringIO()
            with redirect_stderr(err), redirect_stdout(out):
                code = main(["--since", SINCE, "--until", UNTIL, "--out-dir", tmp], fetch=boom)
            self.assertEqual(code, 0)
            self.assertIn("skip: no OPENROUTER_API_KEY", err.getvalue())
            self.assertNotIn(SECRET, err.getvalue() + out.getvalue())
            payload = json.loads(Path(tmp, "openrouter-rankings-daily.json").read_text(encoding="utf-8"))
            self.assertTrue(payload["skipped"])
            self.assertFalse(payload["ok"])
            self.assertNotIn(SECRET, json.dumps(payload))

    def test_three_boards_and_redacted_errors(self) -> None:
        os.environ["OPENROUTER_API_KEY"] = SECRET
        calls: list[tuple[str, str]] = []

        def fake(url: str, key: str, _timeout: int):
            calls.append((url, key))
            self.assertNotIn(SECRET, url)
            parsed = urlparse(url)
            if parsed.path == "/api/v1/models":
                self.assertEqual(key, "")
                return 200, CATALOG, None
            if parsed.path.endswith("/rankings-daily"):
                params = query(url)
                self.assertEqual(key, SECRET)
                if params.get("category") == ["programming"]:
                    self.assertEqual(params.get("period"), ["week"])
                    self.assertNotIn("day", params.get("period", []))
                    return 200, {
                        "data": [
                            {"date": "2026-10-26", "model_permaslug": "openai/old", "total_tokens": "1000"},
                            {
                                "date": "2026-11-02",
                                "model_permaslug": "deepseek/deepseek-v4.1-flash-20261017",
                                "total_tokens": "5000",
                            },
                            {"date": "2026-11-02", "model_permaslug": "other", "total_tokens": "9"},
                            {"date": "2026-11-09", "model_permaslug": "openai/partial", "total_tokens": "50"},
                        ],
                        "meta": meta("2026-10-19", UNTIL),
                    }, None
                self.assertEqual(params.get("period"), ["day"])
                self.assertNotIn("category", params)
                self.assertEqual(params.get("start_date"), ["2026-10-30"])
                self.assertEqual(params.get("end_date"), [UNTIL])
                rows = daily_rows("2026-10-30", "2026-11-05", {
                    "moonshotai/kimi-k3.1-pro-20261023": 2,
                })
                rows.extend(daily_rows(SINCE, UNTIL, {
                    "deepseek/deepseek-v4.1-flash-20261017": 10,
                    "moonshotai/kimi-k3.1-pro-20261023": 1,
                }))
                return 200, {"data": rows, "meta": meta("2026-10-30", UNTIL)}, None
            if parsed.path.endswith("/app-rankings"):
                params = query(url)
                self.assertEqual(params.get("sort"), ["popular"])
                self.assertEqual(params.get("start_date"), [SINCE])
                self.assertEqual(params.get("end_date"), [UNTIL])
                if params.get("category") == ["coding"]:
                    return 401, {"error": {"message": f"bad {SECRET}"}}, None
                self.assertNotIn("category", params)
                return 200, {
                    "data": [
                        {"rank": 1, "app_id": 1, "app_name": "Hermes Agent", "total_tokens": "2000", "total_requests": 3},
                        {"rank": 2, "app_id": 2, "app_name": "Claude Code", "total_tokens": "1000", "total_requests": 2},
                    ],
                    "meta": meta(SINCE, UNTIL),
                }, None
            raise AssertionError(url)

        with tempfile.TemporaryDirectory() as tmp:
            err = io.StringIO()
            out = io.StringIO()
            with redirect_stderr(err), redirect_stdout(out):
                code = main(
                    ["--since", SINCE, "--until", UNTIL, "--out-dir", tmp, "--pretty"],
                    fetch=fake,
                    today=date(2026, 11, 13),
                )
            self.assertEqual(code, 0, err.getvalue())
            combined = err.getvalue() + out.getvalue()
            for path in Path(tmp).iterdir():
                combined += path.read_text(encoding="utf-8")
            self.assertNotIn(SECRET, combined)
            usage = json.loads(Path(tmp, "openrouter-rankings-daily.json").read_text(encoding="utf-8"))
            programming = json.loads(Path(tmp, "openrouter-rankings-programming.json").read_text(encoding="utf-8"))
            apps = json.loads(Path(tmp, "openrouter-app-rankings.json").read_text(encoding="utf-8"))
            coding = json.loads(Path(tmp, "openrouter-app-rankings-coding.json").read_text(encoding="utf-8"))
            self.assertTrue(usage["ok"])
            self.assertEqual(usage["items"][0]["model"], "DeepSeek V4.1 Flash 1017")
            self.assertEqual(usage["items"][0]["total_tokens"], "70")
            self.assertEqual(usage["prior_window"], {"start_date": "2026-10-30", "end_date": "2026-11-05"})
            self.assertEqual(usage["prior_items"][0]["model_permaslug"], "moonshotai/kimi-k3.1-pro-20261023")
            self.assertEqual(usage["citation"], citation_line("https://openrouter.ai/rankings", "2026-11-13T14:55:01.681Z"))
            self.assertTrue(programming["ok"])
            self.assertEqual(programming["bucket_date"], "2026-11-02")
            self.assertEqual(programming["window"], {"start_date": "2026-11-02", "end_date": "2026-11-08"})
            self.assertEqual(
                [item["model_permaslug"] for item in programming["items"]],
                ["deepseek/deepseek-v4.1-flash-20261017"],
            )
            self.assertFalse(programming["quality_ranking"])
            self.assertEqual(apps["items"][0]["model"], "Hermes Agent")
            self.assertEqual(apps["items"][0]["organization"], "app")
            self.assertIn("openrouter.ai/apps", apps["citation"])
            self.assertFalse(coding["ok"])
            self.assertIn("[redacted]", coding["error"])
            self.assertIn("warn: apps-coding", err.getvalue())
            self.assertTrue(any(item[0].endswith("/api/v1/models") for item in calls))

    def test_failed_main_board_still_writes_the_others(self) -> None:
        os.environ["OPENROUTER_API_KEY"] = SECRET

        def fake(url: str, key: str, _timeout: int):
            self.assertNotIn(SECRET, url)
            parsed = urlparse(url)
            if parsed.path == "/api/v1/models":
                return 200, CATALOG, None
            if "category=programming" in url:
                return 500, {"error": {"message": "nope"}}, None
            if parsed.path.endswith("/app-rankings"):
                return 200, {
                    "data": [{"rank": 1, "app_id": 1, "app_name": "Hermes Agent", "total_tokens": "10"}],
                    "meta": meta(SINCE, UNTIL),
                }, None
            return 200, {
                "data": daily_rows(SINCE, UNTIL, {"deepseek/deepseek-v4.1-flash-20261017": 1}),
                "meta": meta(SINCE, UNTIL),
            }, None

        with tempfile.TemporaryDirectory() as tmp:
            err = io.StringIO()
            with redirect_stderr(err), redirect_stdout(io.StringIO()):
                code = main(
                    ["--since", SINCE, "--until", UNTIL, "--out-dir", tmp, "--no-coding"],
                    fetch=fake,
                )
            self.assertEqual(code, 1)
            self.assertNotIn(SECRET, err.getvalue())
            usage = json.loads(Path(tmp, "openrouter-rankings-daily.json").read_text(encoding="utf-8"))
            programming = json.loads(Path(tmp, "openrouter-rankings-programming.json").read_text(encoding="utf-8"))
            self.assertTrue(usage["ok"])
            self.assertFalse(programming["ok"])
            self.assertFalse(Path(tmp, "openrouter-app-rankings-coding.json").exists())


if __name__ == "__main__":
    unittest.main()
