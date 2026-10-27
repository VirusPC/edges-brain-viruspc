# 2026-10-22 日复盘

## 范围

时间窗：2026-10-21 05:09 至 2026-10-22 05:09（Asia/Shanghai）。原始对话已按助手落盘在本机 `/workspace/daily-scan/2026-10-22/`（按时间正序的 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- 读到的助手（4 个）：全栈开发专家（499 条）、Grok Bot（492 条）、任务记录员（148 条）、IT资产管理（20 条）。其余助手窗口内没有对话。
- 日复盘自己窗口内的对话没有落盘，按事实补记一条：10-21 用户确认 `VirusPC/edges-workspace-viruspc` 是 Compose 工作区根（挂公开脑、私密脑），日复盘以它为入口，先读它的 `AGENTS.md`，业务内容的 PR 开到挂进来的子仓，不写工作区根。5:00 定时任务的交接文案已经按这个改了。本篇按这个入口执行：先读工作区根 `AGENTS.md`，候选写进公开脑。
- 局限：
  - 记录里的时间只精确到分钟，同一轮里的多条消息共用该轮开始的时间。
  - 全栈开发专家 02:39 给任务记录员发了一条同步（让它更新 #348 那张卡），任务记录员在窗口内没有再出现，不知道它处理了没有。
- 去重依据：
  - 窗口内各助手自己开并合入的 PR 不重复，包括框架仓 #20–#27、公开脑 #340 和 #342–#346、私密脑 #1–#4、工作区 #1。
  - 开着的 #341（10-21 日复盘）、#347（跨机保险柜卡）、#348（私密脑改造卡挪 done）不重复。
  - 「保持简单，不加额外机制」已经写进框架仓 ADR 0045 和项目记忆 `project_compose_checkout_writable`；「叶子只登记到内容面 README，不回落到 AGENTS」已经写进 ADR 0046。这两条都不重复。
- 工具说明：
  - 记忆和笔记用 box 上的 `edges` 写入。它链到框架仓 main `e85c235` 的源码构建（0.2.4 加上 #26、#27），执行的是 `memory remember` 和 `notes create`。本篇 `INDEX.md` 手写。
  - PR 用 `gh` 在本机新 clone（分支 `daily/2026-10-22`）上开，没有按 SKILL 用 Cursor 云端 Agent。

## 实际怎样

- **看板收尾（任务记录员、全栈开发专家）**
  - 上午 09:14–09:50 连着合了框架仓 #20、#21、#24 和公开脑 #340、#342、#343、#344。
  - 「Compose 底层改用 git submodule」卡其实早就上线了，这次补了进展，挪到 done。
  - 框架仓两份 ADR 0039 撞号的问题理顺了：Compose worktree 那份保留 0039，pi 沙箱那份改成 0044（框架仓 #21 开卡，#23 实现）。
  - 框架仓清掉了个人仓名（#22）。retrieval eval 现在默认指向 `example/personal-brain`，跑全量要设环境变量。
  - 工作区里的 `edges-compose` skill 重装到 0.2.0。
  - 新建 `deepseek-harness` 项目，开了一张「通读 DeepSeek Harness recipe 并整理笔记」卡（#343）。
- **公开仓不互挂（任务记录员 → 全栈开发专家）**：用户说「不用互挂，不是有一个根仓库放这俩吗」，公开脑里旧的 Compose 登记和 `compose clone` 文档都清掉了（#345），没有开卡。
- **npm 0.2.4（Grok Bot）**
  - 用户要发 patch，授权助手自己合 PR、打 tag、批发布。
  - 第一次上传返回 404。查下来是拆仓后 npm Trusted Publisher 认的还是旧仓库的身份。用户删掉重加以后，12:13 发布成功。详见本 PR 的笔记。
  - 用户还问了 weekly downloads 为什么这么多，答案是镜像站和扫描机器人在拉包。
- **Compose 子仓可写（Grok Bot）**
  - 用户觉得挂进来的仓不能写「很难受」，而且 submodule 本来也拦不住谁去写，要求「核心是保持简单，不加额外机制」。
  - 框架仓 #26 删掉了只读特例，写进 ADR 0045。用户追问代码以后，「父索引停在最内层检出」和「空检出写入报错」两处多余的防护也删了。
  - 随后派云端 Agent 盲测：从工作区入口写一条笔记，看会不会写进子仓。结果写进了公开脑（#346、工作区 #1）。不过落点是 Agent 读规则自己判断的，CLI 不会自动路由。
- **.edges 模块插件化（Grok Bot）**
  - 第一轮，助手和 Grok 4.7 xhigh 云端 Agent 都建议先别做插件系统。
  - 用户纠正了方向：框架和模块实现分离，方便扩展和定制；「hooks 是普通函数而已」；要「plugin + 生命周期函数」，插件只从 `.edges/plugins/` 加载。
  - 设计稿已经发到 Artifacts 预览，10-28 到期。里面有五个 grill 问题等用户回答。
- **工作电脑上的项目初始化（全栈开发专家）**：在一个空的工作仓里跑 `edges init`。一开始用了本机旧的 0.2.3，装进的 compose skill 还是旧命令，用户指出「应该用最新命令吧」。升到 0.2.4 重装以后推上远端，旧的半成品 clone 按用户要求删掉了。
- **工作区与 Mac mini（全栈开发专家、IT资产管理）**
  - 工作区又挂上了框架仓 `edges`（`142d46c`）。
  - Mac mini 上装好了工作区和三个子模块。私密脑的 HTTPS 拉取失败，改用本机 SSH URL。
  - Mac mini 没有 Artifacts 发布配置。IT资产管理从 box 上已有的配置拷了一份过去，token 没进聊天。
  - 用户想把 token 发到 Artifacts 页面上看，助手拒绝了；最后按用户要求写进了 Mac mini 本机的备忘录。
- **跨机保险柜（全栈开发专家 → 任务记录员）**：用户想到可以开一个私有仓专门在各机器之间传配置和密钥，「比备忘录和你通用」，并定下挂在工作区的 Compose 下。卡已经开好（#347），还没合。
- **私密脑改造（全栈开发专家）**
  - 用户发现私密脑还是旧样子（有 `knowlege/`），问「我记得不是说把这个改造一下吗」。助手承认之前被别的事打断，没做完。
  - 用户说「快点做完吧，我感觉都不用 Grill」，之后连续合了私密脑 #1–#4：套上 `.edges/`，平铺目录，按公开脑对齐索引，notes 和 projects 收成日期叶子，入口改到仓根 `notes/README.md` 和 `projects/README.md`。
  - 过程中助手先后说错了两次：一次说 `AGENTS.md` 本层要挂 README，一次说叶子清单放在 `.edges/notes`。用户提醒「格式要求很严格的」「参考公开仓库改」，才改对。
  - 由此查到 CLI 本身的问题：`init` 和 `create` 登记在不同的文件里，没有清单时还会退回去挂到 `AGENTS.md`。用户说「这完全不符合数据模型」「其他模块如有类似问题也一块儿改掉」，框架仓 #27 修了这个问题（ADR 0046），02:45 合入。
- **其他**：X 书签定时任务的写入目标改成了公开脑；tasks-review-app 构建路径那条是误报。

## 决定

- 公开仓之间不互挂，Compose 只挂在私有工作区根（#345）。
- 工作区根是沉淀入口，正文写进挂进来的子仓（Grok Bot 13:28 用户说「把这个地方当做入口」，日复盘也确认了。本 PR 记成项目记忆，并补进日复盘 SKILL）。
- 被组合的仓库可写。原则只有一句：保持简单，不加额外机制（ADR 0045）。
- 内容叶子（notes、projects、tasks）只登记在内容面的 README 组织清单。清单不存在就先建出来，不回退到 `AGENTS.md`（ADR 0046）。
- ADR 编号：0039 留给 Compose worktree，pi 沙箱那份改成 0044。
- 0.2.4 按 patch 发布，尽管里面有不兼容改动。这次合 PR、打 tag、批发布都授权助手自己做。
- 插件化方向是「plugin + 生命周期函数（普通函数）」，只从 `.edges/plugins/` 加载。细节还要 grill。
- 跨机保险柜单独开一个私有仓，不混进私密脑，挂在工作区的 Compose 下。聊天和 Artifacts 预览里都不贴明文 token（#347 的前提）。
- 私密脑改造跳过 grill，按已定的默认直接做，结构以公开脑为准。

## 卡住了什么

- **插件化设计的五个 grill 问题还没回答**。另外第 5 题和 #27 冲突：第 5 题倾向 A，把 notes、projects 的叶子挪到 `.edges/notes`；但 #27 和 ADR 0046 已经定成写在仓根 `notes/README.md`。回答 grill 时要先说清楚以哪个为准。
- **npm 还是 0.2.4**，不含 #26（子仓可写）和 #27（叶子登记）。要不要发 0.2.5 等用户定。工作区里框架仓的指针还停在 `801460d`。
- **公开脑的老笔记还登记在 `notes/AGENTS.md`**，要迁到 `notes/README.md`。全栈开发专家说下一步就做，窗口内还没开 PR。
- #347（跨机保险柜卡）和 #348（私密脑改造卡挪 done）等用户说合。

## 下次做什么

- 回答插件化设计稿里的五个问题（先把第 5 题和 ADR 0046 的关系理清）。
- 决定是否发 0.2.5。发了之后升工作区里的框架仓指针，各台机器也升级。
- 合 #347、#348。全栈开发专家接着做公开脑 notes 清单迁移，然后 grill 保险柜仓并建仓。
- 审本 PR：三条项目记忆、一篇笔记、日复盘 SKILL 里加的一段。
- 延续项：撤销 stage-only token、ECS 两个旧目录。窗口内都没有处理记录。

## 上次遗留项跟进

- **ADR 0039 撞号**：已解决（框架仓 #23，`cffe757`）。
- **npm 发版**：0.2.4 已发，Trusted Publisher 已经对上新框架仓（删掉重加以后实际发布了一次，验证通过）。
- **#340、框架仓 #20**：都已合入。
- **私仓改造卡**：已落地（私密脑 #1–#4），卡挪 done 的 #348 等合。
- **工作区 `edges-compose` skill 重装、框架仓历史文字点名个人仓**：都已处理（`8e648b3`、框架仓 #22）。
- **npm 发布审批能被代理代批**：这次是用户明确授权助手自己批的，但机制本身没变。

## 注意事项

- 本 PR 的笔记是用带 #27 的 CLI 建的，所以登记进了公开脑 `notes/README.md` 新加的 `project-entries-local` 区块，老笔记还在 `notes/AGENTS.md`。全栈开发专家做迁移时要把这一条也算上，并处理 `notes/README.md` 里过时的「待处理想法」说明，避免两边冲突。
- 工作区根 `AGENTS.md` 开头还写着「挂载公开脑与私密脑」，但 10-22 起也挂了框架仓 `edges`，说明落后了。工作区根不归本 PR 写，只报告。
- box 上的 `edges` 链接到 `/workspace/edges/packages/cli/dist/index.js`。02:45 那次自动重编译以后，这个文件丢了可执行权限，直接跑 `edges` 会报 Permission denied。本次改用 `node …/dist/index.js` 执行，没有改文件权限。
- 任务记录员每次在公开脑用 `edges tasks create/status`，都会产生同样的副作用：改写根 `AGENTS.md` 的索引行和 `.edges/tasks/README.md`，新建 `_default/`，还会因为缺 `teaching/.edges/memory/users/README.md` 报错。窗口内至少 5 次，每次都是手动撤掉。#27 合入后有没有变还没核实，像是框架 CLI 的 bug，没有开卡。
- Artifacts 的发布配置现在除了在各机配置文件里，还有一份在 Mac mini 的备忘录里。跨机保险柜建好以后，建议把备忘录里那条删掉。
- 日复盘 SKILL 第 1 步还写着用 ReadTranscript 抓取、用云端 Agent 开 PR；这次输入是已经落盘的 jsonl，PR 用 `gh` 开。

## 建议补充内容清单

- 记忆（project，根作用域）：沉淀以 Compose 工作区根为入口，先读它的 `AGENTS.md`，正文写进挂进来的子仓。来自 Grok Bot 13:28 用户的「把这个地方当做入口」，以及日复盘 10-21 的确认。写入：`.edges/memory/projects/project_workspace_is_deposit_entry/INDEX.md`（`edges memory remember`，`.edges/memory/projects/README.md` 已登记）。
- Skill（日复盘 routine）：在 `projects/routines/daily-conversation-deposit/SKILL.md` 开头补一段「入口是工作区根，PR 开到子仓」。这是上一条在日复盘流程里的落点。5:00 定时任务的交接文案已经改了，但 SKILL 正文还没写。
- 记忆（project，根作用域）：在用户机器上操作 edges 前，先对齐 npm 上的最新版；main 上还没发版的改动，先说明再让用户选。来自全栈开发专家 17:11「应该用最新命令吧」「npm 发包了么」。写入：`.edges/memory/projects/project_use_latest_edges_cli_on_machines/INDEX.md`（同上，已登记）。
- 记忆（project，根作用域）：派云端 Agent 做验证时，验收标准写具体，但不提示答案。来自 Grok Bot 14:03「比你自己去写靠谱」「避免作弊」「你这个需求太模糊了」。写入：`.edges/memory/projects/project_cloud_agent_blind_verification/INDEX.md`（同上，已登记）。根作用域现在没有 feedback 类型（10-21 已经记过），为了不新建类型，记成 project 类型（README 里写明 project 也收项目内的规范）。
- 笔记：拆仓后 npm 可信发布 404 的原因和处理（看仓库身份，不看名字；删掉重加，再重跑失败的 job），顺带记新包下载量虚高的原因。来自 Grok Bot 11:36–12:20。写入：`notes/2026-10-22--拆仓后-npm-可信发布-404按仓库身份认删掉重加/INDEX.md`（`edges notes create`，`notes/README.md` 已登记）。
- 不做：「保持简单，不加额外机制」，以及 Compose 可写的设计。已经写进框架仓 ADR 0045 和 `project_compose_checkout_writable`。
- 不做：叶子登记的数据模型（不回退到 AGENTS，缺清单就建 README）。已经写进框架仓 ADR 0046 和 #27。
- 不做：「AGENTS.md 本层格式要严格，参考公开脑」。这次是对私密脑的一次性纠正，规范本身在框架仓 `CONTEXT.md` 和 ADR 0035，已经有了；框架仓也已经有 `feedback_verify_before_asserting`。
- 不做：「明文 token 不进聊天，也不进 Artifacts 预览」。已经写进 #347 卡的前提，保险柜仓建好以后会有自己的约定。
- 不做：插件化设计。还在 grill，五个问题没回答，现在写就等于替用户做决定。设计稿在 Artifacts 预览上，框架仓已经有插件化的 backlog 卡。
- 不做：公开脑 notes 清单迁移卡、0.2.5 发版卡。前者全栈开发专家已经说下一步直接做；后者要等用户定。
- 不做：tasks CLI 副作用的 bug 卡。属于框架仓，而且 #27 之后有没有变还没核实，只写在注意事项里。
- 不做：工作电脑上那个项目的初始化细节、各台机器上的路径和配置位置。属于工作现场和机器状态，不适合进公开仓；跨机保险柜卡会接手配置分发。
- 私人内容：0 条，edges-brain-viruspc-private 没有开 PR。窗口内的私人相关内容只有机器配置，已经由保险柜卡覆盖。
