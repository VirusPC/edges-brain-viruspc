# 2026-11-22 日复盘

## 范围

- 回看窗口 2026-11-21 05:21 至 2026-11-22 05:21（Asia/Shanghai）。
- 主源：本机 search-index（本次自动化 run 无法用 ReadTranscript 读取其他助手，只能读本对话「日复盘」；与前几日相同，改用 search-index 落盘）。索引最新消息时间为 2026-11-22 01:56:06，窗口结束前约 205 分钟的对话未能从索引核对。用本对话 ReadTranscript 交叉核对：日复盘助手在 17:50 之后没有新的用户消息（最后一条是请把 #544 发到 Artifacts 预览，约 17:59 已发出）。索引里窗口内最后的活动是视觉&交互&设计专家在 01:54 左右确认合并 #563。01:56 至窗口结束这段，除本对话外无法确认其他助手是否还有新消息。
- 72 个助手里，窗口内有主对话的 6 个，共 687 条：视觉&交互&设计专家 411、Grok Bot 214、日复盘 42、4070ts-win设备助手 15、通用-辅助 3、Dot 2。其余 66 个助手窗口内无主对话消息。另有 26 条非主对话消息跳过。
- Langfuse：未拉取，缺口是 LANGFUSE_BASE_URL 与 LANGFUSE_HOST 均未设置（公钥私钥已有），按 Skill 不编造地址，仅靠已落盘的 transcript 继续。
- 落盘目录 `/workspace/daily-scan/2026-11-22/`（原始对话不进仓库）。
- 所用 Skill：VirusPC/edges-brain-viruspc 默认分支 main，commit f262551c9d6d434265e7e5e5388e02e8ee39e328，路径 `.edges/routines/daily-conversation-deposit/`。
- 仍开着的相关 PR（不是本次新开）：#544（各期补充建设中的精选推文和精选播客，尚未合并）；#550（给站点加基于 GitHub 的读者反馈渠道任务卡，仍开着。功能已由 #561 合入 main，任务卡也随 #561 进入 `projects/2026-09-13--site-and-content/tasks/in_review/2026-11-21--给个人知识库站点加基于-GitHub-的读者反馈渠道/`，#550 可能已过时）。

## 建议补充内容清单

- 本次更新了 1 条已有的公开项目记忆：`site/.edges/memory/projects/project_note_card_design/INDEX.md`（并刷新 `site/.edges/memory/projects/README.md` 索引摘要）。没有私人候选，未开私密 PR。
- 已有、不要再写（每条写路径或 PR）：
  - 笔记卡与筛选栏的既有设计原则已在 `site/.edges/memory/projects/project_note_card_design/`（#546、#549、#552 等），本次只修正后来被改口的部分，不另开新记忆。
  - 精选文章按四类来源分节及公司顺序、六个主类（模型 / 架构 / 产品 / 实践 / 开源 / 其他；Agent 与 Harness 归架构）、淘宝系并入阿里、火山引擎并入字节、ggml 文章标 Hugging Face、模型进展下不再写「模型发布」小标题、「项目开源」标题下不要写概括前五名的介绍句：已写入 `skills/managed/weekly-ai-blogs-digest/references/03-并行写总结.md` 与 `references/05-排版与开-PR.md`。
  - 订阅源主源加备源兜底、关键词不收非新出产品名（如 Codex、Claude Code、OpenRouter）、只留一个词云、生成来源注释（routine / skill / 数据快照的 commit）、精选推文和精选播客保留建设中占位、AI 资讯目录页标明每周五上午 9 点开始生成（北京时间）：已写入 `skills/managed/weekly-ai-blogs-digest/`、`.edges/routines/weekly-ai-blogs-digest/INDEX.md` 和站点（#547、#551、#554 等）。
  - `/projects` 按项目内最新可发布文档日期排序、每节默认收起、点项目名展开：已写入 `site/README.md`（#541）。
  - 十篇评测论文的十问阅读笔记已合入 #542。
  - 读者反馈渠道（GitHub Discussions 与视口右下角悬浮入口）功能已合入 #561；任务卡在 main 的 `projects/2026-09-13--site-and-content/tasks/in_review/2026-11-21--给个人知识库站点加基于-GitHub-的读者反馈渠道/`。#550 仍开着，不要再写一张卡。
  - #544 仍开着，不要再为「精选推文 / 精选播客，标记建设中」另开候选。
- 不做项（每条写具体原因）：
  - 「你可以连接闲鱼了么」：用户只问能否连接，助手说明插件市场没有闲鱼连接器；若有具体事项可用浏览器，登录需用户自己完成。用户未提出要办的事，也未要求记录。
  - 4070ts-Win 重新上线、补查 11-10 意外关机、检查并启动 Laya：已做完的一次性运维。助手问过是否加开机自启，用户只说「启动」，没有采纳自启。11-10 那次没有蓝屏码、像掉电或强制关机，与既有记录一致，不另写记忆或任务。
  - Dot 助手窗口里只有一个句号，没有可跟进事项。
  - 窗口内已合并的站点与周报实现（脑仓 #541–#543、#545–#549、#551–#561、#563，以及数据仓 #10 等）：已做完的一次性改动，后续约定以已更新的 skill、例程、站点记忆和 README 为准，不另开任务。
  - 用户在日复盘对话里点名处理的合并与关闭（合入 #540、#519、#543，以及框架仓 #129、#131，关闭 #515）：已处理完毕，不另开任务。
