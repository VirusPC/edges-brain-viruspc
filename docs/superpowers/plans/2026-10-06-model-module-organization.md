# Model 模块归组 Implementation Plan

> **For agentic workers:** Use executing-plans for this coupled migration. Steps use checkboxes for execution tracking.

**Goal:** 让节点类及其专属规则集中可读，移除错位依赖，保持已有行为。

**Architecture:** models 按 core/agents/tasks/memory/notes/skills 归组。Model 管单节点，operations 管集合，Service 管完整用例与 IO；通用 Markdown 留在 utils。完整目标与文件映射以 spec 为准。

**Tech Stack:** Node 22、TypeScript、既有 pnpm/tsx/TypeScript AST；无新增依赖。

**Spec:** [模型组织设计](../specs/2026-10-06-model-module-organization-design.md)

## Global Constraints

- 仅在 `codex/model-organization` 的独立 worktree 修改。
- 不改 Markdown 格式、CLI 参数、JSON 输出、Schema 内容、节点继承、可变实例和索引语义。
- 保留非受控 Markdown、原始引用和 metadata；不新增纠错逻辑。
- 批量移动、导入改写必须脚本化，先预览，检查冲突，安全重复运行。
- 不保留内部旧路径转发文件；保留 models 公共节点类和节点类型出口。
- TaskDoc 纯数据契约及 Schema 生成链不变；domain 不依赖 Service/commands，通用 Markdown utils 不依赖 domain。既有 CLI 错误适配的类型依赖据实记录。
- 不修改 posts 或真实知识内容；commands 用例解耦不属于本计划。

## Task 1: 模型归组与消费者同步

**Files:** spec 文件映射表中的 models 文件；`src/domain/operations/{traverse,tasks}.ts`；`src/utils/markdown/document.ts`；引用这些模块的 CLI、测试和仓根 TS 脚本。新增 `extensions/cli/scripts/organize-models.ts`。

**Interfaces:** 节点类方法、输入字段与返回值不变。NodeModel 改名 AgentsDocument；对应 createNodeModel/NodeItem/NodeLink/NodeText 明确为 AGENTS 文档名字。所有导入按符号归属更新；公共模型出口保留节点类型，查询选项由 traverse 导出。

- [x] 在 Node 22 安装锁定依赖，运行现有 models、node-tree codec、operations 测试建立基线；生成 TaskDoc Schema 并保留基线副本。
- [x] 编写 TS 迁移脚本：以路径映射、声明所有权映射和 TypeScript AST 更新 import/export/import-type/dynamic-import；生成所有变更后先验证目标冲突，再支持 `--apply` 写入。默认只预览；迁移完成后再次运行应报告零变更。
- [x] 将 core、各节点类和 InternalSyntax 移至设计位置。拆分原 types.ts 到实际所属模型或 traverse；InternalContent 的内部可变形态由公开只读形态派生，不重复描述字段。
- [x] 合并 createMarkdownCodec/baseDocumentCodec 到 Markdown 工具；Memory/AGENTS codec 留在各自文档模块。parser 就地初始化文档，避免 document → parse → document 运行时环。
- [x] 将数组级 `filterTasksByPriority`、`sortTasksByPriority`、`filterTasksByProject` 原样迁入 operations/tasks；原优先级比较和项目规则不改。
- [x] 更新仓内消费者及既有测试的导入，删除无引用 TasksOutput。用现有测试验证搬迁后的行为，不为纯路径调整添加重复行为测试。
- [x] 执行脚本预览、应用和幂等检查，检查旧路径残留，运行类型检查及相关测试，提交代码。

操作命令（仓根）：

```sh
npm exec --yes --package=node@22 -- pnpm --filter edges-cli exec tsx scripts/organize-models.ts
npm exec --yes --package=node@22 -- pnpm --filter edges-cli exec tsx scripts/organize-models.ts --apply
npm exec --yes --package=node@22 -- pnpm --filter edges-cli exec tsc --noEmit
npm exec --yes --package=node@22 -- pnpm --filter edges-cli run build:tasks-review-app
npm exec --yes --package=node@22 -- pnpm --filter edges-cli exec node --test --test-concurrency=1 --import tsx './test/models/*.test.ts' './test/utils/node-tree/*.test.ts' './test/operations/*.test.ts' './test/tasks/utils/*.test.ts'
```

## Task 2: 分层验收与交付

**Files:** 上述变更、spec/本计划的完成记录；必要的当前架构说明。历史 ADR/已完成计划只保留历史，不全仓改写。

**Interfaces:** 运行时和 type-only 依赖均检查；浏览器仍直接消费无运行时依赖的 TaskDoc 与任务枚举。

- [x] 检查 package exports、仓内深路径消费者、模板及迁移脚本；不新增无实际需要的兼容壳。
- [x] 用 TypeScript AST 检查 src 本地依赖图：无运行时循环、core 不依赖业务模型、domain 不依赖 Service/commands；包括 type-only 的越界检查按执行记录区分既有例外。公共索引不重新导出遍历选项，避免反向引用 operations。
- [x] Node 22 执行 CLI 全量测试与 build；构建覆盖前端类型检查、Schema 生成与静态资源复制。比较 TaskDoc Schema 与迁移前基线，内容相同。
- [x] 使用独立 reviewer 审查实现与 spec，修正实际问题；不把仅减少文件数作为评审目标。
- [x] 将结果、执行中裁定及其代价记入本计划，更新 spec 状态；提交并提供文件与 commit。合并不包含在本次授权内。

```sh
npm exec --yes --package=node@22 -- pnpm --filter edges-cli test
npm exec --yes --package=node@22 -- pnpm --filter edges-cli build
git diff --check
```

## 执行记录

2026-10-06：用户批准 spec 并要求执行。文件迁移与符号归属更改共享同一导入图，作为一批执行，独立 reviewer 在完整变更后审查；避免为同一图拆出多个相互依赖的工作树。


### 验收结果

- 状态：已完成。CLI 全量 880 tests / 0 failures；Node 22 下 build、src 类型检查及迁移脚本独立类型检查通过。
- 基线模型/codec/query 测试 75 项通过。第一次直接扩大的 184 项测试中，3 项缺少尚未构建的审阅页资产；标准 test 命令先构建资产后，全量 880 项通过。上方独立测试命令已补资产构建前置步骤。
- TaskDoc Schema 和 manifest 与迁移前副本逐字节一致；前端随构建完成类型检查与生产构建。Vite 的既有配置/弃用 warning 未纳入本次改动。
- 迁移脚本在隔离基线副本验证：预览不写文件、目标冲突时拒绝且原文件不变、完整迁移、再次 apply 零变更、无关同名符号和无关导入扩展名保持原样。脚本只用于这次源码布局迁移，不是通用代码迁移框架。
- 依赖检查覆盖 src 的 139 个 TS 模块、529 条本地引用：无运行时循环，无 core → 具体模型、models → operations、domain → Service/commands 的反向依赖。utils/exit.ts → Tasks 类型为既有例外。
- 独立 reviewer 审查通过，确认搬迁模型运行时主体及既有方法合同不变。按建议将脚本符号改名限定到 AGENTS 文档声明及直接消费者；不再对全仓同名标识符无差别重命名。
- 用户追加要求的 domain、models、operations README 全部补齐，相互链接，并通过独立文档审查；44 个相对文件链接检查通过。

### 执行中的裁定与改变成本

1. **将无环验收限定为运行时图，类型依赖仍纳入分层检查。** BaseNode/relations、AGENTS document/parse/serialize 及既有 Tasks Service 存在 type-only 互引，不构成运行时循环。为消除这种图形上的环额外拆类型文件，会违背本次收拢职责的目标；将来若改成独立 package，可再按真实发布边界拆分。
2. **保留 utils/exit.ts 的既有业务错误类型依赖。** 它属于后续 commands/Service 解耦范围，本次不为让检查数字归零而改变错误接口。代价是这项全局分层例外仍存在，不能宣称整个 CLI 已完成解耦。
3. **保留纯数据 TaskDoc 契约与文档表示的必要拆分。** 文件数量不是唯一目标；合并会让浏览器或生成器接触节点运行时依赖。节点扩展不强制补齐这类文件，只有真实消费者需要时才拆。
