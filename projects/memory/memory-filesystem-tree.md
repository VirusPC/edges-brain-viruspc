# Memory × 文件系统 × 树：一种 Repo-native Agent Memory 架构

## 核心判断

这套 edges-memory-init / ask / remember / add-type 系列，不只是“把 Memory 存进文件夹”。现行捆绑技能是这四项。下文生命周期表里的 doctor、reshape 两行保留 2026-10-27 删除前的职责，包里已经没有对应 skill。

它更准确的定位是：

> 把项目目录树直接变成 Memory 的作用域树，用 AGENTS.md 提供发现与路由，用 .memory/ 保存可审计的知识，用 Skill 与 CLI 管理完整生命周期。

这是一种 **filesystem-native、scope-aware、progressive-disclosure、Git-auditable** 的项目记忆系统。

| 组成 | 提供的能力 |
| --- | --- |
| Memory | 项目决策、反馈、外部引用、个人信息与可执行经验 |
| 文件系统 | 持久化、可编辑、可移植、权限边界、Git 版本历史 |
| 树 | 作用域、继承、距离、父子关系、局部更新与算法结构 |

真正有价值的创新不是某一种 Markdown 格式，而是将三者组合成一个与代码仓库同构的外部认知结构。

---

## 一、当前系统的主要特点

### 1. Memory 与项目目录天然绑定

每份 Memory 挂在一个项目目录上，作用于这个目录以及整棵子树。

~~~text
仓库根 Memory
└── packages/
    └── app/
        └── feature-a Memory
~~~

处理某个文件时，与它相关的项目记忆就是从 Memory Root 到该文件所属目录的祖先链：

~~~text
仓库根 → 应用 → 模块 → 子模块
~~~

目录位置直接编码作用域，不需要额外维护 repo/module/path 等 scope metadata。越深的节点越具体，下层 Memory 补充上层 Memory。

### 2. 它是一棵稀疏 Memory Tree

系统不会为每个代码目录生成 Memory。只有确实需要独立知识边界的目录才会拥有 AGENTS.md + .memory/。

~~~text
repo/
├── AGENTS.md
└── src/
    └── feature/
        └── payment/
            ├── AGENTS.md
            └── .memory/
~~~

即使 src/ 和 feature/ 没有 Memory，payment/ 也可以直接挂在最近的 Memory 祖先下面。Memory Tree 与目录树对齐，但不是目录树的机械复制。

### 3. 父节点显式索引子节点

系统不依赖 Harness 自动发现所有嵌套 AGENTS.md。父节点会显式索引直接下层的 Memory Node：

~~~text
根 AGENTS.md
→ 子节点 AGENTS.md
→ 本层 Memory Type
→ 具体 Memory
~~~

其中“直接下层”按 Memory 层级定义，而不是按物理目录深度定义。没有 Memory 的中间目录会被跳过。

因此，只要 Harness 能加载根 AGENTS.md，Agent 就可以沿项目自己维护的索引遍历完整 Memory Tree。

### 4. 固定两跳的本层渐进式披露

访问本层一条具体 Memory 的路径固定为：

~~~text
AGENTS.md
→ .memory/PROJECT.md
→ .memory/projects/project_xxx.md
~~~

| 层级 | 职责 |
| --- | --- |
| AGENTS.md | 本层硬约束、本层类型入口、下层 Memory Node |
| PROJECT.md 等 | 某个 Memory Type 的条目索引 |
| 具体 Markdown | 完整记忆正文 |

每一跳只暴露“地址 + description”。Agent 根据问题和说明选择下一跳，不把整棵 Memory Tree 注入上下文。

### 5. 目录 Scope 与 Memory Type 构成二维过滤

官方种子包含六种类型：

| Type | 内容 |
| --- | --- |
| user | 与当前用户、当前仓库绑定且不宜公开的信息 |
| feedback | 用户纠正、确认过的做法与禁止模式 |
| project | 无法从代码或 Git 推导的项目决策和背景 |
| reference | 外部文档、设计稿、监控面板等的位置 |
| skills | 从会话和执行中沉淀的可复用流程 |
| agent_skills | 人工编写或生态工具安装的标准 Agent Skills |

整个检索过程形成三级过滤：

~~~text
Path Scope → Memory Type → Memory Entry
~~~

Type 并非协议中的封闭枚举。用户可以在某个 Memory Node 上增加新的 Type，不需要维护中央 JSON/YAML 注册表。

### 6. 常驻硬约束与按需 Memory 分离

系统明确区分：

~~~text
不加载就会直接做错的规则 → AGENTS.md
只在特定问题下需要的知识 → .memory/
~~~

- Instruction 负责不可跳过的行为边界；
- Memory 负责按需提供判断依据；
- 索引只负责发现，不承载详细内容。

硬约束不会因为召回失败而丢失，普通背景又不会永久占据上下文。

### 7. 文件所有权边界清晰

AGENTS.md 是共享文件，可以同时包含人写正文、其他工具区块和 Project Memory 区块。系统使用成对 HTML 注释声明自己的受管范围，只修改自己拥有的区块；区块外正文保持不变。

目录层面同样有边界：

- .memory/ 归 Memory 工具管理；
- .agents/skills/ 归人与 Agent Skills 生态管理；
- Memory 系统可以索引 .agents/skills/，但不能创建或改写其中内容。

这使多个 Agent、Skill 和 CLI 能在同一仓库中共存。

### 8. Markdown 是事实源，索引是派生产物

具体 Memory 文件是 canonical source。类型入口和索引可以根据目录及 frontmatter 全量重算。条目用 slug 文件名（不是 `0001-...`），索引用无序子弹列表重算，并发插入不必为序号打架——见 [memory-system-strengths.md](memory-system-strengths.md) 第 9 条。

由此获得：

- Git 可追踪与人工 review；
- 索引漂移可机械恢复；
- 重复执行保持幂等；
- 不需要把向量数据库或隐藏状态作为唯一事实源。

其核心原则是：

> 有事实源的内容就全量重算。缺少事实源、必须扫描全树才能判断的问题，在 2026-10-27 之前由 doctor 承担；该 skill 已删除，没有替代。

### 9. 完整的 Memory 生命周期

| Skill | 职责 |
| --- | --- |
| init | 在指定目录创建或修复 Memory Node |
| ask | 按工作范围、祖先链、Type 和 description 检索 |
| remember | 把可复用结论写到正确层级和正确 Type |
| doctor | 扫描整棵树，诊断并修复结构漂移 |
| reshape | 将已有 AGENTS.md 拆分成硬约束、索引和 Memory |
| add-type | 为某一层增加新的 Memory Type |

这些职责主要按“操作需要多大视野”划分：单节点操作保持局部，全树扫描曾经只由 doctor 承担。现行 skill 是 `edges-memory-init`、`edges-memory-ask`、`edges-memory-remember`、`edges-memory-add-type`。doctor 与 reshape 两行只保留删除前的职责。

### 10. 主动抵抗 Memory 膨胀

系统明确不保存：

- 直接读代码即可得到的架构、路径与实现；
- 通过 Git 历史即可得到的事实；
- 临时进度与会话流水；
- 已存在于其他真理源中的内容；
- 未验证、未经用户确认的猜测。

它主要保存代码与 Git 无法完整表达、但未来仍会影响判断的知识。这是一道比“换更强 embedding”更重要的质量闸门。

---

## 二、树结构带来的算法空间

树并不只是存储布局。它可以进一步成为 Memory 的 Scope Model、Retrieval Index、Conflict Structure、Lifecycle Boundary 和 Evaluation Unit。

### 1. 最近公共祖先：自动决定写入位置

一条经验涉及多个文件时，可以计算这些文件的 Lowest Common Ancestor：

~~~text
src/order/create.ts
src/order/refund.ts
        ↓
LCA = src/order/
~~~

Memory 可以默认写入 LCA 对应的 Memory Node。涉及多个无关模块时，LCA 自动上升。这能把“Memory 该写哪一层”从纯模型判断逐步转为确定性算法。

### 2. 祖先链召回

处理 src/order/refund.ts 时，只检索：

~~~text
root → src/order → src/order/refund
~~~

检索成本主要与树深度相关，而不是与全仓库 Memory 总量相关。兄弟子树默认不可见，可以显著降低误召回和跨模块污染。

### 3. 基于树距离的排序

在语义相关度之外，可以加入 Scope Distance：

\[
score(m,q)=semantic(m,q)\times scopeWeight(distance)
\]

| 位置 | 权重示例 |
| --- | ---: |
| 当前节点 | 1.0 |
| 父节点 | 0.8 |
| 仓库根 | 0.5 |
| 兄弟节点 | 默认不参与 |

目录关系由此成为检索排序的强先验。

### 4. 继承与冲突解析

树结构允许建立明确的裁决顺序：

- 更窄作用域优先于全局默认；
- 硬约束优先于普通经验；
- 有验证证据的 Memory 优先于无证据结论；
- 当前版本有效的 Memory 优先于旧版本。

后续可以给父子关系增加显式语义：

- additive：下层补充；
- override：下层覆盖；
- exception：局部例外；
- supersede：新版本替代旧版本。

### 5. 基于 Git Diff 的局部失效检测

代码变化可以映射到受影响的 Memory 子树：

~~~text
git diff
→ changed paths
→ affected memory nodes
→ ancestor/descendant validation
~~~

删除或重构一个模块时，只需检查相关节点、祖先摘要和子节点，而不必重新验证全库 Memory。

### 6. 子树级 Memory Budget

每个节点都可以拥有独立预算：

\[
Budget(node)=base+\alpha\cdot changeFrequency+\beta\cdot taskFrequency
\]

高频修改、高频召回、高价值模块获得更多预算；稳定、低收益模块主动收缩。

可观测指标包括：

- 子树 Memory 数量；
- 索引 token；
- 召回次数与准确率；
- 采纳率与采纳后成功率；
- Negative Transfer Rate；
- 单位 token 或维护成本带来的 Memory Gain。

### 7. Promote、Demote、Split、Merge 与 Prune

树结构为 Memory consolidation 提供了明确操作：

- 多个子节点反复使用同一经验 → 向父节点提升；
- 某条全局 Memory 实际只在一个模块使用 → 下沉；
- 一个节点内容过多 → 拆分为更窄子节点；
- 多个低密度节点边界重合 → 合并；
- 长期不召回或召回后不采纳 → 降权或归档。

这让 Memory 整理可以基于真实使用数据，而不是定时让模型重新总结全部内容。

### 8. 受控的信息传播

- 向上：只传播跨子树稳定成立的摘要、公共经验和风险信号；
- 向下：传播全局约束、公共默认值与通用流程；
- 横向：通过最近公共祖先或显式引用建立联系，而不是默认互相可见。

扁平 Memory Store 只能回答“语义上是否相似”，树还能回答“这条知识是否有资格影响当前模块”。

### 9. 子树级健康度与评估

Memory Node 可以成为最小评估单元：

~~~text
MemoryHealth(node)
= freshness
+ retrieval precision
+ adoption success
- stale rate
- negative transfer
- maintenance cost
~~~

由此能够回答：哪个模块的 Memory 真正降低了返工，哪些节点已经失效，哪些类型值得继续投入，以及 Memory 是否提高 AINE、降低 RTR、形成长期 COR。

---

## 三、与常见 Memory 系统的区别

| 常见 Agent Memory | Memory × 文件系统 × 树 |
| --- | --- |
| 中央向量库 | 分布式文件树 |
| 语义相似度推断 Scope | 目录位置直接表达 Scope |
| 隐藏数据库作为事实源 | Markdown 作为 canonical source |
| 默认全局检索 | 祖先链局部检索 |
| 通常不可直接人工审查 | Git diff 可审计 |
| 写入、召回逻辑容易黑盒化 | Skill、CLI、模板和受管区块显式控制 |
| 客户端专有 | 基于文件、链接、AGENTS.md，较为 vendor-neutral |
| Memory Type 常是标签 | Memory Type 是检索入口与生命周期边界 |

它不排斥 BM25、embedding 或图检索，但这些应当作为派生索引，而不应取代文件事实源。

---

## 四、当前边界

### 1. 语义质量尚未被结构工具解决

当前系统能保证结构正确，却不能自动保证 description 足够区分、Memory 仍然正确、两条 Memory 是否重复、内容是否过期，以及召回后是否被 Agent 采纳。

Doctor 当前是 Structural Doctor，不是 Semantic Doctor。

### 2. 时间 Scope 弱于目录 Scope

目录很好地表达了“对哪些代码成立”，但不能完整表达“在哪些版本成立”。

后续值得按需增加：

~~~yaml
source_refs:
valid_from_commit:
valid_until_commit:
verified_by:
supersedes:
status:
~~~

这些字段应服务于证据校验和失效检测，而不是无目的地扩充 metadata。

### 3. 根入口仍存在固定上下文税

详细内容虽然已经下沉，但根 AGENTS.md 仍可能积累大量下层索引和硬约束。需要对常驻区块建立行数、字节或 token 预算，并在接近阈值时报警或重组。

### 4. Remember 的质量仍依赖 Agent 判断

系统已经定义了写入闸门，但实际效果仍取决于 Agent 是否触发 Remember、判断出长期价值、选择正确 Scope 和 Type、完成去重并保留足够证据。

因此，它已经是强 Memory substrate，但仍需要评估和反馈闭环才能成为可靠的 autonomous memory。

---

## 五、建议抽象：Memory Tree Model

下一阶段最值得明确的不是增加更多 Type，而是建立正式的数据与算法模型：

~~~text
MemoryNode
├── path / scope
├── parent
├── children
├── local memory types
├── inherited memories
├── hard constraints
├── version evidence
├── budget
├── usage metrics
└── health
~~~

其上优先实现四种算法：

1. 基于改动文件 LCA 的自动写入选址；
2. 基于祖先链与目录距离的召回排序；
3. 基于 Git Diff 和 citation 的局部失效检测；
4. 基于召回、采纳和成功率的 promote / demote / prune。

---

## 六、评估闭环

真正需要验证的不是“仓库里有多少条 Memory”，而是：

~~~text
值得记住
→ 是否写入
→ 是否写到正确 Scope 和 Type
→ 相关任务出现时是否召回
→ 召回后是否采纳
→ 采纳后是否提高成功率
→ 是否减少 token、时间与返工
→ 过期后是否停止使用
~~~

| 阶段 | 指标 |
| --- | --- |
| 写入 | Capture Rate、Scope Accuracy、Type Accuracy、重复率 |
| 召回 | Recall@k、Precision@k、Oracle Gap |
| 使用 | Adoption Rate、Adoption Success Rate |
| 结果 | Memory Gain、Resolve Rate、RTR、AINE |
| 风险 | Negative Transfer Rate、Stale Memory Rate、Conflict Resolution Accuracy |
| 长期价值 | 单位维护成本带来的累计成功增益，可作为局部 COR |

---

## 结论

Memory + 文件系统 + 树的价值不只是简单、透明或不依赖向量数据库。

它把 Coding Agent Memory 中最难的几个问题映射成了已有结构：

- 用目录解决作用域；
- 用树解决继承和距离；
- 用父子索引解决发现；
- 用两跳入口解决渐进加载；
- 用 Git 解决审计和演化；
- 用 Skill/CLI 解决生命周期；
- 用使用数据驱动树上的提升、下沉、失效和剪枝。

因此，这套系统具备从“文件式记忆规范”进一步演化为“可计算的 Repo-native Memory System”的潜力。

下一阶段的核心不应是继续堆更多 Memory Type，而应把树正式提升为算法对象，并用 Memory Gain、Negative Transfer、RTR、AINE 和 COR 验证它是否真正形成长期复利。

---

## 参考实现

- [Project Memory Protocol](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-memory-init/references/PROTOCOL.md)
- [Project Memory Layout](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-memory-init/references/LAYOUT.md)
- [edges-memory-init](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-memory-init/SKILL.md)
- [edges-memory-ask](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-memory-ask/SKILL.md)
- [edges-memory-remember](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-memory-remember/SKILL.md)
- [edges-memory-add-type](https://github.com/VirusPC/edges/blob/main/packages/skills/edges-memory-add-type/SKILL.md)
