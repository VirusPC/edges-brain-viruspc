---
name: project_type_set
description: >-
  官方 init 种子仍是六类；类型集合由 LAYOUT+本层登记决定，不是 PROTOCOL 闭集。可扩展见仓库根 ADR 0006。类型入口现为复数目录下
  AGENTS.md（ADR 0012）。否掉把 docs 等示例写进默认种子。user 进仓且 gitignore；v1 不做晋升。
metadata:
  edges-title: 项目记忆的类型集合
  edges-type: project
  edges-origin-session-id: bc-76b9e05c-a544-4dad-adb8-bcc3ea821615
  edges-agent-client: codex
  edges-username: cheng
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-10-21T01:21:41+00:00'
---

**现行布局（2026-10-05）：**每个节点的类型入口属于本节点；Memory 条目在本节点 `.edges/memory/<plural>/`，托管 Skill 是 `.edges/skills/managed/<skill>/SKILL.md` 的完整目录，引用 Skill 的入口在 `.edges/skills/referenced/AGENTS.md`，其正文仍由原来源维护。以下 `.memory/` 与 `skills` / `agent_skills` 叫法是当时类型设计史料，不是当前实例文件路径；官方六类种子及可扩展原则保留。

可写类型是 `user` / `feedback` / `project` / `reference` / `skills`；`agent_skills` 只索引不写。这六类是官方 init 种子，不是 PROTOCOL 闭集：类型集合由 LAYOUT 实现与本层登记决定。不要把 `docs` 等示例写进默认种子。用户记忆是项目记忆的一种 Memory Type，权威副本在仓库工作树内且 gitignore，按仓库路径绑定，布局与其他类型相同（`.edges/memory/users/README.md`、`user_<slug>/INDEX.md`）。类型入口路径见仓库根 ADR 0012。本层入口清单顺序是 `user` → `feedback` → `project` → `reference`（`project` 兜底），然后才是 `skills` / `agent_skills`。skill 接线（init / remember `--type user`、备份/恢复）已做。`.memory/` 下类型目录用复数。可扩展登记见仓库根 ADR 0006；`$edges-memory-add-type` 已落地。

**Why:**

`type` 是**检索意图乘以寿命**，不是载体。`docs` 没有独立检索问题，也没有「不记什么」的闸门，会变成文档桶，因此不能进官方种子；2026-09-13 grill（ADR 0006）允许用户在指定目录用 skill 后加同构 type，但种子不因示例膨胀。闸门不能用已经写下的文件去放宽：`project` 引言已收「代码里推不出的决策」，`architecture.md` 撞的是命名不是定义；`reference` 里的 prior-art 全文是成型史料，正确反应是以后别再倒正文，不是改「不记链接内容」。

**这一条推翻了本条自己的旧结论「`skills` 只索引、remember 不写」。** 当时的理由是「`.memory/skills/` 空槽对不上 `packages/skills/` 这个真源」——现在两个槽各有归属，理由不成立了：`skills` 收自动沉淀的流程，`agent_skills` 索引 `.agents/skills/` 里人写或装入的。分界是**谁有权改写**，不是「是不是可执行指令」。详见 [[project_skill_ownership_split]]。

**「不要把 `user` 放进仓库树」已被仓库根 `docs/adr/0003-user-memory-in-repo-gitignored.md`（ADR-0003）推翻。** 现行结论是仓内权威副本 + gitignore + 按仓绑定 + 与其他类型相同的复数目录布局。内容闸门从简（个人偏好、凭据与不得公开的材料）；gitignore 是凭据可以放这里的前提。v1 不做脱敏晋升到可提交类型。家目录当真源已被用户否决。其余（官方种子不含 docs、现有各类型闸门含 `user`、skills 可写 / agent_skills 只索引）仍成立。`private` 条目元数据是另案，不在这次接线里做。

**「类型集合等于这六类、不能再加」已被仓库根 `docs/adr/0006-extensible-edges-memory-types.md`（ADR-0006）收窄。** 六类仍是官方 init 种子与既有特例的家；用户后加的 type 与种子同构，由 LAYOUT + 本层登记发现，不另开 JSON/YAML 注册表。用户所述（grill 2026-09-13）。`$edges-memory-add-type` 已实现，不再是待办。

本层清单顺序是用户纠正：先更具体的 `user` / `feedback`，`project` 当兜底，再 `reference`。详见 [[feedback_agents_local_type_order]]。

**How to apply:**

- 问「该不该加官方种子」时三件齐才加：**独立检索问题、与现有类不同的失效方式、有「不记什么」的闸门**。既有类型的失效方式：user = 换机或删仓后本机个人材料丢了、或误把密钥写进可提交类型；feedback = 又踩同一个坑；project = 推翻已定决策；reference = 找不到源头；skills = 流程执行不出来；agent_skills = 装的东西发现不了。
- 用户要在某一层自建 type：走 `$edges-memory-add-type`，按 LAYOUT 落入口与目录；不要先做 JSON/YAML 总配置，也不要把示例写进 init 种子。
- 文档按为什么再读它归类，并按清单顺序先排除更具体的：本仓不宜公开 → `user`；纠正与禁区 → `feedback`；外部指针 → `reference`；对不上再 → `project`（兜底）；**自动沉淀的可执行流程 → `skills`**；人写或装入的技能 → 放 `.agents/skills/`，由 `agent_skills` 索引；常驻指令 → `AGENTS.md` 正文。
- 不要改 `project` / `reference` 引言去迁就已有文件。
- 用户记忆的现行结论见 ADR-0003：仓内 `.memory/users/` + `user_<slug>.md`，gitignore，不把家目录或私有仓当真源。类型入口现为 `.edges/memory/users/README.md`。Agent 读本机这份入口。换机用总入口 `$edges` 的用户记忆备份与恢复。不要在 v1 设计晋升到可提交类型，也不要加 `private` 字段。
- `.memory/` 类型目录用复数（`users/` `feedbacks/` `projects/` `references/` `packages/skills/`）；`--type`、条目前缀保持单数。类型入口一律是该复数目录下的 `AGENTS.md`（ADR 0012）。`agent_skills` 的索引在 `.memory/agent_skills/AGENTS.md`，内容根仍在 `.agents/skills/`，永不写入 `.agents/`。
- 可扩展决策与本轮不做的事见 ADR 0006；`tasks` Memory Type 若出现在示例里，不要和 `knowledge/tasks` 看板合并。
