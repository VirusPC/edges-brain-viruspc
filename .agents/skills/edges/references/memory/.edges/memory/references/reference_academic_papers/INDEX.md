---
name: reference_academic_papers
description: 记忆索引粒度、膨胀与检索的论文证据。
metadata:
  edges-title: 学术论文与 benchmark
  edges-type: reference
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-09-06T13:38:38+08:00"
---

# 原始报告 01 — 学术论文与 benchmark

- 调研日期：2026-08-25
- 调研范围：LLM agent 长期记忆的学术工作，侧重「以文件/文档为存储载体」而非纯向量库
- 综合结论见 [`README.md`](../reference_prior_art/INDEX.md)
- 以下为子 agent 原始产出，未做删改

---

## 核心发现（12 条）

### 1. 「文件系统即记忆」已有第一份系统性实测，结论对你不太友好但很重要

[Filesystem-Based Memory for LLM Agents: Organization, Evolution, and Sustainability (arXiv 2607.26637)](https://arxiv.org/abs/2607.26637)

**机制**：把记忆定义为一棵 agent 自己用通用文件工具（`view / create / str_replace / insert / delete / rename / grep`）读写重组的 markdown 目录树，拆成三个角色——management agent 负责整合组织、search agent 负责带引用地回答、execution agent 提供轨迹并蒸馏成 skill；然后系统性地变化「记忆形状」（agent 组织的层级 / 逐字 dump / chunk 检索）、规模、工具集和模型强度。

**证据**：有实测，跨 LoCoMo、PersonaMem、REALTALK 和具身任务。关键数字：组织化**只买到检索成本**——在原始材料大的 PersonaMem 上，重组/精选后的库把逐字 dump 的每查询检索价格砍掉一半以上（32k：1.4 分 vs 4.0 分；128k：1.6 分 vs 3.9 分）；但在较小的对话 benchmark 上（约 102KB）两者几乎持平（2.1–2.5 分）。机制是「多轮少读」：结构化库多花 7–9 次工具调用（dump 只要 4–5 次），但每次定向读取的 token 少得多。而**没有任何一个 agent 把「组织本身」转化成更好的答案**。

**可迁移性**：直接可用，且是对你当前设计最强的支撑与最强的警告。支撑：他们的参考实现就是「YAML frontmatter（`name` + `description`）+ 正文 markdown + grep」，grep 会同时命中 frontmatter 行，这与你的「AGENTS.md 索引 + `.edges/` markdown + rg」几乎同构。警告：如果你指望加索引层级来提升「答对率」，实测说不会；索引的真实回报是**省 token / 省轮次**，条目越多、原始材料越大，回报越明显。所以索引设计的目标函数应该定成「最小化读进上下文的字节数」，而不是「提升召回」。

### 2. 同一篇论文的可持续性部分：结构会腐化，而工具集比模型更能决定库的形状

**机制**：140 任务的增长研究，跟踪「早期记忆是否存活」「更新是否落到正确位置」「是否仍遵守 taxonomy 契约」。

**证据**：有实测。三个结论对你直接相关：

- **文件早创建、之后只编辑**：LoCoMo 上 3 次创建 + 226 次编辑，PersonaMem 128k 上 2 次创建 + 283 次编辑。早期文件不是「幸存」，它们**就是**这个库。你的「三类聚合文件 + 按主题单文件」的固定骨架，恰好是这个自然收敛形态。
- **taxonomy 遵守度随增长而侵蚀**，只有最强的 management agent 能维持不变。也就是说「让 agent 自觉遵守目录约定」在长程上必然退化，必须有外部检查。
- **工具集单独就能把库的形状改变两个数量级**：同样的模型、同样的内容，`Center+BM25` 工具集产出 2 个文件，`Shell` 工具集产出 147 个文件；LoCoMo 上同配置两次构建分别产出 2 个和 29 个文件。**改工具描述 = 改架构**。
- 更精细：更强的 management agent 只是造出更精巧的库，不是更有用的库——它建出的 105 文件 / 233 指针的结构被最强 search agent 读得最差（71.4），而 nano 建的「散摊子」读得最好（83.3）。而合并成两个文件的库把强 search agent 的每查询价格几乎砍半（10.0 vs 18.5 分），正确率统计上接近（81.0 vs 83.3）。

**可迁移性**：直接可用。落地含义是：(a) 你的 Python 脚本（确定性 upsert）比让 agent 自由重组更可靠，这是对的方向；(b) 想控制记忆库形状，改的是**写入工具/脚本的接口和它的文档措辞**，而不是换模型；(c) 需要一个周期性的、脚本化的结构体检，因为 taxonomy 侵蚀是被实测到的必然现象。

### 3. 索引粒度：目前唯一的量化答案来自 LongMemEval，而且是「中间粒度最优」

[LongMemEval (arXiv 2410.10813, ICLR 2025)](https://arxiv.org/abs/2410.10813) · [GitHub](https://github.com/xiaowu0162/LongMemEval)

**机制**：把长期记忆拆成 indexing / retrieval / reading 三段，分别做消融。索引侧提出两个可迁移的手段：**session decomposition**（存储单元粒度）和 **fact-augmented key expansion**（从正文抽取摘要、关键词、用户事实、带时间戳的事件，作为「键」去扩充索引，而正文仍是「值」）。

**证据**：有实测，500 道人工校对题。关键结论：

- **粒度**：round（单轮）是最好的存储粒度，优于 session；**再往下压缩成单条用户事实反而伤害整体表现**（信息损失），只在 multi-session reasoning 这一类上有改善。这是你要的「索引粒度 vs 检索精度」实测曲线——它是倒 U 形，不是单调的。
- **key expansion**：平均检索指标 +4%、最终准确率 +5%；用「抽取出的用户事实」做 key 最稳定，摘要和关键词只在部分设置下有效。
- **时间感知的查询扩展**：round 粒度下召回 +11.4%，session 粒度下 +6.7%。
- 基线难度：从 oracle 检索退化到读全量 115k token 历史，长上下文模型掉 30%–60%。

**可迁移性**：**这是对你问题 1 最直接可用的一条，而且不需要向量库**。key expansion 的本质是「让索引行携带正文里的可 grep 的词」，与 embedding 无关。落地就是：索引不要写「这个文件讲什么」，而要写「这个文件里出现的专有名词、API 名、错误码、组件名、决策关键词」。倒 U 形结论也直接告诉你：不要把 `## 标题` 条目再拆得更细（会丢信息），也不要把索引停在文件级（太粗）——中间那一层是「条目标题级」。

### 4. ACE：整块重写会「上下文坍缩」，条目化 + 确定性合并是解药

[Agentic Context Engineering (arXiv 2510.04618)](https://arxiv.org/abs/2510.04618) · [代码](https://github.com/ace-agent/ace)

**机制**：把上下文当成不断演化的 playbook，而不是一段会被反复重写的 prompt。核心三点：(1) 结构化条目——每条带唯一 ID、`helpful=X harmful=Y` 计数器和内容；(2) **增量 delta 更新**，模型只产出「新增条目 / 局部修改」，由**非 LLM 的确定性逻辑做合并**；(3) grow-and-refine，定期去重与剪枝。

**证据**：有实测。观测到 context collapse 的具体现象：一次整体重写把上下文从 18,282 token 塌成 122 token，性能骤降。ACE 在 agent 任务上 +10.6%（AppWorld 上以更小的开源模型追平榜首生产级 agent，在更难的 test-challenge 分割上超过它），金融任务 +8.6%，适配延迟降低 86.9%。

**可迁移性**：**极高，而且验证了你已有的设计**。你的「Python 脚本按 `## 标题` 精确匹配做原子 upsert」正是 ACE 的「确定性合并 + 增量 delta」，理论上免疫 context collapse。你还缺的是 ACE 的第二半：**每条记忆的使用计数**。ACE 的 `helpful/harmful` 计数器是纯文本可存的（写在标题行或 frontmatter 里），不需要任何向量设施，而它正是问题 3「不丢信息地遗忘」的无向量实现路径。

### 5. Letta MemFS：git 版本化的分层文件记忆，与你的约束几乎完全一致

[MemFS 文档](https://docs.letta.com/concepts/memfs/index.md) · [Context Repositories 博客](https://www.letta.com/blog/context-repositories) · 源头是 [MemGPT (arXiv 2310.08560)](https://arxiv.org/abs/2310.08560)

**机制**：agent 的长期记忆就是一个 **git 仓库**，投影成本地真实 checkout，用普通文件工具读写；每次编辑都产生 commit。分层规则极其干脆：**`system/` 下的文件每轮都进系统提示；`system/` 之外的文件默认不进上下文，但「文件树本身」永远在系统提示里，目录名和文件名就是路标**。另有 `/doctor` 命令审计放置错误、重复和系统提示 token 占用；`/remember` 让 agent 自己决定这条知识该落在哪；「dreaming」用后台 subagent 在 **git worktree** 里并发整理记忆再合并。

**证据**：**仅为设计主张 + 产品实现，没有公开的对照评测**。其祖先 MemGPT 在 DMR 上有数据（93.4%，后被 Zep 的 94.8% 超过）。

**可迁移性**：这是你这套系统最接近的工业先例，可以直接照抄三个具体决策：(1) **用路径本身编码「常驻 vs 按需」**，而不是靠 agent 判断；(2) **文件树常驻**——目录名/文件名承担索引职责，这比一行行的文件描述更省 token 且天然随重命名同步；(3) **`doctor` 式审计命令**，把「重复 / 放错位置 / 索引超预算」做成可执行检查而不是提示词里的叮嘱。git worktree 并发写记忆的思路对你「多目录递归、多 agent 同时沉淀」也直接可用。

### 6. Anthropic 的三级渐进披露：目前「常驻 vs 按需」唯一带 token 预算的成文规范

[Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) · [Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) · [memory tool cookbook](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)

**机制**：三级加载——L1 metadata（`name` + `description`，**约 100 token，永远常驻**）；L2 `SKILL.md` 正文（约 5k token 以内，被触发时才读）；L3 打包的资源文件与脚本（引用到才读，脚本只有输出进上下文、代码不进）。配套：`CLAUDE.md` 在会话开始直接塞进上下文，子目录的按需加载；`memory_20250818` 提供 `/memories` 目录的文件读写。

**证据**：部分实测。Anthropic 自测的 100 轮 agentic search 任务：仅清理陈旧的工具结果就 +29%，加上文件型记忆后最高 +39%。三级 token 预算是官方公布的设计数字，不是评测结果。

**可迁移性**：直接可用，而且给了你**索引行的 token 预算**：每个可选加载单元的常驻成本应该控制在 ~100 token（约 50–70 个汉字）。特别注意 Anthropic 的一句话——Claude Code 用 glob/grep 做 JIT 检索，是为了「**绕开陈旧索引的问题**」。这对你的问题 4 是个明确的架构表态：**索引应该只做路由，不做事实存储**，事实永远从正文 grep 出来，这样索引过期的破坏面被限制在「路由不准」而不是「答案错误」。

### 7. RAPTOR：多层摘要索引的正确用法是「摘要与原文并列可检索」，而不是摘要替代原文

[RAPTOR (arXiv 2401.18059, ICLR 2024)](https://arxiv.org/abs/2401.18059)

**机制**：自底向上递归地「聚类 → 摘要 → 再聚类」，构造一棵多层抽象树。检索时用 collapsed-tree 方式，**叶子原文块和各层摘要节点在同一个池子里竞争**，让查询自己选抽象层级。

**证据**：有实测。控制对照下 QuALITY 上 DPR+GPT-4 从 60.4 → RAPTOR+GPT-4 62.4，HARD 子集 54.7 → 56.6，QASPER F1 53.0 → 55.7；与 GPT-4 结合刷新 QuALITY SOTA 时是 62.3 → 82.6（+20 绝对点，但这是换 reader 后的对比，不是纯检索消融）。注意区分：**纯检索结构带来的增益是 2 个点量级，20 点那个数字包含了 reader 的贡献。**

**可迁移性**：结构思想可用，算法不可用（依赖 embedding + GMM 聚类）。可迁移的是那条设计原则：**当你为 `.edges/` 生成主题级摘要时，摘要必须是「额外一个可 grep 的层」，绝不能替换掉原条目**。这也和第 1 条论文的 condensation 实验互相印证。

### 8. 压缩记忆是有条件的赌博，同一策略会在不同材料上翻转符号

回到 [arXiv 2607.26637](https://arxiv.org/abs/2607.26637) 的 condensation 消融，单独列出来因为它直接回答你的问题 3。

**机制**：同一个重组器跑两个版本——「保留每个事实」vs「压缩概括」。

**证据**：有实测，且结果**反向翻转**。保留全部事实在对话流上更好：LoCoMo 82.9 vs 79.1；REALTALK **77.6 vs 41.2**（压缩把正确率几乎砍半）；PersonaMem 128k 59.5 vs 54.8。但在 PersonaMem 32k 上压缩反而更好：68.8 vs 56.2（库更紧凑更好搜）。论文原话：这是「没有任何单一压缩策略能跨 benchmark 通用」的最清晰证据。

**可迁移性**：直接可用，作为一条硬规则：**合并近义条目时默认保留全部事实、只合并载体不合并内容**。你的场景（代码约束、根因、外部链接用途）更接近 REALTALK 那种「细节即答案」的材料，而不是 PersonaMem 32k 那种「泛化画像」材料。压缩掉一个具体的 API 参数名或错误码，就是把可回答内容删掉了。

### 9. 时间与冲突：bi-temporal「失效但不删除」是最成熟的可迁移模式

[Zep: A Temporal Knowledge Graph Architecture for Agent Memory (arXiv 2501.13956)](https://arxiv.org/abs/2501.13956) · [Graphiti](https://github.com/getzep/graphiti)

**机制**：每条事实带**四个时间戳**——`valid_at` / `invalid_at`（世界真值区间）与 `created_at` / `expired_at`（系统摄入与审计区间）。新事实与旧事实冲突时，由 LLM 判定冲突，把旧边的 `invalid_at` 设为新事实的 `valid_at`、`expired_at` 设为当前系统时间，**旧事实保留而不删除**。因此可以回答「现在什么是真的」「某个日期什么是真的」「这条事实来自哪里」三类问题。

**证据**：有实测但是厂商自评。DMR 94.8% vs MemGPT 93.4%；LongMemEval 上准确率最高 +18.5%、延迟降低 90%。没有看到第三方独立复现。

**可迁移性**：**图不可迁移，bi-temporal 的记账可以，而且在 markdown 里是免费的**。你的条目只要在 `## 标题` 下加两行结构化元数据（`valid_since` / `invalidated_by`），就能得到全部好处：`rg` 可以直接筛出「未失效」的条目，git diff 可读，人可 review。这比「删除旧条目」好得多——第 1 条论文实测到的失败模式恰恰是「management agent 不稳定地把变更记成带日期的更新，导致陈旧事实以现行事实的身份存留」，而更强的模型也只能挽回一半损失。**把「记成带日期的更新」从提示词要求变成脚本的写入契约，就消除了这个失败模式。**

### 10. Generative Agents：reflection 与三因子打分，其中两个因子不需要向量

[Generative Agents (arXiv 2304.03442)](https://arxiv.org/abs/2304.03442)

**机制**：memory stream 存自然语言观察；检索打分 = `recency×0.5 + importance×2.0 + relevance×3.0`（各自归一化到 [0,1]，recency 是指数衰减、衰减因子 0.995，importance 是让 LLM 直接打 1–10 的整数分，relevance 是 embedding 余弦），取 top-30 进上下文。**reflection 按重要性累计触发**（实现里阈值是最近事件重要性之和超过 150），产出的高层洞察写回 stream，可被再次检索和再反思。

**证据**：有实测（人评 + TrueSkill 消融）。完整架构 > 去掉 reflection > 去掉 reflection 与 planning > 全去掉；完整架构 vs「无记忆/无规划/无反思」的效应量 Cohen's d = 8.16，Kruskal-Wallis 显著。但注意：**这是「可信度」人评，不是问答准确率**，而且这是 2023 年的架构。

**可迁移性**：`relevance` 那一项依赖 embedding，不可迁移；但 `recency`（文件 mtime / git 最后修改时间）和 `importance`（写入时让 agent 打分，存进 frontmatter）**都是纯文本可实现的**。更值得抄的是 **reflection 的触发条件**：不是定时，而是**累计重要性越过阈值才触发**。这是你的整合流程（问题 3）唯一有消融支撑的触发策略，而且完全不需要向量——把每条新条目的 importance 累加，超阈值就跑一次合并/剪枝。

### 11. 「摘要化 + 选对」才有用，自由检索历史经验会主动伤害编码 agent

[SWE-ContextBench (arXiv 2602.08316)](https://arxiv.org/abs/2602.08316) · [代码](https://github.com/jiayuanz3/SWEContextBench)

**机制**：在 SWE-bench 基础上构造「基础任务 + 相关任务」对（来自真实的 GitHub issue/PR 依赖与引用关系），显式评测编码 agent 复用过往经验的能力，分准确率、时间效率、成本效率三维。

**证据**：有实测，这是**离你的场景最近的一份评测**。Lite 子集上：无上下文基线 26.26% → **Oracle Summary（给对的、摘要过的经验）34.34%**；Oracle Context（给对的、完整轨迹）只有 27.27%。差距的关键在检索质量：Oracle Summary 比 Free Summary（自主检索）高 **12.12 个点**，而 Oracle Context 只比 Free Context 高 1.01 点。自由检索完整轨迹是最差的组合——方差最大、最坏情况运行时超过 2,100 秒、成本 $0.98（比基线高 27.3%）。难任务上，正确的摘要让最慢实例的运行时降低 60% 以上。顺带：接入现成记忆系统横评里 Supermemory 30.30%、Mem0 24.24%。

**可迁移性**：直接可用，而且是一条**反向约束**。它说明：错误或未经筛选的记忆比没有记忆更差。对你的落地含义是——**宁可让索引保守地少路由，也不要让 agent「顺手 grep 一把把相关的都读进来」**；以及**存摘要不要存过程**（你的 `## 标题` 条目形式天然正确，不要退化成粘贴调试日志）。

### 12. 整合与遗忘的现有机制盘点：大部分依赖向量，少数不依赖

- [A-MEM (arXiv 2502.12110)](https://arxiv.org/abs/2502.12110)：Zettelkasten 式原子笔记，每条带 contextual description / keywords / tags，新记忆自动与历史建链，并**反向触发老记忆的属性更新**。六个基座模型上优于 SOTA 基线。**但链接生成走 ChromaDB 语义相似度，核心机制不可迁移**；可迁移的只有「结构化属性 + 写入时回改旧条目」这个动作。
- [Mem0 (arXiv 2504.19413)](https://arxiv.org/abs/2504.19413)：2025 年版是 extract→consolidate（含 ADD/UPDATE/DELETE 决策）；[2026 年 4 月的新算法](https://mem0.ai/blog/ai-memory-benchmarks-in-2026)反而**改成了单次 ADD-only、不做 UPDATE/DELETE**，LoCoMo 92.5、LongMemEval 94.4、每次检索约 7K token（全上下文基线 25K+）。值得注意的是他们自己承认：**knowledge update 类别 93.6 是受 ADD-only 影响最明显的一项**，因为旧事实被保留、可能与新事实一起浮现。这与第 9 条的 bi-temporal 是同一个权衡的两种解法。所有数字是厂商自评的托管版，开源 SDK 只承诺「方向一致」。
- MemoryBank：Ebbinghaus 遗忘曲线——强度随访问上升、随时间衰减。**纯计数与时间戳，无向量依赖，可迁移**，但缺乏针对性的消融证据。
- [Voyager (arXiv 2305.16291)](https://arxiv.org/abs/2305.16291)：skill library 的两个关键决策——**用「描述」而不是「代码」建索引**，以及**新技能调用旧技能**（组合而非重推导）。实测 3.3× 独特物品、科技树里程碑最快 15.3×、2.3× 移动距离。检索用 embedding（top-5），但「索引描述而非内容」和「条目间显式引用」这两点在 markdown 里就是 frontmatter 描述 + 相对链接，完全可迁移。
- 综述：[Memory in the Age of AI Agents (arXiv 2512.13564)](https://arxiv.org/abs/2512.13564)（Forms–Functions–Dynamics 三维分类，约 200 篇）和 [Memory for Autonomous LLM Agents (arXiv 2603.07670)](https://arxiv.org/abs/2603.07670)（write–manage–read 循环，2022–2026）。两者都把 evolution 明确拆成 consolidation / updating / forgetting。综述层面把遗忘信号归纳为三类：时间衰减、访问频次（LRU/LFU）、LLM 判定的重要性——并明确警告 **LRU 式遗忘会误删「一年用一次但用到时至关重要」的长尾知识**，这对「项目约束」类记忆是直接的风险提示。

---

## 针对 5 个问题的直接回答

**问题 1（索引粒度）**：有实测结论。LongMemEval 给出倒 U 形——中间粒度最优，过度压缩到原子事实反而丢信息；索引的正确做法是 key expansion（用正文抽取的实体词扩充索引键），而不是加深层级。arXiv 2607.26637 补充：层级化的回报是**检索成本减半**而非准确率，且更精巧的结构反而更难被读对。

**问题 2（常驻 vs 按需）**：**学界没有形式化判据**。只有工程惯例：Anthropic 的三级 token 预算（~100 / ~5k / 0）和 Letta 的路径约定（`system/` 常驻、其余按需、文件树永远常驻）。唯一沾边的量化信号是 Anthropic 的 +29%/+39%，但那是清理工具结果的收益，不是「该常驻什么」的消融。这块没有好答案，不要指望学界。

**问题 3（整合与遗忘）**：有可用机制，但**几乎没有一个是在「无向量」条件下被评测过的**。ACE 的确定性 delta 合并 + helpful/harmful 计数、Generative Agents 的重要性累计触发 reflection、MemoryBank 的时间衰减、bi-temporal 失效标记——这四个都不需要向量。压缩策略上有明确的实测警告（第 8 条）。

**问题 4（过期与冲突）**：最成熟的是 Zep/Graphiti 的 bi-temporal 失效不删除，但它的冲突**检测**依赖语义相似度找候选。arXiv 2607.26637 实测到「陈旧偏好被当成现行事实」是文件系统记忆的头号失败模式，而且换更强模型只能挽回一半。**对「记忆 vs 当前代码状态」这一特定的不一致，我没有找到任何针对性的研究**——学界的过期研究全在对话/用户偏好场景。这是你要自己解决的空白。

**问题 5（多层级作用域）**：有工程先例（Claude Code 的嵌套 `CLAUDE.md`、Letta MemFS 的路径标签、Anthropic Skills 的目录打包），**但我没有找到任何测量「按目录树递归持有记忆」的检索策略的评测**。arXiv 2607.26637 测的是单一 `/memories` 树下的层级深浅，不是多个自治作用域。这块也是空白。

---

## 最可借鉴的 3 个具体做法

### 做法一：把索引从「文件级描述」改成「条目标题 + 提取键」，并给索引设 token 预算

依据：LongMemEval 的 key expansion（+4% 召回 / +5% 准确率，用户事实型 key 最稳）+ 倒 U 形粒度结论 + Anthropic 的 ~100 token 常驻预算 + arXiv 2607.26637「names-and-descriptions 扫描会漏掉散落在别处的事实」。

落地成脚本逻辑：

1. `AGENTS.md` 的受管索引区块，从「每文件一行」改为「每文件一行 + 该文件下所有 `## 标题` 的列表」。标题本身就是最好的中间粒度索引，而且是你的脚本已经在做精确匹配的那个键——零额外维护成本。
2. 每条记忆的 `## 标题` 下增加一行 `keys:`，由写入脚本从条目正文自动提取并去重：所有反引号包裹的标识符、大写缩写、文件路径、错误码、组件名。这是 key expansion 的无向量实现——它让 `rg` 能用「代码里出现的词」命中「记忆里的条目」，而这正是你场景里查询词和记忆词汇不匹配的主要来源。
3. 脚本对索引区块做硬预算检查：单个文件的索引块超过 N token 就报错，强制拆分主题文件。**不要让它静默增长**——第 1 条论文测到的正是「索引信息量不随条目增长」的退化。

### 做法二：给每条记忆加三个纯文本字段——`valid_since`、`superseded_by`、`hits`——并把「更新」定义为标记失效而非覆盖

依据：Graphiti 的 bi-temporal 失效不删除（LongMemEval +18.5%，厂商自评）+ ACE 的 helpful/harmful 计数器（延迟 -86.9%，避免 collapse）+ arXiv 2607.26637 实测的「陈旧偏好当成现行事实」失败模式 + 第 8 条的压缩翻转警告 + 综述对 LRU 误删长尾的警告。

落地成脚本逻辑：

1. upsert 时如果 `## 标题` 已存在且内容冲突，**不覆盖**：给旧条目打上 `superseded_by: <新条目标题>` 与失效日期，把新条目追加在其后。旧内容留在文件里、留在 git 历史里，人 review 时能看到「什么变了、什么时候变的」。
2. 检索时的默认约定写进 `AGENTS.md`：`rg` 结果中带 `superseded_by` 的条目只作为历史参考，不作为现行约束。这就是 Zep 的「what is true now vs what was true then」，用一个字段实现。
3. `hits` 计数由 ask 流程回写（agent 引用了哪条就 +1）。**它的用途不是排序，是剪枝的输入**——但要遵守综述的警告：不要用纯频次淘汰。淘汰条件应该是复合的：`hits == 0` **且** `valid_since` 超过阈值 **且** 已被 `superseded_by` 标记。三个条件同时满足才是安全的删除。这样「一年用一次的关键约束」永远不会被误删。

### 做法三：把「整合」做成事件触发的脚本化体检，检查项对齐已被实测的三种腐化

依据：arXiv 2607.26637 的三个实测腐化（taxonomy 遵守度侵蚀、陈旧事实存留、事实散落到不相关文件）+ Generative Agents 的重要性累计触发（而非定时）+ Letta 的 `/doctor` + SWE-ContextBench「未筛选的经验有害」。

落地成脚本逻辑：

1. **触发条件用累计量，不用定时**：写入脚本累计「自上次体检以来新增/修改的条目数」（或用 Generative Agents 式的 importance 累加），越过阈值才触发一次 consolidation。定时跑会在没变化时做无意义的重写，而重写正是 context collapse 的来源。
2. **体检项固定为四条，全部可由脚本判定，不需要模型**：
   - 重复：跨文件的 `## 标题` 完全相同或规范化后相同。
   - 散落：某条目的 `keys:` 大量出现在另一个主题文件的正文里 —— 这是论文说的「靠扫描名称和描述发现不了、必须 grep 正文」的那类缺陷，用 `rg` 就能查。
   - 索引漂移：`AGENTS.md` 索引区块里列的标题与 `.edges/` 实际标题的集合差。
   - 预算超限：索引块 token 数、单文件条目数。
3. **合并时的硬规则：只合并载体，不合并内容**。允许把两个主题文件并成一个、允许把两条同标题条目的正文拼接并去掉逐字重复的句子；**禁止让模型「概括」两条记忆**。这是第 8 条 REALTALK 77.6 → 41.2 那个数字买来的教训，而你的材料（具体 API、错误码、约束参数）正是最怕概括的那一类。
4. 体检产出的是 **git diff + 一份改动清单给人 review**，不是自动提交。这是你「人可 review」约束的直接兑现，也对冲了 SWE-ContextBench 那条「未筛选的记忆主动伤害性能」的风险。
