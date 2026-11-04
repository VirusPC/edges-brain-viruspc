---
name: project_development
description: 修改顺序：协议 → 布局 → edges 的 memory 说明 → 其他记忆 skill。doctor 与 reshape 技能已删除，诊断用 edges memory doctor。
metadata:
  edges-title: Project Memory 系列 Skill 开发流程
  edges-type: project
  edges-username: cheng
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-10-05T00:06:56+08:00'
  edges-agent-client: codex
---

# Project Memory 系列 Skill 开发流程

修改顺序这条硬约束写在本目录 `AGENTS.md` 的本层硬约束区块里。本文件只展开每一步的完成判据。

本文件规定 memory 协议、总入口 `edges` 里的 memory 说明，以及 `edges-memory-ask`、`edges-memory-remember`、`edges-memory-add-type` 的修改顺序。`project-memory-doctor` 与 `project-memory-reshape` 已删除，没有同名替代。索引诊断仍是 CLI `edges memory doctor`。

```text
PROTOCOL.md
    ↓
LAYOUT.md
    ↓
edges 的 memory 说明（../memory-init.md）
    ↓
其他受影响的记忆 skill
```

箭头表示依赖与检查顺序，不表示每次必须改动全部几层。每一层都要按顺序检查；确认不受影响时可以不改，但不能跳到下游后再反过来定义上游。

## 1. 先定 `PROTOCOL.md`

先判断改动是否触及所有 project-memory skill 共同遵守的协议。涉及节点形状、读写语义或跨 skill 契约时，先更新 [`PROTOCOL.md`](../../../../references/PROTOCOL.md)；只是实现升级且不破协议时，明确保持协议不变。

完成判据：后续实现可以从协议推导，协议中没有混入具体文件名、区块标记或脚本结构等实现细节。

## 2. 再定 `LAYOUT.md`

把协议落实成目标布局：文件与目录、类型入口、区块标记、模板映射及其他由本实现拥有的约定都在 [`LAYOUT.md`](../../../../references/LAYOUT.md) 里先定清楚。

完成判据：它描述的是修改完成后的唯一目标态。若改动已发布产物的名字，同时登记显式迁移命令承担的转换义务，以及 doctor 对旧结构的诊断边界。

## 3. 修改 `edges` 的 memory 说明

按目标布局修改 [memory-init.md](../../../../../memory-init.md)、`references/templates` 和相关说明。用户确认执行能力统一进入 TypeScript CLI；Skill 保留推理、内容规范与审阅流程，避免维护 Python 与 CLI 两套行为。模板仍以这份 memory 材料为真源，CLI 构建时携带。执行边界见 [runtime.md](../../../../references/runtime.md)。

完成判据：新建产物符合 `LAYOUT.md`，重复执行保持幂等，对外 CLI 与输出能支撑下游 skill。

## 4. 修改其他受影响的记忆 skill

依次检查 `edges-memory-ask`、`edges-memory-remember`、`edges-memory-add-type`。只修改实际受影响者；优先继续依赖 `PROTOCOL.md`、CLI `--help` 或落盘产物等自描述接口，不复制 `LAYOUT.md` 的实现细节。

完成判据：读、写及其他工作流能正确使用新实现，未受影响的 skill 没有为了表面同步而增加耦合。

## 5. 用 CLI 核对诊断

协议、布局和技能正文稳定后，用 `edges memory doctor` 核对索引。不要再装或调用已删除的 `project-memory-doctor` / `project-memory-reshape`。0.3.0 起不再用 `edges memory migrate` 做旧结构转换；仍停在 `.memory` 的用 `@viruspc/edges@0.2.7`，材料目录改名见 `docs/migrations/2026-10-27-rename-harness-to-edges.md`。

完成判据：`edges memory doctor` 的修复收敛到 `LAYOUT.md`，再次检查没有同类 finding；既有正文与不归本套管理的内容保持不变。

## 收尾检查

- 核对 `PROTOCOL.md`、`LAYOUT.md`、模板、CLI 与各 SKILL.md 没有相互矛盾。
- 搜索旧路径、旧名字和旧类型，区分应迁移的兼容代码与应清理的过期引用。
- 在临时目录验证 init、remember、ask 所依赖的产物，以及 doctor 的诊断、修复和二次运行幂等性。
- 如果修改了 skill 目录，按 [`packages/skills/README.md`](../../../../../../../README.md) 的分发说明复核安装后的文件集合。
