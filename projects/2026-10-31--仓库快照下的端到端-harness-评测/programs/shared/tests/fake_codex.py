#!/usr/bin/env python3
"""测试用 CLI 协议替身；不是 Codex 或真实模型实验。"""
import json
import os
import sys
from pathlib import Path


def main() -> None:
    """接受 SDK 参数，检查 HOME 无前次状态，读工作副本并输出合法事件。"""
    if "--version" in sys.argv:
        print("codex-cli 0.156.1")
        return
    home = Path(os.environ["CODEX_HOME"])
    if (home / "previous-call").exists():
        raise SystemExit("Codex HOME 被前一次调用污染")
    (home / "previous-call").write_text("used")
    work = Path(sys.argv[sys.argv.index("--cd") + 1]) if "--cd" in sys.argv else Path.cwd()
    question = sys.stdin.read()
    answer = "4" if "2 + 2" in question else "release/personal" if (work / ".edges/memory/deploy.md").exists() else "不知道"
    for event in (
        {"type": "thread.started", "thread_id": "offline"}, {"type": "turn.started"},
        {"type": "item.completed", "item": {"id": "answer", "type": "agent_message", "text": answer}},
        {"type": "turn.completed", "usage": {"input_tokens": 10, "cached_input_tokens": 2, "output_tokens": 3}},
    ):
        print(json.dumps(event, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
