# 2026-11-05 日复盘

## 范围

时间窗：2026-11-04 05:16:22 → 2026-11-05 05:16:22（Asia/Shanghai）；日历日取回看结束日 **2026-11-05**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-05/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- **主源局限**：本自动化子代理工具列表 **没有** cursor `ReadTranscript`。窗口内消息由 `/home/box/agent-data/search-index.db`（messages 表）导出为按助手正序 jsonl（`in_main_chat=1`；非 main 共 0 条已跳过）。见该目录 `_capture-meta.md`。
- 窗口内有活动并落盘 **7** 个助手、共 **114** 条：PI Coding Agent（89）、Grok Bot（7）、个人简历管理员（6）、通用-辅助（5）、4070ts-win设备助手（4）、日复盘（2）、AI最佳实践（1）。
- **Langfuse 缺口**：本机有 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`，但 **`LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置**。按 Skill 不编 URL、不换旧 traces/sessions API；本窗 **未拉** Langfuse observations。候选只来自 search-index jsonl。「范围」记此缺口后继续。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；业务正文写顶层内容子模块，不写工作区根。Skill commit：`f8f96916b1e9f542dc33624b5ffcc3aaebea7785`。
- 去重（窗口内已合 / 已开，勿重复沉淀正文）：
  - brain [#435](https://github.com/VirusPC/edges-brain-viruspc/pull/435) docs(daily-retro): 2026-11-04 日复盘（**OPEN**）
  - brain [#436](https://github.com/VirusPC/edges-brain-viruspc/pull/436) docs(notes): Pi 工具包与 Pi Coding Agent 分层（**OPEN**；已迁入 learning Project notes）
  - brain [#437](https://github.com/VirusPC/edges-brain-viruspc/pull/437) chore: 把 Edges 随包 skill 装进项目 `.agents/skills`（已合）
  - edges [#101](https://github.com/VirusPC/edges/pull/101) docs(skills): 默认把 skill 装进当前项目（已合）
  - workspace [#18](https://github.com/VirusPC/edges-workspace-viruspc/pull/18) chore: 把随包技能装进当前项目（已合）
  - private [#9](https://github.com/VirusPC/edges-brain-viruspc-private/pull/9) 把 Edges 技能装进项目目录（已合）
  - 近期已合对照：brain [#434](https://github.com/VirusPC/edges-brain-viruspc/pull/434)、[#433](https://github.com/VirusPC/edges-brain-viruspc/pull/433)、[#432](https://github.com/VirusPC/edges-brain-viruspc/pull/432)、[#431](https://github.com/VirusPC/edges-brain-viruspc/pull/431)、[#430](https://github.com/VirusPC/edges-brain-viruspc/pull/430)、[#429](https://github.com/VirusPC/edges-brain-viruspc/pull/429)、[#428](https://github.com/VirusPC/edges-brain-viruspc/pull/428)

## 实际怎样

- **PI Coding Agent**：厘清 Pi 工具包 vs Pi Coding Agent，在个人大脑开笔记并经 [#436](https://github.com/VirusPC/edges-brain-viruspc/pull/436) 从仓根 notes 迁到 `.edges/projects/2026-10-28--learning/notes/`。踩到「云端 Agent 读不到本机/全局 skill」后，改 Edges onboarding 默认项目内安装（edges [#101](https://github.com/VirusPC/edges/pull/101) 已合），并对公开脑 / 私密脑 / workspace 重跑 `init -- -y`（brain [#437](https://github.com/VirusPC/edges-brain-viruspc/pull/437)、private [#9](https://github.com/VirusPC/edges-brain-viruspc-private/pull/9)、workspace [#18](https://github.com/VirusPC/edges-workspace-viruspc/pull/18) 均已合）。用 Langfuse 核对三处安装均经 `edges-onboarding` 触发，并写入观测数据集 `edges-onboarding-execution-2026-11`（观测集，无金标）。npm `@viruspc/edges@latest` 仍为 0.5.0、尚未带 #101 文案；用户未当场要求开发版卡。
- **Grok Bot**：4070ts 崩溃例程两次 CLEAR（主机未连上）；转发 linux.do 羊毛摘要；#101 合入后本机 skill 库与 `/workspace/edges` CLI 已同步冒烟。
- **个人简历管理员**：改一处公开口径措辞；「Edges 没讲好」停在澄清卡点，未交付可入库正文。
- **通用-辅助**：RAG 是否做 query rewrite、LlamaIndex 有无相关组件——问答，无沉淀要求。
- **4070ts-win设备助手 / 日复盘 / AI最佳实践**：例程巡检 CLEAR、11-04 日复盘 #435 回报、助手自我介绍；均不产生新候选。

## 建议补充内容清单

- **没有新候选可落文件。** 本窗实质产出（Pi 笔记 #436 OPEN、onboarding 默认项目内 #101、三处 skill 安装 #437 / private#9 / workspace#18、Langfuse onboarding 观测集）已分别落在上列 PR / Langfuse；本扫描不重复写入。
- 不做：#435 —— 昨日日复盘 INDEX，本篇另开今日路径。
- 不做：#436 —— Pi 笔记已在 OPEN PR（learning Project notes），不并行另写。
- 不做：#437 / private#9 / workspace#18 / edges#101 —— 已合，去重。
- 不做：发 npm 带 #101 的 `@viruspc/edges` patch —— 对话只陈述「latest 仍是 0.5.0」并等用户发话；背景/目标未谈清成卡，不编造任务。
- 不做：Langfuse 数据集 `edges-onboarding-execution-2026-11` —— 已写入观测平台，不进 git。
- 不做：「云端 Agent 需项目内 skill / onboarding 默认不加 -g」单独 memory —— 产品改动与安装结果已落 #101 与三处安装 PR；再写会与已合入文档重复。
- 不做：Langfuse BASE_URL/HOST 环境缺口 —— 已在既有日复盘「范围」与记忆中记录；本窗仍缺口，不另造记忆条目。
- 不做：4070ts 离线巡检、linux.do 羊毛摘要 —— 运维瞬时状态 / 资讯转发，用户未要求落卡。
- 不做：个人简历口径改写与「Edges 没讲好」后续 —— 私人内容且未谈清完整改稿；私人正文不进公开仓；本窗亦无足够必填另开 private 卡。
- 不做：RAG / LlamaIndex query rewrite 问答 —— 无沉淀要求。
- 不做：`posts/` —— 由人维护。
- 不做：本窗因 Langfuse 地址变量缺口未拉到的 observations —— 无正文可核对，不编候选。
- 私人内容 **0** 条新候选，未另开 edges-brain-viruspc-private PR。
