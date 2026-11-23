# REFERENCED — 引用技能

> 索引：当前作用域 `.agents/skills/` 原位正文或安装链接。正文可能由本仓编写，也可能来自外部。
> 本套工具只维护索引，不创建来源目录、不改写原位正文或安装链接。
> 每个条目链接相对本类型入口，指向当前作用域来源；不同真源同名保留，同真源别名去重。
> 可读且为空的来源才是空清单；来源缺失、断链或不可读会报告诊断，不能声称刷新完整。

<!-- edges-entries-local:start -->
## 本层内容

- [edges](<../../.agents/skills/edges/SKILL.md>) — Edges 日常模块的总入口。要做这些事时加载本 skill，再打开 references 里对应的一份： 把外部 harness 仓库挂到当前 scope（edges compose add、list、update；add 必须带 \-\-description；不经手 git token）； 把一条 Note 入库（有 shell 用 edges notes，没有 shell 用 new\-note MCP；只写本地叶子，不要自己跑 git）； 用 edges routines 创建、查询、更新或删除例程定义，或让外部平台 Agent 按仓库记录接入（记录日程并引用 Skill，触发和执行由平台负责）； 对用户选定的目录初始化或刷新系统入口 AGENTS.md（仅当用户明确要求 init；标准命令是 edges init；各域 init 只初始化本模块）； 将 .edges/memory/users 的本机私有记忆打成归档，或从归档恢复（换机、删仓；目标已占用时须明确授权 \-\-force 整份替换）。 检索项目记忆用 edges\-memory\-ask，沉淀用 edges\-memory\-remember，新增 Memory Type 用 edges\-memory\-add\-type。 第一次接入用 edges\-onboarding。整理对话或边学边记用 edges\-create\-notes，把对话整理成任务用 edges\-create\-tasks。 整板 Task 按已有 Project 归类用 edges\-tasks\-classify。 把会话接到 Langfuse 用 edges\-langfuse\-agent\-tracing。
- [edges\-langfuse\-agent\-tracing](<../../.agents/skills/edges-langfuse-agent-tracing/SKILL.md>) — 当用户要把编码 Agent 或 Grok Bot 的会话接到 Langfuse 时加载本 skill，再按表面打开 references。 本机 Codex、Cursor、Claude Code、OpenCode、Pi：安装以官方文档为准，补 environment（\*\-local）与设备 tags。 Codex Cloud（chatgpt.com/codex）：云端容器里官方插件、hooks、OTel 都用不了，改本机带外轮询写 OTLP；轮询脚本不在本仓库。 Cursor Cloud Agents：云端只执行仓库里的项目级 hooks，用包装脚本懒加载官方 cursor\-observability\-plugin。 Grok Bot 助手会话导出：步骤与环境变量在 references，导出脚本不随本包发布。 还没确定表面时不要装插件、改配置或写密钥。
- [edges\-memory\-add\-type](<../../.agents/skills/edges-memory-add-type/SKILL.md>) — 在所选作用域或主题 Project 按 LAYOUT 登记一个自定义 Memory Type。仅当用户明确要求新增 type 时使用。官方类型按选择采用；不要把示例 type 写进 init 模板。
- [edges\-memory\-ask](<../../.agents/skills/edges-memory-ask/SKILL.md>) — 用户提问或动手改代码前，按工作范围和主题 Project 检索已登记的项目记忆。不必等用户说搜索；本轮查过不重复。
- [edges\-memory\-remember](<../../.agents/skills/edges-memory-remember/SKILL.md>) — 把可复用结论写入所选作用域或主题 Project 的已采用记忆类型并刷新索引。用户要求记住时必须用；被纠正、用户给出可用想法/约定/约束、或任务产出已验证、以后还用得上的结论时也要主动用。
- [edges\-onboarding](<../../.agents/skills/edges-onboarding/SKILL.md>) — 帮用户给已有项目添加 edges harness 目录，创建独立 edges harness 仓库，或把已有个人大脑接入当前 Agent 客户端（接入已有大脑）。负责收齐必要信息、安装 CLI、初始化和验证；独立仓库默认包含 GitHub 建仓及首次推送。
- [edges\-tasks\-classify](<../../.agents/skills/edges-tasks-classify/SKILL.md>) — 按真实 Project 的主题与正文整理 Task 归属，覆盖根板和已有 Project；用 edges tasks review\-page 交人审阅，收到导出 JSON 后以 tasks update \-\-to\-project/\-\-to\-default 落地。只在同一 owner scope 内移动，不手改目录，不改状态或优先级。
- [edges\-create\-notes](<../../.agents/skills/edges-create-notes/SKILL.md>) — 把材料写成笔记。输入是对话记录，或用户要求整理、总结对话时，打开 references/conversation.md。 用户给了文章、视频、播客、代码链接或内容，并要学习或边看边记时，打开 references/learning.md。 判断不了先问一句。落盘用 edges notes create。用户说整理对话、记笔记、边看边记时使用。
- [edges\-create\-tasks](<../../.agents/skills/edges-create-tasks/SKILL.md>) — 把对话整理成任务：背景 → 目标必填，动作与完成标准可选。必填不足先提问；成文后交人审（对话确认或 PR），再用 CLI 落库。 目前只有 conversation 场景，步骤在 references/conversation.md。看板文件进受保护的 main 必须开 PR，不要直推。
<!-- edges-entries-local:end -->
