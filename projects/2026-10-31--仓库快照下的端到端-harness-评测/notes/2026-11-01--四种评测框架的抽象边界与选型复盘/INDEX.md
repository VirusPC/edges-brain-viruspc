---
description: 结合四份Codex接入，按评测程序、任务包、测试矩阵和评分体系比较四个框架，并保留选型建议与证据边界。
---
# 四种评测框架的抽象边界与选型复盘

## 背景

希望构建 personal benchmark：用户提出问题后，能够快速生成可执行的评测程序，启动真实 Agent 完成任务，再验证结果。当前以仓库快照上的 memory 有无消融为具体场景，比较 Inspect AI、Harbor、Promptfoo、DeepEval 的接入方式。

此前仅按配置项、代码多少或抽象高低比较，难以解释为什么同一实验会在四个框架中呈现不同结构。完成四份接入示例并补全实验设计后，本次重新讨论它们分别标准化什么、承担哪些职责，以及适用场景。

## 主题

本次讨论将选型问题具体化为四种主要资产：评测程序、可执行任务包、测试矩阵、评分对象与指标体系。这是结合官方抽象和当前接入的归纳，不是四者互斥的能力边界，也不是效果或性能排名。

- 难点一：四个框架都能表达相同的消融实验，不能把某个示例的写法当成框架能力上限。
- 难点二：接入成本来自框架、原生 Agent adapter 和本项目的公共业务代码三部分，不能只比较文件数。
- 难点三：同样叫 Codex、使用相同模型标识，模型路由、文件系统隔离和计时范围仍可能不同。
- 难点四：需要分清“程序检查通过”“真实执行成功”“正式实验得到收益证据”三个层次。

## 过程

### 2026-10-31至2026-11-01 时刻不详 从框架配置转向真实 Agent 接入

起初关心的是在指定仓库快照下启动 harness 执行任务，而非只比较提示词和一次模型输出。随后围绕 memory off/on，分别实现四个框架的实验入口，公共层保留题集、快照、独立判分和 A/B 统计。

在用户提出“都用内置 agent provider，用 Codex”后，前三份程序改用现成接入：Inspect SWE 的 codex_cli、Harbor 内置 codex、Promptfoo 的 openai:codex-sdk。DeepEval 这份程序由项目代码调度外层 trial 并启动 CLI，再把结果交给 LLMTestCase、自定义 BaseMetric 和 evaluate。单次任务内部的推理与工具循环仍由 Codex 执行，没有在项目中重写。

这个调整减少了自写执行 wrapper 对比较的干扰。保留公共业务层的原因是统一判分和统计口径；不再把公共 worker 强加到每个框架的原生 Agent 接入中。

### 2026-11-01 时刻不详 补齐实验定义与验证边界

用户连续追问实验设置、score、仓库来源和 Docker 镜像构建，并要求从实验角度补全 README。

文档明确：默认输入是手写样例目录，两题分别为发布分支问答和算术题；不是已选定真实业务仓库的正式 benchmark。Harbor 的设计会把当前条件的快照复制进镜像，但本次尚未运行实际 Docker 构建和容器任务。

四份程序已经通过 29 项离线检查；真实 Promptfoo smoke 在指定 SDK 与登录链路下返回 model_not_found，未产生有效回答。因而接线和协议得到检查，memory 收益与框架性能尚未得到真实实验验证。完整实验说明随 PR #412 合入公开个人脑。

### 2026-11-01 时刻不详 回到四种框架的组织对象

回看同一实验的四份实现后，比较重点转为：Inspect 组织可编程实验过程，Harbor 组织任务与环境，Promptfoo 组织配置矩阵，DeepEval 组织评分对象和指标。

同时修正了两个容易误导的印象。Promptfoo 的原生 Codex provider 配置本身很短；本次额外 hook、Python assertion 和导出映射，部分来自复用公共 Python 评分、隔离 Agent 状态以及对齐共同结果的要求，因此不再把它概括为“最麻烦”。DeepEval 本次使用自定义 Metric 复用已有 judge，未充分利用其内置指标和 tracing，因此也不能据此判断它“无用”。

助手给出的当前建议是：若目标仍是仓库快照、memory 消融及自动生成评测程序，先倾向 Inspect；若主要资产变成包含环境与验收的可分发任务库，Harbor 更值得优先考虑。该建议尚未被确认成最终技术选型。

### 2026-11-01 时刻不详 将选型归纳展开为可核对的详细比较

用户在要求沉淀笔记、提 PR 并合并后，又要求“再详细一些”。因此本轮在原有记录上补充三级执行职责、四个框架的生命周期、自定义 harness 与沙箱 SDK 的区别、运行数据、评分边界和具体场景；不将扩写解释为新的最终选型决定。

扩写同时核对官方接口和既有程序，将“本次代码如何接入”与“框架还允许怎样扩展”分别描述。新增的机制解释作为本轮资料核对后的展开，原始讨论的取舍和证据边界继续保留。

## 结果

- 形成了按评测资产和职责边界比较四个框架的判断方式，并展开执行生命周期、扩展接口、数据与场景；保留了本次实现产生的实际取舍。
- 给出了面向 personal benchmark 的条件化建议，没有认定某个框架在所有场景下最好。
- 本轮产出是选型复盘笔记；正式效果实验的验证边界作为结论约束保留，不将未来实验假定为已经完成。

## 所学

### 四个框架主要标准化什么

| 框架 | 主要组织对象 | 优势及适用情形 | 本次接入中的代价与取舍 |
| --- | --- | --- | --- |
| Inspect AI | 评测程序，由 dataset、setup、solver、scorer 和可选 sandbox 组成 | 用 Python 表达和修改实验步骤，适合增加条件、执行阶段和评分流程 | 需要定义实验逻辑；本次用 Inspect SWE 接 Codex，默认经过 Bridge，解释请求与成本时要保留这个差异 |
| Harbor | 指令、环境和 verifier 组成的任务包；Agent 的一次执行形成 trial | 同一任务可长期交给不同 Agent 和执行平台，适合沉淀 benchmark 任务资产 | 需要先制作任务包和验收程序；对两道简单问答准备成本明显，但跨 Agent 复用时这些材料更有价值 |
| Promptfoo | tests、prompts、providers 和 assertions 组成的测试矩阵 | 对已有 Agent 或 API 批量比较题目、版本和配置，形成回归测试与结果表 | 受测系统需要成为 provider；复杂环境和公共评分接线仍需额外代码，不宜把这些都算作原生 provider 的成本 |
| DeepEval | test case、trace、组件和 metrics | 已有可执行应用后，建立回答质量、任务完成和组件行为的评分体系 | 本次 Codex 执行由外部循环承担，且公共 judge 已负责质量评分，因此指标体系的优势没有充分体现 |

这些是侧重点，不表示其他框架做不了同类工作。四者可以实现同一个统计实验；默认抽象影响组织方式和复用成本，但不会自动决定实验是否科学。

### 先拆清三个执行层次

“框架会运行 Agent”至少涉及三个不同层次。若把它们都叫 harness 或 runner，就容易把 adapter 的几行调用理解为框架实现了整个 Agent。

| 层次 | 负责的问题 | 本次四份实现中的责任主体 |
| --- | --- | --- |
| 实验调度 | 哪道题、哪个条件、重复几次、如何收集和评分 | Inspect eval、Harbor Job、Promptfoo eval；DeepEval 示例由项目代码先执行 trial，再调用 evaluate 评分 |
| Agent 接入 | 如何安装、配置、启动 Codex，并接回结果 | Inspect SWE codex_cli、Harbor codex adapter、Promptfoo Codex SDK provider；DeepEval 示例由项目的 run_codex 完成 |
| Agent 内部循环 | 何时请求模型、调用哪个工具、读什么文件、何时结束 | 本次均由 Codex 的内部实现负责 |

Inspect Agent Bridge 转发模型请求，使请求经过 Inspect 模型接口并进入评测记录；它不意味着 Codex 的规划和工具选择循环被改写成 Inspect 的循环。反过来，Inspect 也允许直接编写框架内的 Agent，不能把此次外部 CLI 路线当作其唯一运行模式。

因此，“DeepEval 示例需要自己写执行循环”应限定为外层 trial 调度和 CLI 生命周期；不代表要重新开发一个 Codex。Harbor、Promptfoo 的内置接入也同样是在调用现有 harness，而非自动拥有所有内部状态。

### 四个框架的生命周期具体有什么不同

#### Inspect AI 将评测过程表达为可组合的程序

dataset 定义样本；setup 准备不希望随求解策略替换的条件；solver 执行求解或接入外部 Agent；scorer 从最终状态或可见产物判断结果。sandbox 负责框架所管理环境中的命令执行，日志承接运行事件与评分。

本次把 Codex CLI 作为 solver 接入，因此公共实验步骤和执行器的对应关系很直接。以后若增加材料准备、多阶段检查或不同求解策略，主要是在同一个 Python 评测过程内调整组合。

这种可编程性也意味着实验作者需要明确每个阶段的责任。若 setup 随 solver 一起替换，可能不再是相同初始条件；若 solver 改了模型路由，指标名称相同也未必意味着被测系统相同。其优势是过程可表达，不是所有实验控制自动成立。

#### Harbor 将可运行并可验收的任务作为资产

任务声明指令、环境与 verifier；Agent 在任务环境中执行；一次尝试形成 trial；Job 组织多次尝试并收集结果。验证器按任务约定产出 reward，任务和 Agent 之间的关系比“某段 Python 代码调用某个 CLI”更明确。

本次因此需要任务目录、环境构建材料和独立 verifier。对两个问答样例，这些准备比直接启动 CLI 显得多；若同一任务会长期交给多个 Agent 或执行平台，则环境与验收可以随任务一起复用。前期工作主要在制作任务资产。

任务包的规范不等于任务已经可复现：仍需正确准备仓库快照、依赖、镜像、凭据与状态。环境能够启动、Agent 能完成任务和 verifier 能正确验收是三个分别需要验证的环节。本次 verifier 仍然判断最终回答，没有因为采用 Harbor 就自动变成代码修改或文件状态测试。

#### Promptfoo 将调用组合与断言组织成测试矩阵

测试变量进入 prompt；provider 调用模型、Agent 或应用；assertions 检查返回结果。多个输入、prompt、provider 或配置可以组成批量比较。provider 是受测系统的接入边界，不要求受测系统只进行一次模型调用。

本次内置 Codex provider 已承担 SDK 调用。额外 beforeEach hook 创建新的 Codex 状态，Python assertion 接入公共评分，导出映射补齐共同 trial 标识。它们是为了满足本项目的一致性要求，不能全部算成 Promptfoo 执行 Codex 的最低成本。

当受测对象已经是稳定 API 或函数时，配置矩阵很直接；当每次都要准备独立仓库、启动服务和收集文件产物时，provider、hook 或外部执行服务需要承担更多生命周期工作。配置能力和完整环境管理是两件事。

#### DeepEval 将可评价的结果和行为映射到指标

test case 保存输入、输出及评价上下文，Metric 判断质量；接入 tracing 时，还能将 trace 和组件 span 对应到不同评价范围。端到端结果评测与组件评测可以针对不同层次设置标准。

本次使用最直观的分工：先执行 Codex，取得最终回答及 CLI 事件；再构建 LLMTestCase，用自定义 Metric 复用公共 judge，最后调用 evaluate 生成原生结果。任务内部仍由 Codex运行，环境也未由 Metric 管理。

如果应用已经可以执行，直接接输出或在应用中接入 tracing 往往符合其组织方式。本例没有利用完整内置指标体系，也没有对 Codex 内部组件埋点，因而不能从这份代码推断 DeepEval 只会评价最终字符串，或不能参与 Agent 过程评测。

### 自定义 harness 与沙箱 SDK 要分两层适配

若自己写了类似 Pi 的 harness，首先要判断已有接口是 Python 函数、CLI、HTTP API 还是其他协议。四者都存在接入自定义执行器的路径，但不会自动理解任意协议，也不必因此重写 harness 内部循环。

| 框架 | 最小接入方向 | 接入者仍需负责什么 |
| --- | --- | --- |
| Inspect | 在 solver／Agent 中调用现有函数或 CLI；需要时再接 Agent Bridge | 输入输出映射、错误与产物；使用 Bridge 时还需满足相应模型请求协议和配置 |
| Harbor | 实现或扩展 Agent adapter；正式 Agent 接口基于 BaseAgent | 在给定 environment 中 setup／run，正确回填结果、用量或轨迹；不能只把 codex 的名字换成自定义名字 |
| Promptfoo | 自定义 provider 封装函数、CLI、API 或已有远程执行服务 | 返回约定输出，提供可用的 tokenUsage／metadata；所需环境的新建、超时与清理需有明确归属 |
| DeepEval | 保留既有执行器，将结果映射为 test case；需要组件分析时在应用中接 tracing | 执行调度、真实环境、产物采集，以及向指标提供足够的观察数据 |

沙箱 SDK 又有两个不同层次：

| 方式 | 做到了什么 | 没有自动完成什么 |
| --- | --- | --- |
| 在 solver、provider 或外部执行器里直接调用 SDK | 可以把一次 Agent 任务送到既有远程环境运行 | 框架未必掌握真实工作目录、重置、文件传输、停止进程和资源回收 |
| 将 SDK 对接成框架的环境后端 | 可以让框架按自身环境生命周期执行命令、传递文件、回收资源 | 仍需验证隔离、状态恢复和 verifier 能否读取真实产物 |

Inspect 提供 SandboxEnvironment 扩展接口；Harbor 提供 BaseEnvironment 扩展接口。对 Promptfoo 和本次 DeepEval 路线，可以由 provider 或既有应用执行层管理 SDK，但不能将“SDK 调用成功”直接写成框架已原生托管该平台。

尤其是 Harbor：若 Agent adapter 自己另外创建一个远程沙箱，而任务定义和 separate verifier 仍对应另一环境，就可能出现 Agent 在 A 环境执行、verifier 在 B 环境验收的错位。应让任务环境与真实执行环境一致，或显式同步所需状态和 artifact；不能默认评分器自然能看到另一平台上的产物。

### 相同评分协议与运行时差异

当前四份程序复用同一题集和公共判分逻辑，因此不能把分数变化解释为某个框架的评分天然更可靠。题目有效性、处理变量、独立验收、重复策略和统计解释仍由实验设计决定。

公共评分的收益是判对口径和 A/B 汇总一致，比较执行接入时更容易排除评分器差异。代价是本次没有实际比较 DeepEval 内置指标库的价值，也未充分比较其他框架原生评分生态。判断“谁的评分能力好”需要另设比较目标，不能从调用相同公共 judge 的结果推出。

运行时数据必须按观察位置和实际采集情况比较：

| 框架 | 本例实际接入的数据 | 更多观察数据的前提与局限 |
| --- | --- | --- |
| Inspect | 最终回答、EvalLog 和 ModelUsage 映射 | Bridge 能记录经过它的模型调用；没有经过 Bridge 的外部操作或私有状态不会自动变得可见 |
| Harbor | Codex JSONL artifact、原生执行时间与 verifier 结果 | 框架有轨迹和 ATIF 约定，完整程度仍取决于具体 Agent adapter 是否输出、转换或保留相应事件 |
| Promptfoo | provider 响应、SDK raw turn、用量与原生 latency | 还可接 tracing，但一次 SDK 协议 turn 不等同于一次内部 LLM 推理；外层 span 不会自动展开子进程内部全部操作 |
| DeepEval | 项目采集的 CLI 事件与用量、自定义 Metric 和 evaluate 结果 | 应用层 tracing 能观察组件；本例未对 Codex 内部组件埋点，不能把 CLI 外围调用当成已经取得内部组件 trace |

需要区分最终回答、工具与行为轨迹、模型请求、应用内部状态四种数据。外层统一返回格式可以便于存档，但不能补出底层未暴露的数据。若指标要判断工具选择或记忆读取过程，执行接口必须先提供相应证据；只根据回答正确不能证明 Agent 确实读过记忆。

成本字段也不自动可比。缓存、推理 token 是否可得以及是否包含在其他用量中，需要按适配器解释；未知明细不能补成零。Inspect sample、Harbor Agent 阶段、Promptfoo 评测步骤、DeepEval 示例的 CLI 进程，也不是完全相同的超时与计时范围。完整口径见实验 README。

本次 Promptfoo 和 DeepEval 的宿主目录副本不保证只能读取当前快照，已标记为探索性；Inspect 与 Harbor 的容器路径尚未真实执行。相同 CLI 版本、模型名或超时数值，也不能代替对模型路由、隔离和预算范围的核对。

### 跨 Agent 复用与跨执行平台复用不是一回事

跨 Agent 复用关心同一道题和同一验收能否交给不同 harness；跨执行平台复用关心环境如何创建、文件如何准备、进程如何执行、状态如何交给评分器。换了 Agent 而环境不变，与把同一个 Agent 从本机搬到远程沙箱，是不同的适配工作。

Inspect 可以分开组织 dataset、setup、solver 和 scorer；Harbor 显式分开 Task、Agent 和 Environment；Promptfoo 可替换 provider，并复用测试与断言；DeepEval 可将不同执行器产生的结果映射到相同指标。区别在标准化边界和改动位置，而非只有某个框架能复用。

复用评分规则也不等于复用了相同实验条件。若新平台可见的文件、工具权限或模型服务改变，仍需将这些差异纳入实验定义。容器镜像、任务目录和配置文件各解决一部分复现问题，都不能自动固定外部模型、权限和服务状态。

### 按期望产物选择框架

| 希望自动生成的主要产物 | 当前优先考虑 | 不优先其他路径的原因 |
| --- | --- | --- |
| 可自由调整步骤的评测程序 | Inspect AI | 当前重点是实验过程的可编程性，还未要求把每题制作成分发任务包 |
| 包含环境和验收、跨 Agent 复用的任务包 | Harbor | 若只保留评测脚本或调用配置，任务环境与验收的复用约定仍要另行维护 |
| 面向已有 Agent／API 的批量测试配置 | Promptfoo | 若执行系统已经存在，无需先额外建立完整任务环境协议 |
| 面向已有应用或 trace 的质量指标与测试 | DeepEval | 执行层已有时，优先利用指标与 tracing；不必为评分重复实现整个 Agent 运行系统 |

这些选项对应不同的主要需求，不是绝对排除其他工具。当前对 Inspect 的倾向是针对本项目目标的建议，不能替代在同等要求下的后续验证。

### 用具体 personal benchmark 场景理解取舍

| 场景 | 首先需要什么 | 优先路径与理由 | 应重新考虑的条件 |
| --- | --- | --- | --- |
| 在同一仓库上增加、删除或替换 memory，实验步骤会持续变化 | 灵活表达条件准备、执行和独立评分 | Inspect，准备与求解分离，便于在程序中修改实验阶段 | 若主要目标变成对外分发任务及其环境，Harbor 的任务资产更贴近产物 |
| 一套仓库任务长期比较 Codex、自写 Pi 类 Agent 及其他 harness | 固定任务、环境和 verifier，替换 Agent | Harbor，将任务包作为长期资产，适配成本可摊到多次运行中 | 若每题都是高度定制的研究流程且很少复用，先制作任务包未必划算 |
| 已有 Agent HTTP 服务，需要批量回归不同问题和配置 | 受测接口稳定，新增 tests 和 assertions 即可比较 | Promptfoo，provider 边界和配置矩阵直接对应工作 | 若每次调用都需要新环境及复杂清理，环境管理仍需额外实现 |
| 已有 RAG 或 Agent 应用，要区分最终质量与组件问题 | 可观测的应用调用、trace 与匹配指标 | DeepEval，围绕 test case、trace 与组件设置评价 | 若应用只是不可观测的外部 CLI，先补数据接入；换评分框架本身不会暴露内部组件 |

对“用户给定问题，快速生成 eval 并验证”，还必须生成或确认题目标准、环境说明和结果证据。只生成能导入或能启动的程序，不能证明验收器正确；问题本身也未必包含足够的正确答案依据。

因此当前建议是先确定首版产品的主要产物。若仍以“仓库快照 + memory 消融 + 可编程实验”为主，Inspect 是优先验证候选；若主要产物改变，就按上表重排优先级。该建议没有承诺迁移实现，也没有将四个框架叠加成必要架构。

### 怎样区分事实、验证与建议

| 层次 | 本次可以说什么 | 不能由此推出什么 |
| --- | --- | --- |
| 代码事实 | 三份示例用现成 Codex adapter／provider，DeepEval 示例由外层代码先调用 CLI | 这些接法是各框架唯一允许的接法 |
| 离线检查 | 29 项检查覆盖了若干输入隔离、配置、协议、判分和报告逻辑 | 模型已经执行成功、Docker 链路已经验收、memory 已经有效 |
| 真实 smoke | 指定 SDK＋登录链路返回了 model_not_found | 所有账号、模型、框架和其他鉴权路由都不可用 |
| 选型建议 | 对本项目当前目标倾向先验证 Inspect，并按产物调整候选 | 已最终确定框架，或有同等条件下的性能／效果排名 |

## 行动指南

### 主题行动指南

#### 背景

当用户希望从问题快速生成评测并验证时，框架选择会影响最终要生成、保存和复用的内容。

#### 核心问题

先确定产品要沉淀哪种资产，以及哪些执行和评分职责已经由现有系统承担，再判断框架是否合适。

#### 核心解决方案

1. 明确主要产物是评测程序、任务包、测试配置还是质量指标。四种方式都保留为候选，不按流行度、代码行数或笼统的抽象高低直接淘汰。
2. 用同一个业务实验检查接入边界。现成 Agent adapter 可用时优先纳入比较；公共层保留题集、评分和统计，不为了统一形式而覆盖各框架的执行能力。
3. 按同等隔离、模型路由、预算和数据采集要求比较接入成本。若环境尚不等价，先把差异写明，不把宿主目录副本的较少配置直接当成容器方案的替代证据。
4. 按产物选择优先路径：流程经常变化时考虑 Inspect；任务要跨 Agent 分发时考虑 Harbor；已有系统做配置回归时考虑 Promptfoo；已有应用做质量与组件评测时考虑 DeepEval。暂不为了覆盖所有能力而同时叠加四个框架。
5. 分开验收程序接线、真实执行与实验结论。先验证输出可追溯、评分可核对，再解释效果；离线协议检查不能替代真实模型实验。

#### 验收标准

- 能说明受测对象、输入条件、独立验收方式与比较单位。
- 能分别说明外层 trial 调度、adapter 启动和 harness 内部循环的责任主体。
- 若使用沙箱 SDK，能说明谁负责创建、文件准备、执行、超时、产物传递和回收，且评分器验收的是同一次真实执行。
- 能说明生成的产物将如何复用，以及为何当前优先这一种。
- 能区分实际测量结果、尚未验证的假设和选型建议。
- 运行数据的来源、隔离范围、模型路由和预算差异有明确记录。

### 细节与其他

#### 若继续本项目的 memory 消融

则以既有实验说明和四份程序作为比较依据，按同一框架内的 off/on 解读结果。当前可优先验证 Inspect 的程序生成路径；若需求转为任务库分发，再提高 Harbor 的优先级。不要把已有两题样例或离线检查扩写成真实收益结论。

#### 若后续又觉得某个框架代码特别多

则先拆出任务定义、执行接入、隔离、判分和导出映射的成本。若额外代码来自统一公共语言或结果格式，需把它与框架原生最小接入区分；不直接用文件数给框架排序。

#### 若只取得 Agent 的最终回答

则按黑盒结果评测，记录可获得的用量和耗时。需要分析内部组件时再接入 tracing 或对应事件源，不把缺失的内部数据补成已经观察到的轨迹。

#### 若需要把四份实现与标准接口对应起来

则可用下面的接口片段理解绑定位置。它们使用真实接口或项目已有函数名，但省略导入、数据构造、凭据与完整环境准备，不是可直接复制执行的完整程序；可运行版本以同项目程序为准。

```python
# Inspect：由 Task 绑定样本、准备、求解、评分和 sandbox。
task = Task(
    dataset=samples,
    setup=memory_setup(),
    solver=codex_cli(cwd=workspace, version=codex_version),
    scorer=result_scorer(condition, judge),
    sandbox=sandbox_config,
)
# eval_async 调度 Task；Codex 保留自己的内部工具循环。
logs = await eval_async([task], model=inspect_model)
```

```text
# Harbor：先生成任务包，由 Job 运行 Agent 并调用 verifier。
任务目录/
  instruction.md
  task.toml
  environment/Dockerfile
  tests/test.sh
```

```bash
# TASKS 指向准备好的任务集合，MODEL 是可用模型路由。
harbor run -p "$TASKS" -a codex -e docker -m "$MODEL"
```

```yaml
# Promptfoo：配置片段；tests、完整 prompt 和 assertion 由实验生成器提供。
providers:
  - id: openai:codex-sdk
    label: memory:on
    config:
      working_dir: /path/to/snapshot-on
      copy_working_dir: true
      persist_threads: false
```

```python
# DeepEval：先运行既有 Codex 执行器，再交给 test case 与 Metric。
raw = run_codex(args, workspace, case["question"])
test_case = LLMTestCase(
    input=build_prompt(case["question"]),
    actual_output=raw["answer"],
    metadata=controller_metadata,  # 评分所需的可信 case、raw、condition 等。
)
# 本项目 Metric.measure() 内部调用 shared.score_result()。
result = evaluate(test_cases=[test_case], metrics=[SharedMemoryMetric(args.judge)])
```

#### 若要为自写 harness 接入远程沙箱 SDK

则先按现有执行器的接口做最小接入，再判断是否需要框架原生环境后端。选择只封装 SDK 时，要显式保留环境 ID、状态和 artifact 的关联；需要框架接管重置、命令执行与回收时，再实现对应环境契约。两种路径都可评估，不为了少写一个环境 adapter 而让 Agent 和 verifier 看到不同任务状态。

#### 若准备把生成器做成面向用户的产品

则每次生成后至少审阅问题、独立验收标准、执行环境、版本记录与结果报告是否齐全。优先生成一种主要框架的完整资产；其他候选保留为不同需求下的选项，不以“同时支持四框架”代替首条真实链路验收。

## 补充说明

### 原始材料引用

- 原始对话：2026-10-31至2026-11-01，与 Codex 的本次项目会话。关键原话包括“不同框架本质是不同的问题定义，不同的数学建模”“我以后希望做的是，personal benchmark。用户给定问题，可以快速生产eval程序并验证”“现在回过头来再对比一下四种评测框架”“沉淀笔记”。这些表述保留了比较目的及本篇整理的直接来源。
- [PR #412](https://github.com/VirusPC/edges-brain-viruspc/pull/412) — 四份实验程序、项目调研与完整实验设计，已合入公开个人脑。
- [合并提交 4b905138](https://github.com/VirusPC/edges-brain-viruspc/commit/4b905138e117f4b42de5cb284d1efaffc99fbad9) — 固定本次复盘所依据的项目版本；其程序目录中的 README 和 VALIDATION 记录了协议及验证边界。

### 同项目材料

- [实验设计与复现说明](../../programs/README.md) — 样例来源、变量、评分、统计、运行方式与证据边界。
- [验证记录](../../programs/VALIDATION.md) — 29 项离线检查及真实模型、容器链路的实际状态。
- [Harbor 与 Inspect 深入对比](../2026-10-31--harbor-与-inspect-深入对比/INDEX.md) — 两者的执行、隔离、材料加载和任务资产对照。
- [Harbor 与 Inspect 架构伪代码](../2026-10-31--harbor-与-inspect-架构伪代码/INDEX.md) — 公共实验与框架接口如何绑定。
- [Personal Benchmark 的实践趋势与记忆消融定位](../2026-10-31--personal-benchmark-的实践趋势与记忆消融定位/INDEX.md) — 此前对目标和现有实验的澄清。

### 官方接口依据

- [Inspect Tasks](https://inspect.aisi.org.uk/tasks.html) 与 [Agent Bridge](https://inspect.aisi.org.uk/agent-bridge.html) — 评测程序的组成及模型接入。
- [Harbor Core concepts](https://docs.harborframework.com/core-concepts) — task、agent、sandbox、verifier、trial、job 与 trajectory 的定义。
- [Promptfoo 配置](https://www.promptfoo.dev/docs/configuration/guide/) 与 [Codex SDK provider](https://www.promptfoo.dev/docs/providers/openai-codex-sdk/) — 测试矩阵和真实 Agent 接入。
- [DeepEval 端到端评测](https://deepeval.com/docs/evaluation-end-to-end-single-turn) 与 [组件评测](https://deepeval.com/docs/evaluation-component-level-llm-evals) — test case、trace 和 metrics 的组织方式。

- [Inspect 自定义 sandbox](https://inspect.aisi.org.uk/extensions-sandboxes.html) — SandboxEnvironment 扩展边界，区别于在 solver 内部直接调用外部 SDK。
- [Harbor 自定义 Agent](https://docs.harborframework.com/agents/custom-agents) — Agent 与 environment 的正式接入关系。
- [Promptfoo Python provider](https://www.promptfoo.dev/docs/providers/python/) 与 [tracing](https://www.promptfoo.dev/docs/tracing/) — 自定义受测系统和观察数据的接入位置。
- [DeepEval tracing](https://deepeval.com/docs/evaluation-llm-tracing) — trace、span 与组件级评价范围的对应关系。

以上官方接口已在本次对话重新核对；概念侧重点和选型倾向为本次讨论的归纳，不是官方的四框架排名。
