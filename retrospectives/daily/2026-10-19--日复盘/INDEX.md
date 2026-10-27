# 2026-10-19 日复盘

## 范围

时间窗：2026-10-18 05:06 至 2026-10-19 05:06（Asia/Shanghai）。原始对话已按助手落盘到本机 `/workspace/daily-scan/2026-10-19/`（按时间正序的 jsonl，永久保留，不入库），本篇只基于这些文件分析。

- 读到的助手（5 个）：Grok Bot（297 条）、任务记录员（634 条）、Agent Memory 专家（15 条）、Coding Agent 专家（59 条）、全栈开发专家（1012 条）。
- 局限：
  - Agent Memory 专家的记录里，10:21 合 #262 的同一轮出现了两遍（重复落盘），按一次计。
  - Grok Bot 21:24 回答「GitHub 主页为什么不显示 npm 包」时，答复停在助手的纯文本里，没有经 SendToUser 发出；用户可能没看到。后来 #277（README 加 npm 徽章）已合入，说明这件事在别处跟进了。
  - 全栈开发专家 03:14 报告「这台电脑的命令行暂时连不上」，之后窗口内只有 #287 推送记录，#289 → #288 → #287 的合并与 `v1.5.0` 打标签不在窗口内。
- 去重依据：main 上已合入的 #266（多客户端接入四条硬边界）、#259（AI Infra 硬件笔记）、#258（harness 读图笔记）不重复；窗口内已经入库的 #273–#286（任务卡、ADR 0036/0037、npm 发布笔记 #283、Deploy 修复笔记 #286、Compose 方案 #270）不重复；开放中的 #287（1.5.0 切版，含把 #283 笔记从 `knowledge/notes/` 挪到 `notes/`）、#288（重合 #208/#211 任务卡）、#289（重合 #208/#211 修复与一条 extensions 反馈记忆）不冲突。
- 上一篇留下的三个开放 PR（`gh` 实时核对）：[#264](https://github.com/VirusPC/edges/pull/264)（`@viruspc/edges` 0.1.0 发布准备）已于 2026-10-18 19:06 合入，用户随后提供了 token，0.1.0 当晚经 stage 批准上线，不再等 token；[#262](https://github.com/VirusPC/edges/pull/262)（ADR 0035 本层材料索引）已于 2026-10-18 10:21 合入；[#265](https://github.com/VirusPC/edges/pull/265)（Compose 节点 CLI）已于 2026-10-18 13:59 合入。
- 工具说明：`edges` 不在 PATH 上，本次用本机仓库已编译的 CLI（`node extensions/cli/dist/index.js`，0.2.1）执行 `notes create`、`memory remember`、`tasks update`，索引由 CLI 自动登记；本篇 `INDEX.md` 手写。PR 用 `gh` 在本机独立 worktree（分支 `daily/2026-10-19`）上开，没有按 SKILL 用 Cursor 云端 Agent。

## 实际怎样

- **edges CLI 正式发到 npm（Grok Bot → 全栈开发专家）**：
  - 上午 #264（`@viruspc/edges` 0.1.0 打包）因 #262、#265、#267–#269 连续合入反复冲突，云端 Agent 先后三次同步 main，并修掉 CodeRabbit 指出的发布拦截漏洞（只看 `npm_execpath`）。19:03 用户说「npm 包的处理下」，19:05 合入。
  - 19:22 用户提供 npm token；直接 publish 返回 404。用户提醒「现在应该是 stage only」，助手查到 npm 新规（stage-only token 只能 `npm stage publish`，需网页 2FA 批准），改用 `pnpm pack` + `npm stage publish`。19:29 用户批准，0.1.0 上线。
  - 用户问「从 0 使用 edges，只要一个 CLI 够吗」→ 结论是还缺 skills → 开卡 #273 → 全栈开发专家 grill（#274、#275，ADR 0036：`edges init` 经 vercel skills 薄封装装随包 skills）→ 实现 #276，6 个无关 skill 移到 `shared-extensions/`，相关版本标签升到 4.0.0。
  - 23:07 用户要求再发版并配 GitHub Actions：0.2.0 先 stage（#278），同时三轮 html-plan grill 定下 Actions 方案（只推 annotated tag `@viruspc/edges@x.y.z`、OIDC Trusted Publishing、先 test 后经 `npm-publish` 环境审批、版本读 `package.json` 删 `version.ts`），实现 #281，修复 #282（checkout 把 annotated tag 剥成轻量引用）。
  - 发布中踩坑：环境名拼成 `npm-publush` 导致审批没挂上；npm 返回 404；0.2.0 被已 reject 的 stage 占住（E409）→ 改发 0.2.1（#284），02:03 经 Actions 发布成功，OIDC 与 provenance 通过。笔记 #283 合入（落在旧的 `knowledge/notes/`，#287 里正挪回 `notes/`）。
- **domain 分层重构与 Compose 虚拟节点（任务记录员）**：#265 合入前补了 `compose unregister`（用户在 add/remove 与 register/unregister 之间最终保留后者）、`BaseNode` 成员排序、`internal/` 改名 `agents/`、压缩版 `InternalNode`（393 行，低于抽出前 530 行），并删掉 purpose/index-group。随后 #267（core 上移 `domain/core`）、#268（块语法机制进 core、文法留 models）、#269（`classify.ts` 并回 layout，约定常量进 `config/`）、#270（Compose 方案）、#271、#272（ComposeNode 与根级 `--with-composed`，默认检出 `~/.edges/composed/<name>`）全部合入。
- **Deploy 修复（Coding Agent 专家）**：#264 合入后 Deploy 从约 19 点起连续失败（`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`）。根因是 ECS 上 Corepack 在缺 `packageManager` 时用了 pnpm 9.15.9；#285 固定 `pnpm@10.34.7` 后 02:05 Deploy 转绿；笔记 #286 合入。
- **整仓 1.5.0（Grok Bot → 全栈开发专家）**：用户要求把根 CHANGELOG 切成 1.5.0。#287 开出后用户指出「有遗漏、目录也不合理」，补齐遗漏并把「复盘与 routines」提为第二节。核对时发现 #208/#211 从未进 main（叠层分支问题），用户要求「先把问题都修了再打版」→ #288（卡）、#289（重新实现）。03:01 用户授权全栈开发专家修完后按顺序合并并打 `v1.5.0`，需要拍板的事和 Grok Bot 商量。
- **其他**：#262（ADR 0035）10:21 由 Agent Memory 专家合入；Grok Bot 侧 skill 同步与 CLI 重编译 routine 对每个合入 PR 都跑了一遍。日复盘自身在窗口内只合入 #266。

## 决定

- npm 发布以后只走「推 annotated tag → GitHub Actions（OIDC）→ `npm-publish` 环境审批」；npm 侧 Publishing access 设为要求 2FA 并禁止 token；CLI 版本号读 `package.json`。
- 安装 skills 只做 vercel skills 的薄封装，`--skill '*'` 写死，`--` 之后参数原样透传，有问题一律参照 vercel skills 的行为（ADR 0036）。
- domain：core 只放节点骨架与通用块机制，不认识具体类型；约定常量进 `config/`；新增文件不造新概念（本 PR 记为反馈记忆）。
- Compose：命令名保留 `register`/`unregister`；默认查询不进组合仓库，加根级 `--with-composed` 才进。
- grill-with-docs 每一轮提问、以及每个实现 PR，都附 html-plan 审阅页（本 PR 记为反馈记忆）。
- 1.5.0 等 #208/#211 修回 main 后再合 #287 打 `v1.5.0`。

## 卡住了什么

- #287、#288（draft）、#289 截至本篇写作仍 OPEN、可合并；`v1.5.0` 标签与 GitHub Release 未打。全栈开发专家 03:14 后报告本机命令行连不上，后续是否推进要看它的下一轮。
- ECS 上还留着两个未纳入 git 的旧目录（`extensions/clis/`、`extensions/cli/src/tasks/`），助手问过要不要清理或开卡，用户没回复。
- 本机 box 还是 Node 22.14，低于包声明的 `>=22.20.0`，装包时会有 EBADENGINE 警告。

## 下次做什么

- 审合 #289 → #288 → #287，再在合入提交上打 annotated `v1.5.0` 并开 GitHub Release（已授权全栈开发专家执行）。
- 决定 ECS 旧目录的处理（清掉或开卡）。
- 发布已改走 OIDC 且 npm 侧禁 token，可以去 npmjs.com 撤销当天手动发布用的 stage-only token，并清掉 box 上对应的环境变量。
- 审本 PR 的三条反馈记忆与 routines 卡补充；routines 是否升为 `.edges` 模块，等 grill 时再定。

## 建议补充内容清单

- 笔记：html-plan 的来源（Anthropic 社区插件仓库，非第三方索引站）、Respond 需手动粘贴、与 md plan 的分工，以及和 grill-with-docs 的配合。去处：`notes/`。写入：`notes/2026-10-19--html-plan-审阅页与-grill-with-docs-的配合/INDEX.md`（`notes/AGENTS.md` 已由 `edges notes create` 登记）。
- 记忆（feedback，根作用域）：grill-with-docs 每一轮提问和每个实现 PR 都附 html-plan 审阅页；用户当时明确说「memory 里记下」，但只记进了助手的个人记忆，仓库里没有。写入：`.edges/memory/feedbacks/feedback_grill_rounds_as_html_plan/INDEX.md`。
- 记忆（feedback，extensions 作用域）：新增文件不造新概念、文件名一眼看懂职责、符合语义；同时写明「简单命名不等于降低分层质量」。写入：`extensions/.edges/memory/feedbacks/feedback_new_files_no_new_concepts/INDEX.md`。
- 记忆（feedback，根作用域）：叠层 PR 的底层 squash 进 main 前确认上层已合入，合完把剩余上层改指向 main；验收修复以 main 为准，不只看 PR 状态。来自 #208/#211 丢失这件事，不是用户原话，请审阅时确认是否保留。写入：`.edges/memory/feedbacks/feedback_stacked_pr_merge_order/INDEX.md`。
- 任务（补充已有卡）：用户提出「routines 有潜力升为 `.edges` 模块」，补进已有 backlog 卡「Routines 模块：Skill 与调度文件分离」的补充想法，完成标准留待 grill。写入：`.edges/tasks/edges-routines/backlog/2026-10-11--Routines-模块Skill-与调度文件分离/INDEX.md`（`edges tasks update`）。
- 不做：npm 发布全流程（手动 stage 与 Actions）笔记。已由 #283 合入，#287 负责挪到 `notes/`。
- 不做：Deploy pnpmfileChecksum 修复笔记。已由 #286 合入。
- 不做：安装 skills、npm Actions 的设计决定。已在 ADR 0036、0037 和对应任务卡里。
- 不做：domain 分层、Compose 的设计决定。已在 `extensions/cli/src/domain/README.md`、#270 方案与 #265 带入的 `feedback_scope_super_all` 等记忆里。
- 不做：「CodeRabbit 常提文档覆盖率不足，加条多写注释的记忆」。用户随后否认了助手的理解（「不是」），真实意图不明，写了就会编造。
- 不做：ECS 旧目录清理任务卡。用户没决定要不要做，背景和目标不足。
- 不做：#208/#211 重合任务卡。已由 #288 开出。
- 私人内容：0 条，edges-private 未开 PR。
