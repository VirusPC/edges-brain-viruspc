"""Run retrieval eval cells: clone a git URL, ask the agent client, score paths.

`codex exec --json` prints one JSON event per line (commands, reasoning,
the final message, and token usage on `turn.completed`). `pi --mode json`
prints one JSON event per line as well (assistant `message_end`, tool
execution). `run` stores that stream at
`.harness/evaluation/.cache/retrieval/sessions/<stamp>/<cell_id>/<sample_id>.events.jsonl`
and stderr beside it as `<sample_id>.stderr.txt`. Both are gitignored.
Codex scoring reads `<sample_id>.last.txt`, the file passed to `-o`. pi has
no `-o`; the runner writes the final answer text to that same path.
When `LANGFUSE_HOST` (or `LANGFUSE_BASE_URL`), `LANGFUSE_PUBLIC_KEY`, and
`LANGFUSE_SECRET_KEY` are all set, each scored sample is exported through
`langfuse_sink.exporter_from_env()`. This module does not name Langfuse
attributes. One `run` shares a session id
`retrieval/{sample set}:{repository}:{client}/{stamp}/{4 hex}`
(multiple cells joined with `+`). Each sample stays its own trace. Missing
env skips export. A failed export prints one stderr line and does not change
the score. The instance origin and keys stay out of the repo and out of
`reports/`.

    python3 .harness/evaluation/retrieval_eval/run.py print-command
    python3 .harness/evaluation/retrieval_eval/run.py run
    python3 .harness/evaluation/retrieval_eval/run.py run --client pi --samples retrieval-smoke/edges-one
"""

from __future__ import annotations

import argparse
import json
import shlex
import sys
from collections.abc import Mapping
from datetime import datetime
from pathlib import Path
from typing import Any, Sequence

_EVAL_DIR = Path(__file__).resolve().parents[1]
if str(_EVAL_DIR) not in sys.path:
    sys.path.insert(0, str(_EVAL_DIR))

from retrieval_eval.client import (
    ClientCall,
    build_prompt,
    codex_command,
    pi_command,
    pi_install_command,
    pi_sandbox_check_command,
    pi_sandbox_config_json,
    read_command_version,
    run_client,
)
from retrieval_eval.config import DEFAULT_CONFIG, Cell, ConfigError, load_cells, load_samples, override_cells
from retrieval_eval.git_repo import cache_dir, sync_clone
from retrieval_eval.report import write_report
from retrieval_eval.score import aggregate, score_prediction
from retrieval_eval.trace import build_sample_trace, session_id_for_run

# retrieval_eval/__init__.py puts `.harness/observation` on sys.path before this import.
from langfuse_sink import ExportResult, exporter_from_env


CACHE_ROOT = _EVAL_DIR / ".cache" / "retrieval"
REPORTS_DIR = _EVAL_DIR / "reports"


def write_sample_trace(log_dir: Path, sample_id: str, call: ClientCall) -> None:
    """Persist one sample's `--json` event stream and stderr in the session cache."""
    (log_dir / f"{sample_id}.events.jsonl").write_text(call.stdout, encoding="utf-8")
    (log_dir / f"{sample_id}.stderr.txt").write_text(call.stderr, encoding="utf-8")


def record_scored_sample(
    log_dir: Path,
    sample: Mapping[str, Any],
    call: ClientCall,
    *,
    cell_id: str,
    client_id: str,
    repository_id: str,
    repository_url: str,
    repository_ref: str | None,
    repository_commit: str | None,
    session_id: str | None = None,
    reasoning: Mapping[str, str] | None = None,
    exporter: Any = None,
    client_kind: str = "codex",
    client_version: str | None = None,
) -> dict[str, Any]:
    """Write the local trace, score the prediction, then export the trace."""
    write_sample_trace(log_dir, sample["id"], call)
    row = score_prediction(sample["ground_truth"], call.predicted)
    row["id"] = sample["id"]
    row["prompt"] = sample["prompt"]
    row["parse_error"] = call.parse_error
    row["timed_out"] = call.timed_out
    row["returncode"] = call.returncode
    trace = build_sample_trace(
        events_jsonl=call.stdout,
        cell_id=cell_id,
        sample_id=sample["id"],
        client_id=client_id,
        repository_id=repository_id,
        repository_url=repository_url,
        repository_ref=repository_ref,
        repository_commit=repository_commit,
        prompt=sample["prompt"],
        score_row=row,
        session_id=session_id,
        reasoning=reasoning,
        client_kind=client_kind,
        client_version=client_version,
    )
    sink = exporter if exporter is not None else exporter_from_env()
    try:
        result = sink.export(trace)
    except Exception as exc:
        result = ExportResult("failed", error=type(exc).__name__)
    if result.status == "failed":
        print(f"retrieval_eval: trace export failed: {result.error}", file=sys.stderr)
    return row


def print_command(cells: Sequence[Cell]) -> str:
    """Show the clone and client commands for the first sample. Does not run them."""
    if not cells:
        raise SystemExit("no cells")
    cell = cells[0]
    samples = load_samples(cell.sample_path)
    dest = cache_dir(CACHE_ROOT, cell.repository.id, cell.repository.ref)
    ref = cell.repository.ref
    lines = [
        f"git clone --no-recurse-submodules {cell.repository.url} {dest}",
    ]
    if ref:
        lines.append(f"git -C {dest} fetch --no-recurse-submodules origin {ref}")
        lines.append(f"git -C {dest} checkout --detach FETCH_HEAD")
    else:
        lines.append(f"git -C {dest} fetch --no-recurse-submodules origin")
        lines.append(f"git -C {dest} checkout --detach origin/HEAD")
    last_message = CACHE_ROOT / "sessions" / "<stamp>" / cell.cell_id / f"{samples[0]['id']}.last.txt"
    prompt = build_prompt(samples[0]["prompt"])
    if cell.client.kind == "pi":
        command = pi_command(cell.client, prompt)
        lines.append(
            "PI_CODING_AGENT_DIR=<fresh> " + shlex.join(pi_install_command(cell.client))
        )
        lines.append(
            "write $PI_CODING_AGENT_DIR/sandbox.json " + pi_sandbox_config_json()
        )
        lines.append(shlex.join(pi_sandbox_check_command(dest, "bwrap")))
        lines.append(f"(cd {shlex.quote(str(dest))} && {shlex.join(command)})")
    else:
        command = codex_command(cell.client, dest, prompt, last_message)
        lines.append(shlex.join(command))
    return "\n".join(lines)


def run_cells(cells: Sequence[Cell], reports_dir: Path = REPORTS_DIR) -> list[dict[str, Any]]:
    """Clone, query the client, score, and write one report per cell."""
    payloads = []
    stamp = datetime.now().strftime("%Y-%m-%d-%H%M%S")
    session_id = session_id_for_run(
        [(cell.sample_id, cell.repository.id, cell.client.id) for cell in cells],
        stamp,
    )
    for cell in cells:
        payloads.append(_run_cell(cell, reports_dir, stamp, session_id))
    return payloads


def _run_cell(cell: Cell, reports_dir: Path, stamp: str, session_id: str) -> dict[str, Any]:
    dest = cache_dir(CACHE_ROOT, cell.repository.id, cell.repository.ref)
    commit = sync_clone(cell.repository.url, cell.repository.ref, dest)
    samples = load_samples(cell.sample_path)
    log_dir = CACHE_ROOT / "sessions" / stamp / cell.cell_id
    log_dir.mkdir(parents=True, exist_ok=True)
    client_version = read_command_version(cell.client.command) if cell.client.kind == "pi" else None
    scored: list[dict[str, Any]] = []
    for sample in samples:
        last_message = log_dir / f"{sample['id']}.last.txt"
        call = run_client(cell.client, dest, build_prompt(sample["prompt"]), last_message)
        row = record_scored_sample(
            log_dir,
            sample,
            call,
            cell_id=cell.cell_id,
            client_id=cell.client.id,
            repository_id=cell.repository.id,
            repository_url=cell.repository.url,
            repository_ref=cell.repository.ref,
            repository_commit=commit,
            session_id=session_id,
            reasoning=cell.client.reasoning_metadata(),
            client_kind=cell.client.kind,
            client_version=client_version,
        )
        scored.append(row)
    payload = {
        "kind": "evaluation-smoke",
        "cell_id": cell.cell_id,
        "repository": {
            "id": cell.repository.id,
            "url": cell.repository.url,
            "ref": cell.repository.ref,
            "commit": commit,
        },
        "client": cell.client.id,
        "reasoning": cell.client.reasoning_record(),
        "sample_id": cell.sample_id,
        "samples": scored,
        "aggregate": aggregate(scored),
    }
    (log_dir / "result.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    write_report(reports_dir / f"{stamp}-retrieval-smoke-{cell.cell_id}", payload)
    return payload


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Retrieval eval: repository × client × samples")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("print-command", "run"):
        command_parser = sub.add_parser(name)
        command_parser.add_argument("--client", action="append", dest="clients", default=None)
        command_parser.add_argument("--samples", action="append", dest="samples", default=None)
    args = parser.parse_args(argv)
    try:
        cells = override_cells(
            load_cells(args.config),
            client_ids=args.clients,
            sample_ids=args.samples,
            config_dir=args.config.parent,
        )
    except ConfigError as exc:
        print(f"retrieval_eval: {exc}", file=sys.stderr)
        return 2
    if args.command == "print-command":
        print(print_command(cells))
        return 0
    run_cells(cells)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
