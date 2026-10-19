---
title: "Edges 产品定位：Git-native Agent Workspace"
description: "从 Memory/Harness 走向 Git-native Agent Workspace：Compose、Tasks、Memory、Skills 的组合价值假设"
---

# Edges 产品定位：Git-native Agent Workspace

> 2026-10-20 对话沉淀。**定位假设，不是已验证的竞争优势。**

## 核心判断

**Edges — A Git-native Agent Workspace**

Edges 正从 Agent Memory / Harness 工具，向基于 Git 与目录的 Agent 工作空间演化。

- **Git-native**：文件、版本控制、Diff、PR 和人工审批提供可迁移、可审阅的资产治理。
- **Agent**：工作资产不绑定某个模型或 Coding Agent（如 Codex、Claude Code、Cursor）。
- **Workspace**：除了 Memory，还统一组织 Skills、Tasks、Projects、Notes，并通过 Compose 显式组合多个仓库。

保留理念：**Harness any directory. Your brain is one too.**

Agent Workspace 是**产品定位**；Harness any directory 是**设计哲学**。

## 为什么 Compose 与 Tasks 改变产品边界

单独看：

| 能力 | 解决的问题 |
| --- | --- |
| Memory | 记住哪些决策、经验和约束？ |
| Skills | 如何重复执行已形成的方法？ |
| Tasks | 接下来做什么、当前处于什么状态？ |
| Compose | 应跨哪些独立仓库共享工作资产与上下文？ |
| Harness | 如何按目录组织并被多个 Agent 复用？ |

组合起来，Edges 的对象不再只是「Agent 需要哪些上下文」，而是「Agent 如何在可治理的工作空间里持续接续工作」。

目标闭环：

`任务 → 查找适用的 Memory / Skill → 执行 → 记录结果与反馈 → 经人审演化资产 → 后续任务复用`

**重要边界：** 当前 Compose 已提供仓库 register/list/unregister、clone/pull/push，以及通过 `--with-composed` 将外部仓库一层入口纳入查询；默认查询不跨 Compose，写命令不跨组合边。它不等于已实现跨仓库任务自动编排。Tasks 的生命周期管理也不等于独立 Agent Runtime。

## 与其他工具的差异化假设

Agent Memory、Skills、Git-backed memory 和跨 Agent 上下文都不是 Edges 独有。更值得检验的是：

> 以目录为作用域，将 Memory、Skills、Tasks 和 Compose 变成同一套可版本化、可迁移、可审阅的 Agent Workspace 资产，是否比简单的 AGENTS.md + Git 或专用 Memory 工具更有效？

差异化应体现在**组合效果与管理成本**，而不是功能列表长度；在缺少证据前不能宣称护城河。

## 最小验证场景

1. Agent A 在项目 A 的真实任务中完成工作，沉淀一条可复用经验，记录来源与审批。
2. Agent B 在项目 B 通过 Compose 发现这条经验，将其实际用于一个 Task。
3. 记录召回的相关性、是否采纳、任务结果、返工与维护成本。
4. 与没有 Edges（原生 AGENTS.md + Skills + Git）的同类任务做基线比较。

**完成标准：** 至少一个完整、可复查的跨仓库、跨 Agent、跨 Task 案例；留存链接、变更 Diff、人工采纳和结果证据。进一步评估要扩大样本，明确召回率、准确率、采用率的分母与样本量。

## 当前决策

**优先证明组合后的价值，不急于扩展更多单点功能。** 下一阶段的优先事项是跨项目复用验证和任务级观测，而不是把 Edges 直接扩建成另一套 Agent Runtime。

## 参考与来源

- 与 ChatGPT 的讨论（2026-10-20）：Edges 的 Compose、Tasks 正在改变其定位；「Agent Workspace」命名与验证方向。
- [仓库 README](https://github.com/VirusPC/edges/blob/main/README.md)
- [v1.5.0 Changelog](https://github.com/VirusPC/edges/blob/main/CHANGELOG.md)
