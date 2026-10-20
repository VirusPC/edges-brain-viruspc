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

- [放弃的 ChatGPT MCP 接入](project_abandoned_chatgpt_mcp/INDEX.md) — 2026-02-19 建过两条空的 ChatGPT MCP change，没有设计可恢复；若再做从当前 MCP 布局重开。
- [理想链路：AGENTS.md → Skill → CLI](project_agents_md_to_skill_to_cli/INDEX.md) — peng cheng 理想发现链路——读目录 AGENTS.md，被指引到可加载 Skill，再由统一 Skill 调用 edges CLI；记忆 skills 类型不是自动加载层。
- [Artifacts 预览 ECS：user unit \+ nginx :80](<project_artifacts_preview_ecs_ops/INDEX.md>) — 改 artifacts 在阿里云 ECS 上怎么跑、客户端 BASE\_URL，或 POST 被 Cloudflare 1010 拦住时打开：和 teaching 同机；客户端 init \-\-base\-url https://edges.viruspc.tech；对该主机 POST /artifacts 缺浏览器式 User\-Agent 会 1010，带上则 201，GET 通常正常；install 不启动；teaching.conf 必须带 /teaching/；不要公网 8787。已有盒上 env 的 BASE\_URL 在 ECS 上手动改。站点布局迁移不要 sudo 仓库脚本，只免密 /usr/local/sbin/edges\-migrate\-site\-layout。
- [个人 Artifacts 预览服务：上传→URL→TTL](project_artifacts_preview_service/INDEX.md) — 改 Artifacts 预览服务、edges artifacts、或审阅页如何给人打开时打开：稳定短生命周期托管 + 真浏览器可开 URL；聊天内嵌预览是绕开的不可靠路径；review-page 仍只渲染；结果回传另卡。ECS 手机 URL 走与 teach 同机的 :80 反代，不要假定 localhost。与 /tasks/ 持久站硬边界见 ADR 0021。决策见 docs/adr/0013-artifacts-preview-service.md。
- [tasks 工作流阶段：grill → research → plan → implement → validate → close，回环按证伪](project_assign_grill_with_docs_first/INDEX.md) — 所有层级 .harness/tasks 的通用执行约定：grill→research→plan→implement→validate→close；按证伪回退，用户可明确跳过；不自动扩展到领域 tasks。
- [Edges 云端部署：Obsidian vault 使用仓库 clone](project_box_obsidian_vault_for_preview/INDEX.md) — Edges 仓库部署约定：云端 Obsidian 使用独立 Edges clone，不连接本机 Sync；归根节点部署记忆，具体环境为 2026-09-11 的验证记录。
- [能力面：CLI / Skill / MCP](project_capability_surface_cli_skill_mcp/INDEX.md) — 能力面是 CLI、Skill、MCP 三者并列；仓根 bin/ 已删除；Note git 在 extensions/cli 的 TS；MCP 子进程调 edges notes。禁止「必要时 MCP」或只写 CLI+Skill。新能力不要再加仓根脚本或把 npm bin 当一层。
- [Changelog 自动化：调研过，暂不生成正文](project_changelog_automation/INDEX.md) — 考虑给仓库或 skill 自动生成 changelog 时：维持手写 Unreleased；若要自动化只切版本和校验，不要从 git log 生成条目。
- [classifyTasks 与 Task Project 元数据](project_classify_tasks_and_project_metadata/INDEX.md) — 实现或改 edges tasks project / project-tasks-classify Skill 时打开：能力面 CLI + Skill + MCP；按用户已设质心做 LLM / agent 判断；无 embedding、无 classify 动词。第 4 步人闸是 project review-page（Markdown 表仅无 GUI 回退）。四个 project 动词都会 ensure。Skill 目录/id 是 project-tasks-classify（展示名 classifyTasks）。
- [classifyTasks 按已有质心分类；Task Project 元数据只做索引层](project_classify_tasks_and_task_project_metadata/INDEX.md) — 改 Task Project 元数据、classifyTasks / project-tasks-classify 工作流或看板 AGENTS.md 时：只做索引/描述层（Q18=A），不把 Task 升成 Memory Type。按用户已设 Task Project 质心做归属建议（LLM / agent 判断），不要求 embedding。人闸主路径是 review-page（ADR 0012）。Skill 路径 extensions/skills/project-tasks-classify/；新类型走 proposeTypes（ADR 0011）。决策见 docs/adr/0010-classify-tasks-and-task-project-metadata.md。
- [CliContext 只装生产快照](project_cli_context_production_snapshot/INDEX.md) — 改 edges CLI 的 CliContext / run\(\) 入参时：只放 env 与 stdin 快照加 Commander 的 result；不要把 ingest、fs、writer、now 等测试替身塞进 Context。输出类型叫 CliResult，不要叫 RunResult。
- [对话整理采用复盘四栏](project_conversation_notes_fupan_four_columns/INDEX.md) — 改 conversation-to-notes 或对话 Note 结构时：用复盘四栏；相关链接写入【补充说明】并附说明；不要复活已关闭的 FIA 中文换皮；不要批量改写旧笔记；不要把升 Edge 写进该 skill。
- [conversation-to-tasks：背景+目标必填，人审后落库](project_conversation_to_tasks_body_review_persist/INDEX.md) — 改 conversation-to-tasks 或从对话开卡时：背景→目标→动作→完成标准（后两栏可选）；必填不足先问；成文后交人审再 CLI 落库；STAR 用于制定任务非复盘。
- [Task Issue 优先级用词档位，与 status 正交](project_edges_task_priority/INDEX.md) — Task Issue 优先级为 urgent\|high\|medium\|low\|none，写在 metadata.edges-task-priority，与 status 正交、不搬状态夹。CLI 已落地 create/update --priority 与 list --sort priority；Skill/MCP 后做。决策见 docs/adr/0007-edges-task-priority.md；词 vs P0 调研见 knowledge/projects/tasks/2026-09-15--issue-priority-words-vs-p0.md
- [Task 看板按 Task Project 目录优先分组](project_edges_task_project/INDEX.md) — 看板 Task Project 为 directory-first + frontmatter 双写；未分组用 \_default。决策见 docs/adr/0009-edges-task-project-grouping.md。CLI 已按 docs/superpowers/plans/2026-09-16-edges-task-project.md 落地；status 只在同 project 内移动。
- [edges tasks 本轮只做 CLI](project_edges_tasks_cli/INDEX.md) — 本轮 edges tasks 看板操作只做 CLI（list/get/create/update/status + 只读 runs/run-messages）；Skill 与 MCP 后做同一契约。决策见 ADR 0005。
- [可扩展 Memory Type：LAYOUT 登记，不另开注册表](project_extensible_memory_types/INDEX.md) — 可扩展 Memory Type：扩展面只在 LAYOUT，用 project-memory-add-type 登记；官方种子仍是六类。决策见 docs/adr/0006-extensible-project-memory-types.md。
- [前端图标默认 Lucide](project_frontend_icon_set/INDEX.md) — 改审阅壳或后续前端图标时打开：默认 Lucide（按需、可调 size/color/stroke）。同一产品不混搭。tasks-review 折叠用 ChevronDown/ChevronRight，筛选关闭用 X，不要可见文字收起/展开/关闭。正文在 knowledge/notes/2026-09-25--前端图标选型.md。
- [Git 管理记忆的版本与共享范围](project_git_memory_management/INDEX.md) — 概括 Edges 核心思想时：Git 管理还包括跟踪与忽略规则，例如 user memory 通过 gitignore 不随 Git 提交与共享；不能只解释成版本历史、分支和回滚。
- [idea→task→专家→Cloud Agent→改状态](project_idea_todo_expert_cloud_loop/INDEX.md) — 工作流：idea 在领域 tasks/ 或维护 .harness/tasks/ 落卡，经专家细聊、开发、回写 Task 状态；旧 knowledge/tasks/ 与直推 main 仅是 2026-09-10 历史。
- [v1 Langfuse 用官方 docker compose](project_langfuse_docker_compose/INDEX.md) — 选自托管 Langfuse 的 v1 编排、或有人提出上 Kubernetes 时打开：用官方 docker compose（文档里的 Postgres + Langfuse 栈及其官方依赖），不用 k8s；本仓不提交带密钥的 compose。决策见 docs/adr/0016-langfuse-docker-compose.md。
- [自部署 Langfuse 与 Observation 产品卡分开](<project_langfuse_infra_vs_observation_product/INDEX.md>) — 改自部署 Langfuse 卡、知识库 Observation 系统、或想把两者并成一条时打开：前者只做实例部署/运维/鉴权/备份；后者是 traces/logs/dashboard 产品语义。v1 验收先 UI 再 1–2 个客户端（ADR 0020）；访问面见 ADR 0033。决策见 docs/adr/0015\-langfuse\-infra\-vs\-observation\-product.md。
- [v1 Langfuse 用 named volume + 偶发 tar](project_langfuse_named_volumes_manual_backup/INDEX.md) — 选自托管 Langfuse 的 v1 数据面、HA 或备份方案时打开：Docker named volume + 偶尔手工/脚本 tar；无 HA。定时机外备份（NAS/云）是后续未做。决策见 docs/adr/0019-langfuse-named-volumes-manual-backup.md。
- [Langfuse 密钥只留 minigtr 磁盘](project_langfuse_secrets_stay_on_minigtr/INDEX.md) — 写自托管 Langfuse 的 .env、密钥、compose 笔记或想把配置提交进 VirusPC/edges 时打开：密钥只活在 minigtr 磁盘（例如本机 services 目录）；本仓只留脱敏 ADR/说明。决策见 docs/adr/0018-langfuse-secrets-stay-on-minigtr.md。
- [自托管 Langfuse 经 Cloudflare Tunnel 提供公网 HTTPS](<project_langfuse_tailscale_only_access/INDEX.md>) — 改自托管 Langfuse 的访问面时打开：公网 HTTPS 经 Cloudflare Tunnel 转到 minigtr；ADR 0017 的仅 Tailscale 已由 ADR 0033 取代。不要把实例域名、Tailscale 地址或 Cloudflare 账号写进仓库。
- [v1 Langfuse 先证明 UI 再试 1–2 个客户端](<project_langfuse_ui_then_few_clients/INDEX.md>) — 写自部署 Langfuse 的 v1 验收、或想一次接上 Grok/edges Agent 时打开：先证明 UI 健康，再试 1–2 个客户端。2026\-10\-11 已按此验收。更广接线留在 Observation 产品卡。决策见 docs/adr/0020\-langfuse\-ui\-then\-few\-clients.md。
- [记忆研究笔记落 knowledge/projects/memory](project_memory_research_notes_in_knowledge_projects/INDEX.md) — 写 project-memory 的调研、优点、related work 等研究笔记时：落到 knowledge/projects/memory/；skill 层 .memory 只记协议与设计决策，不当成对外研究笔记落点。
- [整仓 MIT，不拆 knowledge 许可证](project_mit_license/INDEX.md) — 给仓库选许可证、改 LICENSE 或 package.json license 字段时：整仓 MIT，不要给 knowledge/ 另开一份。
- [new-note MCP 的 ingest 约束](project_new_note_ingest/INDEX.md) — 改 new-note 或新增 MCP ingest 时：TS+Node 编排，子进程调用 edges notes，失败即停，返回机器可解析 JSON。不要 Python server，不要 in-process import CLI，不要再找仓根 bin/。
- [节点目录单元与组织关系设计](project_node_resource_unit_decision/INDEX.md) — 递归目录与 harness 的现行决定及理由；模型与公开目录已采用，历史讨论保留但不替代现行 spec，私有材料逐克隆审阅。
- [定期从目录职责提炼通用维护规范](project_periodic_architecture_review/INDEX.md) — 复盘 Edges 目录架构时：按实际职责与维护对象识别可跨作用域复用的系统二模块，输出规范候选；维护任务管理是例子，当前仅记规范、不启用自动运行。
- [posts 对外展示，Astro 博客 + Actions CI](project_posts_public_astro_blog/INDEX.md) — posts 面向对外展示；后续以 posts 为数据用 Astro 搭博客，并用 GitHub Actions 在服务器做 CI
- [仓内任务优先用仓库 Skill 与 CLI](project_prefer_repo_skills_and_cli/INDEX.md) — 执行 VirusPC/edges 仓内工作时，优先调用本仓 Skill 与 edges CLI；不可用须向用户说明缺口，勿默认手搓绕过。
- [订阅管理盘点进展](project_progress/INDEX.md) — 订阅/用量盘点进展：双 Gmail + QQ IMAP、国内 Kimi 无邮箱、CodexBar Linux CLI 已装待鉴权；后续 Apple/微信侧核对。
- [proposeTypes 从 \_default 提议新 Task Project 类型](project_propose_types_from_default/INDEX.md) — 改 propose-types 工作流或从 \_default 发明新 Task Project 时打开：独立 Skill extensions/skills/project-tasks-propose-types/；经同一 review-page 确认，不自动 project create；方法是 LLM/agent 判断；配对 project-tasks-classify、ADR 0011 与 ADR 0012。本轮不写 skill 正文。
- [仓库用根 CHANGELOG 和 v 标签发版](project_repo_changelog/INDEX.md) — 仓库发版先提 PR，合并后给 main 的合并提交打 tag 并发布。写 Edges 仓库级变更时用根目录 CHANGELOG.md 和 v 标签。Unreleased 的 ### 用功能模块原名（如笔记入库与能力面、文档与系统、任务看板与项目、Artifacts 预览），不要改成「模块：摘要」或只留摘要；每条前面写成 \`- \*\*小标题：\*\* 正文\`，小标题白话摘要，正文不因精简文风大段删实现说明（示例 commit a80d1b0）。用人话写清「现在能做什么」，同一条里立刻给出真实命令名；对照 \[1.2.0\] 的完整句，不要堆 schema 字段表。枚举写仓库英文原值（优先级是 urgent/high/medium/low/none）。不要摊成扁平长列表，也不要把决策/术语/计划逐条写进去。 新版本不留 Changed 等未按模块归类的兜底小节；切版时检查重复、条目顺序与已落地范围。
- [审阅页侧栏筛选用 design A（选中染色 + 未选变淡）](project_review_page_sidebar_filter_design_a/INDEX.md) — 改审阅页左栏项目筛选外观时打开：选中用 accent 实线边加面板底；未选中 opacity 0.6（hover 拉回）；拖过时外扩 outline，须和选中边叠得开。类写在 ProjectColumn，不改点击或拖放。用户 2026-09-17 选定 design A。
- [根硬约束只留聚光灯、脱敏与 git](project_root_important_scope/INDEX.md) — 改根 AGENTS.md 硬约束时：只留 ask/remember 聚光灯、硬约束写在本区块、公开仓脱敏、git 纪律；bin/scripts 路径约定和交互口吻不进硬约束，也不进 .memory。
- [根 README：harness 任何目录的对外门面](<project_root_readme_direction/INDEX.md>) — 修改根 README 时打开：2026\-10\-09 grill 已结束并按此重写。定稿：标语「harness 任何目录。你的大脑，也是一个目录。」；首屏六条（持续自进化、不止停留在仓库、任何目录、任何人、任何 Agent、超级个体）；正文用现在时、不写「在路上」，但快速开始只放实测命令；中文为主；README 只做门面加地图，内容标准在各目录 README；「怎么做到的」以后再补。模型见 ADR 0032。
- [递归目录采用统一节点模型与自身维护空间](project_scope_first_content_ownership/INDEX.md) — 递归目录与 harness 的现行决定及理由；模型与公开目录已采用，历史讨论保留但不替代现行 spec，私有材料逐克隆审阅。
- [系统一／系统二按作用域建模，区分 harness 层级与自进化](project_scoped_systems_and_harness/INDEX.md) — 设计作用域与遍历时：系统一／二是相对角色；检索当前系统二不自动进入其系统二，同层分类索引仍可递归。
- [v1 自托管 Langfuse 落在物理机 minigtr](<project_self_hosted_langfuse_on_minigtr/INDEX.md>) — 改自托管 Langfuse 的宿主、或默认往阿里云/云 VPS 上放时打开：宿主是物理机 minigtr，按多数时候在线的小型服务器运维；双系统仍在但 Windows 不是日常路径。不是阿里云或其它云 VPS。访问面见 ADR 0033。决策见 docs/adr/0014\-self\-hosted\-langfuse\-on\-minigtr.md。
- [跨机器跨 Agent 的 harness 放 shared-extensions](project_shared_extensions/INDEX.md) — 新增不绑定 Edges 的 skill / MCP 配置 / plugin / hook 时：放 shared-extensions；接入 Edges 的能力仍走 extensions。不要用「换机器带得走」当进 extensions 的充分条件。
- [系统设计目标：三件事尽量一键](<project_system_one_click_deploy_ingest_output/INDEX.md>) — 改根 README 的系统实现、或讨论 Edges 产品方向时打开：设计目标是一键部署底座、一键接入 Agent 客户端、一键产出对外资产。2026\-10\-08 起 README 按已完成用现在时写，不标「在路上」；实际进度仍按真实状态记在任务与 CHANGELOG。不要另开顶级章节。
- [TS 数据契约生成 JSON Schema](<project_task_doc_json_schema/INDEX.md>) — Schema 字段真源、生成与分发、运行时输入校验及取舍；Node 22、CLI 获取和真实消费者验收见 ADR 0025。
- [Task Project 审阅页是 render-only CLI](project_task_project_review_page_render_only_cli/INDEX.md) — 改审阅壳或 edges tasks project review-page 时打开：仍只渲染、无 --mode。桌面三栏见 ADR 0022。窄屏同一页纵向分段，滚动必须能到顶也能到 Details。章节头是过渡色面，状态行贴背景且比章节小一档。筛选入口是 ListFilter 图标。双击章节标题滚到该节，回到看板滚到当前卡片。不要视口面板。源码在 apps/tasks-review-app/。
- [Tasks 旧记忆逐条审阅后的共享范围与归属](project_task_shared_conventions_ownership/INDEX.md) — 跨层任务约定存根 Project Memory；写法引用 conversation-to-tasks；部署记录与预览 Skill 已归根，局部看板分组仍留 Tasks，对外分发留待办。
- [Tasks 核心思想：与 /goal、loop engineering 同构](project_tasks_align_goal_and_loop_engineering/INDEX.md) — 设计或验收 tasks 时：目标+完成标准要与 /goal、loop engineering 一起想；开卡时完成标准可暂缺、grill 后补；沉淀结论时同时写清背景上下文。
- [Task 看板变更优先走 edges tasks CLI](project_tasks_board_mutations_via_cli/INDEX.md) — 所有层级的领域 tasks 与维护 .harness/tasks 看板变更，优先走 edges tasks CLI 和已有任务 Skill；能力缺口明确反馈，不长期绕过工具直接改文件。
- [2026\-09\-10 Task 速记直推 main（历史约定）](<project_tasks_direct_main/INDEX.md>) — 2026\-09\-10 旧 knowledge/tasks 只追加速记曾约定直推 main；当前任务写入所选 scope 的节点 harness tasks，并遵守独立 worktree。
- [持久 tasks 看板：分层存放、全仓汇总](project_tasks_persistent_board_site/INDEX.md) — 任务分层与全仓视图、局部维护板默认及通用延迟查询的边界和取舍；持久看板部署与 UI 既有决定。
- [工作项叫 tasks，支持状态流转](project_tasks_with_status_not_todos/INDEX.md) — Task 工作项按 Task Project 与 edges-tasks-status 分夹；当前领域板在 tasks/，Edges 维护板在 .harness/tasks/，旧 knowledge/tasks/ 仅是迁移史料。
- [ECS 上 edges 用 Actions SSH 整仓 pull](project_teach_site_rsync_push/INDEX.md) — 改 teaching、/tasks/ 或 ECS 部署时：SSH 只在 deploy.yml 的 deploy job；production 不挂 url；site-teaching 与 site-tasks 都 needs deploy，分别登记 https://edges.viruspc.tech/teaching/ 与 /tasks/；summary 列两个 URL。不要拆成两次 SSH，不要用 teach.\* 或裸 IP。不要新开 workflow（ADR 0021）。
- [todos 只追加直接推 main（已由 tasks 路径取代）](project_todos_direct_main/INDEX.md) — 旧约定：往 knowledge/todos/ 只追加速记曾直接推 main；该路径已删除，现行入口见 tasks\_direct\_main
- [知识目录单元与扩展应用归属](project_top_level_content_and_extension_apps/INDEX.md) — 目录单元适用于全部知识内容；共用附件复制，未引用旧 img 归 archive/img，根共享池无引用附件归档；apps 属于 extensions，局部记忆保留归属。

- [层入口表面命名改为 project\-harness](<project_harness_layer_markers/INDEX.md>) — 改 AGENTS.md 层入口注释或章节标题时：标记为 project\-harness / constraints / local / descendants；标题为本层硬约束 / 本层系统维护信息 / 下层系统维护信息；type 与 entries 仍用 project\-memory\-\*。README 的 project\-entries\-\* 见 grill\_entries 条。

- [递归系统二：系统入口 AGENTS.md 带组成登记](<project_recursive_system_two_entry/INDEX.md>) — 改节点模型、AGENTS.md、Project Harness 或 layout 时打开：核心是递归系统二；系统入口为 AGENTS.md 且必须带组成登记；从 scope 系统入口经登记可达才算节点；无 isLeaf；Task/Note/Skill 由登记挂入。曾议 AGENTS 不带 entries 已否。谁必须有真实 AGENTS 见 grill Q10。

- [虚拟超节点用于个人根与个人任务查询](<project_virtual_system_entry_personal_root/INDEX.md>) — 设计个人任务或无 AGENTS.md 的主体根时：默认 scope/AGENTS.md；显式 \-\-super 启用 SuperAgentsNode（继承 AgentsNode，不落盘）。勿用 VirtualSuperNode。

- [grill：README entries、任意目录 init、叶子 INDEX.md](<project_grill_system_entry_q9b_q10_q11/INDEX.md>) — 续节点模型 grill：Q9b 根 README 增 entries 供 \-\-super 虚拟超节点下钻；Q10 任意目录用户 init；Q11 虚拟超节点另卡；Q12 组织清单 README、内容叶子 INDEX.md。

- [组织清单 README.md，内容叶子 INDEX.md](<project_document_entry_readme_index/INDEX.md>) — 改节点入口文件名、Task/Note/Memory 路径或类型索引形状时：组织清单一律 README.md\+entries；内容叶子为 INDEX.md；Skill 仍 SKILL.md；系统入口仍 AGENTS.md。不要把 Task 正文写成 README。

- [grill：README/AGENTS 组成分工与 INDEX 迁移脚本](<project_grill_system_entry_q13_q14/INDEX.md>) — 改树遍历或入口迁移时：同目录系统一孩子只在 README entries，AGENTS 只挂系统二材料与下级系统入口；index.md→INDEX.md 用可预览脚本套 CLI traverse，含 posts（本轮改名授权）。原则见 models/README 设计原则节。

- [README entries 与 AGENTS 章节标题定稿](<project_grill_entries_markers_and_titles/INDEX.md>) — 改 README entries 或 AGENTS 三章标题时：README 用 project\-entries\-local/descendants，标题本层内容/下层内容；AGENTS 标题为本层硬约束/本层系统维护信息/下层系统维护信息（标记仍 project\-harness\-\*）。

- [节点模型落地前先写 spec 与 ADR](<project_grill_q16_spec_and_adr_first/INDEX.md>) — 改递归系统二入口、entries 标记或 INDEX 迁移前：先完成设计 spec 与 ADR 并经人审，再 writing\-plans；本步不写生产代码。

- [四种入口可组织；README 下层仍 README；虚拟超节点须 \-\-super](<project_grill_arch_all_org_readme_virtual_flag/INDEX.md>) — 改 traverse/架构图时：四入口可组织；README 下层只挂 README；虚拟超节点须显式 \-\-super，默认 scope/AGENTS.md，不因缺 AGENTS 自动合成。

- [InternalNode 承接组成索引](<project_grill_basenode_type_agents_readme_text/INDEX.md>) — 改节点类层次或 type 时：AgentsNode 与 ReadmeNode 继承 InternalNode；业务节点继承 BaseNode；LeafNode 是纯 text；组织/叶子看组成登记，type 不含 internal。

- [类型入口只写 README，空的类型 AGENTS 桩删除](<project_grill_type_index_as_readme/INDEX.md>) — 改类型索引、init/remember/doctor 或 PROTOCOL 时：memory 与 skills 的类型索引只写 README\+project\-entries。空的同目录 AGENTS 桩删除；缺失索引不补 AGENTS。层系统入口仍是 AGENTS.md。

- [递归系统二 spec 已批准可实施](<project_grill_spec_approved_start_impl/INDEX.md>) — 改节点模型/codec 时：2026\-10\-06 recursive\-system\-two\-entries spec 与 ADR 0029 已获用户批准；按实施计划落地，系统一孩子只进 README entries。

- [虚拟超节点与 \-\-super flag](<project_grill_virtual_super_node_super_flag/INDEX.md>) — 改遍历根或 CLI scope 时：默认 scope/AGENTS.md；显式 \-\-super 启用 SuperAgentsNode（继承 AgentsNode，不落盘）；勿用 VirtualSuperNode/virtual\-root。

- [SuperAgentsNode 继承 AgentsNode](<project_grill_super_agents_node_extends_agents/INDEX.md>) — 改虚拟超节点实现时：类名 SuperAgentsNode，继承 AgentsNode；flag 仍 \-\-super；勿用 VirtualSuperNode。

- [traverse 默认走全部 children](<project_grill_traverse_default_all_children/INDEX.md>) — 改 operations/traverse 或依赖其默认的调用方时：默认展开 local∪descendants；本层\-only 用显式 localOnly；不再接受 includeDescendants；includeHarness 仍默认 false。
- [Task Project 组织清单用 README](<project_task_project_readme_org_lists/INDEX.md>) — 改 Task Project / 看板列表或 physicalParent 时：Task Project 与看板项目列表用 README\+project\-entries；新项目默认 README 种子，勿伪造 AGENTS；任务叶子的物理父是项目 README。
- [层 AGENTS 挂材料 README，list 顺着 children](<project_list_all_forest/INDEX.md>) — 改 tasks 登记、根 AGENTS 或 list 时：层入口挂材料 README（尤其 .harness/tasks/README.md），条目留在 project\-entries。类型目录空 AGENTS 桩删除。不另写 walker。\-\-super 仍只接 scope 目录。
- [各模块 init 只创建本模块的材料](<project_init_module_boundary/INDEX.md>) — 改 edges init 或域 init 时：memory 不顺手建其他模块；每个有材料的模块只初始化自己。
- [个人仓是长期主干，系统往外拆](<project_personal_repo_is_trunk/INDEX.md>) — 原 edges 改名 edges\-brain\-viruspc 作个人主干长期保留；系统拆成新仓，不再 archive
<!-- project-entries-local:end -->
