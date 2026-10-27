---
name: 评估Agent-Plugins客户端支持
description: 评估给哪些 agent 客户端提供 / 补齐 Agent Plugins 支持更合适
metadata:
  edges-type: task
  edges-title: 评估 Agent Plugins 客户端支持
  edges-tasks-status: backlog
  edges-origin-session-id: d807a059-9774-4fd0-8fa7-d5fb69f9d031
  edges-agent-client: cursor
  edges-username: Task 记录员
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-17T14:09:10.761Z"
  edges-task-project: agent-clients-ux
---

评估给哪些 agent 客户端提供 / 补齐 Agent Plugins 支持更合适；Agent Plugins 1.0 是可移植包装格式（`plugin.json` + `skills/` + `mcp.json`），官方兼容页已有 VS Code、Cursor、Copilot、ChatGPT/Codex、Kiro、Hermes、OpenClaw、Grok Bot、NanoClaw 等。

**Why:**
闭源大厂（ChatGPT / Cursor / Copilot / Kiro）不适合靠外部 PR「补支持」。Claude Code 有自有插件格式、未进联盟，更现实是做桥接而非硬推兼容。Multica / Buzz 收开源贡献，但各自有插件/协作模型，不是 Agent Plugins loader 的首选目标。Pi 官方名单没有；社区扩展 BlockedPath/pi-agent-plugins 已可装上（需 Pi 0.84+，MCP 另需 pi-mcp-adapter）。

**How to apply:**
- 在候选客户端中评估：谁值得投入「提供 / 补齐」Agent Plugins 支持；优先可贡献、可落地 loader 的开源侧，闭源侧以兼容现状为主。
- Claude Code 方向优先研究桥接，而非强推官方兼容。
- Pi 可作为社区扩展路径的参考样本。
