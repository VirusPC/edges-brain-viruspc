---
status: accepted
---

# 递归系统二入口与 README / INDEX 组成分工

2026-10-06 grill 把 Edges 的核心定为**递归系统二**：系统入口是 `AGENTS.md`，必须带组成登记；节点身份是从 CLI `--scope`（或显式 **`--super`** 开启的虚拟超节点 `SuperAgentsNode`，继承 `AgentsNode`）经登记可达。组织清单用 `README.md` + `project-entries-*`（标题「本层内容 / 下层内容」）；内容入口用 `INDEX.md`；Skill 仍 `SKILL.md`。四种入口均可因组成登记成为组织节点。下层同合同递归：AGENTS→AGENTS，README→README。同目录并存时，系统一孩子只登记在 README，AGENTS 只挂系统二材料与下级系统入口（标题「本层系统维护信息 / 下层系统维护信息」）。任意目录可由用户 init 系统入口；不得因缺 AGENTS 自动合成虚拟超节点。存量 `index.md` 迁 `INDEX.md`（含 `posts/`，本轮仅改名授权）。设计见 [recursive-system-two-entries-design](../superpowers/specs/2026-10-06-recursive-system-two-entries-design.md)。

本 ADR **修订** [ADR 0024](0024-scope-first-content-ownership.md) 中与下列冲突的表述：以 InternalNode/LeafNode 固定类层次与持久 `isLeaf` 区分组织/叶子；`type: internal`；一律 `index.md` 作叶子入口；把 AGENTS 当作登记一切组成（含系统一孩子）的唯一组织入口；以及「无有效入口的 README 只是导航」在组织清单带 entries 时不再成立。类层次为 `InternalNode` 承接本层/下层 children，`AgentsNode` 与 `ReadmeNode` 继承它，业务节点继承 `BaseNode`；`type` 为 `agents|readme|task|memory|note|skill|text`，无 `internal`。遍历默认走全部 `children`（local∪descendants），本层-only 用显式 `localOnly`；`includeHarness` 仍默认 false。0024 其余（harness 不进 children、目录为生命周期单元、Git/私有记忆边界等）仍有效。

## Considered Options

- **AGENTS 不带 entries，组成全挂 INDEX/README：** 否决；与递归系统二基础假设冲突（Q7）。
- **所有系统一组织都用 AGENTS.md：** 否决；行业上 AGENTS 是系统二；Task 列表等会污染系统维护信息。
- **一律 README 当叶子正文：** 否决；搞乱给人看的说明页与 Task/Note 正文。
- **按文件名固定 Internal/Leaf：** 否决；有无子项看组成登记，模型不持久化 isLeaf（Q3）。
- **先改 codec 再写 spec：** 否决；Q16=A 要求 spec+ADR 人审后再实施。

## Consequences

- 实现须拆开「系统维护信息组成」与「内容组成」两套标记；traverse 默认遵守双文件分工。
- Task Project / 类型目录若只需列孩子、用户未 init，应走向 README+entries，而不是仅因有列表就当作系统入口。类型入口明确为 README+`project-entries-*`（Q18）；ADR 0012「类型目录下 AGENTS.md」在迁移后由本条覆盖。
- 层入口标题从「本层组成 / 下层节点」再改为「系统维护信息」；[layer-markers 设计](../superpowers/specs/2026-10-06-project-harness-layer-markers-design.md) 的标题表以本 ADR 与新 spec 为准。
- `posts/` 的 INDEX 改名是用户对本轮迁移的明确授权，不扩大为可自动改博客正文。
