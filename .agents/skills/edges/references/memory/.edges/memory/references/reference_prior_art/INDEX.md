---
name: reference_prior_art
description: 四路并行调研的综合结论，改变本方案决策的外部证据总入口。
metadata:
  edges-title: 同类方案调研：文件系统式记忆
  edges-type: reference
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-09-06T13:38:38+08:00"
---

# 同类方案调研：文件系统式记忆

2026-08-25，四路并行调研的综合结论。四份原始报告在同目录下，本文只保留能改变决策的部分。

- [`01-academic-papers.md`](../reference_academic_papers/INDEX.md) — 学术论文与 benchmark
- [`02-coding-agents.md`](../reference_coding_agents/INDEX.md) — 各家编码 agent / AI IDE 的工程实践
- [`03-oss-frameworks.md`](../reference_oss_frameworks/INDEX.md) — 开源记忆框架的机制细节（含源码取证）
- [`04-index-granularity.md`](../reference_index_granularity/INDEX.md) — 索引粒度的先验与阈值

四个方向独立收敛到同一结论：[`../design-decisions.md`](../../projects/project_design_decisions/INDEX.md) 里「scaling 瓶颈」一节列的候选方案 1（索引下沉到条目级）是正确方向，且现在有量化依据。

## 一、索引下沉的依据

**[LongMemEval](https://arxiv.org/abs/2410.10813)（ICLR 2025）** 做过索引粒度消融，结论是**倒 U 形**：round 级最优，再往下压缩成原子事实反而因信息损失变差。即不该停在文件级（太粗），也不该把 `## 条目` 拆更细（太细），中间那层正好是条目标题级。它另给一个不依赖向量的技巧 **key expansion**（用正文抽取的实体词扩充索引键）：+4% 检索指标 / +5% 准确率。

**[Callan 1994](https://www.cs.cmu.edu/~callan/Papers/callan794.pdf)（SIGIR）** 测 passage 级 vs 文档级检索，最强结论是「两级证据结合永远最好」（+7% ~ +23.5%），所以文件级索引行**不该删掉**，条目级只是加一层。它给的最佳窗口是 150–300 词 ≈ 800–1600 字节——我们实测 970 字节/条正好在中段，**内容侧不用动，只改索引侧**。

**[标题 vs 标题+摘要](https://asistdl.onlinelibrary.wiley.com/doi/10.1002/asi.4630250606)（1970s，真实用户 profile）**：只用标题做检索代理，命中率仅为标题+摘要的 **27%**，即平均丢 73% 召回；多词查询更差（16.8%）。所以索引行必须带一句「何时适用」，不能只列条目标题。

## 二、问题定性要升级：这是正确性问题，不是账单问题

**[Lost in the Middle](https://aclanthology.org/2024.tacl-1.9.pdf)（TACL）**：答案埋在长上下文中间时，GPT-3.5 准确率**低于自己的闭卷基线 56.1%**——给了文档比不给更差。

**Chroma 的 context rot 报告**：18 个前沿模型上准确率随 token 总量上升而下降，**在窗口占满之前就开始退化**；且干扰项非均匀复合——**单个似是而非的段落就能把准确率压到 needle-only 基线以下，4 个更差**。反直觉的一点：把上下文打乱成不连贯时模型常常得分更高，因为连贯上下文提供了更多「看似合理但错」的线索。

对应到本方案：`AGENTS.md` 里「先读 `.edges/FEEDBACK.md`」是无条件全量加载。任务只涉及 1 条约束时，其余条目就是干扰项。附带提醒：把若干条约束写成一篇读起来连贯的文档，比写成互不相关的条目更容易诱导错误联想。

## 三、一条修正目标函数的实测

**[arXiv 2607.26637](https://arxiv.org/abs/2607.26637)** 是「文件系统即记忆」的第一份系统性实测，参考实现与本方案几乎同构（YAML frontmatter 的 name + description、markdown 正文、grep 检索）。三个结论：

- **组织化只买到检索成本下降，不提高准确率**：重组后的库把每查询检索价格从 4.0 分砍到 1.4 分，但没有任何 agent 把「组织本身」转化成更好的答案。**所以索引设计的目标函数是「最小化读进上下文的字节数」，不是「提升召回」。**
- **taxonomy 遵守度随规模必然侵蚀**，只有最强的 management agent 能维持 → 必须有脚本化的外部检查，而不是提示词里的叮嘱。
- **工具集比模型更能决定记忆库的形状**：同模型同内容，换一套工具产出 2 个文件 vs 147 个文件。**改脚本接口 = 改架构**，比换模型有效。

另有 **[SWE-ContextBench](https://arxiv.org/abs/2602.08316)**，是离本场景最近的评测：无上下文基线 26.26% → Oracle Summary（对的、摘要过的经验）34.34%，而 Oracle Context（对的、完整轨迹）只有 27.27%。**自由检索完整轨迹是最差组合**（方差最大、最坏 2100 秒、成本高 27.3%）。含义是：存摘要不要存过程；宁可让索引保守地少路由，也不要「顺手 grep 一把全读进来」。

## 四、行业在往本方案的方向退，但没人用「聚合 + 文件级索引」

- **Cursor 原生 Memories 已在 v2.1.17 移除**，官方建议导出为 `.mdc` 转入 Rules。
- **Windsurf 的 Memories 只适用于 legacy agent**，新默认 agent 不持久化，文档主动建议改写成 Rule 或 `AGENTS.md`。
- **Zed** 把 Rules Library 拆成 Instructions（常驻）+ Skills（按需），默认常驻的规则迁进 `AGENTS.md`。
- **[Letta 今年把记忆搬进 git 仓库里的 markdown](https://www.letta.com/blog/context-repositories)**（MemFS），与本方案几乎同构，且给了具体数字：defrag 终态目标 **15–25 个聚焦文件**，生命周期分 init / reflect / defrag 三段，用 `system/` **路径**决定谁常驻（而非靠 agent 判断），后台整理跑在独立 git worktree 里再 merge。

但**几乎没有一家用「聚合文件 + 文件级索引」**：主流是「一个知识单元一个文件」，让文件级索引天然等于条目级索引，把问题结构性绕开。Amp 自己的仓库有 41 个 `AGENTS.md`，根文件的职责就是「该去看哪些其他 `AGENTS.md`」。

## 五、可直接抄、不需要向量的机制

**1. 条目稳定 id —— 这条是正确性缺口，不是优化。** 当前 `upsert_h2` 按 H2 标题精确匹配，**标题一改就变成新增，静默产生重复**。basic-memory 用 permalink 解决（改名/移动后引用不断）。落地：H2 下加一行 `id:`，匹配时优先按 id、回退标题。

**2. 失效不删除**（[Graphiti](https://github.com/getzep/graphiti) 的双时间记账）。价值不在图，在「矛盾不覆盖、只闭合有效区间」，纯 markdown 里免费：记 `生效:` / `失效: (被 XXX 取代)`，`search` 默认过滤失效项。关键分工——**日期比较是纯代码（`edge_operations.py:538-573` 无 LLM），只让 LLM 判「是否矛盾」**。前述论文实测到的头号失败模式恰恰是「陈旧事实以现行事实身份存留」，换更强模型只能挽回一半。

**3. 阈值触发的脚本化体检。** Memobase 的阈值模型最干净：单槽位超 128 token 触发 re-summary，sub_topic 超 15 触发重组。触发方式照 Generative Agents 的消融——**用累计量而非定时**；定时会在无变化时做无意义重写，而重写正是 [ACE](https://arxiv.org/abs/2510.04618) 观测到的 context collapse 来源（一次整体重写把 18,282 token 塌成 122 token）。

**4. 合并时只合并载体、不合并内容。** arXiv 2607.26637 的 condensation 消融显示「压缩概括」在 REALTALK 上把正确率从 77.6 砍到 41.2。本方案的材料是 API 参数、错误码、约束细节，正是最怕概括的一类。

**5. 淘汰而非拆分**（[GitHub Copilot Memory](https://github.blog/ai-and-ml/github-copilot/building-an-agentic-memory-system-for-github-copilot/)）。GitHub 明确**放弃了**离线去重/整理服务，理由是规模化下成本高且读时仍要对账；改为每条记忆带 **citation 指向具体代码位置**，读时校验是否仍成立，矛盾则写更正版本，**28 天未被使用即自动删除**。这提供了「条数只增不减」的另一半解法。

## 六、阈值汇总（供落地时取值）

| 参数 | 建议值 | 来源与可信度 |
| --- | --- | --- |
| 索引硬上限 | 200 行 / 25 KB，先到者为准 | Claude Code `MEMORY.md`，官方规范 |
| 拆分触发点 | 索引达 150 行（上限 75%） | 同上「接近上限即提醒」 |
| 单条索引行 | ≤120 字符（安全），绝对上限 1024 | llms.txt 实践指南（第三方）+ Agent Skills `description`（规范） |
| 每分组条数 | 3–30 条，超 30 拆组 | llms.txt 指南（第三方）+ MOC 社区经验 10–15/25（主观），两者收敛 |
| 单次加载条目 | ≤3–5 条 | context rot 干扰项复合实测（二手转述） |
| 层级深度 | ≤3 层 | Claude Code import 4 跳上限（规范），留 1 跳余量 |
| 条目正文长度 | 800–1600 字节（150–300 词） | Callan 1994 最佳窗口，同行评议实测 |
| 记忆文件总数 | 15–25 个聚焦文件 | Letta defrag 目标，产品实现 |

定位提醒：本方案的 `AGENTS.md` **形式像 `CLAUDE.md`、功能像 `MEMORY.md`**。200 行 / 25 KB 是 `MEMORY.md`（索引）的硬读取上限、超出静默丢弃；`CLAUDE.md` 的 200 行只是软目标。既然功能等同索引，就应自愿采用硬上限。

## 七、确认存在的空白

**「记忆与当前代码状态不一致」的检测，学界完全没有研究**——过期研究全在对话/用户偏好场景。工业界唯一的答案是上面第 5 条 Copilot 的 citation + 读时校验。这是本方案要自己解决的部分。

另外两个空白：没有关于「常驻 vs 按需」的形式化判据（只有 Anthropic 的三级 token 预算和 Letta 的路径约定这类工程惯例）；没有任何评测测过「按目录树递归持有记忆」的检索策略——arXiv 2607.26637 测的是单一 `/memories` 树下的层级深浅，不是多个自治作用域。

## 八、一处需要澄清的引用

[`04-index-granularity.md`](../reference_index_granularity/INDEX.md) 指出「文档里没有『最多加载 5 条』，是外推」。文档确实没写，但**源码里有**：`src/memdir/findRelevantMemories.ts` 的 `SELECT_MEMORIES_SYSTEM_PROMPT` 原文为 `Return a list of filenames for the memories that will clearly be useful ... (up to 5)`。该数字成立，出处是源码而非文档。
