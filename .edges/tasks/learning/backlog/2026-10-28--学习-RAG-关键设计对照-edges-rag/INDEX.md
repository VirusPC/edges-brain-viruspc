---
metadata:
  edges-type: task
  edges-task-project: learning
  edges-updated-at: '2026-10-28T16:44:30.356Z'
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
- 按下方阅读清单读：主文至少读完 Microsoft 与 Anthropic 两篇；清单其余条目与「可选加深」按需再读
- 把要点与对照结论写进笔记或本卡进展

**阅读清单（主文优先）：**

1. [Microsoft Learn：Design and Develop a RAG Solution](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide) — 范围、切块、enrich、embedding、检索、端到端评估全清单
2. [Anthropic：Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval) — 块丢失文档上下文为何翻车；Contextual Embeddings / BM25 / rerank
3. [Pinecone：Chunking Strategies](https://www.pinecone.io/learn/chunking-strategies/) — 怎么切、怎么试 chunk size
4. [NVIDIA：Finding the Best Chunking Strategy](https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses/) — 切块策略实验对比
5. [LlamaIndex：Building Performant RAG for Production](https://developers.llamaindex.ai/python/framework/optimizing/production_rag/) — metadata 过滤、层次检索、rerank（与 edges-rag 栈最贴）
6. [Pinecone：RAG Evaluation](https://www.pinecone.io/learn/series/rag/rag-evaluation/) — 评测集与 faithfulness / recall，别等用户报错

**可选加深：**
- [Anthropic Cookbook：Contextual Embeddings](https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide)
- [LlamaIndex：Advanced Retrieval](https://developers.llamaindex.ai/python/framework/optimizing/advanced_retrieval/advanced_retrieval/)
- [Chroma Client-Server](https://docs.trychroma.com/docs/run-chroma/client-server) / [Deployment Patterns](https://cookbook.chromadb.dev/running/deployment-patterns/) — 对照我们 Embedded vs Server 的选型

**对照对象：** VirusPC/edges-rag（默认 SentenceSplitter、纯向量 Top-K、`embedding_function=None`）

**完成标准：**
- [ ] 主文两篇已读完并有简短笔记或卡内记录：[Microsoft Learn：Design and Develop a RAG Solution](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-solution-design-and-evaluation-guide)、[Anthropic：Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- [ ] 阅读清单第 3–6 条与「可选加深」不作为本卡完成的必读
- [ ] 明确写出相对 edges-rag 的 2～3 个改进点（可被后续实现卡接走）
