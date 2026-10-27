# 真正做 Agent 的人，正在用哪些 Skills

## 执行摘要

公开资料能支持的结论，比社交媒体上的“大神 Skill 清单”窄得多。

第一，真正有一手证据、公开了自己实际工作系统的人，主要是 Peter Steinberger、Jesse Vincent、Kieran Klaassen / Trevin Chow、Garry Tan、Matt Pocock。前四组把 Skill 当作 Agent 的运行规程，而不是提示词收藏：它们围绕规划、隔离执行、验证、评审、交接和经验回流组成闭环。Matt Pocock 的公开仓库则是一个更克制、可组合的工程 Skill 体系。

第二，最靠近基础 Agent 产品的一批人——Boris Cherny、Thariq Shihipar——反而没有公开完整的个人 Skill 清单。公开证据只说明他们会把重复流程做成自定义 Skill，并强调 Skill 应针对自己的工作流。把社区根据其访谈整理出的“Boris Skill”说成 Boris 本人在用，是证据越界。

第三，高手实际依赖的不是“CEO、CTO、产品经理”这类角色扮演 Skill，而是能形成可靠反馈回路的过程 Skill：`brainstorm/spec`、`worktree/isolated execution`、`TDD`、`browser QA`、`code review`、`verification-before-completion`、`handoff`、`compound/learn`。角色可以帮助切换视角，但真正产生稳定收益的是可验证的流程、脚本和退出条件。

第四，Skill 的最新共识不是“装得越多越强”，而是“少而准、按需加载、贴合本地环境、经过评测”。Anthropic 的标准把 Skill 定义为带 `SKILL.md` 的目录，可附带脚本、参考资料和资产，并通过名称与描述先发现、命中后再加载正文。[^1] 这使 Skill 更像 Agent 的可版本化作业程序，而不是传统插件或静态知识库。

对 Edges，最值得补的不是整套 gstack 或 Compound Engineering，而是三个缺口：完成前证据验证、困难问题的系统调试、Skill 自身的行为评测。`edges-memory-*`、`research`、`domain-modeling`、`grilling` 已经覆盖了记忆、研究和需求澄清，不应再装功能重叠的大包。

## 范围与证据标准

调研以 2025 年 10 月 Agent Skills 正式发布之后的公开资料为主，证据截止 2026 年 9 月 10 日。“在用”按以下等级判断：

| 等级 | 判定标准 | 可以得出的结论 |
| --- | --- | --- |
| A：直接使用 | 本人或团队明确说“我每天用”“这是我的本地工作区”“我们用它构建产品”，并公开代码 | 可以说本人或团队实际使用 |
| B：本人维护 | 本人公开并持续维护 Skill，但没有明确披露日常使用频率 | 可以说本人设计、维护或推荐，不能夸大频率 |
| C：亲自试用 | 本人公开演示或试用某一 Skill | 只能说试过，不能说长期使用 |
| D：社区改编 | 第三方根据帖子、访谈或风格整理成 Skill | 只能说“受其启发”，不能归为本人 Skill |

“Agent 领域大佬”也分三类：Agent 产品或基础设施构建者、用 Agent 真实交付产品的高强度实践者、研究与观察 Agent 的专业人士。把三类混为一谈，会把名气误当作 Agent 实践证据。

## 一手证据最强的实践者

### Peter Steinberger：个人 Agent 操作系统，而不是 Skill 商店

Peter 的 `agent-scripts` 是目前最接近“公开个人生产配置”的样本。仓库明确写着它是“Peter 本地工作区共享的 Agent instructions、skills 和 helpers”，并把 Skills 定义为主要路由层；同一套真实目录通过同步脚本供 Codex 和 Claude Code 使用。[^2] 这比一个面向市场的“推荐清单”更有证据价值。

他公开的 Skill 可以分成五组：

| 目的 | 代表 Skills | 真正解决的问题 |
| --- | --- | --- |
| 控制面与委派 | `maintainer-orchestrator`、`codex-first`、`codex-debugging`、`codex-huge-context` | 多仓、多任务、不同 Agent 之间怎样分工并持续推进 |
| 评审与验证 | `autoreview`、`behavior-validator`、`github-deep-review`、`crabbox` | 不以“Agent 说完成了”为完成，而要有结构化证据和远程/真实环境验证 |
| 浏览器与信息获取 | `browser-use`、`discrawl`、`gitcrawl`、`slacrawl`、`wacrawl`、`notcrawl` | 把真实登录态、网页、GitHub、Slack、WhatsApp 等变成可重复操作的工具链 |
| 交接与可观测性 | `agent-transcript`、`handoff`、`session-viewer` | 保存运行证据、跨会话接力、回看 Agent 做过什么 |
| 发布与运维 | `release-mac-app`、`fleet-maintenance`、`xcode-sync`、`npm`、`wrangler`、`ssh-doctor` | 把高风险、易遗漏的发布和机器运维写成受约束流程 |

OpenClaw 另有一个更小的公共 Skill 核心集：`agent-transcript`、`autoreview`、`behavior-validator`、`beam`、`crabbox`、`handoff`、`readme-standard`、`session-viewer`。仓库明确把它们描述为跨 OpenClaw 项目复用的公共工作流，而产品专属 Skill 留在各自仓库。[^3]

这里最值得学的不是数量，而是分层：个人全局规则、跨仓通用 Skill、仓库专属 Skill、确定性 helper script 各有真源，通过软链接或同步机制暴露给不同 Agent。Skill 是路由入口，脚本承担可重复执行的机械部分。

证据等级：A。

### Jesse Vincent：Superpowers 把软件工程纪律做成自动触发的 Skills

Jesse 在第一人称文章中详细记录了自己如何把工作方式系统化为 Superpowers：启动时教 Agent 发现 Skills；有匹配 Skill 时必须使用；默认经过 brainstorm → plan → implement；使用 worktree 隔离并行任务；执行阶段坚持 RED/GREEN TDD；任务间做代码评审。[^4]

当前公开的核心技能包括：

| 环节 | Skills |
| --- | --- |
| 需求与设计 | `brainstorming` |
| 隔离与规划 | `using-git-worktrees`、`writing-plans` |
| 执行 | `subagent-driven-development`、`executing-plans`、`dispatching-parallel-agents` |
| 测试与调试 | `test-driven-development`、`systematic-debugging`、`verification-before-completion` |
| 评审与收尾 | `requesting-code-review`、`receiving-code-review`、`finishing-a-development-branch` |
| 元技能 | `using-superpowers`、`writing-skills` |

Superpowers 最有原创性的部分不是技能名称，而是两条设计原则。其一，Skill 是强制工作流，不是“有空看看”的文档。其二，Skill 自身也要做行为测试：先让没有 Skill 的 Agent 在压力场景中失败，再修改 Skill，直到它在时间压力、沉没成本等情境下仍遵守流程。Jesse 将其称为“对流程文档做 TDD”。[^5]

证据等级：A。

### Kieran Klaassen / Trevin Chow / Every：把经验回流做成主循环

Every 的 Compound Engineering 不是概念演示。Kieran 的文章明确说，这套方法来自构建 Cora 的实战，并在多个 PR 中反复验证；Every 用主要为单人配置的工程团队运行五个产品。它的主循环是 Plan → Work → Review → Compound → Repeat，其中 `Compound` 把解决方案写成下一轮 Agent 能检索的知识。[^6]

当前公开插件有 35 个 Skills，核心闭环是：

`ce-brainstorm` → `ce-plan` → `ce-work` → `ce-simplify-code` → `ce-code-review` → `ce-compound`

周边能力包括：

- 产品与方向：`ce-strategy`、`ce-product-pulse`、`ce-ideate`、`ce-pov`。
- 调试与理解：`ce-debug`、`ce-explain`、`ce-bakeoff`、`ce-prototype`。
- Git 与交付：`ce-commit`、`ce-commit-push-pr`、`ce-babysit-pr`、`ce-resolve-pr-feedback`、`ce-worktree`。
- 真实验证：`ce-test-browser`、`ce-test-xcode`、`ce-dogfood`、`ce-polish`。
- 自主执行：`lfg`。
- 知识与协作：`ce-compound-refresh`、`ce-handoff`、`ce-proof`、`ce-promote`。

插件公开说明其在 14 个 Agent host 上运行，且 Codex、Claude Code、Cursor 等共用一份 Skill 真源。[^7] 它代表“团队级 Agent 工程系统”：Skill 不只是个人快捷方式，还编码了团队知识流、评审标准、工具适配和宿主差异。

证据等级：A（团队实际使用）。

### Garry Tan：gstack 是高强度独立构建者的角色化工厂

Garry Tan 的 gstack 明确宣称是自己的 Claude Code 精确配置，并写道“我每天都用它”。他把它描述为由 CEO、设计、工程管理、QA、安全和发布等专家组成的虚拟团队。[^8]

最常用、最能代表其方法的 Skills 是：

- 方向：`office-hours`、`plan-ceo-review`。
- 工程计划：`plan-eng-review`、`plan-devex-review`、`autoplan`、`spec`。
- 设计：`plan-design-review`、`design-consultation`、`design-shotgun`、`design-review`。
- 质量：`review`、`qa`、`qa-only`、`cso`、`investigate`、`canary`、`benchmark`。
- 浏览器与真实界面：`browse`、`scrape`、`setup-browser-cookies`。
- 交付：`ship`、`land-and-deploy`、`document-release`。
- 学习与状态：`retro`、`learn`、`context-save`、`context-restore`。

gstack 的特点是角色感强、覆盖面宽、默认面向整条产品交付链。它很适合研究“一个技术创始人怎样把 Agent 当团队用”，但不适合无差别安装进已有严密规则的仓库：它会带入自己的计划、提交、发布、浏览器和上下文管理假设。

证据等级：A。

### Matt Pocock：小而可组合的工程 Skills

Matt 的仓库标题直接称这些是“我每天用于代码工作的 Skills”，并明确反对让一个大框架接管全过程。他把 Skills 设计成可单独改造的小模块。[^9]

其中最有代表性的工程 Skills 是：

- 澄清与拆解：`grill-with-docs`、`to-spec`、`to-tickets`、`wayfinder`。
- 构建：`implement`、`prototype`、`tdd`。
- 诊断与设计：`diagnosing-bugs`、`codebase-design`、`domain-modeling`、`improve-codebase-architecture`。
- 证据与评审：`research`、`code-review`、`resolving-merge-conflicts`。
- 通用生产力：`grill-me`、`handoff`、`teach`、`to-questionnaire`、`wait-what`、`writing-for-agents`。

他的另一个重要做法是区分“用户显式调用”和“模型自动调用”。像 `implement`、`to-spec`、`triage` 这类会改变工作方向或产生较大动作的 Skill 由人触发；`diagnosing-bugs`、`research`、`tdd`、`domain-modeling` 等可由模型按语义触发。这是权限与意图控制，而不只是调用体验。

证据等级：A。

### Shreya Shankar：一个窄 Skill，也可以比一整套角色更有价值

Shreya 是 DocETL 的主要研究者与构建者，其 GitHub 主页把 `plain-writing-skill` 作为置顶项目。Skill 只做一件事：让 Agent 用平实、可读的语言写作和改写，并提供自检流程。[^10]

它的重要性在于反例：高价值 Skill 不一定负责“全流程编程”。它也可以只编码一种稀缺判断——例如怎样去掉 Agent 写作的套话、假设和不必要内容——并用评测检验规则是否真的改善输出。

证据等级：B。

## 核心圈人士：公开观点很重要，但没有完整个人清单

### Boris Cherny：确定在用自定义流程，但公开清单不可验证

Boris 是 Claude Code 的创建者，其公开分享反复强调把高频重复工作变成 Skills 或命令，并让 Agent 拥有真实验证方式。可以较有把握地确认的工作模式包括并行会话、共享项目指令、自动格式化和验证、代码简化、批量迁移、提交和 PR 自动化。

但截至证据截止日，没有找到由 Boris 本人维护、可审计的个人 Skill 仓库。网上常见的 `boris` Skill、`verification-first-parallel-session-loop` 等，页面自身也注明是第三方根据公开材料整理，并未由 Boris 编写或审核。不能把这些包装成“Boris 正在使用的 Skill”。Claude Code 官方文档能验证 Skill 的机制和示例，却不能替代个人使用证据。[^11]

可靠结论：Boris 使用自定义自动化和 Skill 思维；不可靠结论：某个社区打包的 “Boris skills” 就是他的实际配置。

证据等级：实践 A，具体公开清单 D。

### Thariq Shihipar：偏好自己的窄 Skills，反对盲装角色包

Thariq 在 Claude Code 团队工作。公开活动记录中，他明确反对没有读过就安装“CEO agent”之类的通用 Skill 包，认为针对个人具体工作流的 Skill 才值得信任。[^12] 他公开分享的重点是：先让 Agent 采访你、把状态和 UI 分开以便独立验证、用厚 artifacts 承载上下文、保持 Skill 本身精简。

同样，没有找到他本人公开维护的完整个人 Skill 目录。社区把他的文章改编为 `blindspot-pass`、`interview-me`、`reference-hunt`、`implementation-plan` 等 Skills，这些可以作为学习材料，但必须标注为社区改编。

证据等级：实践 A，具体公开清单不足。

### Simon Willison：亲自试过 Skill，但主要价值是判断框架

Simon 亲自启用了 Anthropic 发布的 `slack-gif-creator`，记录了生成和尺寸校验过程；他还公开设想过 Datasette、数据新闻、DuckDB、D3 等领域 Skills。[^13] 这能证明试用和判断，不能证明他长期维护或使用一套个人 Skill 库。

他的核心判断仍很有价值：很多 MCP 能力可以由 CLI 加 Skill 更轻量地完成；Skill 的简单性、渐进加载和跨模型可移植性可能比复杂协议更有扩散力。但这属于架构判断，不应被伪装成个人 Skill 推荐榜。

证据等级：C。

### Andrej Karpathy：`program.md` 是近亲，不是 Agent Skill

Karpathy 的 `autoresearch` 让 Agent 反复修改训练代码、固定时间训练、比较指标、保留或回滚实验。人主要编写 `program.md`，即“研究组织的代码”。[^14] 它与 Skill 的精神高度相似：把流程、边界和反馈回路写成模型可执行的 Markdown。

但 `autoresearch` 仓库没有正式的 `SKILL.md`，社区的 `autoresearch` Skills 都是后续改编。准确说法是：Karpathy 在用 Skill-like 的程序化上下文，而不是在公开使用某个名为 `autoresearch` 的 Agent Skill。

证据等级：相邻范式 A，正式 Skill 无证据。

### Harrison Chase 等人：不要从“参加过 Agent 会议”推断个人 Skill

LangChain、Letta、DSPy、AutoGen 等项目的作者当然是 Agent 领域的重要构建者，但没有找到 Harrison Chase、Charles Packer、Omar Khattab 等人公开维护的个人 Agent Skills 清单。会议转录被第三方整理成 Skills，只能证明观点来源，不能证明讲者安装或使用了这些 Skill。

这是本次调研最重要的负面发现：越接近基础设施和研究核心的人，公开资产往往是框架、论文、评测、harness 或仓库规则，而不一定是一个可安装的 Skill 包。

## 跨实践者的共同 Skill 栈

把名字去掉后，公开实践高度收敛为七层：

| 层 | Peter | Superpowers | Compound Engineering | gstack | Matt | 稳定价值 |
| --- | --- | --- | --- | --- | --- | --- |
| 路由 | `maintainer-orchestrator` | `using-superpowers` | `ce-setup` / 语义路由 | `gstack` | `ask-matt` | 先选对流程，避免所有规则常驻上下文 |
| 澄清 | 项目队列与 brief | `brainstorming` | `ce-brainstorm` | `office-hours`、`plan-ceo-review` | `grill-with-docs` | 把隐含需求变成可审查 artifact |
| 计划 | worker brief | `writing-plans` | `ce-plan` | `plan-eng-review` | `to-spec`、`to-tickets` | 计划成为 Agent 的执行接口 |
| 隔离执行 | Codex task / repo ownership | `using-git-worktrees`、subagents | `ce-work`、`ce-worktree` | `autoplan`、多会话 | `implement`、`wayfinder` | 限定写入面，避免并行互相污染 |
| 验证 | `behavior-validator`、`crabbox` | TDD、systematic debugging | browser/Xcode/dogfood | `qa`、`cso`、`canary` | `tdd`、`diagnosing-bugs` | 真实反馈环路比更长提示词重要 |
| 评审与交付 | `autoreview`、release skills | code review、finish branch | code review、PR babysit | `review`、`ship` | `code-review` | 分离“做完”和“证明做完” |
| 回流 | transcript、handoff | Skill TDD 与迭代 | `ce-compound` | `retro`、`learn` | domain docs、handoff | 把一次修正变成下一次默认能力 |

这张表解释了为什么真正的 Skill 体系会越做越像操作系统：它不仅教 Agent“怎么写代码”，还规定如何理解任务、怎样获取证据、何时停止、如何交接、如何让下一次更好。

## 哪些 Skills 最值得借鉴

### 第一优先级：完成前证据验证

最值得借鉴的是 `verification-before-completion`、`autoreview`、`behavior-validator` 这类能力。它们解决 Agent 最常见的可靠性问题：以“改了代码”“测试应该过”“看起来完成”替代真实证据。

适合 Edges 的版本不需要复制某个大包，可以形成一个窄 Skill：在宣布完成前，根据产物类型要求最新证据——代码要测试与 diff，Skill 要触发/不触发行为用例，文档要链接与结构检查，界面要真实交互或渲染检查。

### 第二优先级：系统调试而不是猜修

Superpowers 的 `systematic-debugging`、Matt 的 `diagnosing-bugs` 都要求先建立能复现问题的反馈环路，再最小化、提出假设、加观测、修复并补回归测试。这类 Skill 能直接减少 Agent 连续试错造成的上下文浪费。

### 第三优先级：Skill 自身的评测与维护

Jesse 的 `writing-skills` 与 Anthropic 的 `skill-creator` 都把测试放进 Skill 生命周期。Anthropic 的公开 `skill-creator` 还包含触发评测、效果评测、重复运行和描述优化。[^15] 对一个已经积累多种知识类 Skill 的仓库，这比继续增加 Skill 数量更有价值。

### 第四优先级：交接与可观测性

Peter 的 `agent-transcript`、`session-viewer`、`handoff`，Matt 和 Compound Engineering 各自的 `handoff`，都说明长任务需要明确的连续性 artifact。好的 handoff 应保存目标、已完成内容、证据、失败尝试、当前风险和下一步，而不是复制整段对话。

### 第五优先级：领域 Skill + 确定性脚本

高手并不只写通用工作流。Peter 的发布、Xcode、浏览器和运维 Skills，Shreya 的 plain writing，Anthropic 的 PDF、DOCX、PPTX、XLSX Skills，都把具体领域知识与脚本、模板、校验器打包。Anthropic 明确说明文档类 Skills 是其产品内部实际使用的实现，而仓库中的其他示例不一定与线上能力完全一致。[^16]

## 对 Edges 的具体建议

Edges 当前已经有三条很强的主线：`edges-memory-*` 负责分层项目记忆，`research` / 文章与论文 Skills 负责信息提炼，`domain-modeling` / `grilling` 负责澄清概念和决策。它与 Compound Engineering 的“经验回流”理念相近，但更强调知识资产，而不是只围绕代码交付。

因此不建议直接安装 gstack、Superpowers 或 Compound Engineering 的完整生命周期包。它们会和现有的记忆入口、研究流程、TDD、规划方式和 Git 约束重叠，并可能产生多个路由器争夺同一任务。

建议按以下顺序补齐：

| 优先级 | 建议 | 参考来源 | 处理方式 |
| --- | --- | --- | --- |
| P0 | `verification-before-completion` 风格的统一证据门 | Superpowers、Peter | 借鉴原则，按 Edges 产物类型重写 |
| P0 | Skill 行为评测工具链 | `writing-skills`、Anthropic `skill-creator` | 先为 2–3 个现有 Skill 建触发/不触发和效果回归用例 |
| P1 | 系统调试 Skill | Superpowers、Matt | 安装一个或合并为一个，不要两套并存 |
| P1 | `behavior-validator` | OpenClaw | 适合有 CLI/MCP/可见行为的 extensions，优先试点 |
| P1 | `handoff` | Peter、Matt、Every | 与项目记忆区分：handoff 管会话连续性，memory 管长期复用结论 |
| P2 | 浏览器真实验证 | gstack、Peter、Every | 只有出现稳定网页工作流时再加，不先装重型浏览器栈 |
| P2 | 发布与 PR babysit | Peter、Every | 等 Edges 形成更频繁的发布节奏后再引入 |

最小可行组合不是 30 个 Skills，而是 5 个：`research`、`grilling/domain-modeling`、`systematic-debugging`、`verification-before-completion`、`edges-memory-remember`。它们分别负责找证据、澄清问题、定位原因、证明结果、沉淀经验，已经构成一个完整闭环。

## 风险与边界

Skill 是 Agent 会信任并可能执行的供应链依赖。Anthropic 明确建议只安装可信来源的 Skill；对低信任来源，应审查其中的指令、依赖、资源、脚本和外部网络连接。[^17] Snyk 在 2026 年 2 月分析 3,984 个公开 Skills，确认 76 个恶意样本，13.4% 至少包含一个 critical 级问题；这组数据覆盖 ClawHub 全量与 skills.sh 的部分热门样本，不能外推为所有市场的统一比例，但足以说明盲装风险。[^18]

实务上应把安装 Skill 当作引入会执行代码的依赖：

1. 固定来源和版本，优先作者本人或官方仓库。
2. 阅读 `SKILL.md`，同时检查 `scripts/`、安装脚本、远程下载和自动更新。
3. 看它会读取什么、写入什么、向哪里联网、怎样处理凭据。
4. 先在低权限、可回滚环境中运行触发/不触发测试。
5. 不因为 star、下载量或“大佬同款”而跳过审计。

## 最终判断

如果只记住一件事：真正的 Agent 高手并没有在收集“万能 Skill”，他们在把自己反复执行、容易出错、必须验证的工作过程写成可触发、可审计、可迭代的程序。

最值得抄的不是某个名字，而是四个结构：

- Peter 的分层真源与真实工具链。
- Jesse 的 Skill 行为 TDD 和强制工程纪律。
- Every 的 Plan → Work → Review → Compound 回流闭环。
- Thariq 的克制：薄 Skill、厚 artifact、只为自己的具体工作流写 Skill。

对 Edges 来说，下一步的 Edge 不在“装更多”，而在“让现有 Skill 有证据地触发、有证据地完成、把失败变成下一次的默认能力”。

## Sources

[^1]: Agent Skills. “[Agent Skills Overview](https://agentskills.io/home)” and “[Specification](https://agentskills.io/specification).” Accessed September 10, 2026.
[^2]: Peter Steinberger. “[Agent Scripts](https://github.com/steipete/agent-scripts).” GitHub, accessed September 10, 2026.
[^3]: OpenClaw. “[OpenClaw Agent Skills](https://github.com/openclaw/agent-skills).” GitHub, accessed September 10, 2026.
[^4]: Jesse Vincent. “[Superpowers: How I'm using coding agents in October 2025](https://blog.fsck.com/2025/10/09/superpowers/).” October 9, 2025.
[^5]: Jesse Vincent / Prime Radiant. “[Superpowers](https://github.com/obra/superpowers)” and “[writing-skills](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md).” GitHub, accessed September 10, 2026.
[^6]: Kieran Klaassen. “[Compound Engineering: How Every Codes With Agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents).” Every.
[^7]: EveryInc. “[Compound Engineering Plugin](https://github.com/EveryInc/compound-engineering-plugin).” GitHub, accessed September 10, 2026.
[^8]: Garry Tan. “[gstack](https://github.com/garrytan/gstack).” GitHub, accessed September 10, 2026.
[^9]: Matt Pocock. “[Skills for Real Engineers](https://github.com/mattpocock/skills)” and “[Engineering skills](https://github.com/mattpocock/skills/tree/main/skills/engineering).” GitHub, accessed September 10, 2026.
[^10]: Shreya Shankar / DocWriter. “[Plain Writing Skill](https://github.com/docwriter-org/plain-writing-skill).” GitHub, accessed September 10, 2026.
[^11]: Anthropic. “[Extend Claude with skills](https://code.claude.com/docs/en/skills).” Claude Code documentation, accessed September 10, 2026. For an explicitly third-party Boris adaptation, see XSkills, “[Parallel Claude Code Workflow Based on Boris Cherny’s Setup](https://xskills.app/skills/bcherny/verification-first-parallel-session-loop).”
[^12]: Carolina Cherry. “[How We Claude Code — Thariq's Workshop Recap](https://howborisusesclaudecode.com/recap).” Notes from Code w/ Claude Extended, May 7, 2026. This is a contemporaneous attendee record, not an official transcript.
[^13]: Simon Willison. “[Claude Skills are awesome, maybe a bigger deal than MCP](https://simonwillison.net/2025/Oct/16/claude-skills/).” October 16, 2025.
[^14]: Andrej Karpathy. “[autoresearch](https://github.com/karpathy/autoresearch).” GitHub, March 2026 onward.
[^15]: Anthropic. “[skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator).” GitHub, accessed September 10, 2026.
[^16]: Anthropic. “[Skills](https://github.com/anthropics/skills).” GitHub, accessed September 10, 2026.
[^17]: Anthropic. “[Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills).” October 16, 2025; updated December 18, 2025.
[^18]: Luca Beurer-Kellner et al., Snyk. “[Exploring the Threat Landscape of Agent Skills](https://research.snyk.io/blog/agent-skills-threat-landscape/).” February 5, 2026.

## 项目记忆使用记录

本次检索了 `.memory/FEEDBACK.md`、`.memory/PROJECT.md`、`.memory/REFERENCE.md`、`.memory/SKILLS.md`、`.memory/AGENT_SKILLS.md` 的索引内容；与本题直接相关并用于对照的是 `.memory/AGENT_SKILLS.md`。项目记忆中没有既有的“Agent 大佬使用哪些 Skills”调研结论。
