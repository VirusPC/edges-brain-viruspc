---
name: project-memory-doctor
description: 诊断并修复已采用的 .harness 项目记忆索引与作用域登记。默认只诊断；明确授权修复时 apply。旧布局只报告迁移需求。
version: 3.3.0
---

# Project Memory Doctor

用户要求检查、修复项目记忆，或 init 返回 needs-doctor 时使用。目标态见 [LAYOUT](../project-memory-init/references/LAYOUT.md)。默认只诊断；用户已明确要求修复可直接 apply，否则先说明具体 findings 再获得授权。

```bash
edges --scope <目录> memory doctor \
  [--target-dir <scope>] [--root-dir <boundary>] [--apply]
```

只修已采用类型的派生索引、层入口和下层登记，不代为 Init 未采用模块或类型，不改正文、文件头或安装链接。旧 `.memory` 返回 `migration-required`，由独立 `$project-memory-migrate` 转换。

| code / issue | 处理 |
| --- | --- |
| missing-index / stale-index | 补已采用类型入口 `README.md`（memory 与 skills），或重算其本层列表区块。不新建类型目录 `AGENTS.md` |
| unregistered-type / outdated-local | 补本层类型链接，保留其他类型和人工说明 |
| missing-agents / foreign-agents | 建层入口或追加受管区块，人工正文保留 |
| missing-important | 补硬约束种子，已有规则不覆盖 |
| dead-entry / unregistered | 清理失效登记；补已采用 Memory 的缺失登记，保留显式归属与描述 |
| migration-required | 只报告，转独立迁移器 |
| unsafe-layout | 只报告路径越界、类型冲突或非法元数据，不扩大写权限 |
| source-scan-error | 来源缺失、断链、不可读时保留已有索引，不当空来源 |
| invalid-entry | 诊断入口格式、重复引用或 local/descendant 重叠；即使 --apply 也保留原文，提示修正后重跑 |

所有可读 AGENTS 均可发现为节点，类型或业务入口允许稀疏内容，不强制添加空区块。仅对已采用 Memory / Skills 的节点修复类型契约；本层与下层登记均保留，不将已登记本层入口重复放入下层，也不按物理祖先搬动跨目录登记。可穿过 `.harness/evaluation` 等容器发现节点；跳过安装链接、依赖目录与其他 Git 根/submodule。`referenced` 仅索引本层 `.agents/skills`，不扫描子层或全机技能。

`.agents` 一个字节都不写；缺失来源不代建。修复 `user` 或自定义私有类型前保证索引和正文忽略规则。索引来源无法完整读取时不写空索引；即使 `--apply` 后仍会有 remaining，应说明原因，不能宣称已修复干净或反复重试。

按返回 JSON 汇报 findings / repaired / remaining。内容合并、抽象、遗忘不属于 doctor；对已有 AGENTS 人工正文的重组使用 `$project-memory-reshape`。

旧单文件不作为生产节点。目录转换用 `$migrate-directory-nodes`，Doctor 不自动迁移。若 AGENTS 本身无效，本次 apply 保留文件并返回诊断，不猜测应保留的索引组或条目。

`memory init` 与 `memory doctor` 没有 `--index-group`。`--apply` 补缺失的父级链接时按路径决定：目标 `AGENTS.md` 在父级 `.harness` 下记入本层，否则记入下层。已有登记保持原组。缺失 owner 不代为初始化。Tasks 的范围是根上的 `--scope` / `--super` / `--all`。list 顺着主体 `AGENTS.md` 的 children 一次 traverse，不要再扫 README `project-entries`，也不要把 README 链接抄进 `AGENTS.md`。看板变更只通过 `edges tasks` 改文件；送进受保护的 `main` 必须开 PR，不要直接 push。遇到 `task-projects` 旧标记时，先对用户选定范围运行 `scripts/migrate-agents-indexes.mts --root /absolute/scope --check`，明确执行迁移才加 `--write`；普通命令不自动迁移。
