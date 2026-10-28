---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-28T11:30:42.904Z'
  edges-title: Edges 官网知识问答 RAG 服务（edges-rag）
  edges-tasks-status: backlog
  edges-task-priority: none
name: edges_官网知识问答_rag_服务edges_rag
description: >-
  建 VirusPC/edges-rag：用 LlamaIndex+Chroma+FastAPI 为官网知识问答 Agent 提供带引用的 Edges
  框架问答服务，可在 minigtr 对接 compose edges 与 4070ts Ollama。
---
**背景：**
讨论从「minigtr 上对 workspace 做 LlamaIndex RAG」收窄到「只索引 Edges 框架，给官网知识问答 Agent 用」。定了公开仓 `VirusPC/edges-rag`、本地 Chroma、启动全量 + 文件监听增量、FastAPI `POST /ask`（答案 + 路径/片段/分数）、Bearer、Tailscale 连 4070ts Ollama。设计与中文 HTML 计划已写好并发布 artifacts。

- 知识源：minigtr 上 compose 出来的 edges 目录
- 非目标：个人 brain、MySQL、OpenAI 兼容面、前端、代管 Ollama
- 关联：设计与计划在本地 `/workspace/edges-rag/docs/…`；HTML 计划 https://edges.viruspc.tech/artifacts/0e6f3f1d-fe00-48e4-b69b-d5291c1d3420/

**目标：**
公开仓可运行，本机能 `POST /ask` 带引用回答 Edges 框架问题；可在 minigtr 对接 compose edges 与 4070ts Ollama。

**动作：**
- 建 `VirusPC/edges-rag` 并按计划实现（LlamaIndex + Chroma + FastAPI）
- 测试通过后部署到 minigtr

**完成标准：**
- [ ] 公开仓有 README 与可安装包
- [ ] 带假 Ollama/临时 Chroma 的集成测试通过（含 401）
- [ ] 配好 `INDEX_ROOT` 与 Tailscale Ollama 后，`POST /ask` 返回答案与引用
