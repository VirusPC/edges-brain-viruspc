---
title: Edges 记忆作用域分享稿：四种记忆与三层结构
---
# Edges 记忆作用域分享稿：四种记忆与三层结构

## 背景

2026-11-19 17:57 用户在 Grok Bot 对话里贴出一份关于 edges 的分享讲稿，让助手评审；助手给出修改意见，并提出可按意见直接改成完整稿（用户未回应是否采纳）。

## 讲稿结构

- 按作用域把记忆分四种：工作记忆（大模型固定上下文窗口）、用户记忆（类似 Claude Code auto memory，只有本人可见，换人则消失）、项目记忆（以项目仓库为中心，任何人或 Agent 都能快速理解项目、写出像样的代码）、团队记忆（跨项目仓库，新项目能复用既有经验与团队规范）。对组织而言后两者更重要。
- edges 三层：①项目记忆：为仓库任意目录加长期记忆，该目录下放 AGENTS.md 与记忆文件夹，AGENTS.md 索引记忆；各级 AGENTS.md 按目录关系形成依附于目录结构的记忆树，agent 从根 AGENTS.md 出发检索与沉淀；monorepo 可每个模块一套，根目录放跨模块公共记忆。优势：记忆随仓库做 git 版本管理与人审，分支间天然隔离，回滚代码即回滚记忆，不绑定任何人、agent 或外部系统；目录粒度解决 monorepo 下的隔离、冲突与检索效率。讲稿称相比 Claude Code、Codex 的平铺记忆有 36% token 节省与 16% 检索速度提升。②project harness：把 memory 文件夹升级为 harness 文件夹，拆出 memory、skills、notes、tasks、routine 等模块，且可对每个模块目录递归建 harness，实现自进化。③personal harness：把 harness 抽成独立 git 仓库，在 Grok Bot、Codex 等 agent 间共享上下文；并围绕个人日常做 personal evaluation（把 Langfuse 接入各客户端收集 trace，再周期性 eval 寻找 harness 改进空间）。

## 助手评审意见（当日对话）

1. 开头承诺团队记忆更重要，但三层里没有正面讲跨仓库团队记忆，只在第一层末尾留占位；建议放进第三层（独立仓库经 Compose 挂到各项目，即跨仓库复用机制），或单独加 team harness 一层。
2. 第一层末尾「如何检索？如何维护 wiki？cli」悬空：检索已在前文讲过，补一句 CLI 用法（如 edges init、edges memory），其余删掉。
3. 36% 与 16% 需标出处（实验设置、对比对象、样本量，或评测卡/PR 链接）；「检索速度」要说明衡量的是耗时还是轮次。本次对话中未出现这两个数的出处，本笔记只转述，不核实。
4. 第二层「自进化」需一个具体例子（如 skills 目录自带 AGENTS.md 与 memory，记录哪些 skill 好用、为何改过）。
5. 第三层 personal evaluation 是差异化亮点，应单独成段并说明为什么人要评估自己的 harness。
6. 术语统一为 AGENTS.md；「不受封号影响」建议换成「不绑定任何单一平台的账号」。

## 去向建议

公开脑 notes（与既有笔记「以项目为中心的记忆缺口」相邻，可在正文里相互链接，若存在）。
