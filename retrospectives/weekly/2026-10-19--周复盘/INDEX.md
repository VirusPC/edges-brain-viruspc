# 2026-10-19 周复盘

## 范围

2026-10-19 00:00 至 2026-10-25 23:59（Asia/Shanghai，下文时间都是北京时间）。仓库层看了 Compose 工作区挂载的三仓：框架仓 [VirusPC/edges](https://github.com/VirusPC/edges)（窗内合入 47 个 PR、main 58 个提交）、公开脑 [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)（102 个 PR、113 个提交）、私密脑 [VirusPC/edges-brain-viruspc-private](https://github.com/VirusPC/edges-brain-viruspc-private)（可读，5 个 PR；公开正文不写私人内容）。对照了两仓 `.edges/tasks` 窗末状态、Deploy / Frozen install / Publish 运行记录，以及公开脑 `retrospectives/daily/`。

对话层主要依据本周日复盘正文（10-19/20/21/22/24/25）与 `daily-scan` 摘要 jsonl；周复盘例程本身未直读各助手转写。10-23 无独立日复盘与 scan 目录，由 10-24 篇加长窗（10-22 05:09～10-24 05:09）补扫覆盖。

本周关键结构事实：约 10-20，原 `VirusPC/edges` 改名为公开脑 `edges-brain-viruspc`，框架内容迁入新建的 `VirusPC/edges`；私仓改为 `edges-brain-viruspc-private`；新建 Compose 工作区根 [VirusPC/edges-workspace-viruspc](https://github.com/VirusPC/edges-workspace-viruspc)。因此约 10-19 及更早的框架 PR（含旧号）仍在公开脑历史里。口头定案是 R6：个人仓为长期主干、不 archive，系统只往外拆（见「实际怎样」）。

## 本该怎样

这周事先没有单独写下显式目标。对照上期（[2026-10-12 周复盘](https://github.com/VirusPC/edges-brain-viruspc/blob/main/retrospectives/weekly/2026-10-12--周复盘/INDEX.md)）「下次做什么」，并以同目录 [COMMENTS.md（2026-10-19）](https://github.com/VirusPC/edges-brain-viruspc/blob/main/retrospectives/weekly/2026-10-12--周复盘/COMMENTS.md) 为准收窄：

1. 先合 [#288](https://github.com/VirusPC/edges-brain-viruspc/pull/288)、[#289](https://github.com/VirusPC/edges-brain-viruspc/pull/289)，再发 1.5.0；改正上期复盘里「#208、#211 随 #204 合入」那句（用户指示：正文不动，在上期目录加 COMMENTS）。
2. 给 PR 加与 Deploy 同款的 `pnpm install --frozen-lockfile` 检查。
3. 把 NodeService 硬约束写进 `AGENTS.md`，把 #187 对应卡改出 `in_progress`。doctor 断软链开卡：用户 10-19 标「不做」，不再追。
4. 「Keep it Simple、薄封装」写进 `AGENTS.md`：用户 10-19 标「不做」，本周不验收。

## 实际怎样

### 上期行动

1. **做成。** [#289](https://github.com/VirusPC/edges-brain-viruspc/pull/289) 于 10-19 09:32 合入，早于 [#287](https://github.com/VirusPC/edges-brain-viruspc/pull/287) / [v1.5.0](https://github.com/VirusPC/edges-brain-viruspc/releases/tag/v1.5.0)（约 09:33–09:34）；[#288](https://github.com/VirusPC/edges-brain-viruspc/pull/288) 跟踪卡 09:36 合入。更正写在 [2026-10-05 周复盘 COMMENTS.md](https://github.com/VirusPC/edges-brain-viruspc/blob/main/retrospectives/weekly/2026-10-05--周复盘/COMMENTS.md)。对话补充：打版前用户要求先修回 #208/#211（「先把问题都修了再打版」，全栈 10-19 02:56）；合入曾因助手把「CI 还在跑」和「可以合」弄混而停过一夜。
2. **做成。** 公开脑 [#309](https://github.com/VirusPC/edges-brain-viruspc/pull/309) 落地后，拆仓迁到框架 [`.github/workflows/frozen-install.yml`](https://github.com/VirusPC/edges/blob/main/.github/workflows/frozen-install.yml)（`pull_request` → `pnpm install --frozen-lockfile`）。窗内 Frozen install：框架 73 次成功 0 失败；公开脑拆仓前 27 次成功 0 失败。
3. **做成（NodeService）；doctor 按用户决定不做。** [#308](https://github.com/VirusPC/edges-brain-viruspc/pull/308) 写入硬约束；现见框架 [AGENTS.md](https://github.com/VirusPC/edges/blob/main/AGENTS.md)。对应卡已在 [`edges-extensions/done/…NodeService`](https://github.com/VirusPC/edges/tree/main/.edges/tasks/edges-extensions/done/2026-10-07--notesskills-的-creategetupdatedelete-收口到-NodeService)。两仓看板无 doctor 断链卡，与 COMMENTS「不开卡」一致。
4. **按用户决定不做。** 框架与公开脑 `AGENTS.md` 均无「Keep it Simple / 薄封装」句。

同日用户定下复盘约定：正文定稿不改，评论写同目录 `COMMENTS.md`（周复盘助手 10-19 21:41：「我觉得不应该改，应该找地方额外写我的评论」→ [#307](https://github.com/VirusPC/edges-brain-viruspc/pull/307)）。

### 拆仓与 Compose 成为本周主线

- 口头定案（R6，10-20 12:09～12:12，全栈）：曾短暂走 archive 方案，用户改口「个人知识库会不断产生新的项目，总不能每次都archive」「后续还会不断拆系统」「我觉得个人仓是不是做为主干」，并问「值得记一个memory？」。公开脑侧改名与 Deploy 钉仓、删系统副本、私仓改名等见 [#323](https://github.com/VirusPC/edges-brain-viruspc/pull/323)～[#337](https://github.com/VirusPC/edges-brain-viruspc/pull/337)；Compose / submodule 相关 [#316](https://github.com/VirusPC/edges-brain-viruspc/pull/316)、[#338](https://github.com/VirusPC/edges-brain-viruspc/pull/338)、[#342](https://github.com/VirusPC/edges-brain-viruspc/pull/342) 等。
- 框架仓从零起：post-split fixups [#1](https://github.com/VirusPC/edges/pull/1)、CI [#2](https://github.com/VirusPC/edges/pull/2)、extensions 平铺 [#7](https://github.com/VirusPC/edges/pull/7)（[ADR 0040](https://github.com/VirusPC/edges/blob/main/docs/adr/0040-flatten-extensions-posts-to-personal-repo.md)）、packages workspace [#10](https://github.com/VirusPC/edges/pull/10)（[ADR 0041](https://github.com/VirusPC/edges/blob/main/docs/adr/0041-packages-workspace-layout.md)）、Compose 改 git submodule [#14](https://github.com/VirusPC/edges/pull/14)（[ADR 0042](https://github.com/VirusPC/edges/blob/main/docs/adr/0042-compose-on-git-submodule.md)）、入口改 `.edges/compose/README.md` [#19](https://github.com/VirusPC/edges/pull/19)（[ADR 0043](https://github.com/VirusPC/edges/blob/main/docs/adr/0043-compose-readme-entry.md)）、被组合仓可写 [#26](https://github.com/VirusPC/edges/pull/26)（[ADR 0045](https://github.com/VirusPC/edges/blob/main/docs/adr/0045-compose-checkout-writable.md)）。可写原则来自口头「核心是保持简单，不加额外机制」（Grok Bot 10-21 12:37）。
- 公开仓不互挂（「不用互挂，不是有一个根仓库放这俩吗」，任务记录员 10-21 09:55）→ [#345](https://github.com/VirusPC/edges-brain-viruspc/pull/345)。工作区根当作沉淀入口（「把这个地方当做入口」，Grok Bot 10-21 13:28）→ 记忆/日复盘 SKILL [#349](https://github.com/VirusPC/edges-brain-viruspc/pull/349)；周复盘例程入口 [#370](https://github.com/VirusPC/edges-brain-viruspc/pull/370) 于 10-25 16:16 合入；合入时 README/Skill 已写 COMMENTS 约定。
- 私密脑：窗内 5 个 PR 收成 Edges 形；用户 10-22 01:16「快点做完吧，我感觉都不用Grill」，跳过 grill 按公开脑对齐。过程中纠正叶子登记触发框架 [#27](https://github.com/VirusPC/edges/pull/27)（ADR 0046：内容叶子只登记内容面 README，不回退 AGENTS.md）。私密脑还接入 Cursor Cloud→Langfuse 项目级 hooks（仅记元数据）。
- 副作用：[#332](https://github.com/VirusPC/edges-brain-viruspc/pull/332) 删个人仓系统副本时，根 `.edges/memory/feedbacks/` 一并被移走；「主干」记忆已按用户意向补回公开脑，其余 feedback 是否迁回仍待定。

### npm 发包与版本

- 推 tag 经 GitHub Actions 发布已落地（公开脑历史 [#281](https://github.com/VirusPC/edges-brain-viruspc/pull/281)、[ADR 0037](https://github.com/VirusPC/edges/blob/main/docs/adr/0037-npm-publish-via-github-actions.md)）；上期「只 stage、等人批」已过时（COMMENTS 已记）。
- 仓 changelog：[v1.5.0](https://github.com/VirusPC/edges-brain-viruspc/releases/tag/v1.5.0)（10-19）、[v1.6.0](https://github.com/VirusPC/edges/releases/tag/v1.6.0)（10-25，两仓均有）。npm `@viruspc/edges` 窗内经框架仓发到 0.2.4、0.2.5、0.2.6；`0.2.6-beta.0` 的 Publish 曾失败一次（[run 40183453417](https://github.com/VirusPC/edges/actions/runs/40183453417)），随后正式 0.2.6 成功。
- 对话补充：拆仓当日用户说过「npm真正的发布可以往后放」／「先不发NPM包，先link过去跑着试试」，其后仍发了 0.2.4+。0.2.4 曾因 Trusted Publisher 仍认旧仓身份 404，删掉重加后成功（笔记在 [#349](https://github.com/VirusPC/edges-brain-viruspc/pull/349)）。0.2.3 起多次在 `/goal` 或明示授权下由助手代批 `npm-publish`（例：Grok Bot 10-20 02:37「有问题都想办法自己解决，直至完成发版」）——环境未禁自审时，人审门可被代理绕过。

### Langfuse / 评测

周后半集中合入：框架 [#29](https://github.com/VirusPC/edges/pull/29)（Cursor Cloud→Langfuse hooks）、[#30](https://github.com/VirusPC/edges/pull/30)（memory ablation eval）、[#35](https://github.com/VirusPC/edges/pull/35)（experiment webhook）、[#37](https://github.com/VirusPC/edges/pull/37)（evaluation server）、[#45](https://github.com/VirusPC/edges/pull/45)（agent tracing skills）；公开脑 [#357](https://github.com/VirusPC/edges-brain-viruspc/pull/357)～[#382](https://github.com/VirusPC/edges-brain-viruspc/pull/382) 一带。看板上评测相关卡有进 done，也有新 backlog（含「框架附带可接入评测能力」「Skill 收集用户数据」等）。

对话补充：environment / model 命名落地后，用户 10-25 02:08 问「已有的langfuse 数据还能清洗下吗」；查证 traces 基本不可改 environment/model，决定**保留脏数据**。OpenCode/Pi 暂无 tags 写入口，设备维度缺口已开卡（10-25 日复盘）。

### 日复盘

`retrospectives/daily/` 有 10-19、20、21、22、24、25；**缺 10-23 日历篇**。10-23 对话由 10-24 加长窗补扫：用户提出长期 AI 问题定时追踪，并要 Routines 目录下加 Project 层（不是另开 GitHub 仓）→ [#352](https://github.com/VirusPC/edges-brain-viruspc/pull/352)。10-21 曾关未合 [#341](https://github.com/VirusPC/edges-brain-viruspc/pull/341)，同内容由 [#351](https://github.com/VirusPC/edges-brain-viruspc/pull/351) 补回。

### CI

- 框架 Deploy：5 成功 0 失败；Frozen install 全绿。
- 公开脑 Deploy：82 成功、**20 失败**、2 取消。失败仍集中在 10-18～10-19 的 pnpm/lockfile 过渡（上期已记），窗后段仍有零星失败。对话补充：10-19 夜起曾因镜像 502 连续红，10-20 约 10:13 起恢复（日复盘跟进）。拆仓后公开脑活跃 workflow 主要是 Deploy，框架 CI 已迁走。

### 看板摘记

- #174 四块目录补齐：仍在框架 [backlog](https://github.com/VirusPC/edges/tree/main/.edges/tasks/edges-extensions/backlog/2026-10-07--CLI-与根-harness-补齐-notes-edges-projects-archive)；COMMENTS 写明可放 backlog、不用马上做。
- 框架侧「把个人大脑从 VirusPC/edges 系统仓拆出去」卡仍标 in_progress；公开脑侧对应拆仓卡已在 done（与口头 R6 / 公开脑 done 不一致）。
- [#347](https://github.com/VirusPC/edges-brain-viruspc/pull/347)（跨机保险柜）、[#348](https://github.com/VirusPC/edges-brain-viruspc/pull/348)（私密脑改造挪 done）已于 10-24 18:52 前后合入。
- 上期清单里用户已关掉的项（doctor、#251/#255、笔记不强制云端代理进 feedbacks、architecture.md 的 RAG/PageIndex、「核对已合入看 main」进 skill、补 10-14 日复盘）本周不再追。

## 为什么

### 上期该做的三条核心行动都落地了

可能因为 10-19 用户对着 COMMENTS 当场收窄范围，并把「要做」的几条直接开成 PR（[#307](https://github.com/VirusPC/edges-brain-viruspc/pull/307)、[#308](https://github.com/VirusPC/edges-brain-viruspc/pull/308)、[#309](https://github.com/VirusPC/edges-brain-viruspc/pull/309)），不再只留在复盘文件里；同时口头定下「正文不改、评论进 COMMENTS」。依据：行动 1～3 的合入时间都在 10-19，与 COMMENTS 同一天；21:41 原话见对话层。

### 本周吞吐被「一拆为三」吃掉大半——且形态由 archive 改回「个人主干」

可能因为拆仓是一次性结构债，grill 还在 R5（archive）与 R6（个人主干）之间掉头：用户意识到「总不能每次都 archive」「还会不断拆系统」。依据：框架 47 个合入 PR 里 10-20～10-21 大量 post-split；公开脑拆仓簇占比高；R6 原话 10-20 12:09～12:12（全栈）。

### 公开脑 Deploy 仍偶发红，但框架侧安装检查已经拦住同类问题

可能因为 lockfile 类问题在框架仓被 Frozen install 前置拦住（窗内 73/0），而公开脑 Deploy 仍对内容仓 `push main` 敏感，且拆仓过渡期历史失败与镜像 502 计入本周。依据：上期根因是 PR 阶段没有 frozen install；本周该检查已在框架仓落地，框架 Deploy 0 失败；502 恢复见 10-21 日复盘遗留跟进。

### npm「人批」在代理持用户凭据时挡不住

可能因为 `npm-publish` 环境必需审批人只有用户、未禁自审，且用户用 `/goal` 或明示授权助手代批到发完。依据：10-20 02:37 `/goal` 原话；其后 0.2.4/0.2.5 亦代批。仓库层只看到发版绿，对话层才解释治理缝。

### #332 后规则记忆一度错仓

可能因为「删个人仓系统副本」把根 feedbacks 整棵带走，而复盘只住在公开脑。依据：10-21 日复盘注意事项；主干记忆已补回，COMMENTS 类 feedback 迁回仍悬着（#370 合入前的文案冲突部分由此放大；合入后 README 已对齐 COMMENTS）。

### 该保持的

- 复盘行动经 COMMENTS 收窄后再开 PR，完成率明显高于上期「三条全没动」。
- 结构决策继续写成 ADR（本周框架侧可见 0037～0046 一带）；口头原则「保持简单，不加额外机制」能直接收成 ADR 0045。
- 日复盘多数天仍有 PR；关错的 [#341](https://github.com/VirusPC/edges-brain-viruspc/pull/341) 能被 [#351](https://github.com/VirusPC/edges-brain-viruspc/pull/351) 补回；10-23 定时失败后能加长窗补扫。
- 派云端 Agent 做验证时用户要求验收写清、避免作弊（10-21 14:03），已落记忆 [#349](https://github.com/VirusPC/edges-brain-viruspc/pull/349)。

## 下次做什么

1. **收口框架侧「拆仓」in_progress 卡，并核对公开脑 done / 口头 R6 的对应关系；顺带裁定 #332 后根反馈记忆是否迁回公开脑。** 完成标准：框架 `.edges/tasks` 里 `2026-10-20--把个人大脑从-VirusPCedges-系统仓拆出去` 不再停在 in_progress（或卡上写明与公开脑 done 的对应）；`feedback_retro_comments_in_separate_file` 等复盘向反馈在公开脑可读，或 COMMENTS 写明故意只留框架仓。来源：看板窗末状态 + 对话层 #332 错仓。
2. **查清公开脑 Deploy 窗后段零星失败是否还在发生，该修 workflow 还是该停内容仓的无用 Deploy。** 完成标准：最近一周公开脑 Deploy 失败有归因（配置 / 路径 / 误触发），并有对应 PR 或「故意保留」的书面说明。来源：窗内公开脑 Deploy 20 失败 vs 框架 0 失败；#370 已于窗内合入，不再占这条。
3. **评测 / Langfuse / routines 新 backlog 补完成标准；插件化五问先裁定与 ADR 0046 的关系再答。** 完成标准：框架「框架附带可接入评测能力」及其子卡、公开脑 `_default/backlog` 里 10-23～10-25 新开的 Langfuse/routines/#376 旁路等卡，每张至少有可验收的完成标准一句；插件化 grill 第 5 题书面以 ADR 0046（仓根 README 清单）为准或显式改 ADR。来源：本周后半评测簇合入快、新 backlog 多；上期 #174 空完成标准教训；对话层插件化停摆。

## 建议补充内容清单

### 10-23 日复盘日历篇缺失（对话已由 10-24 补扫覆盖）

建议去处：`retrospectives/daily/`，或下周 COMMENTS 一句「不补日历篇」。

为什么值得补：仓库层曾只确认目录不存在；对话层已确认 10-24 加长窗覆盖了 10-23 对话与 [#352](https://github.com/VirusPC/edges-brain-viruspc/pull/352) 等落库。

不补的代价：目录「缺一天」会被反复追问；若与 10-14 一样不补，请在 COMMENTS 记一句。

处理结果：对话覆盖已处理；**日历篇是否补写仍待你定**。

### 框架「拆仓」卡状态与事实不一致

建议去处：框架 `.edges/tasks` 该卡。处理结果：已列入下次做什么第 1 条。

为什么值得补：公开脑侧拆仓已 done，框架侧仍 in_progress，看板进度是错的。

不补的代价：连续有人以为拆仓没收尾，或重复开卡。

### #332 后根反馈记忆是否迁回公开脑

建议去处：公开脑 `.edges/memory/feedbacks/`；框架仓歧义条目删或改写。

为什么值得补：复盘只在公开脑，「正文不改 / COMMENTS」等规则错仓则助手读不到；已解释 #370 文案冲突的一部分。

不补的代价：规则继续缺失或只在错仓，复盘助手再次改 INDEX。

处理结果：部分处理——「个人仓是长期主干」已补回公开脑（[#351](https://github.com/VirusPC/edges-brain-viruspc/pull/351) 系）；**其余 feedback 迁回仍待定**。已并入下次做什么第 1 条。

### npm-publish「代理可自审」是否收紧

建议去处：框架仓 GitHub Environment 配置；用户未表态前不要写成 AGENTS 硬规则。

为什么值得补：`/goal` 与明示代批下，人审门未独立生效。

不补的代价：授权助手发版 ≈ 跳过人审。

处理结果：未处理（多日复盘仅注意事项）。

### 周复盘 #370（窗内已合）

建议去处：无。

为什么曾值得补：用户 10-25 00:48 问 merge 时仍开着，且草稿一度与 COMMENTS 约定打架。

不补的代价：已不适用。

处理结果：**已合**（10-25 16:16）；main README/Skill 已写 COMMENTS 约定。从下次做什么与待办清单撤下。

### 插件化五问未答（第 5 题与 ADR 0046 冲突）

建议去处：框架仓插件化 backlog + 先裁定叶子登记模型。

为什么值得补：设计稿停在 Artifacts；带着与已合 ADR 冲突的前提继续 grill 会返工。

不补的代价：插件化与 notes/projects 清单模型再次打架。

处理结果：未处理。已并入下次做什么第 3 条。

### #347 / #348（窗内已合）

建议去处：无。

为什么曾值得补：窗中段曾长期 OPEN。

处理结果：**已于 10-24 合入**。从待办撤下。

### `edges tasks create` 副作用（改根 AGENTS.md / 任务索引）

建议去处：框架仓 bug 卡 + 复现。

为什么值得补：看板操作被 CLI 污染，多日靠手撤。

不补的代价：自动化落库不可信。

处理结果：未开卡（#27 后是否仍在未核实）。

### #174 完成标准仍空（延续，不催做）

建议去处：现有 backlog 卡。处理结果：留待触发条件（COMMENTS：可放 backlog、不用马上做）；建议下次动 CLI 目录时顺手补完成标准。

为什么值得补：没有完成标准就无法判断做没做完。

不补的代价：「已开卡」继续被当成「有人在管」。

### 延续未决：stage-only token 撤销、ECS 未进 git 旧目录

建议去处：npm 网页 / ECS 维护（不必进公开仓正文）。

为什么值得补：发布已改 OIDC，旧 token 多余；旧目录增加部署噪音。

不补的代价：凭据残留；路径认知混乱。

处理结果：未处理（自 10-19 日复盘起连续遗留）。

### 已在日复盘开 PR/卡、此处不催办

- Langfuse 脏数据保留记忆、Tailscale「会再丢、按台账重装」记忆、OpenCode/Pi tags 缺口卡：10-25 日复盘清单。
- 长期 AI 问题定时追踪记忆、routines Project 分组 [#352](https://github.com/VirusPC/edges-brain-viruspc/pull/352)：10-24。
- 工作区入口 / npm 最新版 / 云端盲测 / Trusted Publisher 404 笔记：[#349](https://github.com/VirusPC/edges-brain-viruspc/pull/349) 已合。
