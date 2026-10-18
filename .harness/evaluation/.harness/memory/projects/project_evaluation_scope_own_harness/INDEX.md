---
name: project_evaluation_scope_own_harness
description: >-
  查评测层决策或给检索题标 gold 时：.harness/evaluation 自带 .harness。LoCoMo 官方冒烟入口在这一层的项目记忆
  INDEX，不在根 .harness/memory，也不等于评测 README。
metadata:
  edges-title: 评测作用域有自己的 .harness
  edges-type: project
  edges-origin-session-id: dc0a1783-fa65-4670-a7f0-1a1c1292f136
  edges-agent-client: cursor
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-10-18T23:15:35+08:00'
---

`.harness/evaluation` 自己是一个作用域。系统入口是 `.harness/evaluation/AGENTS.md`，材料在 `.harness/evaluation/.harness/`。LoCoMo 官方冒烟入口记在这一层的项目记忆 `.harness/evaluation/.harness/memory/projects/project_locomo_official_submodule_path/INDEX.md`，不在仓库根 `.harness/memory/`。

**Why:** 2026-10-18 检索冒烟里，题面是「LoCoMo 官方冒烟跑哪个入口、用什么环境变量」。codex 把 `.harness/evaluation/README.md` 排在第一，R@5 仍是 0。README 里已经写了 `run_locomo_official.py` 和 `KIMI_API_KEY`，但 gold 是评测层那条项目记忆。用户确认评测目录下有自己的 harness，并要求记下。

**How to apply:** 查评测层的决策、约束或给这类题标 gold 时，打开 `.harness/evaluation/.harness/memory/`，不要只看根记忆或评测 README。README 能回答操作问题，不等于命中这一层的项目记忆。
