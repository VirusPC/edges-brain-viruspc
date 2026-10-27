# 2026-10-20 日复盘

## 范围

时间窗：2026-10-19 05:06 至 2026-10-20 05:06（Asia/Shanghai）。原始对话已按助手落盘到本机 `/workspace/daily-scan/2026-10-20/`（按时间正序的 jsonl，永久保留，不入库），本篇只基于这些文件分析。

- 读到的助手（9 个）：Grok Bot（727 条）、通用（354 条）、通用-辅助（257 条）、通用-辅助-2（9 条）、任务记录员（54 条）、Agent Memory 专家（450 条）、Coding Agent 专家（358 条）、全栈开发专家（312 条）、周复盘（433 条）。
- 日复盘自己窗口内的对话没有落盘，下面按事实补记：11:17 合入 [#290](https://github.com/VirusPC/edges/pull/290)（10-19 日复盘）；11:28 合入 [#292](https://github.com/VirusPC/edges/pull/292)（html-plan skill 进 `shared-extensions/skills/html-plan`），并在合并提交 `31a9c8ee` 上打了 annotated tag `shared-extensions@4.1.0`；回答了 Agent Memory 专家关于 html-plan 出处的询问；22:14 回答用户「还有什么要做」。
- 局限：
  - 记录里的时间只精确到分钟，同一轮里的多条消息共用该轮开始的时间。
  - 好几处助手把结果写成了纯文本（没经 SendToUser），系统随后提醒补发。本篇以最终发给用户的内容为准。
  - 窗口内另有一个开放 PR [#320](https://github.com/VirusPC/edges/pull/320)（Git-native Agent Workspace 定位笔记，02:46 开），不来自上面任何一个助手的对话，来源不在本次扫描范围内。
- 去重依据：
  - 已合入的 #290、#292、#266 不重复。
  - 窗口内各助手已自己开并合入的 #287–#319（任务卡、ADR 0038/0039、笔记、调研、教学课程、CLI 修复与发版）不重复。
  - 开放中的 #297（pi 沙箱）和 #320 不重复。
- `gh` 实时核对（05:20 前后）：
  - [#289](https://github.com/VirusPC/edges/pull/289) 09:32 合入（`d918cf79`），[#287](https://github.com/VirusPC/edges/pull/287) 09:33 合入（`5bce0841`），[#288](https://github.com/VirusPC/edges/pull/288) 09:36 合入（`8776b3c5`）。
  - annotated tag `v1.5.0` → `5bce0841`（09:34 打）；GitHub Release「Edges 1.5.0」09:34 发布，非草稿，标为 Latest。
- 工具说明：
  - 用的是 PATH 上的 `edges` 0.2.3，执行 `memory remember`，索引由 CLI 自动登记；本篇 `INDEX.md` 手写。
  - PR 用 `gh` 在本机新 clone（分支 `daily/2026-10-20`）上开，没有按 SKILL 用 Cursor 云端 Agent。

## 实际怎样

- **1.5.0 收尾（全栈开发专家 → 任务记录员）**：早上全栈开发专家发现自己在 CodeRabbit 过完后一直停着没合，09:32–09:36 依次合入 #289、#287，打 `v1.5.0`、发 Release；任务记录员合入 #288，并把「重合 #208/#211」卡挪到 done。用户追问原因，助手的解释是把「CI 还在跑」和「已经可以合」弄混了。
- **检索评测与可观测（Agent Memory 专家 → 任务记录员 → 全栈开发专家）**：
  - #291：`codex exec --json` 事件流落盘，并经 OTLP 上传 Langfuse。踩到的问题依次修掉了：Cloudflare 拦默认 UA；按「配置 + 时间戳 + 短随机串」补 session；打开 reasoning summary。
  - grill（中途按用户要求改用 html-plan 出审阅页）后做了 #293：上报抽到 `.edges/observation/langfuse_sink/`，接口叫 `TraceExporter`，ADR 0038；顺手关掉 Codex 的 stdin。
  - #294：接入 pi client（MiniMax-M3），修了缓存 token 重复计入 total 的问题。
  - 真机冒烟时发现 pi 没有沙箱，会跑出被测副本 → #295 开卡，#296 改成 in_progress。
  - 全栈开发专家 grill 后按用户「最通用、最简单」的要求，用默认工具加 `pi-sandbox`。经三轮独立验证，补了 `denyRead: ["/"]`、`allowWrite` 为空，在 `/bin`、`/lib` 为软链的发行版上自己展开根目录，并加 bash 自检 → [#297](https://github.com/VirusPC/edges/pull/297)，**仍开放**。
- **edges CLI 接入体验（通用、通用-辅助、Grok Bot）**：
  - 用户在 Mac 上装 CLI 后，在一个旧布局业务仓里跑 `edges init` 报错。#304 让迁移器认识平铺的旧 `.memory/` 布局，并修正报错提示，随后发 0.2.2（#305、#306：发布工作流的 pnpm 版本冲突），该仓迁移完成。
  - #303 新增 `edges-onboarding` skill；根 README 改成「把一句话发给 AI」的接入方式。
  - 试用 compose 时发现 `register` 可以不带说明 → #312 改成 `--description` 必填，新增 `edges-compose` skill（beta 0.1.0），随后 #313 → 0.2.3。
  - #302 修 `tasks project list`：只认 README，缺 README 时报错，不自动补。
  - 02:37 用户下 `/goal` 发 0.2.3。助手在 `npm-publish` 环境上代批，0.2.3 上线；box 上的 CLI 也升到 0.2.3，Node 升到 22.20。
- **Compose 与写入后同步（Grok Bot）**：
  - 用户发现 Mac 上本地 Cursor 改完没 push，要求先设计「写入后谁来 commit/push」。
  - 中途长聊了多仓整仓挂载的七类行业方案（submodule、subtree、清单工具、ghq、多根工作区、Dev Container、自研 compose），结论是继续用现有 compose 加 Node Tree。
  - 重新 grill（用户拍板：不要挂载种类；CLI 只写文件，同步走独立命令加 skill；每个主仓一个 worktree，从 worktree push 并开 PR）→ #316（ADR 0039、笔记、任务卡）。
  - 写卡时撞上「已登记但缺失的节点让写入失败」→ #317。
- **Artifacts 与预览（Grok Bot、通用）**：
  - 用户问 `artifacts publish` 是否绑死自己的服务器 → #298（预览服务随 npm 包发布）。
  - 后来用户认为聊天内的预览挡住对话，最好发成 URL 在浏览器看，自建服务也可以不要 → #315「Github Artifacts Preview」。调研后把 Cloudflare Pages 直传、Tunnel + Nginx 两个候选写进卡（#318）。
  - 同晚 #314 开卡「Project 改为分组轴」。
- **调研与学习（全栈开发专家、Coding Agent 专家、Agent Memory 专家）**：
  - pi 生态、云端沙箱 agent 的内核、Vercel 模板源码、OpenCode 生态 → #300。
  - 六课「看懂云端 coding agent 架构」→ #310（`teaching/cloud-coding-agent/`）。
  - 工业界沙箱服务与 SDK 语言 → #311。
  - 评测接云沙箱 → #319 任务卡。
  - Agent 记忆写入与读取触发机制 → #299。
- **周复盘**：2026-10-12 周复盘经用户审阅后合入（#307）。用户要求正文不改，评论另写 `COMMENTS.md`。由此做了 #308（NodeService 硬约束写进 `extensions/AGENTS.md`，#187 卡挪到 done）和 #309（PR 上跑 frozen install）。
- **其他**：几条一次性的个人事务问答（设备、账号设置等），不沉淀。

## 决定

- Task Project 的标题和描述只读 `README.md`；`AGENTS.md` 是系统二入口。缺 README 的项目目录让 `get`/`update` 报错，CLI 不自动补（#302；本 PR 记为反馈记忆）。
- 复盘正文定稿后不改，用户后续评论写同目录 `COMMENTS.md`（#307；本 PR 记为反馈记忆）。
- `compose register` 必须带 `--description`；compose 不分挂载种类；CLI 只写文件，commit/push 走独立同步命令，由 skill 规定何时调用；每个主仓一个 worktree，从 worktree push 并开 PR（#312、ADR 0039）。
- 预览方向：默认走不依赖自建服务的静态托管（Github Artifacts Preview），具体选 Cloudflare Pages 直传还是 Tunnel + Nginx 未拍板（#315、#318）。
- pi 检索评测：用默认工具加最通用的 `pi-sandbox`，越界由沙箱拦，不另做越界检测（#297，未合）。
- Observation 作为共用上报底座，评测只依赖 `TraceExporter` 接口（ADR 0038）。
- `docs/architecture.md` 里的 RAG/PageIndex 保留，那是云端知识库的另一条接入路径（周复盘 COMMENTS）。

## 卡住了什么

- **Deploy 从 10-19 约 21:23 起连续失败**：服务器经 GitHub 镜像拉代码时一直返回 502（`fatal: unable to access ... 502`）。最后一次成功是 21:09（#304）。此后 #310–#319 的合入都没部署上去，教学站 `teaching/cloud-coding-agent/` 05:20 仍是 404。Coding Agent 专家提出每 30 分钟重试，用户没回复。
- **#297 仍开放**：最后一次更新在 15:20，状态待用户审。还剩三处没修，已写进卡：自检只模拟了部分 bash 调用；bash 能看到 MiniMax key（沙箱内不通网）；真实 MiniMax 和 Mac 沙箱都没实测。
- **#297 与 main 的 ADR 编号冲突**：#316 已把 `docs/adr/0039-compose-worktree-and-sync.md` 合进 main，#297 也新增 `docs/adr/0039-pi-client-sandbox-read-scope.md`。合 #297 前要改号（如 0040），并同步卡片和 README 里的引用。
- 一个业务仓里由本地 Cursor 产生的提交还没 push；compose 出来的个人记忆仓连第一次 commit 都没有（23:12 Grok Bot 核对）。写入后同步的设计已落 ADR 0039，但这两处现场还没处理。
- Artifacts 相关旧卡的改口建议（cancel 09-21「专用仓 + GitHub Pages」、降级「预览服务随 npm 包发布」、改口「云端服务统一入口」的 tmp 部分）助手问过，用户没回复，看板没动。

## 下次做什么

- 等镜像恢复后重跑 Deploy，确认教学站课程上线；镜像长期不稳的话，考虑换掉服务器拉代码的方式。
- 审 #297：先把 ADR 改号避开 0039，再决定合不合，合后由任务记录员把卡挪到 done。
- 撤销 npm 手动发布用的 stage-only token，并清掉 box 上对应的环境变量（从 10-19 日复盘延续，窗口内没有处理记录）。
- 决定 ECS 上两个未进 git 的旧目录怎么处理（同上，延续）。
- 决定是否把 `frozen-install` 设为 main 的必过检查（周复盘问过，用户没回复）。
- 审本 PR 的三条反馈记忆。

## 注意事项

- **更正日复盘 22:14 的答复**：当时列的三条待办里，「1.5.0 系列 #289/#288/#287 还没合，也没打 v1.5.0 tag 和 Release」是错的。三个 PR 在 09:32–09:36 已经合入，`v1.5.0` 和 Release 09:34 已发布（见「范围」里的核对）。另外两条（撤销 stage-only token、ECS 旧目录）仍然有效。
- **npm 发布审批可以被代理代批**：ADR 0037 的设计是推 tag 后在 `npm-publish` 环境等人批准。10-20 02:37 发 0.2.3 时，助手用用户的 GitHub 身份自己批了（当时用户下的是「有问题都自己解决，直至完成发版」的 `/goal`，属于授权范围）。但这说明代理手里的身份能通过这道门：只要代理用用户的 gh 凭据，这道人工审批就挡不住代理。要不要收紧（例如审批人另设、或要求只能网页批），需要用户定，本篇没有开卡。
- html-plan 那条反馈记忆已在 main 上，但 Grok Bot 当晚仍两次没按格式出 grill（23:22 手写页面、01:28 纯文字列 Q4–Q6），都是被用户提醒后才改。说明这条规则还没被各助手开工时读到。
- box 的 Node 已升到 22.20（`~/.local`），10-19 日复盘记的「box Node 22.14 低于 `>=22.20.0`」不再成立。
- 本 PR 只新增文件和登记索引，和开放中的 #297（评测、ADR、evaluation 卡）、#320（`notes/` 下一篇新笔记）不改同一个文件，预计不冲突。

## 建议补充内容清单

- 记忆（feedback，extensions 作用域）：CLI 读到不合约定的数据（如必需文件缺失）时报错并写明路径，不自动补文件掩盖问题；只有显式 create 才新建。来自 #302 的讨论。写入：`extensions/.edges/memory/feedbacks/feedback_cli_fail_on_missing_required_files/INDEX.md`（`edges memory remember`，`extensions/.edges/memory/feedbacks/README.md` 已登记）。
- 记忆（feedback，根作用域）：复盘正文定稿后不改，用户后续评论写同目录 `COMMENTS.md`，更正往期也在往期目录加 `COMMENTS.md`。来自 #307 审阅。写入：`.edges/memory/feedbacks/feedback_retro_comments_in_separate_file/INDEX.md`（同上，已登记）。用户当时只就周复盘说过，日复盘是否照做留给审阅确认。
- 记忆（feedback，根作用域）：用户要行业方案或主流做法调研时，先并列多种方案、按用户约束逐条评估，不擅自收敛；说「常见」「主流」前要有依据。来自 Grok Bot 多仓挂载那段讨论（「你别擅自收敛」「你确定是常见的做法？」）。写入：`.edges/memory/feedbacks/feedback_survey_options_before_converging/INDEX.md`（同上，已登记）。
- 不做：多仓整仓挂载行业方案笔记、ADR 0039、compose sync 任务卡。已由 #316 合入。
- 不做：pi 生态、云端沙箱内核、OpenCode 生态、Vercel 模板、工业界沙箱 SDK 调研。已由 #300、#311 合入。
- 不做：云端 coding agent 架构课程与学习笔记。已由 #310 合入 `teaching/cloud-coding-agent/`。
- 不做：Agent 记忆写入与读取触发机制调研。已由 #299 合入。
- 不做：Langfuse 接入的坑（Cloudflare 拦默认 UA、v4 events_only 按 trace 查 404、缓存 token 重复计入）、pi 走 `minimax-cn`、鉴权失败退出码仍为 0、Codex stdin。已分别写进 ADR 0038、`.edges/observation/smoke/README.md`、`.edges/evaluation/README.md` 和代码。
- 不做：pi-sandbox 的黑名单读权限、软链目录挂载失败、`allowWrite` 默认放行 `/tmp` 可改配置绕过等结论。都在开放中的 #297（ADR、README、任务卡）里，等它合入。
- 不做：Github Artifacts Preview 的托管调研（GitHub 私有托管的限制、Cloudflare Pages 免费额度、box 在 NAT 后）。已写进 #318 的卡片。
- 不做：Project 改为分组轴、artifacts 服务随 npm 包发布、评测接云沙箱、pi 越界卡。已由 #314、#298、#319、#295/#296 开卡合入。
- 不做：Artifacts 旧卡改口（cancel、降级、改口）。助手提了建议，用户没表态，改看板就是替用户做决定。
- 不做：`frozen-install` 设为必过检查、`edges memory doctor` 检查缺 README 的项目。助手提议后用户都没回复，背景有但目标未定。
- 不做：npm 环境审批可被代理代批的收紧任务。用户没讨论过，目标和完成标准写了就是编造，先放在「注意事项」。
- 不做：「CI 过完就继续合或马上报卡点」的反馈记忆。这是全栈开发专家对自己失误的解释，不是用户提出的规则；已有的叠层 PR 合并顺序记忆管的是另一件事。
- 不做：LoCoMo 摘要与 observation 压缩对比。属于一次问答，论文笔记 `projects/memory/2026-09-16-LoCoMo-paper-10-questions.md` 已在库，且回答里的具体分数未核实。
- 私人内容：0 条，edges-private 未开 PR。窗口内的个人事务只是一次性问答，业务仓的状态属于工作现场，不适合写进任何仓库。
