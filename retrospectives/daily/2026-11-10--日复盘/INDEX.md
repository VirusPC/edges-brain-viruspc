# 2026-11-10 日复盘

## 范围

时间窗：2026-11-09 05:17:47 → 2026-11-10 05:21:42.406（Asia/Shanghai）；日历日取回看结束日 **2026-11-10**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-10/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- **主源局限**：本自动化运行 **没有** cursor `ReadTranscript`。窗口内消息由 `/home/box/agent-data/search-index.db`（messages 表）导出为按助手正序 jsonl（`in_main_chat=1`；非 main 共 0 条）。见该目录 `_capture-meta.md`。其余已登记助手在窗口内无主聊天消息，未单独落盘。
- 窗口内有活动并落盘 **10** 个助手、共 **373** 条：DIY Coding Agent（138）、Agent Eval 专家（107）、全栈开发专家（57）、Grok Bot（40）、Coding Agent 专家（10）、IT资产管理（9）、周复盘（5）、4070ts-win设备助手（4）、日复盘（2）、Codex→Langfuse（1）。
- **Langfuse 缺口**：本机有 `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`，但 **`LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置**。按 Skill 不编 URL、不换旧 traces/sessions API；本窗 **未拉** Langfuse observations。候选只来自 search-index jsonl。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；业务正文写顶层内容子模块，不写工作区根。Skill commit：`27c0128f81c35f10be770824b2d65f955b680e2d`。
- 去重（窗口内已合 / 已开，勿重复沉淀正文）：
  - brain [#449](https://github.com/VirusPC/edges-brain-viruspc/pull/449) docs(daily-retro): 2026-11-09 日复盘（OPEN）
  - brain [#450](https://github.com/VirusPC/edges-brain-viruspc/pull/450) docs(weekly-retro): 2026-11-02 周复盘（OPEN；窗内已同步定稿）
  - brain [#451](https://github.com/VirusPC/edges-brain-viruspc/pull/451) docs: add benchmark argumentation and review note（已合；本窗 search-index 无对应可核对正文，不另写）
  - brain [#452](https://github.com/VirusPC/edges-brain-viruspc/pull/452) teaching: agent-evals 6-lesson course（已合；含六课与 learning-records 1–9）
  - brain [#453](https://github.com/VirusPC/edges-brain-viruspc/pull/453) docs: add dsh SDK usage note under learning Project（OPEN）
  - brain [#454](https://github.com/VirusPC/edges-brain-viruspc/pull/454) docs: add ACP survey note under learning Project（OPEN）
  - brain [#455](https://github.com/VirusPC/edges-brain-viruspc/pull/455) teaching: add dsh course with SDK and ACP notes（OPEN；含 `teaching/dsh/`、根目录 `projects/2026-11-09--dsh/` 与根 AGENTS.md 的 `--super` 约定）
  - brain [#448](https://github.com/VirusPC/edges-brain-viruspc/pull/448) docs: 将完整 Edges 消融实验入口归入框架（OPEN，窗前已开）
  - edges [#114](https://github.com/VirusPC/edges/pull/114) Harbor 实验归档（已合）、[#115](https://github.com/VirusPC/edges/pull/115) README 展示实验收益（已合）、[#116](https://github.com/VirusPC/edges/pull/116) v2 未满召回分析（OPEN）、[#117](https://github.com/VirusPC/edges/pull/117) 发布 Harbor 冻结数据集（OPEN）
  - edges [#118](https://github.com/VirusPC/edges/pull/118) `--super` 下 `--project` 解析及全模块材料面（已合）、[#119](https://github.com/VirusPC/edges/pull/119) `@viruspc/edges@0.5.7`（已合）、[#120](https://github.com/VirusPC/edges/pull/120) 独立仓 AGENTS.md 写入 edges-harness 标记（OPEN）
  - workspace [#24](https://github.com/VirusPC/edges-workspace-viruspc/pull/24) 同步子模块指针（已合）
  - private [#12](https://github.com/VirusPC/edges-brain-viruspc-private/pull/12)（已合）、[#11](https://github.com/VirusPC/edges-brain-viruspc-private/pull/11)（OPEN）

## 实际怎样

- **日复盘 / 周复盘**：凌晨回报 11-09 日复盘 PR [#449](https://github.com/VirusPC/edges-brain-viruspc/pull/449) 已开、未合并。上午周复盘把 11/02–11/08 定稿同步进已有 OPEN PR [#450](https://github.com/VirusPC/edges-brain-viruspc/pull/450)，仍未合并。
- **Agent Eval 专家**：先解释「配对结果」不是固定论文术语，对外可用 paired comparison。随后按 `/teach` 讲完 Anthropic《Demystifying evals for AI agents》六课：怎样判断任务真的完成、三类评分器、capability 与 regression、pass@k 与 pass^k、读过程并查结果、框架只是加速。边学边问的点（transcript 与 trace、Langfuse Evaluator 也可以是代码型、模型裁判必须与人对齐、rubric / grader / score / metric、Harbor 配套包可按配置写 rubric、起步约 20 到 50 道简单任务）记入本课 `learning-records/`。用户要求把课程放进个人大脑，后又纠正后续课和笔记也应一并同步；全部经 PR [#452](https://github.com/VirusPC/edges-brain-viruspc/pull/452) 合入 `teaching/agent-evals/`。
- **DIY Coding Agent**：在当前电脑安装 DeepSeek Harness（对话中的版本为 dsh 0.2.2-rc.1），入口是 `dsh web`；该版默认没有终端交互界面，随附 profile 为 web、headless、sdk、sdk-minimal 和 acp。用户曾把「20 到 50 道简单任务」这条起步建议误发给此助手并随即撤回，本地草稿未提交。随后 `/teach dsh`，目标同时保留「先会用」和「拆解插件架构，借鉴到基于 Pi 的 coding agent」。第一课经用户要求写详细后发布到 artifacts（临时预览）。SDK 用法和 ACP 调研按用户要求记笔记并开 PR，最初落在 learning Project：[#453](https://github.com/VirusPC/edges-brain-viruspc/pull/453)、[#454](https://github.com/VirusPC/edges-brain-viruspc/pull/454)。用户更正：应在个人大脑新建 teaching 主题，再创建同名 Project，笔记放进 Project 并引用 teaching；课程仍留在 teaching。这些写入 PR [#455](https://github.com/VirusPC/edges-brain-viruspc/pull/455)。用户再更正同名 Project 应建在仓库根 `projects/`（`edges` CLI `--super`），并把「这是独立 edges harness 仓库，调用 edges cli 时优先考虑加 --super 参数」写进根 `AGENTS.md`；均更新在 #455，尚未合并。用户同时把「`--super` 应该所有模块都支持」交给全栈开发专家。
- **全栈开发专家**：修复 `--super --project` 只认 `.edges/projects/`、找不到根目录 `projects/` 的问题，并按用户确认把 `--super` 扩到 init、独立仓 onboarding、memory、compose 等全部材料模块；对照 Workspace 仓库「加了 `--super` 之后执行 Compose」落出来的根目录形态。PR [#118](https://github.com/VirusPC/edges/pull/118) 已合。用户接着要求发 patch 版本，[#119](https://github.com/VirusPC/edges/pull/119) / `@viruspc/edges@0.5.7` 已合入并打 tag；对话末尾 npm-publish 仍在等环境批准。随后用户要求 onboarding 里的 compose 情景按仓库是否为独立 harness 区分是否加 `--super`，并选择机器可读标记 `<edges-harness mode="super" />`；又纠正该标记与是否选中 Project 无关。这些落在 edges [#120](https://github.com/VirusPC/edges/pull/120)，尚未合并。
- **Coding Agent 专家**：用户感觉 Codex 技术博客不如 Claude Code 团队密集；助手说明文章分散在官网 News 与 Developer Blog。用户问现有 AI 资讯 skill 订的是哪一路后，要求把未配置的 OpenAI Developer Blog 补进 `weekly-ai-blogs-digest`。对话称已按列表页方式补上且配置检查通过：不把 `developers.openai.com/rss.xml` 加入 RSS（该地址实际是文档、教程和 cookbook），不以 BestBlogs 上的推文源代替博客原文，生成周报时打开每篇文章并以文章页发布日期为准（列表页日期常常不带年份），原 OpenAI News RSS 保留。核对默认分支与窗内 PR，均未见对应变更，故本篇补一张待办卡。
- **Grok Bot**：4070ts 晨检读到开机时写入的 0xEF（CRITICAL_PROCESS_DIED）记录，但关联的意外关机时间指向更早日期，不能认定周末发生了新的蓝屏，且没有新的 minidump；晚间巡检无新异常。另处理 MacBook 卡顿（内存压力，后按用户要求重启），以及 Cursor 启动窗口闪退（退出再打开后用户确认正常）。按用户要求同步 workspace 子模块指针，PR [#24](https://github.com/VirusPC/edges-workspace-viruspc/pull/24) 已合。用户问现成的 DeepSeek Harness 教程，仅作解答，未要求落笔记。
- **IT资产管理**：MacBook 输入设备短暂失效后自行恢复，判断为界面卡住而不是硬件故障。晚间按要求出示已有资产清单，未要求改台账或另存。
- **Codex→Langfuse**：一轮同步失败（访问被拦截），本轮没有新写入，后续轮询继续。

## 建议补充内容清单

- **本次 PR 落 1 条公开候选**：把 OpenAI Developer Blog 补进 `weekly-ai-blogs-digest`（用户已要求补充；对话称已改且配置检查通过，但默认分支与窗内 PR 均未见对应变更）。建议去处：公开脑任务看板 backlog。写入路径：`.edges/tasks/backlog/2026-11-09--把-OpenAI-Developer-Blog-补进-weekly-ai-blogs-digest/INDEX.md`（及同目录 run log、`.edges/tasks/README.md` 的索引行）。看板仍按当前 main 的 `.edges/tasks/` 落点登记，不把这次改写成根目录 `tasks/`。
- 不做：[#452](https://github.com/VirusPC/edges-brain-viruspc/pull/452) `teaching/agent-evals/` 六课与 learning-records 1–9 —— 已合，去重。
- 不做：[#455](https://github.com/VirusPC/edges-brain-viruspc/pull/455) `teaching/dsh/`、根目录 `projects/2026-11-09--dsh/` 中的 SDK / ACP 笔记，以及根 `AGENTS.md` 的 `--super` 那句 —— 已有 OPEN PR，去重。
- 不做：[#453](https://github.com/VirusPC/edges-brain-viruspc/pull/453) / [#454](https://github.com/VirusPC/edges-brain-viruspc/pull/454) 在 learning Project 下的重复笔记 —— 用户已改口到 teaching + 同名 Project（#455）；对话建议 #455 合入后再关闭这两条，用户未另要求日复盘关闭它们。
- 不做：用户误发给 DIY Coding Agent 的「20 到 50 道简单任务」笔记 —— 用户明确撤回；正确记录已在 #452 的 `learning-records/0009-start-with-20-50-simple-tasks.md`。
- 不做：edges [#118](https://github.com/VirusPC/edges/pull/118) / [#119](https://github.com/VirusPC/edges/pull/119) —— 已合，去重。
- 不做：edges [#120](https://github.com/VirusPC/edges/pull/120) 独立仓 `<edges-harness mode="super" />` 标记及 onboarding 识别 —— 已有 OPEN PR，去重。
- 不做：Workspace 在 #120 合入后补写标记 —— 依赖尚未合并的 PR，用户未要求开卡。
- 不做：[#449](https://github.com/VirusPC/edges-brain-viruspc/pull/449) 日复盘、[#450](https://github.com/VirusPC/edges-brain-viruspc/pull/450) 周复盘 —— 已有 OPEN PR。
- 不做：[#451](https://github.com/VirusPC/edges-brain-viruspc/pull/451)、[#448](https://github.com/VirusPC/edges-brain-viruspc/pull/448)、edges [#114](https://github.com/VirusPC/edges/pull/114)/[#115](https://github.com/VirusPC/edges/pull/115)/[#116](https://github.com/VirusPC/edges/pull/116)/[#117](https://github.com/VirusPC/edges/pull/117)、private [#12](https://github.com/VirusPC/edges-brain-viruspc-private/pull/12)/[#11](https://github.com/VirusPC/edges-brain-viruspc-private/pull/11) —— 已合或已有 OPEN PR；其中部分在本窗 search-index 无对应可核对正文，不另写。
- 不做：配对结果 / paired comparison 问答 —— 用户未要求沉淀；后续评测课已覆盖相关概念。
- 不做：dsh 第一课之后的其余课程 —— 用户未要求继续出课或开卡。
- 不做：直接改 `weekly-ai-blogs-digest` 的订阅配置文件 —— 对话未给出可原样写入的完整字段（精确列表页地址、id、lane 等），补写会编造；改由上面的任务卡跟踪。
- 不做：4070ts 晨检 0xEF 记录、MacBook 卡顿与重启、Cursor 启动闪退、输入设备短暂失效 —— 运维瞬时状态，用户未要求记笔记或开卡。
- 不做：现成 DeepSeek Harness 教程清单、资产清单查询 —— 前者只是询问，后者是出示已有台账，未要求另存；资产细节也不写入公开仓。
- 不做：Codex→Langfuse 同步失败、0.5.7 npm-publish 等待批准 —— 运维瞬时状态；地址变量缺口已在「范围」记录。
- 不做：本窗因 Langfuse 地址变量缺口未拉到的 observations —— 无正文可核对，不编候选。
- 不做：`posts/` —— 由人维护。
- 本窗私人新候选 **0**，未另开 edges-brain-viruspc-private PR。
