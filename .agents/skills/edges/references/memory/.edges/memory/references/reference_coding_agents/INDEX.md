---
name: reference_coding_agents
description: 各家编码 agent / AI IDE 的记忆与 AGENTS.md 实践。
metadata:
  edges-title: 编码 agent 的工程实践
  edges-type: reference
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-09-06T13:38:38+08:00"
---

# 原始报告 02 — 编码 agent / AI IDE 的工程实践

- 调研日期：2026-08-25
- 调研范围：Claude Code、Cursor、Windsurf、Cline、Aider、Continue、Zed、Copilot、Amp、OpenHands 等已发货产品的记忆机制
- 综合结论见 [`README.md`](../reference_prior_art/INDEX.md)
- 以下为子 agent 原始产出，未做删改

---

## 一、Claude Code：现在有两套并存的机制

### 1.1 `CLAUDE.md` / `AGENTS.md` —— 常驻，无条件全量注入

- **触发时机**：会话启动时读取，`AGENTS.md` 与 `CLAUDE.md` 都支持，`CLAUDE.md` 优先。分四级作用域：企业级 → 项目级（`./CLAUDE.md`，入 git）→ 项目本地（`./CLAUDE.local.md`，已废弃）→ 用户级（`~/.claude/CLAUDE.md`）。
- **子目录记忆是「按需」的**：官方原话是子树里的 `CLAUDE.md` "not at launch, but when Claude reads files in those subtrees"。**这条对你的多层级作用域设计是直接可用的先例**——父目录常驻、子目录懒加载，触发条件是「读到该子树的文件」而不是「任务提到该模块」。
- **`@path/to/file` import**：递归展开，最多 5 跳，作用域包含 `~/`。这是 Claude Code 唯一的显式按需加载语法。
- **规模建议**：官方给的是 200 行以内、越简洁越好，理由是每 token 都在与实际任务竞争预算。这是软建议，无强制。
- **`#` 快捷写入**：会话中输入 `#` 开头的内容即追加进记忆文件，Claude Code 自己判断放哪一级。

### 1.2 Memory tool（2025-08 起）—— `/memories` 目录 + 独立 `MEMORY.md` 索引

这套是新增的、与 `CLAUDE.md` 并行的机制，**它的索引设计正是你在问的那个问题**：

- **存储**：客户端持有的 `/memories` 目录，服务端不落盘；工具原语是 `view / create / str_replace / insert / delete / rename`。
- **索引文件叫 `MEMORY.md`**，位于 `/memories` 根，**每次会话开始只自动读这一个文件**，其余文件按需读取。
- **硬性上限**：`MEMORY.md` **200 行 / 25 KB**，超出部分**静默丢弃**（"remaining lines are silently discarded"）。**这是唯一一个我找到的、官方明文规定的索引 token 预算**。
- **官方给的索引组织范式**（直接摘自文档示例）：

```markdown
# Memory Directory
- `progress.md`: Current task status and completed steps
- `notes.md`: Key findings and observations
- `context.md`: Important background information
```

  即「文件名 + 一句职责说明」，**与你当前 `AGENTS.md` 索引块的做法完全一致**。
- **官方明确的拆分触发点**：`MEMORY.md` **接近 200 行就应提示模型重新组织**——把细节挪进独立文件，`MEMORY.md` 只留摘要与指针。
- **反向证据**：官方同时提供 `clear_tool_uses_20250919`（上下文自动压缩，只清工具结果不清对话），并有实测数据：100 轮工具调用任务上，仅上下文编辑 +29%，加记忆工具 +39%，token 消耗 -84%。

## 二、Cursor：**原生 Memories 已被移除**

- 早期做法（v1.0，2025-06）：项目级记忆，"generated from conversations"，需要用户批准；底层是 `.cursor/rules` 里的 `.mdc` 文件，用 Semantic Search 检索。
- **当前状态：v2.1.17 changelog 明确 "Removed native Memories in favor of using Rules"，官方给出迁移路径——把 memory 导出成 `.mdc` 文件转成 Rules。**
- 现存机制是 Rules：`AGENTS.md`（简单场景）+ `.cursor/rules/*.mdc`（四种加载模式：Always / Auto Attached by glob / Agent Requested by description / Manual `@rule`）。官方建议单条 rule **500 行以内**、拆成多条可组合的 rule。
- **对你最直接的一条**：`Agent Requested` 模式要求 rule 必须写 description，agent 读 description 决定是否加载——这就是「description 作为索引行」的产品化实现，而且 Cursor 用它替换掉了自动记忆。

## 三、Windsurf：Memories 只保留在 legacy agent

- 官方文档明确 "Memories are only applicable to the legacy agent"，新 agent（默认）不持久化，只有 Rules 与 Workflows。
- legacy 时期的机制：`.windsurf/rules/`（`always_on` / `manual` / `model_decision` / `glob` 四种激活模式），**单文件 6000 字符上限、全局+workspace 合计 12000 字符上限**，超出静默截断。auto-generated memories 由 agent 自行生成检索，不占 credit。
- **官方对 memory 的定位建议**：文档主动建议把 memory 改写成 Rule 或 `AGENTS.md` 条目。这与 Cursor 是同一个方向。

## 四、Cline：Memory Bank —— 唯一有完整层级设计的方案

这套是社区起源、被官方文档收录的 prompt 级方案，**它的层级图对你的问题 1 和 5 最有参考价值**。

- **六个固定文件 + 显式依赖 DAG**：

```
projectbrief.md  ─┬→ productContext.md   ─┐
                  ├→ systemPatterns.md   ─┼→ activeContext.md → progress.md
                  └→ techContext.md      ─┘
```

  即三个「静态基座」→ 一个「当前焦点」→ 一个「状态快照」，`projectbrief.md` 是所有其他文件的根。
- **加载策略是全量**：官方原话 "MUST read ALL memory bank files at the start of EVERY task – this is not optional"。**这是与 Claude Code `MEMORY.md` 索引模式相反的一极**——Cline 选择「文件数固定、每个都读」，而 Claude Code 选择「索引一个、其余按需」。
- **更新触发**：四个条件——发现新模式 / 完成重大变更 / 用户显式说 "update memory bank"（此时**必须复查全部六个文件**）/ 上下文需要澄清。
- **注意**：Cline 官方文档已把 Memory Bank 标为可选，主推 Rules + Workflows；Memory Bank 仍在文档里但定位是"advanced"。

## 五、Zed：Rules Library + Skills 的双层拆分

- **Rules Library**（原 Prompt Library）：可复用的 rule 集合，可设一条 default rule 全局注入；`.rules` 文件（兼容 `AGENTS.md`、`CLAUDE.md`、`.cursorrules` 等多种名字）项目级自动加载。
- **Skills（v0.208.0，2026-01 起）**：**这是 Zed 明确的「常驻 vs 按需」拆分**——`~/.config/zed/skills/` 或 `.zed/skills/`，每个 skill 一个目录含 `SKILL.md`（YAML frontmatter 的 `name` + `description`）。官方原话："Instructions are always in context. Skills are loaded on demand."
- **迁移建议**：官方建议把原本 always-on 的 rules 迁进 `AGENTS.md`，把条件性的知识做成 skill。

## 六、GitHub Copilot：唯一公开了「过期检测」机制的产品

[官方工程博客](https://github.blog/ai-and-ml/github-copilot/building-an-agentic-memory-system-for-github-copilot/)（2026-01-30），**这篇对你的问题 3 和 4 是最有价值的单一来源**：

- **存储**：结构化数据库（不是文件），字段含 `title / body / repository / user / citations / created_at / last_used_at`。带 embedding，但检索是**混合**：语义 + 关键词 + 结构化过滤。
- **写入是被动的**：从 PR review comment、agent 会话中的用户纠正提取；一个 LLM 判断值不值得存，另一个 LLM 校验存下来的东西是否准确。
- **过期处理有三层，全部可迁移到文件系统**：
  1. **每条记忆带 citation 指向具体代码位置**，读时校验是否仍然成立。
  2. 冲突时不覆盖，**写一条更正版本**（"generating a corrected version rather than deleting the original"）。
  3. **28 天未被使用（`last_used_at`）即自动删除**。
- **他们明确放弃的东西**：原计划做离线去重/整理服务，**最终判定不值得**——理由是规模化下成本高、且读取时仍需对账，改为依赖读时的相关性判断 + 时间淘汰。**这条负面结论对你的「整合与遗忘」设计是强信号**。
- 官方明确"currently no way to view or edit"，与你的「人可 review」目标相反。

## 七、Amp（Sourcegraph）：把 `AGENTS.md` 用到极致的一家

- 只用 `AGENTS.md`（`AGENT.md` 亦可），**不做自动记忆**。
- **官方原话**：`AGENTS.md` 是唯一每次都进上下文的文件，因此要"aggressively minimal"，"generic advice is noise"。
- **多层级的实际做法**：Amp 自己的仓库有 **41 个 `AGENTS.md`**，根文件的职责是"telling the agent which other `AGENTS.md` files to look at"，即**根文件就是子目录索引**。这与你的 `edges-descendants` 区块完全同构，且是被真实规模验证过的。
- 官方明确劝退单文件塞满：一个文件里包含 12 个不同 workflow → 每次都注入 → 建议拆成 subagent / skill。
- 有 `/handoff` 命令做会话交接（把状态写成结构化摘要传给下一个线程），但**不写盘、不持久化**。

## 八、其余产品的补充点

- **Aider**：`CONVENTIONS.md` + `--read` 只读注入；repo map 用**图算法（PageRank on symbol references）**动态排序、只放最相关部分，默认 1k token 预算，可 `--map-tokens` 调；`/add` 手动指定文件。**它的"按 token 预算动态裁剪索引"是唯一一个把索引本身当作可裁剪对象的实现**。
- **Continue**：Rules（`.continue/rules/`，`alwaysApply: true/false` + `globs` + `description`）；无自动记忆，官方推荐用外部 MCP（提到 Mem0）。文档明确"Currently, if a rule's globs match ANY file in context, that rule applies to the entire conversation"，这是 glob 型加载的已知粗粒度问题。
- **OpenHands**：`.openhands/microagents/`——**keyword-triggered microagents**（frontmatter 里写 `triggers: [kubernetes, k8s]`，命中关键词才注入该 markdown 的内容）+ repo-wide 常驻的 `repo.md`。**这是我找到的唯一一个基于显式关键词触发、而非语义相似度触发的按需加载实现，且不需要向量库——与你的 `rg` 约束完全兼容。**
- **Roo Code**：`.roo/rules/` 目录式规则，按文件名字母序加载，目录优先于单文件；Memory Bank 是社区移植的 Cline 方案。
- **Kilo Code**：`.kilocode/rules/memory-bank/`，五个文件（brief / product / context / architecture / tech），**明确要求 `context.md` 保持 100 行以内**，且**"only rewrite sections that changed"**——增量更新而非整体重写。
- **Codex CLI**：只有 `AGENTS.md`（`~/.codex/AGENTS.md` 全局 + 项目 + 子目录），无自动记忆。
- **Gemini CLI**：`GEMINI.md` 分层（全局/项目/子目录），支持 `@file.md` import；有 `/memory show|add|refresh` 命令与 `save_memory` 工具，写入全局 `~/.gemini/GEMINI.md` 的 "## Gemini Added Memories" 区块。
- **Claude Code Agent Skills**：三级渐进披露——L1 只有 `name`+`description` 常驻（**约 100 token**），L2 完整 `SKILL.md`（**建议 500 行以内**）按需读，L3 打包资源文件按需读。**官方明确说这是"progressive disclosure"、"unbounded"。这是最成体系的常驻/按需分层规范。**

## 九、直接回答你的五个问题

### 1. 索引粒度与检索精度：产品级实测数据几乎没有，但有明确收敛的工程惯例

没有任何一家公布过「索引粒度 vs 检索精度」的量化对照。但有三个可用的硬数字和一个明确的行业共识：

- **硬上限**：Claude Code `MEMORY.md` = 200 行 / 25 KB（超出静默丢弃）；Windsurf rules = 6k 字符/文件、12k 总量；Aider repo map = 1k token 默认预算。
- **软建议**：`CLAUDE.md` 200 行；Cursor rule 500 行；Skill `SKILL.md` 500 行；Kilo Code `context.md` 100 行。
- **共识**：索引行 = 「文件名 + 一句职责描述」。Claude Code `MEMORY.md`、Cursor `Agent Requested` rule 的 description、Skills 的 frontmatter description、OpenHands microagent 的 description，四家形式完全一致。
- **拆分触发点**：Claude Code 是唯一给出明文规则的——**`MEMORY.md` 接近 200 行就重组，把细节下沉到子文件、索引只留摘要与指针**。

**你的方案与之的偏差**：你现在是「聚合文件 + 文件级索引」。Claude Code 的 `MEMORY.md` 也是文件级索引，但它管的是**一个平坦的 `/memories` 目录里的许多小文件**，所以文件级索引天然就是条目级索引。而你把多条 `## 条目` 聚合进 `FEEDBACK.md` 这类文件，索引却停在文件级——**这一层落差是行业里没人这么做的部分**。行业主流是「一个知识单元一个文件」（Skills、OpenHands microagents、Cursor rules、Continue rules 都是），从而绕开了「条目级索引」这个问题。

### 2. 常驻 vs 按需的判据

四家给出了几乎相同的判据，可以直接抄：

| 常驻 | 按需 |
| --- | --- |
| 每次任务都需要的（Amp: "aggressively minimal"） | 只在特定条件下需要的 |
| 项目级、跨模块的约束 | 模块级、局部的知识 |
| Zed: "Instructions" | Zed: "Skills" |
| Claude Code: `CLAUDE.md` + `MEMORY.md` | 子目录 `CLAUDE.md`、`@import`、`/memories/*.md` |
| Cursor: `alwaysApply` rule | `Agent Requested` / glob rule |

**触发机制上有三种流派，按对你的适用度排序**：

1. **关键词触发**（OpenHands microagents）——frontmatter 写 `triggers: [...]`，命中才注入。**无向量依赖，与 `rg` 天然契合，是你最该抄的一个。**
2. **glob / 文件路径触发**（Cursor、Continue、Windsurf、Claude Code 子目录）——读到某路径下的文件就加载对应记忆。也无向量依赖。Continue 官方承认它粒度过粗（匹配任一文件就整会话生效）。
3. **description 语义判断**（Skills、Cursor Agent Requested、Claude Code `MEMORY.md`）——模型读 description 自己决定。这也不需要向量库，只需要 description 常驻。

### 3. 整合与遗忘：唯一的产品级结论是负面的

**GitHub Copilot 明确放弃了离线去重/整理服务**，理由是规模化下成本高、且读时仍要对账。他们的替代方案是「读时相关性判断 + 28 天未使用自动删除」。

有增量更新纪律的只有 Kilo Code（"only rewrite sections that changed"）和 Claude Code memory tool 的 `str_replace` 原语。没有任何一家公开「合并近义条目」的算法。

### 4. 过期与冲突：只有 Copilot 给出了完整答案

三个机制，全部可在文件系统里实现：

- **citation 校验**：每条记忆记下它依据的代码位置，读时验证是否仍成立。
- **不覆盖、写更正版本**：保留原始记忆，追加一条 corrected version。
- **`last_used_at` + 28 天 TTL**。

其余产品对「记忆与代码状态不一致」这个问题没有任何机制——Cursor 和 Windsurf 的答案是直接**移除自动记忆**、改用人写的 Rules。

### 5. 多层级作用域：这块行业实践很成熟，你的方向是对的

- **Claude Code**：子目录 `CLAUDE.md` 在「读到该子树文件」时才加载，而非启动时。这个触发条件比「任务提到该模块」更机械、更可靠。
- **Amp**：41 个 `AGENTS.md`，根文件的唯一职责就是索引其他 `AGENTS.md`。这是你的 `edges-descendants` 区块的规模化验证。
- **Codex / Gemini CLI**：都是全局 → 项目 → 子目录三级，逐级覆盖。
- **Roo Code**：目录式规则优先于单文件规则。

---

## 三个最值得直接抄的做法

### ① OpenHands 的 keyword-triggered microagent（解决你的按需加载，零向量依赖）

在每个 `.edges/*.md` 的开头加 frontmatter 式的触发词声明，而不只是一句描述：

```markdown
---
triggers: [数据中心, DataCenter, 收入数据, 粉丝数据]
---
```

然后索引区块列出的是「文件 + 触发词」而不只是「文件 + 描述」。这样 `rg` 检索前先做一次机械的关键词匹配来决定读哪些文件，比让 agent 读描述自己判断更确定。这是唯一一个在无向量条件下工作、且已被产品验证的按需加载机制。

### ② Claude Code `MEMORY.md` 的硬预算 + 明文拆分规则（解决你的索引粒度）

给 `AGENTS.md` 的受管索引区块设一个**硬性行数/字节上限**（Claude Code 用 200 行 / 25 KB），并在脚本里实现「接近上限就报警要求拆分」。关键是配套那条重组规则：**索引只留摘要和指针，细节必须下沉到独立文件**。

对你的具体含义：当 `FEEDBACK.md` 里的 `## 条目` 多到文件级描述不足以路由时，正确的动作不是给索引加条目级细节（那会撑爆索引预算），而是**把 `FEEDBACK.md` 拆成多个更窄的文件，让文件级索引重新变得有信息量**。这是 Claude Code 和整个行业（一个知识单元一个文件）共同的答案。

### ③ Copilot 的 citation + 读时校验（解决你的过期检测）

每条 `## 条目` 里记一行它依据的代码位置（文件路径 + 符号名，不记行号，因为行号会漂）。`edges-memory-ask` 的流程里加一步：读到条目后先确认 citation 指向的位置还存在、内容还符合，不符合就提示用户这条记忆可能已过期。配合 Copilot 的第二条——**冲突时不删除原条目，追加一条更正版本**——就得到了一个人可 review、git 可追溯的过期处理链路。同时不要建离线整理服务，Copilot 已经验证过那不值得。
