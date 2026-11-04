# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-11-02

### Changed

- 接入说明补充递归 Project 的直属材料与初始化行为，区分 scope、Project、Super 内容入口和 All 系统发现。
- 任务示例采用无 Task Project、无 `_default` 的布局；补充 Project 中创建、检索笔记与子主题的命令。
- 无 shell 的 Notes 入口补充 MCP 的 `project` / `super` 选择及固定服务端 scope 边界。

## [0.3.0] - 2026-11-02

### Changed

- 接入验证与笔记读写示例对齐统一材料定位，默认使用 `.edges/notes/`；提示使用返回路径并区分旧版 0.4.1 的落点，避免将版本差异误判为安装失败。

## [0.2.2] - 2026-10-27

### Changed

- **任务归类：** 整板按 Task Project 归类改回独立 skill `edges-tasks-classify`。写笔记、初始化和组合仓库仍走 `edges`。

## [0.2.1] - 2026-10-27

### Changed

- **入口：** 写笔记、初始化系统入口、任务分类和组合仓库改走总入口 `edges`。检索与沉淀仍是 `edges-memory-ask` / `edges-memory-remember`。

## [0.2.0] - 2026-10-27

### Changed

- 材料目录与示例路径改为 `.edges`。写作时对应的 npm 版本改为 `0.3.0`。

## [0.1.1] - 2026-10-20

### Changed

- 无 shell 宿主的笔记入口改为仓库根 `packages/mcp-servers/new-note`。安装与 init 步骤不变。

## [0.1.0] - 2026-10-19

### Added

- 新增接入引导：前置检查、安装 `@viruspc/edges`、`edges init`、临时目录验证、常用命令、错误排查与凭证硬规则。当前没有 login 命令；需要凭证的步骤由用户在自己的终端完成。
