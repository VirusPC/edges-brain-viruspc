# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-02

### Changed

- 分类目标改为真实递归 Project 与根材料板，读取范围沿用用户选择的 scope / Project。
- 审阅页使用真实 owner 身份，导出后通过 `tasks update --to-project` / `--to-default` 应用；不再调用 `tasks project`。
- 跨 owner 不自动归并，重新核对审阅快照后再批量移动；Artifact 采用现有无来源发布模式。

## [0.1.0] - 2026-10-27

### Changed

- **更名：** 自 `project-tasks-classify@1.4.0` 更名为 `edges-tasks-classify`。目录名与 `name` 一致。
- **版本线重启：** 从 `0.1.0` 重新计数，不沿用 `1.4.0`。旧 tag `skill/project-tasks-classify@*` 仍留在历史提交上。
