# Personal Benchmark 的实践趋势与记忆消融定位

## 背景

在为 Edges 的仓库快照评测项目比较 Harbor 与 Inspect AI 时，讨论延伸到个人评测集：公开榜单能否帮助选择适合自己工作的模型，以及现有 memory 消融实验与 personal benchmark 的关系。用户进一步询问 personal benchmark 是否已经流行，并要求将讨论记录到本项目。

## 主题

Personal benchmark 指以自己的真实任务、材料和质量标准组成可重复运行的评测集，用来判断模型或 Agent 对本人工作的适用性。本条记录它的公开实践信号，以及它与 Edges 记忆消融实验和框架选择的关系。

- 难点一：个别文章、团队实践与产品出现，能够证明有人采用，不能直接证明大规模普及。
- 难点二：个人评测集、记忆消融实验和执行框架承担不同职责，容易在选型讨论中混在一起。
- 难点三：Inspect 的扩展包和模型代理属于可选接入方式，不能将它们的默认行为当作 Inspect 整体的能力限制。

## 过程

### 时刻不详：从框架对比回到现有记忆消融实验

最初讨论倾向 Harbor，理由是它的任务、环境与验收流程贴近仓库中的完整 Agent 执行。用户追问 Inspect AI 为什么不能用于现有 memory 消融实验后，重新对照了现有 runner：同一 Agent 在 memory-on 与 memory-off 工作目录回答相同问题，记录质量、违反项、token 和耗时。

随后修正判断：Inspect 完全可以承载这个实验。自定义 Solver 可包装现有 client，Scorer 可包装现有 judge，并复用组间比较逻辑；不必先采用 Inspect SWE 或 Agent Bridge。仅按现有 Python 实现与接口判断，Inspect 预计接入更简单；这仍是适配成本估计，没有实际迁移验证，也没有形成正式选型决策。没有继续将 Harbor 定为唯一优先方案，因为当前实验没有显示必须依赖其任务包和环境编排能力。

### 时刻不详：寻找对比文章并发现任务复用入口

查找两框架的比较文章时，发现个人实践文章 Building a Personal AI Benchmark：作者用 Inspect、Docker 和 OpenRouter 建立自己的任务评测集。文章包含框架对比，但作者说明对比表由 AI 辅助生成，因此主要将其作为个人实践记录，而不是权威选型结论。

同时发现 Meridian Labs 的 inspect_harbor 适配包，可以让 Inspect 执行 Harbor 格式的任务。这补充了此前的二选一讨论：执行框架与任务资产格式可以分别选择。本次没有决定采用该适配包。

### 时刻不详：核实 personal benchmark 是否已经流行

用户问 personal benchmark 现在是否很火。查阅近期一手材料后，找到三个信号：

1. Every 在 2026-09-10 发布 Evals for Everyone，介绍为每位员工建立个人评测集，将常用任务与本人对输出的纠正整理为检查标准。
2. 2026-07-28 的个人实践文章记录了用 Inspect 建立编码和生活任务评测集的过程。
3. Personal Benchmark 产品提供真实输入、多模型运行、盲评与排名流程，调研时页面标注为公开测试。

据此将表述限定为“出现个人实践、团队推广和产品化尝试，可以视作新兴实践趋势”。没有采用“已经很火”或“广泛普及”的说法，因为本次没有找到可靠的采用率数据。

## 结果

- 形成了有来源的判断：personal benchmark 已有实际案例，普及规模仍不清楚。
- 明确了它与记忆消融的关系：个人评测集提供长期维护的任务与标准；消融实验在同一套任务上比较有无记忆的效果。
- 澄清了 Inspect 对现有消融实验的可行性；接入更简单是当前估计，尚未验证或选型。
- 本条记录没有新增必须执行的任务。普及率缺乏数据是结论的适用边界；本次没有承诺进一步调查、迁移或运行实验。

## 所学

公开 benchmark 提供共同测试条件下的可比结果；personal benchmark 补充个人工作、私有材料与质量偏好的适用性证据。二者可以同时使用，本次没有提出替换公开 benchmark。

个人评测集与某一次实验应分开理解。同一评测集可以比较模型、Agent 版本或记忆条件；memory 消融只是其中一种实验设计。框架负责执行和记录，任务与判分标准仍由评测者维护。

框架选择也应根据已有实现判断。对于现有 client 和 judge 已经分开的实验，Inspect 的包装接入有复用空间；Harbor 的环境管理与任务封装仍可作为后续完整任务评测的候选能力。两者接入成本和行为一致性均未实测。

## 行动指南

### 主题行动指南

#### 背景

需要判断模型或 Agent 是否适合自己的真实工作，或判断某项配置改动是否改善了这些工作。

#### 核心问题

能否用稳定的任务与标准，重复比较不同系统或配置的效果？

#### 核心解决方案

1. 收集本人实际交给 AI 的任务及材料，把纠正转成可检查的质量标准。相关选项是直接参考公开榜单；个人任务集用于补足适用性证据，不负责替代公共比较。
2. 将任务集与实验条件分别维护。在同一套任务上比较模型、版本或有无记忆；本次没有把这些因素合并成同一个未经区分的结论。
3. 从已有实现选择最少改造的接入路径。现有记忆消融可考虑用 Inspect 自定义 Solver 和 Scorer 包装 client 与 judge；Harbor 保持候选，暂未因其任务包能力重做现有实验。
4. 记录观察证据及其边界。公开案例支持“有人采用”，采用规模仍需独立数据；本次没有以案例数量推断普及率。

#### 验收标准

- 任务与本人实际工作有关，质量标准可以说明。
- 同一批任务可在不同条件下重复运行，质量与成本可比较。
- 记忆消融只把计划中的记忆差异作为比较条件，相关执行配置有记录。
- 报告区分实际观察、接入成本估计与未验证判断。

### 细节与其他

#### 若现有实验已能运行真实 Agent

则优先评估复用 client、judge 和比较逻辑的路径。可选 Inspect 自定义 Solver；只有需要统一模型代理能力时再评估 Bridge，现阶段不因使用 Inspect 而强制引入该层。

#### 若以后希望复用 Harbor 格式的任务

则可进一步核实 inspect_harbor 对目标任务的支持。可选完整 Harbor 执行框架，也可由 Inspect 消费任务格式；本次仅确认存在适配入口，尚未验证具体兼容范围。

## 补充说明

### 原始材料

- 2026-10-31 本次 Codex 对话，助手为 Codex，具体时刻未记录。可按下列用户原句定位原始问答：“就我memroy消融实验这部分，inspect ai 为什么不行” → “那个接入更简单” → “有没有这两个框架的对比文章” → “personal benchmark 现在很火么” → “记录下note到project”。本笔记保留讨论顺序与判断修正，未将估计写成已经执行的结果。
- [本项目入口](../../INDEX.md) — 仓库快照下端到端 harness 评测的背景与范围。
- [前期框架对比](../2026-10-31--harbor-%E4%B8%8E-inspect-%E6%B7%B1%E5%85%A5%E5%AF%B9%E6%AF%94/INDEX.md) — 较早的文档和源码调研；其中优先验证 Harbor 的一般性建议，应结合本条针对现有消融实验的后续澄清阅读。

### 公开来源

- [Every：Evals for Everyone](https://every.to/context-window/evals-for-everyone) — 团队为员工建立 personal benchmark 的一手实践，发表于 2026-09-10；支持实践存在，不提供行业采用率。
- [Building a Personal AI Benchmark](https://www.jjshanks.net/posts/personal-ai-benchmark/) — 2026-07-28 的个人实现记录；框架对比表由 AI 辅助生成，主要参考其实践过程。
- [Personal Benchmark](https://www.mybenchmark.online/) — 2026-10-31 查阅时为公开测试产品，展示基于真实输入进行多模型盲评的产品化尝试；页面存在不等于采用规模已经确认。
- [Inspect Task](https://inspect.aisi.org.uk/tasks.html) 与 [Solver](https://inspect.aisi.org.uk/solvers.html) — 对应题集、执行和评分的组织方式；接入成本判断来自本次讨论，尚未实测。
- [Inspect Harbor 文档](https://meridianlabs-ai.github.io/inspect_harbor/) 与 [仓库](https://github.com/meridianlabs-ai/inspect_harbor) — Inspect 运行 Harbor 格式任务的一手资料。
