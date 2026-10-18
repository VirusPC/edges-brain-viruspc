# Changelog

## [4.0.0] - 2026-10-18

### Changed

- 无参 `edges init` 与 `edges skills init` 会安装包内 skill。agent 调用时用 `edges init -- -g -y`：`-g` 装到用户目录，`-y` 跳过确认。`skills@1.7.2` 没探测到 agent 且没有 TTY 时，不带这些旗标会退出 1。探测到当前 agent 就只装给它，否则按本机已安装的 agent 装。

## [3.7.0] - 2026-10-18

### Changed

- `edges init` 与各模块 init 不再接受 `--index-group`。新的子作用域按路径登记：`AGENTS.md` 在父级 `.harness` 下记入本层，否则记入下层。已有登记保持原组。`edges memory doctor --apply` 按同一规则补缺失的父级链接。

## [3.6.0] - 2026-10-08

### Changed

- 各模块 init 只创建并登记本模块的材料。`edges memory init` 不再生成 notes / projects harness 桩。skill 类型改走 `edges skills init`，任务看板改走 `edges tasks init`。无参 `edges init` 仍只编排 memory、notes、projects。

## [3.4.0] - 2026-10-08

### Changed

- 未选择类型时，推荐模块包含 projects 与 notes。选定类型并初始化后，会生成 `.harness/projects/README.md` 与 `.harness/notes/README.md` 并登记到本层系统维护信息。

## [3.3.0] - 2026-10-07

### Changed

- 类型入口改为 `.harness/<module>/<plural>/AGENTS.md`，列表用 `project-harness-*`。残留 `README.md` 只读兼容。层入口链到这些 AGENTS，不把 README 链接抄进去。
- `tasks` / `note` 不再使用 `--index-group`。任务范围只讲 `--scope` / `--super` / `--all`；list 顺着 `AGENTS.md` children 一次 traverse。

## [3.1.1] - 2026-10-05

- 对齐目录入口的 name 来源与物理父归属；明确 Doctor 对重复或重叠组成引用仅诊断、保留原文，独立有效节点仍可修复。

## [3.1.0] - 2026-10-05

- 统一目录入口、验证后的整目录导入与显式公开迁移；保留非受控正文，非法入口诊断后由调用方修正。

## [3.0.1] - 2026-10-05

- 统一 AGENTS 节点身份与三类内容组织；保留显式类型采用、写权限和局部归属，不用 Memory 标记或独立职责筛选节点。

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- 类型入口只写 `.harness/<module>/<plural>/README.md`，列表用 `project-entries-*`（本层内容 / 下层内容），与 ADR 0029 一致。memory 与 skills 相同。层入口链到这些 README。空的同目录类型 `AGENTS.md` 桩删除；不要为了装组织清单在类型目录上 init `AGENTS.md`。层系统入口仍是 `AGENTS.md`。尚未迁走、仍带条目列表的旧类型索引入口只读兼容。

## [3.0.0] - 2026-10-04

### Changed

- 执行入口迁至 TypeScript `edges memory` CLI；使用前需安装或构建 CLI，模板随构建产物分发，保留原有工作流与权限边界。

## [2.0.0] - 2026-10-03

### Fixed

- 自定义类型元数据区块或单个 writable/gitignore 权限字段缺失时拒绝推断公开可写权限；managed 保持可写 Skill 格式，doctor 能诊断未闭合 frontmatter，拒绝时保留来源与索引。

### Changed

- 初始化改为按选择采用 `.harness/memory` 与 `.harness/skills` 类型，保留稀疏作用域、原位技能权限和私有忽略规则；旧布局交独立迁移器。

## [1.7.0] - 2026-09-11

### Added

- 可写类型 `user`：入口 `.memory/USER.md`，内容目录 `.memory/users/`，条目 `user_<slug>.md`。权威副本在工作树内且 gitignore（ADR-0003）。存量 `AGENTS.md` 会被 `$project-memory-doctor` 判为 `outdated-local` 并补上 `USER.md` 那一行。

### Changed

- 本层入口清单顺序改为 `user` → `feedback` → `project` → `reference`（`project` 是兜底）；`skills` / `agent_skills` 仍靠后。

## [1.6.0] - 2026-09-08

### Changed

- 普通记忆（`feedback` / `project` / `reference`）写入改为 Agent Skills 闭集：顶层只留 `name` / `description` / `metadata`，实现字段进 `metadata.edges-*`。读取仍兼容旧的扁平顶层键，两边都有时 metadata 赢。

## [1.5.0] - 2026-09-07

### Added

- 第五个类型 `agent_skills`：索引本层 `.agents/skills/` 下人写或 `npx skills` 装入的技能，入口是 `.memory/AGENT_SKILLS.md`。它是唯一内容根在 `.memory/` 之外的类型，**本套工具绝不往那里写**——不建目录、不生成内容、不改写既有文件。
- `SKILL.tmpl.md`：`skills` 的产物模板，生成合法的 Agent Skills 目录 `skills/<name>/SKILL.md`。

### Changed

- `SKILLS.md` 入口改为只收自动沉淀的流程，人写或装入的移到 `AGENT_SKILLS.md`。分界线是谁有权改写。
- `lib/paths.py` 的 `type_dir()` 改名 `type_content_dir()`，内容根越出 `.memory/` 的类型集中在 `EXTERNAL_CONTENT_DIRS`；该表同时意味着只读。
- 索引条目路径改用 `relative_link()` 渲染，允许 `../` 越界，所以外部类型渲染成 `../.agents/skills/<name>/SKILL.md`。

### Migration

- 存量 `AGENTS.md` 会被 `$project-memory-doctor` 判为 `outdated-local` 并自动补上第五行，同时补建缺失的 `AGENT_SKILLS.md`。不需要手工迁移。

## [1.4.0] - 2026-09-06

### Changed

- 硬约束种子收成两句：ask / remember 聚光灯，以及「硬约束写在本区块」。不编排 init / doctor / reshape。

## [1.3.0] - 2026-09-06

### Removed

- `AGENTS.md` 不再生成独立的自动化策略区块；检索与沉淀时机写进硬约束种子。

### Changed

- init 的 JSON 不再返回 `autoAction`。

## [1.2.1] - 2026-09-06

### Changed

- `AGENTS.md` 内层区块之间、以及与外层标记之间各空一行。

## [1.2.0] - 2026-09-06

### Added

- `AGENTS.md` 增加本层硬约束区块：规则直接写在入口里，init / doctor 只保证区块存在、不覆盖已有正文。

## [1.1.0] - 2026-09-06

### Changed

- 用户要求 reshape 某一份已有 `AGENTS.md` 时，视为同时同意对该目录 Init。
- 拆已有 `AGENTS.md` 区块外正文改走 `$project-memory-reshape`；init 仍不覆盖已有正文。

## [1.0.0] - 2026-09-01

### Added

- 按 semver 标记的首个版本。

[Unreleased]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@4.0.0...HEAD
[4.0.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@3.7.0...skill/project-memory-init@4.0.0
[1.7.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@1.6.0...skill/project-memory-init@1.7.0
[1.6.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@1.5.0...skill/project-memory-init@1.6.0
[1.5.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@1.4.0...skill/project-memory-init@1.5.0
[1.4.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@1.3.0...skill/project-memory-init@1.4.0
[1.3.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@1.2.1...skill/project-memory-init@1.3.0
[1.2.1]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@1.2.0...skill/project-memory-init@1.2.1
[1.2.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@1.1.0...skill/project-memory-init@1.2.0
[1.1.0]: https://github.com/VirusPC/edges/compare/skill/project-memory-init@1.0.0...skill/project-memory-init@1.1.0
[1.0.0]: https://github.com/VirusPC/edges/releases/tag/skill/project-memory-init@1.0.0
