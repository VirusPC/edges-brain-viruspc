#!/usr/bin/env python3
"""Official-endpoint catalog tests. No network."""

from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_openrouter_endpoints import (  # noqa: E402
    collect,
    main,
    match_openrouter_slug,
    plain_models,
    summarize_endpoints,
)

SECRET = "endpoint-key-should-not-leak"


def endpoint(provider: str, tag: str, tier, latency_ms, throughput) -> dict:
    return {
        "provider_name": provider,
        "tag": tag,
        "service_tier": tier,
        "latency_last_30m": None if latency_ms is None else {"p50": latency_ms},
        "throughput_last_30m": None if throughput is None else {"p50": throughput},
    }


CATALOG = {
    "data": [
        {"id": "openai/gpt-6.2-astra", "canonical_slug": "openai/gpt-6.2-astra-20261117"},
        {"id": "openai/gpt-6.2-astra:batch", "canonical_slug": "openai/gpt-6.2-astra-20261117"},
        {"id": "openai/gpt-6.2-astra-pro", "canonical_slug": "openai/gpt-6.2-astra-pro-20261117"},
        {"id": "google/gemini-4-neon", "canonical_slug": "google/gemini-4-neon-20261118"},
        {"id": "qwen/qwen4-max", "canonical_slug": "qwen/qwen4-max-20261115"},
        {"id": "deepseek/deepseek-v4.1-flash-1017", "canonical_slug": "deepseek/deepseek-v4.1-flash-20261017"},
        {"id": "a/shared", "canonical_slug": "a/shared"},
        {"id": "b/shared", "canonical_slug": "b/shared"},
    ]
}


def aa_item(slug: str, score: float = 10) -> dict:
    return {"slug": slug, "name": slug, "intelligence_index": score}


class Matching(unittest.TestCase):
    def setUp(self) -> None:
        self.catalog = plain_models(CATALOG["data"])

    def test_exact_effort_and_pro_stay_distinct(self) -> None:
        self.assertEqual(match_openrouter_slug("gpt-6-2-astra", self.catalog), "openai/gpt-6.2-astra")
        self.assertEqual(match_openrouter_slug("gpt-6-2-astra-xhigh", self.catalog), "openai/gpt-6.2-astra")
        self.assertEqual(match_openrouter_slug("gpt-6-2-astra-pro", self.catalog), "openai/gpt-6.2-astra-pro")
        self.assertEqual(match_openrouter_slug("gemini-4-neon-high", self.catalog), "google/gemini-4-neon")
        self.assertEqual(match_openrouter_slug("qwen4-max", self.catalog), "qwen/qwen4-max")

    def test_batch_variant_is_not_a_catalog_id(self) -> None:
        self.assertNotIn("openai/gpt-6.2-astra:batch", [ident for ident, _tail in self.catalog])

    def test_ambiguous_tail_is_left_unmatched(self) -> None:
        self.assertIsNone(match_openrouter_slug("shared", self.catalog))

    def test_non_effort_suffix_is_left_unmatched(self) -> None:
        self.assertIsNone(match_openrouter_slug("gpt-6-2-astra-preview", self.catalog))


class OfficialStandard(unittest.TestCase):
    def test_astra_keeps_only_the_openai_standard_endpoint(self) -> None:
        summary = summarize_endpoints(
            [
                endpoint("OpenAI", "openai", None, 2700, 37),
                endpoint("Azure", "azure", None, 3991, 53),
                endpoint("Amazon Bedrock", "amazon-bedrock/global", None, 1875, 71),
                endpoint("OpenAI", "openai/fast", "priority", 1480, 78.5),
                endpoint("OpenAI", "openai/ultrafast", "ultrafast", None, None),
            ],
            "openai",
        )
        self.assertEqual(summary["latency_s"], 2.7)
        self.assertEqual(summary["throughput_tps"], 37)
        self.assertEqual([item["tag"] for item in summary["endpoints_considered"]], ["openai"])

    def test_neon_median_uses_both_official_standard_endpoints(self) -> None:
        summary = summarize_endpoints(
            [
                endpoint("Google AI Studio", "google-ai-studio/flex", "flex", 5901, 74),
                endpoint("Google AI Studio", "google-ai-studio", None, 4396, 80),
                endpoint("Google", "google-vertex/global", None, 3062.5, 83),
                endpoint("Google", "google-vertex/global/priority", "priority", 2347.5, 66),
            ],
            "google",
        )
        self.assertEqual(summary["latency_s"], 3.72925)
        self.assertEqual(summary["throughput_tps"], 81.5)
        self.assertEqual(
            [item["tag"] for item in summary["endpoints_considered"]],
            ["google-ai-studio", "google-vertex/global"],
        )

    def test_qwen_accepts_the_alibaba_alias_and_deepseek_drops_hosts(self) -> None:
        qwen = summarize_endpoints([endpoint("Alibaba", "alibaba", None, 2587.5, 42)], "qwen")
        self.assertEqual(qwen["latency_s"], 2.5875)
        hosted = summarize_endpoints(
            [
                endpoint("DeepInfra", "deepinfra/fp8", None, 100, 200),
                endpoint("DeepSeek", "deepseek", None, 400, 50),
            ],
            "deepseek",
        )
        self.assertEqual([item["tag"] for item in hosted["endpoints_considered"]], ["deepseek"])
        self.assertEqual(hosted["latency_s"], 0.4)


class FetchCommand(unittest.TestCase):
    def setUp(self) -> None:
        self.saved = os.environ.pop("OPENROUTER_API_KEY", None)

    def tearDown(self) -> None:
        if self.saved is None:
            os.environ.pop("OPENROUTER_API_KEY", None)
        else:
            os.environ["OPENROUTER_API_KEY"] = self.saved

    def test_missing_key_skips_without_fetching(self) -> None:
        def boom(*_args, **_kwargs):
            raise AssertionError("fetch called")

        with tempfile.TemporaryDirectory() as tmp:
            aa = Path(tmp, "aa.json")
            aa.write_text(json.dumps({"items": [aa_item("gpt-6-2-astra")]}), encoding="utf-8")
            out = Path(tmp, "openrouter-official-endpoints.json")
            err = io.StringIO()
            with redirect_stderr(err), redirect_stdout(io.StringIO()):
                code = main(["--aa", str(aa), "--out", str(out)], fetch=boom)
            self.assertEqual(code, 0)
            self.assertIn("skip: no OPENROUTER_API_KEY", err.getvalue())
            payload = json.loads(out.read_text(encoding="utf-8"))
            self.assertTrue(payload["skipped"])
            self.assertFalse(payload["ok"])
            self.assertEqual(payload["items"], [])

    def test_collects_official_latency_and_redacts_the_key(self) -> None:
        os.environ["OPENROUTER_API_KEY"] = SECRET
        calls = []

        def fake(url: str, key: str, _timeout: int):
            calls.append((url, key))
            self.assertNotIn(SECRET, url)
            if url.endswith("/api/v1/models"):
                self.assertEqual(key, "")
                return 200, CATALOG, None
            if url.endswith("/models/openai/gpt-6.2-astra/endpoints"):
                self.assertEqual(key, SECRET)
                return 200, {"data": {"endpoints": [
                    endpoint("OpenAI", "openai", None, 2700, 37),
                    endpoint("Azure", "azure", None, 1000, 10),
                ]}}, None
            if url.endswith("/models/google/gemini-4-neon/endpoints"):
                return 200, {"data": {"endpoints": [
                    endpoint("Google AI Studio", "google-ai-studio", None, 4396, 80),
                    endpoint("Google", "google-vertex/global", None, 3062.5, 83),
                    endpoint("Google", "google-vertex/global/priority", "priority", 1, 1),
                ]}}, None
            if url.endswith("/models/qwen/qwen4-max/endpoints"):
                return 500, {"error": {"message": f"bad {SECRET}"}}, None
            raise AssertionError(url)

        items = [
            aa_item("gpt-6-2-astra", 62.1),
            aa_item("gpt-6-2-astra-xhigh", 61.6),
            aa_item("gemini-4-neon-high", 59.6),
            aa_item("qwen4-max", 42.9),
            {"slug": "no-score", "intelligence_index": None},
        ]
        payload = collect(fake, SECRET, 1, items, attempts=1, sleep=lambda _seconds: None)
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["items"], [])
        self.assertIn("[redacted]", payload["error"])
        self.assertNotIn(SECRET, json.dumps(payload))
        self.assertTrue(any(url.endswith("/api/v1/models") and key == "" for url, key in calls))

    def test_ranks_unique_slugs_once(self) -> None:
        os.environ["OPENROUTER_API_KEY"] = SECRET

        def fake(url: str, key: str, _timeout: int):
            if url.endswith("/api/v1/models"):
                return 200, CATALOG, None
            if url.endswith("/models/openai/gpt-6.2-astra/endpoints"):
                return 200, {"data": {"endpoints": [endpoint("OpenAI", "openai", None, 2700, 37)]}}, None
            if url.endswith("/models/google/gemini-4-neon/endpoints"):
                return 200, {"data": {"endpoints": [
                    endpoint("Google AI Studio", "google-ai-studio", None, 4000, 80),
                    endpoint("Google", "google-vertex/global", None, 2000, 80),
                ]}}, None
            if url.endswith("/models/qwen/qwen4-max/endpoints"):
                return 200, {"data": {"endpoints": [endpoint("Alibaba", "alibaba", None, 1000, 42)]}}, None
            raise AssertionError(url)

        items = [
            aa_item("gpt-6-2-astra", 62.1),
            aa_item("gpt-6-2-astra-high", 60.1),
            aa_item("gemini-4-neon", 61.4),
            aa_item("qwen4-max", 42.9),
        ]
        payload = collect(fake, SECRET, 1, items, attempts=1, sleep=lambda _seconds: None)
        self.assertTrue(payload["ok"], payload.get("error"))
        by_slug = {item["openrouter_slug"]: item for item in payload["items"]}
        self.assertEqual(set(by_slug), {
            "openai/gpt-6.2-astra",
            "google/gemini-4-neon",
            "qwen/qwen4-max",
        })
        self.assertEqual(by_slug["openai/gpt-6.2-astra"]["aa_slugs"], ["gpt-6-2-astra", "gpt-6-2-astra-high"])
        self.assertEqual(by_slug["qwen/qwen4-max"]["rank"], 1)
        self.assertEqual(by_slug["google/gemini-4-neon"]["latency_s"], 3)
        self.assertEqual(by_slug["openai/gpt-6.2-astra"]["rank"], 2)
        self.assertEqual(by_slug["google/gemini-4-neon"]["rank"], 3)
        self.assertEqual(by_slug["openai/gpt-6.2-astra"]["rank_of"], 3)
        self.assertNotIn(SECRET, json.dumps(payload))


if __name__ == "__main__":
    unittest.main()
