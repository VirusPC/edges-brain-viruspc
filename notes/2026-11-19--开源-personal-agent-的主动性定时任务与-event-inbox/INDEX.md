---
title: 开源 Personal Agent 的主动性：定时任务与 Event Inbox
---
# 开源 Personal Agent 的主动性：定时任务与 Event Inbox

## 背景

2026-11-19 用户在 Grok Bot 对话里调研「有主动性、全天常驻、能连 Gmail 的开源 personal agent」，并对比 Grok Bot、Muse 等托管型 super agent。助手当场联网查询，数字（star 数）为 2026-11-19 当日约值，会变。

## 要点（均出自当日对话）

- 主流开源：OpenClaw（约 39 万 star，生态最全，30 余个聊天渠道，ClawHub 技能市场，可做 MCP 客户端与服务端）；Hermes Agent（Nous Research，约 25~26 万 star，做完复杂任务自写技能、可搜索历史会话、内置定时任务，执行后端可选 Docker/SSH/Modal/Daytona）。二者默认都在宿主机直接执行命令，接聊天软件前应先切容器后端。
- 主动性的真实含义：Hermes 自带的是定时任务「能力」而非现成任务，要用户先交代一次（如「每天 8 点扫 Gmail」）；其「自我进化」指写技能、记偏好，不等于自己判断该建任务。OpenClaw 的带重试与审批的定时需另装 Scheduler。
- 事件驱动：Hermes 有 Webhooks 适配器（校验签名后把事件转提示词执行），可给路由绑定定时任务作兜底；自带邮件适配器是 IMAP 轮询（默认约 15 秒），真正的 Gmail 推送要走 watch + Google Cloud Pub/Sub，社区有 hermes-inbox-organizer 等插件。
- 并发：Hermes 不同会话可并行（受 max_concurrent_sessions 限制）；同一会话内新消息默认打断当前一轮；定时任务各起独立会话（受 cron.max_parallel_jobs 限制）；子 agent 默认最多 10 个并行且随会话/进程消失，要扛重启的长任务应做成定时任务或后台终端任务。
- 小众但贴近托管体验的新项目（成熟度低、star 为几十到数百）：GAIA（协议非商用）、Pincer（MIT，Gmail 经 Pub/Sub，支持任意 webhook）、OwnPilot（Pulse 机制，每 5~15 分钟自判是否行动）、Octopus（复用已订阅的 Claude Code/Codex）、Gideon。
- 用户判断（2026-11-19）：一堆定时任务效果不如 event inbox。理由：定时是到点去看一眼，没事白跑、有事要等下一轮、各任务看不到彼此上下文；事件收件箱是有事才醒，所有来源入同一队列，agent 带全局上下文分诊，可合并相关事件。定时任务只留作兜底巡检和按时间触发的简报。
- 开源现状：当日检索到的同名 open-grokbot 类项目与 Hermes 一样，都是「来一个 webhook 触发一个例程」，没有真正的统一 event inbox，要用得自己做。用户自己的 VirusPC/open-grokbot 是教学实验仓库（Cloudflare Agents + Durable Objects），仅有 POST /webhooks/ping 一个无签名入口，每个事件直接触发一轮，无队列，定时仅一条每分钟教学心跳；助手指出 Durable Object 自带 SQLite，适合做每用户一个的事件收件箱（加事件表、webhook 只写入、alarm/心跳唤醒后批量分诊、补签名与按来源入口）。这只是助手建议，用户未决定要做。

## 去向建议

公开脑 notes（跨项目的 agent 架构判断）。参见 [Cloudflare Agents：托管运行时而非托管 Agent，以及虚拟文件系统与真容器两层](../2026-11-19--cloudflare-agents托管运行时而非托管-agent以及虚拟文件系统与真容器两层/INDEX.md)。
