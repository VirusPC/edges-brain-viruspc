"""Offline invariants: temporal leakage, retrieval evidence, and paired statistics."""
from __future__ import annotations

import copy
import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import threading
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


class ContentEvidenceTests(unittest.TestCase):
    def test_partial_body_read_counts_without_eof_marker(self):
        body = 'A uniquely worded release policy requiring the stable branch and two reviewers before every deployment.'
        anchors = metrics.content_anchors([{'memory_id': 'm2', 'body': body}])
        spec = {'case': fixture()['cases'][0], 'condition': 'scoped',
                'visible_memory_ids': ['m2'], 'read_markers': {'m2': 'ABSENT_EOF_MARKER'},
                'content_anchors': anchors}
        raw = events({'answer': 'Use stable.', 'selected_memory_ids': ['m2']}, outputs=[
            {'id': 'read-1', 'type': 'command_execution', 'aggregated_output': body[:90]}])
        result = metrics.evaluate_artifact(spec, raw)
        self.assertEqual(result['content_recall_at_5'], 1)
        self.assertEqual(result['marker_recall_at_5'], 0)
        self.assertEqual(result['evidence_recall_at_5'], 1)

    def test_shared_body_cannot_identify_a_memory_by_content(self):
        body = 'This sufficiently long shared paragraph is identical across two different documents and is not unique evidence.'
        anchors = metrics.content_anchors([{'memory_id': 'a', 'body': body}, {'memory_id': 'b', 'body': body}])
        self.assertEqual(anchors, {'a': [], 'b': []})

    def test_shifted_shared_body_is_not_unique(self):
        body = 'This sufficiently long shared paragraph is identical across two different documents and is not unique evidence.'
        anchors = metrics.content_anchors([{'memory_id': 'a', 'body': body}, {'memory_id': 'b', 'body': 'X' + body + 'Y'}])
        self.assertEqual(anchors['a'], [])

    def test_short_body_contained_in_longer_body_is_not_unique(self):
        short = '1234567890abcdefghijABCDEFGHIJklmnopqrstuv'
        anchors = metrics.content_anchors([{'memory_id': 'a', 'body': short}, {'memory_id': 'b', 'body': 'prefix-padding-' + short + '-suffix-padding-long'}])
        self.assertEqual(anchors['a'], [])

    def test_command_or_answer_text_is_not_content_evidence(self):
        body = 'A uniquely worded release policy requiring the stable branch and two reviewers before every deployment.'
        spec = {'case': fixture()['cases'][0], 'condition': 'root', 'visible_memory_ids': ['m2'],
                'read_markers': {}, 'content_anchors': metrics.content_anchors([{'memory_id': 'm2', 'body': body}])}
        result = metrics.evaluate_artifact(spec, events({'answer': body, 'selected_memory_ids': ['m2']}, outputs=[
            {'id': 'search-1', 'type': 'command_execution', 'command': body, 'aggregated_output': 'no matches'}]))
        self.assertEqual(result['content_recall_at_5'], 0)

    def test_mcp_unicode_and_newline_text_remains_decoded(self):
        body = '发布之前必须核对当前分支、目标环境和审阅结果，并且保留这次操作所依据的原始材料。\n如果必要的输入仍然缺失，应该先记录未知条件，再根据现有的项目约定决定下一步如何进行。'
        spec = {'case': fixture()['cases'][0], 'condition': 'root', 'visible_memory_ids': ['m2'],
                'read_markers': {}, 'content_anchors': metrics.content_anchors([{'memory_id': 'm2', 'body': body}])}
        result = metrics.evaluate_artifact(spec, events({'answer': 'Use stable.', 'selected_memory_ids': ['m2']}, outputs=[
            {'id': 'mcp-1', 'type': 'mcp_tool_call', 'result': {'content': [{'type': 'text', 'text': body}]}}]))
        self.assertEqual(result['content_recall_at_5'], 1)

    def test_mcp_blocks_are_not_joined_to_invent_a_body_span(self):
        body = '1234567890' * 8
        spec = {'case': fixture()['cases'][0], 'condition': 'root', 'visible_memory_ids': ['m2'],
                'read_markers': {}, 'content_anchors': metrics.content_anchors([{'memory_id': 'm2', 'body': body}])}
        result = metrics.evaluate_artifact(spec, events({'answer': 'Use stable.', 'selected_memory_ids': ['m2']}, outputs=[
            {'id': 'mcp-1', 'type': 'mcp_tool_call', 'result': {'content': [{'type': 'text', 'text': body[:40]}, {'type': 'text', 'text': body[40:]}]}}]))
        self.assertEqual(result['content_recall_at_5'], 0)


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


class SchedulingTests(unittest.TestCase):
    def args(self, directory, concurrency=3, repeats=2, name="run"):
        dataset = directory / "dataset.json"
        dataset.write_text(json.dumps(fixture()))
        return run.arguments().parse_args([
            "--dataset", str(dataset), "--output", str(directory / name),
            "--model", "offline-test", "--repeats", str(repeats),
            "--concurrency", str(concurrency), "--bootstrap", "0",
        ])

    def native_result(self, command):
        """Write synthetic native artifacts using the command's own identity."""
        task = Path(command[command.index("-p") + 1])
        trial_id = command[command.index("--job-name") + 1]
        job = Path(command[command.index("--jobs-dir") + 1]) / trial_id / "fake-native"
        spec = json.loads((task / "tests/spec.json").read_text())
        selected = ["m2"] if spec["condition"] != "none" else []
        raw = events({"answer": "stable", "selected_memory_ids": selected},
                     usage={"input_tokens": 100 + int(trial_id.rsplit("-", 1)[1]),
                            "output_tokens": 20, "cached_input_tokens": 30})
        run.write_json(job / "verifier/trial.json", metrics.evaluate_artifact(spec, raw))
        run.write_json(job / "result.json", {
            "agent_execution": {"started_at": "2026-01-10T00:00:00Z",
                                "finished_at": "2026-01-10T00:00:01Z"},
        })
        return subprocess.CompletedProcess(command, 0)

    def test_concurrency_validation_and_seeded_plan_are_independent(self):
        parser = run.arguments()
        base = ["--dataset", "x", "--output", "y", "--model", "offline"]
        self.assertEqual(parser.parse_args(base).concurrency, 1)
        for invalid in ("0", "-1", "1.5", "many"):
            with self.subTest(invalid=invalid), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                parser.parse_args(base + ["--concurrency", invalid])
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            plans, commands = [], []
            for concurrency in (1, 3):
                args = self.args(directory, concurrency, name=f"run-{concurrency}")
                args.prepare_only = True
                run.execute(args)
                plans.append(json.loads((args.output / "plan.json").read_text()))
                commands.append((args.output / "commands.json").read_text().replace(str(args.output), "RUN"))
                manifest = json.loads((args.output / "manifest.json").read_text())
                self.assertEqual(manifest["concurrency"], concurrency)
                self.assertIn("isolated", manifest["latency_context"]["interpretation"])
            self.assertEqual(plans[0], plans[1])
            self.assertEqual(commands[0], commands[1])
            args = self.args(directory, name="bad-direct-args")
            args.concurrency = 0
            with self.assertRaisesRegex(ValueError, "concurrency"):
                run.execute(args)
            self.assertFalse(args.output.exists())

    def test_bounded_parallel_jobs_keep_identity_and_checkpoint_each_completion(self):
        with tempfile.TemporaryDirectory() as temporary:
            args = self.args(Path(temporary), repeats=4)
            lock, barrier, release_first = threading.Lock(), threading.Barrier(3), threading.Event()
            active = peak = 0
            launches, checkpoints, result_checkpoints = [], [], []
            controller_thread = threading.get_ident()
            original_write = run.write_json

            def fake_subprocess(command, **kwargs):
                nonlocal active, peak
                if command[0] == "docker":
                    return subprocess.CompletedProcess(command, 0, stdout="[]")
                trial_id = command[command.index("--job-name") + 1]
                with lock:
                    active += 1
                    peak = max(peak, active)
                    launches.append((trial_id, Path(command[command.index("-p") + 1]).name))
                try:
                    if trial_id in {"trial-000001", "trial-000002", "trial-000003"}:
                        barrier.wait(timeout=10)
                    if trial_id == "trial-000001":
                        if not release_first.wait(timeout=10):
                            raise RuntimeError("controller failed to checkpoint another completion")
                    return self.native_result(command)
                finally:
                    with lock:
                        active -= 1

            def observe_write(path, value):
                original_write(path, value)
                if path.parent != args.output:
                    return
                if path.name == "trials.json":
                    self.assertEqual(threading.get_ident(), controller_thread)
                    checkpoints.append([row["trial_id"] for row in value])
                    release_first.set()
                if path.name == "result.json":
                    self.assertEqual(threading.get_ident(), controller_thread)
                    result_checkpoints.append(len(value["trials"]))

            with patch.object(run.subprocess, "run", side_effect=fake_subprocess), patch.object(run, "write_json", side_effect=observe_write):
                report = run.execute(args)
            plan = json.loads((args.output / "plan.json").read_text())
            rows = json.loads((args.output / "trials.json").read_text())
            self.assertEqual(peak, 3)
            self.assertEqual(active, 0)
            self.assertCountEqual(launches, [(entry["trial_id"], entry["task_name"]) for entry in plan])
            self.assertEqual(len({trial_id for trial_id, _ in launches}), len(plan))
            self.assertNotIn("trial-000001", checkpoints[0])
            self.assertEqual([len(ids) for ids in checkpoints], list(range(1, len(plan) + 1)))
            self.assertEqual(result_checkpoints, list(range(1, len(plan) + 1)) + [len(plan)])
            for entry, row in zip(plan, rows, strict=True):
                for field in ("trial_id", "case_id", "condition", "repeat", "order", "task_name"):
                    self.assertEqual(row[field], entry[field])
                self.assertEqual(row["input_tokens"], 100 + entry["order"])
                self.assertEqual(row["agent_latency_ms"], 1000)
            self.assertEqual(report["status"], "complete")
            self.assertEqual(report["failed_trials"], 0)
            manifest = json.loads((args.output / "manifest.json").read_text())
            self.assertGreater(manifest["execution_wall_ms"], 0)

    def test_worker_and_collector_failures_do_not_drop_other_results_or_retry(self):
        with tempfile.TemporaryDirectory() as temporary:
            args = self.args(Path(temporary))
            launched = []
            original_collect = run.collect_trial

            def fake_subprocess(command, **kwargs):
                if command[0] == "docker":
                    return subprocess.CompletedProcess(command, 0, stdout="[]")
                trial_id = command[command.index("--job-name") + 1]
                launched.append(trial_id)
                if trial_id == "trial-000001":
                    raise RuntimeError("synthetic worker error")
                return self.native_result(command)

            def fake_collect(output, entry, wall_ms, returncode):
                if entry["trial_id"] == "trial-000002":
                    raise ValueError("synthetic malformed artifact")
                return original_collect(output, entry, wall_ms, returncode)

            with patch.object(run.subprocess, "run", side_effect=fake_subprocess), patch.object(run, "collect_trial", side_effect=fake_collect):
                report = run.execute(args)
            rows = json.loads((args.output / "trials.json").read_text())
            self.assertEqual(len(launched), 6)
            self.assertEqual(len(set(launched)), 6)
            self.assertEqual(len(rows), 6)
            self.assertEqual(rows[0]["error"], "controller:RuntimeError")
            self.assertEqual(rows[1]["error"], "controller:collection-ValueError")
            self.assertTrue(all(row["error"] is None for row in rows[2:]))
            self.assertEqual(report["status"], "complete")
            self.assertEqual(report["failed_trials"], 2)

    def test_keyboard_interrupt_stops_admission_and_checkpoints_inflight_jobs(self):
        with tempfile.TemporaryDirectory() as temporary:
            args = self.args(Path(temporary))
            all_started, finish = threading.Event(), threading.Event()
            lock, launched = threading.Lock(), []

            def fake_subprocess(command, **kwargs):
                if command[0] == "docker":
                    return subprocess.CompletedProcess(command, 0, stdout="[]")
                with lock:
                    launched.append(command[command.index("--job-name") + 1])
                    if len(launched) == 3:
                        all_started.set()
                if not finish.wait(timeout=10):
                    raise RuntimeError("test failed to release jobs")
                return self.native_result(command)

            def interrupt_once(*args, **kwargs):
                self.assertTrue(all_started.wait(timeout=10))
                finish.set()
                raise KeyboardInterrupt

            with patch.object(run.subprocess, "run", side_effect=fake_subprocess), patch.object(run, "wait", side_effect=interrupt_once), self.assertRaises(KeyboardInterrupt):
                run.execute(args)
            rows = json.loads((args.output / "trials.json").read_text())
            result = json.loads((args.output / "result.json").read_text())
            self.assertCountEqual(launched, ["trial-000001", "trial-000002", "trial-000003"])
            self.assertEqual([row["trial_id"] for row in rows], sorted(launched))
            self.assertTrue(all(row["error"] is None for row in rows))
            self.assertEqual(result["status"], "incomplete")
            self.assertTrue(result["manifest"]["interrupted"])


if __name__ == "__main__":
    unittest.main()
