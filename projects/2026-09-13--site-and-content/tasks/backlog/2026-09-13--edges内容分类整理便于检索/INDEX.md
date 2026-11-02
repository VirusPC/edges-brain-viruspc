---
name: classify_organize_edges_for_retrieval
description: 仔细分类、清晰整理 edges 下内容，让外部 AI 能检索到相关理解（如产品）
metadata:
  edges-type: task
  edges-title: 分类整理 edges 内容以便检索
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: 任务记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-09-17T14:09:11.814Z'
---

edges 下面的东西要仔细分类、清晰整理。现在外部 AI 似乎不能很好地检索相关内容，例如对一些产品的理解。

**Why:**
知识在仓里，但分类和摆放不清时，外部 Agent 检索会偏、漏、或拿到错层材料。这不是「洗成 project-memory 格式」（那条管条目形态），也不是「整仓与 .memory 同构」（那条管树协议）。本条管信息架构：类目、放置、命名，让人从仓外问产品/主题时能命中对的材料。

**How to apply:**
- 先盘点外部 AI 检索失败的例子（产品理解等），标出现在散在哪、被当成了什么。
- 细聊分类维：按主题 / 产品 / 知识角色（notes vs edges vs tasks）怎么切开，避免再堆一层空目录。
- 整理规则要可重复：新内容往哪放、旧内容怎么迁、索引怎么让外部检索器看见。
- 与洗格式、同构、本地可视化条目交叉但不合并。
- 派发时默认先 grill-with-docs。
