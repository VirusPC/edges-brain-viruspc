"""Offline reporting contracts, using synthetic data and the local protocol archive."""
from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

PROGRAM = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROGRAM))
import report


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.run = self.base / "run"
        self.run.mkdir()
        (self.run / "source").mkdir()
        shutil.copyfile(PROGRAM / "metrics.py", self.run / "source/metrics.py")
        self.output = self.base / "report"
        self.memories = [{
            "memory_id": f"memory-{i}", "scope": "project", "title": f"PRIVATE_TITLE_{i}",
            "body": f"PRIVATE_BODY_{i}", "available_at": "2026-01-01T00:00:00Z", "source": {},
        } for i in range(6)]
        self.memories.append({**self.memories[0], "memory_id": "future",
                              "available_at": "2026-02-01T00:00:00Z"})
        self.cases = [{
            "case_id": f"private-case-{i}", "question": f"PRIVATE_QUESTION_{i}",
            "query_at": "2026-02-01T00:00:00Z", "scope": "project" if i < 2 else ".",
            "scope_evidence": {"kind": "explicit-user-path" if i < 2 else "unknown"},
            "gold_memory_ids": [m["memory_id"] for m in self.memories[:6]] if i == 0 else
                               ["memory-0"] if i == 1 else [],
            "source": {"session_id": f"PRIVATE_SESSION_{i // 2}", "trace_id": f"PRIVATE_TRACE_{i}"},
            "task_mode": "memory_qa" if i != 1 else "pre_task_retrieval", "split": "test",
        } for i in range(3)]
        self.dataset = {"schema_version": 1, "memories": self.memories, "cases": self.cases}
        self.plan, self.rows = [], []
        for i, case in enumerate(self.cases):
            for ci, condition in enumerate(report.CONDITIONS):
                for repeat in (1, 2):
                    entry = {"trial_id": f"trial-{i}-{condition}-{repeat}", "case_id": case["case_id"],
                             "condition": condition, "repeat": repeat}
                    self.plan.append(entry)
                    quality = (0.5 - 0.25 * ci) if case["gold_memory_ids"] else None
                    self.rows.append({**entry, "task_mode": case["task_mode"], "error": None,
                                      "selected_recall_at_5": quality, "evidence_recall_at_5": quality,
                                      "precision_at_5": quality, "mrr": quality,
                                      "answer_checks_pass": None, "input_tokens": 100 + 10 * ci,
                                      "output_tokens": 20, "cached_input_tokens": 40,
                                      "uncached_input_tokens": 60 + 10 * ci, "total_tokens": 120 + 10 * ci,
                                      "agent_latency_ms": ((1000, 99000) if i == 0 else
                                                           (2000, 2000) if i == 1 else (3000, 3000))[repeat - 1],
                                      "tool_calls": 2, "answer": f"PRIVATE_ANSWER_{i}",
                                      "raw_answer": f"PRIVATE_RAW_ANSWER_{i}"})
        self.manifest = {"model": "fixture-model", "codex_version": "fixture-cli", "harbor_version": "fixture-harbor",
                         "reasoning_effort": "low", "timeout_sec": 180, "prompt_version": "fixture-prompt",
                         "prompt_sha256": {c["case_id"]: "PRIVATE_PROMPT_HASH" for c in self.cases},
                         "split": "test", "limit": None, "cases": len(self.cases),
                         "repeats": 2, "planned_trials": len(self.plan), "seed": 9}
        self.save()

    def save(self):
        for name, value in (("dataset.json", self.dataset), ("plan.json", self.plan), ("trials.json", self.rows)):
            (self.run / name).write_text(json.dumps(value), encoding="utf-8")
        self.manifest["dataset_sha256"] = report.sha256(self.run / "dataset.json")
        self.manifest["program_sha256"] = {"metrics.py": report.sha256(self.run / "source/metrics.py")}
        (self.run / "manifest.json").write_text(json.dumps(self.manifest), encoding="utf-8")

    def make_report(self):
        return report.generate(self.run, self.output, bootstrap=30)

    def test_concurrent_latency_context_is_disclosed(self):
        self.manifest.update(concurrency=6, latency_context={'interpretation': 'six simultaneous jobs; shared host'}, execution_wall_ms=12345)
        self.save()
        result = self.make_report()
        self.assertEqual(result['manifest_summary']['concurrency'], 6)
        self.assertEqual(result['manifest_summary']['execution_wall_ms'], 12345)
        markdown = (self.output / 'report.md').read_text()
        self.assertIn('| 最大并发 trial | 6 |', markdown)
        self.assertIn('six simultaneous jobs; shared host', markdown)

    def read_csv(self, name):
        with (self.output / name).open(newline="", encoding="utf-8") as stream:
            return list(csv.DictReader(stream))

    def test_complete_tracks_pairing_raw_distributions_and_card(self):
        result = self.make_report()
        self.assertEqual(set(result["tracks"]), set(report.TRACKS))
        full = result["tracks"]["all"]
        self.assertTrue(full["complete_execution_matrix"])
        self.assertEqual(full["dataset_card"]["source_sessions"], 2)
        self.assertEqual(full["dataset_card"]["gold_above_five_cases"], 1)
        self.assertEqual(full["dataset_card"]["scope_unknown_fraction"], 1 / 3)
        self.assertEqual(full["dataset_card"]["visible_memory_min"], 6)
        self.assertEqual(result["cases"][0]["recall_at_5_ceiling"], 5 / 6)
        self.assertEqual(result["tracks"]["scope_known"]["dataset_card"]["cases"], 2)
        self.assertEqual(result["tracks"]["scope_unknown"]["dataset_card"]["cases"], 1)
        comparison = full["paired_comparisons"]["scoped-vs-root"]
        self.assertEqual(comparison["selected_recall_at_5"]["delta_left_minus_right"], 0.25)
        self.assertEqual(comparison["selected_recall_at_5"]["paired_cases"], 2)
        self.assertEqual(comparison["selected_recall_at_5"]["independent_source_sessions"], 1)
        self.assertIsNone(comparison["selected_recall_at_5"]["ci95"])
        self.assertEqual(comparison["total_tokens"]["independent_source_sessions"], 2)
        self.assertIsNotNone(comparison["total_tokens"]["ci95"])
        latency = full["by_condition"]["scoped"]["metrics"]["agent_latency_ms"]
        self.assertEqual(latency["median"], 3000)
        self.assertEqual(latency["raw_trial_distribution"]["median"], 2500)
        self.assertEqual(latency["raw_trial_distribution"]["p95"], 75000)
        pairs = self.read_csv("paired-comparisons.csv")
        self.assertEqual({row["comparison"] for row in pairs}, {"scoped-vs-root", "scoped-vs-none", "root-vs-none"})
        conditions = self.read_csv("condition-metrics.csv")
        raw = next(row for row in conditions if row["track"] == "all" and row["condition"] == "scoped" and row["metric"] == "agent_latency_ms")
        self.assertEqual(float(raw["raw_trial_median"]), 2500)

    def test_privacy_and_exact_native_command_audit(self):
        log = self.run / "jobs" / self.plan[0]["trial_id"] / "harbor-job/agent/codex.txt"
        log.parent.mkdir(parents=True)
        events = [
            {"type": "item.started", "item": {"type": "command_execution", "command": "NOT_COMPLETED_COMMAND"}},
            {"type": "item.completed", "item": {"id": "cmd-1", "type": "command_execution",
                "command": "printf PRIVATE_COMMAND_curl_web_search", "aggregated_output": "PRIVATE_TOOL_OUTPUT",
                "status": "completed", "exit_code": 0}},
            {"type": "item.completed", "item": {"type": "agent_message", "text": "PRIVATE_AGENT_ANSWER"}},
            {"type": "item.completed", "item": {"type": "file_change", "changes": []}},
            {"type": "item.completed", "item": {"type": "web_search", "query": "PRIVATE_WEB_QUERY"}},
        ]
        log.write_text("prefix not JSON\n" + "\n".join(json.dumps(e) for e in events))
        result = self.make_report()
        markdown = (self.output / "report.md").read_text()
        for private_text in ("PRIVATE_", "private-case-", "trial-0-", "cmd-1"):
            self.assertNotIn(private_text, markdown)
        commands = (self.output / "tool-commands.jsonl").read_text()
        parsed = [json.loads(line) for line in commands.splitlines()]
        self.assertEqual(len(parsed), 1)
        self.assertIn("PRIVATE_COMMAND", parsed[0]["command"])
        self.assertNotIn("PRIVATE_TOOL_OUTPUT", commands)
        self.assertNotIn("PRIVATE_AGENT_ANSWER", commands)
        self.assertNotIn("NOT_COMPLETED_COMMAND", commands)
        self.assertEqual(result["tool_audit"]["web_search_events"], 1)
        self.assertEqual(result["tool_audit"]["command_execution_events"], 1)
        self.assertEqual(result["tool_audit"]["file_change_events"], 1)
        self.assertEqual((self.output / "tool-commands.jsonl").stat().st_mode & 0o777, 0o600)

    def test_uses_archived_protocol_and_preserves_extra_metric(self):
        source = self.run / "source/metrics.py"
        source.write_text(source.read_text() + '\nMETRICS = METRICS + ("content_recall_at_5",)\n')
        for row in self.rows:
            row["content_recall_at_5"] = 0.125
        self.save()
        before = {p.relative_to(self.run): hashlib.sha256(p.read_bytes()).hexdigest()
                  for p in self.run.rglob("*") if p.is_file()}
        result = self.make_report()
        self.assertEqual(result["tracks"]["all"]["by_condition"]["scoped"]["metrics"]["content_recall_at_5"]["mean"], 0.125)
        self.assertTrue(any(row["metric"] == "content_recall_at_5" for row in self.read_csv("paired-comparisons.csv")))
        after = {p.relative_to(self.run): hashlib.sha256(p.read_bytes()).hexdigest()
                 for p in self.run.rglob("*") if p.is_file()}
        self.assertEqual(before, after)
        self.assertFalse((self.run / "source/__pycache__").exists())

    def test_incomplete_matrix_is_explicit_and_does_not_show_pair_effect_table(self):
        # Remove one observation in each scope and task stratum, keeping the plan.
        self.rows = [row for row in self.rows if not (row["condition"] == "root" and row["repeat"] == 2)]
        self.save()
        result = self.make_report()
        self.assertFalse(result["tracks"]["all"]["complete_execution_matrix"])
        self.assertEqual(result["tracks"]["all"]["status"], "incomplete")
        markdown = (self.output / "report.md").read_text()
        self.assertIn("矩阵尚未完成", markdown)
        self.assertNotIn("| 指标 | 配对差值 |", markdown)
        self.assertTrue(all(row["matrix_status"] == "incomplete" for row in self.read_csv("paired-comparisons.csv")))
        matrix = self.read_csv("matrix.csv")
        self.assertEqual(len(matrix), len(self.plan))
        self.assertEqual(sum(row["execution_status"] == "missing" for row in matrix), 3)

    def test_failure_preserves_cost_and_reduces_quality_coverage(self):
        failed = self.rows[0]
        failed["error"] = "fixture:timeout"
        for field in ("selected_recall_at_5", "evidence_recall_at_5", "precision_at_5", "mrr"):
            failed[field] = None
        self.save()
        result = self.make_report()
        summary = result["tracks"]["all"]
        self.assertEqual(summary["failed_trials"], 1)
        self.assertFalse(summary["complete_execution_matrix"])
        side = summary["by_condition"]["scoped"]["metrics"]
        self.assertEqual(side["selected_recall_at_5"]["complete_cases"], 1)
        self.assertEqual(side["selected_recall_at_5"]["mean"], 0.5)
        self.assertEqual(side["total_tokens"]["complete_cases"], 3)
        self.assertEqual(side["total_tokens"]["mean"], 120)
        self.assertIn("质量值不将失败填成零", (self.output / "report.md").read_text())
        self.assertEqual(sum(row["execution_status"] == "failed" for row in self.read_csv("matrix.csv")), 1)

    def test_declared_complete_plan_cannot_omit_an_arm(self):
        self.plan = [p for p in self.plan if p["condition"] != "none"]
        self.rows = [p for p in self.rows if p["condition"] != "none"]
        self.manifest["planned_trials"] = len(self.plan)
        self.save()
        with self.assertRaisesRegex(ValueError, "complete case"):
            self.make_report()
        self.assertFalse(self.output.exists())

    def test_failure_cannot_reuse_stale_or_zero_filled_quality(self):
        self.rows[0]["error"] = "fixture:timeout"
        self.rows[0]["selected_recall_at_5"] = 0.0
        self.save()
        with self.assertRaisesRegex(ValueError, "null quality metrics"):
            self.make_report()

    def test_non_string_session_is_counted_as_missing_not_independent(self):
        self.cases[0]["source"]["session_id"] = 1
        card, details = report.case_card(self.cases, self.memories)
        self.assertEqual(card["cases_without_session"], 1)
        self.assertEqual(card["source_sessions"], 2)
        self.assertFalse(details[0]["has_source_session"])

    def test_frozen_data_and_protocol_hashes_are_verified(self):
        for name in ("dataset.json", "source/metrics.py"):
            with self.subTest(name=name):
                path = self.run / name
                previous = path.read_bytes()
                path.write_bytes(previous + b"\n")
                with self.assertRaises(ValueError):
                    self.make_report()
                path.write_bytes(previous)
        self.assertFalse(self.output.exists())

    def test_no_protocol_fallback_and_no_output_inside_run(self):
        source = self.run / "source/metrics.py"
        source.unlink()
        with self.assertRaisesRegex(ValueError, "refusing current-code fallback"):
            self.make_report()
        shutil.copyfile(PROGRAM / "metrics.py", source)
        with self.assertRaisesRegex(ValueError, "outside"):
            report.generate(self.run, self.run / "report", bootstrap=0)

    def test_future_gold_rejected_and_existing_output_preserved(self):
        self.cases[0]["gold_memory_ids"].append("future")
        self.save()
        with self.assertRaisesRegex(ValueError, "strictly available"):
            self.make_report()
        self.cases[0]["gold_memory_ids"].remove("future")
        self.save()
        self.output.mkdir()
        (self.output / "keep.txt").write_text("original")
        with self.assertRaises(FileExistsError):
            self.make_report()
        self.assertEqual(list(self.output.iterdir()), [self.output / "keep.txt"])

    def test_missing_trials_and_missing_optional_metadata_remain_unknown(self):
        (self.run / "trials.json").unlink()
        self.manifest.pop("prompt_version")
        self.manifest.pop("prompt_sha256")
        self.manifest.pop("model")
        (self.run / "manifest.json").write_text(json.dumps(self.manifest))
        result = self.make_report()
        side = result["tracks"]["all"]["by_condition"]["scoped"]
        self.assertIsNone(side["failure_rate"])
        self.assertIsNone(side["metrics"]["selected_recall_at_5"]["mean"])
        self.assertIn("manifest 未记录", (self.output / "report.md").read_text())


if __name__ == "__main__":
    unittest.main()
