# 2026-11-19 日复盘

## 范围

时间窗：2026-11-18 05:17:38 → 2026-11-19 05:17:38（Asia/Shanghai）；日历日取回看结束日 **2026-11-19**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-19/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- **主源局限**：本运行没有 `ReadTranscript`（该工具在本次自动化里只能读本助手会话，读不了其他助手）。窗口内消息由本机 search-index 导出，只含 `in_main_chat=1`。窗内非主聊天消息 0 条。search-index 最新一条消息时间为 2026-11-18 19:39:36（Asia/Shanghai），距窗口结束约 9.6 小时；索引文件本身更新到 2026-11-18 23:18，该时点之后若有对话，本窗未能覆盖。
- 共扫描 72 个助手配置；窗口内有活动并落盘 **5** 个助手、共 **61** 条：Coding Agent 专家（29）、Grok Bot（13）、Agent Eval 专家（12）、4070ts-win设备助手（5）、日复盘（2）。`unknown_agent_ids` 为空。
- **Langfuse 缺口**：本机有公钥、私钥，但 `LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置（缺 BASE_URL/HOST 配置类）。按 Skill 不编 URL、不换其它读数路径；本窗未拉 Langfuse observations，候选只来自 search-index jsonl。
- 入口：Skill 与 INDEX 读自公开脑默认分支 main 的最新版本（commit `c7ff9273bef30fa3f734272ab9af881d6cc7b29e`）。
- 去重：窗内日复盘回传的前一日公开 PR [#514](https://github.com/VirusPC/edges-brain-viruspc/pull/514)（2026-11-18 日复盘，仍开）不重写。此前仍开、不重写的还有：公开脑 [#513](https://github.com/VirusPC/edges-brain-viruspc/pull/513)、[#511](https://github.com/VirusPC/edges-brain-viruspc/pull/511)、[#506](https://github.com/VirusPC/edges-brain-viruspc/pull/506)、[#505](https://github.com/VirusPC/edges-brain-viruspc/pull/505)、[#504](https://github.com/VirusPC/edges-brain-viruspc/pull/504)、[#498](https://github.com/VirusPC/edges-brain-viruspc/pull/498)；私密仓 [private#20](https://github.com/VirusPC/edges-brain-viruspc-private/pull/20)、[private#18](https://github.com/VirusPC/edges-brain-viruspc-private/pull/18)。

## 建议补充内容清单

- **公开候选 2 条**：
  - `projects/2026-11-09--dsh/notes/2026-11-18--cordis-插件依赖与-unity-组件模式对比/INDEX.md`（并登记 `projects/2026-11-09--dsh/notes/README.md`）。来源：Coding Agent 专家 2026-11-18 对话。记录 Cordis 用服务名做运行时依赖、静默等待与热插拔失败模式，以及和 Unity 组件模式、Pi 四个默认工具的差别；并说明换 agent loop 时要保住整份事件契约，而不只是事件名。
  - `notes/2026-11-18--评测与任务卡里已证实的失败模式/INDEX.md`（并登记 `notes/README.md`）。来源：Agent Eval 专家 2026-11-18 对话。对照已跑完评测里能拿出证据的五类失败，以及任务卡里评测尚未覆盖的缺口，并标明当时还不能写成「已发现」的条目。
- **私人候选 0 条**，未开私密 PR。
- 不做：把失败模式写成评测目录下的分类页，并给每类配回归题草稿 —— 助手两次提议，用户未采纳。
- 不做：把 DeepSeek Harness 与 Pi 的对比整理成卡片放进面试题库，以及把评测结论压成 90 秒口述稿 —— 助手提议，用户未采纳。
- 不做：4070ts 崩溃监控（早晚两次均为未连上 CLEAR）—— 例程输出，无新结论；该机持续离线、未验证窗口仍待核对，属设备助手跟进，不落卡。
- 不做：语雀打开缓慢及面试前网络是否够用 —— 一次性排障与当时环境询问，后续不形成仓库约定；涉及私人当时网络环境，不入公开仓。
- 不做：前一日日复盘 PR #514 的回传 —— 已开 PR，去重。
- 不做：`posts/` —— 由人维护，不自动写入。
