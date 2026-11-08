"""Offline invariants: temporal leakage, retrieval evidence, and paired statistics."""
from __future__ import annotations

import copy
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import metrics
import run


def fixture() -> dict:
    return {
        "schema_version": 1,
        "memories": [
            {"memory_id": "m1", "scope": ".", "title": "Global policy", "body": "Use a review before release.",
             "available_at": "2026-01-01T00:00:00Z", "source": {"trace_id": "origin-1"}},
            {"memory_id": "m2", "scope": "alpha/service", "title": "Service policy", "body": "Release from branch named stable.",
             "available_at": "2026-01-02T00:00:00Z", "source": {"trace_id": "origin-2"}},
            {"memory_id": "future", "scope": "beta", "title": "Future policy", "body": "A later unknown policy.",
             "available_at": "2026-02-01T00:00:00Z", "source": {"trace_id": "origin-3"}},
        ],
        "cases": [
            {"case_id": "q1", "question": "Which branch is used to release this service?",
             "query_at": "2026-01-10T00:00:00Z", "scope": "alpha/service", "gold_memory_ids": ["m2"],
             "answer_checks": [{"check_id": "branch", "pattern": "stable"}], "forbidden_patterns": ["main"],
             "source": {"session_id": "session-1", "trace_id": "query-1"}, "split": "test"},
        ],
    }


def events(answer: dict, *, outputs: list[dict] | None = None, usage: dict | None = None) -> str:
    lines = [{"type": "item.completed", "item": item} for item in outputs or []]
    lines += [{"type": "item.completed", "item": {"type": "agent_message", "text": json.dumps(answer)}},
              {"type": "turn.completed", "usage": usage or {"input_tokens": 120, "output_tokens": 20, "cached_input_tokens": 30}}]
    return "\n".join(json.dumps(line) for line in lines)


class DatasetTests(unittest.TestCase):
    def test_temporal_gold_is_strictly_before_query(self):
        data = fixture()
        data["cases"][0]["gold_memory_ids"] = ["future"]
        with self.assertRaisesRegex(ValueError, "strictly before"):
            run.validate_dataset(data)
        data["memories"][2]["available_at"] = data["cases"][0]["query_at"]
        with self.assertRaisesRegex(ValueError, "strictly before"):
            run.validate_dataset(data)

    def test_schema_path_unknown_gold_and_session_split_errors(self):
        for scope in ("../x", "/absolute", "a/../../x", "a//b", "a/./b", ".git", "a\\b", "AGENTS.md"):
            with self.subTest(scope=scope), self.assertRaises(ValueError):
                data = fixture()
                data["memories"][0]["scope"] = scope
                run.validate_dataset(data)
        data = fixture()
        data["cases"][0]["gold_memory_ids"] = ["missing"]
        with self.assertRaisesRegex(ValueError, "unknown memory"):
            run.validate_dataset(data)
        data = fixture()
        extra = copy.deepcopy(data["cases"][0])
        extra.update(case_id="q2", split="dev")
        data["cases"].append(extra)
        with self.assertRaisesRegex(ValueError, "both dev and test"):
            run.validate_dataset(data)

    def test_duplicate_ids_and_invalid_patterns_rejected(self):
        data = fixture()
        data["memories"].append(copy.deepcopy(data["memories"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate memory_id"):
            run.validate_dataset(data)
        data = fixture()
        data["cases"][0]["answer_checks"][0]["pattern"] = "[invalid"
        with self.assertRaises(Exception):
            run.validate_dataset(data)

    def test_prepare_true_harbor_tasks_have_equal_payloads_and_no_labels(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            dataset = directory / "dataset.json"
            dataset.write_text(json.dumps(fixture()))
            output = directory / "run"
            args = run.arguments().parse_args(["--dataset", str(dataset), "--output", str(output),
                                              "--model", "test-model", "--prepare-only", "--repeats", "2"])
            run.execute(args)
            manifest = json.loads((output / "manifest.json").read_text())
            snapshots = manifest["snapshots"]
            self.assertEqual(snapshots["case-0001-scoped"]["memory_payload_sha256"],
                             snapshots["case-0001-root"]["memory_payload_sha256"])
            self.assertEqual(set(snapshots["case-0001-root"]["memory_paths"]), {"m1", "m2"})
            self.assertEqual(snapshots["case-0001-none"]["memory_paths"], {})
            for task in (output / "tasks").iterdir():
                from harbor.models.task.task import Task
                self.assertEqual(Task(task).config.verifier.environment_mode, "separate")
                self.assertEqual(Task(task).config.environment.workdir, "/workspace/alpha/service")
                for path in (task / "environment").rglob("*"):
                    if path.is_file():
                        contents = path.read_text()
                        self.assertNotIn("gold_memory_ids", contents)
                        self.assertNotIn("answer_checks", contents)
                        self.assertNotIn("origin-1", contents)
                        self.assertNotIn("later unknown policy", contents)
                        self.assertNotIn("CODEX_AUTH_JSON_PATH", contents)
                self.assertNotIn("query-1", (task / "instruction.md").read_text())
            none = output / "tasks/case-0001-none/environment/workspace"
            self.assertFalse(list(none.rglob("AGENTS.md")))
            self.assertFalse(list(none.rglob("memory-*.md")))
            plan = json.loads((output / "plan.json").read_text())
            self.assertEqual(len(plan), 6)
            self.assertEqual(len({p["trial_id"] for p in plan}), 6)
            self.assertEqual({p["repeat"] for p in plan}, {1, 2})

    def test_other_scope_is_kept_and_root_payload_keeps_scope_facts(self):
        data = fixture()
        memories = data["memories"][:2]
        markers = {m["memory_id"]: "MARKER-" + m["memory_id"] for m in memories}
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for condition in ("scoped", "root"):
                result = run.build_workspace(root / condition, memories, condition, "unrelated", markers)
                self.assertEqual(len(result["memory_paths"]), 2)
                contents = (root / condition / result["memory_paths"]["m2"]).read_text()
                self.assertIn('"scope": "alpha/service"', contents)
                self.assertIn("2026-01-02", contents)

    def test_sparse_scopes_allow_real_edges_directories(self):
        data = fixture()
        data["memories"][1]["scope"] = "framework/.edges/tasks"
        run.validate_dataset(data)
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "scoped"
            run.build_workspace(path, data["memories"][:2], "scoped", ".", {"m1": "ONE", "m2": "TWO"})
            self.assertFalse((path / "framework/AGENTS.md").exists())
            self.assertFalse((path / "framework/.edges/AGENTS.md").exists())
            self.assertTrue((path / "framework/.edges/tasks/AGENTS.md").exists())
            self.assertIn("framework/.edges/tasks/AGENTS.md", (path / "AGENTS.md").read_text())

    def test_pre_task_prompt_preserves_original_task_without_authorizing_execution(self):
        case = fixture()["cases"][0]
        case.update(task_mode="pre_task_retrieval", question="Update the release automation.")
        text = run.instruction(case)
        self.assertIn(case["question"], text)
        self.assertIn("不要执行外部操作或更改仓库", text)
        self.assertIn("答案不是完整任务执行结果", text)

    def test_collect_harbor_failure_preserves_costs_but_invalidates_quality(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            entry = {"trial_id": "trial-1", "task_name": "task-1", "case_id": "q1", "condition": "root", "repeat": 1, "order": 1}
            spec = {"case": fixture()["cases"][0], "condition": "root", "visible_memory_ids": ["m2"], "read_markers": {"m2": "TWO"}}
            run.write_json(root / "tasks/task-1/tests/spec.json", spec)
            row = metrics.evaluate_artifact(spec, events({"answer": "stable", "selected_memory_ids": ["m2"]}))
            run.write_json(root / "jobs/trial-1/native/verifier/trial.json", row)
            run.write_json(root / "jobs/trial-1/native/result.json", {
                "agent_execution": {"started_at": "2026-01-10T00:00:00Z", "finished_at": "2026-01-10T00:00:02Z"},
                "exception_info": {"exception_type": "AgentTimeoutError"},
            })
            result = run.collect_trial(root, entry, 4000, 1)
            self.assertEqual(result["agent_latency_ms"], 2000)
            self.assertEqual(result["input_tokens"], 120)
            self.assertEqual(result["error"], "harbor:AgentTimeoutError")
            self.assertIsNone(result["selected_recall_at_5"])
            self.assertEqual(result["repeat"], 1)

    def test_auth_pointer_is_not_serialized_or_overridden_by_api_key(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            auth = root / "auth.json"
            auth.write_text('{"fake":"secret-placeholder"}')
            with patch.dict(os.environ, {"OPENAI_API_KEY": "wrong-key", "CODEX_API_KEY": "wrong-key", "UNRELATED_SECRET": "private"}):
                env = run.controller_environment(root, auth)
            self.assertEqual(env["CODEX_AUTH_JSON_PATH"], str(auth.resolve()))
            self.assertNotIn("OPENAI_API_KEY", env)
            self.assertNotIn("CODEX_API_KEY", env)
            self.assertNotIn("UNRELATED_SECRET", env)
            self.assertFalse((root / "controller-home/.codex/auth.json").exists())


class RetrievalTests(unittest.TestCase):
    def setUp(self):
        self.spec = {"case": fixture()["cases"][0], "condition": "root",
                     "visible_memory_ids": ["m1", "m2"], "read_markers": {"m1": "MARKER-ONE", "m2": "MARKER-TWO"}}

    def test_marker_in_command_or_final_answer_is_not_evidence(self):
        output = events({"answer": "stable MARKER-TWO", "selected_memory_ids": ["m2"]}, outputs=[
            {"id": "tool1", "type": "command_execution", "command": "echo MARKER-TWO", "aggregated_output": "nothing"}])
        row = metrics.evaluate_artifact(self.spec, output)
        self.assertEqual(row["selected_recall_at_5"], 1)
        self.assertEqual(row["evidence_recall_at_5"], 0)
        self.assertEqual(row["precision_at_5"], .2)
        self.assertEqual(row["answer_checks_pass"], 1)
        self.assertEqual(row["tool_calls"], 1)
        self.assertEqual(row["uncached_input_tokens"], 90)

    def test_marker_in_tool_output_and_selection_both_required(self):
        tools = [{"id": "tool1", "type": "command_execution", "command": "cat memory-m2.md", "aggregated_output": "body MARKER-TWO"}]
        row = metrics.evaluate_artifact(self.spec, events({"answer": "stable", "selected_memory_ids": ["m1", "m2"]}, outputs=tools))
        self.assertEqual(row["mrr"], .5)
        self.assertEqual(row["evidence_recall_at_5"], 1)
        self.assertEqual(row["observed_memory_ids"], ["m2"])
        row = metrics.evaluate_artifact(self.spec, events({"answer": "stable", "selected_memory_ids": []}, outputs=tools))
        self.assertEqual(row["evidence_recall_at_5"], 0)

    def test_none_does_not_get_recall_for_guessed_ids(self):
        self.spec.update(condition="none", visible_memory_ids=[], read_markers={})
        row = metrics.evaluate_artifact(self.spec, events({"answer": "stable", "selected_memory_ids": ["m2"]}))
        self.assertEqual(row["selected_recall_at_5"], 0)
        self.assertEqual(row["unknown_selected_count"], 1)

    def test_failed_or_truncated_turn_is_unscored_not_incorrect(self):
        output = events({"answer": "stable", "selected_memory_ids": ["m2"]})
        row = metrics.evaluate_artifact(self.spec, output + '\n{"type":"turn.failed"}')
        self.assertIsNotNone(row["error"])
        self.assertIsNone(row["answer_checks_pass"])
        self.assertIsNone(row["selected_recall_at_5"])
        self.assertEqual(row["input_tokens"], 120)
        row = metrics.evaluate_artifact(self.spec, output.rsplit("\n", 1)[0])
        self.assertIsNotNone(row["error"])
        self.assertIsNone(row["input_tokens"])

    def test_unknown_usage_and_no_gold_remain_null(self):
        self.spec["case"]["gold_memory_ids"] = []
        row = metrics.evaluate_artifact(self.spec, events({"answer": "stable", "selected_memory_ids": []}, usage={"input_tokens": 10}))
        self.assertIsNone(row["selected_recall_at_5"])
        self.assertIsNone(row["precision_at_5"])
        self.assertIsNone(row["cached_input_tokens"])
        self.assertIsNone(row["uncached_input_tokens"])
        row = metrics.parse_events('{"type":"turn.completed","usage":{"input_tokens":10}}\n{"type":"turn.completed","usage":{}}')
        self.assertIsNone(row["input_tokens"])

    def test_more_than_five_or_duplicate_selection_is_invalid(self):
        for ids in (["m1"] * 2, [str(i) for i in range(6)]):
            row = metrics.evaluate_artifact(self.spec, events({"answer": "stable", "selected_memory_ids": ids}))
            self.assertEqual(row["error"], "output:invalid-json-schema")
            self.assertIsNone(row["selected_recall_at_5"])


class StatisticsTests(unittest.TestCase):
    def material(self):
        cases = [{"case_id": cid, "source": {"session_id": session}, "gold_memory_ids": ["m1"]}
                 for cid, session in (("q1", "s1"), ("q2", "s1"), ("q3", "s2"))]
        plan, rows = [], []
        for case in cases:
            for condition in metrics.CONDITIONS:
                for repeat in (1, 2):
                    p = {"trial_id": f"{case['case_id']}-{condition}-{repeat}", "case_id": case["case_id"], "condition": condition, "repeat": repeat}
                    plan.append(p)
                    rows.append({**p, "error": None, "selected_recall_at_5": 1.0 if condition == "scoped" else .5,
                                 "input_tokens": 20 if condition == "scoped" else 30})
        return cases, plan, rows

    def test_bootstrap_uses_cases_and_source_sessions_not_repeats(self):
        cases, plan, rows = self.material()
        report = metrics.summarize(plan, rows, cases, seed=7, bootstrap=100)
        result = report["paired_comparisons"]["scoped-vs-root"]["selected_recall_at_5"]
        self.assertEqual(result["paired_cases"], 3)
        self.assertEqual(result["source_clusters"], 2)
        self.assertEqual(result["delta_left_minus_right"], .5)
        self.assertEqual(result["ci95"], [.5, .5])

    def test_failure_is_reported_and_partial_repeats_are_not_complete_cases(self):
        cases, plan, rows = self.material()
        rows[0].update(error="timeout", selected_recall_at_5=None)
        report = metrics.summarize(plan, rows, cases, seed=7, bootstrap=100)
        self.assertEqual(report["failed_trials"], 1)
        result = report["paired_comparisons"]["scoped-vs-root"]["selected_recall_at_5"]
        self.assertEqual(result["paired_cases"], 2)
        self.assertEqual(result["paired_coverage"], 2 / 3)
        self.assertEqual(report["by_condition"]["scoped"]["failure_rate"], 1 / 6)
        incomplete = metrics.summarize(plan, rows[:-1], cases, seed=7, bootstrap=0)
        self.assertEqual(incomplete["status"], "incomplete")

    def test_unexpected_duplicate_or_wrong_trial_identity_rejected(self):
        cases, plan, rows = self.material()
        with self.assertRaises(ValueError):
            metrics.summarize(plan, rows + [rows[0]], cases, seed=7)
        rows[0]["repeat"] = 3
        with self.assertRaises(ValueError):
            metrics.summarize(plan, rows, cases, seed=7)


if __name__ == "__main__":
    unittest.main()
