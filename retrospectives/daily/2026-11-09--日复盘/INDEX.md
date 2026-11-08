# 2026-11-09 日复盘

## 范围

时间窗：2026-11-08 05:17:47 → 2026-11-09 05:17:47（Asia/Shanghai）；日历日取回看结束日 **2026-11-09**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-09/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- **主源局限**：本自动化运行 **没有** cursor `ReadTranscript`。窗口内消息由 `/home/box/agent-data/search-index.db`（messages 表）导出为按助手正序 jsonl（`in_main_chat=1`；非 main 共 1 条已跳过）。见该目录 `_capture-meta.md`。其余已登记助手在窗口内无主聊天消息，未单独落盘。
- 窗口内有活动并落盘 **7** 个助手、共 **288** 条：IT资产管理（107）、任务记录员（95）、Grok Bot（33）、Agent Eval 专家（22）、通用-辅助（19）、Codex→Langfuse（10）、日复盘（2）。
- **Langfuse 缺口**：本机有 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`，但 **`LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置**。按 Skill 不编 URL、不换旧 traces/sessions API；本窗 **未拉** Langfuse observations。候选只来自 search-index jsonl。另：窗内对话多次观测到自建实例经 Cloudflare 返回 530（源站不可达）；约 15:00（Asia/Shanghai）起恢复后完成补传。这与地址变量缺口是两层问题。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；业务正文写顶层内容子模块，不写工作区根。Skill commit：`d1aff7cc8a70364a04df496864ba6873dc741daf`。
- 去重（窗口内已合 / 已开，勿重复沉淀正文）：
  - brain [#445](https://github.com/VirusPC/edges-brain-viruspc/pull/445) docs(daily-retro): 2026-11-08 日复盘（已合；含 Codex/Cursor Cloud 环境对比笔记，不重写）
  - brain [#446](https://github.com/VirusPC/edges-brain-viruspc/pull/446) task(backlog): 现场配置 minigtr 断电恢复后自动开机（已合）
  - brain [#447](https://github.com/VirusPC/edges-brain-viruspc/pull/447) notes: UPS 断电调查与只读持久监测（已合）
  - brain [#442](https://github.com/VirusPC/edges-brain-viruspc/pull/442)、[#441](https://github.com/VirusPC/edges-brain-viruspc/pull/441)、[#440](https://github.com/VirusPC/edges-brain-viruspc/pull/440) 此前待审日复盘 / 资讯归档（窗内已合）
  - brain [#448](https://github.com/VirusPC/edges-brain-viruspc/pull/448) docs: 将完整 Edges 消融实验入口归入框架（OPEN）
  - edges [#108](https://github.com/VirusPC/edges/pull/108)–[#113](https://github.com/VirusPC/edges/pull/113) 个人大脑跨客户端接入指南 / onboarding 与 CLI 发版至 `@viruspc/edges@0.5.6`（已合）
  - edges [#114](https://github.com/VirusPC/edges/pull/114) feat: 完整归档 Harbor 实验并新增可复现合成评测（OPEN）
  - private [#11](https://github.com/VirusPC/edges-brain-viruspc-private/pull/11) feat: 交付真实记忆三组消融数据、结果与审计（OPEN）

## 实际怎样

- **日复盘**：凌晨回报 11-08 日复盘 PR [#445](https://github.com/VirusPC/edges-brain-viruspc/pull/445) 已开、当时未合并（INDEX + Codex/Cursor Cloud 环境笔记）。当晚用户让 Grok Bot 合并待审 PR，#445 与 [#442](https://github.com/VirusPC/edges-brain-viruspc/pull/442)/[#441](https://github.com/VirusPC/edges-brain-viruspc/pull/441)/[#440](https://github.com/VirusPC/edges-brain-viruspc/pull/440) 已 squash 合入。
- **任务记录员**：上午继续「个人大脑接入各 Agent 客户端」grill：纠正 grill 结论应进 ADR 而非 superpowers/specs；经多轮 HTML 审阅写入 ADR 0053；实施后合入 edges [#109](https://github.com/VirusPC/edges/pull/109)。用户纠正 Grok Bot 不是「绑定工作区」，而是所有 Bot 共用的共享记忆保存大脑入口、再读 AGENTS.md → [#111](https://github.com/VirusPC/edges/pull/111)。随后把「可选接入 Langfuse 观测」单列为第 5 步 → [#112](https://github.com/VirusPC/edges/pull/112)。发版 [#113](https://github.com/VirusPC/edges/pull/113)，`@viruspc/edges@0.5.6`（onboarding 0.7.2 / edges 0.4.2）。
- **Grok Bot**：上午至午间小时导出因源站 530 失败；约 15:00 用户要求补传断网期间数据：Grok Bot 积压会话已补并核对一致；Codex Cloud 当时可列出的轮次已在服务端；Cursor Cloud 找到至少两段历史会话，但现有实时 hook 不能回放（发送失败后无持久待传队列）。用户确认仓库级 hooks 在 Cursor Cloud 能触发，Codex Cloud 不能、靠仓外轮询。
- **Codex→Langfuse**：上午出口访问被拦；约 15:06 恢复轮询；按用户要求做历史补扫并核对应入库数量，重跑无重复写入。
- **IT资产管理**：下午做设备恢复。用户纠正 4070ts 的 Windows 与 Ubuntu 不能同时在线（同一台双系统）。经局域网确认 Mac mini 当时已开机，桌面登录后相关应用自行恢复；用户发现重启后停在登录界面，所以桌面应用当时没起来。按用户要求记 minigtr 来电自启动待办 → [#446](https://github.com/VirusPC/edges-brain-viruspc/pull/446)（已合）。晚间追查断电原因并配置 UPS 只读持久监测，按用户要求写笔记，并补上 NAS 独立 UPS 记录与次日接线核对事项 → [#447](https://github.com/VirusPC/edges-brain-viruspc/pull/447)（已合）。
- **Agent Eval 专家**：分析 Langfuse `user_disagreement_llm`：整体异议占比不能当作可靠指标，因为大部分评分在裁判缺少上一条助手回复时按规则记 0。已见表征以理解偏差和方案设计不合预期为主。回查 session 后，不能把不满意归因于「没用 grill 和 plan」。助手提议整理成 Page，用户未确认。
- **通用-辅助**：排查某文档应用反复申请「媒体资料库」权限，该应用自身原因未确认；公开反馈里有 Agent 扫主目录碰到受保护媒体目录、以及底层媒体栈两类解释。另查 MiniMax Code 有官方 PTC，Kimi Code / Z Code 公开文档未见内置 PTC。

## 建议补充内容清单

- **本次 PR 仅落日复盘 INDEX**：窗内用户明确要求的笔记 / 任务均已在当轮对话中开 PR 并合入，无新的公开候选文件。
- 不做：[#445](https://github.com/VirusPC/edges-brain-viruspc/pull/445) 及其中 Codex/Cursor Cloud 环境对比笔记 —— 已合，去重。
- 不做：[#446](https://github.com/VirusPC/edges-brain-viruspc/pull/446) minigtr 来电自启动任务 —— 已合，去重。
- 不做：[#447](https://github.com/VirusPC/edges-brain-viruspc/pull/447) UPS 断电调查与只读持久监测笔记（含 NAS UPS 补记与次日接线核对）—— 已合，去重。
- 不做：edges [#108](https://github.com/VirusPC/edges/pull/108)–[#113](https://github.com/VirusPC/edges/pull/113) 个人大脑跨客户端接入、共享记忆表述、Langfuse 可选第 5 步及 0.5.6 发版 —— 已合入框架仓，去重。
- 不做：[#440](https://github.com/VirusPC/edges-brain-viruspc/pull/440) / [#441](https://github.com/VirusPC/edges-brain-viruspc/pull/441) / [#442](https://github.com/VirusPC/edges-brain-viruspc/pull/442) —— 窗内已合，去重。
- 不做：[#448](https://github.com/VirusPC/edges-brain-viruspc/pull/448)、edges [#114](https://github.com/VirusPC/edges/pull/114)、private [#11](https://github.com/VirusPC/edges-brain-viruspc-private/pull/11)（Harbor / 记忆消融实验）—— 已有 OPEN PR；本窗 search-index 无对应可核对正文，不另写。
- 不做：Cursor Cloud 上报逻辑（仓库 hooks 可触发、失败无持久队列、历史不能直接回放）以及「需另做适配」—— 用户只询问现行逻辑，未要求补记或开卡。
- 不做：`user_disagreement_llm` 分析结果 —— 助手提议整理成 Page，用户未确认；「先修裁判缺上下文」仅为建议，用户随后转向查 grill/plan 与 session，未要求开卡。grill/plan 工作流已有记忆，不重复写。
- 不做：4070ts Windows / Ubuntu 不能同时在线 —— 用户当次纠正统计口径，未要求落记忆；双系统安装细节对话未展开，写了易越界。
- 不做：Mac mini 重启停在登录界面 / 远程桌面登录 —— 用户未要求记任务，随即转向来电自启动（#446）。
- 不做：文档应用申请媒体资料库权限、三款客户端是否有 PTC —— 用户只是询问；前者具体原因未确认，写了会编造。
- 不做：Langfuse 530 与断网补传、Codex→Langfuse 出口恢复 —— 运维瞬时状态；地址变量缺口已在「范围」记录；不另造记忆。
- 不做：本窗因 Langfuse 地址变量缺口未拉到的 observations —— 无正文可核对，不编候选。
- 不做：`posts/` —— 由人维护。
- 本窗私人新候选 **0**，未另开 edges-brain-viruspc-private PR。
