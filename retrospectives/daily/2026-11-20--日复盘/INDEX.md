# 2026-11-20 日复盘

## 范围

- 回看窗口 2026-11-19 05:17 至 2026-11-20 05:17（Asia/Shanghai）。
- 主源：本机 search-index（ReadTranscript 本次不可用）；索引最新消息时间为 2026-11-19 19:51，晚于该时刻的对话未覆盖（索引滞后约 9 小时）。
- 读到 5 个助手共 140 条主对话消息：Grok Bot 65、Coding Agent 专家 53、通用-辅助 11、日复盘 7、4070ts-win设备助手 4；另有 1 条非主对话消息跳过。
- Langfuse：未拉取，缺口是 LANGFUSE_BASE_URL 与 LANGFUSE_HOST 均未设置（公钥私钥已有），按 Skill 不编造地址，仅靠 transcript 继续。
- 落盘目录 /workspace/daily-scan/2026-11-20/（原始对话不进仓库）。
- 所用 Skill：VirusPC/edges-brain-viruspc 默认分支 commit c7ff9273bef30fa3f734272ab9af881d6cc7b29e 的 .edges/routines/daily-conversation-deposit/。
- 重复 PR 提示：2026-11-19 的日复盘在本仓同时存在两个开放 PR（#515 分支 cursor/daily-retro-2026-11-19-3320 与 #516 分支 docs/daily-retro-2026-11-19，标题相同），建议只合一个、关掉另一个。

## 建议补充内容清单

- 本次落了 3 条公开笔记：
  - [开源 Personal Agent 的主动性：定时任务与 Event Inbox](../../../notes/2026-11-19--开源-personal-agent-的主动性定时任务与-event-inbox/INDEX.md)
  - [Edges 记忆作用域分享稿：四种记忆与三层结构](../../../notes/2026-11-19--edges-记忆作用域分享稿四种记忆与三层结构/INDEX.md)
  - [Cloudflare Agents：托管运行时而非托管 Agent，以及虚拟文件系统与真容器两层](../../../notes/2026-11-19--cloudflare-agents托管运行时而非托管-agent以及虚拟文件系统与真容器两层/INDEX.md)
- 没有私人候选，未开私密 PR。
- 不做项（每条写具体原因）：
  - Coding Agent 专家里 open-grokbot 仓库的 edges 初始化、GitHub Actions macOS 打包任务卡与发布流程：已在 VirusPC/open-grokbot 仓库内落卡并走其 PR（#6），属该项目自己的仓库，本脑重复无益。
  - Electron 主进程/preload/bridge、包体积、与 React Native 的差异等问答：纯技术问答，没有可跟进事项。
  - Hi/Cowork 本机 Codex 设备接入的一次性操作（含公司内部地址、账号、Cookie 路径）：已做完的一次性操作，且含不宜公开的内部信息，不沉淀。
  - 4070ts 崩溃监控例程两次均 CLEAR（未连上，未验证窗口自 2026-11-09 18:00 起）：例程回执，设备持续离线属运维状态而非可沉淀知识。
  - 把 open-grokbot 改成 event inbox：助手提议，用户未采纳，不落任务卡。
  - 用户询问近日未合并日复盘 PR 是否提到面试：属一次性查询，助手已答；其提议删改公开仓里的面试字样，用户尚未决定。
