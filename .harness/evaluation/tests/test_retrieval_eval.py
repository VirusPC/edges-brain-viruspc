"""Offline tests for the retrieval eval config, clone, client parse, and scorer."""

from __future__ import annotations

import contextlib
import io
import json
import math
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

EVAL_DIR = Path(__file__).resolve().parents[1]
if str(EVAL_DIR) not in sys.path:
    sys.path.insert(0, str(EVAL_DIR))

from retrieval_eval.client import (
    ClientCall,
    build_prompt,
    codex_command,
    parse_client_answer,
    parse_pi_answer,
    parse_predicted,
    pi_allow_read_paths,
    pi_command,
    pi_deny_read_paths,
    pi_install_command,
    pi_sandbox_check_command,
    pi_sandbox_config_json,
    read_command_version,
    run_client,
)
from retrieval_eval.config import Client, load_cells, load_samples, override_cells
from retrieval_eval.git_repo import sync_clone
from retrieval_eval.report import write_report
from retrieval_eval.run import main, record_scored_sample, write_sample_trace
from retrieval_eval.score import aggregate, parse_clusters, score_prediction
from retrieval_eval.trace import SERVICE_NAME, build_sample_trace, session_id_for_run, session_label
import langfuse_sink


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
        self.assertEqual(cell.client.reasoning_summary, "detailed")
        self.assertEqual(cell.client.reasoning_effort, "high")
        self.assertIs(cell.client.show_raw_reasoning, True)
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
        self.assertIn("-c model_reasoning_summary=detailed", completed.stdout)
        self.assertIn("-c show_raw_agent_reasoning=true", completed.stdout)
        self.assertIn("-c model_reasoning_effort=high", completed.stdout)
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
        self.assertEqual(
            command[command.index("--skip-git-repo-check") + 1 : command.index("-C")],
            [
                "-c",
                "model_reasoning_summary=detailed",
                "-c",
                "show_raw_agent_reasoning=true",
                "-c",
                "model_reasoning_effort=high",
            ],
        )

    def test_command_omits_reasoning_flags_when_unset(self) -> None:
        command = codex_command(
            Client(id="bare", command="codex", sandbox="read-only", timeout_seconds=5),
            Path("/tmp/repo"),
            "问题",
            Path("/tmp/last.txt"),
        )
        self.assertNotIn("-c", command)
        self.assertEqual(command[-1], "问题")

    def test_report_records_reasoning_settings(self) -> None:
        payload = {
            "cell_id": "edges__codex__retrieval-smoke_edges",
            "repository": {
                "url": "https://github.com/VirusPC/edges.git",
                "ref": "main",
                "commit": "abc",
            },
            "client": "codex",
            "sample_id": "retrieval-smoke/edges",
            "reasoning": {"summary": "detailed", "effort": "high", "show_raw": True},
            "aggregate": {
                "macro": {
                    "R@5": 1.0,
                    "P@5": 0.2,
                    "nDCG@5": 1.0,
                    "MAP@5": 1.0,
                    "MRR": 1.0,
                    "Hit@5": 1.0,
                    "score": 1.0,
                }
            },
            "samples": [{"id": "s1", "score": 1.0, "grade": "good", "predicted": ["a"]}],
        }
        with tempfile.TemporaryDirectory() as tmp:
            json_path, md_path = write_report(Path(tmp) / "report", payload)
            saved = json.loads(json_path.read_text(encoding="utf-8"))
            markdown = md_path.read_text(encoding="utf-8")
        self.assertEqual(saved["reasoning"], payload["reasoning"])
        self.assertIn("summary=`detailed`", markdown)
        self.assertIn("effort=`high`", markdown)
        self.assertIn("show_raw=`true`", markdown)

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

    def test_run_client_closes_stdin(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with patch("retrieval_eval.client.subprocess.run") as run:
                run.return_value = subprocess.CompletedProcess(
                    args=["codex"],
                    returncode=0,
                    stdout="",
                    stderr="",
                )
                run_client(
                    Client(id="fake", command="codex", sandbox="read-only", timeout_seconds=5),
                    root,
                    "问题",
                    root / "last.txt",
                )
            self.assertEqual(run.call_args.kwargs["stdin"], subprocess.DEVNULL)

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


class SessionIdTests(unittest.TestCase):
    def test_session_id_names_suite_stamp_and_suffix(self) -> None:
        self.assertEqual(
            session_label("retrieval-smoke/edges", "edges", "codex"),
            "retrieval-smoke:edges:codex",
        )
        self.assertEqual(
            session_label("retrieval-smoke/other", "edges", "codex"),
            "retrieval-smoke:other:edges:codex",
        )
        self.assertEqual(
            session_id_for_run(
                [("retrieval-smoke/edges", "edges", "codex")],
                "2026-10-19-021500",
                suffix="ab12",
            ),
            "retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/ab12",
        )
        self.assertEqual(
            session_id_for_run(
                [
                    ("retrieval-smoke/edges", "edges", "codex"),
                    ("retrieval-smoke/edges", "edges", "codex"),
                    ("other-suite/repo", "repo", "codex"),
                ],
                "2026-10-19-021500",
                suffix="ab12",
            ),
            "retrieval/retrieval-smoke:edges:codex+other-suite:repo:codex/2026-10-19-021500/ab12",
        )
        generated = session_id_for_run(
            [("retrieval-smoke/edges", "edges", "codex")],
            "2026-10-19-021500",
        )
        self.assertRegex(
            generated,
            r"^retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/[0-9a-f]{4}$",
        )


def _events() -> str:
    return "\n".join(
        [
            json.dumps({"type": "thread.started", "thread_id": "thread-1", "model": "gpt-5.4", "cli_version": "0.98.0"}),
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
            json.dumps({"type": "turn.completed", "usage": {"input_tokens": 11, "output_tokens": 3}}),
        ]
    ) + "\n"


class TraceExportTests(unittest.TestCase):
    def test_observation_package_imports_without_extra_pythonpath(self) -> None:
        self.assertTrue(callable(langfuse_sink.exporter_from_env))
        self.assertTrue(callable(langfuse_sink.make_session_id))

    def test_sample_trace_has_scores_service_name_and_no_langfuse_keys(self) -> None:
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
        with tempfile.TemporaryDirectory() as tmp:
            log_dir = Path(tmp)
            seen: list[bool] = []

            class Capture:
                def export(self, trace):
                    seen.append((log_dir / "s1.events.jsonl").is_file())
                    self.trace = trace
                    return langfuse_sink.ExportResult("failed", error="HTTP 503")

            exporter = Capture()
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
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
                    session_id="retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/ab12",
                    reasoning=Client(
                        id="codex",
                        command="codex",
                        sandbox="read-only",
                        timeout_seconds=600,
                        reasoning_summary="detailed",
                        reasoning_effort="high",
                        show_raw_reasoning=True,
                    ).reasoning_metadata(),
                    exporter=exporter,
                )
            self.assertEqual(row["id"], "s1")
            self.assertEqual(row["R@5"], 1.0)
            self.assertEqual(seen, [True])
            self.assertEqual(stderr.getvalue(), "retrieval_eval: trace export failed: HTTP 503\n")
            trace = exporter.trace
            self.assertEqual(trace.service_name, SERVICE_NAME)
            self.assertEqual(trace.service_name, "edges-retrieval-eval")
            self.assertEqual(trace.session_id, "retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/ab12")
            self.assertEqual(trace.user_id, "codex")
            self.assertEqual(trace.metadata["cell_id"], "cell-1")
            self.assertEqual(trace.metadata["model"], "gpt-5.4")
            self.assertEqual(trace.metadata["codex_version"], "0.98.0")
            self.assertFalse(any(key.startswith("langfuse.") for key in trace.metadata))
            root = trace.spans[0]
            self.assertEqual(root.attributes["recall_at_5"], "1.0")
            self.assertEqual(root.attributes["precision_at_5"], json.dumps(row["P@5"]))
            self.assertEqual(root.attributes["ndcg_at_5"], json.dumps(row["nDCG@5"]))
            self.assertEqual(root.attributes["reasoning_effort"], "high")
            self.assertEqual(root.kind, "span")
            self.assertIsNone(root.parent_id)
            child = next(span for span in trace.spans if span.name == "rg CONTEXT")
            self.assertEqual(child.kind, "tool")
            self.assertNotIn("reasoning_effort", child.attributes)
            self.assertNotIn("score", child.attributes)
            turn = next(span for span in trace.spans if span.name == "turn.completed")
            self.assertEqual(turn.kind, "generation")
            self.assertEqual(turn.usage.input_tokens, 11)
            dumped = json.dumps(
                {
                    "metadata": trace.metadata,
                    "attributes": [span.attributes for span in trace.spans],
                    "kinds": [span.kind for span in trace.spans],
                },
                ensure_ascii=False,
            )
            self.assertNotIn("langfuse.", dumped)

    def test_noop_exporter_keeps_score_and_stderr_quiet(self) -> None:
        call = ClientCall(
            predicted=["a"],
            command=["codex"],
            stdout="",
            stderr="",
            returncode=0,
            timed_out=False,
            parse_error=None,
        )
        sample = {"id": "s1", "prompt": "问题", "ground_truth": ["a"]}
        with tempfile.TemporaryDirectory() as tmp:
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                row = record_scored_sample(
                    Path(tmp),
                    sample,
                    call,
                    cell_id="cell-1",
                    client_id="codex",
                    repository_id="edges",
                    repository_url="https://github.com/VirusPC/edges.git",
                    repository_ref=None,
                    repository_commit=None,
                    exporter=langfuse_sink.exporter_from_env({}),
                )
            self.assertEqual(row["R@5"], 1.0)
            self.assertEqual(stderr.getvalue(), "")

    def test_raising_exporter_prints_one_line_and_keeps_score(self) -> None:
        call = ClientCall(
            predicted=["a"],
            command=["codex"],
            stdout="",
            stderr="",
            returncode=0,
            timed_out=False,
            parse_error=None,
        )
        sample = {"id": "s1", "prompt": "问题", "ground_truth": ["a"]}

        class Boom:
            def export(self, trace):
                raise RuntimeError("nope")

        with tempfile.TemporaryDirectory() as tmp:
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                row = record_scored_sample(
                    Path(tmp),
                    sample,
                    call,
                    cell_id="cell-1",
                    client_id="codex",
                    repository_id="edges",
                    repository_url="https://github.com/VirusPC/edges.git",
                    repository_ref="main",
                    repository_commit="abc",
                    exporter=Boom(),
                )
            self.assertEqual(row["id"], "s1")
            self.assertEqual(stderr.getvalue(), "retrieval_eval: trace export failed: RuntimeError\n")

    def test_build_sample_trace_omits_blank_optional_metadata(self) -> None:
        trace = build_sample_trace(
            events_jsonl="",
            cell_id="cell-1",
            sample_id="s1",
            client_id="codex",
            repository_id="edges",
            repository_url="https://github.com/VirusPC/edges.git",
            repository_ref=None,
            repository_commit="  ",
            prompt="问题",
            score_row={"score": 0, "predicted": []},
        )
        self.assertNotIn("repository_ref", trace.metadata)
        self.assertNotIn("repository_commit", trace.metadata)
        self.assertNotIn("model", trace.metadata)
        self.assertEqual(trace.spans[0].attributes["score"], "0")
        self.assertNotIn("grade", trace.spans[0].attributes)


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


def _pi_client(**overrides: object) -> Client:
    body: dict[str, object] = {
        "id": "pi",
        "command": "pi",
        "timeout_seconds": 600,
        "kind": "pi",
        "provider": "minimax-cn",
        "model": "MiniMax-M3",
        "thinking": "high",
        "env": {"MINIMAX_CN_API_KEY": "$MINIMAX_API_KEY", "PI_TELEMETRY": "0"},
    }
    body.update(overrides)
    return Client(**body)  # type: ignore[arg-type]


class PiClientTests(unittest.TestCase):
    def test_registry_keeps_codex_default_and_stores_env_references(self) -> None:
        cells = load_cells()
        self.assertEqual(len(cells), 1)
        self.assertEqual(cells[0].client.kind, "codex")
        self.assertEqual(cells[0].client.sandbox, "read-only")
        selected = override_cells(
            cells,
            client_ids=["pi"],
            sample_ids=["retrieval-smoke/edges-one"],
        )
        self.assertEqual(len(selected), 1)
        client = selected[0].client
        self.assertEqual(client.kind, "pi")
        self.assertEqual(client.command, "pi")
        self.assertIsNone(client.sandbox)
        self.assertEqual(client.provider, "minimax-cn")
        self.assertEqual(client.model, "MiniMax-M3")
        self.assertEqual(client.thinking, "high")
        self.assertFalse(hasattr(client, "tools"))
        raw_clients = json.loads((EVAL_DIR / "retrieval_eval" / "config" / "clients.json").read_text())
        self.assertNotIn("tools", raw_clients["pi"])
        self.assertEqual(client.timeout_seconds, 600)
        self.assertEqual(client.env, {"MINIMAX_CN_API_KEY": "$MINIMAX_API_KEY", "PI_TELEMETRY": "0"})
        self.assertEqual(
            client.reasoning_metadata(),
            {"provider": "minimax-cn", "model": "MiniMax-M3", "thinking": "high"},
        )
        samples = load_samples(selected[0].sample_path)
        self.assertEqual([sample["id"] for sample in samples], ["edges_smoke_0008"])

    def test_deny_read_expands_root_and_skips_symlinks(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "usr" / "bin").mkdir(parents=True)
            (root / "home").mkdir()
            (root / "proc").mkdir()
            (root / "dev").mkdir()
            (root / "sys").mkdir()
            (root / "bin").symlink_to("usr/bin")
            (root / "lib").symlink_to("usr/lib")
            (root / "README").write_text("x", encoding="utf-8")
            self.assertEqual(
                pi_deny_read_paths(root),
                [str(root / "home"), str(root / "usr")],
            )
            allow = pi_allow_read_paths(
                (
                    str(root / "usr"),
                    str(root / "bin"),
                    str(root / "lib64"),
                    str(root / "System"),
                )
            )
            self.assertEqual(allow, [".", str(root / "usr")])

    def test_sandbox_config_denies_real_root_dirs_and_disables_writes(self) -> None:
        config = json.loads(pi_sandbox_config_json())
        filesystem = config["filesystem"]
        self.assertEqual(set(config), {"filesystem"})
        self.assertEqual(set(filesystem), {"denyRead", "allowRead", "allowWrite", "denyWrite"})
        self.assertNotIn("/", filesystem["denyRead"])
        self.assertEqual(filesystem["allowWrite"], [])
        self.assertEqual(filesystem["allowRead"][0], ".")
        self.assertEqual(
            filesystem["denyWrite"],
            ["/tmp/agents", "/private/tmp/agents", "~/.npm/_logs", "~/.claude/debug"],
        )
        for path in filesystem["denyRead"]:
            entry = Path(path)
            self.assertFalse(entry.is_symlink(), path)
            self.assertTrue(entry.is_dir(), path)
            self.assertNotIn(entry.name, {"proc", "dev", "sys"})
        for path in filesystem["allowRead"][1:]:
            entry = Path(path)
            self.assertFalse(entry.is_symlink(), path)
            self.assertTrue(entry.is_dir(), path)
        if Path("/bin").is_symlink():
            self.assertNotIn("/bin", filesystem["denyRead"])
            self.assertNotIn("/bin", filesystem["allowRead"])
            self.assertIn("/usr", filesystem["denyRead"])
            self.assertIn("/usr", filesystem["allowRead"])
        self.assertEqual(pi_install_command(_pi_client())[2], "npm:pi-sandbox@0.7.1")
        check = pi_sandbox_check_command(Path("/tmp"), "bwrap")
        self.assertEqual(check[0], "bwrap")
        self.assertEqual(check[-1], "true")
        tmpfs = [check[index + 1] for index, arg in enumerate(check) if arg == "--tmpfs"]
        self.assertNotIn("/bin", tmpfs)
        self.assertIn("--ro-bind", check)

    def test_pi_command_is_minimal_kernel(self) -> None:
        prompt = build_prompt("问题")
        command = pi_command(_pi_client(), prompt)
        self.assertEqual(
            command,
            [
                "pi",
                "--mode",
                "json",
                "--no-session",
                "-ns",
                "-np",
                "-nc",
                "--no-themes",
                "--no-mcp",
                "-na",
                "--offline",
                "--model",
                "minimax-cn/MiniMax-M3",
                "--thinking",
                "high",
                "--",
                prompt,
            ],
        )
        self.assertNotIn("--tools", command)
        self.assertNotIn("-ne", command)
        self.assertNotIn("--no-extensions", command)
        self.assertNotIn("--sandbox", command)
        self.assertNotIn("--no-sandbox", command)
        self.assertNotIn("-o", command)
        self.assertNotIn("MINIMAX", " ".join(command))

    def test_print_command_for_pi_single_sample(self) -> None:
        stderr = io.StringIO()
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            code = main(["print-command", "--client", "pi", "--samples", "retrieval-smoke/edges-one"])
        text = stdout.getvalue()
        self.assertEqual(code, 0)
        self.assertIn("--mode json", text)
        self.assertIn("--model minimax-cn/MiniMax-M3", text)
        self.assertIn("--thinking high", text)
        self.assertIn("pi install npm:pi-sandbox@0.7.1 --no-approve", text)
        self.assertIn(pi_sandbox_config_json(), text)
        self.assertIn(" -- true", text)
        self.assertIn("--offline", text)
        self.assertNotIn("--tools", text)
        self.assertNotIn(" -ne ", f" {text} ")
        self.assertNotIn("codex exec", text)
        self.assertNotIn("--sandbox", text)
        self.assertNotIn("MINIMAX_API_KEY=", text)
        self.assertEqual(stderr.getvalue(), "")

    def test_run_closes_stdin_uses_repo_cwd_and_cleans_agent_dir(self) -> None:
        secret = "test-minimax-key"
        prompt = "问题"
        answer = '{"predicted":["docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md"]}\n'
        stdout = "\n".join(
            [
                json.dumps({"type": "session", "version": 3}),
                json.dumps(
                    {
                        "type": "message_end",
                        "message": {
                            "role": "assistant",
                            "stopReason": "stop",
                            "content": [{"type": "text", "text": answer}],
                            "provider": "minimax-cn",
                            "model": "MiniMax-M3",
                        },
                    }
                ),
            ]
        )
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            last = root / "last.txt"
            seen: dict[str, object] = {}

            def fake_run(command, **kwargs):
                agent_dir = kwargs["env"]["PI_CODING_AGENT_DIR"]
                seen["dir"] = agent_dir
                self.assertTrue(Path(agent_dir).is_dir())
                self.assertEqual(kwargs["cwd"], root)
                self.assertIs(kwargs["stdin"], subprocess.DEVNULL)
                self.assertEqual(kwargs["env"]["PI_TELEMETRY"], "0")
                self.assertEqual(kwargs["env"]["MINIMAX_CN_API_KEY"], secret)
                self.assertNotIn(secret, command)
                seen.setdefault("commands", []).append(command)
                if command[0] != "pi":
                    tmpfs = [command[index + 1] for index, arg in enumerate(command) if arg == "--tmpfs"]
                    self.assertTrue(tmpfs)
                    for path in tmpfs:
                        self.assertFalse(Path(path).is_symlink(), path)
                    self.assertEqual(command[-1], "true")
                    return subprocess.CompletedProcess(command, 0, stdout="", stderr="")
                self.assertEqual(command[0], "pi")
                if command[1] == "install":
                    config = json.loads((Path(agent_dir) / "sandbox.json").read_text(encoding="utf-8"))
                    self.assertEqual(config, json.loads(pi_sandbox_config_json()))
                    self.assertEqual(config["filesystem"]["allowWrite"], [])
                    self.assertNotIn("/", config["filesystem"]["denyRead"])
                    return subprocess.CompletedProcess(command, 0, stdout="Installed\n", stderr="")
                return subprocess.CompletedProcess(command, 0, stdout=stdout, stderr="pi-stderr\n")

            with patch.dict(os.environ, {"MINIMAX_API_KEY": secret}, clear=False):
                with patch("retrieval_eval.client.shutil.which", return_value="/usr/bin/true"):
                    with patch("retrieval_eval.client.subprocess.run", side_effect=fake_run):
                        call = run_client(_pi_client(), root, prompt, last)
            self.assertEqual(
                seen["commands"][0],
                ["pi", "install", "npm:pi-sandbox@0.7.1", "--no-approve"],
            )
            self.assertEqual(seen["commands"][2], pi_command(_pi_client(), prompt))
            self.assertEqual(seen["commands"][1][-1], "true")
            self.assertFalse(Path(seen["dir"]).exists())
            self.assertEqual(call.predicted, ["docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md"])
            self.assertIsNone(call.parse_error)
            self.assertEqual(call.stdout, stdout)
            self.assertEqual(call.stderr, "pi-stderr\n")
            self.assertEqual(last.read_text(encoding="utf-8"), answer)
            self.assertNotIn(secret, call.stdout)
            self.assertNotIn(secret, call.stderr or "")

    def test_failed_sandbox_install_does_not_run_pi(self) -> None:
        prompt = "问题"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            last = root / "last.txt"

            def fake_run(command, **kwargs):
                self.assertEqual(command[1], "install")
                return subprocess.CompletedProcess(command, 1, stdout="", stderr="npm ERR\n")

            with patch.dict(os.environ, {"MINIMAX_API_KEY": "secret"}, clear=False):
                with patch("retrieval_eval.client.shutil.which", return_value="/usr/bin/true"):
                    with patch("retrieval_eval.client.subprocess.run", side_effect=fake_run) as run:
                        call = run_client(_pi_client(), root, prompt, last)
            self.assertEqual(run.call_count, 1)
            self.assertEqual(call.predicted, [])
            self.assertEqual(call.parse_error, "pi install npm:pi-sandbox@0.7.1 failed")
            self.assertEqual(call.stderr, "npm ERR\n")
            self.assertFalse(last.exists())

    def test_missing_sandbox_dependency_does_not_run_pi(self) -> None:
        prompt = "问题"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            last = root / "last.txt"
            with patch.dict(os.environ, {"MINIMAX_API_KEY": "secret"}, clear=False):
                with patch("retrieval_eval.client.shutil.which", return_value=None):
                    with patch("retrieval_eval.client.subprocess.run") as run:
                        call = run_client(_pi_client(), root, prompt, last)
            run.assert_not_called()
            self.assertEqual(call.predicted, [])
            self.assertIsNotNone(call.parse_error)
            self.assertIn("Sandbox dependencies not available", call.parse_error or "")
            self.assertFalse(last.exists())

    def test_missing_bwrap_does_not_run_pi(self) -> None:
        prompt = "问题"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            last = root / "last.txt"

            def which(name: str) -> str | None:
                return None if name == "bwrap" else f"/usr/bin/{name}"

            with patch.dict(os.environ, {"MINIMAX_API_KEY": "secret"}, clear=False):
                with patch("retrieval_eval.client.shutil.which", side_effect=which):
                    with patch("retrieval_eval.client.subprocess.run") as run:
                        call = run_client(_pi_client(), root, prompt, last)
            run.assert_not_called()
            self.assertEqual(call.predicted, [])
            self.assertEqual(call.parse_error, "Sandbox dependencies not available: bwrap")
            self.assertFalse(last.exists())

    def test_sandbox_bash_check_failure_does_not_run_pi(self) -> None:
        prompt = "问题"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            last = root / "last.txt"
            seen: list[list[str]] = []

            def fake_run(command, **kwargs):
                seen.append(command)
                if len(command) > 1 and command[1] == "install":
                    return subprocess.CompletedProcess(command, 0, stdout="Installed\n", stderr="")
                return subprocess.CompletedProcess(
                    command,
                    1,
                    stdout="",
                    stderr="bwrap: Can't mount on symlink destination /bin\n",
                )

            with patch.dict(os.environ, {"MINIMAX_API_KEY": "secret"}, clear=False):
                with patch("retrieval_eval.client.shutil.which", return_value="/usr/bin/bwrap"):
                    with patch("retrieval_eval.client.subprocess.run", side_effect=fake_run):
                        call = run_client(_pi_client(), root, prompt, last)
            self.assertEqual(
                [command[1] if command[0] == "pi" else command[-1] for command in seen],
                ["install", "true"],
            )
            self.assertEqual(call.predicted, [])
            self.assertIn("pi sandbox bash check failed", call.parse_error or "")
            self.assertIn("Can't mount on symlink destination /bin", call.parse_error or "")
            self.assertFalse(last.exists())

    def test_exit_zero_with_error_stop_reason_is_parse_error(self) -> None:
        stdout = (EVAL_DIR / "tests" / "fixtures" / "pi_error.jsonl").read_text(encoding="utf-8")
        predicted, error = parse_pi_answer(stdout, 0)
        self.assertEqual(predicted, [])
        self.assertEqual(error, "401 authentication_error: invalid api key")

    def test_final_answer_joins_text_blocks_of_last_stop(self) -> None:
        earlier = '{"predicted":["wrong.md"]}'
        stdout = "\n".join(
            [
                json.dumps(
                    {
                        "type": "message_end",
                        "message": {
                            "role": "assistant",
                            "stopReason": "stop",
                            "content": [{"type": "text", "text": earlier}],
                        },
                    }
                ),
                json.dumps(
                    {
                        "type": "message_end",
                        "message": {
                            "role": "assistant",
                            "stopReason": "toolUse",
                            "content": [{"type": "toolCall", "id": "1", "name": "read", "arguments": {}}],
                        },
                    }
                ),
                json.dumps({"type": "compaction_start"}),
                json.dumps(
                    {
                        "type": "message_end",
                        "message": {
                            "role": "assistant",
                            "stopReason": "stop",
                            "content": [
                                {"type": "thinking", "thinking": "ignore"},
                                {"type": "text", "text": '{"predicted":'},
                                {"type": "text", "text": '["a.py"]}'},
                            ],
                        },
                    }
                ),
            ]
        )
        predicted, error = parse_pi_answer(stdout, 0)
        self.assertIsNone(error)
        self.assertEqual(predicted, ["a.py"])

    def test_missing_referenced_env_skips_process_without_leaking(self) -> None:
        secret = "test-minimax-key"
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            env = os.environ.copy()
            env.pop("MINIMAX_API_KEY", None)
            with patch.dict(os.environ, env, clear=True):
                with patch("retrieval_eval.client.subprocess.run") as run:
                    call = run_client(_pi_client(), root, "问题", root / "last.txt")
            run.assert_not_called()
        self.assertEqual(call.parse_error, "missing environment variable MINIMAX_API_KEY")
        self.assertNotIn(secret, call.parse_error or "")
        self.assertEqual(call.predicted, [])
        self.assertEqual(call.stdout, "")

    def test_version_is_first_stdout_line(self) -> None:
        with patch("retrieval_eval.client.subprocess.run") as run:
            run.return_value = subprocess.CompletedProcess(["pi", "--version"], 0, stdout="1.3.0\n", stderr="")
            self.assertEqual(read_command_version("pi"), "1.3.0")
            self.assertIs(run.call_args.kwargs["stdin"], subprocess.DEVNULL)
        with patch("retrieval_eval.client.subprocess.run") as run:
            run.return_value = subprocess.CompletedProcess(["pi", "--version"], 1, stdout="", stderr="no")
            self.assertIsNone(read_command_version("pi"))

    def test_sample_trace_dispatches_on_client_kind(self) -> None:
        events = (EVAL_DIR / "tests" / "fixtures" / "pi_error.jsonl").read_text(encoding="utf-8")
        codex_trace = build_sample_trace(
            events_jsonl=events,
            cell_id="cell",
            sample_id="edges_smoke_0008",
            client_id="pi",
            repository_id="edges",
            repository_url="https://github.com/VirusPC/edges.git",
            repository_ref="main",
            repository_commit="abc",
            prompt="问题",
            score_row={"predicted": [], "parse_error": "401 authentication_error: invalid api key"},
        )
        self.assertEqual(len(codex_trace.spans), 1)
        pi_trace = build_sample_trace(
            events_jsonl=events,
            cell_id="cell",
            sample_id="edges_smoke_0008",
            client_id="pi",
            client_kind="pi",
            client_version="1.3.0",
            repository_id="edges",
            repository_url="https://github.com/VirusPC/edges.git",
            repository_ref="main",
            repository_commit="abc",
            prompt="问题",
            score_row={"predicted": [], "parse_error": "401 authentication_error: invalid api key"},
            reasoning={"provider": "minimax-cn", "model": "MiniMax-M3", "thinking": "high"},
        )
        self.assertEqual(pi_trace.metadata["model"], "MiniMax-M3")
        self.assertEqual(pi_trace.metadata["provider"], "minimax-cn")
        self.assertEqual(pi_trace.metadata["client_version"], "1.3.0")
        self.assertNotIn("codex_version", pi_trace.metadata)
        self.assertGreater(len(pi_trace.spans), 1)
        self.assertEqual(pi_trace.spans[0].attributes["thinking"], "high")
        generation = next(span for span in pi_trace.spans if span.kind == "generation")
        self.assertEqual(generation.status, "error")
        self.assertEqual(generation.attributes["stopReason"], "error")

    def test_pi_root_span_covers_fixture_children(self) -> None:
        events = (
            EVAL_DIR.parent / "observation" / "langfuse_sink" / "tests" / "fixtures" / "pi_success.jsonl"
        ).read_text(encoding="utf-8")
        upload = 2_000_000_000_000_000_000
        with patch("retrieval_eval.trace._now_ns", return_value=upload):
            trace = build_sample_trace(
                events_jsonl=events,
                cell_id="edges__pi__retrieval-smoke_edges-one",
                sample_id="edges_smoke_0008",
                client_id="pi",
                client_kind="pi",
                repository_id="edges",
                repository_url="https://github.com/VirusPC/edges.git",
                repository_ref="main",
                repository_commit="abc",
                prompt="问题",
                score_row={"predicted": ["docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md"], "score": 1.0},
            )
        root, *children = trace.spans
        self.assertGreater(len(children), 1)
        child_start = min(span.start_time_unix_nano for span in children)
        child_end = max(span.end_time_unix_nano for span in children)
        self.assertLess(child_start, upload)
        self.assertEqual(root.start_time_unix_nano, child_start)
        self.assertEqual(root.end_time_unix_nano, max(upload + 1_000_000, child_end))
        for child in children:
            self.assertGreaterEqual(child.start_time_unix_nano, root.start_time_unix_nano)
            self.assertLessEqual(child.end_time_unix_nano, root.end_time_unix_nano)

    def test_codex_root_span_stays_on_upload_clock(self) -> None:
        upload = 5_000_000_000
        with patch("retrieval_eval.trace._now_ns", return_value=upload):
            trace = build_sample_trace(
                events_jsonl=_events(),
                cell_id="cell",
                sample_id="s1",
                client_id="codex",
                repository_id="edges",
                repository_url="https://github.com/VirusPC/edges.git",
                repository_ref="main",
                repository_commit="abc",
                prompt="问题",
                score_row={"predicted": ["a"], "score": 1.0},
            )
        root, *children = trace.spans
        self.assertGreater(len(children), 0)
        self.assertEqual(root.start_time_unix_nano, upload)
        self.assertEqual(root.end_time_unix_nano, upload + (len(children) + 1) * 1_000_000)


if __name__ == "__main__":
    unittest.main()
