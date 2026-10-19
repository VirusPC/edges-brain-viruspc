# retrieval-smoke

检索评测的链路冒烟样本。格式与源仓库 `samples/*.json` 相同：`ground_truth` 里扁平字符串是必须覆盖的簇，嵌套数组是簇内任一路径即可。路径相对检索语料仓库根。

这 6 题只为把「读样本 → 跑 → 打分」跑通。题目和 gold 是按仓库现有文件写的，不是质量基准，也不是公开基准证明。

- [`edges.json`](edges.json)

跑法见 [`../../retrieval_eval/run.py`](../../retrieval_eval/run.py)。`print-command` 只打印命令；`run` 会克隆仓库并调用本机 `codex exec --json`。每个样本的事件流在 `.harness/evaluation/.cache/retrieval/sessions/<时间戳>/<cell_id>/<样本 id>.events.jsonl`（gitignore），不写进报告。若同时设置了 `LANGFUSE_HOST`、`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`，打分后会按 observation smoke 的 OTLP 路径可选上传；缺变量或上传失败都不影响分数。
