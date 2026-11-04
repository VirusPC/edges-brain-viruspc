# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
