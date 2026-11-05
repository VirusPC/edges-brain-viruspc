# 2026-11-06 日复盘

## 范围

时间窗：2026-11-05 05:21:29 → 2026-11-06 05:21:29（Asia/Shanghai）；日历日取回看结束日 **2026-11-06**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-06/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- **主源局限**：本自动化子代理工具列表 **没有** cursor `ReadTranscript`。窗口内消息由 `/home/box/agent-data/search-index.db`（messages 表）导出为按助手正序 jsonl（`in_main_chat=1`；非 main 共 1 条已跳过）。见该目录 `_capture-meta.md`。
- 窗口内有活动并落盘 **9** 个助手、共 **149** 条：DIY Coding Agent（29）、Grok Bot（27）、个人简历管理员（27）、全栈开发专家（19）、Codex→Langfuse（17）、IT资产管理（11）、AI 硬件专家（9）、Coding Agent 专家（6）、4070ts-win设备助手（4）。
- **Langfuse 缺口**：本机有 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`，但 **`LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置**。按 Skill 不编 URL、不换旧 traces/sessions API；本窗 **未拉** Langfuse observations。候选只来自 search-index jsonl。「范围」记此缺口后继续。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；业务正文写顶层内容子模块，不写工作区根。Skill commit：`e3b3eb639349e49a3bddf0dfdaabf1302c1c7dc1`。
- 去重（窗口内已合 / 已开，勿重复沉淀正文）：
  - brain [#439](https://github.com/VirusPC/edges-brain-viruspc/pull/439) docs: MiniMax Code agent-core vs Pi under learning Project（已合）
  - brain [#438](https://github.com/VirusPC/edges-brain-viruspc/pull/438) docs(daily-retro): 2026-11-05 日复盘（已合）
  - brain [#436](https://github.com/VirusPC/edges-brain-viruspc/pull/436) docs(notes): Pi 工具包与 Pi Coding Agent 分层（已合）
  - brain [#435](https://github.com/VirusPC/edges-brain-viruspc/pull/435) docs(daily-retro): 2026-11-04 日复盘（已合）
  - brain [#437](https://github.com/VirusPC/edges-brain-viruspc/pull/437) chore: 把 Edges 随包 skill 装进项目（已合）
  - private [#10](https://github.com/VirusPC/edges-brain-viruspc-private/pull/10) 新建个人简历打磨 Project（已合）
  - workspace [#19](https://github.com/VirusPC/edges-workspace-viruspc/pull/19) chore: 私密脑指针更新到含简历打磨 Project 的 main（已合）
  - 对照：edges [#101](https://github.com/VirusPC/edges/pull/101)、private [#9](https://github.com/VirusPC/edges-brain-viruspc-private/pull/9)、workspace [#18](https://github.com/VirusPC/edges-workspace-viruspc/pull/18)（均已合）；扫描时 brain open 列表为空

## 实际怎样

- **DIY Coding Agent**：确认 #436 已在 learning Project notes 下并合入；梳理 MiniMax Code agent-core 相对 Pi 的回合外壳，写成学习笔记并开 [#439](https://github.com/VirusPC/edges-brain-viruspc/pull/439)（后已合）。顺带允许私有脑 Auto-review 合入规则。
- **Grok Bot**：linux.do 羊毛摘要；MacBook 内存挤爆排查并关 Comet/Chrome（Defender 受 MDM 管无法本机关）；两次 4070ts 巡检均未连上；凌晨合入 brain #435/#438/#439，以及 blog#15 与 stream-deck#1；blog#12 冲突未合。
- **个人简历管理员**：在 private 开「个人简历打磨」Project 入库草稿与阿酥对照（[#10](https://github.com/VirusPC/edges-brain-viruspc-private/pull/10) 已合）；workspace 子模块指针 [#19](https://github.com/VirusPC/edges-workspace-viruspc/pull/19) 已合；Agent Store 路径指针已更新（未改仓）。
- **全栈开发专家**：Langfuse Discussion #19327 有社区用户（非官方）给 Codex 插件改法建议；讨论后结论是暂不硬提 PR，先等官方表态。
- **Codex→Langfuse**：用户要求鉴权失效时助手自行修复；改掉「禁止自动 codex login」的 Agent profile 硬约束；当时已 Logged in，重跑轮询成功。
- **IT资产管理**：给 Mac mini 的 Codex 装 Lovable 官方 MCP + skill，并完成 OAuth。
- **AI 硬件专家**：DIY 信息渠道、双十一 AI 产品与 ESP32 开发板选型问答。
- **Coding Agent 专家**：Java 接 Langfuse（OTLP）与 AgentScope 可观测问答。
- **4070ts-win设备助手**：早晚两次崩溃巡检均未连上。

## 建议补充内容清单

- **没有新候选可落文件。** 本窗实质产出（MiniMax Code 笔记 #439、Pi 笔记 #436、个人简历打磨 private#10、workspace#19、日复盘 #435/#438）已分别合入上列 PR；本扫描不重复写入。
- 不做：#439 / #436 / #438 / #435 / private#10 / workspace#19 —— 已合，去重。
- 不做：Langfuse Codex 插件按 Discussion #19327 开 PR —— 对话结论为「现在不必硬提」、等官方表态；背景/目标未谈清成卡，不编造任务。
- 不做：Codex→Langfuse「鉴权挂了自行 login」—— 已改该助手 Agent profile；未要求写入公开脑 memory，不另造条目。
- 不做：Lovable MCP/skill 装到 Mac mini Codex —— 本机运维安装已完成，用户未要求落笔记/任务。
- 不做：DIY 渠道 / 双十一 AI 硬件 / 开发板选型、Java·AgentScope 接 Langfuse 问答 —— 无沉淀要求。
- 不做：MacBook 内存挤爆与关进程、4070ts 离线巡检、linux.do 羊毛摘要 —— 运维瞬时状态 / 资讯转发，用户未要求落卡。
- 不做：blog#12 冲突、Auto-review 私有脑合入规则 —— 分别在 blog 仓与 Cursor 规则侧，不进公开脑。
- 不做：Langfuse BASE_URL/HOST 环境缺口 —— 已在既有日复盘「范围」与记忆中记录；本窗仍缺口，不另造记忆条目。
- 不做：本窗因 Langfuse 地址变量缺口未拉到的 observations —— 无正文可核对，不编候选。
- 不做：`posts/` —— 由人维护。
- 私人内容 **0** 条新候选，未另开 edges-brain-viruspc-private PR（简历打磨已在 private#10 合入，不重复）。
