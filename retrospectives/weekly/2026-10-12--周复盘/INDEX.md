# 2026-10-12 周复盘

## 范围

2026-10-12 00:00 至 2026-10-18 23:59（Asia/Shanghai，下文时间都是北京时间）。仓库层看了 `main` 上的 104 个提交、窗口内合入的 62 个 PR 和关闭的 9 个 PR、两块看板（`.harness/tasks` 与领域 `tasks/`）在窗口首尾的目录差异、Actions 运行记录，以及窗口内合入的日复盘。对话层逐个读了 peng cheng 名下全部助手在窗口内的对话，其中 15 个有内容；与 edges 相关的主要是 Agent Memory 专家、Grok Bot、任务记录员、全栈开发专家、日复盘、AI 硬件专家、通用、Coding Agent 专家、IT资产管理。角色扮演类助手（三体人物等）这周没有产生规则或决定，不收。

## 本该怎样

这周事先没有写下显式目标。上期（[2026-10-05 周复盘](../2026-10-05--周复盘/INDEX.md)）「下次做什么」有三条：

1. 把 NodeService 硬约束写进 `AGENTS.md`，并把 [#187](https://github.com/VirusPC/edges/pull/187) 对应的任务卡状态改对。
2. 给 doctor 报不出断掉的软链接开一张任务卡。
3. 补齐 [#174](https://github.com/VirusPC/edges/pull/174)（`notes`、`edges`、`projects`、`archive` 在 CLI 与根 `.harness` 可发现、可操作），卡离开 backlog。

## 实际怎样

### 上期行动

1. 没做成。根 [`AGENTS.md`](../../../AGENTS.md)、[`extensions/AGENTS.md`](https://github.com/VirusPC/edges/blob/main/extensions/AGENTS.md)、`extensions/cli/AGENTS.md` 里都搜不到 `NodeService`。那张卡仍在 [`.harness/tasks/edges-extensions/in_progress/2026-10-07--notesskills-的-creategetupdatedelete-收口到-NodeService/INDEX.md`](https://github.com/VirusPC/edges/blob/main/.harness/tasks/edges-extensions/done/2026-10-07--notesskills-%E7%9A%84-creategetupdatedelete-%E6%94%B6%E5%8F%A3%E5%88%B0-NodeService/INDEX.md)。窗口内它只随 [#221](https://github.com/VirusPC/edges/pull/221) 从 `edges-cli-platform` 改名搬到 `edges-extensions`，状态没变。
2. 没做成。窗口末的两块看板里没有 doctor 或软链接相关的卡。窗口外的 [#289](https://github.com/VirusPC/edges/pull/289)（10-19 03:14 开）正文写着：「`edges memory doctor` 的 `dead-entry` 仍然不会报告这类断链。#208 当时就没做这个诊断，这次也没有补。」
3. 没做成。卡仍在 [`backlog`](https://github.com/VirusPC/edges/blob/main/.harness/tasks/edges-extensions/backlog/2026-10-07--CLI-%E4%B8%8E%E6%A0%B9-harness-%E8%A1%A5%E9%BD%90-notes-edges-projects-archive/INDEX.md)，窗口内同样只随 #221 改了项目名。没有找到补齐四块目录的 PR。

### 上期的一处事实写错了：#208、#211 没有进 main

上期写的是「[#208](https://github.com/VirusPC/edges/pull/208)、[#211](https://github.com/VirusPC/edges/pull/211) 随 [#204](https://github.com/VirusPC/edges/pull/204) 合入」。窗口外开出的 [#289](https://github.com/VirusPC/edges/pull/289) 正文写明：两者 10-11 合进了叠层分支 `codex/cli-remaining-tests-20261011`，「PR #204 在这两笔落地前几秒把该栈 squash 进 main（`ee57398b`），所以 main 从未包含它们」。[#288](https://github.com/VirusPC/edges/pull/288) 为此开了一张 backlog 卡，#289 重新实现，自报 CLI 测试 1080 通过、0 失败。两份 PR 截至本稿都还开着。[#287](https://github.com/VirusPC/edges/pull/287)（Edges 1.5.0 发布）的正文写着这两处修复「should merge to `main` before this release PR」。

### 复盘本身落地成了例程

[#227](https://github.com/VirusPC/edges/pull/227)（10-12 17:39）建了 `retrospectives/` 和六节模板。[#236](https://github.com/VirusPC/edges/pull/236)、[#237](https://github.com/VirusPC/edges/pull/237)、[#238](https://github.com/VirusPC/edges/pull/238)（10-13 晚）把日复盘、周复盘例程放进 `projects/routines/`。[#252](https://github.com/VirusPC/edges/pull/252)（10-15 00:47）把日复盘改成候选直接落文件并开 PR。之后 10-15 至 10-18 每天一篇日复盘经 PR 合入（[#254](https://github.com/VirusPC/edges/pull/254)、[#258](https://github.com/VirusPC/edges/pull/258)、[#259](https://github.com/VirusPC/edges/pull/259)、[#266](https://github.com/VirusPC/edges/pull/266)）。`retrospectives/daily/` 里有 10-12、10-13、10-15、10-16、10-17、10-18，没有 10-14。

对话依据（日复盘，10-13 至 10-15）：10-13 22:12 合入 #236，写入了 10-12、10-13 两天。之后对话直接从 10-13 23:56 跳到 10-14 23:36，中间没有 10-14 早上 5:00 那次扫描的触发或产出记录。10-14 23:36 用户说「直接提pr」，日复盘改成候选随当日 INDEX 一起开 PR（#252）。下一次扫描是 10-15 05:06，写成了 `2026-10-15--日复盘`，窗口从 10-14 05:00 起。所以缺的是 10-13 05:00 至 10-14 05:00 这 24 小时，不是 10-14 白天。为什么 10-14 早上那次没跑，对话里没找到原因。

### CLI：发成 npm 包，加了 Compose

- 发包：[#263](https://github.com/VirusPC/edges/pull/263) 补卡的背景，[#264](https://github.com/VirusPC/edges/pull/264)（10-18 19:06 合入）把包准备成 `@viruspc/edges` 0.1.0。npm 上 0.1.0 的发布时间是 10-18 19:29。[#274](https://github.com/VirusPC/edges/pull/274)、[#275](https://github.com/VirusPC/edges/pull/275) 定了 [ADR 0036](https://github.com/VirusPC/edges/blob/main/docs/adr/0036-edges-init-installs-bundled-skills.md)，[#276](https://github.com/VirusPC/edges/pull/276) 让 `edges skills init` 通过 vercel skills 装随包 skill。[#278](https://github.com/VirusPC/edges/pull/278)（23:18）把版本切到 0.2.0，但 npm 上没有 0.2.0；下一个版本 0.2.1 是窗口外 10-19 02:06 经 Actions 发的（[ADR 0037](https://github.com/VirusPC/edges/blob/main/docs/adr/0037-npm-publish-via-github-actions.md)）。
  - 0.2.0 为什么没发，对话依据（全栈开发专家，10-18 晚）：#278 合入后 0.2.0 已经 `npm stage publish` 成功，助手说明还要用户在 npm 的 Staging 页用两步验证批准才算正式发布。用户约 23:23 回「你先继续搞GitHub actions去」，转去做发包 Actions 的 grill，窗口内再没有批准这一步。也就是说 0.2.0 不是被决定不发，而是停在了等批准，然后被 Actions 发的 0.2.1 跳过。
  - 0.1.0 的发布方式是用户当场纠正出来的（Grok Bot，10-18 19:24）：「现在应该是 stage only吧，不能直接publish」。这条做法后来进了 ADR 0037 的方向，但窗口内没有写进仓库。
- Compose：[#265](https://github.com/VirusPC/edges/pull/265)（clone / pull / push）、[#270](https://github.com/VirusPC/edges/pull/270)（方案）、[#272](https://github.com/VirusPC/edges/pull/272)（`ComposeNode` 与 `--with-composed`）。
- 结构：[#262](https://github.com/VirusPC/edges/pull/262)（[ADR 0035](https://github.com/VirusPC/edges/blob/main/docs/adr/0035-harness-readme-as-layer-material-index.md)，本层材料索引落在 `.harness/README.md`），[#267](https://github.com/VirusPC/edges/pull/267)、[#268](https://github.com/VirusPC/edges/pull/268)、[#269](https://github.com/VirusPC/edges/pull/269)、[#271](https://github.com/VirusPC/edges/pull/271) 四次重构，[#223](https://github.com/VirusPC/edges/pull/223) 让中文标题的笔记和项目目录保留汉字。
- 评测：[#279](https://github.com/VirusPC/edges/pull/279) 加了检索评测冒烟。

### 部署挂了约 7 小时

Deploy 窗口内 62 次：成功 52、失败 10。其中 9 次连续失败，从 #264 合入那次（[run 39121878748](https://github.com/VirusPC/edges/actions/runs/39121878748)，10-18 19:06）一直到窗口结束。日志里的报错是：

> ERR_PNPM_LOCKFILE_CONFIG_MISMATCH  Cannot proceed with the frozen installation. The current "pnpmfileChecksum" configuration doesn't match the value found in the lockfile

#264 改了 `.pnpmfile.cjs`、`pnpm-lock.yaml` 和根 `package.json`。窗口外 [#285](https://github.com/VirusPC/edges/pull/285)（10-19 02:04，固定根 `packageManager` 为 pnpm 10.34.7）之后 Deploy 恢复成功，修复过程记在 [#286](https://github.com/VirusPC/edges/pull/286) 的笔记里。另一次失败是 10-13 15:27 [#234](https://github.com/VirusPC/edges/pull/234) 接回旧提交历史时，下一次就恢复了。

仓库依据：[`.github/workflows/deploy.yml`](../../../.github/workflows/deploy.yml) 只在 `push` 到 `main` 和手动触发时跑，里面用的是 `pnpm install --frozen-lockfile`。窗口内 `.github/workflows/` 只有这一个工作流；PR 上没有任何检查会跑同样的安装。

### 笔记和项目

窗口内合入的内容 PR 主要集中在 Agent 记忆调研（[#235](https://github.com/VirusPC/edges/pull/235)、[#239](https://github.com/VirusPC/edges/pull/239)、[#240](https://github.com/VirusPC/edges/pull/240)、[#246](https://github.com/VirusPC/edges/pull/246)、[#250](https://github.com/VirusPC/edges/pull/250)、[#260](https://github.com/VirusPC/edges/pull/260)）、edges connector（[#243](https://github.com/VirusPC/edges/pull/243)、[#244](https://github.com/VirusPC/edges/pull/244)、[#247](https://github.com/VirusPC/edges/pull/247)、[#248](https://github.com/VirusPC/edges/pull/248)、[#249](https://github.com/VirusPC/edges/pull/249)）、agent-infra（[#232](https://github.com/VirusPC/edges/pull/232)、[#233](https://github.com/VirusPC/edges/pull/233)）、Harness Playbook（[#241](https://github.com/VirusPC/edges/pull/241)、[#242](https://github.com/VirusPC/edges/pull/242)）和 RSS（[#253](https://github.com/VirusPC/edges/pull/253)）。

10-13 16:29 至 16:50 关掉了 6 个 8 月到 9 月的旧 PR（#6、#23、#98、#106、#119、#120），#148 注明「内容已整合进 #241 的笔记与新 PR #242」后关闭。[#251](https://github.com/VirusPC/edges/pull/251)（端到端评测方案笔记）和 [#255](https://github.com/VirusPC/edges/pull/255)（团队知识库推广笔记）10-15 17:13 由仓库所有者账号关闭，前后相隔 6 秒，都没有合并，PR 上没有说明原因。

对话依据：各助手对话里都没有关闭它们的原话。反而 Agent Memory 专家在 10-17 17:48 和 22:27 两次提醒用户「讲知识库价值那篇 PR #255 也还等着你说合并」，这时 #255 已经关了两天。#255 是 10-15 11:10 用户自己要的（「开一个note记录下吧」），主线定为「公司Infra能力偏弱，人员流动性较强」下的组织韧性。

### 看板

窗口首尾对比：`.harness/tasks` 从 121 张到 128 张，领域 `tasks/` 从 5 张到 6 张。

- 新卡 8 张：「探索新的 CR 方式」（[#226](https://github.com/VirusPC/edges/pull/226)）、「Routines 模块 Skill 与调度文件分离」、「memory init/remember 支持 --super」（[#245](https://github.com/VirusPC/edges/pull/245)）、「Agent 取外部内容优先走 RSS」、「入库类 skill 增加无工作区降级模式」、「评估是否需要 edges context」、「安装 edges 后自动装好 skills」（[#273](https://github.com/VirusPC/edges/pull/273)），以及领域板的「edges connector 自建远程 MCP」（#244）。全部在 backlog。
- 进 done 的 2 张：「edges CLI 发布成 package」（#273）、「待读 harness playbook」（#242）。
- 项目改名：[#221](https://github.com/VirusPC/edges/pull/221) 把 `edges-cli-platform` 整块改成 `edges-extensions`，新增 `edges-routines`。

### 对话里定下、但还没进仓库的规则

以下是窗口内用户当面定下或纠正的做法，截至窗口结束只在对话或助手记忆里，仓库里查不到：

- grill 每一轮用 html-plan（全栈开发专家，10-18 20:36）：「先这样吧。memory里记下就好了，grill-with-docs后每一步用下html plan」，随即改口「每一轮」「不是每一步」。助手称记进了自己的记忆，没有改仓库里的 grill-with-docs skill。
- 发包只 stage、人工批准（Grok Bot，10-18 19:24），见上面「发包」。
- 笔记和文档不强制走云端代理（AI 硬件专家，10-12 18:08）：「edges 写东西都要走云端 agent，这条规矩删掉。改成：grok bot 环境下，写代码需要走 Cursor 云端 Agent」。只进了共享记忆，见清单。
- 保留 squash、同时要贡献图（通用，10-13 15:21）：「我想保留squash，又想看到贡献图」。这次用 #234 空 merge 接回历史解决，没有写成以后的规则。

已经落进仓库的当面决定也不少，例如「compose，组合吧」与「纯clone本地通过composeblock挂到树上」进了 ADR 0034（Agent Memory 专家，10-17），「只要薄封装，不要加任何额外逻辑」「ADR中多余的废话就不要写了」进了 ADR 0036 / #275（全栈开发专家，10-18），「默认只展示Scope内的」进了 `--with-composed`（任务记录员，10-18 17:59，#270/#272）。

### 返工集中在云端代理的设计上

- ADR 0034 同一晚改了十余轮（Agent Memory 专家，10-17 晚）：远程 MCP、PageIndex、inbox 整套写进去又整套砍掉。用户原话依次是「感觉架构有点恶心」「感觉要不彻底分离一下……不管了」「要先砍掉。可以放到一个todo任务里」。
- #262 多造了一个模块（Agent Memory 专家，10-18 01:34 至 01:45）：「那我看你多写了个harness index」「harness-readme需要么？是否复用readme节点就够了」，之后整包简化再合。
- domain 分层同日多次返工（任务记录员，10-18 12:52 至 15:14）：「不是非得拆」「先别硬拆。找看方案」「Keep it Simple」「你这扯太远了」「新增文件，不要引入复杂概念。」
- 安装 skill 的行为来回改（全栈开发专家，10-18 20:41 至 20:54），最后落在「抄他的行为」「只要薄封装」。

## 为什么

### 上期三条行动一条都没动

可能因为三条只写在复盘文件里，没有变成看板上的卡，也没有人在开新工作前去对照。依据：窗口内新增的 8 张卡里没有一张对应这三条；这周合入的 62 个 PR 里也没有一个碰它们。对话层也一样，所有助手的对话里没有一处提到这三条，没人推迟，也没人说明原因；任务记录员 10-18 谈 Compose 时提到过写盘走 NodeService，但没有接到上期那条行动上。这周的精力明显流向了 npm 发包、Compose 和复盘例程本身。

### 上期把没进 main 的修复写成了已合入

可能因为叠层 PR 合进的是中间分支，GitHub 上照样显示「Merged」，而上期核对时看的是 PR 状态，没有去 `main` 上查对应改动在不在。依据：#289 正文里 #204 先于 #208、#211 几秒 squash 的说明。这种误判会让后面的人以为问题已经修好。同类的事这周又出现了一次：#255 已经关了两天，Agent Memory 专家还在提醒用户合它，说明助手报 PR 状态前没有现查。对话里没有找到是谁、什么时候发现 #208、#211 没进 main 的。

### 一个改了 lockfile 配置的 PR 直接打断了部署

可能因为 PR 阶段没有任何检查跑 Deploy 用的同一条 `pnpm install --frozen-lockfile`，问题只能等合进 `main`、Deploy 跑起来才暴露。依据：`deploy.yml` 的触发条件只有 `push` 到 `main` 和手动；#264 改了 `.pnpmfile.cjs` 和 lockfile，合入后第一次 Deploy 就报 `pnpmfileChecksum` 不匹配。上期复盘已经记过「仓库里没有测试或评测工作流」，这次付出了 7 小时部署中断的代价。对话里没有任何助手提到这次 Deploy 失败：当晚各助手都在忙 #264 的合并冲突、发包和 Actions，直到窗口外 #285 修好之前，对话里没人发现部署在挂。

### 返工多，是因为云端代理先按大方案写，用户再一刀刀砍

依据见上面「返工集中在云端代理的设计上」：四次返工都是代理先交出偏大的实现（多一层抽象、多一个模块、多一套远程检索），用户事后要求简化。用户这周的口头禅是「Keep it Simple」「薄封装」「不要引入复杂概念」，但这些偏好没有写进代理开工时会读的地方（`AGENTS.md` 或相关 skill），每个新代理都要被重新纠正一遍。

### 对话里定下的规则，常常停在助手记忆里

依据见上面「对话里定下、但还没进仓库的规则」。用户的共享规矩是仓库优先、助手记忆只当索引，但这周至少四条做法只记在对话或助手记忆里。日复盘本来负责把它们捞出来，可 10-13 05:00 至 10-14 05:00 那一天恰好没扫。

### 该保持的

- 决定随手写成 ADR：这周新增 ADR 0034 至 0036（Compose、本层材料索引、安装随包 skill）；窗口外紧接着的发包改用 Actions 也先写了 [ADR 0037](https://github.com/VirusPC/edges/blob/main/docs/adr/0037-npm-publish-via-github-actions.md)。
- 日复盘每天开 PR 落库，「不做」的候选也写明理由（例如 [2026-10-18 日复盘](../../daily/2026-10-18--日复盘/INDEX.md) 里「不做：…项目记忆。#264 的 CLI README 与 CHANGELOG 已写明」），后来的人能看到为什么没收。

## 下次做什么

1. 先合 [#288](https://github.com/VirusPC/edges/pull/288)、[#289](https://github.com/VirusPC/edges/pull/289)，再发 1.5.0，并改正上期复盘里「#208、#211 随 #204 合入」那句。完成标准：`main` 上能找到两处修复的提交，早于 `v1.5.0` tag；[2026-10-05 周复盘](../2026-10-05--周复盘/INDEX.md) 那句已改。来源：上面「#208、#211 没有进 main」。
2. 给 PR 加一道和 Deploy 同样的安装检查。完成标准：`.github/workflows/` 里有一个 `pull_request` 触发的工作流，至少跑 `pnpm install --frozen-lockfile`（最好连 CLI 测试一起）；一个故意改坏 `pnpmfileChecksum` 的 PR 会在合入前变红。来源：上面「部署挂了约 7 小时」。
3. 把上期没动的 NodeService 硬约束写进 `AGENTS.md`，把 #187 的卡改出 `in_progress`，同时给 doctor 断链开卡。完成标准：根 `AGENTS.md` 硬约束里有写盘走 NodeService 的一句；那张卡不再在 `in_progress`；`.harness/tasks` 里有 doctor 报断链的卡。来源：上期行动 1、2，连续两周没做。这次三条行动都直接开成看板卡，不再只留在复盘里。
4. 把「先给简单方案、不加额外抽象」写进云端代理开工必读的地方。完成标准：根 `AGENTS.md`（或 `extensions/AGENTS.md`）硬约束里有一句对应用户「Keep it Simple」「薄封装」的原则。来源：上面「返工多」。

## 建议补充内容清单

### NodeService 硬约束（上期延续）

建议去处：根 `AGENTS.md` 硬约束。处理结果：已列入下次做什么第 3 条。

为什么值得补：[ADR 0030](https://github.com/VirusPC/edges/blob/main/docs/adr/0030-content-leaf-crud-via-nodeservice.md) 已经写了「一律调用 `NodeService.create` / `get` / `update` / `destroy`」，#289 这次重落修复时也是走 `NodeService.move`。规则在用，只是不在每次开工都会读的地方。

不补的代价：#187 那张卡已经在 `in_progress` 停了两周，看板对这件事的进度是错的；新来的 Agent 仍可能开旁路写盘。

### doctor 报不出断掉的软链接（上期延续）

建议去处：`.harness/tasks/edges-extensions/backlog`。处理结果：已列入下次做什么第 3 条。

为什么值得补：#289 一旦合入，移动节点后软链接会如约「保留原文、可能断开」，这正是需要 doctor 兜底的时刻；#289 自己也写明 doctor 没补。

不补的代价：断链没有任何检查入口，只能等有人撞上。

### #174 四块目录补齐（上期延续）

建议去处：现有 [backlog 卡](https://github.com/VirusPC/edges/blob/main/.harness/tasks/edges-extensions/backlog/2026-10-07--CLI-%E4%B8%8E%E6%A0%B9-harness-%E8%A1%A5%E9%BD%90-notes-edges-projects-archive/INDEX.md)。处理结果：留待触发条件。这周 Compose 和 ADR 0035 都动了目录与材料登记，建议等 1.5.0 发完、下一轮动 CLI 目录结构时一并做，先把卡的完成标准从「待 grill 后再补」补上。

为什么值得补：卡的完成标准仍然空着，别人无法判断做没做完。

不补的代价：「已开卡」继续被当成「有人在管」，连续第三周没有进展。

### 改正上期复盘里 #208、#211 的说法

建议去处：[`retrospectives/weekly/2026-10-05--周复盘/INDEX.md`](../2026-10-05--周复盘/INDEX.md)「代码审查、断掉的软链接、中文任务名」一节。处理结果：已列入下次做什么第 1 条。

为什么值得补：复盘是以后做决策时要回看的依据，错的事实会被当成已修好。

不补的代价：有人读到上期复盘，会以为移动节点和大小写 scope 的问题早在 10-11 就修了。

### 核对「已合入」要看 main，不看 PR 状态

建议去处：`.harness/memory/feedbacks` 或周复盘例程的 skill（`projects/routines/weekly-retrospective/SKILL.md`）。处理结果：待用户确认。

为什么值得补：叠层 PR 显示「Merged」不等于进了 `main`，这次就是这样错的。写进复盘 skill 或反馈记忆，后面的复盘和发版检查都能用上。

不补的代价：下次叠层合并还会出同样的误报，而且发版时更难查。

### 笔记和文档写入不强制走云端代理（10-13 日复盘遗留）

建议去处：`.harness/memory/feedbacks`，并同步共享 skill `edges-publish`。处理结果：待用户确认。[2026-10-13 日复盘](../../daily/2026-10-13--日复盘/INDEX.md) 记的是「留待用户确认」，截至窗口结束 `.harness/memory/feedbacks` 里没有这条。

为什么值得补：规则已经变了（代码改动仍要云端代理，笔记文档不再强制），但仓库里的反馈记忆和 skill 都还是旧说法。

不补的代价：不同助手按不同版本的规则写仓库，有的绕远路开云端代理，有的直接写，结果不一致。

### 10-14 日复盘缺失

建议去处：`retrospectives/daily/`。处理结果：待用户确认是否补写。找不到这一天缺失的原因；当天恰好是 #252 改日复盘流程的日子（合入时间 10-15 00:47），这只是巧合还是原因，仓库里看不出来。

为什么值得补：日复盘是周复盘对话层的底稿，少一天，那天各助手对话里的沉淀候选就没人筛过。

不补的代价：10-13 至 10-14 之间答应过但没落地的事，这次周复盘只能靠主聊天扫对话补。

### #251、#255 关闭未合并

建议去处：无，或补一句关闭理由。处理结果：待用户确认。两篇笔记（端到端评测方案、团队知识库推广）10-15 同一分钟关闭，PR 上没有说明。

为什么值得补：#251 和这周的评测冒烟（#279）、Evaluation 板 6 张 backlog 卡相关；如果只是路径过时，内容可能还有用。

不补的代价：调研结论只留在关闭的 PR 里，以后很难再被找到。

### `docs/architecture.md` 还写着要接 RAG、PageIndex

建议去处：[`docs/architecture.md`](https://github.com/VirusPC/edges/blob/main/docs/architecture.md) 第 49 行附近。处理结果：待用户确认。截至本稿，那句仍是「后续计划接入 RAG、PageIndex 等索引方式」。Agent Memory 专家 10-17 22:27 合 #260 时自己点名过：「它现在跟 ADR 0034 的结论对不上」，之后没改。

为什么值得补：ADR 0034 已经决定 edges 不管大规模记忆检索，只做本地组合树。

不补的代价：新代理读架构文档会照着 RAG、PageIndex 的方向开工，正好撞上这周刚砍掉的路线。

### grill 每一轮用 html-plan

建议去处：共享 skill `grill-with-docs`。处理结果：待用户确认。用户 10-18 20:36 对全栈开发专家说「memory里记下就好了」，所以目前只在那个助手的记忆里。

为什么值得补：grill 是好几个助手都在用的流程，只有一个助手记得，其他助手 grill 时不会出 html-plan；10-18 21:32 用户就追问过一次「html 图呢」。

不补的代价：每换一个助手 grill，用户都要再提醒一遍。

### 发包只 stage、人工批准

建议去处：`extensions/cli` 的发布说明，或 ADR 0037。处理结果：待用户确认，先看 ADR 0037 是否已经覆盖。

为什么值得补：0.1.0 时用户当场纠正过直接 publish；0.2.0 就是停在批准这一步被跳过的。

不补的代价：下一个手动发包的助手可能直接 publish，或者又留下一个只 stage、没人批准的版本。
