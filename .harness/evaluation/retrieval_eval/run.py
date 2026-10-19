"""Run retrieval eval cells: clone a git URL, ask the agent client, score paths.

`codex exec --json` prints one JSON event per line (commands, reasoning,
the final message, and token usage on `turn.completed`). `run` stores that
stream at `.harness/evaluation/.cache/retrieval/sessions/<stamp>/<cell_id>/<sample_id>.events.jsonl`
and stderr beside it as `<sample_id>.stderr.txt`. Both are gitignored.
Scoring reads `<sample_id>.last.txt`, the file passed to `-o`.

    python3 .harness/evaluation/retrieval_eval/run.py print-command
    python3 .harness/evaluation/retrieval_eval/run.py run
"""

from __future__ import annotations

import argparse
import json
import shlex
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Sequence

_EVAL_DIR = Path(__file__).resolve().parents[1]
if str(_EVAL_DIR) not in sys.path:
    sys.path.insert(0, str(_EVAL_DIR))

from retrieval_eval.client import ClientCall, build_prompt, codex_command, run_client
from retrieval_eval.config import DEFAULT_CONFIG, Cell, load_cells, load_samples
from retrieval_eval.git_repo import cache_dir, sync_clone
from retrieval_eval.report import write_report
from retrieval_eval.score import aggregate, score_prediction


CACHE_ROOT = _EVAL_DIR / ".cache" / "retrieval"
REPORTS_DIR = _EVAL_DIR / "reports"


def write_sample_trace(log_dir: Path, sample_id: str, call: ClientCall) -> None:
    """Persist one sample's `--json` event stream and stderr in the session cache."""
    (log_dir / f"{sample_id}.events.jsonl").write_text(call.stdout, encoding="utf-8")
    (log_dir / f"{sample_id}.stderr.txt").write_text(call.stderr, encoding="utf-8")


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
    command = codex_command(
        cell.client,
        dest,
        build_prompt(samples[0]["prompt"]),
        last_message,
    )
    lines.append(shlex.join(command))
    return "\n".join(lines)


def run_cells(cells: Sequence[Cell], reports_dir: Path = REPORTS_DIR) -> list[dict[str, Any]]:
    """Clone, query the client, score, and write one report per cell."""
    payloads = []
    stamp = datetime.now().strftime("%Y-%m-%d-%H%M%S")
    for cell in cells:
        payloads.append(_run_cell(cell, reports_dir, stamp))
    return payloads


def _run_cell(cell: Cell, reports_dir: Path, stamp: str) -> dict[str, Any]:
    dest = cache_dir(CACHE_ROOT, cell.repository.id, cell.repository.ref)
    commit = sync_clone(cell.repository.url, cell.repository.ref, dest)
    samples = load_samples(cell.sample_path)
    log_dir = CACHE_ROOT / "sessions" / stamp / cell.cell_id
    log_dir.mkdir(parents=True, exist_ok=True)
    scored: list[dict[str, Any]] = []
    for sample in samples:
        last_message = log_dir / f"{sample['id']}.last.txt"
        call = run_client(cell.client, dest, build_prompt(sample["prompt"]), last_message)
        write_sample_trace(log_dir, sample["id"], call)
        row = score_prediction(sample["ground_truth"], call.predicted)
        row["id"] = sample["id"]
        row["prompt"] = sample["prompt"]
        row["parse_error"] = call.parse_error
        row["timed_out"] = call.timed_out
        row["returncode"] = call.returncode
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
    sub.add_parser("print-command")
    sub.add_parser("run")
    args = parser.parse_args(argv)
    cells = load_cells(args.config)
    if args.command == "print-command":
        print(print_command(cells))
        return 0
    run_cells(cells)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
