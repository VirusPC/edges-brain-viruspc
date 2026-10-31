"""Harbor 独立 verifier：读取内置 Codex 的 JSONL artifact，用共同 score_result 评分。"""

import argparse
import json
import sys
from pathlib import Path

# 容器只需共享 runtime；本地执行时从同级 shared 目录导入。
runtime = Path("/opt/ablation")
shared_dir = runtime if (runtime / "common.py").is_file() else Path(__file__).resolve().parents[1] / "shared"
sys.path.insert(0, str(shared_dir))
from common import codex_result, normalize_result, score_result, write_json


def main() -> None:
    """读取可信 case 与受测结果，写 trial.json 和 Harbor reward.json；无返回值。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", type=Path, required=True)
    parser.add_argument("--events", type=Path, required=True)
    parser.add_argument("--condition", choices=["off", "on"], required=True)
    parser.add_argument("--judge", choices=["fixture", "skip", "llm"], required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    case = json.loads(args.case.read_text(encoding="utf-8"))
    try:
        raw = codex_result(args.events.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raw = normalize_result("", error="missing-or-invalid-artifact")
    trial = score_result(case, raw, f"memory:{args.condition}", 1, args.judge)
    reward = {"scored": float(trial["verdict"] is not None)}
    if trial["verdict"] is not None:
        reward["quality"] = {"correct": 1.0, "partial": 0.5, "incorrect": 0.0}[trial["verdict"]]
    write_json(args.output / "trial.json", trial)
    write_json(args.output / "reward.json", reward)


if __name__ == "__main__":
    main()
