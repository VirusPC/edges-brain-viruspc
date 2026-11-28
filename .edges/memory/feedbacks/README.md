# FEEDBACK — 纠正与约束

> 记：用户给出的纠正、明确确认过的做法，以及必须始终生效的禁止模式和它的原因。
> 不记：读代码就能看出来的写法，以及 `AGENTS.md` 已经写过的规则。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。
> 本文件只是索引，条目区块由脚本重算，正文写在 `feedbacks/feedback_<slug>/index.md` 里。

<!-- edges-entries-local:start -->
## 本层内容

- [写 skill 和规则只写核心原则，越具体越优先](<feedback_write_core_principles_specific_first/INDEX.md>) — 写 skill、入库规则和说明时打开：只写做什么的核心原则；规则越少越好；越具体的设置越优先。
- [「重跑」指用现行 skill 从头完整生成](<feedback_rerun_means_full_rerun_with_current_skill/INDEX.md>) — 用户说「重跑」或「每周跑一遍」时打开：用现行 skill 原样从头完整生成；转交云端 Agent 的指令必须忠实于用户原话。
- [用户已定事项须写成硬性要求，不得改成二选一](<feedback_user_decisions_are_hard_requirements_not_options/INDEX.md>) — 转交云端 Agent 时打开：用户已经定下来的位置、名称、范围或做法必须写成硬性要求，不要改成二选一交给执行方取舍。
- [AI 资讯是准备、清洗、总结三阶段](<feedback_ai_news_three_stages/INDEX.md>) — 改 AI 资讯周报流程时打开：产物是 raw、cleaned、summary；规则版本是 Skill 的 semver；数据仓库只写 URL，站点不是 Skill 输入。
- [AI 资讯一次迁移同时更新 skill、数仓和站点](<feedback_ai_news_migration_updates_skill_data_and_site/INDEX.md>) — 改 AI 资讯 skill 或迁数据时打开：不留旧格式兼容层，要兼容就改数据；一次迁移同时让 skill、数仓和站点渲染用上最新版。
- [数据处理流程以 skill 串联步骤并调用脚本](<feedback_data_processing_skill_leads_scripts/INDEX.md>) — 写或改数据处理类流程时打开：skill 串联步骤并调用脚本；根 SKILL.md 只写顺序和子步骤链接；命令、schema 和输入输出写在各子步骤 md。
- [公开周复盘一律不写面试相关内容](<feedback_weekly_retro_omit_interview/INDEX.md>) — 写或更新 retrospectives/weekly、或运行 weekly\-retrospective 时打开：公开周复盘一律不写面试相关内容；相关材料只进私密仓，或完全不出现在公开正文。
- [一轮 grill 的修订叠在同一个 PR，讨论完再合并](<feedback_grill_revisions_stack_on_one_pr/INDEX.md>) — 多回合设计讨论（grill）时打开：文档修订都叠在同一个分支和 PR，讨论全部结束后一次性合并，不要每回合合一次。
- [本机已有 clone 时不要再开第二份克隆](<feedback_local_repo_no_second_clone/INDEX.md>) — 在本机对某个仓库做任何操作之前打开：先找已有的本地 clone，从这份仓库开 worktree；不要再克隆第二份，包括云端 Agent 不可用的时候。
<!-- edges-entries-local:end -->
