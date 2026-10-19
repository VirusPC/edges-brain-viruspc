<!-- project-memory-type:start -->
name: referenced
module: skills
writable: false
gitignore: false
format: skills
<!-- project-memory-type:end -->

# AGENT_SKILLS — 人写或装入的技能

> 索引：本层 `.agents/skills/` 下的标准 Agent Skills，人手写或 `npx skills` 装入。
> **本套工具只索引，不改写。** 不创建目录、不生成内容、不动既有文件——那是人与生态的地盘。要新增就手写或用 `npx skills` 装，别指望 `$project-memory-remember`。
> 为什么要这份索引：`.agents/skills/` 只有仓库根那一层会被各家 harness 扫到，嵌套层没有任何工具读。monorepo 里子仓自己的技能，靠这份索引才能被发现。
> 空清单是正常状态——本层没有 `.agents/skills/` 时就该是空的。
> 条目区块由脚本重算，路径相对本目录，所以形如 `../../.agents/skills/<name>/SKILL.md`。

<!-- project-entries-local:start -->
## 本层内容

- [brainstorming](../../../.agents/skills/brainstorming/SKILL.md) — You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation.
- [conversation-to-notes](../../../.agents/skills/conversation-to-notes/SKILL.md) — 将原始对话整理为可独立阅读的中文笔记（记录 + 复盘）：背景/主题/过程/结果/所学/行动指南/补充说明。 主题=一段主题+难点列表；凡写做什么须带可选项与不做原因；取舍在过程保留并在所学与行动指南补充。 行动指南分主题层与细节若则。结果有未闭环项时逐点问清再交 conversation-to-tasks；必须保留原始材料引用。用户说整理/总结对话时使用；入库 VirusPC/edges notes/。
- [conversation\-to\-tasks](<../../../.agents/skills/conversation-to-tasks/SKILL.md>) — 把对话整理成任务（背景 → 目标 → 动作 → 完成标准；后两栏可选）。必填不足先提问；成文后交人审（对话确认或 PR），再用 CLI 落库。看板文件进受保护的 main 必须开 PR，不要直推。
- [domain-modeling](../../../.agents/skills/domain-modeling/SKILL.md) — Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a CONTEXT.md, or recording or editing an ADR.
- [edges\-note](<../../../.agents/skills/edges-note/SKILL.md>) — 把一条 Note 入库到 Edges 仓库时使用。有 shell 就调用 \`edges notes\`；没有 shell 的宿主调用对等能力面入口 new\-note MCP。只在本地写叶子，不要自己跑 git，也不要找仓根 bin/new\-note。
- [executing-plans](../../../.agents/skills/executing-plans/SKILL.md) — Use when you have a written implementation plan to execute in a separate session with review checkpoints
- [finishing-a-development-branch](../../../.agents/skills/finishing-a-development-branch/SKILL.md) — Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
- [grill-me](../../../.agents/skills/grill-me/SKILL.md) — A relentless interview to sharpen a plan or design.
- [grill-with-docs](../../../.agents/skills/grill-with-docs/SKILL.md) — A relentless interview to sharpen a plan or design, which also creates docs \(ADR's and glossary\) as we go.
- [grilling](../../../.agents/skills/grilling/SKILL.md) — Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
- [handoff](../../../.agents/skills/handoff/SKILL.md) — Compact the current conversation into a handoff document for another agent to pick up.
- [project\-memory\-add\-type](<../../../.agents/skills/project-memory-add-type/SKILL.md>) — 在指定记忆目录按 LAYOUT 登记一个 Memory Type（\<plural\>/README.md \+ 同目录条目 \+ 层入口一行）。仅当用户明确要求新增 type 时使用。官方类型按选择采用；不要把示例 type 写进 init 模板。
- [project-memory-ask](../../../.agents/skills/project-memory-ask/SKILL.md) — 用户提问或动手改代码前检索本项目 AGENTS.md 索引的项目记忆。不必等用户说搜索；本轮查过不重复。
- [project-memory-doctor](../../../.agents/skills/project-memory-doctor/SKILL.md) — 诊断并修复已采用的 .harness 项目记忆索引与作用域登记。默认只诊断；明确授权修复时 apply。旧布局只报告迁移需求。
- [project\-memory\-init](<../../../.agents/skills/project-memory-init/SKILL.md>) — 对用户选定的任意目录初始化或刷新系统入口 AGENTS.md（硬约束 \+ 组成登记），并按选择采用 Project Memory / Skills 类型。无参 edges init 与 edges skills init 还会安装包内 skill。仅当用户明确要求 init 时使用。标准命令是 edges init；各域 init 只初始化本模块。
- [project-memory-migrate](../../../.agents/skills/project-memory-migrate/SKILL.md) — 将明确指定作用域的旧 Project Memory .memory 一次性迁到 .harness/memory 和 .harness/skills；保留私有内容、技能资产、来源权限与稀疏子作用域。用于旧项目升级或 Git 升级后遗留的本机用户记忆，不迁业务目录。
- [project-memory-remember](../../../.agents/skills/project-memory-remember/SKILL.md) — 把可复用结论写入本项目 .harness 并刷新索引。用户要求记住时必须用；被纠正、用户给出可用想法/约定/约束、或任务产出已验证、以后还用得上的结论时也要主动用。
- [project-memory-reshape](../../../.agents/skills/project-memory-reshape/SKILL.md) — 把已有 AGENTS.md 按 project-memory-init 的形状重新组织：硬约束写进入口对应区块，区块外只留身份与指针，长规范进 important 或 README，记忆内容抽到 .harness/memory，其余受管区块只留索引。用户要求整理、改造、迁移、重组已有 AGENTS.md 时使用；init/doctor 不改正文，不要用它们代替本 skill。
- [project-tasks-classify](../../../.agents/skills/project-tasks-classify/SKILL.md) — 对整板 Task 按用户已设的 Task Project（标题 + 描述）做归属建议（LLM / agent 判断，不要求 embedding），经 edges tasks project review-page 审阅页等人贴回导出 JSON 后再用 CLI 落地。无 GUI 时才退回 Markdown 表。不要只用 \_default、不要 embedding、不要手改路径、不要当通用 edges-tasks Skill+MCP CRUD。
- [prototype](../../../.agents/skills/prototype/SKILL.md) — Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
- [requesting-code-review](../../../.agents/skills/requesting-code-review/SKILL.md) — Use when completing tasks, implementing major features, or before merging to verify work meets requirements
- [subagent-driven-development](../../../.agents/skills/subagent-driven-development/SKILL.md) — Use when executing implementation plans with independent tasks in the current session
- [teach](../../../.agents/skills/teach/SKILL.md) — Teach the user a new skill or concept, within this workspace.
- [test-driven-development](../../../.agents/skills/test-driven-development/SKILL.md) — Use when implementing any feature or bugfix, before writing implementation code
- [to-spec](../../../.agents/skills/to-spec/SKILL.md) — Turn the current conversation into a spec and publish it to the project issue tracker: no interview, just synthesis of what you've already discussed.
- [to-tickets](../../../.agents/skills/to-tickets/SKILL.md) — Break a plan, spec, or the current conversation into a set of tracer-bullet tickets, each declaring its blocking edges, published to the configured tracker \(edges as text in one file per ticket locally, or native blocking links on a real tracker\).
- [user\-memory\-backup](<../../../.agents/skills/user-memory-backup/SKILL.md>) — 将指定作用域 .harness/memory/users 的本机私有记忆（含 README.md 索引及资产）打成归档。换机、删仓或留逃生副本时用；旧 .memory 先用 project\-memory\-migrate 转换。
- [user-memory-restore](../../../.agents/skills/user-memory-restore/SKILL.md) — 将新布局 user-memory-backup 归档恢复到指定作用域的 .harness/memory/users。目标已占用时需明确授权 --force 整份替换；旧归档须先在隔离旧项目完成转换。
- [using-git-worktrees](../../../.agents/skills/using-git-worktrees/SKILL.md) — Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
- [using-superpowers](../../../.agents/skills/using-superpowers/SKILL.md) — Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
- [writing-plans](../../../.agents/skills/writing-plans/SKILL.md) — Use when you have a spec or requirements for a multi-step task, before touching code
- [edges\-onboarding](<../../../.agents/skills/edges-onboarding/SKILL.md>) — 帮用户第一次接入 Edges 时使用：安装 edges CLI（npm 包 @viruspc/edges）、初始化目录、跑一次验证、学会常用命令、排查安装与鉴权报错。用户说「帮我接入 edges」「安装 edges」「edges 怎么用」「edges 报错了」「给我的仓库配一套 edges」时触发。已经装好、只是要写笔记请改用 edges\-note；整理对话改用 conversation\-to\-notes；项目记忆的增删查改改用 project\-memory\-\* 系列。本 skill 只做入口与引导，具体操作一律交给 edges CLI 执行。
- [edges\-compose](<../../../.agents/skills/edges-compose/SKILL.md>) — 把外部 harness 仓库挂到当前 scope 时使用。教 AI 用 edges compose register、clone、list，以及可选的 pull、push、unregister。register 必须带 \-\-description，写清这个仓存什么、什么时候该写进去，供后续 AI 判断。不经手 git token。
- [migrate\-directory\-nodes](<../../../.agents/skills/migrate-directory-nodes/SKILL.md>) — 显式把 Edges 工作树中受管的 tracked/public 单文件 Memory、Task、Note 转为目录入口，预览引用调整与冲突后按已授权范围应用。用于统一目录迁移，不处理私有记录、ADR、博客或第三方体系。
<!-- project-entries-local:end -->
