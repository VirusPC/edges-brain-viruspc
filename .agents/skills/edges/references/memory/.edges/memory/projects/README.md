<!-- edges-memory-type:start -->
name: project
module: memory
writable: true
gitignore: false
format: ordinary
<!-- edges-memory-type:end -->

# PROJECT — 项目上下文

> 记：进行中的工作、关键时间点，以及无法从代码或 git 历史推导出来的决策及其原因，还有项目内的规范。
> 不记：架构、目录结构、文件路径、调试过程——这些直接读代码更准。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。相对日期换成绝对日期。
> 本文件只是索引，条目区块由脚本重算，正文写在 `projects/project_<slug>/index.md` 里。

<!-- edges-entries-local:start -->
## 本层内容

- [AGENTS.md 入口只留三类：硬约束、本层组成、下层节点](<project_agents_three_blocks/INDEX.md>) — 改 AGENTS.md 记忆形状、增减受管区块、或决定区块外留什么时：只保留 constraints / local / descendants；不要独立 auto 区块；硬约束种子是 ask/remember 聚光灯加「写在本区块」；区块外只留身份与指针。
- [项目记忆的技术关键点](project_architecture/INDEX.md) — 这套记忆的承重点、最脆的地方，以及技术选择的判断。
- [project-memory 设计决策记录](project_design_decisions/INDEX.md) — 成型过程中的关键取舍、翻案与待议；论证不进 PROTOCOL/LAYOUT。
- [Project Memory 系列 Skill 开发流程](<project_development/INDEX.md>) — 修改顺序：协议 → 布局 → edges 的 memory 说明 → 其他记忆 skill。doctor 与 reshape 技能已删除，诊断用 edges memory doctor。
- [普通记忆 frontmatter 跟 Agent Skills 闭集](project_frontmatter_metadata/INDEX.md) — 改普通记忆条目的 YAML 头、或读旧扁平文件时：写入只留 name/description/metadata，实现字段进 metadata.edges-\*；闭集以 https://agentskills.io/specification 为准。读取兼容顶层旧键。
- [本层硬约束写在 AGENTS.md 区块里](<project_important_block/INDEX.md>) — 改 AGENTS.md 记忆形状、或决定一条规则该常驻还是进 .edges/memory 时：点名 ask/remember，加上不检索就会做错的仓规，直接写进 edges\-constraints；目录细则不进这里也不进 .edges/memory。
- [skills 按「谁有权改写」分成两类](project_skill_ownership_split/INDEX.md) — skills（managed）与 referenced 按谁有权改写分开，现行入口都在 .edges/skills/。2026-09-07 否掉把 .memory 改名为 .agents；当时两份入口都在 .memory/。
- [AGENTS.md 要点名 ask 和 remember](project_spotlight_ask_remember/INDEX.md) — 决定 AGENTS.md 要不要点名 skill、或觉得 skill 自己的说明就够时：要点名 ask 和 remember，因为 skill 一多，模型不一定会自己加载它们；不要点名 init/doctor/reshape，也不要在入口里写整套工具怎么用。
- [项目记忆的类型集合](project_type_set/INDEX.md) — 官方 init 种子仍是六类；类型集合由 LAYOUT+本层登记决定，不是 PROTOCOL 闭集。可扩展见仓库根 ADR 0006。类型入口现为复数目录下 AGENTS.md（ADR 0012）。否掉把 docs 等示例写进默认种子。user 进仓且 gitignore；v1 不做晋升。
<!-- edges-entries-local:end -->
