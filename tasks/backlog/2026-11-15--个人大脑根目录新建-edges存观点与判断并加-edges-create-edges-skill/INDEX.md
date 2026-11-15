---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-15T08:07:20.877Z'
  edges-title: 个人大脑根目录新建 edges/，存观点与判断，并加 edges-create-edges skill
  edges-tasks-status: backlog
  edges-task-priority: none
name: 个人大脑根目录新建_edges存观点与判断并加_edges_create_edges_skill
description: 给观点、洞察、判断和决策这类内容一个专门的落脚处，每个点一篇，格式统一成一句话加解释。
---
**背景：**
今天在 H52 上，用户提出在个人大脑根目录建一个叫 edges 的文件夹，专门记录一个个观点、洞察、判断和决策。每个点单独一篇，保持精简。原本准备直接交给云端 Agent 去做，用户喊停，改成先记一张任务卡。
- 现有笔记（notes）和任务（tasks）都装不下这种短小的单点判断。
- 关联：skill 命名与现有 edges-create-notes、edges-create-tasks 对齐。
- 待核实：记忆里提到大脑仓库可能已有 edges/ 目录，动手前需先确认它现在装的是什么，避免撞名。

**目标：**
个人大脑根目录有一个初始化好 .edges 的 edges/ 文件夹，并配一个 edges-create-edges skill，可以按统一格式一篇篇写入观点和判断。

**动作：**
- 在仓库根目录建 edges/，并初始化它的 .edges。
- 在 .edges 里加 edges-create-edges skill，规定每篇的格式是一句话加解释，每篇只写一个点。

**完成标准：**
- [ ] 仓库根目录有 edges/，里面有初始化好的 .edges。
- [ ] .edges 里有 edges-create-edges skill，写明「一句话 + 解释」的格式和一篇一个点的要求。
