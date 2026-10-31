"""检查 Harbor 原生 Codex 任务与事件判分，不启动容器。"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PROGRAMS = Path(__file__).resolve().parents[2]


class HarborTests(unittest.TestCase):
    """使用真实 SDK 验证任务，并把原生 JSONL 交给共享判分。"""

    def test_prepare_uses_builtin_codex(self):
        """Job 选择 codex，Task 导出内置 adapter 实际写入的 codex.txt。"""
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "harbor"
            p = subprocess.run([sys.executable, str(PROGRAMS / "harbor/harbor_eval.py"),
                                "--prepare-only", "--output", str(output)], capture_output=True, text=True, timeout=30)
            self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
            self.assertEqual(json.loads((output / "framework-config.json").read_text())["agent"], "codex")
            from harbor.models.task.task import Task
            from harbor.agents.installed.codex import Codex
            self.assertEqual(Codex.name(), "codex")
            tasks = list((output / "tasks").iterdir())
            self.assertEqual(len(tasks), 4)
            for path in tasks:
                task = Task(path)
                self.assertIn("/logs/agent/codex.txt", task.config.artifacts)
                self.assertEqual(task.config.verifier.environment_mode, "separate")
                self.assertFalse(list((path / "environment").rglob("case.json")))

    def test_verifier_parses_codex_stdout(self):
        """用内置 adapter 的 JSONL artifact 判分，保留回答和 tokens。"""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            case = {"case_id": "M", "category": "memory-dependent", "question": "q", "criteria": ["a"], "violations": []}
            (root / "case.json").write_text(json.dumps(case))
            events = [{"type": "item.completed", "item": {"type": "agent_message", "text": "a"}},
                      {"type": "turn.completed", "usage": {"input_tokens": 10, "output_tokens": 3}}]
            (root / "codex.txt").write_text("\n".join(json.dumps(e) for e in events))
            p = subprocess.run([sys.executable, str(PROGRAMS / "harbor/harbor_verify.py"), "--case", str(root / "case.json"),
                                "--events", str(root / "codex.txt"), "--condition", "on", "--judge", "fixture",
                                "--output", str(root / "verified")], capture_output=True, text=True, timeout=10)
            self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
            trial = json.loads((root / "verified/trial.json").read_text())
            self.assertEqual(trial["answer"], "a")
            self.assertEqual(trial["verdict"], "correct")
            self.assertEqual(trial["input_tokens"], 10)


if __name__ == "__main__":
    unittest.main()
