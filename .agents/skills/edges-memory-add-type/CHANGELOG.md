# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-02

### Changed

- **主题类型：** 通过全局 `--project` 在主题直属 memory / skills 登记类型，并链接到 Project INDEX；类型身份只在选定材料根内唯一。
- **采用边界：** 原 scope 需有有效系统入口，Project 不要求预先采用其他类型或生成 AGENTS；示例统一使用 `--scope`，不往真实记忆写冒烟条目。

## [0.1.1] - 2026-10-27

### Changed

- **路径：** 布局改到总入口 `edges` 的 `references/memory/references/LAYOUT.md`。Init 改从 `$edges` 进入。

## [0.1.0] - 2026-10-27

### Changed

- **更名：** 自 `project-memory-add-type@4.0.0` 更名为 `edges-memory-add-type`。目录名与 `name` 一致。
- **版本线重启：** 从 `0.1.0` 重新计数，不沿用 `4.0.0`。旧 tag `skill/project-memory-add-type@*` 仍留在历史提交上。
