---
status: accepted
---

# 本层材料索引落在 `.harness/README.md`

2026-10-18 的 grill 确认：edges 作用域里，「本层系统维护信息」所登记的材料清单，从 `AGENTS.md` 迁到该作用域的 `.harness/README.md`。动机与 Letta / Devin 把索引放进 harness 文件夹、以及 Compose 进来的外部知识库自带索引文件一致——材料索引只有一份、形状统一，比在 `AGENTS.md` 与 `.harness/` 之间双写或拆两套清单更好懂。

本 ADR **不**改正 ADR 0034：Compose block、本层硬约束仍写在 `AGENTS.md`；本层材料列表的落点改到 `.harness/README.md`，`AGENTS.md` 本层只留一条指向该 README 的组成登记。

**Status:** accepted（ADR 0035；grill 确认于 2026-10-18 Asia/Shanghai）

**See also:** ADR 0034（工作空间由就地 harness 加若干被组合的 harness 仓库构成）、ADR 0029（递归系统二入口）、ADR 0031（`edges init`）

## Decision

1. **适用范围：仅 edges 作用域**：本规则只对 CLI `isScope`（`extensions/cli/src/services/scope.ts`）判定为作用域的目录生效——该目录有 `AGENTS.md`，且能解析为带 edges XML 标记的 `AgentsNode`。普通 `AGENTS.md`（无 edges 标记）不是 edges 系统，不强制建 `.harness/`，也不套本规则。
2. **迁什么、留什么**：只把「本层系统维护信息」里的**材料清单**迁到 `.harness/README.md`。「下层系统维护信息」仍写在 `AGENTS.md`。Compose block 与「本层硬约束」仍写在 `AGENTS.md`，不进 README。
3. **`AGENTS.md` 本层只留一条组成登记**：本层区块保留**唯一**一条指向 `.harness/README.md` 的组成条目，name / description 写清楚（本层 harness 材料索引）。不再在 `AGENTS.md` 本层逐条列出各材料 README；材料只挂在 `.harness/README.md` 的 entries 下。索引只在一处，不双写。
4. **`.harness/README.md` 是标准组织清单**：形态为普通 `ReadmeNode`，使用 `project-entries-local` / `project-entries-descendants`；给人看的说明与 entries 可同文件。无 YAML frontmatter。
5. **`edges init` 保证文件存在**：对 edges 作用域，`edges init` 须确保 `.harness/README.md` 存在；之后本层材料只通过该 README 登记，不再直接往 `AGENTS.md` 本层挂材料条目。
6. **迁移既有链接**：已有 `AGENTS.md` 本层里指向各材料的链接，迁入对应作用域的 `.harness/README.md`；迁完后 `AGENTS.md` 本层不再保留这些材料条目（无双写过渡态）。
7. **`--super` 优先挂载 `.harness/README.md`**：该文件存在时只挂它，并从它的 entries 展开。不存在时回退为按 `harness-materials.json` 扁平挂已有材料。不把作用域根 `README.md` 当作中间优先层（评审确认：根 README 往往是对外门面，不是这份组织清单）。
8. **实现状态**：Domain / Service / CLI 已按本 Decision 落地。`edges init` 保证 edges 作用域存在 `.harness/README.md`，本层材料登记走该 README，既有 harness 材料链接已从 AGENTS 本层迁走，`--super` 优先挂载入口 README。术语见 `CONTEXT.md`。实施步骤见 `docs/superpowers/plans/2026-10-18-harness-readme-layer-index.md`。

## Considered Options

- **双写两份索引（`AGENTS.md` 本层与 `.harness/README.md` 各列一遍）：** 否决。索引必须恰好在一处；双写会漂移、也违背「一份形状」。
- **把 Compose block 或本层硬约束一并迁进 `.harness/README.md`：** 否决。Compose 与硬约束仍属 `AGENTS.md` 本层语义（见 ADR 0034）；本 ADR 只动材料清单落点。
- **凡有 `AGENTS.md` 就强制建 `.harness/`：** 否决。仅 `isScope` 为真的 edges 作用域适用；无 edges 标记的普通 `AGENTS.md` 不是 edges 系统。
- **继续在 `AGENTS.md` 本层逐条列出每个材料 README：** 否决。与「索引进 harness 文件夹、与外部 KB 索引形状一致」的动机冲突；改为本层只指 `.harness/README.md`。
- **把 `layout.ts` 与 `harness-materials.json` 合并成一份真相源：** 否决 / 超出本 ADR 范围（别处已否决或另议）；本 ADR 不合并二者，只规定材料索引文档落在 `.harness/README.md`，以及 `--super` 优先从该 README 展开。
- **修订 ADR 0034 而不是新开 ADR：** 否决。0034 管的是 Compose 与工作空间构成；本层材料索引落点是另一条决定，用 0035 记录。

## Consequences

- 已落地：`edges init` 对 edges 作用域创建或保留 `.harness/README.md`（普通 `ReadmeNode`，无 YAML frontmatter）。新建的 notes/projects 与类型索引由 `NodeService` 的 physicalParent 登记到这份 README；tasks 看板仍由 init 显式挂上（NodeService 跳过这块看板）。AGENTS 本层写入单条「本层 harness 材料索引」。没有单独的 harness-index 模块。`--super` 仅在 `<scope>/.harness/README.md` 存在时挂它并展开，否则按 `harness-materials.json` 扁平挂载。
- 已迁移：各 `isScope` 目录里、位于该作用域 `.harness/` 下的本层材料链接，已移入对应 `.harness/README.md`，并从不在 AGENTS 本层双写。下层系统入口、Compose block、本层硬约束的位置不变。不是 harness 材料的本层链接留在 AGENTS（例如根上的 `README.md` / `CONTEXT.md` / `docs/adr/` 导航，`notes/` 下的内容 `INDEX.md`，`.harness/tasks` 的 `tech-reading/AGENTS.md`）。gitignore 掉、检出里不存在的 `memory/users` 链接仍保留在索引上，不把缺文件当成可删除。
- 未改：`extensions/skills/project-memory-init` 的 PROTOCOL、LAYOUT 与 `AGENTS.tmpl.md` 仍按旧形状描述「本层链到各类型 README」。模板里的类型行继续给 `indexFiles()` / `seedDescription()` 提供说明；CLI 写入新 AGENTS 时会去掉这些行，只留指针。不合并 `layout.ts` 与 `harness-materials.json`，不改 ADR 0034，不做 `@path` 展开。
- 与 Letta / Devin「索引在 harness 内」、以及 Compose 外部库自带索引文件的形状对齐；Agent 与人只需记「材料索引在 `.harness/README.md`」。
- 术语见 `CONTEXT.md` 的「系统入口」「组成登记」「组织清单」「虚拟超节点」「Project Harness」（均已指向本 ADR）。
