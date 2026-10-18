# reports/

某次评测运行的报告。有真实结果再往这里写；不要预埋假分数。

- [2026-10-11 MemoryBench NFCats / MiniMax-M2.5](2026-10-11-memorybench-nfcats-smoke-minimax-m2.5.md)：无记忆与 BM25-M 各 10 题，两组均为 4.5/5；链路冒烟，未接入 Edges Project Memory。

LoCoMo 报告都是 Evaluation Smoke，不是 Benchmark Proof，也不是 Project Memory proof。

检索评测报告由 `retrieval_eval/run.py run` 写出，文件名带时间戳和 cell id，标题标明 Evaluation Smoke。没有真实运行就不要在这里放分数。

- **Preferred official path** (`evaluation/run_locomo_official.py`): `{date}-locomo-official-smoke-{model}.md` / `.json`。F1 来自 submodule 的 `task_eval/evaluation.py`。
- **Legacy hand-port** (`evaluation/cases/locomo-smoke/`): `{date}-locomo-smoke-{model}.md` / `.json`。PR #70 历史报告保留，不要无故删除。
- Dummy dry-run（占位答案）用日期后缀 `-dry-run`，例如 `2026-09-16-locomo-smoke-dry-run.md`。

约定见上一级 [README](../README.md)。
