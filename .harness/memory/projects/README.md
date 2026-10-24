<!-- project-memory-type:start -->
name: project
module: memory
writable: true
gitignore: false
format: ordinary
<!-- project-memory-type:end -->

# PROJECT — 项目上下文

> 记：进行中的工作、关键时间点，以及无法从代码或 git 历史推导出来的决策及其原因，还有项目内的规范。
> 不记：架构、目录结构、文件路径、调试过程——这些直接读代码更准。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。相对日期换成绝对日期。
> 本文件只是索引，条目区块由脚本重算，正文写在 `projects/project_<slug>/index.md` 里。

<!-- project-entries-local:start -->
## 本层内容

- [posts 对外展示，Astro 博客 + Actions CI](project_posts_public_astro_blog/INDEX.md) — posts 面向对外展示；后续以 posts 为数据用 Astro 搭博客，并用 GitHub Actions 在服务器做 CI
- [沉淀以 Compose 工作区根为入口](<project_workspace_is_deposit_entry/INDEX.md>) — 往两脑沉淀笔记、任务、记忆，或跑日复盘、周复盘前打开：先读 edges\-workspace\-viruspc 根 AGENTS.md，正文写进 composed 子仓，不写工作区根
- [在用户机器上操作 edges 前先对齐 npm 最新版](<project_use_latest_edges_cli_on_machines/INDEX.md>) — 在用户机器上 edges init、重装 skill 或其他 edges 操作前打开：先对比本机版本与 npm latest，落后先升级；main 未发版的改动先说明再让用户选
- [派云端 Agent 验证：验收写具体，不提示答案](<project_cloud_agent_blind_verification/INDEX.md>) — 派云端 Agent 验证约定或功能能否被自然用对时打开：写清产出、要点和交付形式，不提示期望落点或参数
- [个人仓是长期主干，系统往外拆](<project_personal_repo_is_trunk/INDEX.md>) — 本仓（原 VirusPC/edges）是个人主干，长期保留不归档；系统只往外拆成新仓，旧 PR 链接用新仓名引用
- [长期 AI 问题写成稳定定义，用定时追踪看解法演进](<project_enduring_ai_problems_timed_tracking/INDEX.md>) — 要把记忆管理、多 agent、评估等长期问题时打开：先写成稳定问题定义，再用 Routines 定时扫公开进展，对照本仓实践记差异
<!-- project-entries-local:end -->
