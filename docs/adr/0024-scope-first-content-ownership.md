---
status: accepted
---

# 递归节点与局部记忆归属

2026-10-05 的八项讨论收敛为[目录节点模型](../superpowers/specs/2026-10-05-directory-node-model.md)。本 ADR 按 [README「系统实现」](../../README.md#系统实现)组织设计理由，接口与实施验证分别见 spec 和[计划](../superpowers/plans/2026-10-05-directory-node-refactor.md)。

> **修订（2026-10-06）：** 系统入口 / README·INDEX 入口合同、组成标记分工、以及不再以 Internal/Leaf 固定类层次表达组织状态，见 [ADR 0029](0029-recursive-system-two-entries.md)。下文仍保留当时落地表述；与 0029 冲突处以 0029 为准。

## 闭环复利（投资视角）

目录服务知识进入行动、反馈再回到知识的闭环。领域任务在 `tasks/`，维护当前作用域的任务在 `.harness/tasks/`。通用任务执行约定与 CLI 规则由根 Project Memory 保存，写作方法由 conversation-to-tasks 维护，各层通过引用复用；具体看板的项目分组仍归该看板。

## 任意输入、统一转化、多种输出（ETL 视角）

Task、Memory、Note 等统一采用目录与 `index.md` 入口，标准 Skill 使用 `SKILL.md`。不同内容复用基础模型，业务方法由各 Node 实现，Service 负责文件读写与目录一致性。新建任务传结构化参数，由 CLI 生成文档；已有文档先 parse/validate，报错后由人或 Agent 修正，不以自动容错代替标准。任意外部格式接入、RAG 等仍是未来方向。

## 持续协作与自进化（Agent 视角）

人和 Agent 通过 `AGENTS.md` 发现规则、Memory 与长期任务。递归目录可支持多主体协作，但 Agent Teams 自动编排、自动复盘以及持续 RSI 循环尚非这次实现；是否形成自进化，要看改进能力是否继续用于下一轮改进。

## 递归树结构

每个 Markdown 入口对应一个节点：BaseNode 下分 InternalNode 与 LeafNode，Task、Memory、Skill 等继承 LeafNode（类层次为当时实现；组织/叶子现为派生状态，见 ADR 0029）。AGENTS.md 是系统入口，沿用硬约束与两组直属索引 `localChildren`、`descendantChildren`；现行标题为**本层硬约束、本层系统维护信息、下层系统维护信息**。系统一孩子改由组织清单 `README.md` 的 entries 登记（ADR 0029）。

父归属遵循文件目录，一个节点至多一个 parent。索引可以跨目录层级发现节点，普通交叉引用不增加 parent。引用仅含路径派生的 id 和可选 name、description。遍历默认展开全部组成 `children`（本层∪下层）；只要本层时显式收窄（见 ADR 0029 / Q20）。

任意节点可拥有独立 harness，承载它的系统二。组成遍历不自动跟随 harness：读取当前系统二的组成内容，不继续检索它或其组成节点的系统二。同目录 SKILL.md 与 AGENTS.md 分别是 Skill 叶子与它的 harness；AGENTS 的 harness 则可继续位于 `.harness/AGENTS.md`。叶子没有组成子节点，也可以拥有 harness；空组织节点仍是 InternalNode。

各节点的局部上下文留在所属层，不能因通用递归而上收根层。根 `AGENTS.md` 和 `.harness/` 保存仓内共享约定；只有提炼到 `extensions/` 与 `shared-extensions/` 的能力才用于对外分发。预定义 `extensions/memory` 仍是独立待办，不把原始历史记忆直接分发。

## 文件系统

目录是存储与生命周期单元，入口和附件同处；模型只管理 Markdown 节点，不建资源对象。入口文件名和叶子目录规则在 `domain/config/layout.ts`，区块标题与标记在 `domain/config/sections.ts`。路径类型、href 和生命周期在 `models/node/layout.ts`。移动、删除和导入按目录执行；删除 Skill 包含其 harness。共址 AGENTS 的单独删除保留宿主内容。没有公开的独立 reparent，改变父归属必须通过物理移动并协调索引。当前采用原地更新，immutable 是后续优化。

parse/serialize 使用 gray-matter 默认 YAML 能力；保留 Markdown 非受控章节、注释和正文，不追求 YAML 注释与样式保真。系统权限交给操作系统，Git 忽略规则与来源只读约束另行保持。

`CONTEXT.md`、`docs/adr/`、`docs/superpowers/` 与其他工具文档保留自身约定；没有节点入口的目录只是导航目标，不自动生成 AGENTS。历史单文件经显式一次性迁移转换，不作为生产双格式长期保留。

## Git 原生管理

Git 跟踪公开内容，忽略规则保护本地私有记忆。公开迁移不能证明其他克隆的 ignored 内容已经处理；私有材料须由每个克隆按[迁移指南](../recursive-layout-migration.md)明确审阅。目录转换只要发现已知旧 journal 就拒绝，不读取其中可能存在的私有快照，不自动删除、归档或续跑；来源不明或目标冲突同样报错。`posts/` 由人维护，不属于自动目录节点转换范围；去掉 knowledge 层的本次搬迁由用户另行明确授权，文件字节保持不变。

目录模型、业务 CLI 与本仓公开内容已采用上述约定。具体转换数量、幂等性及排除范围记录在[迁移指南](../recursive-layout-migration.md#2026-10-05-目录入口采用)，测试与独立审阅进度以实施计划为准。

历史实施：[原设计](../superpowers/specs/2026-10-03-recursive-scope-layout-design.md)、[上一轮模型](../superpowers/specs/2026-10-04-node-domain-model-design.md)、[43 条公开局部记忆归属纠正](../superpowers/plans/2026-10-05-recursive-node-ownership-correction.md)。这些记录保留当时状态，当前规则以本 ADR 与新 spec 为准。
