---
name: self_hosted_temp_artifact_hosting
description: 提供稳定的 artifacts 预览服务（短生命周期托管 + 真浏览器 URL）；绕开聊天内嵌 HTML 预览。
metadata:
  edges-type: task
  edges-title: 自建云服务器临时托管 artifacts
  edges-tasks-status: done
  edges-task-project: agent-clients-ux
  edges-task-assignee: Coding 专家
  edges-task-assignee-id: 099e84df-06c3-4c5d-9e29-fc255dce3d56
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: 任务记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-20T16:51:57.226Z"
---

提供一个稳定的 artifacts 预览服务：短生命周期托管，给出真浏览器可开的 URL。聊天内嵌 HTML 预览是要绕开的不可靠路径。

**Why / 产生该 idea 的事实背景:**
- Agent 会产出需人点选/拖拽的网页 artifacts（例如 Tasks Classify / `edges tasks project review-page` 审阅页）。
- 现有审阅页 CLI 只渲到本机临时目录并打印路径（ADR：Task Project 审阅页 render-only），依赖本机打开；手机端往往没有「本机 localhost」可用。
- Grok Bot 聊天内嵌 HTML 预览不可靠：手机端常常不能预览；桌面端能开 HTML，但交互常有兼容问题（拖拽等，目测非完整 Chrome 内核）。相关笔记：`knowledge/notes/2026-09-17--Grok-Bot-HTML预览拖拽异常.md`。
- 因此需要自有、短生命周期的托管，让人用系统浏览器打开稳定 URL 完成 review。

**How to apply（grill 已定方向，2026-09-19）:**
- 本轮：TS 小服务；上传→URL→TTL；`edges artifacts` CLI（init/token 闭环 + publish/rm）；写要共享 token、读靠 UUID URL；默认 TTL 24h；本机与 ECS 同服务，手机必须打可达 URL。
- **不做：** 审阅结果回传 Agent 客户端（已拆 backlog `2026-09-19--review页结果回传Agent客户端`）。
- **勿并卡：** 「数据与视图分离 + 本地 HTML」；site-and-content/Astro 长期建站；classify 等业务卡（它们产出页，本卡是托管基础设施）。
- CONTEXT/ADR 文档 PR 另开中；合入后链 ADR 编号。
- 已指派 Coding 专家；看板状态仍 in_progress，由任务记录员维护。
