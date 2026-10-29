---
metadata:
  edges-type: task
  edges-task-project: learning
  edges-updated-at: '2026-10-29T02:43:52.302Z'
  edges-title: open-grokbot 用 Electron（或 Tauri）包一层桌面壳（macOS 可开）
  edges-tasks-status: backlog
  edges-task-priority: none
name: open_grokbot_用_electron或_tauri包一层桌面壳macos_可开
description: H5 已可在浏览器跑；加一层桌面壳，使 macOS 能当桌面应用打开，不改 Worker 侧 Agent 架构。
---
**背景：**
聊 open-grokbot 架构与部署时，确认 H5 已在 https://open-grokbot.viruspc.workers.dev 可访问；接着问「有了页面是不是可以直接封装一层 Electron 当桌面应用」，结论是可以（Electron / Tauri 作壳，远程 URL 或打包静态资源均可），于是开这张卡跟进。随后补充约束：要在 macOS 里能打开。
- 相关现状：私有仓 peng-cheng-1/open-grokbot 已发布，Worker 已部署；前端是 Web。
- 非目标：不改 Cloudflare Agents / Think 运行时；不做完整原生 UI 重写；不以 Windows/Linux 为验收门槛（可顺带支持，但不阻塞）。
- 关联：看板已有「Electron 桌面端作为 edges 操作台」（agent-clients-ux）——那是 edges 操作台，本卡只管 open-grokbot 壳。

**目标：**
在 macOS 上能用桌面安装包或可启动的桌面应用打开现有 open-grokbot 页面，聊天与 Agent 行为与网页一致。

**动作：**
- 在 open-grokbot 仓加 Electron 或 Tauri 壳（优先最小：加载线上 URL）
- 产出可在 macOS 打开的 .app / .dmg（或等价可双击启动方式）
- 按需再考虑：本地静态资源打包、托盘/通知、离线说明
- 文档补一句「桌面壳怎么起（macOS）」
