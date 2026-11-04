# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-02

### Changed

- 笔记归属改为显式 scope 与可选 Project，沿用统一材料根；CLI 与 MCP 都传递相同选择，读回使用返回路径。
- 遗留事项转任务时传递原 scope、Project 和笔记引用，避免工作流切换后丢失主题归属。
- 术语与路径 ADR 明确材料根边界，移除默认写入 Edges 框架仓的旧说明。

## [0.1.1] - 2026-11-01

### Fixed

- 路径用 `notes/YYYY-MM-DD--主题简述/INDEX.md`。`--title`、正文 `#`、frontmatter `title` 只写主题简述。范例一级标题改为 `# 主题简述`。

## [0.1.0] - 2026-10-27

### Changed

- **更名：** 自 `conversation-to-notes@2.7.2` 更名为 `edges-conversation-to-notes`。目录名与 `name` 一致。
- **版本线重启：** 从 `0.1.0` 重新计数，不沿用 `2.7.2`。旧 tag `skill/conversation-to-notes@*` 仍留在历史提交上。
