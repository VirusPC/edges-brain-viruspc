# cases/

评测用例与 benchmark 定义。有真实用例再往这里加文件；不要预埋空数据或虚构数据集。

- **Preferred official path:** [`../run_locomo_official.py`](../run_locomo_official.py) via the [`../third_party/locomo`](../third_party/locomo) submodule. Official `task_eval/evaluate_qa.py` + `evaluation.py` F1. Evaluation Smoke, not Benchmark Proof / not Project Memory proof.
- [`locomo-smoke/`](locomo-smoke/README.md)： **legacy hand-port** of F1 + truncated context (PR #70). Kept for history and existing reports. New runs should use the official submodule path.
- [`memorybench-smoke/`](memorybench-smoke/README.md)：固定官方 MemoryBench 代码和 NFCats 数据的小规模无记忆 / BM25-M 对照，记录真实请求、检索、回答与原生评分；未接入 Edges Project Memory。
- [`retrieval-smoke/`](retrieval-smoke/README.md)：edges 仓库自有路径的检索评测冒烟样本（6 题）。只为跑通链路，不是质量基准。

约定见上一级 [README](../README.md)。
