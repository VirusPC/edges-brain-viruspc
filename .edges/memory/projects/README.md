<!-- edges-memory-type:start -->
name: project
module: memory
writable: true
gitignore: false
format: ordinary
<!-- edges-memory-type:end -->

# PROJECT — 项目上下文

> 记：进行中的工作、关键时间点，以及无法从代码或 git 历史推导出来的决策及其原因，还有项目内的规范。
> 不记：架构、目录结构、文件路径、调试过程——这些直接读代码更准。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。相对日期换成绝对日期。
> 本文件只是索引，条目区块由脚本重算，正文写在 `projects/project_<slug>/index.md` 里。

<!-- edges-entries-local:start -->
## 本层内容

- [posts 对外展示，Astro 博客 + Actions CI](project_posts_public_astro_blog/INDEX.md) — posts 面向对外展示；后续以 posts 为数据用 Astro 搭博客，并用 GitHub Actions 在服务器做 CI
- [沉淀以工作区根为入口（顶层 git submodule）](<project_workspace_is_deposit_entry/INDEX.md>) — 往两脑沉淀笔记、任务、记忆，或跑日复盘、周复盘前打开：先读 edges\-workspace\-viruspc 根 AGENTS.md，正文写进 顶层内容子模块，不写工作区根
- [在用户机器上操作 edges 前先对齐 npm 最新版](<project_use_latest_edges_cli_on_machines/INDEX.md>) — 在用户机器上 edges init、重装 skill 或其他 edges 操作前打开：先对比本机版本与 npm latest，落后先升级；main 未发版的改动先说明再让用户选
- [派云端 Agent 验证：验收写具体，不提示答案](<project_cloud_agent_blind_verification/INDEX.md>) — 派云端 Agent 验证约定或功能能否被自然用对时打开：写清产出、要点和交付形式，不提示期望落点或参数
- [个人仓是长期主干，系统往外拆](<project_personal_repo_is_trunk/INDEX.md>) — 本仓（原 VirusPC/edges）是个人主干，长期保留不归档；系统只往外拆成新仓，旧 PR 链接用新仓名引用
- [长期 AI 问题写成稳定定义，用定时追踪看解法演进](<project_enduring_ai_problems_timed_tracking/INDEX.md>) — 要把记忆管理、多 agent、评估等长期问题时打开：先写成稳定问题定义，再用 Routines 定时扫公开进展，对照本仓实践记差异
- [Langfuse 历史 trace 不可改 environment/model，脏数据保留](<project_langfuse_traces_immutable_keep_dirty/INDEX.md>) — 自建 Langfuse 上已写入的 environment 与 model 不可事后 PATCH；命名规范落地前的脏数据保留，不按同 id 重灌。
- [Langfuse 数据在 named volume，停机不丢；down \-v / 擦盘才会丢](<project_langfuse_data_named_volumes_survive_restart/INDEX.md>) — 自建 Langfuse 数据在宿主 Docker named volume；正常停容器或关机不丢；compose down \-v、删 volume 或擦系统盘会丢；查数优先走 Langfuse API 而非直连库。
- [Grok Bot box 上 Tailscale 重建后可能静默丢失，按台账重装](<project_grok_bot_box_tailscale_silent_loss/INDEX.md>) — Grok Bot 云电脑曾多次出现 Tailscale 装过又丢；再断时先对 IT 台账确认该装，再重装验收，hostname 用 grok\-bot。
- [Langfuse 标注字段优先级（专用 → metadata → tags → attributes）](<project_langfuse_annotation_fields_priority/INDEX.md>) — 给 Langfuse / OTEL 上报选标注字段时打开：先专用字段，再可过滤的 metadata，再枚举式 tags，其余才挂裸 attributes
- [harness memory 消融不必日更全量](<project_harness_memory_ablation_cadence/INDEX.md>) — 规划 harness\-memory\-ablation 跑批时打开：题库与 memory 未大变时不要日更全量；大改/发版前跑正式 A/B，全量可周更或按里程碑
- [Pi 沙箱不等于文件系统隔离](<project_pi_sandbox_not_fs_isolation/INDEX.md>) — 在 Pi 或本机 Agent 上跑实验/消融前打开：Pi 自带沙箱主要是本地执行权限，文件系统未真正隔离；要 FS 隔离再套 Docker/干净 worktree 或自托管 E2B
- [minigtr 公网入口优先 Cloudflare Tunnel](<project_prefer_cloudflare_tunnel_over_nginx_minigtr/INDEX.md>) — 给 minigtr 上自托管 HTTP 服务做公网入口时打开：长期维护优先 Cloudflare Tunnel，不优先单独上 nginx 扛公网
- [随包 skill 默认一个 edges 总入口，特殊才拆](<project_edges_skill_default_one_entry/INDEX.md>) — 规划或新增 Edges 随包 skill 时打开：默认并进总入口 edges；只有必须单独加载的能力才拆独立 skill，不要按一模块一 skill 拆
- [合 PR 须经用户审，Agent 不自行 merge](<project_pr_merge_needs_user_review/INDEX.md>) — 准备合入任何 VirusPC PR 前打开：除非用户当轮明确点名要合并，否则只开 PR、保持打开，不要自行 gh pr merge
- [grill 前先 memory ask，动手前先 html\-plan](<project_grill_memory_ask_then_html_plan/INDEX.md>) — 细化 Edges/脑仓任务卡时打开：先 memory ask，再 grill，达成共识后出中文 html\-plan 并 publish，用户确认后再改代码
<!-- edges-entries-local:end -->
