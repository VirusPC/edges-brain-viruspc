# Changelog

## [Unreleased]

- 缺失类型入口补 `README.md`（`project-entries-*`），memory 与 skills 都一样。不补类型目录 `AGENTS.md`；已存在的旧 AGENTS 类型索引仍可原地更新。

## [3.3.0] - 2026-10-18

### Changed

- `edges memory doctor --apply` 按路径补缺失的父级链接：目标 `AGENTS.md` 在父级 `.harness` 下记入本层，否则记入下层。已有登记保持原组。命令不再接受 `--index-group`。

## [3.2.0] - 2026-10-07

### Changed

- 诊断命令带上根 `--scope`。类型入口按 `AGENTS.md` 补，不再把 `--index-group` 写到 `tasks` 或 `note`。
- 看板 list 只顺着 `AGENTS.md` children；看板变更进 `main` 必须开 PR。

## [3.1.0] - 2026-10-05

- 统一目录入口、验证后的整目录导入与显式公开迁移；保留非受控正文，非法入口诊断后由调用方修正。

## [3.0.1] - 2026-10-05

- 统一 AGENTS 节点身份与三类内容组织；保留显式类型采用、写权限和局部归属，不用 Memory 标记或独立职责筛选节点。

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-10-04

### Changed

- 执行入口迁至 TypeScript `edges memory` CLI；使用前需安装或构建 CLI，模板随构建产物分发，保留原有工作流与权限边界。

## [2.0.0] - 2026-10-03

### Changed

- 只修新布局索引与作用域登记，保留人工正文；来源缺失/不可读保持旧索引并留诊断，旧布局只报告迁移需求。

## [1.5.0] - 2026-09-08

### Added

- `legacy-flat-frontmatter`：普通记忆把实现字段写在 YAML 顶层时诊断并 `--apply` 把文件头收进 `metadata:`，正文不动。

## [1.4.0] - 2026-09-07

### Changed

- 认识第五个类型 `agent_skills`，并对它跳过全部写操作：不报 `missing-type-dir`、不报 `legacy-type-dir`、`--apply` 时也不补建目录。`.agents/` 归人与生态，一个字节都不碰；本层没有 `.agents/skills/` 时索引是空清单，属正常状态。
- 存量 `AGENTS.md` 因为少一行入口会被判 `outdated-local`，`--apply` 自动刷新并补建 `AGENT_SKILLS.md`。

## [1.3.1] - 2026-09-06

### Changed

- `missing-important` 补上的种子改为当前两句（聚光灯 +「硬约束写在本区块」）。已有硬约束正文仍不覆盖。

## [1.3.0] - 2026-09-06

### Added

- 诊断并删除已废弃的自动化策略区块（`stale-auto`）。

### Removed

- `missing-auto`：不再要求记忆根有独立的自动化策略区块。

## [1.2.0] - 2026-09-06

### Added

- 诊断并补上缺失的本层硬约束区块（`missing-important`），不覆盖已有规则。

## [1.1.0] - 2026-09-06

### Changed

- 要把已有 `AGENTS.md` 的区块外正文拆进 `.memory` 时，改走 `$project-memory-reshape`；doctor 仍只修索引结构。

## [1.0.0] - 2026-09-01

### Added

- 按 semver 标记的首个版本。

[Unreleased]: https://github.com/VirusPC/edges/compare/skill/project-memory-doctor@1.5.0...HEAD
[1.5.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-doctor@1.4.0...skill/project-memory-doctor@1.5.0
[1.4.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-doctor@1.3.1...skill/project-memory-doctor@1.4.0
[1.3.1]: https://github.com/VirusPC/edges/compare/skill/project-memory-doctor@1.3.0...skill/project-memory-doctor@1.3.1
[1.3.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-doctor@1.2.0...skill/project-memory-doctor@1.3.0
[1.2.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-doctor@1.1.0...skill/project-memory-doctor@1.2.0
[1.1.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-doctor@1.0.0...skill/project-memory-doctor@1.1.0
[1.0.0]: https://github.com/VirusPC/edges/releases/tag/skill/project-memory-doctor@1.0.0
