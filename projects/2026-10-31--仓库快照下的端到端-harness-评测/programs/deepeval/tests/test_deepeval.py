"""真实 DeepEval 配合离线 Codex 协议替身，不发起模型请求。"""
import json
import importlib.util
import os
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

PROGRAMS = Path(__file__).resolve().parents[2]
ENTRY = PROGRAMS / "deepeval/deepeval_eval.py"


class DeepEvalTests(unittest.TestCase):
    """验证第四个入口的框架评分、条件隔离和失败报告。"""

    def run_program(self, root, *, fake_source=None, extra=()):
        """安装协议替身并运行入口；返回进程结果和输出目录。"""
        fake = root / "codex"
        fake.write_text(fake_source or (PROGRAMS / "shared/tests/fake_codex.py").read_text())
        fake.chmod(0o755)
        output = root / "result"
        env = dict(os.environ, CONFIDENT_API_KEY="must-not-be-used", DEEPEVAL_TELEMETRY_OPT_OUT="1")
        process = subprocess.run(
            [sys.executable, str(ENTRY), "--codex-path", str(fake), "--output", str(output), *extra],
            env=env, capture_output=True, text=True, timeout=90,
        )
        return process, output

    def test_prepare_only_needs_no_codex(self):
        """准备阶段只冻结材料，缺少 CLI 不应阻止生成实验定义。"""
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "result"
            process = subprocess.run(
                [sys.executable, str(ENTRY), "--prepare-only", "--codex-path", "/missing/codex",
                 "--output", str(output)], capture_output=True, text=True, timeout=30,
            )
            self.assertEqual(process.returncode, 0, process.stderr)
            config = json.loads((output / "framework-config.json").read_text())
            self.assertEqual(config["test_cases"], 8)
            self.assertEqual(config["metric"], "TaskQuality")
            self.assertFalse((output / "result.json").exists())

    def test_real_deepeval_scores_eight_isolated_trials(self):
        """实际 evaluate() 须完成 8 次调用，复用 shared 分数并保留协议用量。"""
        with tempfile.TemporaryDirectory() as directory:
            process, output = self.run_program(Path(directory))
            self.assertEqual(process.returncode, 0, (process.stdout + process.stderr)[-5000:])
            report = json.loads((output / "result.json").read_text())
            native = json.loads((output / "deepeval-results.json").read_text())
            self.assertEqual(len(native["test_results"]), 8)
            self.assertIsNone(native["confident_link"])
            self.assertEqual(len(report["trials"]), 8)
            self.assertEqual({t["repeat"] for t in report["trials"]}, {1, 2})
            self.assertEqual([t["verdict"] for t in report["trials"] if t["case_id"] == "M01"],
                             ["incorrect", "incorrect", "correct", "correct"])
            self.assertTrue(all(t["input_tokens"] == 10 and t["output_tokens"] == 3
                                and t["cached_input_tokens"] == 2 and t["reasoning_tokens"] is None
                                and not t["error"] for t in report["trials"]))
            self.assertEqual(len(list((output / "codex-homes").iterdir())), 8)
            self.assertFalse(report["metadata"]["controlled_filesystem"])
            self.assertIsNone(report["worth_default_on"])
            self.assertEqual(report["comparison_validity"], "exploratory-host-filesystem")
            self.assertTrue(list((output / "deepeval-results").glob("test_run_*.json")))

    def test_skip_checks_execution_without_inventing_quality(self):
        """skip 模式只有执行指标，共同报告不能把运行成功当作答对。"""
        with tempfile.TemporaryDirectory() as directory:
            process, output = self.run_program(Path(directory), extra=("--judge", "skip", "--repeats", "1"))
            self.assertEqual(process.returncode, 0, (process.stdout + process.stderr)[-5000:])
            report = json.loads((output / "result.json").read_text())
            native = json.loads((output / "deepeval-results.json").read_text())
            self.assertTrue(all(t["verdict"] is None for t in report["trials"]))
            self.assertTrue(all(r["metrics_data"][0]["name"] == "ExecutionSucceeded" for r in native["test_results"]))

    def test_failed_execution_saves_report_and_removes_imported_auth(self):
        """失败的 Codex turn 不送质量评分，仍保存完整报告并清理复制的登录文件。"""
        fake_source = '''#!/usr/bin/env python3
import sys
if "--version" in sys.argv:
    print("codex-cli 0.156.1")
else:
    print('{"type":"turn.failed","error":{"message":"offline failure"}}')
    sys.exit(1)
'''
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            auth = root / "auth.json"
            auth.write_text('{"offline":"test-only"}')
            process, output = self.run_program(root, fake_source=fake_source,
                                               extra=("--repeats", "1", "--auth-json", str(auth)))
            self.assertNotEqual(process.returncode, 0)
            report = json.loads((output / "result.json").read_text())
            self.assertEqual(report["execution_status"], "failed")
            self.assertEqual(len(report["trials"]), 4)
            self.assertTrue(all(t["error"] and t["verdict"] is None for t in report["trials"]))
            self.assertEqual(list((output / "codex-homes").rglob("auth.json")), [])
            self.assertTrue(auth.exists())

    def test_timeout_also_stops_cli_child(self):
        """超时必须终止原生 CLI 子进程，避免包装进程已结束后模型仍运行。"""
        spec = importlib.util.spec_from_file_location("deep_eval_entry", ENTRY)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            marker = root / "escaped-child"
            child_code = f"import time; from pathlib import Path; time.sleep(2); Path({str(marker)!r}).touch()"
            fake = root / "codex"
            fake.write_text("#!/usr/bin/env python3\nimport subprocess, sys, time\n"
                            f"subprocess.Popen([sys.executable, '-c', {child_code!r}])\ntime.sleep(20)\n")
            fake.chmod(0o755)
            args = SimpleNamespace(output=root, auth_json=None, codex_path=fake,
                                   model="offline", reasoning_effort="medium", timeout=1)
            result = module.run_codex(args, root, "offline question")
            self.assertEqual(result["error"], "timeout")
            time.sleep(1.5)
            self.assertFalse(marker.exists())

    def test_cancellation_cleans_process_and_respects_explicit_auth(self):
        """取消也应回收进程；显式登录文件不能被宿主环境 API key 抢占。"""
        spec = importlib.util.spec_from_file_location("deep_eval_cancel", ENTRY)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            auth = root / "auth.json"
            auth.write_text('{"offline":"test-only"}')
            args = SimpleNamespace(output=root, auth_json=auth, codex_path=root / "unused",
                                   model="offline", reasoning_effort="medium", timeout=1)
            process = Mock(pid=123456789)
            process.communicate.side_effect = KeyboardInterrupt
            with patch.dict(os.environ, {"OPENAI_API_KEY": "dummy-openai", "CODEX_API_KEY": "dummy-codex"}), \
                    patch.object(module.subprocess, "Popen", return_value=process) as popen, \
                    patch.object(module.os, "killpg") as killpg:
                with self.assertRaises(KeyboardInterrupt):
                    module.run_codex(args, root, "offline question")
                agent_env = popen.call_args.kwargs["env"]
                self.assertNotIn("OPENAI_API_KEY", agent_env)
                self.assertNotIn("CODEX_API_KEY", agent_env)
                killpg.assert_called()
                process.wait.assert_called()
            self.assertEqual(list((root / "codex-homes").rglob("auth.json")), [])


if __name__ == "__main__":
    unittest.main()
