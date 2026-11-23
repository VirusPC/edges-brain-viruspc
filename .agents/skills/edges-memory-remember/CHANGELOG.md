# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.2] - 2026-11-09

### Changed

- **remember 跟随 `--super`。** 未选 Project 时写到 `S/memory`，不再留在 `.edges/memory`。

## [0.2.1] - 2026-11-09

### Changed

- **Project 路径跟随材料面。** `--project` 默认相对 `S/.edges/projects`；`--super` 时相对 `S/projects`。未选 Project 时，remember 仍不因 `--super` 改到 scope 直属 memory。

## [0.2.0] - 2026-11-02

### Changed

- **主题存储：** 通过全局 `--project` 写入主题直属 memory / skills，按选定材料根检查已采用类型和重复条目，不从父层或兄弟主题借用类型。
- **入口与隐私：** 保留原 scope 的有效系统入口要求，Project 不另建 AGENTS；说明实际路径、`not-applicable` 结果和按单份 users 子树备份恢复的边界。

## [0.1.2] - 2026-10-27

### Changed

- **路径：** 协议与布局改到总入口 `edges` 的 `references/memory/`。Init、用户记忆备份与恢复改从 `$edges` 进入，不再指向已删除的独立 skill。

## [0.1.1] - 2026-10-27

### Changed

- **用户记忆归档技能改名：** 换机用 `$edges-memory-user-backup`，回注用 `$edges-memory-user-restore`。不再指向 `edges-user-memory-*`。

## [0.1.0] - 2026-10-27

### Changed

- **更名：** 自 `project-memory-remember@4.0.0` 更名为 `edges-memory-remember`。目录名与 `name` 一致。
- **版本线重启：** 从 `0.1.0` 重新计数，不沿用 `4.0.0`。旧 tag `skill/project-memory-remember@*` 仍留在历史提交上。
