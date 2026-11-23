# PROJECT — 项目上下文

> 记：进行中的工作、关键时间点，以及无法从代码或 git 历史推导出来的决策及其原因，还有项目内的规范。对不上 `user` / `feedback` / `reference` 时也走这里（兜底）。
> 不记：架构、目录结构、文件路径、调试过程——这些直接读代码更准。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。相对日期换成绝对日期。
> 本文件只是索引，条目区块由脚本重算，正文写在 `projects/project_<slug>/index.md` 里。

<!-- edges-entries-local:start -->
## 本层内容

- [每次修改本 skill 要考虑的点](<project_when_changing_this_skill/INDEX.md>) — 修改 weekly\-ai\-blogs\-digest 的流程、契约、数据或站点时打开：以技能为主体、不做兼容层、契约先行、找出并重算下游、用新的智能体重跑、订阅以 OPML 为准、站点联动、严格按顺序、一路做到上线。
- [本周概览已在 0.0.8 落地](<project_weekly_overview_wait_for_two_tracks/INDEX.md>) — 本周概览已写成独立的 summary/overview.json。架构仍以 CONTEXT.md 和 docs/adr 为准，不要和编排重构或 GitHub Trending 改动混进同一个变更。
- [本技能只升 patch 版本](<project_version_patch_only/INDEX.md>) — 改本技能版本号时打开：永远只升 patch（\+0.0.1），不得升高 minor 或 major；即使行为或契约变化，也不按通用约定去升 0.1.0 或 1.0.0。
<!-- edges-entries-local:end -->
