# Changelog

All notable changes to shared-extensions will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

本文件记 **shared-extensions 整层**变更。不按单个 skill / mcp / plugin / hook 拆 changelog。版本号以 [`VERSION`](VERSION) 为准，tag 为 `shared-extensions@<version>`。

仓库级变更见根 [`CHANGELOG.md`](../CHANGELOG.md)（`vX.Y.Z`）。Edges 对外 skill 见框架仓 [`packages/skills/<name>/CHANGELOG.md`](https://github.com/VirusPC/edges/tree/main/packages/skills)。

## [6.0.0] - 2026-10-27

### Deprecated

- 整个 `shared-extensions/` 隔间废止。这是该系列最后一版。七个通用 skill（`horizontal-vertical-research`、`html-plan`、`learn-repo`、`paper-10-questions`、`summarize-ai-article`、`summarize-ai-article-ultra`、`weekly-ai-blogs-digest`）改归脑仓 `.edges/skills/managed/`。`new-server/` 迁到仓库顶层；`others/twitter-query.md` 迁到 dated note。之后不再打 `shared-extensions@*` tag，也不再升本目录 `VERSION`。跨机靠 Compose 挂本脑仓，不再做全局 `~/.agents` 安装。

## [5.0.0] - 2026-10-25

### Removed

- `skills/langfuse-agent-tracing`、`skills/cursor-cloud-langfuse-tracing`、`skills/codex-cloud-langfuse-tracing`：迁入框架 [`packages/skills/`](https://github.com/VirusPC/edges/tree/main/packages/skills)，改名为 `langfuse-local-agent-tracing` / `langfuse-cursor-cloud-tracing` / `langfuse-codex-cloud-tracing`，另加主入口 `langfuse-agent-tracing` 与 `langfuse-grokbot-tracing`。随 `@viruspc/edges` 分发（`edges skills init`）。`projects/routines/grokbot-langfuse-export/` 仍留在本仓。

## [4.5.0] - 2026-10-25

### Changed

- `skills/langfuse-agent-tracing`：定稿 Langfuse `environment` 命名——本机 `codex-local` / `cursor-local` / `claude-code-local` / `opencode-local` / `pi-local`，云端 `codex-cloud` / `cursor-cloud`，Grok Bot 小时导出 `grok-bot`；设备继续只进 tags（`device:<MagicDNS短名>`）。OpenCode / Pi 无 tags 口时仍用 `*-local` 作 environment，不再用设备名顶替；缺口写明等上游 tags。

## [4.4.0] - 2026-10-24

### Added

- `skills/cursor-cloud-langfuse-tracing`：把 Cursor Cloud Agents 的会话追踪进（自建）Langfuse。云端只跑项目级 `.cursor/hooks.json`；包装脚本懒加载官方 cursor-observability-plugin 的指定 commit（npm 包 404）。环境加 4 个 Secrets，确认 active build 含该 commit，自建 v4 events_only 用 `/api/public/v2/observations` 验证。附 `templates/hooks.json` 与 `templates/langfuse.sh`。

### Changed

- `skills/codex-cloud-langfuse-tracing`、`skills/langfuse-agent-tracing`：互链到 `cursor-cloud-langfuse-tracing`，标明 Cloud Agents 与本机会话各用哪份 skill。

## [4.3.0] - 2026-10-24

### Added

- `skills/codex-cloud-langfuse-tracing`：把 Codex Cloud 任务会话追踪进 Langfuse。云端容器只读、hooks 不支持，改用本机带外轮询：旧式 `task_e_` 任务走 `codex cloud list` + wham turns，新版 `/local/` 任务走 WebSocket app-server JSON-RPC；只读 `auth.json`、不 refresh、鉴权失败退出 2；OTLP 写入、确定性 trace id 幂等。

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

[6.0.0]: https://github.com/VirusPC/edges-brain-viruspc/compare/shared-extensions@5.0.0...shared-extensions@6.0.0
[5.0.0]: https://github.com/VirusPC/edges-brain-viruspc/compare/shared-extensions@4.5.0...shared-extensions@5.0.0
[4.5.0]: https://github.com/VirusPC/edges-brain-viruspc/compare/shared-extensions@4.4.0...shared-extensions@4.5.0
[4.4.0]: https://github.com/VirusPC/edges-brain-viruspc/compare/shared-extensions@4.3.0...shared-extensions@4.4.0
[4.3.0]: https://github.com/VirusPC/edges-brain-viruspc/compare/shared-extensions@4.2.0...shared-extensions@4.3.0
[4.2.0]: https://github.com/VirusPC/edges-brain-viruspc/compare/shared-extensions@4.1.0...shared-extensions@4.2.0
[4.1.0]: https://github.com/VirusPC/edges-brain-viruspc/compare/shared-extensions@4.0.0...shared-extensions@4.1.0
[4.0.0]: https://github.com/VirusPC/edges-brain-viruspc/compare/shared-extensions@1.0.0...shared-extensions@4.0.0
[1.0.0]: https://github.com/VirusPC/edges-brain-viruspc/releases/tag/shared-extensions@1.0.0
