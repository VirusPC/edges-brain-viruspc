---
name: reference_oss_frameworks
description: 开源记忆框架的机制细节与源码取证。
metadata:
  edges-title: 开源记忆框架
  edges-type: reference
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-09-06T13:38:39+08:00"
---

# 原始报告 03 — 开源记忆框架的机制细节

- 调研日期：2026-08-25
- 调研范围：mem0、Letta/MemGPT、Zep/Graphiti、Cognee、basic-memory、Memobase、Second Brain 等，侧重可在纯 markdown + rg 条件下复用的机制
- 综合结论见 [`README.md`](../reference_prior_art/INDEX.md)
- 以下为子 agent 原始产出，未做删改。含源码级取证（行号来自调研时的版本，仅供定位）

---

## 一、逐个框架的机制细节

### 1. Letta / MemGPT —— 最值得抄的一家

**核心洞察**：Letta 今年（2026）把整个记忆模型迁到了「记忆即 git 仓库里的 markdown 文件」，和你的方案几乎同构。

**分层**（`MemFS`，[docs.letta.com/concepts/memfs](https://docs.letta.com/concepts/memfs/index.md)）：

- `system/` 目录下的文件 = **常驻**，每一轮都进 system prompt
- 其他所有文件 = **按需**，但**文件树结构始终常驻**（文件名/目录名本身就是索引，这是关键设计）
- 官方原话："The names of files and directories will make it easy to know where to look"

**生命周期**（[context repositories 博客](https://www.letta.com/blog/context-repositories)）：三个明确阶段

- `init`：从 codebase 生成初始记忆（一次性）
- `reflect`：任务后写入新学到的东西
- `defrag`：**周期性重组** —— 官方给的目标是「**15-25 个聚焦文件，而不是 100 个碎片或 5 个巨型文件**」

**defrag 具体做什么**（这是回答你「整合机制」的最实用答案）：

- 合并近义文件（原文举例：`auth-notes.md` + `authentication.md` + `login-flow.md` → 一个 `authentication.md`）
- 删除无引用的孤立文件
- 拆分超大文件
- **修正跨文件矛盾**
- 「持续被证明有用的记忆晋升到常驻层，很少访问的降级」

**遗忘的判据**：`recency`（多久没被访问） + `frequency`（多少任务用到过） + `explicit signals`（用户是否纠正过、任务是否失败过）。**注意这三个都不需要向量**，你的 markdown + git 完全能实现（git log 给 recency，脚本计数给 frequency）。

**冲突处理**：`/doctor` 命令，专门检查「重复、放错位置、system prompt 超预算」。

**worktree 并发整理**：Letta 的 "dreaming" 机制 —— 后台 subagent 在**独立 git worktree** 里整理记忆，完成后 merge 回主分支。这对你「多目录递归记忆」的重组场景直接可用：重组时不阻塞主流程。

**证据强度**：产品实现 + 设计文档，无对照实验。但 MemGPT 论文（[arXiv 2310.08560](https://arxiv.org/abs/2310.08560)）有 DMR 93.4% 的数据。

**可迁移性**：★★★★★ —— 这是你方案的直系先例，`defrag` 的四个动作和三因子遗忘判据可以直接照搬成脚本。

---

### 2. basic-memory —— 唯一一个纯 markdown + 无向量的成熟实现

[GitHub](https://github.com/basicmachines-co/basic-memory)（约 2.4k star）

**存储**：本地 markdown 文件 + SQLite 索引（**索引可从 markdown 完全重建**，markdown 是唯一真相源）。

**关键机制 —— permalink 稳定引用**（[文档](https://docs.basicmemory.com/knowledge-format/)）：

- 每个文件有 frontmatter 里的 `permalink`，从标题生成但**独立于文件名和路径**
- 文件重命名或移动后，permalink 不变，所有指向它的 `[[wikilink]]` 引用不断
- **这直接解决你的「upsert_h2 按标题精确匹配，标题一改就变成新增」问题**：给每个 `##` 条目加一个稳定 id，匹配时优先按 id 而不是按标题文本

**结构约定**（三种语义元素，全在 markdown 里）：

```markdown
- [decision] 采用 X 方案 #architecture
- relates_to [[另一篇笔记]]
```

`[category]` 标注观察类型，`relation_type [[target]]` 建立显式关系。**这是无向量条件下建立条目间关联的可行方式**。

**检索**：`search_notes` 支持关键词 + 布尔（`AND/OR/NOT`）+ frontmatter 过滤 + 时间范围。**纯词法，无 embedding**，正好符合你的约束。

**分层**：目录即分类（`projects/` `areas/` `resources/`，PARA 风格），无常驻/按需之分——所有内容都是按需，因为它是 MCP 工具而不是注入 prompt。

**冲突/过期**：靠 git（推荐 `.basic-memory/` 入 git）+ `edit_note` 增量编辑（append / prepend / find-replace / replace-section），**不整体重写**。

**证据强度**：无评测数据，纯设计主张 + 用户实践。

**可迁移性**：★★★★★ —— permalink 机制是你的方案目前最明显的缺口。它的「observation + relation」双元语法也值得考虑（比纯散文条目更可被 `rg` 精确命中）。

---

### 3. Memobase —— 唯一给出明确数值阈值的框架

[GitHub](https://github.com/memodb-io/memobase)（约 2.7k star）

**结构化 profile**：不是自由文本，而是固定的 `topic/sub_topic` 二级结构（`basic_info/name`、`work/company`、`interest/books`...），[官方 profile 列表](https://docs.memobase.io/features/profile/profile_config)。

**关键：数值阈值触发整合**（[config 文档](https://docs.memobase.io/references/full)）：

| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `max_pre_profile_token_size` | **128** | 单个 profile 槽位超过就触发 re-summary |
| `max_profile_subtopics` | **15** | 某个 topic 下 sub_topic 超过 15 就触发重组 |
| `buffer_flush_interval` | 3600s | 缓冲区多久落盘 |
| `max_chat_blob_buffer_token_size` | 1024 | 缓冲区多大触发处理 |

**这是我找到的唯一一组「条目数/token 数超过 N 就整合」的具体数字**，可以作为你设阈值的起点。

**profile 有效性验证**（[官方博客](https://memobase.io/blog/ai-memory-cost)）：他们做了实验发现「LLM 提取的 profile 有 30-40% 从未被使用」，于是加了 profile validation 机制，只保留被证明有用的槽位。**这佐证了「按使用频率淘汰」是必要的**。

**证据强度**：有 LOCOMO 数据（[benchmark](https://docs.memobase.io/features/profile/profile#benchmark)），但主要是成本/延迟对比。

**可迁移性**：★★★★☆ —— 阈值可直接用；`topic/sub_topic` 的强结构化对你的 `FEEDBACK/PROJECT/REFERENCE` 三分法是个更细的参考。

---

### 4. Zep / Graphiti —— bi-temporal 是核心可迁移点

[Graphiti GitHub](https://github.com/getzep/graphiti)（约 20k star）· [Zep 论文 arXiv 2501.13956](https://arxiv.org/abs/2501.13956)

**双时间模型**（这是全场最重要的单一机制）：每条事实带四个时间戳

- `valid_at` / `invalid_at` —— 事实在**现实世界**中的有效区间
- `created_at` / `expired_at` —— 事实在**系统中**被记录/失效的时间

**冲突处理是「失效而非删除」**（源码 `graphiti_core/utils/maintenance/edge_operations.py:538-573`）：

```
新事实与旧事实矛盾 → 旧边的 invalid_at = 新事实的 valid_at
                    旧边的 expired_at = 当前系统时间
                    旧边保留在图里，标记为已失效
```

**关键点**：日期比较是**纯代码逻辑，不调 LLM**（源码里明确 `# Determine if the new edge should be invalidated by comparing dates`）；只有「是否矛盾」的判断走 LLM。这个分工对你直接可用。

**三层图**：episode（原始）→ semantic entity（实体+事实）→ community（聚类摘要）。community 层是「摘要索引」，但依赖聚类算法。

**证据强度**：★★★★ —— LongMemEval 上准确率提升最高 18.5%、延迟降 90%（论文数据，但厂商自评）。

**可迁移性**：★★★☆☆ —— 图结构不可迁移（依赖图数据库），但 **bi-temporal 记账在纯 markdown 里完全可行**：

```markdown
## 数据中心 Tab 切换必须用 keep-alive
生效: 2026-03-01
失效: 2026-08-20 (被 #路由重构后的缓存策略 取代)
```

`rg` 时过滤掉带「失效」的条目即可。这是你「不丢信息地遗忘」的最佳答案。

---

### 5. mem0 —— extract/update 两阶段，但今年退化成了 ADD-only

[GitHub](https://github.com/mem0ai/mem0)（约 43k star）· [论文 arXiv 2504.19413](https://arxiv.org/abs/2504.19413)

**两阶段架构**：extraction phase（从对话抽候选事实）→ **update phase（对每条候选事实，检索 top-s 相似记忆，让 LLM 决定 `ADD` / `UPDATE` / `DELETE` / `NOOP`）**。

**重要反向证据**（[2026-04 官方博客](https://mem0.ai/blog/ai-memory-benchmarks-in-2026)）：他们的新算法**取消了 UPDATE/DELETE，改成 ADD-only**，理由是「single-pass、更简单」。官方承认代价："knowledge update 类别（93.6）最受影响，因为旧事实被保留、可能与新事实一起浮现"。

**这条对你很关键**：一个投入了大量工程的团队，最终判断「LLM 判定的 UPDATE/DELETE 不值得那个复杂度」。结合 Graphiti 的「失效不删除」，方向指向同一处：**保留旧条目、标记失效，而不是让 LLM 决定删什么**。

**证据强度**：★★★★ LOCOMO/LongMemEval 有数，但厂商自评。

**可迁移性**：★★☆☆☆ —— 依赖向量检索找相似记忆。可迁移的是「extract 和 update 分成两次 LLM 调用」这个流程设计。

---

### 6. Cognee —— 唯一提供「记忆质量评估」工具的

[GitHub](https://github.com/topoteretes/cognee)（约 8.4k star）

**ECL 流水线**（Extract-Cognify-Load）+ **DataPoint 血缘追踪**：每个知识节点记录它来自哪个源文件、哪次处理，可回溯。

**记忆质量评估**（[eval 文档](https://docs.cognee.ai/core-concepts/evaluation-framework)）：内置 `cognee-eval` 框架，指标含 `correctness` / `EM` / `f1` / `context coverage`，支持 HotpotQA、TwoWikiMultihop、Musique。**这是唯一一个把「记忆库质量」做成可量化指标的框架**——对你判断「重组是否改善了检索」有参考价值。

**证据强度**：★★★☆ 有 eval 框架，但公开的对照数据少。

**可迁移性**：★★☆☆☆ —— 依赖图+向量。可迁移的是「血缘追踪」（每条记忆记来源）和「用固定问题集回归测试记忆库质量」的思路。

---

### 7. Second Brain / PKM 方法论 —— 提供了分类学，但缺机制

**PARA**（Projects / Areas / Resources / Archives，[fortelabs.com/blog/para](https://fortelabs.com/blog/para/)）：**按可操作性分类，而非按主题**。核心洞察是"actionability"——Projects 有截止日期、Areas 是持续责任、Resources 是参考、Archives 是不活跃的。

**对你的映射**：

- `FEEDBACK.md` ≈ Areas（持续生效的约束）
- `PROJECT.md` ≈ Projects（进行中的工作）
- `REFERENCE.md` ≈ Resources
- **你缺 Archives** —— PARA 的关键设计是「不删除，移到 Archives」，与 Graphiti 的「失效不删除」殊途同归

**CODE**（Capture-Organize-Distill-Express）：**Progressive Summarization** —— 分层加粗/高亮，第一遍读全文、第二遍加粗关键句、第三遍高亮核心。**这是「不丢信息地压缩」的人类方案**：原文永远在，只是加了可跳读的层。对你的 `## 条目` 可直接用：条目正文保留细节，第一行是可被索引提取的一句话概括。

**Zettelkasten**：原子笔记 + 显式链接 + 唯一 id（basic-memory 的 permalink 就来自这里）。**MOC（Map of Content）** 概念对你的索引设计最相关——手动维护的「主题地图」文件，只列链接和一句说明，本身不含内容。这正是 `AGENTS.md` 索引块的角色。

**证据强度**：★☆☆☆☆ 全是经验方法论，无量化数据。

**可迁移性**：★★★☆☆ —— Archives 概念和 Progressive Summarization 可直接用。

---

### 8. 其他扫过但价值较低的

- **LangGraph/LangMem**：提供 `store` API 和 `create_memory_store_manager`，但机制上是「让 LLM 决定增删改」，与 mem0 同构，且强依赖向量。可迁移点：明确区分 semantic/episodic/procedural 三类记忆，procedural 记忆用「反思后重写 prompt」实现。
- **A-MEM**（[arXiv 2502.12110](https://arxiv.org/abs/2502.12110)）：Zettelkasten 式自动链接，新记忆写入时会**反向更新旧记忆的属性**（memory evolution）。机制依赖 ChromaDB 相似度，不可迁移，但「写入时回改旧条目」这个动作值得注意。
- **MIRIX**：多 agent 六类记忆（core/episodic/semantic/procedural/resource/vault），"Meta Memory Manager" 协调。分类学可参考，实现太重。
- **Supermemory / Papr / Zep 商业版**：闭源，只有 benchmark 数字。

---

## 二、直接回答你的五个问题

### Q1：索引粒度 —— 有几个可用数字，但没有严格实验

**能用的数字**：

- Memobase：单槽位 **128 token** 触发 re-summary，单 topic **15 个 sub_topic** 触发重组
- Letta：目标态是 **15-25 个聚焦文件**（明确反对「100 个碎片」和「5 个巨文件」）
- Claude Code Skills（Anthropic 官方）：**渐进式披露三层** —— L1 只有 `name`+`description`（约 100 token 常驻）→ L2 `SKILL.md` 正文（建议 <5k token）→ L3 引用的额外文件（按需）

**对你的直接建议**：Letta 的 15-25 文件是当前最可信的目标态。你的「文件级索引 + 条目级 upsert」是对的，但当单文件条目数超过某个量（参考 Memobase 的 15）时，索引行的信息量不足以路由 —— 此时应该**拆文件**，而不是给索引加细节。

**没人做过的**：文件级索引 vs 条目级索引的对照实验。这是真空。

### Q2：常驻 vs 按需 —— Letta 的路径约定 + Anthropic 的三层是最佳答案

**Letta**：`system/` 目录 = 常驻，其余按需，**但文件树结构始终常驻**。后者是关键——目录名和文件名本身就是零成本索引。

**Anthropic Skills**：`name` + `description`（~100 token）常驻，正文按需。

**Letta 的晋升/降级判据**：「持续被证明有用的记忆晋升到常驻层，很少访问的降级」。

**对你的建议**：你的 `AGENTS.md` 索引块 = 常驻层，`.edges/*.md` = 按需层，这个划分正确。缺的是**晋升/降级机制** —— 某条约束被反复命中，应该考虑把它的一句话摘要提升进索引行本身。

### Q3：整合机制 —— Letta 的 defrag 是唯一完整方案

四个动作（合并近义 / 删孤立 / 拆超大 / 修矛盾）+ 三因子判据（recency / frequency / explicit signals）。

**触发时机**：Letta 是「周期性 + 任务后」；Memobase 是「超阈值即触发」。Memobase 的阈值触发更适合你（脚本可判定，无需人工介入）。

**"不丢信息地合并"的两个答案**：

1. Graphiti 式：不合并，只标记失效（旧内容留在文件里）
2. Progressive Summarization 式：合并时保留原文层，只在顶部加概括

### Q4：过期与冲突 —— bi-temporal 是最成熟方案，且可在 markdown 实现

Graphiti 的四时间戳 + 「失效而非删除」+ 「日期比较用纯代码、矛盾判断用 LLM」的分工。

**mem0 的反向证据**很重要：他们放弃了 LLM 判定的 UPDATE/DELETE。**结论：不要让 LLM 决定删什么，只让它判断「这两条是否矛盾」，然后用确定性规则标记失效。**

**代码变更导致记忆过期** —— 这块所有框架都没解决。Cognee 的血缘追踪（记忆记录来源文件）是唯一沾边的机制：如果能记下「这条约束来自哪个文件的哪次修改」，就能在该文件大改时标记「待复核」。

### Q5：多层级作用域 —— 只有 Claude Code 的实践，无框架支持

Claude Code 的 `CLAUDE.md` 嵌套（父目录常驻、子目录读到该子树文件时加载）是唯一先例，你已经在用。

Letta 的目录树常驻思路可以借：**根 `AGENTS.md` 的子目录索引块，本质上就是「文件树常驻」的一种压缩表示**。

没有框架处理「同一主题在多层级都有记忆时如何合并」。这块你需要自己定规则（建议：子目录的条目视为对父目录条目的**特化**而非**覆盖**，冲突时子目录优先并在索引里标注）。

---

## 三、三个最值得抄的具体做法

### ① 给每个 `##` 条目加稳定 id（抄 basic-memory 的 permalink）

**为什么**：你现在按 H2 标题精确匹配做 upsert，标题一改就变成新增条目，静默产生重复。permalink 机制让引用在重命名/移动后依然有效。

**怎么做**：

```markdown
## 数据中心 Tab 切换必须用 keep-alive
id: dc-tab-keepalive
```

脚本 upsert 时优先按 `id:` 匹配，回退到标题匹配。id 由脚本首次写入时生成（标题 slug 化），之后不变。这样标题可以自由改写而不破坏 upsert 的幂等性，也让跨文件引用（`见 dc-tab-keepalive`）成为可能。

### ② bi-temporal 失效标记，不删除（抄 Graphiti）

**为什么**：这是「不丢信息地遗忘」和「处理冲突」的同一个答案。mem0 放弃 LLM 删除、PARA 的 Archives、Graphiti 的 invalid_at，三条独立路线都收敛到这里。

**怎么做**：

```markdown
## 收入数据接口用 /api/sns/v1/note/income
生效: 2026-03-01
失效: 2026-08-20 → 被 income-api-v2 取代
```

- 脚本发现新条目与旧条目矛盾时（矛盾判断可以让 agent 做，也可以在 `remember` 时由用户指明），**给旧条目加「失效」行**，新条目追加在后面
- `search` 时默认过滤掉带「失效」的条目，加 `--include-expired` 才显示
- 关键分工（Graphiti 源码验证）：**日期比较是纯代码，只让 LLM 判「是否矛盾」**

### ③ 阈值触发的 defrag，四个固定动作（抄 Letta + Memobase 的阈值）

**为什么**：Letta 的 defrag 是唯一完整的整合方案；Memobase 的数值阈值让它可脚本化。

**怎么做**：在 `memory.py` 里加一个 `doctor` 子命令，检查并报告：

1. **单文件条目数 > 15**（Memobase 阈值）→ 建议拆分，并给出按关键词聚类的拆分方案
2. **孤立条目**：条目里的关键词在整个仓库（代码 + 其他记忆）里 `rg` 不到任何命中 → 候选删除（对应 Letta 的「删无引用的」）
3. **跨文件矛盾**：同一 id 或高度相似标题出现在多个文件 → 报告让人裁决
4. **索引超预算**：`AGENTS.md` 索引块超过 N 行（参考 Anthropic 的 ~100 token/条）→ 强制重组

配套 Letta 的三因子做遗忘判据，全部可从 git 和脚本计数拿到：`recency` = `git log -1 --format=%ci` 该条目所在文件的最后修改；`frequency` = 在条目里维护一个 `hits:` 计数，`ask` 命中时 +1；`explicit signals` = 用户明确说过「这条不对」时打标记。

**重要的一条负面经验**：Letta 建议 defrag 在**独立 git worktree** 里跑，完成后 merge。你的场景里对应的是：`doctor --fix` 不要直接改文件，先输出 patch 让人 review。
