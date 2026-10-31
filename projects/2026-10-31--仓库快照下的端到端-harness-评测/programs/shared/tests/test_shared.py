"""公共实验控制与判分的离线检查，不执行 Agent。"""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SHARED = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SHARED))
import common


class SharedTests(unittest.TestCase):
    """确保原生接入更换后，输入隔离、错误语义与 A/B 完整性仍成立。"""

    def setUp(self):
        """为每项检查创建独立临时目录；完成后自动清理。"""
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_edges_root_is_independent_of_project_repository(self):
        """项目在个人脑时，从共同工作区找到框架；旧的框架内位置仍可识别。"""
        frame = self.root / "workspace/edges"
        marker = frame / "packages/evaluation/experiments/harness_memory_ablation/score.py"
        marker.parent.mkdir(parents=True)
        marker.touch()
        with patch.dict(os.environ, {}, clear=True):
            start = self.root / "workspace/.work/brain/projects/demo/programs/shared"
            self.assertEqual(common.resolve_edges_root(start), frame)
            self.assertEqual(common.resolve_edges_root(frame / "projects/demo/programs/shared"), frame)

    def test_explicit_edges_root_takes_priority(self):
        """显式 EDGES_ROOT 用于独立 clone 和容器，不依赖固定目录深度。"""
        frame = self.root / "custom-framework"
        marker = frame / "packages/evaluation/experiments/harness_memory_ablation/score.py"
        marker.parent.mkdir(parents=True)
        marker.touch()
        with patch.dict(os.environ, {"EDGES_ROOT": str(frame)}):
            self.assertEqual(common.resolve_edges_root(self.root / "unrelated"), frame.resolve())

    def test_missing_edges_root_reports_actionable_error(self):
        """错误的显式路径应明确失败，不能悄悄绑定另一份框架。"""
        with patch.dict(os.environ, {"EDGES_ROOT": str(self.root / "missing")}):
            with self.assertRaisesRegex(FileNotFoundError, "EDGES_ROOT"):
                common.resolve_edges_root(self.root)

    def test_trial_copy_does_not_change_next_copy(self):
        """前一次修改不能影响冻结快照或下一次副本。"""
        source = self.root / "source"
        source.mkdir()
        (source / "file").write_text("original")
        first = common.prepare_workspace(source, self.root / "first")
        (first / "file").write_text("changed")
        second = common.prepare_workspace(source, self.root / "second")
        self.assertEqual((source / "file").read_text(), "original")
        self.assertEqual((second / "file").read_text(), "original")

    def test_symlink_cannot_expose_other_snapshot(self):
        """拒绝软链接，防止 off 目录通过链接访问 on 或宿主材料。"""
        source = self.root / "source"
        source.mkdir()
        (source / "link").symlink_to(self.root)
        with self.assertRaises(ValueError):
            common.prepare_workspace(source, self.root / "copy")

    def test_context_has_one_snapshot_and_no_worker_or_answers(self):
        """构建上下文只包含本条件，不把题集或旧执行 worker 放进镜像。"""
        contexts = common.build_contexts(self.root / "contexts", SHARED / "fixtures/memory-off",
                                        SHARED / "fixtures/memory-on", "python:3.12-slim")
        self.assertFalse((contexts["off"] / "workspace/.edges").exists())
        self.assertTrue((contexts["on"] / "workspace/.edges/memory/deploy.md").exists())
        self.assertFalse(list((self.root / "contexts").rglob("cases.json")))
        self.assertFalse(list((self.root / "contexts").rglob("agent_worker.py")))

    def test_execution_failure_does_not_get_scored(self):
        """失败的执行即使残留正确回答，也不能被当成答对。"""
        case = {"case_id": "M", "category": "memory-dependent", "question": "q", "criteria": ["a"], "violations": []}
        trial = common.score_result(case, common.normalize_result("a", error="timeout"), "memory:on", 1, "fixture")
        self.assertIsNone(trial["verdict"])

    def test_complete_export_with_execution_errors_is_not_success(self):
        """样本数量齐全但运行失败时保留报告，并让入口非零退出；错误不能算成成功。"""
        case = {"case_id": "M", "category": "memory-dependent", "question": "q", "criteria": ["a"], "violations": []}
        trials = [common.score_result(case, common.normalize_result("", error="model-not-found"),
                                       "memory:" + c, 1, "skip") for c in common.CONDITIONS]
        path = self.root / "failed.json"
        with self.assertRaises(RuntimeError):
            common.write_comparison(path, trials, ["M"], 1, {})
        self.assertEqual(json.loads(path.read_text())["execution_status"], "failed")

    def test_incomplete_trials_cannot_produce_conclusion(self):
        """少一题或少一次重复时保存 partial，拒绝计算完整 A/B 结论。"""
        path = self.root / "result.json"
        with self.assertRaises(ValueError):
            common.write_comparison(path, [], ["M"], 2, {})
        self.assertEqual(json.loads(path.read_text())["status"], "incomplete")

    def test_unknown_usage_is_not_zero(self):
        """框架没有提供用量时保持 None，避免把未知成本算成免费。"""
        self.assertIsNone(common.normalize_result("a")["input_tokens"])
        self.assertEqual(common.normalize_result("a", usage={"input_tokens": 0})["input_tokens"], 0)

    def test_cli_missing_usage_detail_stays_unknown(self):
        """CLI 只提供输入／输出用量时，缓存和 reasoning 明细仍是未知。"""
        events = [{"type": "item.completed", "item": {"type": "agent_message", "text": "a"}},
                  {"type": "turn.completed", "usage": {"input_tokens": 10, "output_tokens": 3}}]
        raw = common.codex_result("\n".join(json.dumps(e) for e in events))
        self.assertIsNone(raw["cached_input_tokens"])
        self.assertIsNone(raw["reasoning_tokens"])

    def test_failed_codex_turn_preserves_execution_error(self):
        """最后一个 turn 失败时，前一个回答不应掩盖失败。"""
        events = [{"type": "item.completed", "item": {"type": "agent_message", "text": "old"}},
                  {"type": "turn.failed", "error": {"message": "unavailable"}}]
        raw = common.codex_result("\n".join(json.dumps(e) for e in events))
        self.assertEqual(raw["error"], "codex:turn-failed")

    def test_truncated_codex_log_is_not_success(self):
        """有中间回答但没有 turn.completed 的截断日志不能当作正常结束。"""
        events = json.dumps({"type": "item.completed", "item": {"type": "agent_message", "text": "partial"}})
        self.assertEqual(common.codex_result(events)["error"], "codex:incomplete-turn")

    def test_skip_is_unscored(self):
        """skip 保留答案，但 verdict 为空。"""
        case = {"case_id": "M", "category": "memory-dependent", "question": "q", "criteria": ["a"], "violations": []}
        trial = common.score_result(case, common.normalize_result("a"), "memory:on", 1, "skip")
        self.assertIsNone(trial["verdict"])

    def test_home_imports_only_auth(self):
        """每次创建独立 HOME，只导入指定鉴权文件，不复制配置和记忆。"""
        auth = self.root / "auth.json"
        auth.write_text('{"test":"offline"}')
        first = common.isolated_codex_home(self.root / "homes", auth)
        second = common.isolated_codex_home(self.root / "homes", auth)
        self.assertNotEqual(first, second)
        self.assertEqual({p.name for p in first.iterdir()}, {"auth.json"})
        self.assertEqual((first / "auth.json").stat().st_mode & 0o777, 0o600)

    def test_controller_home_keeps_docker_config(self):
        """隔离控制器缓存时保留原来的 Docker context。"""
        with patch.dict(os.environ, {"HOME": "/original-user"}, clear=True):
            env = common.controller_environment(self.root / "controller")
        self.assertEqual(env["DOCKER_CONFIG"], "/original-user/.docker")
        self.assertNotEqual(env["HOME"], "/original-user")

    def test_host_copy_does_not_claim_controlled_ablation(self):
        """目录副本可描述输出差异，但不能自动推导 memory 是否值得默认开启。"""
        case = {"case_id": "M", "category": "memory-dependent", "question": "q", "criteria": ["a"], "violations": []}
        trials = [common.score_result(case, common.normalize_result("a"), "memory:" + c, 1, "fixture") for c in common.CONDITIONS]
        report = common.write_comparison(self.root / "host.json", trials, ["M"], 1, {"controlled_filesystem": False})
        self.assertIsNone(report["worth_default_on"])
        self.assertEqual(report["comparison_validity"], "exploratory-host-filesystem")


if __name__ == "__main__":
    unittest.main()
