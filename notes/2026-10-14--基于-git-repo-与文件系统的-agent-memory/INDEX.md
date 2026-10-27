# 基于 git repo 与文件系统的 Agent Memory

## 背景

peng cheng 一直把 edges 仓库当作「外部大脑」：Agent 的记忆、笔记、任务都落成仓库里的 Markdown，经 PR 审核后合入 main。最近在仓库根新增了通用 `memory/`，并发现它的目录与 README 是手写的，不是 CLI 生成的。借这个契机，想系统看一下业界怎样用「git 仓库 / 文件系统」承载 Agent 记忆，确认 edges 的路线是不是主流、还有哪些可借鉴的做法。

## 主题

这次调研的是：以文件和目录为载体、以 git 为版本层的 Agent 记忆方案，在业界有哪些一手做法，共性模式是什么，代价在哪里，以及 edges 现有设计与之相比的异同和下一步。

- 难点一：一手材料分散在产品文档、工程博客与开源 README 中，有些候选方向（例如 Cursor 的 memories）在本次检索中没有找到可核实的官方页面，只能标为未核实，不能凭印象写。
- 难点二：「文件式记忆」和「向量式记忆」并不是二选一，很多系统是文件为真源、索引为加速层，需要区分「存储形态」与「检索方式」两个维度。
- 难点三：git 带来历史、diff、分支和回滚，但多 Agent 并发写同一份记忆时，冲突解决、索引文件的合并冲突，是文件式方案特有的问题。

## 过程

### 2026-10-14 下午 读仓库确认现状

- 读了仓库根 `README.md`、`AGENTS.md`、`CONTEXT.md`、`docs/adr/0003`、`docs/adr/0006`，以及 `extensions/cli/src/commands/memory/`。
- 确认 `memory init` 的命令描述写明 `Does not read --super`，`remember` 中也没有 `--super` 分支；对应任务卡在 `.edges/tasks/project-memory/backlog/`，由 PR #245 合入看板。

### 2026-10-14 下午 联网核实一手材料

逐个打开官方文档、工程博客和开源仓库 README 核对表述，再写进本笔记。未能打开或未找到一手页面的方向，单列在补充说明里。

## 结果

### 业界做法逐条

#### 背景：MemGPT（Letta 的前身）

- 论文《MemGPT: Towards LLMs as Operating Systems》（arXiv 2310.08560）提出「虚拟上下文管理」：借鉴操作系统在快慢存储之间搬运数据的分层内存，把有限的上下文窗口当作内存、外部存储当作磁盘，由模型自己决定何时换入换出，从而在有限窗口内提供「更大的上下文」。
- 这是后来 Letta 记忆块、文件系统与 Context Repositories 的思想源头；文件式记忆可以看作把「磁盘」换成了人也能读的 Markdown 与 git。

#### Claude Code：CLAUDE.md 与 auto memory

- 两套机制：人写的 `CLAUDE.md`（指令与规则）与 Claude 自己写的 auto memory（学到的偏好与纠正）。两者每次会话开始都会加载，但官方明确说它们是「上下文，不是强制配置」，要硬拦截用 hook。
- 分层：组织托管策略、用户 `~/.claude/CLAUDE.md`、项目 `./CLAUDE.md`（随版本库共享）、本地 `CLAUDE.local.md`（加入 gitignore）。目录树上方的文件启动即加载，子目录里的按需加载；`.claude/rules/` 可以用 `paths` 限定只在操作匹配文件时加载。
- auto memory 存在 `~/.claude/projects/<project>/memory/`，同一 git 仓库的所有 worktree 共享一个目录，只在本机，不跨机器。结构是一个 `MEMORY.md` 索引（每条一行）加每条一个主题文件；启动只加载 `MEMORY.md` 前 200 行或 25KB，主题文件按需读取。
- 记忆类型分为 `user` / `feedback` / `project` / `reference` 四类，并明确跳过能从代码推导的内容。
- 补充（auto memory 细节，已在官方文档核实）：本机默认开启，可在 `/memory` 中开关或用 `autoMemoryEnabled`、`CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` 关闭；`autoMemoryDirectory` 可改存放位置；写入 `MEMORY.md` 接近 200 行或 25KB 时会提醒 Claude 精简索引，超限则返回错误要求重写；写带 frontmatter 的记忆文件时自动记录 `modified` 时间；记忆文件不受会话记录清理周期影响；主会话的 auto memory 不传给子 Agent（fork 除外），子 Agent 可开自己的独立记忆目录。
- 现在 Claude Code 也可以直接读 `AGENTS.md`（没有 `CLAUDE.md` 时）。

#### Anthropic memory tool（API）

- 一个客户端执行的工具，Claude 发出对 `/memories` 目录的 `view` / `create` / `str_replace` / `insert` / `delete` / `rename` 请求，由应用自己落到文件、数据库或其他存储。
- 官方把它定位成「just-in-time」上下文检索：不预先塞满上下文，按需读回。启用后 API 会自动注入「先看记忆目录、假设随时会被打断」的系统提示。
- 安全上要求应用自己做路径穿越防护、大小上限与过期清理。文档还推荐「多会话软件开发」模式：首个会话建进度日志与功能清单，之后每个会话先读再干，结束前更新。
- Anthropic 工程博客《Effective context engineering for AI agents》把这类做法称为 structured note-taking（agentic memory），并把 Claude Code「CLAUDE.md 预先放进上下文 + glob/grep 按需检索」作为混合策略的例子。

#### Anthropic Managed Agents：memory stores 与 Dreams

- Managed Agents 的 memory store 是工作区范围内的一组文本文档；挂到会话上时，会作为一个目录挂载进会话沙箱，Agent 用文件工具读写。
- Dreams（研究预览，需申请）：一个异步任务，输入一个已有的 memory store 和 1 到 100 个历史会话记录，输出一个新的、重新整理过的 memory store，负责合并重复、用最新值替换过时或矛盾的条目，并提炼新的洞见。输入 store 不会被修改，可以先审阅输出再决定是否采用。文档给出的动机是：Agent 工作时的写入是「局部、增量」的，多次会话后会积累重复、矛盾和过时条目。
- 这和 edges「新结果走 PR、人审后合入」的思路相近：整理结果是一个可以审阅、可以丢弃的新版本。

#### Letta：Context Repositories（git 版本化记忆）

- 2026-02-12 发布。Letta Code 把 Agent 的上下文存成本地文件系统里的 git 仓库，每次记忆变更自动提交、带说明性的提交信息。
- 文件树结构始终在系统提示里，目录与文件名就是导航信号；每个文件有带描述的 frontmatter；`system/` 目录下的文件会被完整钉进系统提示，Agent 可以自己把文件挪进挪出 `system/` 来控制渐进式加载。
- 并发：给每个记忆子 Agent 一个独立 worktree，各自写入后通过 git 合并回 main 记忆。内置技能包括初始化（并发子 Agent 读历史）、反思（后台 sleep-time 进程，在 worktree 里写、自动合并）、碎片整理（先备份，再拆分大文件、合并重复，整理成 15–25 个聚焦文件）。
- 早前 Letta 在 2025-08 的博客中报告：只把对话历史存成文件、让 Agent 用文件工具检索，在 LoCoMo 上得到 74.0%，高于 Mem0 自报的图变体 68.5%；他们的解释是 Agent 对训练数据里常见的文件操作更熟练。这是厂商自测，只能当参考。

#### OpenAI Codex：AGENTS.md

- 全局层在 Codex 主目录（默认 `~/.codex`），优先读 `AGENTS.override.md`，否则读 `AGENTS.md`。
- 项目层从项目根（通常是 git 根）一路走到当前工作目录，每层依次查 `AGENTS.override.md`、`AGENTS.md` 和配置的备用文件名，每层最多取一个文件。
- agents.md 站点把 AGENTS.md 定位为跨 Agent 的开放格式，大型 monorepo 建议每个子包放一个，Agent 读离自己最近的那份。

#### Cursor：Project Rules

- 项目规则放在 `.cursor/rules`（`.mdc` 文件），随版本库管理，并按作用范围生效。Cursor 文档也接受 `AGENTS.md` 作为简单替代。
- Cursor「Memories」功能本次在官方 rules 文档中没有找到可核实的说明，未写入结论。

#### basic-memory：Markdown 知识库型 MCP

- 开源项目，知识以 Markdown 文件存在本地磁盘，人和 AI 都能读写；README 写明「只有文件加一个本地 SQLite 索引，不需要服务器」，检索是全文加向量的混合排序；支持 `[[Target]]` 式双链。
- 说明「文件为真源、索引为派生物」是常见组合。

#### Mem0：非文件式对照

- 定位为「AI 的记忆层」：由 LLM 从对话中抽取记忆、做实体链接与嵌入，存入向量库等后端，靠检索取回。README 当前版本写明采用单次 ADD-only 抽取（只新增，不覆盖）。
- 和文件式相比：人不能直接用编辑器打开、diff、审阅；优点是不依赖 Agent 自己整理、规模化检索更省事。

#### Cognition：Agent Memory Repo

- Cognition（Devin 的开发公司）发布的开放规范，配套 GitHub 仓库 `AgentMemoryRepo/agentmemoryrepo`。记忆就是一个 git 仓库：每次会话先 clone 最新记忆，按需搜索或顺着链接读，Agent 在学到东西时直接更新条目（无人参与），每次编辑后 push。
- 格式：`MEMORY.md` 是入口，每次会话都加载，要求简短并链接其他文件；条目是一行一个要点，末尾可带 `[source: …; added: YYYY-MM-DD]` 元数据；文件间用 `[[path]]` 交叉链接；仓库里也可以放 SQL、脚本等非 Markdown 文件。
- Dreaming：一个定期运行的专门 Agent，负责从多次会话中发现模式写成新条目，以及合并重复、删除过时内容、核对来源解决矛盾。
- 组合与并发：多人会话可以把各自的记忆仓库 clone 到同一台机器，所有权和历史各自独立，Agent 把每条记忆写回对应的人；Agent 群并行时各自 push 到同一记忆仓库，由 git 标出冲突。

#### GBrain（Garry Tan）

- 开源项目 `garrytan/gbrain`，作者在 README 中自述为 Y Combinator 总裁兼 CEO Garry Tan，用它驱动自己的个人 Agent。
- 「Brain repo 是记录系统」：知识以 Markdown 文件存在普通 git 仓库中，GBrain 把仓库同步进 Postgres / PGLite 做关键词、向量与图检索，git 里的删除在数据库中变成软删除；通过 MCP 接入 Claude Code、Codex 等。
- 注意边界：README 也写明数据库独有的页面、修订历史等运营状态需要另做数据库备份，即并非全部状态都在 git 里。
- Mem0 在 X 上发了一篇长文《A Brain in a Git Repo: How GBrain Works》介绍它；文章正文本次未能读取。

#### PageIndex：无向量的树状索引检索

- VectifyAI 开源的「无向量、基于推理的 RAG」：不切块、不建向量库，先为每个文档生成层级树状索引（类似目录），检索时由 LLM 沿树推理找到相关章节，主张「相似不等于相关」。
- 其「PageIndex File System」把树状索引扩展到文件层级，以便在整个语料库上推理。
- 与文件式记忆的关系：它把「路径即索引、索引文件指路、按需下钻」这套思路做成了检索方法本身，说明不用向量也能做大规模检索；对 edges 而言，CLI 生成的层级 `AGENTS.md` / `README.md` 索引正是一棵可供 Agent 推理下钻的树。

#### OpenViking：火山引擎的 Agent 上下文数据库

- 火山引擎开源的「AI Agent 上下文数据库」（GitHub 仓库 `volcengine/OpenViking`，AGPL-3.0），官网自述为「The Context Database for AI Agents」；火山引擎另提供托管服务。
- 虚拟文件系统：用 `viking://` 协议把知识、记忆和技能组织成一棵目录树，分三块：`resources/`（项目文档、代码仓库、网页等）、`user/<user_id>/`（该用户的记忆、私有资源、技能、会话等）、`agent/`（全局的 Agent 能力与配置，如技能）。Agent 像操作文件一样 `ls`、`tree`、`read`、`grep`，人也可以打开任意目录查看和编辑。
- 上下文分层：每个经过语义处理的目录都有三层内容：L0 简介 `.abstract.md`（默认约 256 字符，用于向量检索和快速过滤）、L1 概览 `.overview.md`（默认约 4000 字符，用于重排和导航）、L2 原文（原始文件和子目录，按需加载）。Agent 先看摘要再决定读不读原文。
- 会话：`session.commit()` 先归档对话，再在后台用 LLM 生成会话摘要（写成 `.abstract.md` / `.overview.md`），按记忆类型的 schema 抽取长期记忆，由 LLM 合并去重后以补丁形式写回记忆文件，并在归档目录写一份 `memory_diff.json` 作为记忆变更审计日志。
- 存储与检索：VikingFS 虚拟文件系统把内容存在 RAGFS 里，另建向量索引；检索可以限定在某个目录子树里做语义搜索，而不是扫描整个扁平向量池。
- 接入：人用 `ov` 命令行（如 `ov add-resource`、`ov ls`、`ov find`、`ov grep`）；Agent 通过 MCP（服务端提供 `/mcp`）或各编码 Agent 的插件、hook 接入，另有 Python、Go、TypeScript SDK 与 HTTP API。

#### 论文：Filesystem-Based Memory for LLM Agents（2026-07）

- 《Filesystem-Based Memory for LLM Agents: Organization, Evolution, and Sustainability》，Sizhe Zhou、Sheldon Yu、Hui Wei 等，arXiv 2607.26637，2026-07-29 提交。目前只是 arXiv 预印本，没有查到会议或期刊录用信息，**未经同行评审**，结论只能当参考。
- 研究设定：把「Markdown 目录树加通用文件工具」的记忆形式化为围绕同一个记忆文件系统的三个角色：
  - 管理 Agent：整合并整理新来的内容，写入工具是 Anthropic memory tool 的六个通用文件操作（view、create、字符串替换、insert、delete、rename）加行级正则搜索；
  - 检索 Agent：只读地浏览存储并给出带出处的回答，工具是 view、正则搜索、目录、按章节读，故意不给排序检索引擎，好让目录组织的差异显现出来；
  - 执行 Agent：提供任务轨迹，被提炼为技能，与陈述性记忆放在同一个存储里。
- 变量：记忆形态（不建存储、按块 BM25 检索、逐字转储、只按主题分文件夹、LLM 重组、Agent 自行整理的层级）、信息流规模、工具集（默认工具、加 BM25、沙箱 shell）、管理与检索 Agent 的模型强弱。基准包括 LoCoMo、PersonaMem、REALTALK 等长对话和一个具身任务的技能设定，度量回答正确率、出处支持率、成本以及存储健康度。
- 主要发现：
  - 整理带来的稳定收益是检索更省：资料量大时，整理过的存储检索成本大约减半。
  - 随着记忆增长，除最强的管理 Agent 外，目录结构都会退化。
  - 没有任何一个被测 Agent 能把「整理本身」转化为更好的答案；没有一种形态在所有场景下答案质量最好。
  - 只换工具集对存储形态的影响，与换模型一样大；论文据此认为工具集是引导目标结构的一个自然旋钮。
  - 记忆形态要匹配使用者：强执行 Agent 用逐字日志效果最好，弱执行 Agent 下排名反转，只有整理过的「技能加记忆」存储能撑住。
- 它在引言中把 Anthropic memory tool（六个通用文件操作的目录）、Claude Code auto memory（带索引的记忆文件夹，`MEMORY.md` 加主题文件按需读取）作为「文件系统已是部署默认」的例证，并在相关工作中引用 Anthropic Dreams，说明整理被放到 Agent 之外进行，正是因为 Agent 自己的写入是局部增量的、存储会在两次整理之间退化。
- 全文没有讨论 git。

#### Karpathy：LLM Wiki

- Karpathy 在一份公开 gist《LLM Wiki》里提出：与其每次 RAG 从原始文档重新拼答案，不如让 LLM 持续维护一套互相链接的 Markdown wiki，把知识「编译一次、保持最新」，成为不断复利的产物。人负责找材料和提问，LLM 负责总结、交叉引用、归档；他用 Obsidian 浏览，「Obsidian 是 IDE，LLM 是程序员，wiki 是代码库」。
- 这与 edges「你的大脑也是一个目录」的定位高度一致。

### 共性模式

- **路径即索引**：目录层级和文件名本身就是第一层检索信号（Letta 把文件树放进系统提示；Claude Code 按目录层级加载）。
- **Markdown 叶子加索引文件**：一条记忆一个文件，再用一个短索引（`MEMORY.md`、frontmatter 描述）指路；索引有长度上限，正文按需读。
- **分层**：组织/全局、用户、项目、目录（本地私有）几层，越靠近工作目录越后读、越具体。私有层用 gitignore 或放在仓库外。
- **渐进式加载**：只把索引或钉住的文件放进上下文，其余 just-in-time 读取（Claude Code 子目录按需加载、memory tool、Letta `system/`）。
- **git 提供历史与审阅**：版本化、diff、回滚、PR 审阅；Letta 把它做成自动提交，edges 则走人审 PR。
- **并发靠 worktree 或 git 合并**：Letta、Cognition Agent Memory Repo 与 Claude Code 都把 worktree 作为隔离单位（Claude Code 的 auto memory 在同仓 worktree 间共享）。
- **检索方式**：grep / glob 加 Agent 自主浏览是主流默认；向量或全文索引作为可选的派生加速层（basic-memory），而不是真源。

### 权衡与局限

- 文件式记忆依赖 Agent 自己整理，时间长了会碎片化，需要定期整理（Letta 的 defragmentation、Cognition 的 Dreaming、Claude Code 的索引长度提醒与 `/doctor` 修剪建议）。
- 指令文件只是上下文，不是强制；必须执行的约束应交给 hook、CI 或权限设置。
- 索引文件是并发写的热点，多分支同时改同一个索引容易冲突；由工具自动生成索引能缓解。
- 规模大时纯 grep 召回有限，语义近似问题需要额外索引。
- 公开仓库里的记忆必须脱敏；私有内容只能放 gitignore 层或私有仓。
- 2607.26637 的实验显示：Agent 自行整理的目录结构会随记忆增长而退化，整理本身也不一定提升答案质量；目录整理的主要收益在于降低大资料的检索成本。
- 人审 PR 提高质量，但也增加了写入延迟，不适合高频的细粒度记忆。

### edges 现状（已在仓库核实）

- edges 仓库就是外部大脑：README 写明「harness 就是一组 Markdown 文件加 Git」「你的大脑，也是一个目录」。
- `.edges/memory/` 是仓库自身的维护记忆，按类型分目录（`feedbacks/`、`projects/`、`references/`，以及 gitignore 的 `users/`），由根 `AGENTS.md` 的本层索引登记。ADR 0003 规定用户记忆权威副本在工作树内并 gitignore；ADR 0006 规定新增类型只改布局，不另建注册表。
- 仓库根 `memory/` 放不属于任何主题的通用笔记（例如 `memory/references/`），约定必须由 edges CLI 以 `--super` 初始化和写入、索引由 CLI 自动生成，不手写目录或 README。
- 目前 `memory init` / `remember` 还不读 `--super`（`init` 命令描述写明 `Does not read --super`），任务卡在 `.edges/tasks/project-memory/backlog/`，相关 PR #245 已合并到看板。现有根 `memory/` 下内容仍是手写结构，待 CLI 补齐后重整。
- 变更走 PR，main 受保护；多 Agent 必须各用独立 git worktree 加独立分支；Grok Bot 自己的记忆只做次级索引，真源在仓库。

### edges 与业界的对照

| 维度 | 业界常见做法 | edges |
| --- | --- | --- |
| 载体 | Markdown 文件加目录 | 相同，且整个仓库都是记忆的一部分 |
| 索引 | `MEMORY.md`、frontmatter、文件树 | 各层 `AGENTS.md` 与类型 `README.md`，由 CLI 生成 |
| 分层 | 组织 / 用户 / 项目 / 本地 | 递归作用域（任意目录可 init），`--super` 指向仓库根 |
| 记忆类型 | Claude Code 四类 | 内置六类且可扩展，前四类与 Claude Code 对齐 |
| 写入审阅 | Letta 自动提交；OpenViking 由服务在会话提交时自动抽取写入，只留 `memory_diff.json` 审计日志；Cognition 每次编辑即 push、无人参与；Claude Code 本机直接写 | 人审 PR 合入受保护 main |
| 并发 | Letta 子 Agent 各用 worktree 再合并 | 每个 Agent 一个 worktree 加分支，经 PR 合并 |
| 检索 | grep 为主，可选向量索引（GBrain）、目录范围内的向量检索（OpenViking）或无向量树索引（PageIndex） | CLI list/get 加 grep，暂无向量层 |
| 分层摘要 | OpenViking 每个目录自动生成 L0 `.abstract.md` 与 L1 `.overview.md`，原文按需读 | 只有 CLI 生成的索引（各层 `AGENTS.md` / `README.md` 的条目与描述），没有目录级摘要 |
| 私有内容 | `CLAUDE.local.md`、仓库外目录 | gitignore 的 `users/`，或私有仓 |

## 所学

- edges 的路线（文件为真源、git 为版本层、索引由工具生成、按作用域分层）与 Claude Code、Letta、Codex、Cognition Agent Memory Repo、GBrain、Karpathy 的做法方向一致，不是孤例；其思想可追溯到 MemGPT 的「上下文是内存、外部存储是磁盘」。
- Cognition 的规范与 edges 最接近（git 仓库、`MEMORY.md` 入口、一行一条带来源、定期整理），区别是它默认无人审核直接 push，edges 走 PR；它的条目级 `source` / `added` 元数据值得借鉴。
- 与业界最大的差异是「人审 PR」：Letta 选择自动提交以换取低延迟，edges 选择审阅以换取质量与公开安全。两者都成立，取决于记忆写入频率与公开程度。
- 「检索靠 grep 还是向量」不必二选一：业界常见做法是文件为真源、索引为可重建的派生物；现阶段 edges 规模下 grep 足够，没有必要引入向量库。
- OpenViking 与 edges 的异同：相同的是路径即索引、摘要分层、按需加载；不同的是它没有 git 历史、diff 和 PR 审阅，记忆由服务自动抽取、合并后写入（只有变更审计日志），而 edges 的每次变更都经人审 PR。可借鉴的是「在每个目录生成分层摘要」：让 Agent 先读一两句简介和一段概览，再决定是否下钻。
- 2607.26637 给 edges 的启示：
  - 结构退化是常态，不能指望 Agent 自觉保持整洁；edges 用 CLI 自动生成索引、用人审 PR 把关，正是对抗退化的两道闸。
  - 工具设计是一等杠杆：CLI 暴露哪些命令、校验什么，会直接塑造记忆的形态，作用不亚于换模型。
  - 需要定期整理（类似 Dreams、Letta defragmentation、Cognition Dreaming），且整理结果应作为可审阅、可丢弃的新版本提交。
  - 记忆形态要匹配使用者：给能力弱的 Agent 准备更提炼的条目，给强 Agent 保留原始材料的链接。
  - 整理的价值主要在省检索成本，不必为了「好看」过度分层。
- Mem0 这类抽取式记忆不可直接审阅、不可 diff，与 edges「经你审核合并」的核心诉求不符，所以只作对照，不作替代。

## 行动指南

### 主题行动指南

#### 背景

用 git 仓库承载 Agent 记忆时，需要同时照顾可读、可审、可并发和上下文成本。

#### 核心问题

如何让记忆既能被多个 Agent 安全写入，又不会膨胀成无法加载、无法审阅的一堆文件。

#### 核心解决方案

1. 一条记忆一个 Markdown 文件，索引由工具生成，不手写；索引控制长度，正文按需读。可选项：手写索引（易漂移、并发冲突多，不采用）；向量库为真源（不可审阅，不采用）。
2. 按作用域分层，私有层用 gitignore 或私有仓隔离。
3. 每个 Agent 一个 worktree 加分支，经 PR 合并；索引冲突靠重新生成解决，而不是手工合并。
4. 必须执行的约束放到 hook、CI 或 CLI 校验，不只写在说明文件里。
5. 定期整理：合并重复、拆分大文件、清理过期条目。

#### 验收标准

- [ ] 任一记忆目录的索引都能由工具重建，且重建后无 diff。
- [ ] 并发的两个 Agent 分支合并时，不需要手工解决索引冲突。
- [ ] 每次会话默认加载的记忆内容有明确上限。
- [ ] 公开仓库中没有凭据、账号与未公开地址。

### 细节与其他

#### 若要推进 edges 的下一步

则只作建议，本笔记不改代码：

- 先完成 backlog 中「`memory init` / `remember` 支持 `--super`」，再用 CLI 重整仓库根 `memory/`，删除手写 README。
- 参考 Claude Code 的索引上限，给 CLI 生成的索引加长度检查（例如 `memory doctor` 报告超长索引）。
- 把 CLI 当作塑造记忆结构的主要杠杆：在 `memory doctor` 一类命令中检查结构健康（索引长度、重复、孤立条目），而不是只靠提示词要求 Agent 保持整洁。
- 参考 OpenViking 的 L0 / L1 分层，评估让 CLI 为每个目录生成简介与概览（可放在索引文件的描述里或单独文件），并在结构变化时重建。
- 参考 Cognition 的条目元数据，考虑让 CLI 为记忆条目记录来源与添加日期。
- 参考 Letta 的 defragmentation 与 Cognition 的 Dreaming，考虑一个整理类 skill：先备份，再合并重复、拆大文件，结果仍走 PR。
- 参考 Letta 的 `system/` 钉住机制与 Claude Code 的 `paths` 规则，评估是否需要「始终加载」与「按路径加载」的元数据。
- 索引冲突：让 CLI 在 rebase 后可一键重建索引，减少多 worktree 合并时的人工处理。
- 向量检索暂不引入；如果将来条目规模让 grep 召回明显不足，再以「可重建的派生索引」方式加入，不改变文件为真源。

#### 若需要更高频的记忆写入

则考虑保留一个本机、gitignore 的草稿层，由人定期挑选晋升为 PR；不要为了高频写入放松 main 保护。

## 补充说明

### 参考来源

- Claude Code 记忆文档（CLAUDE.md、`.claude/rules/`、auto memory、AGENTS.md 读取规则）：https://code.claude.com/docs/en/memory
- Anthropic memory tool 文档（`/memories` 目录、六个命令、安全建议、多会话模式）：https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
- Anthropic 工程博客《Effective context engineering for AI agents》（just-in-time 检索、structured note-taking）：https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Letta 博客《Introducing Context Repositories: Git-based Memory for Coding Agents》（2026-02-12）：https://www.letta.com/blog/context-repositories/
- Letta 博客《Benchmarking AI Agent Memory: Is a Filesystem All You Need?》（2025-08-12，厂商自测）：https://www.letta.com/blog/benchmarking-ai-agent-memory/
- OpenAI Codex AGENTS.md 指南（全局与项目层查找顺序、override 文件）：https://developers.openai.com/codex/guides/agents-md
- AGENTS.md 开放格式站点（嵌套 AGENTS.md）：https://agents.md/
- Cursor Rules 文档（`.cursor/rules`、`.mdc`）：https://cursor.com/docs/rules
- basic-memory 开源仓库（Markdown 加本地 SQLite 索引、混合检索）：https://github.com/basicmachines-co/basic-memory
- Mem0 开源仓库（记忆层、ADD-only 抽取、实体链接）：https://github.com/mem0ai/mem0
- Mem0 平台文档概览：https://docs.mem0.ai/platform/overview
- Karpathy《LLM Wiki》gist：https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- MemGPT 论文（arXiv 2310.08560）：https://arxiv.org/abs/2310.08560
- Cognition Agent Memory Repo 规范页：https://cognition.com/agent-memory-repo
- Agent Memory Repo 开源仓库：https://github.com/AgentMemoryRepo/agentmemoryrepo
- GBrain 开源仓库（README，作者自述与「brain repo 是记录系统」）：https://github.com/garrytan/gbrain
- Anthropic Managed Agents memory stores 文档：https://platform.claude.com/docs/en/managed-agents/memory
- Anthropic Dreams 文档（研究预览）：https://platform.claude.com/docs/en/managed-agents/dreams
- OpenViking 开源仓库（README）：https://github.com/volcengine/OpenViking
- OpenViking 官网：https://openviking.ai/
- OpenViking 架构文档：https://docs.openviking.ai/en/concepts/01-architecture
- OpenViking 上下文分层（L0/L1/L2）：https://docs.openviking.ai/en/concepts/03-context-layers
- OpenViking Viking URI：https://docs.openviking.ai/en/concepts/04-viking-uri
- OpenViking 会话管理：https://docs.openviking.ai/en/concepts/08-session
- 论文《Filesystem-Based Memory for LLM Agents》（arXiv 预印本，未经同行评审）：https://arxiv.org/abs/2607.26637
- Mem0 在 X 上介绍 GBrain 的帖子（长文《A Brain in a Git Repo: How GBrain Works》）：https://x.com/mem0ai/status/2070541048527609885
- PageIndex 开源仓库：https://github.com/VectifyAI/PageIndex
### 综述清单（都不讨论文件式记忆）

以下宽泛的 Agent 记忆综述都已打开核实；在全文中检索不到对文件系统、Markdown 或 git 式记忆的讨论，只把 MemGPT 当作分层或早期系统提及。目前没有专门讲文件 / git 式 Agent 记忆的综述。

- 《Memory in the Age of AI Agents: A Survey — Forms, Functions and Dynamics》，Yuyang Hu 等，2025-12：https://arxiv.org/abs/2512.13564
- 《Memory for Autonomous LLM Agents: Mechanisms, Evaluation, and Emerging Frontiers》，Pengfei Du，2026-03：https://arxiv.org/abs/2603.07670
- 《Anatomy of Agentic Memory: Taxonomy and Empirical Analysis of Evaluation and System Limitations》，Dongming Jiang 等，2026-02：https://arxiv.org/abs/2602.19320
- 《A Survey on the Memory Mechanism of Large Language Model based Agents》，Zeyu Zhang 等，2024-04（后发表于 ACM TOIS）：https://arxiv.org/abs/2404.13501

### 其他链接

- git worktree 官方文档：https://git-scm.com/docs/git-worktree

### 未能核实的点

- Cursor「Memories」功能：官方 rules 文档中未见说明，未写入结论。
- Mem0 关于 GBrain 的帖子：X 接口显示发布时间为 2026-06-27 00:13（UTC+8），不是委托中给的 2026-07-27；帖子只是长文链接，长文正文未能读取，GBrain 的事实以其 GitHub README 为准。
- Cognition Agent Memory Repo 的发布日期（委托中给 2026-10-13）：页面上未找到日期，未核实。
- 已解决：Anthropic Managed Agents / Dreams 已找到官方文档并写入正文（memory store 挂载为沙箱目录；Dreams 为研究预览）。memory store 在服务端的底层存储形式文档未说明，未核实。
- 2607.26637 尚无同行评审或录用信息，其结论未独立复现。
- OpenViking 相关论文（arXiv 2605.29640，《Directory-Aware Query and Maintenance in Vector Databases》）是否被 VLDB 2026 录用：只有项目 README 自述「Presented at VLDB 2026」，未找到会议官方录用信息，未核实；GitHub star 数（二手来源称约 3 万）也未核实，不写入正文。
- Letta 的 LoCoMo 分数为厂商自测，未独立复现。

### 原始材料引用

- 本笔记由 Grok Bot 于 2026-10-14 按 peng cheng 的调研委托整理。
- 仓库内依据：`README.md`、`AGENTS.md`、`CONTEXT.md`、`docs/adr/0003-user-memory-in-repo-gitignored.md`、`docs/adr/0006-extensible-project-memory-types.md`、`extensions/cli/src/commands/memory/init.ts`、`.edges/tasks/project-memory/backlog/2026-10-14--edges-memory-init-remember-支持-super写入仓库根-memory/`、PR #240、PR #245。