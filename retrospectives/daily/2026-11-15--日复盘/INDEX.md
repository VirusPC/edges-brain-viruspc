# 2026-11-15 日复盘

## 范围

时间窗：2026-11-14 05:18:29.142 → 2026-11-15 05:18:29.142（Asia/Shanghai）；日历日取回看结束日 **2026-11-15**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-15/`（按时间正序 jsonl，永久保留，不入库）。

- **主源局限**：本自动化运行没有 `ReadTranscript`。窗口内消息由本机 search-index 导出，且只含 `in_main_chat=1`；窗内另有 7 条非主聊天消息已跳过、未落盘。部分助手回复以附件或「上面这个文件」交付，search-index 正文不一定带上附件全文；本窗一条公开笔记候选对照了落盘对话与本机已有的笔记原稿，不另编附件里没有、对话里也没有的内容。
- 共扫描 72 个助手配置；窗口内有活动并落盘 **6** 个助手、共 **380** 条：Grok Bot（261，16:08–22:40）、AI CR 专家（77，20:08–22:40）、Codex→Langfuse（17，12:13–21:13）、通用-辅助（13，17:39–18:40）、生活日常（10，18:12–18:14）、日复盘（2，05:30，是 11-14 失败运行的收尾，不是本次要重做的 11-14 扫描正文）。其余配置在窗内没有主聊天消息，未写空 jsonl。
- **Langfuse 缺口**：本机有公钥、私钥，但 `LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置（缺 BASE_URL/HOST 配置类）。按 Skill 不编 URL、不换其它读数路径；本窗未拉 Langfuse observations，候选只来自 search-index jsonl。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc`（main `07d91c4beb0834eaaf2c263b212f747e27ab6430`）→ 公开脑；PR 开在子仓。Skill / 公开脑入口 commit：`285d33a21f50e1b5252b617b2b4dba41bdc4f844`（公开脑 main）。
- 去重：11-14 日复盘 [#487](https://github.com/VirusPC/edges-brain-viruspc/pull/487) 已于 2026-11-14 14:21:19Z 合入，不重写、不补做昨天的扫描。窗内已由助手当场写入并合入的，不重写：公开脑 [#488](https://github.com/VirusPC/edges-brain-viruspc/pull/488)–[#495](https://github.com/VirusPC/edges-brain-viruspc/pull/495)、[#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465)；框架仓 [edges#125](https://github.com/VirusPC/edges/pull/125)–[#128](https://github.com/VirusPC/edges/pull/128)；私密仓 [private#16](https://github.com/VirusPC/edges-brain-viruspc-private/pull/16)–[#17](https://github.com/VirusPC/edges-brain-viruspc-private/pull/17)、[#15](https://github.com/VirusPC/edges-brain-viruspc-private/pull/15)；工作区指针 [#25](https://github.com/VirusPC/edges-workspace-viruspc/pull/25)、[#26](https://github.com/VirusPC/edges-workspace-viruspc/pull/26)。仍开、不重写：公开脑 [#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482)（按 Dashboard 思路重构 AI News）、框架仓 [edges#129](https://github.com/VirusPC/edges/pull/129)（CodeRabbit CR 规则自迭代）、[edges#120](https://github.com/VirusPC/edges/pull/120)（独立仓 AGENTS.md 写入 edges-harness 标记）。

## 建议补充内容清单

- **公开候选 1 条**：CodeRabbit 代码审查规则机制笔记。建议去处：公开脑 `notes/`。本次 PR 写入路径：[`notes/2026-11-14--coderabbit-代码审查规则机制/INDEX.md`](../../../notes/2026-11-14--coderabbit-代码审查规则机制/INDEX.md)（须同步登记 `notes/README.md`）。用户当晚要求系统梳理并写笔记，对照官方文档核实后用账号做了中央仓实验，正式基线已合入；对话里的原稿未入库，本篇补上实证与现行落地现状。
- **私人候选 0 条**。无私人 PR。
- 不做：把 CodeRabbit 中央配置接到各仓的任务卡 —— 用户虽说过要记 Task，但正式基线已由 coderabbit#2 合入，业务仓不必再做本地关联；剩余「在 edges 业务 PR 上对照复核」已写在仍开的 [edges#129](https://github.com/VirusPC/edges/pull/129) 背景里，该卡也写明不把已做完的中央配置接入再写成另一张未决卡，去重。
- 不做：CodeRabbit CR 规则自迭代任务卡 —— 已在仍开的 [edges#129](https://github.com/VirusPC/edges/pull/129)，去重。
- 不做：日复盘任务判定规则 —— 已写入日复盘 Skill，随 [#495](https://github.com/VirusPC/edges-brain-viruspc/pull/495) 合入 main，去重。
- 不做：worktree 隔离笔记、记忆与 edges init 模板 —— 已分别合入 [#493](https://github.com/VirusPC/edges-brain-viruspc/pull/493)、[edges#127](https://github.com/VirusPC/edges/pull/127)、[edges#128](https://github.com/VirusPC/edges/pull/128)，去重。
- 不做：AI 研发流程优化 Project 与 Cursor 云端耗时报告 —— 已合入 [#494](https://github.com/VirusPC/edges-brain-viruspc/pull/494)，去重。
- 不做：big_model_radar 调研追加、Dashboard / AI News 相关卡 —— 已合入 [#489](https://github.com/VirusPC/edges-brain-viruspc/pull/489)；仍开的 [#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482) 不重写。
- 不做：create-learning-notes / 按 CLI 动作拆分笔记与任务技能，以及 0.6.0、0.6.1 发版 —— 已合入 [edges#125](https://github.com/VirusPC/edges/pull/125)–[#128](https://github.com/VirusPC/edges/pull/128) 并发布到 npm，属于已完成的一次性变更。
- 不做：再写一篇 Codex Cloud 事后抄录到 Langfuse 的原理笔记 —— 公开脑已有 `notes/2026-10-24--codex-cloud-会话追踪到自建-langfuse/INDEX.md`，本窗问答是对同一套箱外轮询的说明，没有新的可入库架构结论。同步中断与登录凭证到期是瞬时运维，助手已自行处理，不落卡。
- 不做：离线主机开机后再升级 CLI、对齐工作区 —— 一次性运维收尾，助手已承诺连上再补，完成后无后续查阅价值；公开仓也不写主机名单。
- 不做：阶跃星辰交流群二维码页、Codex 订阅档位询价 —— 前者是已发布且会过期的一次性汇总，后者是纯问答，后续用不到。
- 不做：Grok Bot 相关公开演讲的问答 —— 当场讲清后，用户接着要求的是学习笔记 skill，该 skill 已并入框架并发布；用户没有要求把这场演讲本身写成学习笔记。
- 不做：生活日常里的瞬时出行问答 —— 后续用不到，不落私人文件，公开清单不写私人正文。
- 不做：11-14 日复盘 INDEX —— 已随 [#487](https://github.com/VirusPC/edges-brain-viruspc/pull/487) 合入。
- 不做：`posts/` —— 由人维护，不自动写入。
