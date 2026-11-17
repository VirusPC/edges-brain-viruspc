# 2026-11-18 日复盘

## 范围

时间窗：2026-11-17 05:19:44 → 2026-11-18 05:19:44（Asia/Shanghai）；日历日取回看结束日 **2026-11-18**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-18/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- **主源局限**：本运行没有 `ReadTranscript`。窗口内消息由本机 search-index 导出，只含 `in_main_chat=1`。窗内非主聊天消息 1 条（Grok Bot 的云端 Agent CI 回传），未写入助手 jsonl。search-index 最新一条消息时间为 2026-11-17 22:26:24（Asia/Shanghai），距窗口结束约 7 小时；该时点之后若有对话，本窗未能覆盖。
- 共扫描 72 个助手配置；窗口内有活动并落盘 **7** 个助手、共 **328** 条：Grok Bot（153）、Coding Agent 专家（82）、Agent Memory 专家（63）、通用（16）、任务记录员（7）、4070ts-win设备助手（4）、IT资产管理（3）。`unknown_agent_ids` 为空。
- **Langfuse 缺口**：本机有公钥、私钥，但 `LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置（缺 BASE_URL/HOST 配置类）。按 Skill 不编 URL、不换其它读数路径；本窗未拉 Langfuse observations，候选只来自 search-index jsonl。
- 入口：Skill 与 INDEX 读自公开脑默认分支 main 的最新版本（commit `c7ff9273bef30fa3f734272ab9af881d6cc7b29e`）。
- 去重：窗内由助手当场开出或合入的不重写：公开脑 [#512](https://github.com/VirusPC/edges-brain-viruspc/pull/512)（Codex 的 Code Mode，已合入）、[#513](https://github.com/VirusPC/edges-brain-viruspc/pull/513)（编码 Agent 的 Goal 机制，仍开）；框架仓 [edges#132](https://github.com/VirusPC/edges/pull/132)（把日复盘沉淀为 dream 机制，已合入）、[edges#133](https://github.com/VirusPC/edges/pull/133)（合成消融数据集说明，已合入）、[edges#134](https://github.com/VirusPC/edges/pull/134)（沉淀成本评测卡补充关联，已合入）。前一日及更早仍开、不重写：日复盘 [#511](https://github.com/VirusPC/edges-brain-viruspc/pull/511)、[#505](https://github.com/VirusPC/edges-brain-viruspc/pull/505)；周复盘 [#506](https://github.com/VirusPC/edges-brain-viruspc/pull/506)；另有 [#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504)、[#498](https://github.com/VirusPC/edges-brain-viruspc/pull/498)，私密仓 [private#20](https://github.com/VirusPC/edges-brain-viruspc-private/pull/20)、[private#18](https://github.com/VirusPC/edges-brain-viruspc-private/pull/18)，框架仓 [edges#131](https://github.com/VirusPC/edges/pull/131)、[#129](https://github.com/VirusPC/edges/pull/129)、[#120](https://github.com/VirusPC/edges/pull/120)。

## 建议补充内容清单

- **公开候选 1 条**：`projects/memory/notes/2026-11-17--以项目为中心的记忆缺口仓库归属分支与回滚/INDEX.md`（并登记 `projects/memory/notes/README.md`）。来源：Agent Memory 专家 2026-11-17 对话。归纳各家记忆系统在仓库归属、目录粒度、分支与会话回滚上的差异，以及「真正以项目为中心的记忆仍然少见」的结论。
- **私人候选 0 条**，未开私密 PR。
- 不做：Codex Code Mode 与后续 V8 isolate / 调用转发补记 —— 已合入 #512，去重。
- 不做：编码 Agent 的 Goal 机制笔记 —— 已在仍开的 #513，去重。
- 不做：把日复盘沉淀为 dream 机制 —— 任务记录员已落卡并合入 edges#132，去重。
- 不做：合成消融数据集说明，以及「只验证了检索效率、未验证沉淀效率」的待办 —— Coding Agent 专家已合入 edges#133，并更新已有评测卡（edges#134），去重。
- 不做：dsh-superagent 的主动性、常驻、会话接力和事件管理源码梳理 —— 助手提议整理进私密大脑，用户未回应；公开教学课程 Super-agent 与 always-on-agents 已于 11-16 合入。本次是对开源实现的源码补充，落点（公开课附录 / 私密仓 / 另开笔记）未在对话里确定，写了就要替用户选定落点，故不自动写入。
- 不做：助手提议把「外部自动记忆作草稿、经 PR 进入 edges」画成架构页或写成 ADR —— 用户未采纳。
- 不做：4070ts 崩溃监控（早晚两次均为未连上 CLEAR）—— 例程输出，无新结论；该机持续离线、未验证窗口仍待核对，属设备助手跟进，不落卡。
- 不做：IT资产管理关于电脑异常声响的排障 —— 一次性问答，后续用不到；涉及私人设备细节，不入公开仓。
- 不做：`posts/` —— 由人维护，不自动写入。
