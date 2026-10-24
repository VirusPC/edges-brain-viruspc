# Changelog

All notable changes to shared-extensions will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

本文件记 **shared-extensions 整层**变更。不按单个 skill / mcp / plugin / hook 拆 changelog。版本号以 [`VERSION`](VERSION) 为准，tag 为 `shared-extensions@<version>`。

仓库级变更见根 [`CHANGELOG.md`](../CHANGELOG.md)（`vX.Y.Z`）。Edges 对外 skill 见 [`extensions/skills/<name>/CHANGELOG.md`](https://github.com/VirusPC/edges/tree/main/extensions/skills)。

## [Unreleased]

### Added

- `new-server/`、`others/`：从框架仓 `extensions/new-server/`、`extensions/others/` 原样搬来的个人运维笔记和 X / Twitter 搜索查询。只是笔记，不装到各机器，不升版本。

## [4.3.0] - 2026-10-24

### Added

- `skills/cloud-agent-oob-tracing`：云端 / 托管 Agent 无法用官方 hooks、插件或本地 OTel 上报时，用带外轮询把会话 turns 写入 Langfuse。决策树：先探运行时 → 能写配置走 in-process，不能则官方 API → REST → WebSocket/JSON-RPC → 桌面 DB；鉴权只读、禁止 refresh、失败退出 2；OTLP + 幂等 state；附 Codex Cloud（旧 wham + 新 `/local/` WS）参考实现表。

## [4.2.0] - 2026-10-24

### Added

- `skills/langfuse-agent-tracing`：把编码 Agent（Codex、Cursor、Claude Code、OpenCode、Pi 等）的会话追踪接到 Langfuse。安装一律跟 Langfuse 官方集成文档，本 skill 只补文档没写清的坑（配置合并、自建 v4 events-only 的验证接口、Cursor Dock PATH 与双 hook、Codex Stop hook 批准、Claude 登录、OpenCode flush），以及按 `device:<Tailscale 短名>` 打设备 tag、各插件 tags / metadata 的配置口与缺口。

## [4.1.0] - 2026-10-19

### Added

- `skills/html-plan`：把实现计划写成一页可交互 HTML（论断树 + 决策点 + 一键回填答复）。原样拷自 [anthropics/claude-plugins-community](https://github.com/anthropics/claude-plugins-community) 的 `html-plan/skills/html-plan/`（commit `06ec7b6`，Apache-2.0），来源与同步方法见该目录 `UPSTREAM.md`。

## [4.0.0] - 2026-10-18

### Added

- 从 `extensions/skills/` 移入 6 个不调用 edges CLI 的通用 skill：`paper-10-questions`、`summarize-ai-article`、`summarize-ai-article-ultra`、`weekly-ai-blogs-digest`、`horizontal-vertical-research`、`learn-repo`。按本层约定去掉单个 skill 的 `version` 与 `CHANGELOG.md`。

## [1.0.0] - 2026-09-08

### Added

- 目录骨架：`skills/`、`mcp/`、`plugins/`、`hooks/`。
- 收录标准：不绑定 Edges 的跨机器 harness；与 `extensions/` 互斥。
- 整层一份 `VERSION`、本 changelog、tag `shared-extensions@<version>`。
- 本层项目记忆（`AGENTS.md` + `.memory/`）。

[Unreleased]: https://github.com/VirusPC/edges/compare/shared-extensions@4.1.0...HEAD
[4.1.0]: https://github.com/VirusPC/edges/compare/shared-extensions@4.0.0...shared-extensions@4.1.0
[4.0.0]: https://github.com/VirusPC/edges/compare/shared-extensions@1.0.0...shared-extensions@4.0.0
[1.0.0]: https://github.com/VirusPC/edges/releases/tag/shared-extensions@1.0.0
