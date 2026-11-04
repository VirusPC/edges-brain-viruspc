---
name: edges-memory-remember
description: 把可复用结论写入所选作用域或主题 Project 的已采用记忆类型并刷新索引。用户要求记住时必须用；被纠正、用户给出可用想法/约定/约束、或任务产出已验证、以后还用得上的结论时也要主动用。
version: 0.2.0
---

# Project Memory Remember

把结论写进仓库内的项目记忆。公开类型可进入 Git；`user` 的索引、正文和资产整类 gitignore。主题归属不改变公开与私有边界。

执行能力由 Edges CLI 的 `edges memory remember` 提供；布局见 [`LAYOUT.md`](../edges/references/memory/references/LAYOUT.md)。

## 什么时候写

- 用户明确说要记住或沉淀，必须写。
- 用户纠正了你，必须写。
- 结论已经验证过，而且以后再做这个项目还用得上，主动写。
- 对话里用户给出的有用信息也要主动写，不限于纠正。包括可用的想法、产品或技术取舍、命名或目录约定、约束与禁区、对既有做法的澄清，以及以后接手的人仍该知道的背景。即使还没被代码验证，只要用户把它说成项目事实或意图，就写；条目正文里简短标明是用户所述还是已验证。
- 以下内容不要写进可提交类型（`feedback` / `project` / `reference` / `managed`）：临时进度、纯会话流水账、与项目无关的个人偏好、通用常识、一次性输出、既未经用户确认也未经任务验证的猜测、密钥。
- **个人偏好与密钥只写 `--type user`。** 绑定本仓库、不宜公开的个人材料（个人偏好而非项目共享约定、凭据与密钥、以及其他不得公开的上下文）走 `user`。CLI 按实际材料位置保证整类 gitignore，选择 Project 后也一样。其他类型仍然禁止密钥。v1 不把 user 条目脱敏晋升到可提交类型。
- 读代码或 git 历史就能得到的事实也不写——架构、目录结构、文件路径、某次调试的修法，写进来只会过期。`AGENTS.md` 已经写过的同样不重复。
- **不检索就会做错事的规则不要走 remember。** 写进该层 `AGENTS.md` 的本层硬约束区块，直接列在区块里，不要另建记忆文件。那一块允许手改正文；其它受管区块（本层索引、下层索引）仍不要手改。

判断标准是「半年后另一个人接手这个项目，这条还成立吗 / 还该知道吗」。不成立、也不该知道就别写；用户所述的想法和约束默认「还该知道」。写错的条目以后会被检索出来当成已确认的结论用，而没人会回头审计它。

## 怎么写

先按结论适用范围选择 scope，再按主题归属选择可选 Project。CLI 使用 `edges --scope <S> --project <P/projects/Q> memory remember ...`，Project 路径相对 `S/.edges/projects`；省略 Project 时写 `S/.edges`，指定后写 `P/memory` 或 `P/skills`。先在选定材料根内去重并确认类型已采用，同名类型不从根层、父 Project 或兄弟 Project 借用。Project 不需要自己的 AGENTS 或 .edges，但原 scope 仍须是有效系统入口。`--super` 不改变本命令的写入位置；`--all` 只用于读取，写入时会被拒绝。

1. 沿所选材料清单或 Project INDEX 找已采用类型，按入口说明与权限挑可写的 `type`，不要把官方类型当成闭集；类型名、模块和权限以实际类型入口为准。再定一个 `slug`（小写 snake_case，**不带类型前缀**，CLI 自动加；Skill 格式用 kebab-case）。`referenced` 只索引、不能 remember。`type` 决定检索入口——分错类型会让相关的人找不到这条。
2. 去重：先看该类型的记忆入口，已有同主题条目就复用它的 `slug` 走更新，不要另起一条近义的。入口通常已经在上下文里；不在就 `rg` 一下。
3. 拟 `--title` 和 `--description`。`description` 是索引里那句说明，**是别人判断「要不要打开这条」的唯一依据**，写清楚适用场景。
4. 正文按「一句结论 → `**Why:**` → `**How to apply:**`」组织。`Why` 是为了以后能自己判断边界情况。
5. 带上选定的 `--scope` 和可选 `--project` 跑 `memory remember`，**参数见 `--help`**。审计与来源字段默认由 CLI 检测，不编造身份或会话信息。

### `managed`：沉淀流程而不是结论

判据是**这条东西下次要不要被执行**。可执行的重复步骤（同一串操作已经做过第二遍）→ `managed`；「以后别这么干」这类判断 → `feedback`；「为什么当初这么定」→ `project`。同一件事常常两边都要写一条，别硬塞进一条里。

写 `managed` 时三点不同：

- `--slug` 是**技能目录名**，用 kebab-case（`rerun-failed-e2e`），不是 snake_case。产物在所选材料根的 `skills/managed/<slug>/SKILL.md`。
- `--title` 可省——Agent Skills 没有这个概念，给了会存进 `metadata`。普通记忆的 `title` / `type` / 出处 / 审计同样写进 `metadata.edges-*`，不要手写扁平顶层键。
- 正文写步骤、输入输出、边界情况，不套「结论 → Why → How to apply」那套；`description` 要同时说清**做什么**和**什么时候用**，因为它是各家 agent 启动时唯一加载的那一层。

### `user`：本仓不宜公开的个人材料

判据是**作用域加能否公开**，不是「像不像偏好」。项目共享约定仍走 `project` / `feedback`；只有「只对这个人、这个克隆成立，且不宜进公开仓」的才进 `user`。

- 产物在所选材料根的 `memory/users/user_<slug>/INDEX.md`，类型索引是同一 users 目录的 `README.md`。整类都被 gitignore，**不要 `git add`**。
- `--slug` 与其他普通记忆一样，小写 snake_case，不带 `user_` 前缀。
- 正文仍按「一句结论 → `**Why:**` → `**How to apply:**`」。
- Agent 读的是本机这份 `users/README.md`。换机或删仓前用 `$edges` 做用户记忆备份；回注同样用 `$edges`，沿用所选 scope / Project。每次归档只处理一份 users 子树，不汇总子 Project。说明在 [备份](../edges/references/memory-user-backup.md) 与 [恢复](../edges/references/memory-user-restore.md)。
- v1 不做脱敏晋升：不要把 user 条目改写进 `project` / `feedback` 来「变成可提交」。

`referenced` 不由 remember 写入，作为 `--type` 写入会被拒绝。其来源始终是原 scope 的 `.agents/skills/`，即使索引位于 Project 也不变；内容由人或安装器维护，索引不赋予改写来源的权限。安装与刷新按 `$edges` 的 [init 说明](../edges/references/memory-init.md)，不代为初始化新层。

返回的 `path`、`index` 和 `action`（`created` / `updated`）就是写入凭据，路径相对原 scope，包含实际 Project 归属。`agentsAction: not-applicable` 是 Project 写入的正常结果；`needs-doctor` 表示 scope 的 AGENTS 尚未纳管，要说明这个入口缺口，不把它误报为正文没写入。

原 scope 没有有效 AGENTS，或选定材料根未采用目标可写类型时，CLI 会拒绝写入。说明缺口；已有会话授权覆盖初始化时可继续，否则取得明确同意后再按 [memory-init.md](../edges/references/memory-init.md) 执行。不能为避开缺口改写到根层，也不能给 Project 伪造 AGENTS。

## 什么时候改派 subagent

默认自己内联写完。只有一次要沉淀多条、尤其跨几个目录时，才派后台 subagent（`run_in_background: true`）。

委派时提示词必须自带全部素材，因为 subagent 读不到本次对话——目标目录绝对路径、`type`、`slug`、结论、起因、怎么应用，缺一样它只能瞎编。派完立刻继续原来的活，它结束时的完成通知里带 `path` 和 `action`。

## 写哪一层

记忆按目录分层，主题再由 Project 聚合，结构见 [`PROTOCOL.md`](../edges/references/memory/references/PROTOCOL.md)。写到**与结论作用范围最贴近的 scope，再选择实际所属主题**；只对某目录成立的不提升到根，整个项目通用的也不因本次在某主题内工作就限制到该 Project。目标尚未采用可写类型时先说明缺口，不用根层兜底改变归属。

**先看这次任务实际碰过哪些文件**，它们所在的目录就是候选：都落在同一个模块下，那个模块目录是第一候选；散在几个互不相干的目录，基本就是记忆根。但**作用范围不等于改动范围**——改的是某个模块，结论却可能是关于构建工具、发布流程或团队规范的，那仍然属于整仓。判据始终是「这条结论对哪些代码成立」，改动集只用来提候选。

记忆入口由 CLI 从条目文件的 frontmatter 全量重算，**不要手改，也不要绕开 CLI 往受管类型目录写文件**，包括 Project 的直属类型目录。`.agents/skills/` 的来源正文归人与生态，CLI 只索引。命令不可用时明确报告缺口，别改用手写或临时脚本。

新版只写 `.edges`。旧 `.memory` 布局当前版本不会迁移：先用 `@viruspc/edges@0.2.7` 完成那次转换，再按 `docs/migrations/2026-10-27-rename-harness-to-edges.md` 改目录名。不要自行改名或让 doctor 迁移。可写自定义 Skill 格式类型保留原模块，不能因格式相同就当作 managed。

所有新条目使用目录入口，不再提供 `--format` / `--resources`。已有完整目录用 `--import-entry /absolute/path/INDEX.md`（Skill 用 SKILL.md），与正文参数互斥；校验失败返回路径与字段，修正来源再重跑，不自动纠错。导入不修改来源，入口及附件一并复制。
