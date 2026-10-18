---
name: project_retrieval_eval_migration
description: >-
  检索评测配置是 git URL（可选 ref）、agent client、samples。入口
  .harness/evaluation/retrieval_eval/run.py：print-command 只打印命令，run 克隆后用 codex
  exec 只读沙箱打分。实机六题尚未跑。分数只是评测冒烟。
metadata:
  edges-title: 检索评测 runner 已按 URL、codex、样本集实现
  edges-type: project
  edges-origin-session-id: dc0a1783-fa65-4670-a7f0-1a1c1292f136
  edges-agent-client: cursor
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-10-18T22:33:28+08:00'
---

2026-10-18 grill 已确认，并已按该理解写了 runner。实机 `codex` 六题还没跑。

配置只有三维：git repository（远程 URL，可选 ref）、agent client、samples。缺省 ref 用远程默认分支，报告记下实际 commit。仓库有没有 Compose block 由仓库自己决定。第一组是 `https://github.com/VirusPC/edges.git`、ref `main`、`codex`、`.harness/evaluation/cases/retrieval-smoke/edges.json`。

入口是 `.harness/evaluation/retrieval_eval/run.py`。`print-command` 只打印克隆和 `codex exec --sandbox read-only`。`run` 克隆到 `.harness/evaluation/.cache/retrieval/`（gitignore），再打分。综合分沿用源打分器，有序样本用 R@5，同时报 P@5 / nDCG@5。分数只是评测冒烟。

**Why:** 用户确认 Q12 按这版实现。通用 SDK、http workflow、codewiz、内网 MCP 不在这轮。

**How to apply:** 改检索评测时保持这三个配置维。不要把本机绝对路径写进仓库维，不要在评测里 init 或修改 Compose block。实机跑用 `python3 .harness/evaluation/retrieval_eval/run.py run`。离线测试是 `python3 -m unittest discover -s .harness/evaluation/tests -p test_retrieval_eval.py -v`。
