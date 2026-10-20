# retrieval-smoke

检索评测的链路冒烟样本。格式与源仓库 `samples/*.json` 相同：`ground_truth` 里扁平字符串是必须覆盖的簇，嵌套数组是簇内任一路径即可。路径相对检索语料仓库根。

这 6 题只为把「读样本 → 跑 → 打分」跑通。题目和 gold 是按仓库现有文件写的，不是质量基准，也不是公开基准证明。

- [`edges.json`](edges.json)：6 题，默认 `codex` cell 用这份
- [`edges-one.json`](edges-one.json)：只含 `edges_smoke_0008`，给单样本冒烟

跑法见 [`../../retrieval_eval/run.py`](../../retrieval_eval/run.py)。`print-command` 只打印命令；`run` 会克隆仓库并调用 client。默认是本机 `codex exec --json`。pi（Node.js >= 22.19，`minimax-cn` / `MiniMax-M3`）用默认工具，并在当次临时 `PI_CODING_AGENT_DIR` 里 `pi install npm:pi-sandbox@0.7.1`。`denyRead` 是根下真实目录（跳过符号链接和 proc/dev/sys），`allowRead` 是当前目录和仍为真实目录的系统路径，`allowWrite` 为 `[]`；prompt 前用同一配置跑 `true`。Codex 不变。命令：

```bash
python3 .harness/evaluation/retrieval_eval/run.py print-command --client pi --samples retrieval-smoke/edges-one
MINIMAX_API_KEY=... python3 .harness/evaluation/retrieval_eval/run.py run --client pi --samples retrieval-smoke/edges-one
```

`MINIMAX_API_KEY` 在运行时映射为 `MINIMAX_CN_API_KEY`，值不进仓库。每个样本的事件流在 `.harness/evaluation/.cache/retrieval/sessions/<时间戳>/<cell_id>/<样本 id>.events.jsonl`（gitignore），不写进报告。若同时设置了 `LANGFUSE_HOST`、`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`，打分后经 Observation 的 `TraceExporter` 可选上报；缺变量或上传失败都不影响分数。同一次 `run` 共用 session id `retrieval/{样本集}:{仓库}:{client}/{时间戳}/{4位hex}`，每个样本仍是一条 trace。
