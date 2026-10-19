# Changelog

`@viruspc/edges` 的版本记录。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

## [0.2.3] - 2026-10-19

### Added

- 随包 skills 新增 `edges-compose`（`0.1.0`，beta）。它说明如何用 `edges compose register`、`clone`、`list`，以及可选的 `pull`、`push`、`unregister`，把外部 harness 仓库挂到当前 scope。`register` 必须带 `--description`。

### Changed

- `edges compose register` 的 `--description` 改为必填。缺少或只有空白时以校验错误退出（退出码 2，`errorCode` 为 `VALIDATION_ERROR`），不写 `AGENTS.md`。

## [0.2.2] - 2026-10-19

### Fixed

- `edges init` 在旧 `.memory` 上的 `migration-required` 改为提示 `edges memory migrate --dry-run`，然后再执行 `edges memory migrate`。
- `edges memory migrate` 能迁移早期平铺布局：大写类型索引、`project_` / `feedback_` / `reference_` / `user_<slug>.md`，以及被条目相对路径引用的附件目录，目标是 `.harness/memory/<plural>/README.md` 与 `<type>_<slug>/INDEX.md`。无法归类的路径在 `--dry-run` 和正式结果里列全，正式迁移时挪到 `.project-memory-migration/unclassified/`，不因其中一个文件失败。平铺层 `AGENTS.md` 的旧 `project-memory` 标记改写为 `project-harness`。
- `edges tasks project list` / `get` / `update` 只把看板直接子目录里的 `README.md` 当作 Task Project 元数据。同目录的 `AGENTS.md` 是系统入口，不提供标题或描述，也不会被补成 README。项目目录已存在但缺少 `README.md` 时，`get` / `update` 失败并在原因里带上该路径；`list` 跳过这个目录。`tasks/.harness/README.md` 不再被当成项目。某个项目的 README 不合法时，失败原因里带上该文件路径。

## [0.2.1] - 2026-10-19

跳过 `0.2.0`：该版本号曾被一次后来拒绝的 `npm stage publish` 占用，npm 不允许再次发布同一版本。GitHub Actions 发布 `@viruspc/edges@0.2.0` 时返回 `E409 Cannot publish over previously staged version "0.2.0"`。本版没有相对那次记录的功能变更。

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
