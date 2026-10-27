---
name: review_page_result_callback_to_agent_client
description: 审阅页结果直接回传 Agent 客户端（替代/补强 Copy JSON 贴回聊天）；勿并入临时静态托管
metadata:
  edges-type: task
  edges-title: review页结果回传Agent客户端
  edges-tasks-status: backlog
  edges-task-project: agent-clients-ux
  edges-updated-at: "2026-09-19T14:01:33.770Z"
---

审阅页（classify / proposeTypes / 其它 HTML review）在系统浏览器里改完后，结果应能**直接回传 Agent 客户端**，替代或补强「复制导出 JSON → 贴回聊天」的人闸。

**Why:**
peng cheng 定：临时 artifacts 后端本轮只做静态托管（TS；上传→URL→TTL）。「审阅结果回传客户端」涉及客户端协议、鉴权、会话绑定，范围更大，必须拆后续卡，不要并进「自建云服务器临时托管 artifacts」。本轮先解决真浏览器打开；回传另开。

**How to apply:**
- 细聊：回传通道（webhook / deep link / client API）、鉴权与会话绑定、与现有 Copy JSON 导出格式兼容、失败回退仍可贴聊天。
- **勿并卡：** `agent-clients-ux` in_progress「自建云服务器临时托管 artifacts」（静态托管 only）；`project-tasks-classify` / review-page（只渲 HTML）。
- 交叉：评估 Agent Plugins 客户端支持（若相关）。
- 未指派；派发默认 grill-with-docs。
