# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-10-27

### Changed

- **四个表面收进 references：** 本机 Agent、Codex Cloud、Cursor Cloud、Grok Bot 的步骤改在本 skill 的 `references/`。不再另有 `edges-langfuse-codex-cloud-tracing`、`edges-langfuse-cursor-cloud-tracing`、`edges-langfuse-grokbot-tracing`、`edges-langfuse-local-agent-tracing`。旧 tag 留在当时的提交上。

## [0.1.0] - 2026-10-27

### Changed

- **更名：** 自 `langfuse-agent-tracing@0.1.0` 更名为 `edges-langfuse-agent-tracing`。目录名与 `name` 一致。
- **版本线重启：** 从 `0.1.0` 重新计数，不沿用 `0.1.0`。旧 tag `skill/langfuse-agent-tracing@*` 仍留在历史提交上。
