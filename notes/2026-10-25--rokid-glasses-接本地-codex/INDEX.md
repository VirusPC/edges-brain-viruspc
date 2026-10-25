# Rokid Glasses 接本地 Codex

> 把本机 coding agent 接到 AR 眼镜：灵珠要的是自家 SSE，不是 OpenAI 兼容接口；会话要落进本机 Codex 历史，还得防眼镜连发与提前断线把进程掐死。

## 背景

想在 Rokid Glasses 上换掉或扩展默认助手，优先追求 coding 能力，问本地 Codex 能否直接接到眼镜。需要弄清灵珠自定义智能体填什么、本机有什么现成服务、怎么包一层协议网关，以及眼镜侧对话能否在 Codex 客户端里看到记录。

## 主题

这场是在办「眼镜自定义智能体 ↔ 本机 Codex」的最小可跑通路：弄清协议差异、在常开机器上落地网关、用公网 HTTPS 填进灵珠并在真机测通，再把「无聊天记录 / 思考强度 / 工作目录」调到可日常用。

- 难点一：灵珠 SSE 协议与 Kimi / Codex / OpenAI 流式接口都不兼容，不能把官方 API 地址直接粘进表单。
- 难点二：云端浏览器打不开灵珠控制台（白屏），本机自动化又被 macOS「控制浏览器」权限拦住，填表只能人手完成。
- 难点三：临时 Cloudflare 隧道域名一重启就变；眼镜侧会话还容易在模型「先说一句再长考」时被掐断。
- 难点四：`codex exec --ephemeral` 不落盘，去掉后仍可能因连发请求、SSE 提前断开、插件市场 git 刷新卡住而写不成会话；眼镜会话的 `source` 是 `exec`，和 Desktop 的 `vscode` 线程不是同一条。

## 过程

### 约 21:26 问怎么换主 agent

说明两条路：App 里换内置模型；或灵珠/AIUI 自定义智能体（SSE URL + 鉴权 AK）。自定义主要靠开发者调试与快捷指令唤起，不等于永久替换「Hi Rokid」默认唤醒。

### 约 21:29–21:33 能不能用 Kimi / 本机有什么

确认 Kimi 官方流式不能直填灵珠。扫机器：Mac mini 有 OpenClaw（18789，仅本机），未装 Lingzhu 插件；MacBook / 4070ts / Kimi 桌面都没有现成灵珠 SSE 口。OpenClaw 适合当接眼镜的壳，不是最强 coding 脑子；Codex 不能直连，需要适配层。

### 约 21:35–21:39 封装本地 Codex

在 Mac mini 建 `~/services/rokid-codex-lingzhu/`：Node 无依赖网关，`codex exec --json`、只读沙箱、Bearer AK、本机监听自定义端口（避开 OpenClaw）。用 quick tunnel 暴露公网 HTTPS；launchd 保活网关与隧道。curl 按灵珠报文冒烟通过。用户在灵珠创建自定义智能体并填入 URL/AK，手机开发者调试开启后眼镜测通。

### 约 21:45–21:54 代填失败

云端浏览器灵珠白屏；改走 MacBook 已有登录态时，AppleScript 控制 Comet/Chrome 超时，疑似自动化权限弹窗未点。改为把入口与字段交给用户手填，用户创建成功并测通。

### 约 22:10–22:19 中途结束与加长等待

用户反馈先播一句、思考、无最终答案。网关原逻辑会立刻推送每条中间 `agent_message`，超时约 45 秒，结束时还可能推空完成包。改为缓冲最终答案、约 12 秒「还在想」保活、超时改为 5 分钟。期间 `start.sh` 一度重启隧道导致临时域名更换，用户需在灵珠更新 SSE；之后要求隧道不要再随便重启。加长等待后真机等到最终答案。

### 约 22:20–22:24 Codex 里没有会话；改工作目录并去掉实验标记

用户发现 Codex 客户端没有眼镜侧聊天记录。根因是网关启动参数带了 `--ephemeral`（不落盘）。同时确认当时工作目录落在服务目录下的 `work/`，不是 edges 工作区。按要求去掉 `--ephemeral`，并把 `CODEX_WORKDIR` 指到 `~/Documents/projects/edges-workspace-viruspc`；只重启网关、不动隧道。

### 约 22:33–22:35 思考强度

网关未单独覆盖强度时，沿用本机 `~/.codex/config.toml` 的 `model_reasoning_effort = "ultra"`（模型 `gpt-6-astra`）。按要求改为眼镜侧单独 `CODEX_REASONING_EFFORT=medium`，spawn 时用 `-c model_reasoning_effort=…`，与桌面 ultra 互不影响。

### 约 22:35–22:51 仍无记录：连发、断线、插件与 Desktop 争用

去掉 ephemeral 之后眼镜用同一 `message_id` 连打多轮；改 medium 时重启再次打断未完成进程。手动 `codex exec`（非 ephemeral）可以立刻在 `~/.codex/sessions` 与 `state_5.sqlite` 的 `threads` 表出现 `source=exec` 的会话，说明「能落盘」。

进一步排查网关路径：

1. 眼镜常提前断开 SSE；旧逻辑在 `res.on('close')` 里杀子进程，会话写不完。
2. 多请求并行时互相抢同一 Codex，全部 `code null chunks 0`。
3. 用户配置里的 Langfuse observability 插件来自 git marketplace，冷启动会 `git ls-remote`，容易卡住；眼镜侧改为 `--ignore-user-config` 并显式传入 model / effort / approval。
4. 提示词从 stdin 管道改为命令行参数，避免 stdin 空挂起。
5. 改为忙时拒收（回「上一条还在处理」）、断线后不杀 Codex，只清保活定时器，让进程跑完落盘。

同期 Codex Desktop 正在同一 `edges-workspace-viruspc` 跑「pull最新代码」，与网关共用 `~/.codex`，网关侧 exec 会出现长时间挂起。CLI / 交互式 node 冒烟约数秒可完成；与 Desktop 争用时网关子进程可空转到分钟级。

## 结果

- 已做成：Mac mini 上的灵珠 SSE 网关包装本地 Codex；公私网冒烟与眼镜真机可用；超时 5 分钟且优先播最终答复。
- 已做成：去掉 `--ephemeral`；工作目录改为 edges-workspace；眼镜侧思考强度 medium；忙时单飞、断线续跑、跳过插件市场刷新、prompt 走 argv。
- 已验证：非 ephemeral 的 `codex exec` 会写入 `~/.codex`，线程 `source=exec`、`originator=codex_exec`，与 Desktop 的 `vscode` 线程并列出现在列表（不是挂在某一条 Desktop 线程下面）。
- 还剩：公网仍是 trycloudflare 临时域名（重启会变），未挂到已有命名隧道的固定域名；Codex 仍是只读沙箱；OpenClaw+Lingzhu 路线未做；眼镜多轮上下文（resume 同一 thread）未做，目前每句用户话新开一条 exec 会话；与 Desktop 同库争用时的卡顿未从根上隔离。
- AK 与具体临时域名写在本机服务目录的环境文件中，公开笔记不收录明文密钥。

## 所学

- 灵珠「自定义智能体」要的是特定路径与报文的 SSE（常见为 `/metis/agent/api/sse` + Bearer），和 OpenAI/`chat/completions` 流式不是一回事；中间必须有协议转换。
- 追最强 coding 时应选 Codex / Claude Code 等当执行器；OpenClaw 是眼镜侧生态更熟的壳，二者可叠，不是二选一。
- 眼镜语音会话对「先短句再长考」不友好：中间句会被当成可结束内容，空窗过长容易被平台掐断；更稳的是保活提示 + 只播最终答案，并给足超时。
- `codex exec --ephemeral` 专门用于不落盘；要在 Codex 客户端看到记录就不能带这个旗标。落盘后的眼镜会话标记为 `source=exec`，不要只在某条 Desktop 线程里找。
- 眼镜 / 隧道常会提前断 SSE：若网关把「客户端断开」等同「杀掉模型进程」，会话永远写不完；应让执行器跑完，应答层静默即可。
- 连发请求时「后来的打断先来的」会制造大量半截进程；忙时拒收或排队比抢占更适合语音眼镜。
- 本机 `config.toml` 里的 git 源插件市场会在每次 exec 冷启动时刷新；自动化网关可用 `--ignore-user-config` 加白名单 `-c` 避开，或单独瘦身配置。
- 可选项与不做：未再坚持 OpenClaw+Lingzhu（本机未装插件且目标明确是 Codex）；未把云端浏览器硬撑到能填表（白屏）；未绕过 macOS 自动化弹窗；未给网关单独 `CODEX_HOME`（那样 Desktop 看不到会话）；未做 `codex exec resume` 多轮同一线程（当时先求单轮落盘）。

## 行动指南

### 主题行动指南

#### 背景

要把本机 coding agent 接到厂商眼镜的「自定义智能体」通道，且厂商只认自家 SSE；同时希望本机 Agent 客户端能看到这些对话。

#### 核心问题

如何在不改眼镜固件的前提下，用一层小网关把本机非交互 coding CLI 暴露成可填进控制台的公网 SSE + 鉴权，并保证会话真正落盘、不被连发与断线打断。

#### 核心解决方案

1. 在常开本机实现 `POST …/metis/agent/api/sse`：校验 Bearer；解析用户文本；调用本机 `codex exec --json`（不要加 `--ephemeral`）。
2. 流式响应写成厂商期望的 `event: message` / `answer_stream` / `is_finish`，并以 `event: done` 结束；对外只暴露本机回环 + 隧道/反向代理。
3. 语音场景下缓冲最终答复、长思考时发简短保活、超时拉长到分钟级；临时隧道域名变更后同步改控制台 URL。
4. 并发与断线：同时只跑一个执行器；忙时拒收或排队；客户端断开后不要杀子进程，让会话写完。
5. 工作目录与强度：用环境变量单独指定 `CODEX_WORKDIR` 与 `model_reasoning_effort`，避免误用服务目录或拖垮眼镜侧时延。
6. 相关可选项：直接填模型厂商 API——协议不合，不做；只接 OpenClaw——接眼镜更快但不是最强 coding，本次不做；命名隧道固定域名——更稳，当时为求快用了临时隧道；单独 `CODEX_HOME`——可隔离 Desktop 争用，但客户端看不到记录，本次不做。

#### 验收标准

- 用灵珠形状的 curl 能收到 `message` 与 `done`。
- 控制台自定义智能体保存后，手机开发者调试可开启，眼镜能问到完整最终答复（非半截）。
- 错误 AK 返回未授权；密钥不进公开仓库。
- 一轮完整问答后，本机 Codex 会话库出现新的 `source=exec` 线程（标题接近用户原话），且对应 `sessions/…/rollout-*.jsonl` 有内容。
- 眼镜连问两句时，第二句在忙时得到明确「还在处理」类提示，而不是把第一句杀掉。

### 细节与其他

#### 若本机已有 OpenClaw 占常用端口

则：网关另选端口，只监听本机回环，勿改动 OpenClaw 配置。可选项：复用 OpenClaw+Lingzhu 插件——本次目标是 Codex，未走这条。

#### 若云端浏览器打不开厂商控制台

则：用已登录的个人电脑浏览器手填，或先打开「经本机出口访问」再让助手填。可选项：本机 AppleScript 控浏览器——需先过系统自动化授权，未授权时不要硬绕。

#### 若会话总在思考中断开

则：检查是否过早推送中间句、超时是否过短、隧道是否仍指向旧临时域名、客户端断开时是否误杀了执行器。可选项：把临时隧道换成命名隧道固定主机名——更稳，本次尚未做。

#### 若 Codex 客户端看不到眼镜对话

则：确认未使用 `--ephemeral`；在列表里找 `source=exec` / 标题为用户原话的短会话，不要只看 Desktop 当前线程；确认该轮是否跑完（日志里应有 `done … code 0 chunks ≥1`）。可选项：为网关单独 `CODEX_HOME`——客户端不可见，不做；`codex resume` 拼成多轮——可后续做。

#### 若网关 exec 长时间无输出且 CPU 接近 0

则：查是否在刷新 git 源插件市场、是否与 Desktop 同库同工作区争用、stdin 是否空挂起。可选项：`--ignore-user-config` + 必要 `-c`；提示词改 argv；等 Desktop 空闲或换工作区。

#### 若需要本机可写代码

则：再评估把沙箱从只读调到可写工作区，并收紧公网暴露与 AK 保管。当时为安全默认只读。

#### 若在 Mac mini 上维护本服务

则：目录 `~/services/rokid-codex-lingzhu/`（`server.mjs`、`.env` mode 600、`logs/`）；launchd `tech.viruspc.rokid-codex-gateway` 与 `tech.viruspc.rokid-codex-tunnel`；改网关配置只 `kickstart` 网关，非必要不重启隧道以免临时域名变化。当前工作目录环境变量指向 `Documents/projects/edges-workspace-viruspc`；思考强度环境变量为 `medium`。

## 补充说明

- 原始材料：Grok Bot 助手「IT资产管理」会话（约 2026-10-25 21:26–22:51，Asia/Shanghai）；本机服务目录 `~/services/rokid-codex-lingzhu/`（含 `server.mjs`、`.env`、launchd 代理名 `tech.viruspc.rokid-codex-gateway` / `tech.viruspc.rokid-codex-tunnel`）。
- 灵珠/AIUI 入口参考：乐奇开放平台开发者侧、灵珠控制台；入参选文字；个人用勿误点提审。
- Codex 落盘位置（本机）：`~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`；索引表 `~/.codex/state_5.sqlite` 的 `threads`（字段含 `source`、`originator`、`cwd`、`title`）。
- 公开笔记已脱敏：不写完整鉴权密钥与当前临时域名全文；以本机 `.env` 与隧道日志为准。
