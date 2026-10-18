# Changelog

All notable changes to shared-extensions will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

本文件记 **shared-extensions 整层**变更。不按单个 skill / mcp / plugin / hook 拆 changelog。版本号以 [`VERSION`](VERSION) 为准，tag 为 `shared-extensions@<version>`。

仓库级变更见根 [`CHANGELOG.md`](../CHANGELOG.md)（`vX.Y.Z`）。Edges 对外 skill 见 [`extensions/skills/<name>/CHANGELOG.md`](../extensions/skills/)。

## [Unreleased]

## [1.1.0] - 2026-10-18

### Added

- 从 `extensions/skills/` 移入 6 个不调用 edges CLI 的通用 skill：`paper-10-questions`、`summarize-ai-article`、`summarize-ai-article-ultra`、`weekly-ai-blogs-digest`、`horizontal-vertical-research`、`learn-repo`。按本层约定去掉单个 skill 的 `version` 与 `CHANGELOG.md`。

## [1.0.0] - 2026-09-08

### Added

- 目录骨架：`skills/`、`mcp/`、`plugins/`、`hooks/`。
- 收录标准：不绑定 Edges 的跨机器 harness；与 `extensions/` 互斥。
- 整层一份 `VERSION`、本 changelog、tag `shared-extensions@<version>`。
- 本层项目记忆（`AGENTS.md` + `.memory/`）。

[Unreleased]: https://github.com/VirusPC/edges/compare/shared-extensions@1.1.0...HEAD
[1.1.0]: https://github.com/VirusPC/edges/compare/shared-extensions@1.0.0...shared-extensions@1.1.0
[1.0.0]: https://github.com/VirusPC/edges/releases/tag/shared-extensions@1.0.0
