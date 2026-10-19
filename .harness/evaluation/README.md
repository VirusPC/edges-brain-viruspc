# 评测 (evaluation/)

`evaluation/` 评测**整套 Edges**：skills、记忆循环、note→edge 流程、Agent 对着本仓库的行为等。这是系统元工作，不是个人知识笔记，也不进入 notes → edges → archive 主链。

## 放什么

- 评测用例、harness、benchmark 定义、scorecard
- 对照某次变更或某条假设的评测报告
- 用来判断「系统有没有变好」的可复现实验设计

## 不放什么

- 个人认知资产、研究笔记、对外博客 → [`knowledge/`](../../knowledge)
- 已采纳的决策、纠错、操作手册 → [`.harness/memory/`](.harness/memory/)
- 接入 Edges 的 CLI / MCP / skill 实现 → [`extensions/`](../../extensions/README.md)
- 野外使用记录、运行日志、仪表盘笔记 → [`observation/`](../observation/README.md)
- 编造的数据集、假分数、尚未跑过的「结果」

本仓公开。用例与报告按根 README「公开仓库边界」脱敏；不要写入凭据、未公开 IP 或可识别个人。

## 和其他目录的关系

| 目录 | 关系 |
| --- | --- |
| [`knowledge/`](../../knowledge) | 认知资产。评测可以*调用*其中的材料当输入，但不把报告写成 Note / Edge / Post。一条评测结论若值得沉淀为可复用判断，先回到捕获入口。 |
| [`.harness/memory/`](.harness/memory/) | 运营账本。评测*发现*并被采纳的决策写进所属作用域的 `.harness/memory`；过程、用例和分数留在本目录。 |
| [`extensions/`](../../extensions/README.md) | 接口层。评测对象常常是 extensions 的行为；评测用例本身不因此变成 extension。 |
| [`observation/`](../observation/README.md) | 观测提供「野外看到了什么」；本目录把假设做成可复现对照。观测不是评测。 |

## 起步布局

先有真实用例再往下加目录，不要预埋空数据文件。

- [`run_locomo_official.py`](run_locomo_official.py)：首选官方路径（VirusPC/locomo submodule → `task_eval/evaluate_qa.py` → official `evaluation.py` F1）
- [`third_party/`](third_party/README.md)：评测用 git submodule（现有 [`third_party/locomo/`](third_party/locomo)）
- [`retrieval_eval/`](retrieval_eval/run.py)：仓库 URL × agent client × samples 的检索评测。第一组克隆 `edges` 的 `main`，用 `codex exec` 交出路径，按簇打 P@5 / R@5 / nDCG@5。这是评测冒烟。
- [`cases/`](cases/README.md)：用例与 benchmark 定义（[`cases/locomo-smoke/`](cases/locomo-smoke/README.md) 是历史 hand-port，legacy）
- [`reports/`](reports/README.md)：某次运行的报告
- 本 README

LoCoMo 冒烟是 Evaluation Smoke，不是 Benchmark Proof，也不是 Project Memory proof。见 [`docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md`](../../docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md)。

## Clone with the LoCoMo submodule

```bash
git clone --recurse-submodules https://github.com/VirusPC/edges.git
```

Already cloned without the submodule:

```bash
git submodule update --init .harness/evaluation/third_party/locomo
```

## Preferred official-path smoke

Print the official `evaluate_qa.py` command (no API key; safe in CI):

```bash
python3 .harness/evaluation/run_locomo_official.py print-command
```

Live conv-44 / 2 QA per category / `kimi-for-coding` run (key via env, never commit the key):

```bash
pip install -r .harness/evaluation/third_party/locomo/requirements-openai-compat.txt
KIMI_API_KEY=... OPENAI_BASE_URL=https://api.kimi.com/coding/v1 \
  python3 .harness/evaluation/run_locomo_official.py smoke
```

Optional official crop (keeps `observation` / `session_summary` / `event_summary` for later RAG; default out-file is gitignored under `.harness/evaluation/.cache/`):

```bash
python3 .harness/evaluation/run_locomo_official.py crop
```

Reports go to [`reports/`](reports/README.md) with titles that say **Evaluation Smoke / not Project Memory proof**. F1 is official `task_eval/evaluation.py`, not the hand-port in `cases/locomo-smoke/scoring.py`.

Retrieval smoke prints the clone and `codex exec` commands without running them:

```bash
python3 .harness/evaluation/retrieval_eval/run.py print-command
```

A live run clones `https://github.com/VirusPC/edges.git` at `main` into `.harness/evaluation/.cache/` (gitignored), then runs `codex exec --json` once per sample. The default `codex` client also passes `-c model_reasoning_summary=detailed`, `-c show_raw_agent_reasoning=true`, and `-c model_reasoning_effort=high`, so the event stream includes `reasoning` items. Those three settings are written on the report and on the Langfuse root span (`reasoning_summary`, `reasoning_effort`, `show_raw_reasoning`) so runs with different effort are not compared silently. Change them in [`retrieval_eval/config/clients.json`](retrieval_eval/config/clients.json). The report lands in [`reports/`](reports/README.md) and is an Evaluation Smoke, not a Benchmark Proof.

```bash
python3 .harness/evaluation/retrieval_eval/run.py run
```

过程痕迹留在缓存，不进 `reports/`。一次 `run` 后，样本 `<sample_id>` 的事件流（`command_execution`、`reasoning`、`agent_message`、`turn.completed` 里的 token usage）在：

`.harness/evaluation/.cache/retrieval/sessions/<时间戳>/<cell_id>/<sample_id>.events.jsonl`

同目录的 `<sample_id>.last.txt` 是 `-o` 写下的最终消息，打分优先读它；`<sample_id>.stderr.txt` 是该次进程的 stderr。文件搜索和读取没有单独的事件类型，它们出现在 `command_execution`（`rg`、`cat` 等）里。

可选：三个环境变量都设置时，每个样本打分后会把这份事件流用 OTLP POST 到 `$LANGFUSE_HOST/api/public/otel/v1/traces`（Basic auth，与 [`observation/smoke/langfuse-otlp-smoke.sh`](../observation/smoke/langfuse-otlp-smoke.sh) 相同）。变量是 `LANGFUSE_HOST`（未设置时用 `LANGFUSE_BASE_URL`）、`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`。缺任何一个就跳过；上传失败也不影响打分。密钥和实例域名不要写进仓库，轨迹也不进 `reports/`。

同一次 `run` 在 Langfuse 里共用一个 session，每个样本仍是一条 trace。session id 是 `retrieval/{样本集}:{仓库}:{client}/{时间戳}/{4位hex}`，不是单独的时间戳。样本集路径里的 `/` 写成 `:`；仓库 id 若已是样本集最后一段就不再重复。多个 cell 用 `+` 连起来。例如 `retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/ab12`。事件流里若已有 `model` 或 `cli_version`，会抄到每条 span；不会再跑 `codex --version`。

Official-path tests (no API key):

```bash
python3 -m unittest discover -s .harness/evaluation/tests -v
```
