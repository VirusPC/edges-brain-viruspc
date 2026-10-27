# 2026-10-05 周复盘

## 范围

2026-10-05 00:00 至 2026-10-11 24:00（Asia/Shanghai）。仓库看了 `origin/main` 的提交、这周的 PR 与 Actions，以及 `.edges/tasks`。对话依据是各助手的时间窗摘录（下面的时间都是北京时间）；提炼只用来对照，不代替原话。

## 本该怎样

这周事先没有写下显式目标。这是第一份按现行模板写的周复盘，没有上一期「下次做什么」可以验收。

## 实际怎样

上期行动：没有。

### 递归维护空间收到 NodeService，并打了 v1.4.0

`main` 上这周 56 个提交，从 [#161](https://github.com/VirusPC/edges/pull/161) 到 [#218](https://github.com/VirusPC/edges/pull/218)。「56」这个数在对话摘录里没有原文，是按 `origin/main` 的时间窗数出来的。主干合入顺序：[#163](https://github.com/VirusPC/edges/pull/163)、[#165](https://github.com/VirusPC/edges/pull/165)、[#166](https://github.com/VirusPC/edges/pull/166)、[#167](https://github.com/VirusPC/edges/pull/167)，清单挂到材料 README（[#170](https://github.com/VirusPC/edges/pull/170)），命令名跟目录对齐且不留旧名（[#172](https://github.com/VirusPC/edges/pull/172)），笔记 / 技能 / 项目的读写收进 NodeService（[#187](https://github.com/VirusPC/edges/pull/187)），`edges init` 改成各模块各管各的（[#190](https://github.com/VirusPC/edges/pull/190)）。[#196](https://github.com/VirusPC/edges/pull/196) 准备了 v1.4.0，远端有 tag [`v1.4.0`](https://github.com/VirusPC/edges/releases/tag/v1.4.0)。#163、#165、#166 的当次原话在摘录里没有逐条留下。

对话依据：任务记录员，2026-10-07 23:45。当时在核对各 harness 模块的增删改查是不是都走 NodeService。用户先要求拉最新代码做核对，紧接着说最不希望绕过。10-08 00:11 用户说「开始做吧」，任务记录员把这句转给全栈开发专家，要求先 grill 再实现，禁止文件系统旁路。实现后来叠进 #187 合入；对应任务卡没有在合并时改状态，见下文看板一节。

> 最不希望的是，绕过node service

> 开始做吧

仓库依据：[`docs/adr/0030-content-leaf-crud-via-nodeservice.md`](https://github.com/VirusPC/edges/blob/main/docs/adr/0030-content-leaf-crud-via-nodeservice.md) 写着「内容叶子（Note、Skill，以及随后的 Project）的创建、读取、更新与删除一律调用 `NodeService.create` / `get` / `update` / `destroy`」。根 [`AGENTS.md`](../../../AGENTS.md) 的硬约束里没有 NodeService 这句。

命令名是另一条已经写进去的硬约束。Coding Agent 专家，2026-10-07 22:28。#172 刚合入，用户先确认补齐四块目录的卡可以落库，接着问这条规则有没有写进 CLI 的 AGENTS。助手查完说挂在 `extensions/AGENTS.md`，不是 `extensions/cli/` 自己的文件。后来没有再改这条的位置。

> 对的。突然想起来，按文件夹命名这个，写到cli的agents.md里了吗

> 或者写到合适的地方

仓库依据：[`extensions/AGENTS.md`](https://github.com/VirusPC/edges/blob/main/extensions/AGENTS.md) 本层硬约束：「顶层 `edges` 命令能对上 harness 或领域目录时，命令名跟目录……硬切断，不留旧名别名。」

### 部署

部署只走 [Deploy](https://github.com/VirusPC/edges/blob/main/.github/workflows/deploy.yml)。窗口内该工作流 47 次：成功 20、失败 26、取消 1。失败例：[run 37731883857](https://github.com/VirusPC/edges/actions/runs/37731883857)（[#192](https://github.com/VirusPC/edges/pull/192)）。窗口内最后一次是成功的 [#218](https://github.com/VirusPC/edges/actions/runs/38150377429)。[#193](https://github.com/VirusPC/edges/pull/193) 让部署先生成 schema；[#194](https://github.com/VirusPC/edges/pull/194) 把站点迁移收成固定入口。仓库里没有测试或评测工作流。这 47 次的逐条讨论，对话中未找到原文。

仓库依据：`.github/workflows/` 里只有 `deploy.yml`。Agent Eval 专家 2026-10-11 17:10 的只读调研也说当时没有任何 CI 会跑测试或评测，这是调研转述，不是改工作流当次的原话。

### 评测与观测

[#201](https://github.com/VirusPC/edges/pull/201)、[#202](https://github.com/VirusPC/edges/pull/202)、[#205](https://github.com/VirusPC/edges/pull/205)、[#207](https://github.com/VirusPC/edges/pull/207) 在这周合入。#201、#202 的开 PR 原话，对话中未找到原文；Agent Eval 专家 17:10 的调研把它们算进当天已有的评测冒烟。

#205、#207 有当次对话。Agent Eval 专家，2026-10-11 17:47 起。用户指出当时的评测只是官方小样例，没有评这个仓库。助手说明 LoCoMo 和 MemoryBench 测的是公开对话上的模型加检索，测不到本仓的笔记和硬约束，并提议记成两张任务。17:56 用户纠正不是记在助手自己的记忆里。18:00 用户同意按草稿提 PR。助手随后报告 #207 已 squash 合入。#205 是同一天把观测记录改到与实例现状一致后，用户说合并，助手报告已合入。摘录里的实例地址和密钥不写入这里。

> 我记得有个问题是，现在eval只是跑了官方的一点点小的demo，没有具体的评测这个仓库。

> 我说的是记到Task里。

> 可以，按这两张卡提 PR

### 代码审查、断掉的软链接、中文任务名

[#200](https://github.com/VirusPC/edges/pull/200) 打开 CLI 的 Bugbot。自动点名的 [#209](https://github.com/VirusPC/edges/pull/209)、[#212](https://github.com/VirusPC/edges/pull/212) 关闭未合并，结论在 [#213](https://github.com/VirusPC/edges/pull/213)。[#208](https://github.com/VirusPC/edges/pull/208)、[#211](https://github.com/VirusPC/edges/pull/211) 随 [#204](https://github.com/VirusPC/edges/pull/204) 合入。中文任务名的命令行为在 [#210](https://github.com/VirusPC/edges/pull/210)、[#214](https://github.com/VirusPC/edges/pull/214)。

对话依据：Agent Eval 专家，2026-10-11 18:40 至 19:01。前面试过用 Action 发评论，助手判断对方不认机器人评论，于是改成建议放个人凭据。用户拒绝。助手改口提议用已授权的 GitHub 插件或仓库记忆。18:48 用户同意先走记忆方案，#209 关掉，#212 打开。19:01 用户认为兼容问题太多，要求搁置。助手关掉 #212，并把结论写成任务，即 #213。资料：[Bugbot 文档](https://cursor.com/docs/bugbot)，助手当时引用它说明自动审查不能按目录开关。

> 不要token，你不要给我加token。

> 我觉得是不是在仓库里面加一个记忆比较好？

> 感觉好像有很多兼容问题，先搁置放到todo吧。

仓库依据：搁置卡现位于 [`.edges/tasks/edges-extensions/todo/2026-10-11--搁置只让-CLI-的-PR-自动触发-Bugbot/INDEX.md`](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/todo/2026-10-11--%E6%90%81%E7%BD%AE%E5%8F%AA%E8%AE%A9-CLI-%E7%9A%84-PR-%E8%87%AA%E5%8A%A8%E8%A7%A6%E5%8F%91-Bugbot/INDEX.md)，状态 `todo`。简介写着「Bugbot 不能按目录自动跑；Action、PAT、云端 Agent 身份都不通，先记结论，另议方案。」摘录里开卡时写的是 `edges-cli-platform` 的 backlog，和现在的项目名、状态不一致，以仓库文件为准。

软链接：Coding Agent 专家，2026-10-11 18:02 至 18:23。用户问移动节点时软链接该怎么处理。助手建议移动时不动它，断链交给 doctor 报。18:10 用户让分开派人修。#208 修好「移动时不要把软链接登记当成节点」之后，助手主动说出 doctor 仍然报不出断链，并问要不要开 backlog 卡。下一条用户消息是 18:40 的「一起改吧」，对的是路径大小写的同类修复，不是这张卡。摘录里没有用户答应开卡的原话。仓内也没有这张卡。

> 还有一个缺口：现在的 doctor 报不出这种断掉的软链接。……这次没实现，要我开一张 backlog 卡记下来吗？

中文任务名：任务记录员，2026-10-11 18:03 至 18:13。#206 落卡时，助手说 frontmatter 的 `name` 被去掉中文、只剩英文词，并表示不影响使用、介意再改。用户否定。助手查完说这是 `taskNameSlug` 只留小写英文和数字，不是有意设计。用户选择修 CLI，并改 #206 和已经中招的旧卡。#210 合入后，用户又指出 #213 的 `name` 也要改，#214 合入。对话里没有「把这条写进 AGENTS.md 硬约束」的原话。

> 不对，为啥去掉中文啊

> 修 CLI 让 name 保留中文，#206 和已经中招的旧卡一起改

仓库依据：[`extensions/cli/src/domain/models/tasks/slug.ts`](https://github.com/VirusPC/edges/blob/main/extensions/cli/src/domain/models/tasks/slug.ts) 的 `taskNameSlug` 转调 `directoryStem`。[`extensions/cli/src/domain/models/node/stem.ts`](https://github.com/VirusPC/edges/blob/main/extensions/cli/src/domain/models/node/stem.ts) 写着保留 Unicode 字母、记号和数字。根 `AGENTS.md` 与 `extensions/AGENTS.md` 的硬约束正文都没有「任务名保留中文」。

[#216](https://github.com/VirusPC/edges/pull/216)、[#219](https://github.com/VirusPC/edges/pull/219)、[#220](https://github.com/VirusPC/edges/pull/220) 已合并，时间分别是 2026-10-12 00:51、00:28、00:37（北京时间）。

### 看板：有的卡对齐了，有的没有

[#217](https://github.com/VirusPC/edges/pull/217) 把 Harness 流转卡放进 backlog。任务记录员，2026-10-11 22:36 至 22:59。用户先要求记任务，草稿被写成「谁触发谁」。22:57 用户纠正。助手改标题后再问，22:59 用户说开 PR。卡现在在 [`.edges/tasks/edges-extensions/backlog/2026-10-11--厘清-Harness-模块在知识流转中的位置/INDEX.md`](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/backlog/2026-10-11--%E5%8E%98%E6%B8%85-Harness-%E6%A8%A1%E5%9D%97%E5%9C%A8%E7%9F%A5%E8%AF%86%E6%B5%81%E8%BD%AC%E4%B8%AD%E7%9A%84%E4%BD%8D%E7%BD%AE/INDEX.md)，状态 `backlog`。摘录里建议的项目名是 `edges-cli-platform`，现档是 `edges-extensions`。

> 记录任务。随着Harness 里面模块越来越多，需要仔细设计它们之间的流转关系。

> 倒也不是谁触发谁。主要是我潜意识中觉得这些东西本是存在一些知识流转关系的。比如说我们README里面最初写的内容。但是随着模块的逐步扩充，需要为新的模块找到合适的位置。

> 开pr吧

[#174](https://github.com/VirusPC/edges/pull/174) 的补齐卡仍在 backlog。Coding Agent 专家，2026-10-07 22:25。用户先要求在 CLI 和根 `.edges` 里补上四块目录，紧接着改口先记任务。22:28 确认草稿。助手报告 #174 已合，并说要开 grill 或先修 `tasks create` 再动手。摘录里没有后续实现。卡仍在 [`.edges/tasks/edges-extensions/backlog/2026-10-07--CLI-与根-harness-补齐-notes-edges-projects-archive/INDEX.md`](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/backlog/2026-10-07--CLI-%E4%B8%8E%E6%A0%B9-harness-%E8%A1%A5%E9%BD%90-notes-edges-projects-archive/INDEX.md)，完成标准仍是「待 grill 后再补」。

> notes/edges/projects/archive，都帮忙在cli和根目录.edges里补充上吧

> 记录一个task先

[#187](https://github.com/VirusPC/edges/pull/187) 已合并。对应任务卡仍是 `in_progress`：[`.edges/tasks/edges-extensions/in_progress/2026-10-07--notesskills-的-creategetupdatedelete-收口到-NodeService/INDEX.md`](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/done/2026-10-07--notesskills-%E7%9A%84-creategetupdatedelete-%E6%94%B6%E5%8F%A3%E5%88%B0-NodeService/INDEX.md)。卡的背景写着用户要求消灭旁路。对话里没有「#187 合并后把这张卡标完成」的原话。

### CLI 测试

2026-10-12 重跑 `pnpm --filter edges-cli test`：1015 通过，0 失败。这次重跑的原文不在对话摘录里，是写本篇时在当前树上跑的。

摘录里的旧说法已经对不上这次结果，不再当作待确认项。任务记录员 2026-10-08 15:57 说当时 main 上 971 项里有 24 项本来就失败。同一助手 2026-10-11 18:29 在 #210 的结果里说还剩 8 个失败、不是这次改出来的。两句都没有附失败名单。

## 为什么

### NodeService 的卡没有跟着合并改状态

可能因为「不许绕过 NodeService」写在任务卡和 ADR 里，没有收成 `AGENTS.md` 硬约束，合并 #187 时也没有人负责改卡。用户 10-07 23:45 说了最不希望绕过，10-08 00:11 说开始做。ADR 0030 记下了决定。卡的 `edges-tasks-status` 仍是 `in_progress`。摘录里找不到合并后改状态的约定，所以卡会停在旧目录里。

### 该保持的

令牌不进仓库。自动点名走不通就关掉方案、把结论写成任务卡（[#213](https://github.com/VirusPC/edges/pull/213)），而不是把凭据放进 Actions。依据就是上面 18:40 的拒绝，以及搁置卡简介里的「先记结论，另议方案」。

## 下次做什么

1. 把 NodeService 硬约束写进 `AGENTS.md`，并把 [#187](https://github.com/VirusPC/edges/pull/187) 对应的任务卡状态改对。完成标准：硬约束正文写明写盘走 NodeService；[这张卡](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/done/2026-10-07--notesskills-%E7%9A%84-creategetupdatedelete-%E6%94%B6%E5%8F%A3%E5%88%B0-NodeService/INDEX.md) 不再停在 `in_progress`。来源：上面「NodeService 的卡没有跟着合并改状态」，以及清单第一条。
2. 给 doctor 报不出断掉的软链接开一张任务卡。完成标准：`.edges/tasks` 里有这张卡。来源：上面「代码审查、断掉的软链接」里 18:23 的提议；用户没有答应，仓内也没有卡。对应清单第二条。
3. 补齐 [#174](https://github.com/VirusPC/edges/pull/174)。完成标准：`notes`、`edges`、`projects`、`archive` 在 CLI 与根 `.edges` 材料登记上可发现、可操作，命名跟文件夹一致；[这张卡](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/backlog/2026-10-07--CLI-%E4%B8%8E%E6%A0%B9-harness-%E8%A1%A5%E9%BD%90-notes-edges-projects-archive/INDEX.md) 离开 backlog。来源：上面看板一节里 22:25 的原要求，以及清单第三条。卡自己的完成标准还写着「待 grill 后再补」，补齐前要先补上这一栏。

## 建议补充内容清单

### 硬规则没有集中到一处

命令名已经在 [`extensions/AGENTS.md`](https://github.com/VirusPC/edges/blob/main/extensions/AGENTS.md)。NodeService 只在 ADR 0030 和那张 `in_progress` 卡里，根 `AGENTS.md` 没有。建议去处：`AGENTS.md` 硬约束。处理结果：已列入下次做什么。

为什么值得补：10-07 23:45 的原话是「最不希望绕过」，10-08 的实现也按这个做了。硬约束是助手每次开工会读到的地方，ADR 和任务卡要再去翻。

不补的代价：下一次写盘还可以再开一条旁路，而且 #187 这种「代码已合并、卡还在进行中」会再出现，看板不能当进度。

### doctor 报不出断掉的软链接，没有卡

建议去处：`.edges/tasks`。处理结果：已列入下次做什么。

为什么值得补：18:10 已经定了「移动时不动软链接，断链交给 doctor」。#208 只做了前半句。18:23 助手问过要不要开卡，摘录里没有答复。

不补的代价：移动之后断链没有检查入口，只能等人再次碰到才想起来。#208 修的是另一件事，不能代替这张卡。

### #174 只落了卡，补齐还没做

建议去处：[backlog 卡](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/backlog/2026-10-07--CLI-%E4%B8%8E%E6%A0%B9-harness-%E8%A1%A5%E9%BD%90-notes-edges-projects-archive/INDEX.md)。处理结果：已列入下次做什么。

为什么值得补：22:25 的原要求是四块目录在 CLI 和根材料登记里补上。用户改口「记录一个task先」，助手也说合卡之后要 grill 再做。卡还在 backlog，完成标准空着。

不补的代价：`edges`、`projects`、`archive` 是否跟文件夹对齐，仍然只存在于这张没有完成标准的卡上，后面的人会把「已开卡」当成「已做完」。

### 按目录管可写记忆的调研没有 `report.md`

建议去处：`projects/`。处理结果：待用户确认。仓库里没有这份 `report.md`，也没有摘录里提到的那份「按目录精细化记忆管理」调研稿。

原始诉求和分歧：Agent Eval 专家，2026-10-11 20:25 至 22:35。用户要的是按目录管可写记忆，并指定在 Mac mini 上用 Codex 独立做同一题。助手答应报告写到本机 `~/codex-research/report.md`，升完 CLI 后开跑。20:46 用户问还没跑完吗。助手先给了自己扩圈后的对照（最接近的是 CrewAI 的分层记忆，但是抽象路径，不绑仓库目录），并说 Codex 中途停了、会重启。22:35 助手报告 Codex 两次都没写完，`report.md` 没生成，提议改前台挂着等，或由用户自己在本机跑。摘录在这句之后没有用户选哪一种。助手当次的扩圈结论留在对话里，没有进仓库。

> 在 Mac mini 上用 Codex 跑这轮调研

> 报告会写到 `~/codex-research/report.md`。

> Mac mini 上的 Codex 两次都没跑完，`report.md` 一直没生成。

为什么值得补：用户要的是一份能跟助手自己的对照放在一起看的第二份调研。现在只剩对话里的排序，没有可引用的文件。

不补的代价：下次讨论按目录记忆时，只能复述 20:52 那次口头排序，无法核对 Codex 是否同意，也无法把结论放进 `projects/` 接着改。

### 任务名要保留中文，这条规则没写进硬约束

建议去处：根 `AGENTS.md` 或 `.edges/memory`。处理结果：待用户确认。

原始诉求和分歧：行为已经改了，规则正文没有。18:03 助手把「中文被去掉、只剩 `memory_agent`」说成不影响使用的小瑕疵。用户不接受，认为不该去掉。助手改口说这是 bug：目录名保留中文，`name` 却只留小写英文和数字，大概照搬了 Skill 的规矩。用户的决定是修生成规则，并改已中招的旧卡，不是维持 ASCII。#210、#214 合入后，`directoryStem` 会保留 Unicode 字母。对话中未找到「再写进硬约束」的原文。还没定的是：只靠代码，还是要把「`name` 保留中文」写成硬约束，避免以后再抄回只留 ASCII 的规则。

为什么值得补：用户否定的是「去掉中文也能用」。若只留在函数里，下一次改 slug 的人看不到这句否定。

不补的代价：硬约束仍然不禁止把中文折成下划线。#206 那种 `memory_agent` 可以再出现，而且不会有人觉得自己违反了书面规则。

### 「森林在 traverse 之外」要另开一小份 PR

建议去处：`CONTEXT.md`。处理结果：已完成。这句话已在 [`CONTEXT.md`](https://github.com/VirusPC/edges/blob/main/CONTEXT.md)（[#167](https://github.com/VirusPC/edges/pull/167)）。

对话依据：任务记录员，2026-10-08 15:57。用户不要 #197 的文档把这件事写成曾经放错位置。助手改完 CLI 文档后，16:12 说 `CONTEXT.md` 第 12 行还留着这句，要改就另开小 PR。摘录里没有用户答应这份额外 PR。后来核对仓库，这句仍在 `CONTEXT.md`，由 #167 写入，周内没有第二份只改这句的 PR。

> 197: 森林在 traverse 之外 这种词不要写，就当他从没被误放过

> `CONTEXT.md` 第 12 行还写着「森林在 traverse 之外」，这次没改。要改的话说一声，我另开个小 PR。

为什么值得补：用户要的是现行文档不要写成「曾经误放」。助手自己也把 `CONTEXT.md` 和 CLI README 分成两处。

不补的代价：若这句话后来被删掉，术语表会和 #167 的实现说明断开。现在文件里还有，所以不再单开 PR。

### Harness 在知识流转里的位置

建议去处：任务看板。处理结果：已完成。卡在 backlog：[这张卡](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/backlog/2026-10-11--%E5%8E%98%E6%B8%85-Harness-%E6%A8%A1%E5%9D%97%E5%9C%A8%E7%9F%A5%E8%AF%86%E6%B5%81%E8%BD%AC%E4%B8%AD%E7%9A%84%E4%BD%8D%E7%BD%AE/INDEX.md)（[#217](https://github.com/VirusPC/edges/pull/217)）。

为什么值得补：22:57 用户纠正了「谁触发谁」。不记下来，下一张模块卡还会按命令链来设计。

不补的代价：新模块只按目录名往上堆。这张卡已经在，代价是没记时才会发生；卡的完成标准仍待 grill，设计本身还没做。

### 自动点名 Bugbot 与不用个人访问令牌的理由

建议去处：任务卡。处理结果：已完成。理由在 [搁置卡](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/todo/2026-10-11--%E6%90%81%E7%BD%AE%E5%8F%AA%E8%AE%A9-CLI-%E7%9A%84-PR-%E8%87%AA%E5%8A%A8%E8%A7%A6%E5%8F%91-Bugbot/INDEX.md)（[#213](https://github.com/VirusPC/edges/pull/213)）。

为什么值得补：18:40 到 19:01 试过 Action、个人凭据、记忆加硬约束，三条都不接受。不写下来，下次还会从「往仓库放凭据」再走一遍。

不补的代价：凭据进 Actions，或云端应用身份发的评论再次被当成已经点名。卡已经记下「先记结论，另议方案」。
