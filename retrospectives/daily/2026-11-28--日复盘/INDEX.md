# 2026-11-28 日复盘

## 范围

- 时间窗 2026-11-27 05:18 至 2026-11-28 05:18（Asia/Shanghai）。
- 入口与 Skill 来自 VirusPC/edges-brain-viruspc 默认分支 main，commit `2edea9ada1da2911693456f0d59cbff50b52c0d6`（`.edges/routines/daily-conversation-deposit/`）。
- 工作区入口已读 VirusPC/edges-workspace-viruspc 根 AGENTS.md，去向按公开脑根 AGENTS.md 判断。
- ReadTranscript 在本次自动化运行里无法按 agent_id 翻其他助手（只读得了本助手「日复盘」会话）；改读本机搜索索引。窗口内 7 个助手有主聊天消息：Grok Bot、日复盘、4070ts-win设备助手、记录员、通用-辅助、全栈开发专家、视觉&交互&设计专家，共 433 条（其中用户 157 条）。落盘在运行机 `/workspace/daily-scan/2026-11-28/`，原始对话不入库。
- 搜索索引最新一条止于 2026-11-28 00:12（Asia/Shanghai），相对窗口结束滞后约 5.1 小时。该时段之后若还有对话，可能未落入搜索索引。
- Langfuse 为必读第二源，但本次未能拉取：运行环境未载入公钥/私钥，官方配置加载失败。缺口只写到这里，不写凭据和主机名。因此没有 `langfuse-observations.jsonl`，候选只来自已落盘的 transcript。
- 其余 66 个已登记助手本窗无消息。
- 已核对去重：昨日日复盘 [#614](https://github.com/VirusPC/edges-brain-viruspc/pull/614) 已合入。本日对话里产生并已合入的相关变更不重复落卡，包括公开脑 [#615](https://github.com/VirusPC/edges-brain-viruspc/pull/615) 至 [#619](https://github.com/VirusPC/edges-brain-viruspc/pull/619)、[#621](https://github.com/VirusPC/edges-brain-viruspc/pull/621) 至 [#630](https://github.com/VirusPC/edges-brain-viruspc/pull/630)，以及 GitHub 主页 [#1](https://github.com/VirusPC/VirusPC/pull/1)。[#620](https://github.com/VirusPC/edges-brain-viruspc/pull/620) 已关闭未合，被后续「不再兼容、直接改纯字段」（[#625](https://github.com/VirusPC/edges-brain-viruspc/pull/625) 等）替代。播客任务卡已在 #630 入库。

## 建议补充内容清单

- Task：纠正 weekly-ai-blogs-digest，未进入 OPML 的无 RSS 列表页源不应被算进扫描。建议去处：公开脑 Site and Content 项目任务看板 backlog。写入路径：[`projects/2026-09-13--site-and-content/tasks/backlog/2026-11-28--纠正-weekly-ai-blogs-digest-未进-OPML-的列表页源不应算进扫描/INDEX.md`](../../../projects/2026-09-13--site-and-content/tasks/backlog/2026-11-28--纠正-weekly-ai-blogs-digest-未进-OPML-的列表页源不应算进扫描/INDEX.md)。
- Feedback：本机处理仓库前先找已有 clone，禁止再开第二份克隆（包括云端 Agent 不可用时），改用已有仓的 worktree。建议去处：公开脑 `.edges/memory/feedbacks`。写入路径：[`.edges/memory/feedbacks/feedback_local_repo_no_second_clone/INDEX.md`](../../../.edges/memory/feedbacks/feedback_local_repo_no_second_clone/INDEX.md)。
- 已有不重复：AI 资讯补充播客数据与多 Tab 卡片（[#630](https://github.com/VirusPC/edges-brain-viruspc/pull/630)）；工作盘清理技能与残留检查例程（[#626](https://github.com/VirusPC/edges-brain-viruspc/pull/626)）；成稿发布技能与两篇成稿标题/目录修复（[#624](https://github.com/VirusPC/edges-brain-viruspc/pull/624)、#626）；站点宽度、筛选栏、页内跳转、Summary 纯字段等（[#621](https://github.com/VirusPC/edges-brain-viruspc/pull/621)–[#628](https://github.com/VirusPC/edges-brain-viruspc/pull/628)）；GitHub 主页加入 AI News（[VirusPC/VirusPC#1](https://github.com/VirusPC/VirusPC/pull/1)）；「第一课：大模型基础」成稿（[#629](https://github.com/VirusPC/edges-brain-viruspc/pull/629)）；时序/阴影笔记迁成稿（[#615](https://github.com/VirusPC/edges-brain-viruspc/pull/615)，承接昨日任务卡）。
- 不做：编码 Agent 优先级（Kimi Code → MiniMax → Codex / Cursor）按用户明确要求只写入助手共享记忆，不写入 Edges。
- 不做：4070ts 崩溃监控早晚两次仍连不上。这是例程的一次性结果，已按例程约定回报，不另落卡。
- 不做：通用-辅助里对应用名称、Cursor 额度、安装命令行工具的问答，以及全栈开发专家里对外部 PR 提交者的询问。一次性问答或已完成的安装操作，后续不用再落卡。
- 不做：VirusPC/blog 剩余依赖升级 PR 的合并。用户当日要求合并 blog 依赖 PR，#22 已合，其余当时未完成（#12 有冲突）；截至本次复盘仍开着 #23、#21、#19、#12。这是一次性合并操作，不另开长期任务卡；需要时再说一声即可继续。
- 不做：播客软件接入试用与对比。属于调研问答，播客落地已由 #630 任务卡覆盖。
- 没有私人内容需要写入私密脑，所以没有 edges-brain-viruspc-private 的 PR。
