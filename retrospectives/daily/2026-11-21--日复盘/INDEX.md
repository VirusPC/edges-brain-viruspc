# 2026-11-21 日复盘

## 范围

- 回看窗口 2026-11-20 05:24 至 2026-11-21 05:24（Asia/Shanghai）。
- 主源：本机 search-index（本次自动化 run 无法用 ReadTranscript 读取其他助手，只能读本对话；与前几日相同，改用 search-index 落盘）。索引最新消息时间为 2026-11-21 02:53:32，窗口结束前约 151 分钟的对话未能从索引核对。最后一条已索引消息是 Grok Bot 对「Plannotator 和 Edges 是否相似」的对照回答；其后至窗口结束无法确认是否还有新消息。
- 72 个助手里，窗口内有主对话的 4 个，共 613 条：Grok Bot 559、DIY Coding Agent 36、日复盘 14、4070ts-win设备助手 4。其余 68 个助手窗口内无主对话消息。另有 24 条非主对话消息跳过。
- Langfuse：未拉取，缺口是 LANGFUSE_BASE_URL 与 LANGFUSE_HOST 均未设置（公钥私钥已有），按 Skill 不编造地址，仅靠已落盘的 transcript 继续。
- 落盘目录 `/workspace/daily-scan/2026-11-21/`（原始对话不进仓库）。
- 所用 Skill：VirusPC/edges-brain-viruspc 默认分支 main，commit e573b73457164cb9b6e745ba2b209ad1f4705365，路径 `.edges/routines/daily-conversation-deposit/`。
- 仍开着的相关 PR（不是本次新开）：#519（编码 Agent 用户打断笔记，窗口内已按用户要求写好并补了源码依据与设计原因，尚未合并）；#515（2026-11-19 日复盘的未跑完版本，#516 已合入 main；用户当日问过是否重复，未要求关闭）。

## 建议补充内容清单

- 本次落了 1 条公开项目记忆：`.edges/memory/projects/project_daily_retro_pr_use_merge_commit/INDEX.md`。没有私人候选，未开私密 PR。
- 已有、不要再写（每条写路径或 PR）：
  - DIY Coding Agent「用户打断是否带入下一轮」笔记（含各家对照、源码依据、设计原因）已在开放 PR #519：`projects/agent-infra/notes/2026-11-20--编码-agent-用户打断是否带入下一轮/INDEX.md`。
  - 「设计 AI 资讯文末介绍和 Star 引导」任务已在已合并的 #536：`.edges/projects/2026-09-10--site-and-content/tasks/backlog/2026-11-20--设计-AI-资讯文末介绍和-Star-引导/INDEX.md`。
  - 2026-11-20 当日落地的 AI 资讯版式、取数与例程约定（ECharts 下拉、精选文章与筛选、覆盖窗口按北京时间渲染、模型卡价格/速度/效果、信任 RSS 不补抓文章页、一个 skill 拆 references、GitHub Trending 改 weekly、项目开源只留 GitHub 卡片、五段总结标题、图下不写「数据取自/快照」、密钥留在 box 本机拉数再交给云端等）已写入 `skills/managed/weekly-ai-blogs-digest/`、`.edges/routines/weekly-ai-blogs-digest/INDEX.md` 和 `site/AGENTS.md`，不在本次重复落笔记或记忆。
- 不做项（每条写具体原因）：
  - 4070ts 崩溃监控例程早间、晚间均 CLEAR（未连上；未验证窗口仍自 2026-11-09 18:00 起）：例程回执，设备持续离线是运维状态，不是可沉淀知识。
  - 全站手绘风格：用户先提出希望「真正的手绘感」并让开工，随即说「停止」，助手取消了尚未开出的 PR；随后转向筛选栏等已落地改动，未再要求继续。不落任务卡，以免把已叫停的改版重新排期。
  - 把 API 密钥存进 1Password 供云端复用：用户问过，助手说明当前 1Password 接入做不到把密钥当环境变量交给云端 agent；用户改为在本机打开页面自行处理，例程约定已写入 `.edges/routines/weekly-ai-blogs-digest/INDEX.md`。属已处理的取数方式，不另开任务。
  - 「Plannotator 和 Edges 是否相似」：用户提问后助手给出对照（Plannotator 管本轮审阅，Edges 管跨会话沉淀，互补不是替代），索引中的对话到此结束，用户未确认也未要求记录。写成记忆会把助手判断当成已采纳约定，故不落。
  - 关闭或清理 #515：用户只问「重复的？」，助手说明 #515 是当天未跑完的版本、#516 已合入；用户未要求关闭。
  - 当日已合并的一系列 AI 资讯站点改动（#518、#520–#539 及数据仓相关 PR）：已做完的一次性实现，后续约定以已更新的 skill / 例程 / 站点硬约束为准，不另开任务。
