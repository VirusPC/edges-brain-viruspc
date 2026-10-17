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
7. **`--super` 优先挂载 harness 入口 README**：有材料时，优先挂载 harness 入口 README 并从它展开——真系统视角为 `<scope>/.harness/README.md`；在 `--super` 视图下，若该材料存在则为作用域根上的 `README.md`（与挂载表里 `readme` 材料对应）。若该入口 README 不存在，再回退为当前做法：按 `harness-materials.json` 把已有材料文件扁平挂上。**今天** `--super` 并不优先 README，而是一律从 `harness-materials.json` 扁平挂载；本 ADR 改变这一行为。
8. **本 ADR 是决策记录，实现未做**：Domain / Service / CLI（含 `edges init` 保证 README、本层登记改挂、迁移、`--super` 挂载优先序）均标为**未实现**；跟进以本 Decision 为准，不另开任务卡强绑实现节奏。术语见 `CONTEXT.md`（同 PR 已按本 ADR 更新）。

## Considered Options

- **双写两份索引（`AGENTS.md` 本层与 `.harness/README.md` 各列一遍）：** 否决。索引必须恰好在一处；双写会漂移、也违背「一份形状」。
- **把 Compose block 或本层硬约束一并迁进 `.harness/README.md`：** 否决。Compose 与硬约束仍属 `AGENTS.md` 本层语义（见 ADR 0034）；本 ADR 只动材料清单落点。
- **凡有 `AGENTS.md` 就强制建 `.harness/`：** 否决。仅 `isScope` 为真的 edges 作用域适用；无 edges 标记的普通 `AGENTS.md` 不是 edges 系统。
- **继续在 `AGENTS.md` 本层逐条列出每个材料 README：** 否决。与「索引进 harness 文件夹、与外部 KB 索引形状一致」的动机冲突；改为本层只指 `.harness/README.md`。
- **把 `layout.ts` 与 `harness-materials.json` 合并成一份真相源：** 否决 / 超出本 ADR 范围（别处已否决或另议）；本 ADR 不合并二者，只规定材料索引文档落在 `.harness/README.md`，以及 `--super` 优先从该 README 展开。
- **修订 ADR 0034 而不是新开 ADR：** 否决。0034 管的是 Compose 与工作空间构成；本层材料索引落点是另一条决定，用 0035 记录。

## Consequences

- 以下均**未实现**：`edges init` 确保 edges 作用域存在 `.harness/README.md`；本层材料登记只经该 README；既有 `AGENTS.md` 本层材料链接的迁移；`--super` 优先挂载 harness 入口 README（缺失时回退扁平 `harness-materials.json`）；以及为支撑上述行为所需的 Domain / Service / CLI 改动。本文件是决策记录，不是已落地行为说明。
- 落地后：edges 作用域的 `AGENTS.md` 本层系统维护信息不再是材料总表，而是指向 `.harness/README.md` 的单条组成；下层系统入口列表、Compose block、本层硬约束的位置不变。
- 与 Letta / Devin「索引在 harness 内」、以及 Compose 外部库自带索引文件的形状对齐；Agent 与人只需记「材料索引在 `.harness/README.md`」。
- 术语见 `CONTEXT.md` 的「系统入口」「组成登记」「组织清单」「虚拟超节点」「Project Harness」（均已指向本 ADR）。
