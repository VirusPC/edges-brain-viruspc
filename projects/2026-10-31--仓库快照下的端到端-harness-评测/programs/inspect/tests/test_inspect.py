"""使用真实 Inspect SWE 构建 Task，不启动容器或调用模型。"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PROGRAMS = Path(__file__).resolve().parents[2]


class InspectTests(unittest.TestCase):
    """检查正式 Codex solver 与不包含评分标准的环境。"""

    def test_prepare_native_codex_tasks(self):
        """实际 SDK 构建两个 Task，准备阶段不启动自写执行 worker。"""
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "inspect"
            p = subprocess.run([sys.executable, str(PROGRAMS / "inspect/inspect_eval.py"),
                                "--prepare-only", "--output", str(output)], capture_output=True, text=True, timeout=30)
            self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
            config = json.loads((output / "framework-config.json").read_text())
            self.assertEqual(config["solver"], "inspect_swe/codex_cli")
            self.assertEqual(config["tasks"], 2)
            self.assertEqual(config["sample_count"], 8)
            self.assertFalse(list((output / "contexts").rglob("agent_worker.py")))
            self.assertFalse((output / "contexts/off/workspace/.edges").exists())

    def test_cached_usage_uses_inspect_field_names(self):
        """Inspect 的 cache-read 字段要正确映射；不能把已知缓存用量丢成 None。"""
        import importlib.util
        from inspect_ai.model import ModelUsage
        spec = importlib.util.spec_from_file_location("native_inspect", PROGRAMS / "inspect/inspect_eval.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        usage = ModelUsage(input_tokens=10, output_tokens=3, total_tokens=13, input_tokens_cache_read=2)
        self.assertTrue(hasattr(module, "normalize_usage"), "缺少正式 ModelUsage 的映射")
        normalized = module.normalize_usage({"model": usage})
        self.assertEqual(normalized["cached_input_tokens"], 2)


if __name__ == "__main__":
    unittest.main()
