"""Offline tests for the retrieval eval config, clone, client parse, and scorer."""

from __future__ import annotations

import json
import math
import os
import subprocess
import sys
import tempfile
import unittest
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
from retrieval_eval.run import write_sample_trace
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
