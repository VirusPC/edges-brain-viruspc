# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.6] - 2026-11-14

### Changed

- **Git 根新建入口带上 checkout 隔离硬约束。** `AGENTS.tmpl.md` 用 `<!-- git-root-constraint -->` 标出这一句。只有新建的 Git 根入口（含 worktree 根）会写入：改 tracked 内容前先核验 git 顶层、`git worktree list`、当前分支和 status。下层入口和非 Git 目录不写。已有 `AGENTS.md` 不补这一句。
- **为什么这样设记在设计决策。** 见 memory 的 `project_design_decisions`（2026-11-14）。skill 正文不另写一遍规则。

## [0.4.5] - 2026-11-14

### Changed

- **笔记和任务改指向新技能。** 整理对话或边学边记用 `edges-create-notes`。把对话整理成任务用 `edges-create-tasks`。

## [0.4.4] - 2026-11-09

### Changed

- **`--super` 覆盖 init、memory 与 compose。** `edges init --super` 把材料放到 `<scope>/<module>/`，并在硬约束里写一次独立仓提示。memory 与 compose 的读写同样跟着这面走；默认不带 `--super` 仍是 `.edges/`。

## [0.4.3] - 2026-11-09

### Changed

- **`--project` 跟随材料面。** 默认相对 `<scope>/.edges/projects`；`--super` 时相对 `<scope>/projects`。选中 P 后材料仍在 `P/<module>`。未选 Project 时，memory 写入和 init 仍不因 `--super` 改位置。

## [0.4.2] - 2026-11-08

### Changed

- 条件说明改为「共享长期记忆记有大脑仓库身份与路径」；路径失效先按身份重新定位，不猜、不重建。

## [0.4.1] - 2026-11-08

### Changed

- 若长期记忆记有个人大脑路径，先读该路径下的 AGENTS.md；不写死个人路径。

## [0.4.0] - 2026-11-04

### Changed

- **初始化示例改为当前项目。** 含 skills 的 init 用 `-- -y`。`-g` 仍可用于本机用户目录。

## [0.3.0] - 2026-11-02

### Changed

- 目录材料与检索流程采用递归 Project；区分 scope、Project、Super 入口和 All 系统发现，并保持查询后写回的真实归属。
- Memory 协议、布局、初始化与私有归档说明同步 Project 容器，保留类型采用和隐私边界。
- Notes CLI 与 MCP 入库可选择 Project；MCP 支持可选 project/super，路径校验复用 CLI，仍只本地创建。

## [0.2.0] - 2026-11-02

### Changed

- 笔记和项目沿用统一材料定位：默认写入所选 scope 的 `.edges/`，`--super` 写入 scope 直属目录；创建与后续读写保持同一选择，旧根目录内容通过 `--super` 访问。

## [0.1.1] - 2026-10-27

### Changed

- **任务归类保持独立：** `edges-tasks-classify` 不并进本 skill。整板按已有 Task Project 归类用那份 skill。

## [0.1.0] - 2026-10-27

### Added

- **总入口：** 随包日常模块收进这一个 skill。正文是通用的 list / get / create / update / delete 形状；对不上这五个动词的差异写在 `references/`。
- **并入的说明：** compose、notes、routines、classifyTasks、memory init、用户记忆备份与恢复。旧目录删除，不留同名 skill。
- **记忆共享资源：** PROTOCOL、LAYOUT、模板、AGENTS 与维护记忆在 `references/memory/`，相对结构与原先 `edges-memory-init` 一致。

### Removed

- 不再单独发布 `edges-compose@0.3.0`、`edges-note@2.3.2`、`edges-routines@0.2.0`、`edges-tasks-classify@0.1.0`、`edges-memory-init@0.1.1`、`edges-memory-user-backup@0.1.0`、`edges-memory-user-restore@0.1.0`。这些 tag 留在当时的提交上。
