# 2026-10-21 日复盘

## 范围

时间窗：2026-10-20 05:06 至 2026-10-21 05:06（Asia/Shanghai）。原始对话已按助手落盘到本机 `/workspace/daily-scan/2026-10-21/`（按时间正序的 jsonl，永久保留，不入库），本篇只基于这些文件分析。

- 读到的助手（8 个）：全栈开发专家（1109 条）、任务记录员（342 条）、Grok Bot（231 条）、Coding Agent 专家（193 条）、通用-辅助-2（78 条）、IT资产管理（36 条）、记录员（10 条）、通用（6 条）。其余助手窗口内没有对话。
- 各助手最早一条记录在 10:08，05:06–10:08 之间只有日复盘自己的活动：05:21 把 10-20 日复盘的 PR 交给用户。这个 PR 当时在旧 `VirusPC/edges`，现在是 [edges-brain-viruspc#321](https://github.com/VirusPC/edges-brain-viruspc/pull/321)（INDEX 加三条反馈记忆），12:07 由全栈开发专家按用户「现在的都 merge」合入。
- 局限：
  - 记录里的时间只精确到分钟，同一轮里的多条消息共用该轮开始的时间。
  - 有几处助手把结果写成纯文本，系统随后提醒补发。本篇以最终发给用户的内容为准。
  - 后台子代理和云端 Agent 的完整过程不在落盘里，只看得到回报。
- 仓库改名核对（`gh`，05:15 前后）：
  - `VirusPC/edges-brain-viruspc`：公开，2026-01-04 建，就是原 `VirusPC/edges`，历史和 PR 编号都保留。日复盘 Skill `projects/routines/daily-conversation-deposit/SKILL.md`、`retrospectives/daily/`、根 `AGENTS.md` 都在这里。
  - `VirusPC/edges`：公开，2026-10-20 12:25 新建的框架仓，PR 从 #1 编号到 #20。没有 `retrospectives/` 和日复盘 Skill，有自己的根 `AGENTS.md`。
  - `VirusPC/edges-brain-viruspc-private`：私有；用旧名 `VirusPC/edges-private` 查询会被重定向到它。
- 去重依据：
  - edges-brain-viruspc：窗口内合入的 #297、#320–#339 不重复；还开着的只有 #340（「HTML plan 审任务卡与技术方案」卡）。
  - VirusPC/edges：#1–#19 已合入（拆仓修整、workflows、平铺、packages 化、ADR 0040–0043、compose 改 submodule 和改挂 README、几张卡），#20（Compose 改挂卡补进展挪 done）还开着。
  - edges-brain-viruspc-private：窗口内只有一次直推 main（改名后更新自称），没有 PR。
- 工具说明：
  - 用的是本机 `gh` 和新 clone（分支 `daily/2026-10-21`），没有按 SKILL 用 Cursor 云端 Agent 开 PR。
  - 两条记忆用 PATH 上的 `edges` 0.2.3 执行 `memory remember`，笔记用 `edges notes create`，索引由 CLI 登记。CLI 没有设置 `EDGES_SCOPE` / `EDGES_REPO`，默认写到当前目录所在的仓库，也就是这份 edges-brain-viruspc clone，目标正确。
  - 手写的文件只有本篇 `INDEX.md`。两条记忆和一篇笔记的正文由我起草，交给 CLI 写入。

## 实际怎样

- **拆仓（任务记录员 → 全栈开发专家 → IT资产管理）**：
  - 10:09 用户说仓库不该把 Edges 系统和个人大脑混在一起，任务记录员开卡（#323）并问了三条边界：个人仓公开、teaching 连部署一起搬、`shared-extensions` 跟个人仓走。用户提醒「刚刚的部分只放到任务卡」，不另写 ADR，剩下的 grill 转给全栈开发专家。
  - 全栈开发专家用 html-plan 跑了六轮（R1–R6，写进 #326、#328）。R4 起方向反转：用户不想让框架将来开源时 commit 里带个人信息，提出「edges 改名做个人仓，框架开新仓」。中间一度改成「旧仓 archive、再开两个新仓」（R5），12:09 用户又想到个人知识库会不断长新项目、以后还会不断拆系统，不能每次都 archive，最后定为 R6：现在的 edges 改名 `edges-brain-viruspc` 作长期主干，框架新开仓沿用 `VirusPC/edges`。用户要求把这条记成个人仓的记忆。
  - 12:18 起全栈开发专家按授权自己做完：先把 ECS 拉取地址改到新名、确认部署，再建框架仓（#1、#2），删个人仓里的系统副本（edges-brain-viruspc#332，1253 个文件），14:00 用户自己用 sudo 把 nginx `/tasks/` 切到框架仓的检出。IT资产管理更新台账，把两台 Mac 上的 clone remote 改到新地址。
  - npm 发布那步用户说留给自己最后配。任务记录员后来判断 Trusted Publishing 绑定的是仓库名 `VirusPC/edges` 加 workflow 文件名，新框架仓占了这个名字，不用重配。
- **框架仓整理（全栈开发专家、任务记录员）**：平铺 `extensions/` 到根，`posts/` 和 site-and-content 搬回个人仓（#6、#7，ADR 0040）；用户觉得根目录作为独立项目不合理，又收进 `packages/` workspace（#10，ADR 0041）。之后用户追问要不要 `apps/` 同级、要不要 `packages/` 这层，对照了 openai/codex 的布局，暂时保留 `packages/`。README 优势列表加「知识透明、零依赖、零运维」（#5）。
- **私仓改名与改造**：`edges-private` 改名 `edges-brain-viruspc-private`（edges-brain-viruspc#335–#337、框架 #12）；Mac 上那份 clone 由 IT资产管理改 remote。随后开卡把私仓改造成 Edges 结构（#339），grill 两轮。用户定了「一个大脑两个仓」、默认写公开仓、敏感的才进私仓，两边不互相登记。
- **Compose 改成 git submodule（Coding Agent 专家 → 全栈开发专家）**：
  - 用户问 compose 拉取失败会不会整体失败，于是有了 #13（逐条跳过并汇总、stderr 打 warning）。
  - 接着发现 AGENTS.md 里写的是本机绝对路径，讨论后改成 git submodule，命令收成 add / list / update（个人仓卡 #338，框架 #14，ADR 0042，取代 ADR 0039 里「不用 submodule」的结论）。
  - 新建私有根仓 `edges-workspace-viruspc`，用新 Compose 挂两个大脑。用户发现 Compose 区块挂在 AGENTS.md 上和其他模块不一致，几轮 grill 后定为：Compose 入口融合进 `.harness/compose/README.md`（继承 README 节点，不另造虚拟节点），并加通用的 `--exclude <模块>` 过滤（#15、#19，ADR 0043）。
  - 「模块形态一致、方便插件化」作为目标写进框架仓 CLI 的 project memory（#18），插件化开卡进 backlog（#17）。
- **CLI 报错排查（全栈开发专家）**：Coding Agent 专家用 0.2.3 跑 tasks 时报 `Missing referenced node: teaching/.harness/memory/users/README.md`。复现后确认框架仓 main 已修，只是 npm 上还是 0.2.3。
- **卡片流程**：用户问任务结束时卡会不会补结果，提出状态流转时由 CLI 自动追加进展段（框架 #16 卡）；又提出出任务卡和技术方案都给 html 页审阅（个人仓 #340，开着）。
- **Grok Bot 例行**：「合并后自动重编译」「skill 合入即同步」两条 routine 跟着框架仓每次合入重编译 CLI、同步本机 skill；用户要求把 box 和两台 Mac 上的 edges 目录全部按新布局重置。其余是问答：个人项目与公司项目重叠时怎么处理、要不要开源；vercel skills 与跨工具 plugin；sql2hive；模型 Flash 版。
- **其他**：通用-辅助-2 帮用户在 Mac 上装 iOS 模拟器运行时、往模拟器装测试包；通用答了一个闲聊问题；记录员收到一条误发的拆仓进度，没动看板。

## 决定

- 个人仓（edges-brain-viruspc）是长期主干，不归档；系统只往外拆成新仓，框架仓沿用 `VirusPC/edges`（R6，#328；本 PR 在个人仓补回这条记忆）。
- 个人仓保持公开、继续脱敏，但 commit 历史不刻意脱敏；`posts/`、site-and-content、teaching 部署在个人仓，`/tasks/` 和 artifacts 预览由框架仓部署。
- 框架仓代码目录收进 `packages/` workspace，旧路径硬切，用对照表说明（ADR 0040、0041）。
- 私仓定位为「一个大脑两个仓」里的私密一半，默认写公开仓，敏感的才写私仓，两仓不互相 Compose 登记；另建私有根仓 `edges-workspace-viruspc` 挂两个大脑。
- Compose 底层用 git submodule，只留 add / list / update，路径只允许相对；入口是 `.harness/compose/README.md`，用 `--exclude` 过滤模块（ADR 0042、0043）。
- 任务卡开卡从简：先写背景、目标和已定前提，细节 grill 后补（用户「开卡不用想这么多」）。
- 框架仓新版本暂不发 npm，先用源码跑（用户 00:10）。

## 卡住了什么

- **npm 仍是 0.2.3**：框架仓 main 上已有 `Missing referenced node` 的修复，以及 #14、#19 两个不兼容改动（compose 命令变了），都没发版。本机 skill 已经同步到 main 的写法（`edges-compose` 0.2.0），但 npm 装的 CLI 还是 clone/pull/push 那套，两边对不上。
- 待用户点头合并：个人仓 #340、框架仓 #20。
- 私仓改造卡（#339）grill 到 R2，还没落地。
- 任务记录员在 #20 里记了两件待定：工作空间里的 `edges-compose` skill 还是 0.1.0，需要重装；框架仓里约 20 处历史文字还提到个人仓名。

## 下次做什么

- 决定什么时候发框架仓新版 npm，发版前确认 Trusted Publishing 确实对上新仓。
- 处理 ADR 0039 撞号（见下）。
- 审本 PR：一条项目记忆、一条反馈记忆、一篇笔记。
- 决定 #332 移走的根目录记忆里，哪些应该回到个人仓（见注意事项）。
- 延续项：撤销 stage-only token、ECS 旧目录、npm 审批收紧，状态见下。

## 上次遗留项跟进

- **Deploy 经 ghproxy 拉代码返回 502**：已恢复。个人仓 Deploy 从 10-19 晚上起连续失败（上次复盘记为约 21:23 起），10-20 10:13（#297 合入那次）起恢复成功，之后窗口内除一次被取消外每次都成功。ECS 检出的 origin 仍经 ghproxy 镜像（拆仓时改指向 edges-brain-viruspc，#331 把它固定进 workflow）。05:15 前后 `/teaching/cloud-coding-agent/`、`/teaching/`、`/tasks/` 都返回 200。依赖镜像这件事本身没变，以后可能再坏。
- **#297 的 ADR 0039 撞号**：没解决。#297 已于 10-20 10:13 合入（`655e5323`），没改号。现在两份 0039 都在框架仓 `VirusPC/edges` 的 `docs/adr/`：`0039-compose-worktree-and-sync.md` 和 `0039-pi-client-sandbox-read-scope.md`。之后新增的 ADR 已经编到 0043。这是框架仓的事，本 PR 不碰，需要在框架仓另开 PR 改号并同步引用。
- **npm 发布审批能被代理代批**：没变。新框架仓的 `npm-publish` 环境照搬了原配置：必需审批人只有用户本人，没开「禁止自审」。代理只要用用户的 gh 身份，仍然能自己批。窗口内没有发版，也没人讨论收紧。
- **stage-only token 撤销**：没有处理记录。box 上 `NPM_TOKEN` 环境变量仍然存在（只看了变量名）；npm 上那个 token 撤销了没有，从这里核对不了。
- **ECS 上两个旧目录**：窗口内没有处理记录。拆仓后 ECS 上新增了框架仓检出 `edges-framework`，个人仓检出仍在原路径；那两个未进 git 的旧目录没人提过。

## 注意事项

- **旧链接失效**：`VirusPC/edges` 这个名字被新框架仓占用后，GitHub 不再把旧仓的链接重定向到 edges-brain-viruspc。往期日复盘（包括 10-20 那篇）里写成 `github.com/VirusPC/edges/pull/<N>` 的链接，N 大于 20 的现在打开是 404（实测 #290、#321）；N 在 1–20 之间的会打开框架仓里不相干的 PR。按 `projects/routines/README.md`「带日期的历史记录保留旧名，不回改」的约定，本篇不回改往期，只提醒：查拆仓前的 PR 时把仓库名换成 `edges-brain-viruspc`。私仓旧名没有被占用，重定向仍有效。
- **根目录记忆被一起移走**：#332 删个人仓系统副本时，把根 `.harness/memory/feedbacks/` 整个删了，根 `projects/` 只剩一条。10-20 PR（#321）入库的三条反馈记忆和「个人仓是长期主干」那条，现在只在框架仓 `VirusPC/edges` 里。本 PR 只补回「个人仓是长期主干」（用户当时明确说记在个人仓）。`feedback_retro_comments_in_separate_file` 管的是复盘目录，而复盘只在个人仓；是否迁回由用户定。
- **框架仓里那条主干记忆的措辞**：框架仓 `.harness/memory/projects/project_personal_repo_is_trunk` 正文里的「本仓」指个人仓，在框架仓里读会误解；卡片路径也还写着 `in_progress`。这条记忆归框架仓管，本 PR 不改，建议在框架仓删掉或改写。
- **放错仓的卡**：「Compose 底层改用 git submodule」卡（edges-brain-viruspc#338）讲的是框架 CLI，却开在个人仓的 `edges-extensions` 项目里；实现走的是框架仓 #14。任务记录员也发现框架仓里还有一份 in_progress 的拆仓卡副本，应以个人仓 done 的那张为准。这两处都属于看板整理，本 PR 不动。
- **SKILL 里的现行说法过时**：`shared-extensions/AGENTS.md` 还写着「接入或操作 Edges 的能力……去 `extensions/`」，个人仓现在已经没有 `extensions/`。周复盘 Skill 还写着「回顾 VirusPC/edges」（见下一条）。
- **routine 里的旧仓名**：日复盘的 `SKILL.md`、`schedule.md` 已经用新名 `VirusPC/edges-brain-viruspc` / `edges-brain-viruspc-private`，没有旧名残留。`weekly-retrospective/SKILL.md` 第 3、12 行仍写「VirusPC/edges 上一个自然周」，现在会被理解成新框架仓；`projects/routines/README.md` 的改名对照只写了私仓那条，没写 edges → edges-brain-viruspc。按要求只报告，没改。
- 日复盘 SKILL 第 1 步写的是用 ReadTranscript 抓取、用云端 Agent 开 PR；这次输入是已落盘的 jsonl，PR 用 `gh` 开。
- 本 PR 只新增文件和登记索引，和开着的 #340（新增一张任务卡）不改同一个文件，预计不冲突。

## 建议补充内容清单

- 记忆（project，根作用域）：个人仓是长期主干、不归档，系统只往外拆成新仓；补了「旧 PR 链接要换成新仓名」。来自全栈开发专家拆仓 R6，用户说「值得记一个 memory？for 个人仓」。写入：`.harness/memory/projects/project_personal_repo_is_trunk/INDEX.md`（`edges memory remember`，`.harness/memory/projects/README.md` 已登记）。
- 记忆（feedback，`shared-extensions` 作用域，html-plan skill 所在层）：给用户的 html-plan 审阅页整页用中文，让子代理生成时在 prompt 里明说。来自 00:59「网页里为啥还是说英语？说中文」，以及 13:56 英文卡片后用户回「中文」。写入：`shared-extensions/.harness/memory/feedbacks/feedback_html_plan_pages_in_chinese/INDEX.md`（同上，已登记；只改 `.harness/memory/`，按本层约定不升版本）。
- 笔记：跨工具 skill 与 plugin 的「一处编写，多处安装」——vercel skills 装 GitLab 源、主副本加软链接、plugin 和 hooks 为什么没法通用、社区方案及当时的流行度。来自 Grok Bot 17:19–18:07 的问答。写入：`notes/2026-10-21--跨工具-skill-与-plugin-的一处编写多处安装/INDEX.md`（`edges notes create`，`notes/AGENTS.md` 已登记）。
- 不做（属于框架仓 `VirusPC/edges`，只在这里记）：「开卡从简——先写背景、目标和已定前提，细节 grill 后补」的反馈。依据是 17:15「开卡不用想这么多」，以及 10:40、01:27 两次同样的做法。任务卡写法由框架仓的 conversation-to-tasks skill 统一维护（框架仓 `project_task_separate_facts_from_idea` 明确不在别处另存模板），应在框架仓改 skill 或记忆，本 PR 不往框架仓开。
- 不做（框架仓）：ADR 0039 改号、框架仓那条主干记忆的措辞、框架仓里的拆仓卡副本。理由见上文。
- 不做：拆仓 R1–R6 的决策过程、私仓改名、平铺、packages 化、Compose submodule 与 README 入口。已由个人仓 #323–#339、框架仓 #1–#19 的任务卡和 ADR 0040–0043 记下。
- 不做：「任务卡改在 box 本地用 CLI 落库，不再起云端 Agent」（10:34 用户对任务记录员说）。这是任务记录员自己的操作方式，它已经存进自己的记忆；放进仓库的话属于框架仓的看板约定，用户没有说要推广到所有助手。
- 不做：状态流转自动追加进展段、任务卡用 html 审阅、`.harness` 模块插件化。已分别开卡（框架 #16、个人仓 #340、框架 #17），模块一致性原则已写进框架仓 project memory（#18）。
- 不做：git submodule 的行为问答（只拉一层、`--recursive` 不防循环、浅克隆、`update --remote` 后要提交指针）。结论已经体现在 ADR 0042 和 Compose 实现里，其余是通用 git 知识。
- 不做：框架仓目录对照 openai/codex 的讨论。用户最后没改结构，也没要求记。
- 不做：`Missing referenced node` 排查。原因是 0.2.3 早于修复，main 已修，只等发版，已写进「卡住了什么」。
- 不做：个人项目与公司项目重叠、归属和开源的咨询。属于和雇主相关的个人事务，用户只是咨询，没有做决定；私仓正在改造（#339 未落地），这次也不往私仓写。
- 不做：iOS 模拟器、sql2hive、模型 Flash 版等一次性问答，以及本机 clone 的 remote 调整（IT资产管理已更新台账）。
- 私人内容：0 条，edges-brain-viruspc-private 未开 PR。
