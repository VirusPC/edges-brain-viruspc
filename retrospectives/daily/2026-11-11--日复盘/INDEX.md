# 2026-11-11 日复盘

## 范围

时间窗：2026-11-10 05:16 → 2026-11-11 05:16（Asia/Shanghai）；日历日取回看结束日 **2026-11-11**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-11/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- **主源局限**：本自动化运行没有 `ReadTranscript`。窗口内消息由本机 search-index（messages 表，`in_main_chat=1`）导出。
- 窗口内有活动并落盘 **11** 个助手、共 **279** 条：全栈开发专家（67）、通用（60）、Agent Eval 专家（49）、Grok Bot（40）、个人简历管理员（37）、Codex→Langfuse（6）、通用-辅助（5）、最新资讯（5）、4070ts-win设备助手（4）、IT资产管理（4）、日复盘（2，自身，不分析）。
- **Langfuse 缺口**：本机有公钥、私钥，但 `LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置。按 Skill 不编 URL、不换旧接口；本窗未拉 Langfuse observations，候选只来自 search-index jsonl。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；PR 开在子仓。Skill commit：`6ddfe47d19343beb4bad7ac2dcf1daad1cf4b43d`（公开脑 main）。
- 去重：窗内已合 brain [#456](https://github.com/VirusPC/edges-brain-viruspc/pull/456)（11-10 日复盘）、[#457](https://github.com/VirusPC/edges-brain-viruspc/pull/457)（OpenViking 记忆机制笔记）、[#458](https://github.com/VirusPC/edges-brain-viruspc/pull/458)（AI 周报模板与两期重跑）、[#459](https://github.com/VirusPC/edges-brain-viruspc/pull/459)（IT 资产管理 project）及此前的 #448–#455；private #11、#13 已合；edges [#121](https://github.com/VirusPC/edges/pull/121)（沉淀成本笔记与任务）已合，[#120](https://github.com/VirusPC/edges/pull/120) 仍 OPEN。

## 实际怎样

- **全栈开发专家**：围绕 edges [#120](https://github.com/VirusPC/edges/pull/120) 反复收口 super 材料面的识别方式。用户先嫌入库规则啰嗦、防御性措辞多，要求只写规则本身；随后要求把 skill 按核心原则重构；再提出用保留词 scope 取代 `--super`，定过 `@super`，最后怀疑连保留词都不需要，倾向由 scope 指向的目录决定材料位置、越具体越优先，并按「先定要 harness 的目录 → 再定材料位置 → 读写」的顺序表达。对话结束时设计未定稿，代码未改。
- **通用**：OpenViking、TencentDB Agent Memory 与知迹团队记忆的对比讨论；笔记与私密对比报告已分别落 brain #457、private #13（已合）。用户把 edges 定位为项目级 harness 框架，并认为外部方案缺少组织级研发提效视角，助手提议补一节，用户未确认。
- **Agent Eval 专家**：用户新建的内网 Langfuse 项目的项目记忆使用与影响分析（近 7 天），报告已写出；用户要求只按「主动打开」重算覆盖率，需要的明细在工作 MacBook 上，该机离线，用户说等在线再说。
- **Grok Bot**：4070ts 两轮巡检因本机通道离线均为未验证；AI 资讯周报改由 Grok Bot 例程接手，模板与两期重跑已经 #458 合入；批量合并两个脑仓共 11 个 PR；讨论 edges #116、#117 是否有必要合并，建议关 #116，用户未决。
- **个人简历管理员**：围绕简历项目介绍反复改写；沉淀成本评估的笔记与任务已经 edges #121 合入。
- **其余**：IT资产管理（#459 已开并合）、最新资讯（北京 AI 会议查询）、通用-辅助（人物与概念查询）、Codex→Langfuse（出口被拦截，轮询已暂停）均无需沉淀。

## 建议补充内容清单

- **公开候选 2 条，本次 PR 落盘**：
  - 记忆（偏好）：写 skill、入库规则和说明时，只写做什么的核心原则，不写防御性、不做什么的措辞；规则越少越好，越具体的设置越优先。建议去处：公开脑 `.edges/memory`，路径以 `edges memory remember` 返回为准。
  - 任务：把 edges 的 super 材料面识别收成一条简单原则，并按它重构 #120 涉及的 skill。建议去处：公开脑任务看板 backlog，路径以 `edges tasks` 返回为准，并更新 `.edges/tasks/README.md` 索引行。
- **私人候选 1 条**：已在 edges-brain-viruspc-private 开 PR（链接见交付消息），公开仓不写正文。
- 不做：OpenViking 笔记、IT 资产 project、AI 周报模板、沉淀成本笔记与任务 —— 均已合，去重。
- 不做：edges #120 本身 —— 已有 OPEN PR。
- 不做：「组织级提效」对比小节 —— 助手只是提议，用户未确认。
- 不做：关闭 edges #116 / #117 —— 用户未决定，也不是沉淀内容。
- 不做：简历文案、北京 AI 会议清单、人物与概念查询、4070ts 巡检、Codex→Langfuse 拦截 —— 个人文案或运维瞬时状态，用户未要求沉淀。
- 不做：`posts/` —— 由人维护。
