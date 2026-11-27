# 2026-11-26 日复盘

## 范围

- 时间窗 2026-11-25 05:15:55 至 2026-11-26 05:15:55（Asia/Shanghai）。
- ReadTranscript 在本次自动化运行里只能读本助手（日复盘）会话，无法按 agent_id 翻其他助手；改读本机搜索索引。窗口内 7 个助手有主聊天消息：Grok Bot、日复盘、4070ts-win设备助手、视觉&交互&设计专家、DIY Coding Agent、IT资产管理、通用-辅助，共 117 条（其中用户 44 条）。落盘在运行机 `/workspace/daily-scan/2026-11-26/`，原始对话不入库。
- 搜索索引最新一条止于 2026-11-26 00:52（Asia/Shanghai），相对窗口结束滞后约 4.4 小时。同窗 Langfuse 最晚用户轮次约 00:46，其后一次导出也没有新的 turn；这段空白更像夜间无新对话，而不是另有未落盘会话。
- Langfuse 为必读第二源。第一次请求被 CDN 以浏览器特征拦截（非 2xx）；换用常规 User-Agent 后重试成功，写入同目录 `langfuse-observations.2.jsonl`（未覆盖第一次失败留下的空文件）。共 99 条根 / turn 级 observations：Grok Bot Turn 43，Cursor Turn 56（其中本机 48、云端 8），97 条有 I/O。已与 transcript 去重。
- 其余 66 个已登记助手本窗无消息。
- 已核对去重：[#608](https://github.com/VirusPC/edges-brain-viruspc/pull/608) 是昨日日复盘，已于 2026-11-26 00:31 用普通 merge commit 合入 main。[#609](https://github.com/VirusPC/edges-brain-viruspc/pull/609)–[#612](https://github.com/VirusPC/edges-brain-viruspc/pull/612) 是 AI 资讯一键订阅的文档、界面、站点实现与发布收尾，均已合入，属已落地工作。[#607](https://github.com/VirusPC/edges-brain-viruspc/pull/607) 笔记 PR 与 [#598](https://github.com/VirusPC/edges-brain-viruspc/pull/598) 的 11-24 日复盘仍开着，不重复。个性化关键词筛选已有 2026-11-25 backlog 卡，不新开。

## 建议补充内容清单

- Task：收敛 Edges skill 入口，并修订 AGENTS.md 硬约束以覆盖全部材料类型。建议去处：公开脑 `.edges/tasks` backlog。写入路径：[`.edges/tasks/backlog/2026-11-26--收敛-Edges-skill-入口并修订材料硬约束/INDEX.md`](../../../.edges/tasks/backlog/2026-11-26--收敛-Edges-skill-入口并修订材料硬约束/INDEX.md)。2026-11-26 00:44 起用户提出对外只保留 `edges-onboarding`、`edges-langfuse-agent-tracing`，其余并入 `edges`，并把硬约束从只提 Memory 改为覆盖已登记的各类材料。第一轮整体 grill（四个问题，含合并范围、材料发现、检索时机、沉淀授权）已在对话里发出，等用户答复后再正式修订旧 ADR（当前 ADR 仍保留 ask/remember 独立），暂未改实现。
- Task：清理 MacBook herdr 会话里指向已删除目录的分屏，消除卡住的 zsh 与耳机提示音。建议去处：公开脑 `.edges/tasks` backlog。写入路径：[`.edges/tasks/backlog/2026-11-26--清理-herdr-会话失效分屏以消除耳机提示音/INDEX.md`](../../../.edges/tasks/backlog/2026-11-26--清理-herdr-会话失效分屏以消除耳机提示音/INDEX.md)。IT资产管理 已定位到复发原因：herdr 恢复会话时再次拉起指向废纸篓目录的卡住 zsh，终端反复响铃；助手给出了备份会话文件、删掉失效分屏并结束卡住进程的方案，用户尚未确认执行。
- 不做：AI 资讯一键订阅的功能、界面、站点实现与发布收尾。已由 [#609](https://github.com/VirusPC/edges-brain-viruspc/pull/609)–[#612](https://github.com/VirusPC/edges-brain-viruspc/pull/612) 合入；设计稿三条拍板已记入 #610。个性化关键词筛选已有既有任务卡，不重复。
- 不做：DIY Coding Agent 里关于 dsh 启动、TUI、联网搜索与 Codex 路由的问答。本机 dsh 已升到 0.2.2-rc.5，属已完成的一次性操作。助手提议补跑依赖安装脚本、安装 pi-tui 以及走 ChatGPT 官方登录路由，用户未表态，不落卡。
- 不做：通用-辅助里 cron 表达式（每整点与半点）问答。纯问答，后续用不到。
- 不做：4070ts 崩溃监控早晚两次仍连不上。这是一次性例程结果，后续用不到。
- 不做：Cursor 本机一场工作项目会话（任务编排与记忆沉淀相关实现）。属于工作内部系统，不写入个人脑；公开仓也不写内部细节。
- 没有私人内容需要写入私密脑，所以没有 edges-brain-viruspc-private 的 PR。
