---
metadata:
  edges-type: task
  edges-task-project: agent-product-eval
  edges-updated-at: '2026-11-01T08:36:36.127Z'
  edges-title: 把 edges/_eval_* 迁入 Agent产品评测 Project
  edges-tasks-status: todo
  edges-task-priority: medium
name: 把_edges_eval_迁入_agent产品评测_project
description: 新建 projects/2026-06-21--Agent产品评测，迁入五个 _eval_* 并更新引用
---

**背景：**
博客站部署后，用户要求把脑仓 `edges/` 下几个 `eval_xxx` 转到顶层 `projects/`。随后补充：单独开一个「Agent产品评测」Project，日期按其中最早文件的创建时间定。盘点后对应五个目录：`_eval_agent_desktop`、`_eval_ai_product`、`_eval_api`、`_eval_cli`、`_eval_web`。Git 批量入库约在 2026-10-05，但目录内 Obsidian 粘贴图文件名最早为 `Pasted image 20260621155432.png`，故 Project 日期取 **2026-06-21**。`evaluations/` 与既有 `projects/2026-10-31--仓库快照下的端到端-harness-评测` 不在本次范围。

**目标：**
在脑仓顶层建立 `projects/2026-06-21--Agent产品评测/`，把上述五个 `_eval_*` 迁入该 Project，并更新仓内旧路径引用，使评测素材与知识区 `edges/` 职责分开。

**动作：**
- 新建 `projects/2026-06-21--Agent产品评测/`（含 INDEX/README 若仓内 projects 惯例需要）
- `git mv` 五个 `edges/_eval_*` 到该 Project 下（保留目录名，除非实现时另有约定）
- 更新 `edges/README`、`projects/README` 及仓内指向旧路径的链接/配置
- 开 PR 合入 `VirusPC/edges-brain-viruspc` main

**完成标准：**
- [ ] `projects/2026-06-21--Agent产品评测/` 下可见五个 `_eval_*`（或等价整理后的结构）
- [ ] `edges/` 顶层不再保留这五个 `_eval_*`
- [x] 仓内明显旧路径引用已更新；PR 已开

**实现进度：**
- 内容迁移 PR（未合）：https://github.com/VirusPC/edges-brain-viruspc/pull/426 — `git mv` 五目录入 `projects/2026-06-21--Agent产品评测/`；INDEX + `projects/README` 已登记；`edges/README` 与笔记 wiki 链已改；站点构建后 `/projects/` 可见「Agent产品评测」。未动 `evaluations/`、端到端 harness 评测、`posts/`、看板文件（本卡在 #425）。合入后勾前两项完成标准并可考虑标 done。
