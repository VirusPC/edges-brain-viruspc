"""DeepEval 自定义 Metric：评分只调用共同 shared，不实现另一套标准。"""
from pathlib import Path
import sys

from deepeval.metrics import BaseMetric
from deepeval.test_case import LLMTestCase

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "shared"))
from common import score_result, write_json


class SharedMemoryMetric(BaseMetric):
    """质量指标或纯执行指标；每个 measure 保存可独立审计的共同 trial。"""

    def __init__(self, judge: str):
        """选择和其他入口一致的 fixture/llm/skip judge，不在构造时调用模型。"""
        self.judge = judge
        self.threshold = 1.0
        self.async_mode = False
        self.verbose_mode = False

    def measure(self, test_case: LLMTestCase, *args, **kwargs) -> float:
        """从控制器 metadata 取执行结果，评分后写 trial；失败保持 verdict=None。"""
        data = test_case.metadata
        trial = score_result(data["case"], data["raw"], data["condition"], data["repeat"], self.judge)
        write_json(Path(data["trial_path"]), trial)
        self.error = trial.get("error")
        self.score = (float(not self.error) if self.judge == "skip" else
                      {"correct": 1.0, "partial": 0.5}.get(trial["verdict"], 0.0))
        self.reason = self.error or trial["verdict"] or "仅检查执行；未评价回答质量"
        self.success = not self.error and self.score >= self.threshold
        return self.score

    async def a_measure(self, test_case: LLMTestCase, *args, **kwargs) -> float:
        """满足 BaseMetric 异步接口；本实验串行运行，不并发调用 judge。"""
        return self.measure(test_case, *args, **kwargs)

    def is_successful(self) -> bool:
        """返回最近一次 measure 的通过状态；执行错误始终失败。"""
        return bool(self.success) and not self.error

    @property
    def __name__(self) -> str:
        """给原生结果显示准确指标名，区分运行成功和回答正确。"""
        return "ExecutionSucceeded" if self.judge == "skip" else "TaskQuality"
