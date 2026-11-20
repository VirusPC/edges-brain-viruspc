---
description: 对照各家记忆系统的仓库归属、目录粒度、分支与会话回滚，结论是真正以项目为中心的记忆仍然少见。
---
# 以项目为中心的记忆缺口仓库归属分支与回滚

> 2026-11-17 核对过的各家记忆系统，在仓库、目录、分支和会话回滚上差在哪里。真正以项目为中心的记忆仍然少见。

## 背景

2026-11-17（Asia/Shanghai，约 10:32–22:26），用户在 Agent Memory 专家对话里连续追问：Codex、OpenViking、edges、Mem0、Zep、Supermemory、Basic Memory 怎样按仓库、目录、分支划分记忆，以及把一次会话回滚之后，已经写进去的记忆能不能撤回。意图是分清「检索范围按仓库切开」和「记忆归项目所有」是不是一回事。

## 主题

这场把主流记忆产品按仓库、目录、分支三条线对齐，并核对回滚会话能不能撤回自动记忆，最后判断真正以项目为中心的记忆仍然少见。

- 难点：各家说的「按仓库」多半是个人空间下面的标签或命名空间，切的是检索范围，不是归属。
- 难点：外部产品基本是一个仓库一份记忆，不跟当前分支走。分支废弃之后，那条分支上写过的记忆仍可能在主线被召回。
- 难点：回滚会话记录，不会自动撤回已经进入自动记忆的条目。记忆文件和会话记录是分开的。
- 难点：同一产品的官方配置和源码默认值会对不上。对话里标明未核实的，不能补成已核对。

## 过程

### 时刻不详 先核对 Codex 的项目规则和自动记忆

核对材料是官方文档和 openai/codex 源码 main `ad161203`，CLI 版本 0.169.0。和同目录 2026-10-19 的触发机制调研相比，本段只补这次按源码核对过的更新，不重写那篇。那篇把 Codex memories 记成实验功能，注入方式当时未核实。

对应项目规则的是仓内 `AGENTS.md`。启动时把全局 `~/.codex` 里的那份，加上从 Git 根到当前目录每一层最多一个文件，一次性加载，总长上限 32KiB。碰到子目录时不会再补读。这一点仍开的 [公开脑 #505](https://github.com/VirusPC/edges-brain-viruspc/pull/505) 已经写过，这里只点到，不重写「本机还是账号」和「子目录 AGENTS.md 谁能读到」。

自动记忆是实验之后已经标成 Stable 的 memories，默认仍然关闭，需要 `[features] memories = true`。打开之后 `use_memories` 和 `generate_memories` 默认开。

写入是后台流水线，不是模型在当前对话里自己决定记什么。新一轮开始时顺带检查旧会话：只处理空闲超过 6 小时、10 天以内的交互式会话，每次最多 2 条。子 agent、`codex exec` 和当前会话都跳过。额度剩不到 25% 时也跳过。官方配置参考写每次最多抽 16 条，源码默认是 2 条。对话当时的取舍是以源码为准。0.167.0 改过默认抽取模型和合并模型，旧版本用哪个未核实。

抽取用小模型把单个会话压成摘要，进出都脱敏。合并最多每 6 小时成功一次：起一个不联网、只能写记忆目录的子 agent，按 git diff 更新 `MEMORY.md` 和 `memory_summary.md`。大约 30 天没用到的记忆会被淘汰。

存放是全局一份，不按项目分。旧版目录是 `~/.codex/memories/`。新装默认 `~/.codex/memories_v2/`，从 0.165.0 起；若 `memories/` 已经存在，就继续用 v1。设了 `CODEX_HOME` 则换根。同一目录里还有 `rollout_summaries/`、`skills/`，以及说「记住」时写到 `extensions/ad_hoc/notes/` 的笔记。主对话不能直接改生成的记忆文件。

读取把 `memory_summary.md` 截到 2500 token，注入开发者指令。细节由模型去搜 `MEMORY.md`，必要时再打开一两个原始会话文件。不是向量检索。专用记忆工具（list、read、search、add note）默认关。

和 Claude Code 的自动记忆对照：Claude 默认开，对话中当场写，按仓库存在 `~/.claude/projects/<仓库标识>/memory/`，开局预加载 `MEMORY.md` 前 200 行或 25KB。Codex 默认关，空闲后后台提炼，全局一份，预加载的是摘要。

### 时刻不详 对照 OpenViking、腾讯 Team Memory 和 edges 的仓库归属

OpenViking 的写入时机、人审和团队晋升，已经写在 [2026-11-10 的机制笔记](../2026-11-10--openviking-记忆机制分析写入人审与团队记忆/INDEX.md)。本段只补仓库归属、目录粒度和分支，不重写那篇。版本是 OpenViking v0.5.5，腾讯云 Agent Memory 的 Team Memory 是 v2.0.3。

OpenViking 按 Git origin 归一化，自动为仓库建记忆。例子是 `github.com-volcengine-openviking`。写入 `viking://user/{user}/peers/{仓库标识}/memories`。同一 origin 的 clone、worktree、子目录默认共用；fork 默认分开。没有 origin 时用仓库根路径，换机器会变。不在 Git 仓库时写用户级记忆。可以在 `.openviking/config.json` 里写死 `peer.id`。默认 `recall.peer_scope=all`，其它仓库的记忆仍可能以低分出现。要严格隔离，改成 `actor`。默认只属于个人。团队共享要先发布到 `viking://resources/...`，再配权限。已经有 Claude Code、Codex、pi、OpenCode、Cursor 的集成。

腾讯 Team Memory 的对话记忆分层是团队、用户、agent、会话，可以再加任务，没有仓库层。CodeGraph 按仓库 URL 加分支注册。接 Claude Code 或 Codex 走 Memory Proxy，需要手动选团队、agent、任务，或带请求头 `x-team-id`。文档里没有看到按当前目录或 Git 地址自动识别仓库。想按仓库切对话记忆，只能约定一个仓库一个团队。发行说明里代码图谱怎样关联工作区，未核实。

和 edges 不是一类东西。OpenViking 是外部服务，按 origin 给个人开空间，自动抽取、语义召回，仓库里最多提交 `.openviking/config.json`。edges 把记忆写成仓内 `.edges/memory/<类型>/`，跟 Git 和 PR 走。它认的是目录和那一份 Git 副本，不读 origin。edges 没有自动抽取，靠 `$edges-memory-remember`。dream 在框架仓 ADR 0034 里还是待做。相关背景见 [Dreaming 调研](../../2026-10-14-Agent-Memory-Dreaming调研.md)，这里不重写 dreaming 的分类。edges 预加载 `AGENTS.md` 里的硬约束，再用 `$edges-memory-ask` 按目录树找，不用向量库。公开类型走 PR。user 类型被 gitignore。跨仓靠 Compose 和 `--super`。

对照之后的用法是：要自动记住会话、多机对齐，或做大规模语义检索，用 OpenViking。要能审查的项目事实、团队走 PR、不想维护服务，用 edges。两者可以互补，这和 ADR 0034「大规模检索交给别的系统」一致。同一会话里两边同时接入怎么分工，未核实。

目录粒度上，edges 是原生的：任意子目录可以再 init 一层，`$edges-memory-ask` 从当前目录往上叠加，不穿过嵌套的 Git 边界。OpenViking 默认整仓一份。monorepo 里的子项目要单独放 `.openviking/config.json`，写 `peer.source: "{git_remote}-{dir}"`，或写死 `peer.id`。切出来的是平级的独立空间，不会自动继承仓根记忆。另有旧的 cwd 模式，路径一变就成另一份。

### 时刻不详 补 Mem0、Zep、Supermemory、Basic Memory 的共享范围

[mem0 插件的 hook 笔记](../../../../notes/2026-11-12--mem0-插件的-hook-触发机制claude-code-插件/INDEX.md) 只讲 hook 何时触发。本段补共享范围、计费，以及插件不再支持本地部署。

多 agent 复用不是装同一个插件就自动共享，要按作用域接。

Mem0 用 `user_id`、`agent_id`、`app_id`、`run_id`。组织和项目由 API key 决定。多个 agent 共用同一个 `user_id`（最好再固定 `app_id`）才共享。给单独的 `agent_id` 则是私有。坑在默认抽取：不会在同一条记忆上同时写 `user_id` 和 `agent_id`。检索时两个条件一起加，会什么都搜不到。Claude Code、Codex、Cursor 的官方插件把记忆分成仓库公共记忆和个人偏好。公共记忆要同一 Mem0 项目，并且是同一仓库。个人偏好还要求 `user_id` 一致，默认是本机账户名，换机器要手动对齐。没有看到按单条记忆的权限控制。

Zep（含开源 Graphiti）是每个用户一张图。取上下文会跨该用户的全部对话，所以同一用户下的多个 agent 天然共享。跨用户或跨团队要另建共享图。更细的权限要企业版。Graphiti 按 `group_id` 分图，没有权限控制。官方 MCP 是实验性参考实现，不带认证。共享池会被不同 agent 的风格和误记污染。Mem0 的归纳功能不处理带 `app_id` 的记忆。

免费额度是多客户端共用的。Mem0 免费版每月 1 万次写入、1 千次检索。Zep 免费版每月 1 万 credit，只有 1 个 Context MCP 席位，用完就停止写入。

Mem0 不一定要花钱。开源自部署不收软件费，模型和向量库自费。托管免费版额度如上。绑上自己的大模型 API key 之后，额度提到每月写入 5 万、检索 1 万。超出要付费。具体价格以官方定价页为准，对话没有抄价格。

官方编码插件和托管 MCP 接的是 Mem0 云，记忆不在本机，要用 API key 或浏览器登录。对话先按文档写成 0.3.1，后来按源码核对为 0.3.3，文档仍写 0.3.1。2025 年的 OpenMemory MCP（本机 Docker 跑 Qdrant 或 Postgres）已经从主仓库移除。插件只认托管云接口，接不上开源自部署。

按仓库共享的前提，来自源码 mem0ai/mem0 main `f1791da`、插件 0.3.3。它读 `remote.origin.url`，把 SSH、HTTPS 和末尾 `.git` 归一。没有 origin 时用 `local:{仓库根路径}`。共享记忆挂在 `agent_id = {owner}-{repo}`，再加标识哈希的前 10 位。分支只出现在附带信息里，检索不按分支过滤。项目共享记忆按仓库存，不带人。个人偏好按 `user_id`。检索有三档：`repo`（默认，仓库共享加个人）、`dir`（共享缩到当前目录）、`mine`（只个人）。多人必须让 API key 指向同一个 Mem0 项目。可以用邮箱加同事。角色只有只读和所有者。只读能否写入或删除，未核实。Claude Code 和 Codex 会在第一条提问时自动注入最多 5 条。Cursor 不能自动注入，只能主动搜。写入是全自动的，没有人审：每 5 轮、空闲 5 分钟、上下文压缩前，或会话结束时抽取。`/mem0:forget` 默认只删个人记忆。加上 `--include-project-memory` 才删共享，而且会影响所有人。

Supermemory 是托管记忆服务。编码插件按仓库自动建记忆，团队和各 agent 读写同一份。官方说仓库规则和事实仍放 `AGENTS.md` 或 `CLAUDE.md`，它只记文件装不下的会话经验、偏好和变化过程。空间形如 `repo_<name>__<hash>`，由仓库名加远程地址哈希组成。没有远程就退回本地路径。同一组织、同一仓库的成员读写同一份。按标签限制谁能读写，要 Scale 或 Enterprise。插件支持 Claude Code、Cursor、Codex、OpenCode、Hermes。开场加载项目概况，实质性提问前先检索再注入，会话结束后后台保存。主要是托管云。`npx supermemory local` 可以在本机跑，但不开源，最多 1 万条文档，而且和云数据不互通。Scale 和 Enterprise 可以自部署。价格：Free 每月送 5 美元额度；Pro 19、Max 100、Scale 399，按月。写入前能否人审，官方没写，未核实。

Basic Memory 是开源的本地 Markdown 加 MCP，接入 Claude、Codex、Cursor。默认目录 `~/basic-memory`。SQLite 只是检索索引，大约 1 秒同步。它不会在后台自动提炼，靠 agent 调 `bm_write`、`bm_edit`，或人直接改文件。读用 `bm_search`、`bm_context`。Claude Code 和 Codex 的钩子只往 `~/.basic-memory/inbox/` 记会话起止这类事件，不自动把事实沉淀进图谱。用 `bm project add "my-repo-docs" /path/to/repo/docs` 把目录指进代码仓，笔记才跟分支走。默认放在家目录则不跟分支。索引不在 Git 里。切分支之后如果搜索不对，先跑 `basic-memory status`，再不行就 reindex。一次切分支改很多文件时，索引能否跟上，未核实。本地版免费，许可证是 AGPL-3.0。云版定价对话记为每个工作区 Cloud 19、Pro 99、Business 249 美元。GitHub 首页还写 15 美元终身价。以哪个为准，未核实。不要和 `.edges/memory/` 混写。

### 时刻不详 追问分支废弃和会话回滚

用户的场景是：多个开发分支各自写记忆，某条分支废弃之后要回滚。

结论是外部产品基本都是一个仓库一份记忆，不跟当前分支走。分支废弃之后，那条分支上写的记忆仍可能在 main 被召回。能做到各分支各写、废弃就丢、合并一起进来的，是把记忆当成仓内文件交给 Git 管，例如 edges。

当时对过的各家做法：

- Supermemory 可以手动按分支改命名空间。回滚等于删掉该命名空间。合并要自己用 `moveTo` 迁进主空间。
- Mem0 插件可以自己给记忆加 branch 标签，再按标签删。插件会不会自动带上分支名，未核实。它不支持合并。
- OpenViking 的配置变量没有分支，只能手动设 `peer.id`。回滚等于递归删除该 peer 的记忆。
- 腾讯 Team Memory 的代码图按仓库加分支。对话记忆没有分支层。
- Zep、Hindsight、RepoMemory 都不支持按分支分开。Hindsight 有人提过这个需求，还没解决。
- Letta MemFS 用 Git 管记忆本身的版本，但是独立的记忆仓库，不会自动跟着代码分支走。
- Basic Memory 只有知识目录在代码仓里才跟分支走。
- Claude Code 自动记忆按仓库、不按分支，路径是 `~/.claude/projects/<仓库标识>/memory/`。所有 worktree 和分支共用，只在本机有效，不跨机器。有人提过按分支分的需求（issue #36045），还没做。已经提交的 `CLAUDE.md` 会跟当前检出走。`CLAUDE.local.md` 一般不进 Git，切分支时文件还在原地。第三方 Branchwise 是外挂，不是官方能力。存放位置和 type 的关系见 [auto memory 的 project memory 为什么不行](../../../../notes/memory/project-memory/auto memory 的 project memory 为什么不行/INDEX.md)，本篇不重写那条 issue。
- Codex 自动记忆更粗：全局一份，连按仓库隔离都没有。写入会记下工作目录（`applies_to: cwd=...`），设计上不分分支。读取还会把整份 `memory_summary.md` 注入，不按当前目录过滤。有人提过按项目分（issue #18343），还没做。仓内已经提交的 `AGENTS.md` 才会跟分支走。

回滚会话不能自动撤回已经进入自动记忆的内容。Codex 的记忆是后台过一阵再抽取、再合并。丢掉会话，不等于撤回 `MEMORY.md` 里的条目。它只按时间清理：大约 30 天没用过的原始记录不再参与合并。没有「按某次会话撤销记忆」的官方操作。Claude Code 的记忆文件和会话记录是分开的。官方写明会话记录会按保留期删除，记忆文件不在清理范围内，直到人或 Claude 手动改删。可以用 `/memory` 打开处理。仓内的 `CLAUDE.md` 或 `AGENTS.md` 如果已经提交，回滚会话没有用，得用 Git revert。还没提交的，还原工作区即可。

若既要外部自动记忆，又要分支语义，只能自己按分支划分命名空间：切分支时跟着换，合并时迁移，废弃时删除，例如用 Git 钩子。没有现成产品把这件事做完。坑是在同一工作目录里切分支时，配置要跟着改，不然会写错地方。

### 时刻不详 归纳以项目为中心仍然少见

用户的原话大意是：好像都还是以个人为中心，只是个人目录下可以分仓库。

助手的归纳是：主流记忆系统的根还是人，例如 `user_id`、个人图谱、个人工作区。仓库只是挂在下面的标签或命名空间。分开的是检索范围，不是归属。

真正以项目为中心，至少要四条：

1. 记忆归项目所有。人走了、换了 agent，记忆还在项目里。
2. 跟着代码版本走，包括分支、合并、回滚。
3. 写入要审。错的不会直接污染所有人。
4. 有出处。能追溯是谁、在哪次会话、为什么写的。

按这四条，外部产品大多只做到半条。离这四条最近的是 edges 这种「记忆就是仓库里的文件，靠 PR 审查」的做法。缺的是自动写入（dream），以及它和外部自动记忆之间的管道。

对话里出现过一个组合思路，只作为思路，不是已定方案：外部自动记忆只当个人或团队的草稿层，沉淀出的候选经 PR 再进 `.edges/memory/`，变成项目的正式记忆。助手问过要不要画架构，或写 ADR 草稿。用户没有采纳。可选项当时就是画架构页，或写 ADR。不采用，是因为用户没有把它们定成方案。笔记不把这条写成待办，也不另开架构页。

## 结果

这场得到的是一份对照和一条判断：真正以项目为中心的记忆仍然少见。没有改任何记忆产品，没有新的 ADR，也没有回退。

对话里标成未核实的点保持未核实，不另开核实任务。助手提议的架构页和 ADR 草稿用户没有采纳，不留下待办。

## 所学

归属和检索范围要分开看。仓库标识、`peer`、`agent_id`、空间名，多数时候只是个人根下面的一把钥匙。人还在，记忆还在；人走了或换了 agent，这份记忆并不自动留在项目里。

能跟代码版本一起走的，是已经提交进仓库的文件。edges 的记忆、已经提交的 `AGENTS.md` 和 `CLAUDE.md` 属于这一类。家目录里的自动记忆、按 origin 开的个人空间、托管云上的仓库空间，都不跟分支合并和回滚。

自动写入和可审查是两头。Codex 是空闲后后台提炼。Mem0 编码插件是全自动写入、没有人审。Supermemory 写入前能否人审，官方没写，未核实。OpenViking 的人审方式在 11-10 的机制笔记里，本篇不重写。edges 的公开记忆走 PR，没有自动抽取。

可选项和当时不采用的原因：

- 要自动记住会话、多机对齐或大规模语义检索，用 OpenViking。不拿它当团队真相源，因为默认只属于个人，团队共享要另发布到 `viking://resources/...`。
- 要能审查的项目事实，并且团队走 PR、不想维护服务，用 edges。不拿它代替语义检索，大规模检索在 ADR 0034 里交给别的系统。同一会话两边一起接时怎么分工，未核实，不在这里补一套分工。
- 外部自动记忆当草稿、候选经 PR 进入 `.edges/memory/`，只是对话里的思路。不把它写成架构或 ADR，因为用户没有采纳。
- 官方配置和源码不一致时，以当次核对的源码为准。Codex 每次抽取条数，配置参考是 16，源码默认是 2。Mem0 插件文档写 0.3.1，源码是 0.3.3。

## 行动指南

### 主题行动指南

#### 背景

选定一套记忆之前，先分清它归谁、跟不跟代码版本、写入有没有人审、回滚会话之后还在不在。下面的步骤用 2026-11-17 已经核对过的行为，不把未采纳的架构当成实施计划。

#### 核心问题

怎样判断一份记忆是项目的，还是只是个人目录下按仓库切开的检索范围；分支废弃或会话回滚之后，哪些内容会自己消失，哪些还要另外删。

#### 核心解决方案

1. 先问人走了、换了 agent，这份记忆还要不要留在项目里。要留，就写成仓内文件，公开内容走 PR，例如 edges 的 `.edges/memory/`。只给当前人和当前 agent 用，可以用外部自动记忆。不采用「装同一个插件就算项目共享」：Mem0、Zep、Supermemory、OpenViking 的根仍然是人、组织或个人工作区，仓库只是下面的命名空间。
2. 再问要不要跟分支走。要各分支各写、废弃就丢、合并一起进来，把记忆放进代码仓交给 Git。外部产品默认一个仓库一份，不跟当前分支。Supermemory 可以手动改命名空间并用 `moveTo` 合并，Mem0 可以自己打 branch 标签再删，OpenViking 可以手动设 `peer.id` 再整份删除。这些都要自己做，没有现成的分支合并。不采用「等官方按分支分开」：核对时 Claude Code issue #36045、Codex issue #18343、Hindsight 的需求都还没做。
3. 再问错的记忆能不能直接被所有人看到。不能的话，不要把全自动抽取当成正式记忆。Mem0 编码插件每 5 轮、空闲 5 分钟、压缩前或会话结束时抽取，没有人审。edges 的公开类型走 PR。对话里的草稿层思路可以自己用，不把它写成待实施的架构或 ADR。
4. 回滚会话之后，另外检查自动记忆。丢掉会话不会撤回已经抽走的条目。Codex 没有按某次会话撤销记忆的官方操作。Claude Code 用 `/memory` 手动改删。已经提交的 `AGENTS.md` 或 `CLAUDE.md` 用 Git revert。还没提交的，还原工作区。

#### 验收标准

- 能指出所选系统的记忆归人还是归项目，以及仓库标识切的是检索范围还是归属。
- 能说明废弃分支上写下的记忆会不会在主线被召回，以及要丢掉它时的具体动作：不合并 Git 文件、删命名空间、按标签删，或删除 peer。
- 能说明回滚会话之后，自动记忆和已提交的规则文件分别还在不在。
- 对话里标成未核实的点仍然标成未核实。
- 没有把用户未采纳的架构页或 ADR 写成待办或已立项。

### 细节与其他

#### 若要让 Codex 的自动记忆按仓库或按分支分开

则：做不到。memories 是全局一份，默认还关着，要 `[features] memories = true` 才开。写入会记下 `applies_to: cwd=...`，读取仍把整份 `memory_summary.md` 注入，不按当前目录过滤。可选项是只让仓内已提交的 `AGENTS.md` 跟分支走。不采用「把 `~/.codex/memories/` 或 `memories_v2/` 当成项目记忆」，因为设计上不分仓库，也不分分支。设了 `CODEX_HOME` 只是换根，不是按项目分。

#### 若要让 OpenViking 严格不召回其它仓库的记忆

则：把默认的 `recall.peer_scope=all` 改成 `actor`。同一 origin 的 clone、worktree、子目录默认共用；fork 默认分开。没有 origin 时用仓库根路径，换机器会变。可选项是在 `.openviking/config.json` 写死 `peer.id`。不采用维持默认 `all`，因为其它仓库的记忆仍可能以低分出现。

#### 若 monorepo 的子项目要单独一份记忆

则：edges 在该子目录再 init 一层，`$edges-memory-ask` 从当前目录往上叠加，不穿过嵌套 Git 边界。OpenViking 要在子项目单独放 `.openviking/config.json`，写 `peer.source: "{git_remote}-{dir}"` 或写死 `peer.id`。可选项是继续用整仓一份。不采用「子项目会自动继承仓根记忆」，OpenViking 切出来的是平级独立空间。旧 cwd 模式也不采用，路径一变就成另一份。

#### 若腾讯 Team Memory 要按仓库切对话记忆

则：约定一个仓库一个团队，并在 Memory Proxy 里手动选团队、agent、任务，或带 `x-team-id`。CodeGraph 本身按仓库 URL 加分支注册。不采用「它会按当前目录或 Git 地址自动识别仓库」，文档里没有看到这种识别。发行说明里代码图谱怎样关联工作区，未核实，不补一个关联方式。

#### 若多个 agent 要共享 Mem0，或检索结果是空的

则：共享时共用同一个 `user_id`，最好再固定同一个 `app_id`，API key 指向同一个 Mem0 项目。私有才使用单独的 `agent_id`。检索同时加上 `user_id` 和 `agent_id` 会空，是因为默认抽取不会在同一条记忆上同时写这两个字段。不采用「两个条件一起加更精确」。仓库公共记忆还要求是同一仓库。个人偏好的 `user_id` 默认是本机账户名，换机器要手动对齐。只读角色能否写入或删除，未核实。

#### 若要删掉 Mem0 里所有人都能看到的那份

则：`/mem0:forget` 默认只删个人。要删共享，加 `--include-project-memory`，这会影响所有人。不采用只跑默认的 forget 来清项目记忆，因为清不掉。插件接的是 Mem0 云，接不上已经从主仓库移除的 OpenMemory 本地部署。

#### 若 Basic Memory 的笔记要跟着分支走

则：用 `bm project add` 把知识目录指进代码仓。默认的 `~/basic-memory` 不跟分支。索引不在 Git 里，切分支后搜索不对就先 `basic-memory status`，再不行就 reindex。一次切分支改很多文件时索引能否跟上，未核实。不采用把笔记写进 `.edges/memory/` 再让 Basic Memory 当索引，两边不要混写。

#### 若在同一工作目录里切分支，同时又接了外部自动记忆

则：命名空间、标签或 `peer.id` 要跟着分支改，合并时自己迁移，废弃时自己删。不改配置就会写到原来的地方。不采用指望产品跟着 `git checkout` 自动换空间，核对过的产品都没有这一步。

## 补充说明

- 原始材料：Agent Memory 专家对话，2026-11-17 约 10:32–22:26（Asia/Shanghai）。Codex 核对到 CLI 0.169.0、源码 main `ad161203`。Mem0 插件核对到源码 main `f1791da`、插件 0.3.3。原始对话不入库。
- 仍开、不重写：[公开脑 #505](https://github.com/VirusPC/edges-brain-viruspc/pull/505)，讲编码 Agent 的本机记忆和子目录 `AGENTS.md` 谁能读到。main 上还没有这篇笔记。
- 链接：[OpenViking 写入、人审与团队记忆](../2026-11-10--openviking-记忆机制分析写入人审与团队记忆/INDEX.md) — 机制分析。本篇只补仓库归属、目录粒度和分支。
- 链接：[Agent 记忆写入与读取触发机制调研](../../2026-10-19-Agent记忆写入与读取触发机制调研.md) — 2026-10-19 的旧版 Codex memories。本篇只补 2026-11-17 的源码更新。
- 链接：[mem0 插件的 hook 触发机制](../../../../notes/2026-11-12--mem0-插件的-hook-触发机制claude-code-插件/INDEX.md) — 只讲 hook 触发。本篇补共享范围、计费和不再支持插件本地部署。
- 链接：[Agent Memory Dreaming 调研](../../2026-10-14-Agent-Memory-Dreaming调研.md) — dreaming 是什么。本篇只引用「edges 的 dream 仍待做」。
- 链接：[auto memory 的 project memory 为什么不行](../../../../notes/memory/project-memory/auto memory 的 project memory 为什么不行/INDEX.md) — 可选互链。本篇不重写。

对照（只列这次核对过的归属和分支行为）：

| 系统 | 仓库怎么切 | 跟不跟分支 | 回滚会话之后 |
| --- | --- | --- | --- |
| Codex memories | 全局一份，不分仓库 | 不分。已提交的 `AGENTS.md` 才跟检出走 | 抽走的条目还在，没有按会话撤销的官方操作 |
| Claude Code 自动记忆 | 按仓库，本机，`~/.claude/projects/<仓库标识>/memory/` | 所有 worktree 和分支共用 | 记忆文件不在会话保留期清理里，用 `/memory` 手动改 |
| OpenViking | 按 origin 给个人开 peer；可写死 `peer.id` | 配置变量没有分支。要丢掉一套记忆，递归删除该 peer | 对话没有另写按会话撤销。总述是已经进入自动记忆的内容不会随会话回滚自动撤回 |
| 腾讯 Team Memory | 对话记忆没有仓库层；代码图按仓库 URL 加分支 | 对话记忆没有分支层 | 对话没有单列按会话撤回 |
| Mem0 编码插件 | 按归一化后的 origin；无 origin 则 `local:{仓库根路径}` | 检索不按分支过滤。可自己加 branch 标签再删，不支持合并。插件会不会自动带上分支名，未核实 | 全自动写入。`/mem0:forget` 默认只删个人 |
| Zep / Graphiti | 按用户一张图，或按 `group_id` | 不支持按分支分开 | 对话没有单列按会话撤回 |
| Supermemory | 按仓库名加远程地址哈希 | 可手动按分支改命名空间。废弃等于删命名空间，合并用 `moveTo` | 对话没有把删命名空间写成会话回滚 |
| Basic Memory | 默认家目录；指进代码仓才跟仓库 | 只有知识目录在代码仓里才跟分支 | 不会后台自动提炼。改不改文件取决于人和 agent 有没有写 |
| edges | 认目录和那一份 Git 副本，不读 origin | 记忆文件跟 Git | 已提交的要 Git revert；未提交的还原工作区 |

未核实，保持原样：

- Codex 0.167.0 改过默认抽取和合并模型，更早的版本用哪个模型。
- 腾讯 Team Memory 发行说明里，代码图谱怎样关联工作区。
- 同一会话里 OpenViking 和 edges 同时接入时怎么分工。
- Mem0 只读角色能否写入或删除。
- Mem0 插件会不会自动给记忆带上分支名。
- Supermemory 写入前能否人审。
- Basic Memory 一次切分支改很多文件时，索引能否跟上。
- Basic Memory 云版以对话所记的 Cloud 19 / Pro 99 / Business 249 美元为准，还是以 GitHub 首页的 15 美元终身价为准。
- Mem0 超出免费额度之后的具体价格。对话没有抄定价页。
