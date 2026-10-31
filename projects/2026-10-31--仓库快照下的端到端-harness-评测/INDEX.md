# 仓库快照下的端到端 Harness 评测

## 归属与依赖

本项目属于公开个人大脑：保存评测框架选型、personal benchmark 调研及 memory 消融试验程序。仅正式纳入 Edges 的通用实现才进入框架仓。2026-10-31 从框架工作树迁入个人脑独立工作树。

程序复用 Edges 已有评测模块；共同工作区内自动发现 edges/，独立检出时显式设置 EDGES_ROOT。

## 背景

希望评测 Agent 在真实仓库中完成任务的能力：从指定仓库快照启动真实 harness，输入任务提示词，让 Agent 读取规则、技能与记忆、调用工具并产生结果，再独立验证任务是否完成。仅比较提示词与单次模型输出，无法覆盖这条执行链路。

## 目标

为 Edges 探索可复现的端到端 harness 评测接入方式，支持比较仓库内规则、skills、memory 等材料变化对任务完成质量与执行成本的影响。

## 已明确的需求

- 每次试验从指定仓库 commit 和干净环境开始。
- 启动真实 Agent harness，而非只调用一次 LLM。
- 输入任务提示词，允许 Agent 在仓库中实际执行任务。
- 执行结束后验证结果；保留可追溯的配置、产物与执行记录。
- 以仓库快照、环境、harness 版本与配置、模型、任务及预算共同描述一次试验。

## 候选方案

- [Harbor](https://github.com/harbor-framework/harbor)：任务由 instruction、environment 和 verifier 组成；可接入现有 CLI Agent 或自定义 harness。优先调研，不代表已完成选型。
- [Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai) 与 [Inspect SWE](https://github.com/meridianlabs-ai/inspect_swe)：在 sandbox 中启动真实 Agent，通过 Agent Bridge 接入模型调用与评测记录。
- [Promptfoo](https://github.com/promptfoo/promptfoo)：直接使用 openai:codex-sdk 启动 Codex；Python assertion 接入共同 judge，正式 hook 隔离每次 Codex HOME。
- [SWE-bench](https://github.com/SWE-bench/SWE-bench)：可参考仓库任务和补丁验证方式；其补丁评测入口与 Agent 执行层需要区分。

## 后续推进

1. 先盘点 Edges 已有 evaluation 实现、评测 Skill 和相关任务，确认可复用能力及接入边界。
2. 明确首个任务、仓库快照、受测 harness 和独立验收方式。
3. 比较候选方案对快照恢复、材料加载、执行隔离、轨迹和产物采集的支持。
4. 明确范围后再制定实施方案，验证一条从快照恢复到结果评分的完整链路。

## 待确认

- 首版使用哪个 Agent harness，以及固定哪些模型和版本。
- 首批评测是代码修改、问答、技能执行，还是其他仓库任务。
- 需要比较哪些 harness 材料，如何控制其他变量。
- 与现有评测能力及实验发起服务的职责关系。

## 当前状态

2026-10-31 完成四套框架程序；前三套使用原生 Codex 接入示例：Inspect SWE 的 codex_cli()、Harbor 内置 codex、Promptfoo 的 openai:codex-sdk；DeepEval 单独调用 CLI，再用 LLMTestCase、BaseMetric、evaluate() 评分。此前自写 Agent worker、MemoryAgent 和 Python provider 已从当前程序移除；shared 保留题集、快照、独立判分、结果归一化和 A/B 统计。

- 框架代码分别放在 programs/inspect/、programs/harbor/、programs/promptfoo/、programs/deepeval/，互不导入。
- 29 项离线检查通过：shared 17、Inspect 2、Harbor 2、Promptfoo 2、DeepEval 6。Promptfoo 实际框架和 Codex SDK 经测试 CLI 协议替身完成 8 次调用；Inspect／Harbor 完成真实 SDK 对象、Task 包和 verifier 检查。这些不代表真实 Codex／模型执行。
- 原生链路不完全相同：Inspect SWE 使用模型 Bridge，Harbor／Promptfoo 使用 Codex 原生链路。Promptfoo／DeepEval 宿主目录副本的读隔离较弱，结果明确标记为探索性，不输出 memory 默认开启建议。
- Docker 端到端尚未完成。真实模型 smoke 已获授权，最终执行情况记录在 programs/VALIDATION.md。

## 来源

本项目源于 2026-10-31 的对话：用户提出“在某个仓库快照下，开启 harness，输入提示词执行任务”的评测需求，并要求在 Edges 框架仓建立 project。

- [Harbor 任务结构](https://docs.harborframework.com/tasks/overview)
- [Harbor 自定义 Agent](https://docs.harborframework.com/agents/custom-agents)
- [Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/)

## 调研材料

- [Harbor 与 Inspect 深入对比](<notes/2026-10-31--harbor-%E4%B8%8E-inspect-%E6%B7%B1%E5%85%A5%E5%AF%B9%E6%AF%94/INDEX.md>) — 基于官方文档与固定提交源码，对比真实 Agent 执行、快照、材料加载、评分、轨迹、长期记忆及 Edges 接入边界。

- [Personal Benchmark 的实践趋势与记忆消融定位](<notes/2026-10-31--personal-benchmark-%E7%9A%84%E5%AE%9E%E8%B7%B5%E8%B6%8B%E5%8A%BF%E4%B8%8E%E8%AE%B0%E5%BF%86%E6%B6%88%E8%9E%8D%E5%AE%9A%E4%BD%8D/INDEX.md>) — 记录个人评测集的公开实践信号、热度判断边界，以及现有记忆消融实验的 Inspect 接入澄清。

- [Harbor 与 Inspect 架构伪代码](<notes/2026-10-31--harbor-%E4%B8%8E-inspect-%E6%9E%B6%E6%9E%84%E4%BC%AA%E4%BB%A3%E7%A0%81/INDEX.md>) — 用相同 memory 消融业务函数，展示通用架构、两框架的配置绑定及实际调度调用关系。

## 实验程序

- [Memory 有无消融程序与运行说明](programs/README.md) — 四个框架的统一接口对照，保留共同题集、快照、判分与统计；说明模型链路、读隔离和验证层级的差异。
- [Inspect 程序](programs/inspect/README.md) — Inspect SWE codex_cli()、Task、scorer、依赖与测试。
- [Harbor 程序](programs/harbor/README.md) — 任务包、内置 codex、独立 verifier、依赖与测试。
- [Promptfoo 程序](programs/promptfoo/README.md) — 原生 Codex SDK、HOME hook、assertion、Node 依赖与协议测试。
- [Promptfoo 与 Inspect 代码及实测对比](programs/promptfoo/COMPARE_INSPECT.md) — 同一 shared 底层的框架接口、容器生命周期、数据和接入成本对比。
- [公共底层](programs/shared/README.md) — 四套程序共用的快照、题集、判分、结果归一化、比较及测试数据；不执行 Agent，不依赖框架 SDK。

- [DeepEval 程序](programs/deepeval/README.md) — 独立 CLI、LLMTestCase、自定义 Metric、evaluate() 与离线检查。
