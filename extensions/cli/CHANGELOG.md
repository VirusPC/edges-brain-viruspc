# Changelog

`@viruspc/edges` 的版本记录。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.2.0] - 2026-10-18

### Added

- `edges init` 与 `edges skills init` 在建类型索引之后，用依赖 `skills@1.7.2` 安装随包 skills：`skills add <包内 skills 目录> --skill '*'`。`--` 之后的 token 原样转交。安装器非零退出时，这两条命令以同一退出码失败。
- npm 包带上构建时拷入的 `skills/`，含 14 个调用 edges CLI 的 skill。

### Changed

- `engines.node` 从 `>=22` 改为 `>=22.20.0`，与 `skills@1.7.2` 一致。

### Removed

- 不调用 edges CLI 的 6 个 skill 改收在 `shared-extensions/skills/`，不再打进本包：`paper-10-questions`、`summarize-ai-article`、`summarize-ai-article-ultra`、`weekly-ai-blogs-digest`、`horizontal-vertical-research`、`learn-repo`。

## [0.1.0] - 2026-10-18

### Added

- 首次发布到 npm。包名 `@viruspc/edges`，命令名 `edges`。
