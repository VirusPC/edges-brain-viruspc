---
metadata:
  edges-type: task
  edges-task-project: default
  edges-updated-at: '2026-10-24T21:11:12.286Z'
  edges-title: 补齐或标明 OpenCode/Pi 的 Langfuse 设备维度（tags）缺口
  edges-tasks-status: backlog
  edges-task-priority: low
name: 补齐或标明_opencodepi_的_langfuse_设备维度tags缺口
description: OpenCode/Pi 当前无 tags 写入口，设备维度缺失；调研可写路径或在文档标明限制。
---
**背景：**
2026-10-25 落地 Langfuse environment 命名（`*-local` / `*-cloud` / `grok-bot`）时，本机 Codex/Cursor 已能改 environment；设备维度约定走 tags。对话明确：OpenCode / Pi 当前没有 tags 写入口，故设备维度暂缺，待上游支持或另寻本地 hack。命名文档 PR（#375 等）已合，缺口本身未开卡。

**目标：**
要么让 OpenCode/Pi 会话也能带上稳定的设备 tags，要么在公开约定里明确「这两类客户端设备维度不可用」，避免后人以为漏配。

**动作：**
- 查 OpenCode / Pi 各自观测或 Langfuse 导出是否已有自定义 tags / metadata API
- 若可写：补安装/配置步骤与验收（至少一台本机跑通）
- 若不可写：在相关 skill / 笔记加一句限制说明，并链到本卡或上游 issue

**完成标准：**
- 有书面结论：可写（含配置路径与一次验收）或不可写（文档已标明）
- 不把 OpenCode/Pi 的 environment 误改成设备名（environment 只表 product-locus）
