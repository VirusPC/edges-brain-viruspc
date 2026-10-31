"""真实 Promptfoo + Codex SDK 的离线协议检查，不调用模型。"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PROGRAMS = Path(__file__).resolve().parents[2]


class PromptfooTests(unittest.TestCase):
    """原生 SDK 负责调用测试 CLI，验证目录、HOME、重复和判分。"""

    def test_builtin_codex_sdk_runs_isolated_trials(self):
        """实际执行 SDK；8 个 trial 须隔离，保留真实响应协议中的 tokens。"""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            fake = root / "codex"
            fake.write_text((PROGRAMS / "shared/tests/fake_codex.py").read_text())
            fake.chmod(0o755)
            output = root / "result"
            p = subprocess.run([sys.executable, str(PROGRAMS / "promptfoo/promptfoo_eval.py"),
                                "--codex-path", str(fake), "--output", str(output)],
                               capture_output=True, text=True, timeout=120)
            self.assertEqual(p.returncode, 0, (p.stdout + p.stderr)[-6000:])
            config = json.loads((output / "promptfooconfig.json").read_text())
            self.assertTrue(all(p["id"] == "openai:codex-sdk" for p in config["providers"]))
            report = json.loads((output / "result.json").read_text())
            native_rows = json.loads((output / "promptfoo-results.json").read_text())["results"]["results"]
            self.assertEqual(report["status"], "complete")
            self.assertEqual(len(report["trials"]), 8)
            self.assertEqual({t["repeat"] for t in report["trials"]}, {1, 2})
            self.assertTrue(all(t["input_tokens"] == 10 and t["output_tokens"] == 3 and not t["error"] for t in report["trials"]),
                            {"rows": [{"error": r.get("error"), "vars": r.get("vars", {}).get("trialDir"),
                                       "test_vars": r.get("testCase", {}).get("vars", {}).get("trialDir")} for r in native_rows],
                             "files": [str(p) for p in output.rglob("scored.json")]})
            self.assertEqual([t["verdict"] for t in report["trials"] if t["case_id"] == "M01"],
                             ["incorrect", "incorrect", "correct", "correct"])
            self.assertEqual(len(list((output / "codex-homes").iterdir())), 8)
            self.assertTrue(all(t["cached_input_tokens"] == 2 and t["reasoning_tokens"] is None for t in report["trials"]))

    def test_single_repeat_export(self):
        """原生导出在仅一次重复时省略 repeatIndex；仍须归一化成 repeat=1。"""
        import importlib.util
        from types import SimpleNamespace
        spec = importlib.util.spec_from_file_location("native_promptfoo", PROGRAMS / "promptfoo/promptfoo_eval.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "native.json"
            path.write_text(json.dumps({"results": {"results": [{
                "id": "failed", "vars": {"case": {"case_id": "M", "question": "q", "category": "memory-dependent",
                                                "criteria": ["a"], "violations": []}},
                "provider": {"label": "memory:off"}, "response": {"error": "offline"},
            }]}}))
            trials = module.collect_trials(path, SimpleNamespace(repeats=1, judge="fixture"))
            self.assertEqual(trials[0]["repeat"], 1)
            self.assertIsNone(trials[0]["verdict"])
            self.assertTrue(trials[0]["error"])


if __name__ == "__main__":
    unittest.main()
