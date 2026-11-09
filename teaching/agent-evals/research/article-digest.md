# 文章摘要：Demystifying evals for AI agents

> 研究笔记（只读整理）。仅收录原文明确写出的内容；不确定处已标注。

## 元信息

| 字段 | 内容 |
| --- | --- |
| 标题 | Demystifying evals for AI agents |
| URL | https://www.anthropic.com/research/demystifying-evals-for-ai-agents |
| 发布日期 | 2026-01-09（原文页眉：Jan 9, 2026） |
| 作者 | Mikaela Grace, Jeremy Hadfield, Rodrigo Olivares, Jiri De Jonghe（Acknowledgements） |
| 团队标签 | Engineering（Topics: Agents, Measurement and mitigation, Benchmarks, Claude Code） |
| 抓取时间 | 2026-11-09 Asia/Shanghai |

**不确定 / 说明**

- 页面路径在 `/research/` 下，工程站也有同文入口；以 research URL 为准。
- Acknowledgements 还列出多名贡献者与客户合作方；上表仅列 “Written by” 四人。

---

## 1. Introduction

**核心主张**

- 好的评估让团队更有信心发布 agent；没有评估容易陷入生产中才发现问题、修一个坏另一个的被动循环。
- Agent 多轮调用工具、改状态、根据中间结果适应；这些能力也让评估更难。
- 经验来自 Anthropic 内部与前沿客户部署。

**短引**

> “Good evaluations help teams ship AI agents more confidently.”

> “These same capabilities that make AI agents useful—autonomy, intelligence, and flexibility—also make them harder to evaluate.”

**关联**：文中指向 *Building effective agents*。

---

## 2. The structure of an evaluation

**Eval 定义**

- Eval = 给 AI 输入，再用 grading logic 打分测成功。
- 本文聚焦**开发期可自动跑、不依赖真实用户**的评估。
- 早期 LLM 多为单轮；现在多轮更常见。
- Agent eval 更复杂：多轮工具、环境状态累积、错误会传播；前沿模型还可能找到超越静态题面的创造性解法（例：Opus 4.5 在 τ2-bench 订票题发现政策漏洞——按题面“失败”，对用户却可能更好）。

### 2.1 关键定义（原文术语，勿增改）

| 术语 | 原文要点 |
| --- | --- |
| **task**（problem / test case） | 单一测试：有定义好的输入与成功标准 |
| **trial** | 对 task 的一次尝试；因输出有随机性，常跑多次 |
| **grader** | 对表现某方面打分的逻辑；一个 task 可有多个 grader，每个可有多个 assertion（checks） |
| **transcript**（trace / trajectory） | trial 的完整记录：输出、工具调用、推理、中间结果等；Anthropic API 上即 eval 结束时的完整 messages |
| **outcome** | trial 结束时**环境最终状态**（例：说“已订票”≠ outcome；库里是否有 reservation 才是） |
| **evaluation harness** | 端到端跑 eval 的基础设施：指令/工具、并发、记录、打分、汇总 |
| **agent harness**（scaffold） | 让模型成为 agent 的系统：处理输入、编排工具、返回结果；评“一个 agent”= 评 harness + model。例：Claude Code；长跑 harness 用 Agent SDK 原语 |
| **evaluation suite** | 测特定能力/行为的 task 集合；通常共享大目标（例：客服套件测退款、取消、升级） |

**短引**

> “When we evaluate ‘an agent,’ we’re evaluating the harness and the model working together.”

> “A flight-booking agent might say ‘Your flight has been booked’ at the end of the transcript, but the outcome is whether a reservation exists in the environment’s SQL database.”

---

## 3. Why build evaluations?

**何时需要**

- 早期靠手工测、dogfooding、直觉也能走很远；eval 看似拖慢发布。
- 上线并开始扩规模后，没有 eval 会崩：用户说“改完更差了”，团队“flying blind”。
- 无 eval 的调试是被动：等投诉 → 手工复现 → 修 → 祈祷没别的回归。

**案例（原文）**

- **Claude Code**：先靠员工与外部用户快速迭代；后加 eval（先 concision / file edits，再 over-engineering 等）；配合生产监控、A/B、用户研究。
- **Descript**：按“don’t break things / do what I asked / do it well” 三维；从人工打分 → 产品定标准的 LLM grader + 周期性人工校准；质量基准套件与回归套件分开跑。
- **Bolt AI**：产品已广泛使用后建 eval；约 3 个月做出：静态分析、browser agents 测应用、LLM judges（如指令遵循）。

**其它收益**

- 早期写 eval 逼产品把“成功”说清楚；后期维持质量条。
- 无 eval 时换新模型可能要数周摸底；有 eval 可在几天内看强弱、调 prompt、升级。
- 有了静态 task 库，延迟、token、单任务成本、错误率等基线与回归几乎“白送”。
- Eval 可成为产品与研究之间最高带宽的沟通渠道。
- **成本前置可见、收益后置累积**，容易低估。

**短引**

> “Evals also shape how quickly you can adopt new models.”

> “Their compounding value is easy to miss given that costs are visible upfront while benefits accumulate later.”

---

## 4. How to evaluate AI agents

常见 agent 类型（原文列举）：coding、research、computer use、conversational。行业不同，但评估手法可复用。

### 4.1 Types of graders for agents

三类：`code-based` / `model-based` / `human`。各自评 transcript 或 outcome 的一部分。

#### Code-based graders

| Methods（原文） | Strengths | Weaknesses |
| --- | --- | --- |
| String match；Binary tests（fail-to-pass, pass-to-pass）；Static analysis（lint/type/security）；Outcome verification；Tool calls verification；Transcript analysis（turns、tokens） | Fast, cheap, objective, reproducible, easy to debug；Verify specific conditions | Brittle to valid variations；Lacking nuance；Limited for subjective tasks |

#### Model-based graders

| Methods | Strengths | Weaknesses |
| --- | --- | --- |
| Rubric-based scoring；Natural language assertions；Pairwise comparison；Reference-based evaluation；Multi-judge consensus | Flexible, scalable；Captures nuance；Open-ended / freeform | Non-deterministic；More expensive；Needs calibration with humans |

#### Human graders

| Methods | Strengths | Weaknesses |
| --- | --- | --- |
| SME review；Crowdsourced judgment；Spot-check sampling；A/B testing；Inter-annotator agreement | Gold standard；Matches expert judgment；Calibrate model graders | Expensive, slow；Often needs experts at scale |

**计分方式**：weighted（加权达阈值）、binary（全部通过）、或 hybrid。

### 4.2 Capability vs. regression evals

| 类型 | 问的问题 | 期望 pass rate | 作用 |
| --- | --- | --- | --- |
| **Capability / quality** | “What can this agent do well?” | 起步应**偏低**；找还做不好的题当 hill to climb | 推动能力提升 |
| **Regression** | “Does the agent still handle all the tasks it used to?” | 应接近 **100%** | 防回退；分数下降=坏了 |

- 爬 capability 的同时要跑 regression，避免改坏别处。
- 上线优化后，高 pass 的 capability 可 **graduate** 成持续跑的 regression；从“能不能做”变成“还能不能稳定做”。

### 4.3 Evaluating coding agents

- 写/测/调代码，导航仓库、跑命令。
- 有效 eval：明确任务、稳定测试环境、对生成代码做充分测试。
- 确定性 grader 很自然：代码跑不跑得起来、测试过不过。
- 基准：**SWE-bench Verified**（GitHub issue → 跑测试；修失败测试且不破坏已有测试才过）；一年内约 40% → >80%。**Terminal-Bench**：端到端技术任务（如从源码编 Linux 内核、训 ML 模型）。
- 有 pass/fail 测 outcome 后，也常再评 transcript：启发式代码质量；带清晰 rubric 的 model grader（工具调用方式、与用户交互等）。

**示意 YAML**（原文强调“展示全貌”；实践上 coding 多靠 unit tests + LLM rubric，其余按需）：`deterministic_tests`、`llm_rubric`、`static_analysis`、`state_check`、`tool_calls`；tracked：`n_turns`、`n_toolcalls`、`n_total_tokens`、latency 等。

### 4.4 Evaluating conversational agents

- 客服/销售/教练等；有状态、工具、对话中途可行动。
- 交互质量本身是评估对象；常需**第二个 LLM 模拟用户**（Anthropic 对齐审计 agent 用对抗长对话）。
- 成功多维：工单是否 resolved（state）、是否 <10 turns（transcript）、语气是否合适（LLM rubric）。
- 基准：**τ-Bench** 与 **τ2-Bench**（零售支持、航司订票等）。

示意 graders：`llm_rubric`（共情、解释清晰、 grounded in fetch_policy）、`state_check`、`tool_calls`、`transcript.max_turns`。实践上 conversational 多靠 model-based 评沟通质量与目标完成，因常有多种“正确答案”。

### 4.5 Evaluating research agents

- 收集/综合/分析 → 答案或报告；质量相对任务而言，难有二元 unit test。
- 挑战：专家对“全面”可能分歧；参考内容常变；长开放输出更容易错。
- **BrowseComp**：网上找针；题易验、难解。
- 策略：组合 grader——groundedness / coverage / source quality；客观事实可用 exact match；LLM 可标 unsupported claims 与缺口，并评综合的连贯与完整。
- LLM rubric 需**频繁对照专家人工**校准。

### 4.6 Computer use agents

- 经 GUI（截图、鼠标键盘滚动）而非 API。
- 需真实或沙箱环境；查是否达成意图。
- **WebArena**：URL/页面状态 + 后端状态（是否真下单）。
- **OSWorld**：全 OS；事后检查文件、配置、DB、UI 属性。
- Browser：DOM 快但吃 token；截图慢但更省 token。Claude for Chrome 用 eval 检查是否在正确上下文选正确工具。

### 4.7 Non-determinism：pass@k vs pass^k

- 行为有随机性；每题有自己的成功率；一次过下次可能挂。
- 有时关心的是**多次 trial 中成功比例**。

| 指标 | 含义 | k↑ 时 | 适用 |
| --- | --- | --- | --- |
| **pass@k** | k 次中**至少一次**成功的概率 | 上升 | 一次成功即可（如 coding 找解）；常关心 pass@1 |
| **pass^k** | **全部** k 次都成功的概率 | 下降 | 面向客户、要求每次可靠 |

例：单次成功率 75%，k=3 → pass^3 ≈ (0.75)³ ≈ 42%。

> “At k=1, they're identical… By k=10, they tell opposite stories: pass@k approaches 100% while pass^k falls to 0%.”

---

## 5. Roadmap：Going from zero to one

### Collect tasks

**Step 0. Start early**

- 不必等几百题；**20–50** 道来自真实失败的简单题就很好。
- 早期改动效果大，小样本够；成熟 agent 再加大加难。
- 等太久会从线上系统反推成功标准，更难。

**Step 1. Start with what you already test manually**

- 发版前手工检查、用户常见任务；已上线则看 bug tracker / support queue；按用户影响排序。

**Step 2. Write unambiguous tasks with reference solutions**

- 好题：两名领域专家会独立给出相同 pass/fail。
- 专家自己能不能做？不能则题需改。
- grader 检查的一切应从题面清楚；别因歧义罚 agent。
- 前沿模型上 **0% pass@100** 多半是坏题/坏 grader，不是 agent 无能。
- 每题做 **reference solution**：证明可解且 grader 配正确。

**Step 3. Build balanced problem sets**

- 测“该发生”也测“不该发生”；单边 eval → 单边优化。
- 例：Claude.ai web search——既测该搜（天气），也测不该搜（谁创办了 Apple）。

### Design harness and graders

**Step 4. Robust eval harness + stable environment**

- Eval 中的 agent 应大致等于生产 agent；环境勿引入额外噪声。
- 每次 trial **隔离**、干净环境；共享状态（残留文件、缓存、资源耗尽）会造成相关失败或虚高（例：偷看上一 trial 的 git history）。
- 多 trial 因同一环境限制（如内存）失败 → 非独立 → 结果不可靠。

**Step 5. Design graders thoughtfully**

- 优先确定性；必要处用 LLM；人工用于额外校验。
- **勿过度刚性检查具体步骤顺序**；常惩罚创造性合法路径 → **评产出，少评路径**。
- 多组件任务给 **partial credit**。
- LLM judge 与人类专家校准；给 “Unknown” 出口；分维度隔离 judge。
- 警惕 grading bugs / harness 约束 / 歧义压低分数：
  - Opus 4.5 在 CORE-Bench：修题与 scaffold 后约 42% → 95%。
  - METR time horizon：题面要求达到阈值，grader 却要求**超过**阈值。
- 防作弊：通过必须真正解题。

### Maintain long-term

**Step 6. Check the transcripts**

- 不读 transcript 与分数就不知道 grader 是否在干活。
- Anthropic 投入 transcript 查看工具并定期阅读。
- 失败应显得**公平**；分数不涨时要确信是 agent 而非 eval。

**Step 7. Monitor for capability eval saturation**

- 100% 只能追回归，没有改进信号。
- SWE-Bench Verified：年初约 30%，前沿现 >80% 近饱和。
- 饱和后分数小涨可能掩盖大能力提升（例：Qodo 最初对 Opus 4.5 印象一般，因 one-shot coding eval 没抓住长任务增益，后做新 agentic eval）。
- **规则**：有人挖细节、读过部分 transcript 前，不把分数当表面值。

**Step 8. Keep suites healthy：open contribution + ownership**

- Suite 是活资产，需持续维护与明确所有权。
- Anthropic：专门 eval 团队拥有核心基础设施；领域专家与产品贡献多数 task 并自己跑。
- AI 产品团队应像维护单元测试一样维护 eval。
- **Eval-driven development**：先建测计划能力的 eval（低 pass），再迭代到 agent 做得到；新模型一出跑 suite 看哪些 bet 兑现。
- 最懂需求与用户的人最适合定义成功；可让 PM/CSM/销售用 Claude Code 以 PR 贡献 task。

---

## 6. How evals fit with other methods（Swiss Cheese）

| Method | Pros（摘要） | Cons（摘要） |
| --- | --- | --- |
| Automated evals | 快、可复现、无用户影响、可每 commit、可规模测 | 前期投入；需维护防漂移；可能与真实用法脱节 → 虚假信心 |
| Production monitoring | 真实行为规模；抓合成 eval 漏的 | 被动；噪声；要埋点；常缺 grading 真值 |
| A/B testing | 真实结果（留存等）；可控制混淆 | 慢；需流量；难深挖 why |
| User feedback | 未预期问题；真实例子 | 稀疏自选择；偏严重；少解释 why；非自动 |
| Manual transcript review | 建立失败直觉；抓细微质量；校准“好” | 耗时；难扩；覆盖不均；疲劳；偏定性 |
| Systematic human studies | 金标准；主观任务；校准 model grader | 贵慢；难频繁；需协调标注者；复杂域要专家 |

**阶段映射（原文）**

- 上线前与 CI/CD：automated evals 第一道防线。
- 上线后：production monitoring。
- 有足够流量：A/B。
- 持续：用户反馈 + 每周抽样读 transcript。
- 系统人工研究：校准 LLM grader 或主观输出。

> “Like the Swiss Cheese Model… failures that slip through one layer are caught by another.”

---

## 7. Conclusion（要点复述）

- 无 eval → 被动循环；早投入 → 失败变用例、用例防回归、指标替猜测。
- 模式因 agent 类型而异，基本功不变：早开始、从真实失败取材、无歧义标准、认真设计并组合 grader、题够难、提高信噪比、**读 transcript**。
- 领域仍早期；更长任务、多智能体、更主观工作需继续演进方法。

---

## 8. Appendix: Eval frameworks（原文提及）

| 框架 | 原文定位 |
| --- | --- |
| **Harbor** | 容器化环境跑 agent；云上规模化 trial；标准化 task/grader；Terminal-Bench 2.0 经 Harbor registry |
| **Braintrust** | 离线评估 + 生产可观测 + 实验；`autoevals` 预置 scorer |
| **LangSmith** | tracing、离线/在线评估、数据集；紧贴 LangChain |
| **Langfuse** | 类似能力的自托管 OSS，适合数据驻留要求 |
| **Arize** | Phoenix（OSS tracing/调试/评估）；AX（SaaS 扩展） |

> “Frameworks… are only as good as the eval tasks you run through them… invest your energy in the evals themselves…”

---

## 与 Edges / Codex 记忆 harness 的对照提示（非原文，标为教学备注）

以下**不是**文章内容，供后续课对照用：

- 评的是 **agent harness + model**，不是裸模型 → Edges memory/harness 应作为被评条件之一。
- 同时看 **transcript** 与 **outcome**（环境最终状态）。
- Memory QA / 有无 Edges 的对比适合 **配对比较** + 多 trial（pass@k / pass^k 按产品目标选）。
- Capability（难任务、低 pass）与 Regression（已过任务、近 100%）分开建套件。
