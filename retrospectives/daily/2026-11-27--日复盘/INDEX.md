# 2026-11-27 日复盘

## 范围

- 时间窗 2026-11-26 05:20 至 2026-11-27 05:20（Asia/Shanghai）。
- ReadTranscript 在本次自动化运行里无法按 agent_id 翻其他助手；改读本机搜索索引。窗口内 5 个助手有主聊天消息：Grok Bot、日复盘、4070ts-win设备助手、通用、记录员，共 115 条（其中用户 43 条）。落盘在运行机 `/workspace/daily-scan/2026-11-27/`，原始对话不入库。
- 搜索索引最新一条止于 2026-11-26 22:29（Asia/Shanghai），相对窗口结束滞后约 6.8 小时。同窗 Langfuse 最晚 turn 约 22:27，两个来源一致，这段空白更像夜间无新对话，而不是另有未落盘会话。
- Langfuse 为必读第二源，读取成功，写入同目录 `langfuse-observations.jsonl`。共 95 条根 / turn 级 observations：Grok Bot Turn 46，Cursor Turn 49（其中本机 34、云端 15），93 条有 I/O。已与 transcript 去重。
- 其余 68 个已登记助手本窗无消息。
- 已核对去重：[#613](https://github.com/VirusPC/edges-brain-viruspc/pull/613) 是昨日日复盘，仍开着，其中两张任务卡（收敛 Edges skill 入口、清理 herdr 失效分屏）不重复。[#598](https://github.com/VirusPC/edges-brain-viruspc/pull/598) 的 11-24 日复盘仍开着。[#607](https://github.com/VirusPC/edges-brain-viruspc/pull/607) 笔记 PR 已于 2026-11-26 22:27 合入 main。

## 建议补充内容清单

- Task：把「时序数据分析」和「实时阴影渲染」两篇笔记起草成 post 稿。建议去处：公开脑 `.edges/tasks` backlog。写入路径：[`.edges/tasks/backlog/2026-11-27--把时序数据分析和实时阴影渲染笔记起草成-post-稿/INDEX.md`](../../../.edges/tasks/backlog/2026-11-27--把时序数据分析和实时阴影渲染笔记起草成-post-稿/INDEX.md)。
- Feedback：同一轮多回合讨论（grill）的文档修订累积在同一个 PR 里，讨论完成后再一起合并，不要每回合合一次。建议去处：公开脑 `.edges/memory/feedbacks`。写入路径：[`.edges/memory/feedbacks/feedback_grill_revisions_stack_on_one_pr/INDEX.md`](../../../.edges/memory/feedbacks/feedback_grill_revisions_stack_on_one_pr/INDEX.md)。
- 不做：Edges 三入口与分层初始化的 ADR 0054–0060 迭代、MCP 标记 deprecated、旧技能自动清理。设计文档 PR（VirusPC/edges#139）已合入，实现 PR（VirusPC/edges#140）已推到 CI 通过、等用户说「合并 #140」；这些由昨日 #613 的「收敛 Edges skill 入口并修订材料硬约束」任务卡覆盖，不另开卡。
- 不做：4070ts 崩溃监控早晚两次仍连不上，未验证窗口持续累积。这是例程的一次性结果，已按例程约定回报，不另落卡。
- 不做：通用助手里「帕累托前沿」问答。纯问答，后续用不到。
- 不做：Cursor 本机和云端若干工作项目会话（团队记忆服务、接口联调、配置查询）。属于工作内部系统，不写入个人脑；公开仓也不写内部细节。
- 没有私人内容需要写入私密脑，所以没有 edges-brain-viruspc-private 的 PR。
