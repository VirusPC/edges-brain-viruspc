# 2026-11-16 日复盘

## 范围

时间窗：2026-11-15 05:20:44.552 → 2026-11-16 05:20:44.552（Asia/Shanghai）；日历日取回看结束日 **2026-11-16**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-16/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- **主源局限**：本运行没有 `ReadTranscript`。窗口内消息由本机 search-index 导出，且只含 `in_main_chat=1`。窗内另有 5 条非主聊天消息（均属 Grok Bot）已跳过、未落盘。
- 共扫描 72 个助手配置；窗口内有活动并落盘 **8** 个助手、共 **309** 条：日复盘（46，05:32–17:55）、Grok Bot（203，16:03–22:50）、任务记录员（14，16:09–22:45）、AI CR 专家（14，16:12–16:19）、通用-辅助（8，16:35–16:37）、通用（4，17:11–17:19）、全栈开发专家（15，17:22–17:48）、Coding Agent 专家（5，次日 03:49–03:50）。其余配置在窗内没有主聊天消息，未写空 jsonl。`unknown_agent_ids` 为空。
- **Langfuse 缺口**：本机有公钥、私钥，但 `LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置（缺 BASE_URL/HOST 配置类）。按 Skill 不编 URL、不换其它读数路径；本窗未拉 Langfuse observations，候选只来自 search-index jsonl。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc`（main `07d91c4beb0834eaaf2c263b212f747e27ab6430`）→ 公开脑；PR 开在子仓。Skill / 公开脑入口 commit：`43de9fad89d1c19ec17694249217e3d8ca2bf2b9`（公开脑 main）。
- 去重：11-15 日复盘 [#496](https://github.com/VirusPC/edges-brain-viruspc/pull/496) 已于 2026-11-15 09:19:46Z 合入，不重写、不补做昨天的扫描。窗内已由助手当场写入并合入的，不重写：公开脑 [#497](https://github.com/VirusPC/edges-brain-viruspc/pull/497)、[#499](https://github.com/VirusPC/edges-brain-viruspc/pull/499)、[#500](https://github.com/VirusPC/edges-brain-viruspc/pull/500)、[#501](https://github.com/VirusPC/edges-brain-viruspc/pull/501)、[#502](https://github.com/VirusPC/edges-brain-viruspc/pull/502)、[#503](https://github.com/VirusPC/edges-brain-viruspc/pull/503)、[#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482)；框架仓 [edges#130](https://github.com/VirusPC/edges/pull/130)。仍开、不重写：公开脑 [#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504)（给高优 edges 任务补充「这将是全仓库信噪比最高的地方」）、[#498](https://github.com/VirusPC/edges-brain-viruspc/pull/498)（建立 CodeRabbit CR 规则自迭代流程）；框架仓 [edges#129](https://github.com/VirusPC/edges/pull/129)、[edges#120](https://github.com/VirusPC/edges/pull/120)；私密仓 [private#19](https://github.com/VirusPC/edges-brain-viruspc-private/pull/19)、[private#18](https://github.com/VirusPC/edges-brain-viruspc-private/pull/18)。

## 建议补充内容清单

- **公开候选 1 条**：编码 Agent 的本机记忆与子目录 AGENTS.md。建议去处：公开脑 `projects/agent-infra/notes/`（与同晚已合入的 MCP / CLI、Code Mode 笔记同一项目）。本次 PR 写入路径：[`projects/agent-infra/notes/2026-11-15--编码-agent-本机记忆与子目录-agentsmd/INDEX.md`](../../../projects/agent-infra/notes/2026-11-15--编码-agent-本机记忆与子目录-agentsmd/INDEX.md)（须同步登记 `projects/agent-infra/notes/README.md`）。来自 Grok Bot 18:58–19:09 对照官方文档后的问答：产品记忆在本机、不跟账号走；Cursor / Claude Code 能按需读子目录 `AGENTS.md`，Codex 只读从仓库根到启动目录这一路。已有 2026-10-14 普查笔记，本篇只收这场对照，不重写普查。
- **私人候选 0 条**。无私人 PR（私人 PR 待开的占位不适用）。
- 不做：材料类型之间的内容包含关系（Task 含 notes、Routine 含 skill 等）——任务记录员 16:09–16:10 仍是探讨；助手提议记卡，用户未采纳，只追问了 Project 现况。随后落地的是另一件事：框架仓 [#130](https://github.com/VirusPC/edges/pull/130)（`.edges` 下自定义类别），不能覆盖这条未拍板的包含关系。背景和目标不足以写卡。
- 不做：CONTEXT.md 漏记 Project 可含 memory / skills / routines —— 同场助手提议补一小卡，用户未采纳。
- 不做：Git squash 机制问答 —— 通用-辅助 16:35–16:37，纯问答，后续不必回查。
- 不做：私密仓「Edges 项目级 harness、组织级提效与多 agent 对照」笔记 —— 已在仍开的 [private#19](https://github.com/VirusPC/edges-brain-viruspc-private/pull/19)，去重。助手在收尾时提的两件未定事项（把「组织级提效」补进对比报告、用 Cloudflare Sandbox SDK 给同事各配真沙箱）用户本窗未采纳，不落卡。
- 不做：在用户电脑上启动 open-grokbot 的 Electron —— 全栈开发专家 17:22–17:48，已完成的一次性操作，后续不必再查。仓库锁文件里 `@opentelemetry/api` 版本不一致是助手提议正式修，用户未表态；「再开一下」是重新打开窗口，不是同意修依赖。
- 不做：改造认知优势目录 `edges/`、dream 机制、个人大脑独立 tasks 页、routines/.edges 骨架与「复盘的复盘」、将 agent-infra 登记为正式 Project 并沉淀 MCP / CLI 与 Code Mode 两篇笔记、edges 新文格式补上「参考资料」、按 Dashboard 思路重构 AI News、11-15 日复盘本身 —— 已分别合入 [#497](https://github.com/VirusPC/edges-brain-viruspc/pull/497)、[#499](https://github.com/VirusPC/edges-brain-viruspc/pull/499)、[#501](https://github.com/VirusPC/edges-brain-viruspc/pull/501)、[#500](https://github.com/VirusPC/edges-brain-viruspc/pull/500)、[#502](https://github.com/VirusPC/edges-brain-viruspc/pull/502)、[#503](https://github.com/VirusPC/edges-brain-viruspc/pull/503)、[#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482)、[#496](https://github.com/VirusPC/edges-brain-viruspc/pull/496)，去重。
- 不做：给高优 edges 任务补充「这将是全仓库信噪比最高的地方」—— 已在仍开的 [#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504)，去重。
- 不做：建立 CodeRabbit CR 规则自迭代流程 —— 已在仍开的 [#498](https://github.com/VirusPC/edges-brain-viruspc/pull/498) 与框架仓 [edges#129](https://github.com/VirusPC/edges/pull/129)，去重。
- 不做：把「一句话 + 解释 + 参考资料」再写成一条助手现在就要遵守的记忆 —— 格式决定已写入已合入的 [#503](https://github.com/VirusPC/edges-brain-viruspc/pull/503) 任务卡；目录改造尚未实施，AGENTS / 记忆层并不缺一条现行规则。
- 不做：给 Grok Bot 接入 Podwise —— 用户在 19:23 问过有无 CLI / Connector 并说「我想给你接入」，助手说明可手动加官方 MCP、请用户确认后再弹出登录；用户未确认接入，话题转入 MCP 与 CLI 方法论（已由 [#502](https://github.com/VirusPC/edges-brain-viruspc/pull/502) 落成笔记）。账号套餐、走远程 MCP 还是本机 CLI 均未谈清，写卡就要编造。
- 不做：KV Cache / Prompt Caching 与记忆的关系 —— 同场概念答疑，用户已理解为性能优化；不是可回查的产品事实，也不另写记忆。
- 不做：用 `/teach` 学习 Anthropic「Building always-on agents」—— Coding Agent 专家 03:49 起课，窗口结束前还在确认学习目标，没有正文结论，不编学习笔记。
- 不做：框架仓独立仓 AGENTS.md 写入 edges-harness 标记 —— 更早的开放任务，已在仍开的 [edges#120](https://github.com/VirusPC/edges/pull/120)，去重。
- 不做：完善面试项目介绍与 Harness 技术深挖 —— 本窗未见新开指令，已在仍开的 [private#18](https://github.com/VirusPC/edges-brain-viruspc-private/pull/18)，去重。公开清单不写私人正文。
- 不做：`posts/` —— 由人维护，不自动写入。
