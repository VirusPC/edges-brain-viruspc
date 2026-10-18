# 本层材料索引落在 `.harness/README.md` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** edges 作用域（`isScope`）的「本层系统维护信息」材料清单只挂在 `.harness/README.md`；`AGENTS.md` 本层只留一条指向该 README 的组成；`edges init` 保证该文件存在；`--super` 优先从 harness 入口 README 展开，缺失时再扁平挂载。

**Architecture:** 材料索引是普通 `ReadmeNode`（`project-entries-*`，无 YAML frontmatter）。`NodeService` 在 `.harness/README.md` 已带 entries 标记时，本就会把 `.harness/` 下的新材料登记到这份 README（`physicalParent`）。本计划补上：init 先创建该 README；AGENTS 本层只保留单条指针；类型行、看板和 add-type 不再写入 AGENTS 本层；既有清单迁入 README 后从 AGENTS 本层删掉。`--super` 不再一律按 `harness-materials.json` 扁平挂载。

**Tech Stack:** TypeScript、Node 22、`node:test`、现有 `AgentsNode` / `ReadmeNode` / `NodeService`。

**Spec:** `docs/adr/0035-harness-readme-as-layer-material-index.md`

## 评审简化（已落地）

- `--super` 不再有「作用域根 `README.md`」中间层：只有 `.harness/README.md`，否则扁平挂载。
- 删除 `harness-index.ts`。`.harness/README.md` 就是普通 `ReadmeNode`。保证文件与 AGENTS 指针在 `init/service.ts`；`--super` 优先挂载在 `super-root.ts`；迁移在 `scripts/migrate-harness-readme-index.mts`（写入函数在 `init/migrate-scope-readme.ts`，供 init 与脚本共用）。`migrateScopeMaterialIndex` 只在 `initScope` 末尾调用一次。
- 删除未使用的 `upsertLocalTypeLine` 与 `HarnessBoardModule.registration`。

## Global Constraints

- 只对 `isScope` 为真的目录生效（`extensions/cli/src/services/scope.ts`：`AGENTS.md` 能解析成带 edges XML 标记的 `AgentsNode`）。
- 只迁「本层系统维护信息」的材料清单。下层系统维护信息、Compose block、本层硬约束仍在 `AGENTS.md`。
- AGENTS 本层恰好一条组成，指向 `.harness/README.md`，name 为「本层 harness 材料索引」。不双写。
- `.harness/README.md` 是标准组织清单：`project-entries-local` / `project-entries-descendants`，无 YAML frontmatter。
- 不合并 `layout.ts` 的 `ENTRY_NAMES` 与 `harness-materials.json`。不改 ADR 0034。不做 Claude 式 `@path` 展开。
- `project-memory-init` 的 PROTOCOL / LAYOUT / `AGENTS.tmpl.md` 本轮不改。模板里的类型行仍是 `indexFiles()` 与 `seedDescription()` 的说明来源；写入新 AGENTS 时由 `selectedLocalBlock` 去掉这些行，只留指针。技能正文与 CLI 写入形状的差异标为未改。
- 公开仓库：不写入凭据、Tailscale、100.x 地址。

---

### Task 1: Domain — 索引路径与 `--super` 优先序

**Files:**

- Create: `extensions/cli/src/domain/harness-index.ts`
- Modify: `extensions/cli/src/services/node/super-root.ts`
- Test: `extensions/cli/test/services/super-agents-node.test.ts`
- Test: `extensions/cli/test/operations/traverse-dual-entry.test.ts`

**Interfaces:**

- Produces:
  - `HARNESS_INDEX_NAME = "本层 harness 材料索引"`
  - `HARNESS_INDEX_DESCRIPTION = "本层 harness 材料的组织清单。各材料只在这里登记。"`
  - `harnessIndexPath(scopeDir) → <scope>/.harness/README.md`（`placeHarnessMaterial(scope, "readme")`）
  - `superViewHarnessIndexPath(scopeDir) → <scope>/README.md`（`placeHarnessMaterial(scope, "readme", { super: true })`）
  - `harnessIndexSeed() → string`（标题 + `project-entries-local`，无 frontmatter）
  - `materialOwnershipPaths(scopeDir) → Set<string> | undefined`（README 不存在则为 `undefined`）
  - `preferredSuperHarnessIndex(scopeDir) → string | undefined`

**优先序（ADR 7）：**

1. `<scope>/.harness/README.md` 存在：只挂这个文件，并从它的 children 展开。真系统索引和作用域根 `README.md` 在本仓不是同一份文件（根 README 是对外门面）；两边都存在时仍挂 `.harness/README.md`，避免把对外 README 当成材料索引。
2. 否则若作用域根 `README.md`（readme 材料的 super 落点）存在：只挂它并展开。
3. 否则回退 `listHarnessMaterialAbsPaths` 扁平挂载。

- [x] **Step 1:** 写失败测试：仅有 `.harness/README.md` 时不扁平挂 `tasks/README.md`；仅有根 `README.md` 时不扁平挂未链接的材料；两者都没有时仍扁平挂载。
- [x] **Step 2:** 跑 `node --import tsx --test extensions/cli/test/services/super-agents-node.test.ts`，确认新断言失败。
- [x] **Step 3:** 实现 `preferredSuperHarnessIndex`，`createSuperAgentsNode` 改为优先单挂载。
- [x] **Step 4:** 更新 `traverse-dual-entry` 里「tasks 在 readme 之前」的旧扁平顺序。
- [x] **Step 5:** 测试通过。

### Task 2: Service — 保证索引、单条指针、材料只登记到 README

**Files:**

- Create: `extensions/cli/src/services/harness-index.ts`
- Modify: `extensions/cli/src/services/init/service.ts`
- Modify: `extensions/cli/src/services/memory/agents.ts`
- Modify: `extensions/cli/src/services/memory/types.ts`
- Modify: `extensions/cli/src/services/memory/add-type.ts`
- Modify: `extensions/cli/src/services/memory/doctor.ts`
- Modify: `extensions/cli/src/services/init/modules.ts`（注释）
- Test: `extensions/cli/test/services/harness-index.test.ts`
- Test: `extensions/cli/test/commands/init-service.test.ts`

**Interfaces:**

- Consumes: Task 1 的路径与种子。
- Produces:
  - `ensureHarnessReadme(scopeDir, service) → "created" | "preserved"`
  - `ensureAgentsPointer(scopeDir, service)`
  - `registerMaterial(scopeDir, reference, service)`（已有条目不覆盖手写 description）
  - `migrateScopeMaterialIndex(scopeDir, service?) → { moved: string[] }`

**行为：**

- `ensureHarnessReadme` 只在文件缺失时 `ReadmeNode.create({ body: harnessIndexSeed() })`。不传 `name` / `description`，避免 YAML frontmatter。
- `syncTargetAgents` 不再把类型行 `upsert` 进 AGENTS 本层。新建 AGENTS 的本层块用 `selectedLocalBlock()`：从模板去掉 `.harness/(memory|skills)` 行，只插入指针。
- `layerTypeSpecs`：`.harness/README.md` 存在时，所有权边取它的 children；否则仍读 AGENTS 本层（没有索引文件的旧夹具）。磁盘上的类型索引扫描保持不变。
- `edges init` / `runTypeInit`：创建材料之前先 `ensureHarnessReadme`。看板与类型创建后 `registerMaterial` 写到索引 README。结束时 `migrateScopeMaterialIndex`，避免 AGENTS 本层留下材料行。
- `add-type` 与 doctor `--apply` 把类型登记补到索引 README，不写回 AGENTS 本层多条。
- 硬约束、下层、区块外正文保留。

- [x] **Step 1:** 写失败测试：空目录 `init` 后存在无 frontmatter 的 `.harness/README.md`；AGENTS `localChildren` 只有该文件；类型 README 出现在索引上而不在 AGENTS 本层；再次 init 字节不变；带旧材料行的 AGENTS 迁完后本层只剩指针，下层仍在。
- [x] **Step 2:** 跑新测试，确认失败在「文件不存在 / 本层仍有多条」。
- [x] **Step 3:** 实现 service，并改 init / sync / add-type / doctor / `layerTypeSpecs`。
- [x] **Step 4:** 改旧断言：`init-service`、`type-index-readme`、`core-boundaries` 里「类型行写在 AGENTS」的期望改为索引 README。
- [x] **Step 5:** 相关测试通过。

### Task 3: 迁移本仓 edges 作用域

**Files:**

- Create: `scripts/migrate-harness-readme-index.mts`
- Modify: `package.json`（`migrate:harness-readme-index`）
- Modify: 各 `isScope` 目录的 `AGENTS.md` 与新建的 `.harness/README.md`

**行为：**

- 默认预览；`--apply` 才写。可重复运行：已迁完的作用域计划为空。
- 每个 `isScope` 目录：本层已解析的材料条目，以及本层列表里尚未解析成 child 的节点链接，迁入 `.harness/README.md` 的 `project-entries-local`。AGENTS 本层只留指针。下层与硬约束不动。
- 索引上已有同一 id 时保留索引上的 description，不覆盖。
- 排除 `posts/`（本仓 AI 不改对外博客）。

- [x] **Step 1:** 实现脚本，对仓库根预览。
- [x] **Step 2:** `--apply`。抽查根、`extensions/`、`extensions/skills/project-memory-init/`：材料在 `.harness/README.md`；下层还在。非材料链接（内容 INDEX、`tech-reading/AGENTS.md`、根上的 README/CONTEXT/adr 导航）留在 AGENTS。
- [x] **Step 3:** 再跑一次预览，计划为空。

### Task 4: 文档状态

**Files:**

- Modify: `docs/adr/0035-harness-readme-as-layer-material-index.md`
- Modify: `CONTEXT.md`（虚拟超节点条去掉「未实现」）

- [x] Decision 8 与 Consequences 改为已实现的行为。
- [x] 写明未改项：`project-memory-init` 的 PROTOCOL / LAYOUT / 模板正文仍描述「本层链到各类型 README」；CLI 写入已是单条指针。模板类型行仍服务 `indexFiles()` / `seedDescription()`。
- [x] `--super` 优先序按 Task 1 写清，不把「两边都在就改挂对外 README」说成已做。

### Task 5: 验证

- [x] `pnpm --filter edges-cli test`（全量 CLI 测试，1021 通过）
- [x] 提交说明使用 `type: subject`，trailer：`Co-authored-by: Agent Memory 专家 <grok-bot@users.noreply.github.com>`
