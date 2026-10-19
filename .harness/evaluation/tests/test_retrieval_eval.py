"""Offline tests for the retrieval eval config, clone, client parse, and scorer."""

from __future__ import annotations

import base64
import contextlib
import io
import json
import math
import os
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parents[1]
if str(EVAL_DIR) not in sys.path:
    sys.path.insert(0, str(EVAL_DIR))

from retrieval_eval.client import (
    ClientCall,
    build_prompt,
    codex_command,
    parse_client_answer,
    parse_predicted,
    run_client,
)
from retrieval_eval.config import Client, load_cells, load_samples
from retrieval_eval.git_repo import sync_clone
from retrieval_eval.langfuse_otlp import upload_sample_trace
from retrieval_eval.run import record_scored_sample, write_sample_trace
from retrieval_eval.score import aggregate, parse_clusters, score_prediction


GIT_ENV = {
    **os.environ,
    "GIT_AUTHOR_NAME": "retrieval-eval",
    "GIT_AUTHOR_EMAIL": "retrieval-eval@example.com",
    "GIT_COMMITTER_NAME": "retrieval-eval",
    "GIT_COMMITTER_EMAIL": "retrieval-eval@example.com",
}


class ConfigTests(unittest.TestCase):
    def test_default_cell_is_edges_codex_smoke(self) -> None:
        cells = load_cells()
        self.assertEqual(len(cells), 1)
        cell = cells[0]
        self.assertEqual(cell.repository.url, "https://github.com/VirusPC/edges.git")
        self.assertEqual(cell.repository.ref, "main")
        self.assertEqual(cell.client.command, "codex")
        self.assertEqual(cell.client.sandbox, "read-only")
        self.assertEqual(cell.sample_id, "retrieval-smoke/edges")
        samples = load_samples(cell.sample_path)
        self.assertEqual(len(samples), 6)

    def test_print_command_does_not_clone(self) -> None:
        completed = subprocess.run(
            [sys.executable, str(EVAL_DIR / "retrieval_eval" / "run.py"), "print-command"],
            check=True,
            text=True,
            capture_output=True,
        )
        self.assertIn("git clone --no-recurse-submodules https://github.com/VirusPC/edges.git", completed.stdout)
        self.assertIn("codex exec", completed.stdout)
        self.assertIn("--json", completed.stdout)
        self.assertIn("--sandbox read-only", completed.stdout)
        self.assertNotIn(".git/config", completed.stdout)


class ScoreTests(unittest.TestCase):
    def test_ordered_basic_matches_source_metrics(self) -> None:
        row = score_prediction(["a", "b", "c"], ["a", "x", "b"])
        self.assertEqual(row["P@5"], 2 / 5)
        self.assertEqual(row["R@5"], 2 / 3)
        self.assertEqual(row["Hit@5"], 1.0)
        self.assertEqual(row["MRR"], 1.0)
        self.assertEqual(row["score"], 2 / 3)
        dcg = 1.0 / math.log2(2) + 1.0 / math.log2(4)
        idcg = 1.0 / math.log2(2) + 1.0 / math.log2(3) + 1.0 / math.log2(4)
        self.assertAlmostEqual(row["nDCG@5"], dcg / idcg)
        self.assertAlmostEqual(row["MAP@5"], (1.0 + 2.0 / 3.0) / 3.0)

    def test_cluster_any_of(self) -> None:
        ground_truth = [["a1", "a2"], ["b"]]
        partial = score_prediction(ground_truth, ["a1", "x"])
        self.assertEqual(partial["R@5"], 0.5)
        self.assertEqual(partial["hits"], 1)
        both = score_prediction(ground_truth, ["a2", "b"])
        self.assertEqual(both["R@5"], 1.0)
        self.assertEqual(parse_clusters(ground_truth), [["a1", "a2"], ["b"]])

    def test_dedupe_and_macro(self) -> None:
        row = score_prediction(["a"], ["a", "a", "a"])
        self.assertEqual(row["P@5"], 1 / 5)
        self.assertEqual(row["R@5"], 1.0)
        summary = aggregate([row, score_prediction(["b"], ["x"])])
        self.assertEqual(summary["positive_count"], 2)
        self.assertEqual(summary["macro"]["R@5"], 0.5)

    def test_smoke_file_perfect_hit(self) -> None:
        samples = load_samples(EVAL_DIR / "cases" / "retrieval-smoke" / "edges.json")
        cluster = next(sample for sample in samples if sample["id"] == "edges_smoke_system_entry")
        row = score_prediction(cluster["ground_truth"], ["CONTEXT.md"])
        self.assertEqual(row["R@5"], 1.0)


class ClientTests(unittest.TestCase):
    def test_parse_last_predicted_object(self) -> None:
        text = '先看文件。\n{"predicted":["docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md"]}\n'
        predicted, error = parse_predicted(text)
        self.assertIsNone(error)
        self.assertEqual(predicted, ["docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md"])

    def test_command_is_read_only_exec(self) -> None:
        cells = load_cells()
        command = codex_command(
            cells[0].client,
            Path("/tmp/repo"),
            build_prompt("问题"),
            Path("/tmp/last.txt"),
        )
        self.assertEqual(command[0], "codex")
        self.assertIn("exec", command)
        self.assertIn("--json", command)
        self.assertIn("--sandbox", command)
        self.assertEqual(command[command.index("--sandbox") + 1], "read-only")
        self.assertIn("--ephemeral", command)
        self.assertLess(command.index("--json"), command.index("--sandbox"))
        self.assertEqual(command[-2], "/tmp/last.txt")

    def test_jsonl_fallback_uses_last_agent_message(self) -> None:
        """A missing -o file must not score JSON embedded in command output."""
        stdout = "\n".join(
            [
                json.dumps({"type": "thread.started", "thread_id": "abc"}),
                json.dumps(
                    {
                        "type": "item.completed",
                        "item": {
                            "id": "item_1",
                            "type": "command_execution",
                            "command": "rg predicted",
                            "aggregated_output": '{"predicted":["wrong.md"]}',
                        },
                    }
                ),
                json.dumps(
                    {
                        "type": "item.completed",
                        "item": {
                            "id": "item_2",
                            "type": "agent_message",
                            "text": '先看到的\n{"predicted":["CONTEXT.md"]}\n',
                        },
                    }
                ),
                json.dumps(
                    {
                        "type": "item.completed",
                        "item": {
                            "id": "item_3",
                            "type": "reasoning",
                            "text": '{"predicted":["ignored.md"]}',
                        },
                    }
                ),
                json.dumps(
                    {
                        "type": "item.completed",
                        "item": {
                            "id": "item_4",
                            "type": "agent_message",
                            "text": '最终\n{"predicted":["notes/AGENTS.md"]}\n',
                        },
                    }
                ),
                json.dumps(
                    {
                        "type": "turn.completed",
                        "usage": {"input_tokens": 10, "cached_input_tokens": 4, "output_tokens": 2},
                    }
                ),
            ]
        )
        predicted, error = parse_client_answer("", stdout)
        self.assertIsNone(error)
        self.assertEqual(predicted, ["notes/AGENTS.md"])

    def test_last_message_wins_over_jsonl_stdout(self) -> None:
        stdout = json.dumps(
            {
                "type": "item.completed",
                "item": {"id": "item_1", "type": "agent_message", "text": '{"predicted":["from-stdout.md"]}'},
            }
        )
        predicted, error = parse_client_answer('{"predicted":["from-file.md"]}\n', stdout)
        self.assertIsNone(error)
        self.assertEqual(predicted, ["from-file.md"])

    def test_jsonl_without_agent_message_does_not_score_command_json(self) -> None:
        stdout = json.dumps(
            {
                "type": "item.completed",
                "item": {
                    "id": "item_1",
                    "type": "command_execution",
                    "command": "cat answer.txt",
                    "aggregated_output": '{"predicted":["stolen.md"]}',
                },
            }
        )
        predicted, error = parse_client_answer("   ", stdout)
        self.assertEqual(predicted, [])
        self.assertEqual(error, "no agent message in event stream")

    def test_plain_stdout_still_parses_when_last_message_missing(self) -> None:
        text = '说明\n{"predicted":["docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md"]}\n'
        predicted, error = parse_client_answer("", text)
        self.assertIsNone(error)
        self.assertEqual(predicted, ["docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md"])

    def test_run_client_reads_last_message_and_keeps_jsonl_stdout(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            script = root / "codex"
            last = root / "last.txt"
            script.write_text(
                "\n".join(
                    [
                        "#!/usr/bin/env python3",
                        "import json, sys",
                        "from pathlib import Path",
                        "args = sys.argv[1:]",
                        "if '--json' not in args or 'exec' not in args:",
                        "    sys.stderr.write('missing json exec\\n')",
                        "    raise SystemExit(2)",
                        "out = Path(args[args.index('-o') + 1])",
                        "out.write_text('{\"predicted\":[\"from-file.md\"]}\\n', encoding='utf-8')",
                        "event = {",
                        "    'type': 'item.completed',",
                        "    'item': {'id': 'item_1', 'type': 'agent_message', 'text': '{\"predicted\":[\"from-stdout.md\"]}'},",
                        "}",
                        "sys.stdout.write(json.dumps(event) + '\\n')",
                        "sys.stderr.write('progress\\n')",
                        "",
                    ]
                ),
                encoding="utf-8",
            )
            script.chmod(0o755)
            call = run_client(
                Client(id="fake", command=str(script), sandbox="read-only", timeout_seconds=5),
                root,
                "问题",
                last,
            )
            self.assertIn("--json", call.command)
            self.assertEqual(call.predicted, ["from-file.md"])
            self.assertIn("from-stdout.md", call.stdout)
            self.assertEqual(call.stderr, "progress\n")
            self.assertEqual(call.returncode, 0)
            self.assertFalse(call.timed_out)
            self.assertIsNone(call.parse_error)

    def test_sample_trace_persists_event_stream(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            log_dir = Path(tmp)
            call = ClientCall(
                predicted=["notes/AGENTS.md"],
                command=["codex", "exec", "--json"],
                stdout='{"type":"thread.started"}\n',
                stderr="warn\n",
                returncode=0,
                timed_out=False,
                parse_error=None,
            )
            write_sample_trace(log_dir, "edges_smoke_system_entry", call)
            self.assertEqual(
                (log_dir / "edges_smoke_system_entry.events.jsonl").read_text(encoding="utf-8"),
                '{"type":"thread.started"}\n',
            )
            self.assertEqual(
                (log_dir / "edges_smoke_system_entry.stderr.txt").read_text(encoding="utf-8"),
                "warn\n",
            )
            self.assertFalse((log_dir / "edges_smoke_system_entry.stdout.txt").exists())


def _events() -> str:
    return "\n".join(
        [
            json.dumps({"type": "thread.started", "thread_id": "thread-1"}),
            json.dumps(
                {
                    "type": "item.completed",
                    "item": {
                        "id": "item_1",
                        "type": "command_execution",
                        "command": "rg CONTEXT",
                        "aggregated_output": "CONTEXT.md\n",
                    },
                }
            ),
            json.dumps(
                {
                    "type": "item.completed",
                    "item": {"id": "item_2", "type": "reasoning", "text": "先看 CONTEXT"},
                }
            ),
            json.dumps(
                {
                    "type": "item.completed",
                    "item": {
                        "id": "item_3",
                        "type": "agent_message",
                        "text": '{"predicted":["a"]}',
                    },
                }
            ),
            json.dumps(
                {
                    "type": "turn.completed",
                    "usage": {
                        "input_tokens": 11,
                        "cached_input_tokens": 4,
                        "output_tokens": 3,
                        "reasoning_output_tokens": 1,
                    },
                }
            ),
        ]
    ) + "\n"


def _span_attributes(payload: dict) -> list[dict[str, str]]:
    spans = payload["resourceSpans"][0]["scopeSpans"][0]["spans"]
    flattened = []
    for span in spans:
        attrs = {}
        for item in span.get("attributes", []):
            value = item["value"]
            if "stringValue" in value:
                attrs[item["key"]] = value["stringValue"]
            elif "intValue" in value:
                attrs[item["key"]] = str(value["intValue"])
            elif "doubleValue" in value:
                attrs[item["key"]] = str(value["doubleValue"])
        flattened.append({"name": span["name"], "traceId": span["traceId"], **attrs})
    return flattened


class _Capture:
    def __init__(self, status: int = 200, error: BaseException | None = None) -> None:
        self.status = status
        self.error = error
        self.requests: list[object] = []

    def __call__(self, request, timeout=None):
        if self.error is not None:
            raise self.error
        self.requests.append(request)
        body = io.BytesIO(b"")
        response = urllib.error.HTTPError(request.full_url, self.status, "status", hdrs=None, fp=body)
        if 200 <= self.status < 300:
            return _Ok(self.status)
        raise response


class _Ok:
    def __init__(self, status: int) -> None:
        self.status = status

    def read(self) -> bytes:
        return b""

    def __enter__(self):
        return self

    def __exit__(self, *args) -> bool:
        return False


class LangfuseUploadTests(unittest.TestCase):
    def test_missing_env_does_not_post(self) -> None:
        capture = _Capture()
        for env in (
            {},
            {"LANGFUSE_HOST": "https://langfuse.example"},
            {"LANGFUSE_PUBLIC_KEY": "pk", "LANGFUSE_SECRET_KEY": "sk"},
            {"LANGFUSE_BASE_URL": "https://langfuse.example", "LANGFUSE_PUBLIC_KEY": "pk"},
        ):
            with self.subTest(env=sorted(env)):
                result = upload_sample_trace(
                    events_jsonl=_events(),
                    cell_id="cell-1",
                    sample_id="s1",
                    client_id="codex",
                    repository_id="edges",
                    repository_url="https://github.com/VirusPC/edges.git",
                    repository_ref="main",
                    repository_commit="abc",
                    prompt="问题",
                    score_row={"score": 1.0, "predicted": ["a"]},
                    environ=env,
                    opener=capture,
                )
                self.assertEqual(result.status, "skipped")
        self.assertEqual(capture.requests, [])

    def test_posts_otlp_json_with_basic_auth(self) -> None:
        capture = _Capture()
        result = upload_sample_trace(
            events_jsonl=_events(),
            cell_id="cell-1",
            sample_id="s1",
            client_id="codex",
            repository_id="edges",
            repository_url="https://github.com/VirusPC/edges.git",
            repository_ref="main",
            repository_commit="abc",
            prompt="问题",
            score_row={"score": 1.0, "R@5": 1.0, "grade": "good", "predicted": ["a"]},
            environ={
                "LANGFUSE_HOST": "https://langfuse.example/",
                "LANGFUSE_BASE_URL": "https://other.example",
                "LANGFUSE_PUBLIC_KEY": "pk-test",
                "LANGFUSE_SECRET_KEY": "sk-test",
            },
            opener=capture,
        )
        self.assertEqual(result.status, "sent")
        self.assertEqual(len(capture.requests), 1)
        request = capture.requests[0]
        self.assertEqual(request.full_url, "https://langfuse.example/api/public/otel/v1/traces")
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(request.get_header("Content-type"), "application/json")
        expected_auth = "Basic " + base64.b64encode(b"pk-test:sk-test").decode("ascii")
        self.assertEqual(request.get_header("Authorization"), expected_auth)
        payload = json.loads(request.data.decode("utf-8"))
        spans = _span_attributes(payload)
        self.assertGreaterEqual(len(spans), 4)
        self.assertTrue(all(len(span["traceId"]) == 32 for span in spans))
        self.assertEqual(len({span["traceId"] for span in spans}), 1)
        joined = json.dumps(payload, ensure_ascii=False)
        self.assertIn("rg CONTEXT", joined)
        self.assertIn("先看 CONTEXT", joined)
        self.assertIn("agent_message", joined)
        self.assertIn("cell-1", joined)
        self.assertIn("s1", joined)
        self.assertIn("codex", joined)
        self.assertIn("https://github.com/VirusPC/edges.git", joined)
        self.assertIn("1.0", joined)
        turn = next(span for span in spans if span["name"] == "turn.completed")
        usage = json.loads(turn["langfuse.observation.usage_details"])
        self.assertEqual(usage["input"], 11)
        self.assertEqual(usage["output"], 3)
        self.assertEqual(usage["input_cached_tokens"], 4)
        self.assertEqual(turn["gen_ai.usage.input_tokens"], "11")
        self.assertEqual(turn["gen_ai.usage.output_tokens"], "3")
        self.assertNotIn("sk-test", joined)
        self.assertNotIn("pk-test", joined)

    def test_base_url_alias_when_host_missing(self) -> None:
        capture = _Capture()
        result = upload_sample_trace(
            events_jsonl="",
            cell_id="cell-1",
            sample_id="s1",
            client_id="codex",
            repository_id="edges",
            repository_url="https://github.com/VirusPC/edges.git",
            repository_ref=None,
            repository_commit=None,
            prompt="问题",
            score_row={"score": 0.0},
            environ={
                "LANGFUSE_HOST": "  ",
                "LANGFUSE_BASE_URL": "https://alias.example",
                "LANGFUSE_PUBLIC_KEY": "pk",
                "LANGFUSE_SECRET_KEY": "sk",
            },
            opener=capture,
        )
        self.assertEqual(result.status, "sent")
        self.assertEqual(
            capture.requests[0].full_url,
            "https://alias.example/api/public/otel/v1/traces",
        )

    def test_bad_response_does_not_raise(self) -> None:
        failed = upload_sample_trace(
            events_jsonl=_events(),
            cell_id="cell-1",
            sample_id="s1",
            client_id="codex",
            repository_id="edges",
            repository_url="https://github.com/VirusPC/edges.git",
            repository_ref="main",
            repository_commit="abc",
            prompt="问题",
            score_row={"score": 1.0},
            environ={
                "LANGFUSE_HOST": "https://langfuse.example",
                "LANGFUSE_PUBLIC_KEY": "pk",
                "LANGFUSE_SECRET_KEY": "sk",
            },
            opener=_Capture(status=503),
        )
        self.assertEqual(failed.status, "failed")
        self.assertEqual(failed.error, "HTTP 503")
        timed_out = upload_sample_trace(
            events_jsonl=_events(),
            cell_id="cell-1",
            sample_id="s1",
            client_id="codex",
            repository_id="edges",
            repository_url="https://github.com/VirusPC/edges.git",
            repository_ref="main",
            repository_commit="abc",
            prompt="问题",
            score_row={"score": 1.0},
            environ={
                "LANGFUSE_HOST": "https://langfuse.example",
                "LANGFUSE_PUBLIC_KEY": "pk",
                "LANGFUSE_SECRET_KEY": "sk",
            },
            opener=_Capture(error=TimeoutError("slow")),
        )
        self.assertEqual(timed_out.status, "failed")
        self.assertEqual(timed_out.error, "TimeoutError")

    def test_record_scored_sample_uploads_after_score_and_keeps_score_on_failure(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            log_dir = Path(tmp)
            call = ClientCall(
                predicted=["a"],
                command=["codex", "exec", "--json"],
                stdout=_events(),
                stderr="",
                returncode=0,
                timed_out=False,
                parse_error=None,
            )
            sample = {"id": "s1", "prompt": "问题", "ground_truth": ["a"]}
            capture = _Capture(status=500)
            seen_file = []

            def opener(request, timeout=None):
                seen_file.append((log_dir / "s1.events.jsonl").is_file())
                return capture(request, timeout)

            with contextlib.redirect_stderr(io.StringIO()):
                row = record_scored_sample(
                    log_dir,
                    sample,
                    call,
                    cell_id="cell-1",
                    client_id="codex",
                    repository_id="edges",
                    repository_url="https://github.com/VirusPC/edges.git",
                    repository_ref="main",
                    repository_commit="abc",
                    environ={
                        "LANGFUSE_HOST": "https://langfuse.example",
                        "LANGFUSE_PUBLIC_KEY": "pk",
                        "LANGFUSE_SECRET_KEY": "sk",
                    },
                    opener=opener,
                )
            self.assertEqual(row["id"], "s1")
            self.assertEqual(row["R@5"], 1.0)
            self.assertEqual(seen_file, [True])
            self.assertEqual(
                (log_dir / "s1.events.jsonl").read_text(encoding="utf-8"),
                _events(),
            )
            payload = json.loads(capture.requests[0].data.decode("utf-8"))
            self.assertIn("1.0", json.dumps(payload))


class CloneTests(unittest.TestCase):
    def test_sync_clone_checks_out_ref_commit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            origin = root / "origin"
            origin.mkdir()
            self._git(["init", "-b", "main"], origin)
            (origin / "README.md").write_text("hello\n", encoding="utf-8")
            self._git(["add", "README.md"], origin)
            self._git(["commit", "-m", "init"], origin)
            expected = self._git(["rev-parse", "HEAD"], origin).strip()
            cloned = sync_clone(str(origin), "main", root / "cache")
            self.assertEqual(cloned, expected)
            self.assertFalse((root / "cache" / ".gitmodules").exists())

    def _git(self, args: list[str], cwd: Path) -> str:
        result = subprocess.run(
            ["git", *args],
            cwd=cwd,
            check=True,
            text=True,
            capture_output=True,
            env=GIT_ENV,
        )
        return result.stdout


if __name__ == "__main__":
    unittest.main()
