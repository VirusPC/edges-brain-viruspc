---
metadata:
  edges-type: task
  edges-task-project: learning
  edges-updated-at: '2026-10-28T16:32:46.807Z'
  edges-title: 学习 RAG 关键设计（对照 edges-rag）
  edges-tasks-status: backlog
  edges-task-priority: none
name: 学习_rag_关键设计对照_edges_rag
description: 精读 RAG 设计要点资料，对照已落地的 edges-rag，记清可改进点与下一步实验。
---
**背景：**
做完 edges-rag 后聊了 Chroma Embedded vs Server、LlamaIndex 与 embedding 职责、默认 SentenceSplitter、纯向量 Top-K，并收集了 Microsoft / Anthropic / Pinecone / LlamaIndex 等文。需要一张学习卡管进度；看板主题从空的 tech-reading 改名为更通用的 learning（学习）。
- 相关：VirusPC/edges-rag 已部署
- 非目标：本卡不改线上检索实现
- 关联：与 Coding Agent 专家的对话（2026-10-28～29）

**目标：**
读完选定资料后，能对照 edges-rag 说出 2～3 个可验证的改进方向（切块 / 检索 / 评估）。

**动作：**
- 精读 Microsoft RAG 设计与评估指南、Anthropic Contextual Retrieval
- 按需读 Pinecone chunking、LlamaIndex Production RAG
- 把要点与对照结论写进笔记或本卡进展

**完成标准：**
- [ ] 上述两篇主文已读完并有简短笔记或卡内记录
- [ ] 明确写出相对 edges-rag 的 2～3 个改进点（可被后续实现卡接走）
