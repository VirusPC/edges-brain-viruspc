# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.3] - 2026-11-09

### Changed

- **独立仓初始化使用 `--super`。** 「创建独立 edges harness 仓库」改为 `edges --scope <仓库目录> --super init -- -y`，材料在仓库根，并带上独立仓硬约束。给已有项目加 harness 仍不带 `--super`。

## [0.7.2] - 2026-11-08

### Changed

- 「接入已有大脑」新增可选第 5 步：接入 Langfuse 观测，链接 edges-langfuse-agent-tracing；不属于接入验收。

## [0.7.1] - 2026-11-08

### Changed

- Grok Bot 不再描述为绑定客户端工作区：改为从所有 Bot 共用的共享长期记忆检索大脑仓库身份与路径，先读 `AGENTS.md`；路径失效先按仓库身份重新定位，找不到再问。
- 七层核验第 1 层对 Grok Bot 标为不适用，并给出可见证据；Git 同步仍必验、失败不阻塞。

## [0.7.0] - 2026-11-08

### Added

- 开场场景与提问菜单增加「接入已有大脑」；新建接入流程（不建仓、先问路径、按客户端工作区分组指南核验）。
- `references/client-access/`：contract、personal、work-space、coding、chat 与 README。

### Changed

- 创建个人大脑后默认继续接入当前客户端；Compose 标为可选旁路。
- 提问菜单由五场景加两条兜底改为六场景加两条兜底。

## [0.6.3] - 2026-11-08

### Changed

- 「个人大脑」场景写明：记录 idea 和个人待办并追踪后续进展。

## [0.6.2] - 2026-11-07

### Changed

- 「何时用」中，目录场景写为：给某个目录，例如为 monorepo 中的某个子包单独积累上下文。仍使用已有项目添加 edges harness 目录。
- 提问两步：开场同一轮列出五场景与两条流程兜底；再补参数（可推断则默认）。

## [0.6.1] - 2026-11-07

### Fixed

- 补发接入保障修订：保留紧凑结构，包含环境检查、内容与凭证保护、GitHub 用户授权和精简排错。既有 0.6.0 tag 保持不变。

## [0.6.0] - 2026-11-07

### Changed

- 保持三个主章节，在接入流程内补回环境检查、内容与凭证保护边界、GitHub 用户授权和精简排错；验证仍留在各流程，不恢复常用操作百科。
- 接入前按流程集中收集必要信息，沿用上下文中的已有选择；仅本地接入跳过 GitHub 信息，授权后连续执行，遇到新冲突再询问。
- 用户场景映射到两种流程：已有项目添加 edges harness 目录、创建独立 edges harness 仓库。精简文档，按流程组织操作步骤。
- 独立 harness 完整接入包含 GitHub 建仓、首次提交推送与远程读回验证，同时支持用户明确选择仅本地。显式区分 private/public 的内容边界与挂载权限，未指定可见性时先询问。

## [0.5.0] - 2026-11-04

### Changed

- **默认把 skill 装进当前项目。** 示例改为 `edges --scope . init -- -y`。`-g` 仍可用于本机用户目录。

## [0.4.1] - 2026-11-03

### Changed

- 全局安装改为 `npm install -g @viruspc/edges@latest`。`edges --version` 只要求打印版本号，不再写死写作时的 npm 版本。

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
