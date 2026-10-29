# 2026-10-29--open-grokbot 全程坑点

> 从教学仓搭建、Workers 部署、跨 forge 开源、Electron 壳到多 Agent 概念对照，把两天里踩过的坑收成一篇可复用笔记。

## 背景

peng cheng 要用 Cloudflare Workers、Think 与 H5 做一套可公开学习的 Grok Bot 同类实验仓 open-grokbot：先在 Cursor Origin 上实现，再交给 IT资产管理助手部署到公网，随后补 Electron 桌面薄壳、把代码迁到 GitHub 公开仓，并在公司网环境下验证可达。同一时段还对照讨论了「常驻实例 / 对等多 Agent」与本仓 `agentTool` 父子委派的差异。过程中连续撞上密钥上传损坏、Origin 与 GitHub 无法互通、桌面默认 URL 写死个人部署、公司 DNS 污染 `*.workers.dev` 等问题。用户要求把 Coding Agent 专家与 IT资产管理两路对话里的坑点整理成一篇笔记，方便以后同类教学仓复用。

## 主题

这场对话围绕 open-grokbot 从实现到公开展示的全程踩坑与取舍：教学架构怎么落地、部署与密钥怎么安全进 Worker、代码怎么跨 forge 开源并清掉个人痕迹、公司网怎么真正打开演示地址，以及「Researcher 是子工具」与「对等队友」差在哪里。

- 难点一：Cursor Origin 与 GitHub 各为源，两边的 Cloud Agent 互不读写，迁仓只能走产物打包再导入。
- 难点二：经 Cloudflare MCP / `$file` 上传 Worker secret 时，真实 MiniMax 密钥被换成约 10 字符的占位串，线上聊天报 1004。
- 难点三：公司 MacBook 的 DNS（含搜索域 `xiaohongshu.sh`）把 `*.workers.dev` 解析到假 IP（如 103.97.x），外网真实 Cloudflare IP 可达但本机超时。
- 难点四：公开教学仓若默认 URL / appId 绑个人 workers.dev 或 viruspc 品牌，开源后会误导读者并泄漏个人部署痕迹。
- 难点五：本仓多 Agent 是 DeskAgent 经 `agentTool` 调 Researcher 的父子关系，不能直接当成 Grok Bot 式对等助手；对等需要 registry、可寻址实例与 Room，「常驻」指 Durable Object 身份可睡醒带状态，不是一直占 CPU。

## 过程

### 时刻不详（约 2026-10-28）Origin 上建 Think 教学 lab

在 Cursor Origin 仓实现 Cloudflare Workers + Think + H5：主助手 `DeskAgent`、研究子助手 `ResearcherAgent`，主助手用 `agentTool(ResearcherAgent)` 委派，不是 Grok Bot 那种对等助手。能力覆盖 skills、memory、heartbeat 例程、以及无鉴权的教学 webhook `POST /webhooks/ping`。密钥约定走环境变量 / Worker secrets，`.dev.vars` 进 gitignore，仓库树里不出现 `sk-`。当时目标是先跑通教学路径，公开展示与自定义域名留到后半段。

### 时刻不详（约 2026-10-28）交 IT资产管理部署 Workers 与外网 URL

实现侧把部署交给熟悉 Cloudflare 的 IT资产管理助手。Worker 名称定为 `open-grokbot`，健康检查能看到 DeskAgent 与 ResearcherAgent。先给出 `*.workers.dev` 公网地址，方便外网验证；自定义域名挂到后半段再做。

相关可选项：自己在本机 `wrangler deploy`，或继续交给 IT 助手。当时选择交 IT，是因为用户已习惯把 Workers 类部署交给该助手处理。

### 时刻不详 MiniMax OpenAI 兼容路径接入与 1004 排障

为线上对话加了 MiniMax 的 OpenAI 兼容路径。聊天却报错 1004。排查发现：经 Cloudflare MCP / `$file` 上传 Worker secret 时，真实密钥被替换成长度约 10 的短占位串，模型侧等于收到假 key。修复做法是把密钥按十六进制分块写入 KV，再 PUT 回 Worker secret（或本机 `wrangler login` 后用 wrangler 设 secret），并明确以后不要把完整密钥经 MCP `$file` 传递。

相关可选项：MCP `$file` 直传、hex 分块经 KV 再写 secret、本机 wrangler 登录后设 secret。`$file` 路径已证明会损坏内容，弃用；后两条可用。

### 时刻不详 Electron macOS 薄壳、Origin PR、跨 forge 导入 GitHub

在 `desktop/` 下做 Electron 薄壳。默认打开 URL 一度写死为个人 `open-grokbot.viruspc.workers.dev`；appId 带 viruspc 品牌。Origin 上开了 PR #2（desktop）。随后用户要 GitHub 仓：先建私有 `VirusPC/open-grokbot`，再改为公开。

跨 forge 卡点很硬：Origin 上的 agent 写不了 GitHub，GitHub 上的 agent 读不了 Origin。实际路径是从 Origin 打 tarball 产物，再由 GitHub CloudAgent 导入，并直推 main。Origin PR #2 因 token 权限不够，需要用户自己点合并。

相关可选项：两边各维护一份、只留 Origin、或 tarball 导入 GitHub 作公开 SoT。教学要公开 GitHub，最终选导入；直推 main 是为尽快有可读主分支，代价是跳过了 GitHub 侧 PR 审阅。

### 时刻不详（约 2026-10-29）公开仓脱敏：中性默认 URL、清历史

公开后发现桌面默认 URL 与品牌仍绑个人部署。决定：默认 URL 中性化为 `http://127.0.0.1:43123`（与本地 Vite 端口一致），个人 workers.dev 只留在 README 示例，可用环境变量 `OPEN_GROKBOT_URL` 覆盖；appId 从 viruspc 相关改为 `dev.open-grokbot.app`。为去掉历史里的个人 URL，对 `VirusPC/open-grokbot` 做了历史擦除，清成单根提交 `86386ce`。

相关可选项：只改当前树不改历史、或 force 清历史。选择清历史，是因为公开教学仓不应在 git 历史里留下个人部署 URL。

### 时刻不详 公司网打不开 workers.dev，挂上 viruspc.tech

公司 MacBook 上打开 `*.workers.dev` 连接超时。DNS 查询显示搜索域 `xiaohongshu.sh` 相关解析把 `*.workers.dev` 指到假 IP（例如 103.97.x 段）；用真实 Cloudflare IP 配合 `--resolve` 可以通，说明不是 Worker 挂了。改 `/etc/hosts` 需要 sudo 密码，不适合当长期方案。

长期方案：在 zone `viruspc.tech` 上为服务 `open-grokbot` 挂 Workers 自定义域名 `open-grokbot.viruspc.tech`。公司 MacBook 访问该域名返回 200。`open-grokbot.viruspc.workers.dev` 仍作备用外网入口。

相关可选项：本机 hosts、每次 `--resolve`、自定义域名。hosts / resolve 只适合临时排障；公司网长期演示选自定义域名。

### 时刻不详 对照 Grok Bot 多 Agent / 常驻实例，并要求记坑点笔记

同一时段对照讨论：对等多 Agent 需要 registry、可寻址实例与 Room；「常驻」指 Durable Object 身份可以带着状态睡醒，不是进程一直占 CPU。本仓的 Researcher 经 `agentTool` 被 Desk 调用，是父子委派，不是对等队友。本地开发还确认：Workers AI 没有本地模拟器，Vite 插件默认关掉 remote bindings，要打真实模型需 `wrangler login` 且设 `CLOUDFLARE_REMOTE_BINDINGS=true`。Webhook `POST /webhooks/ping` 无鉴权，仅教学用途。用户明确要求把全程坑点（含 IT 对话）整理成一篇 edges 结构笔记。

## 结果

已做成：

- 教学仓公开在 GitHub：`VirusPC/open-grokbot`，历史清为根提交 `86386ce`；桌面默认本地 URL，appId 中性化。
- Worker `open-grokbot` 已部署；健康检查可见 DeskAgent 与 ResearcherAgent；MiniMax 1004 已用非 `$file` 路径修好。
- 公司网推荐入口 `https://open-grokbot.viruspc.tech` 可达 200；`*.workers.dev` 仍作备用。
- 多 Agent / 常驻语义与本仓 `agentTool` 边界已在对话里对齐。

还剩 / 未完全闭环：

- Webhook 仍无鉴权，公开域名上若被滥用需另加签名或关掉对外路由（教学仓当前按「仅教学」保留）。
- Origin 与 GitHub 双源仍无长期同步机制；本次是一次性 tarball 导入，以后两边再改易再次分叉。
无整仓回退；清历史是刻意的公开脱敏，不是功能回滚。

## 所学

- Origin 与 GitHub 在当前工具链里是分裂的 SoT：不能假设「在一边改完另一边自动有」。需要公开 GitHub 时，按「导出产物 → 另一边导入」规划，而不是指望单边 agent 跨 forge 读写。
- Worker secret 的传递通道本身会改内容。MCP `$file` 曾把真 key 换成短占位串；完整密钥应走 wrangler / 分块经可信存储再写回 secret，不要经聊天附件式通道整包传递。
- 公司解析污染可以表现为「域名看起来对、IP 却是假的」。先用 `--resolve` 或真实 CF IP 区分「服务挂了」与「DNS 骗了」，长期再挂自有域名，而不是长期依赖 sudo hosts。
- 公开教学仓的默认值要假设读者会照抄：默认 URL、appId、历史提交都会变成对外信号；个人部署地址只应出现在文档示例，并通过环境变量覆盖。
- `agentTool(Researcher)` 解决的是「主助手临时叫一个子运行」；对等多 Agent 要另备 registry、地址与 Room。「常驻」谈的是 DO 身份与状态生命周期，不是常开算力。
- 本地默认关掉 remote bindings 是为了让 `npm run dev` 不强制登录；需要真模型时再显式打开，这是刻意的默认安全/便捷取舍，不是漏配。

## 行动指南

### 主题行动指南

#### 背景

要把一套 Cloudflare Agents / Think 教学实验从私有草稿推到可公开演示，并覆盖部署、开源脱敏、公司网可达与多 Agent 概念边界。

#### 核心问题

如何在不泄漏密钥与个人部署痕迹的前提下，完成跨 forge 开源、Worker 密钥正确注入、以及在污染 DNS 环境下仍可演示的稳定入口，同时不把父子 `agentTool` 误讲成对等多 Agent。

#### 核心解决方案

1. 先定教学架构：Workers + Think + H5；主从用 `agentTool`，文档写清「不是对等助手」。相关可选项：一上来做对等 Room。当时不做，是因为教学第一刀是 harness 与父子委派，对等要 registry 等额外层。
2. 密钥只进 env / Worker secrets；仓库用 `.dev.vars.example`，真实 `.dev.vars` gitignore；禁止树里出现 `sk-`。上传 secret 不用 MCP `$file` 整包；改用本机 wrangler，或可信分块写入后再 PUT secret。
3. 需要 GitHub 公开时：从 Origin 导出 tarball / 产物，用 GitHub 侧 agent 导入；不要假定 Origin agent 能直写 GitHub。公开前检查默认 URL、appId、README；个人部署只作示例。若历史已含个人 URL，评估清历史再 force 推公开根提交。
4. 部署 Worker 后做健康检查与一次真实对话。若模型报鉴权类错误，先核对 secret 实际长度与内容是否被通道截断，再查模型侧错误码。
5. 公司网打不开 `*.workers.dev` 时：用真实 CF IP + `--resolve` 验证服务本身；长期在自有 zone 给该 Worker 挂自定义域名作推荐入口，workers.dev 作备用。
6. 本地要真模型时：`wrangler login` 且打开 remote bindings；默认保持关闭以便无登录也能练 DO / 记忆 / webhook 状态路径。
7. 对外 webhook 若仅教学、无鉴权，文档标明「勿当生产」；公开域名上再评估签名或关闭。

#### 验收标准

- 公开仓主分支可按 README `npm install && npm run dev` 起本地；默认桌面/文档入口不写死个人 workers.dev。
- Worker 健康检查返回预期 Agent；真实对话不因 secret 被截断而 1004。
- 公司网用自定义域名可 200 打开；DNS 污染下的 workers.dev 失败有文档说明与备用入口。
- 仓库与历史中无 API key 材料；`.dev.vars` 未入库。
- 文档明确：Researcher 为 `agentTool` 子委派；对等多 Agent /「常驻」语义有单独说明，不与本仓实现混称。

### 细节与其他

#### 若经 Cloudflare MCP 的 `$file` 写入 Worker secret 后聊天报 1004

则：先核对该 secret 在 Worker 侧的实际长度。若变成约 10 字符的短串，说明通道替换了内容，不要反复用同一 `$file` 路径「再传一次」。改为：密钥 hex 分块写入 KV 再组装 PUT 为 Worker secret，或本机 `wrangler login` 后用 wrangler 设置。相关可选项：继续 MCP `$file`——已证伪，弃用。

#### 若 Origin 有完整实现但 GitHub 侧 agent 读不到

则：在 Origin 打 tarball / 发布产物，交给 GitHub CloudAgent 导入目标仓。不要空等「跨 forge 直读」。Origin 上已开的 PR 若 token 作用域不够，让用户在 Origin 界面合并，而不是让 GitHub 侧假装能改 Origin。

#### 若公开仓后发现默认 URL 仍是个人 `*.workers.dev` 或 appId 带个人品牌

则：默认改为本地 `http://127.0.0.1:43123`（或当前本地端口），个人 URL 仅 README 示例 + 环境变量覆盖；appId 改为中性如 `dev.open-grokbot.app`。若 git 历史已含个人 URL，评估单根提交清历史（本项目清至 `86386ce`）。相关可选项：只改 HEAD 不清历史——历史仍可被 clone 挖出，公开教学仓不推荐。

#### 若公司 MacBook 访问 `*.workers.dev` 超时而外网正常

则：检查是否被公司 DNS / 搜索域（对话中出现过 `xiaohongshu.sh`）解析到异常 IP（如 103.97.x）。用真实 Cloudflare IP 加 `--resolve` 验证；sudo 改 hosts 仅临时。长期：在 `viruspc.tech` 等自有 zone 为服务 `open-grokbot` 绑定 `open-grokbot.viruspc.tech`，公司网走自定义域名。

#### 若本地 `npm run dev` 能开页面但对话调模型失败

则：确认是否需要真实 Workers AI：先 `wrangler login`，再以 `CLOUDFLARE_REMOTE_BINDINGS=true npm run dev`。默认关闭 remote bindings 是故意的，避免强制登录；记忆、心跳、无 turn 的 webhook 仍可在本地 DO 演练。可选改走 OpenAI / MiniMax 兼容 key（仅 `.dev.vars` / Worker secrets）。

#### 若有人把本仓 Researcher 讲成「和 Grok Bot 一样的对等队友」

则：纠正为 Desk 经 `agentTool` 的父子委派。对等方案需要 registry、可寻址实例与 Room；「常驻」解释为 Durable Object 身份可睡醒并带状态，不是进程常占 CPU。教学仓 webhook 无鉴权，不得写成生产通道。

## 补充说明

- 原始材料：助手「Coding Agent 专家」（本会话整理来源之一）；助手「IT资产管理」（会话 id 前缀 `5fcd37e7…`，部署 / MiniMax / DNS / 自定义域名相关）。整理时短 id 未能直接 ReadTranscript，事实以两路对话已确认内容与本笔记「必须覆盖」清单为准。
- 仓：https://github.com/VirusPC/open-grokbot （清历史后根提交 `86386ce`）。
- Origin：`peng-cheng-1/open-grokbot` PR #2（desktop）。
- 域名：备用 `open-grokbot.viruspc.workers.dev`；公司网推荐 https://open-grokbot.viruspc.tech 。
- 时间范围：约 2026-10-28～2026-10-29（Asia/Shanghai）。
- 脱敏说明：未写入 API key、MiniMax 密钥材料、Tailscale `100.x` 地址；公司 DNS 仅写到「搜索域 / 污染 workers.dev / 假 IP 段示意」，未抄内部 DNS 服务器地址。
- 架构对照原料：教学 brief 与仓内 README / `docs/`（DeskAgent + Researcher via `agentTool`、本地端口 43123、webhook 无鉴权等）。
- 入库目标：`VirusPC/edges-brain-viruspc` 的 `notes/`（本笔记由对话整理后经云端 Agent 落 PR）。
