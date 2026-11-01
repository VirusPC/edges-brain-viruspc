确实漏了，补上。

## 修正后的对比表

| 工具 | 是否支持 | 命令/方式 | 接入端 | 状态 | 关键限制 |
|------|---------|----------|--------|------|---------|
| **Claude Code** | ✅ 支持 | `/rc` 或 `/remote-control`（会话中随时开启）<br>`--remote-control`（启动时） | Claude App (iOS/Android)<br>浏览器 `claude.ai/code` | 研究预览版 | 终端不能关；网络中断约10分钟超时；每次仅一个远程连接 |
| **GitHub Copilot CLI** | ✅ 支持 | `/remote on`（会话中开启）<br>`copilot --remote`（启动时）<br>配置 `"remoteSessions": true`（默认开启） | GitHub Mobile App<br>浏览器 github.com | **GA 已正式发布** (2026.5) | 机器必须在线；企业用户需管理员开启 Remote Control policy |
| **OpenAI Codex** | ⚠️ **部分支持** | `codex remote-control`（启动 headless app-server）<br>`codex app-server --listen` + `codex --remote`（Remote TUI） | ChatGPT mobile app（仅控制 Codex **App**，不支持 CLI）<br>另一台机器的 TUI（`--remote`） | `remote-control` 子命令已发布 (0.130+)，但体验粗糙 | **CLI 会话无法被手机接管**；`remote-control` 是独占模式（不能共享已有 CLI 会话）；Codex App 的 mobile remote 仅支持 macOS host，不支持 CLI/IDE Extension 设置 |
| **Cursor** | ⚠️ 间接支持 | `agent worker start`（注册远程 worker）<br>第三方扩展 "Cursor Remote" | 浏览器 `cursor.com/agents`<br>第三方 iOS App | 原生不支持 CLI remote control | Cloud Agents 跑在 Cursor 云端；Remote Agents 通过 web 面板控制，不是接管本地 CLI 会话 |
| **Kimi Code** | ❌ 不支持 | — | — | Feature Request (#1282) 未实现 | 无 |
| **Gemini CLI** | ❌ 不支持 | — | — | Feature Request (#21559) 未实现 | 无 |
| **Windsurf** | ❌ 不支持 | — | — | 无相关功能 | 无 |
| **Aider** | ❌ 不支持 | — | — | 无相关功能 | 无 |

---

## Codex 的 Remote Control 详细拆解

Codex 的情况比较复杂，有三种不同的"远程"概念，容易混淆：

### 1. `codex remote-control` — CLI 的 headless 远程模式（体验差）
- **命令**：`codex remote-control`（0.130.0+ 引入）
- **机制**：启动一个 headless app-server，等待外部连接
- **问题**：社区反馈这是**独占模式**，不能共享已有 CLI 会话。也就是说，你要么在终端正常跑 `codex`，要么跑 `codex remote-control` 等手机连，**两者不能同时存在**
- **评价**：被社区吐槽为"quick hack"，"marketing BS"，"poor man's version"

### 2. ChatGPT Mobile App → Codex App（macOS）— 这才是真正的 mobile remote
- **方式**：在 macOS 上的 Codex App（桌面应用）里选 `Set up Codex mobile`，扫码连接 ChatGPT mobile app
- **限制**：
  - 仅支持 **Codex App for macOS**，不支持从 **Codex CLI** 或 **IDE Extension** 设置
  - Windows host 支持 coming soon
  - 需要 Mac 保持在线、运行 Codex App
- **本质**：这是控制桌面应用，不是接管 CLI 会话

### 3. `codex app-server` + `codex --remote` — Remote TUI（机器到机器）
- **方式**：在一台机器启动 app-server，另一台机器通过 WebSocket 连接 TUI
- **用途**：在远程服务器上跑 Codex，本地机器连上去用 TUI
- **限制**：需要配置 WebSocket auth、TLS，是**机器到机器**的远程，不是手机控制

---

## 一句话总结

> **Claude Code** 和 **Copilot CLI** 是目前唯二支持"本地 CLI 会话在运行中被手机远程接管"的工具。  
> **Codex** 有 `codex remote-control` 命令但体验粗糙（独占模式、不能共享已有会话），且真正的 mobile remote 只支持 Codex **App**（macOS 桌面版），不支持 CLI。其余工具均不支持。