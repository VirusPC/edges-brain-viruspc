"""Harbor separate verifier; gold labels exist only in the verifier's /tests."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from metrics import evaluate_artifact


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--events", type=Path, default=Path("/logs/agent/codex.txt"))
    parser.add_argument("--output", type=Path, default=Path("/logs/verifier"))
    args = parser.parse_args()
    spec = json.loads(args.spec.read_text())
    text = args.events.read_text() if args.events.is_file() else ""
    result = evaluate_artifact(spec, text)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / "trial.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    reward = {"execution_succeeded": float(result["error"] is None)}
    for name in ("selected_recall_at_5", "evidence_recall_at_5", "answer_checks_pass"):
        if result[name] is not None:
            reward[name] = result[name]
    (args.output / "reward.json").write_text(json.dumps(reward) + "\n")


if __name__ == "__main__":
    main()
