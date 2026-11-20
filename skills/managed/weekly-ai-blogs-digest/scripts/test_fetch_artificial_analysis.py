#!/usr/bin/env python3
"""Retry and pagination tests for fetch_artificial_analysis.py. No network."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_artificial_analysis import (  # noqa: E402
    FREE_URL,
    MAX_ATTEMPTS,
    PRO_URL,
    backoff_seconds,
    collect,
    fetch_page,
    is_retryable,
    lean_model,
)


def model(name: str, score: float) -> dict:
    return {
        "name": name,
        "slug": name.lower().replace(" ", "-"),
        "model_creator": {"name": "OpenAI"},
        "evaluations": {"artificial_analysis_intelligence_index": score},
        "pricing": {},
        "release_date": "2026-11-17",
    }


def page(names: list[tuple[str, float]], has_more: bool) -> dict:
    return {
        "data": [model(name, score) for name, score in names],
        "pagination": {"has_more": has_more},
        "tier": "free",
        "intelligence_index_version": 5,
    }


class LeanModelTests(unittest.TestCase):
    def test_keeps_free_speed_fields_and_drops_pro_percentiles(self) -> None:
        row = {
            "name": "GLM-5.3 (Max)",
            "slug": "glm-5-3",
            "release_date": "2026-08-18",
            "model_creator": {"name": "Z AI"},
            "evaluations": {
                "artificial_analysis_intelligence_index": 31.7,
                "artificial_analysis_coding_index": None,
            },
            "pricing": {"price_1m_input_tokens": 1.4, "price_1m_output_tokens": 4.4},
            "performance": {
                "median_output_tokens_per_second": 80.07,
                "median_time_to_first_token_seconds": 2.22,
                "median_time_to_first_answer_token_seconds": 27.19,
                "median_end_to_end_response_time_seconds": 33.44,
                "percentile_95_output_tokens_per_second": 117.05,
            },
            "performance_v3": {
                "mean_output_tokens_per_second": 62.36,
                "mean_time_to_first_token_seconds": 3.45,
                "mean_time_to_first_answer_token_seconds": 79.11,
                "time_per_task_seconds": 1907.94,
                "workloads": {"1k": {"mean_time_to_first_token_seconds": 1.96}},
            },
            "openrouter_api_id": "z-ai/glm-5.3",
        }
        item = lean_model(row)
        self.assertEqual(
            item["performance"],
            {
                "median_output_tokens_per_second": 80.07,
                "median_time_to_first_token_seconds": 2.22,
                "median_time_to_first_answer_token_seconds": 27.19,
                "median_end_to_end_response_time_seconds": 33.44,
            },
        )
        self.assertEqual(
            item["performance_v3"],
            {
                "mean_output_tokens_per_second": 62.36,
                "mean_time_to_first_token_seconds": 3.45,
                "mean_time_to_first_answer_token_seconds": 79.11,
            },
        )
        self.assertNotIn("openrouter_api_id", item)
        self.assertNotIn("percentile_95_output_tokens_per_second", json.dumps(item))

    def test_missing_performance_is_null_fields_not_dropped(self) -> None:
        item = lean_model({"name": "A", "slug": "a", "evaluations": {}, "pricing": {}})
        self.assertEqual(set(item["performance"].values()), {None})
        self.assertEqual(set(item["performance_v3"].values()), {None})


class RetryTests(unittest.TestCase):
    def test_backoff_grows_then_caps(self) -> None:
        self.assertEqual([backoff_seconds(n) for n in range(1, 7)], [0.5, 1.0, 2.0, 4.0, 8.0, 8.0])

    def test_transport_and_json_are_retryable_but_not_403(self) -> None:
        self.assertTrue(is_retryable(0, "URLError: SSL: UNEXPECTED_EOF_WHILE_READING"))
        self.assertTrue(is_retryable(503, None))
        self.assertTrue(is_retryable(200, "JSONDecodeError: truncated"))
        self.assertFalse(is_retryable(403, None))
        self.assertFalse(is_retryable(404, "HTTP 404"))

    def test_success_does_not_sleep(self) -> None:
        sleeps: list[float] = []

        def fetch(url: str, key: str, timeout: int):
            return 200, page([("A", 1)], False), None

        status, payload, error = fetch_page(
            FREE_URL, "k", 1, attempts=MAX_ATTEMPTS, sleep=sleeps.append, fetch=fetch
        )
        self.assertEqual(status, 200)
        self.assertIsNone(error)
        self.assertEqual(payload["data"][0]["name"], "A")
        self.assertEqual(sleeps, [])

    def test_tls_eof_then_success_backs_off(self) -> None:
        sleeps: list[float] = []
        calls = {"n": 0}

        def fetch(url: str, key: str, timeout: int):
            calls["n"] += 1
            if calls["n"] < 3:
                return 0, None, "URLError: SSL: UNEXPECTED_EOF_WHILE_READING"
            return 200, page([("A", 1)], False), None

        status, _payload, error = fetch_page(
            FREE_URL, "k", 1, attempts=MAX_ATTEMPTS, sleep=sleeps.append, fetch=fetch
        )
        self.assertEqual(status, 200)
        self.assertIsNone(error)
        self.assertEqual(calls["n"], 3)
        self.assertEqual(sleeps, [0.5, 1.0])

    def test_exhausted_retries_return_the_last_error(self) -> None:
        calls = {"n": 0}

        def fetch(url: str, key: str, timeout: int):
            calls["n"] += 1
            return 0, None, "URLError: SSL: UNEXPECTED_EOF_WHILE_READING"

        status, _payload, error = fetch_page(
            FREE_URL, "secret-key", 1, attempts=4, sleep=lambda _seconds: None, fetch=fetch
        )
        self.assertEqual(status, 0)
        self.assertEqual(calls["n"], 4)
        self.assertIn("UNEXPECTED_EOF", error or "")
        self.assertNotIn("secret-key", error or "")

    def test_http_403_is_not_retried(self) -> None:
        calls = {"n": 0}

        def fetch(url: str, key: str, timeout: int):
            calls["n"] += 1
            return 403, {"error": "forbidden"}, None

        status, payload, error = fetch_page(
            PRO_URL, "k", 1, attempts=MAX_ATTEMPTS, sleep=lambda _seconds: None, fetch=fetch
        )
        self.assertEqual(status, 403)
        self.assertEqual(calls["n"], 1)
        self.assertIsNone(error)
        self.assertEqual(payload["error"], "forbidden")


class CollectTests(unittest.TestCase):
    def test_later_page_recovers_after_tls_eof(self) -> None:
        calls = {"page2": 0}

        def fetch(url: str, key: str, timeout: int):
            if "page=" not in url:
                return 200, page([("A", 2)], True), None
            calls["page2"] += 1
            if calls["page2"] < 3:
                return 0, None, "URLError: SSL: UNEXPECTED_EOF_WHILE_READING"
            return 200, page([("B", 1)], False), None

        payload = collect("k", 1, 0, 5, False, attempts=MAX_ATTEMPTS, sleep=lambda _s: None, fetch=fetch)
        self.assertTrue(payload["ok"])
        self.assertEqual([item["name"] for item in payload["items"]], ["A", "B"])
        self.assertEqual(payload["fetched_models"], 2)
        self.assertEqual(calls["page2"], 3)

    def test_later_page_failure_is_an_error_not_a_short_ok_list(self) -> None:
        calls = {"n": 0}

        def fetch(url: str, key: str, timeout: int):
            calls["n"] += 1
            if "page=" not in url:
                return 200, page([("A", 9), ("B", 8)], True), None
            return 0, None, "URLError: SSL: UNEXPECTED_EOF_WHILE_READING"

        payload = collect("k", 1, 0, 5, False, attempts=3, sleep=lambda _s: None, fetch=fetch)
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["items"], [])
        self.assertNotIn("fetched_models", payload)
        self.assertIn("第 2 页在 3 次尝试后失败", payload["error"])
        self.assertIn("UNEXPECTED_EOF", payload["error"])
        self.assertEqual(calls["n"], 4)

    def test_definitive_http_error_on_a_later_page_does_not_retry(self) -> None:
        calls = {"n": 0}

        def fetch(url: str, key: str, timeout: int):
            calls["n"] += 1
            if "page=" not in url:
                return 200, page([("A", 1)], True), None
            return 400, {"error": "bad page"}, None

        payload = collect("k", 1, 0, 5, False, attempts=MAX_ATTEMPTS, sleep=lambda _s: None, fetch=fetch)
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["items"], [])
        self.assertIn("第 2 页", payload["error"])
        self.assertIn("bad page", payload["error"])
        self.assertEqual(calls["n"], 2)

    def test_pro_403_falls_back_once_without_retrying_the_403(self) -> None:
        seen: list[str] = []

        def fetch(url: str, key: str, timeout: int):
            seen.append(url)
            if url == PRO_URL:
                return 403, {"error": "pro required"}, None
            return 200, page([("Free", 3)], False), None

        payload = collect("k", 1, 0, 5, True, attempts=MAX_ATTEMPTS, sleep=lambda _s: None, fetch=fetch)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["endpoint"], FREE_URL)
        self.assertEqual(seen, [PRO_URL, FREE_URL])
        self.assertEqual(payload["items"][0]["name"], "Free")


if __name__ == "__main__":
    unittest.main()
