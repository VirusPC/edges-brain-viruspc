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

A live run clones `https://github.com/VirusPC/edges.git` at `main` into `.harness/evaluation/.cache/` (gitignored), then runs `codex` once per sample. The report lands in [`reports/`](reports/README.md) and is an Evaluation Smoke, not a Benchmark Proof.

```bash
python3 .harness/evaluation/retrieval_eval/run.py run
```

Official-path tests (no API key):

```bash
python3 -m unittest discover -s .harness/evaluation/tests -v
```
