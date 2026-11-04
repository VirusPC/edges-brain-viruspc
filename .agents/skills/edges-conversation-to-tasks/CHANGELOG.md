# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-02

### Changed

- 任务使用真实 Project 直属分组与全局 `--project`，移除 Task Project 和 `_default` 布局约定。
- 去重、读回与写入保持 scope / Project 归属；`--all` 仅扩大独立系统发现，写入回到结果的真实 owner。
- 调整归属使用 `tasks update --to-project` / `--to-default`；接续笔记工作流时保留已选主题。

## [0.1.0] - 2026-10-27

### Changed

- **更名：** 自 `conversation-to-tasks@1.4.0` 更名为 `edges-conversation-to-tasks`。目录名与 `name` 一致。
- **版本线重启：** 从 `0.1.0` 重新计数，不沿用 `1.4.0`。旧 tag `skill/conversation-to-tasks@*` 仍留在历史提交上。
