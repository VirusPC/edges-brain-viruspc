# 三套原生 Codex 接入：实际代码对比

旧版为了复用共同 CLI worker，自写了 Inspect solver、Harbor MemoryAgent、Promptfoo Python provider。本轮已把这些执行入口替换为现成 Codex 接入；shared 保留题集、快照、判分、归一化和统计。

## 最小绑定

```python
# Inspect：现成 Codex Agent 直接作为 Task.solver。
from inspect_ai import Task
from inspect_swe import codex_cli
Task(dataset=samples, solver=codex_cli(cwd="/workspace", version="0.156.1"),
     scorer=scorer, sandbox=("docker", compose_path))
```

```bash
# Harbor：任务包已经定义 instruction、environment、verifier。
harbor run -p tasks -a codex -m openai/gpt-5.4 --ak version=0.156.1
```

```yaml
# Promptfoo：两个条件使用同一个现成 Codex provider。
providers:
  - id: openai:codex-sdk
    label: memory:off
    config:
      working_dir: ./snapshots/off
      copy_working_dir: true
      persist_threads: false
  - id: openai:codex-sdk
    label: memory:on
    config:
      working_dir: ./snapshots/on
      copy_working_dir: true
      persist_threads: false
```

以上是接口缩写，不是完整程序。可执行入口分别在 [Inspect](../inspect/inspect_eval.py)、[Harbor](../harbor/harbor_eval.py)、[Promptfoo](promptfoo_eval.py)。

## 已经消失与仍要保留的代码

| 职责 | Inspect AI + Inspect SWE | Harbor | Promptfoo |
| --- | --- | --- | --- |
| 启动原生 Agent | codex_cli() | -a codex | openai:codex-sdk |
| 已移除 | 自写 agent_solver / worker 调用 | 自写 MemoryAgent | 自写 Python provider |
| 实验接线 | Task、计时、scorer、EvalLog 映射 | 任务包、独立 verifier、Job 结果映射 | provider 配置、HOME hook、assertion、导出映射 |
| 共同业务 | 快照、题集、中性提示、judge、完整性和比较 | 同左 | 同左 |
| 重复 | Task.epochs | Job n-attempts | repeat；单次导出没有 repeatIndex 时记为第 1 次 |
| 环境 | 每 sample/epoch 新 Docker sandbox | 每 trial 新环境，另建 separate verifier | 宿主目录副本，每次新 Codex HOME |
| 模型链路 | Inspect Agent Bridge | Codex 原生链路 | Codex SDK / CLI 原生链路 |
| 运行时数据 | Inspect 模型／工具事件和 ModelUsage | Codex JSONL、ATIF、原生 timing | SDK raw turn、tokenUsage、latency、可选 tracing |

调用 Agent 的代码三者都很少。完整实验仍要冻结输入、判分并处理失败，不能把这些业务控制代码都算成原生 provider 的使用成本。

本例 Inspect 接线集中在一个 Python 文件；Harbor 拆为入口与 verifier；Promptfoo 拆为入口、beforeEach hook 和 assertion。文件数是组织选择。Promptfoo 原生接入确实省去了旧版 Node → Python provider → worker 的额外调用链，但共享评分与结果对齐仍需要代码。

## 哪些前提不相同

目录副本和新会话解决状态串扰；容器还限定 Agent 可见的文件。Promptfoo 这条原生宿主接入中，read-only 不意味着只能读当前快照，Agent 仍可能访问另一快照、题集或宿主记忆。因此 manifest 标记 controlled_filesystem=false，共同结果保留描述性统计，但 worth_default_on=null，不输出受控消融结论。

Inspect／Harbor 的 Agent 镜像只含当前条件，评分标准在宿主 scorer 或 separate verifier。Docker 路径尚需真实执行验收。Inspect SWE 默认经过 Bridge，固定模型名和 CLI 版本也不能保证与直接使用 SDK 的系统提示、请求和工具行为完全相同。

Codex 0.156.1 还有命名文件读取权限配置；当前托管环境的无模型探测被 sandbox_apply: Operation not permitted 阻断，程序没有把未经验证的配置写成已经实现的隔离。

## 对当前需求的判断

- 快速生成配置，比较题目与系统条件：Promptfoo 原生 Codex 接入直接，不必自写 provider。
- 在 Python 中增加实验阶段，并由框架管理 sample 环境与模型记录：Inspect + Inspect SWE 职责对应清楚。
- 把题目、环境和 verifier 组成可交给不同 Agent 执行的任务包：Harbor 的内置 Agent 减少了执行适配工作，任务包仍需定义。

本轮改造能说明 Promptfoo 无需经过自写 Python provider 才能评测 Codex，不能证明它在同等要求下必然最简单。需要同等读隔离时，也不能用宿主目录模式的较少配置去对比容器方案。

验证层级和复现命令见 [共同运行说明](../README.md)。SDK 协议替身不等于真实 Codex；真实模型的少量 smoke 也不等于统计可靠的 memory 收益实验。

接口依据：[Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/codex_cli.html)、[Harbor 内置 Agent](https://docs.harborframework.com/agents/pre-integrated-agents)、[Promptfoo Codex SDK](https://www.promptfoo.dev/docs/providers/openai-codex-sdk/)、[工作副本](https://www.promptfoo.dev/docs/guides/evaluate-coding-agents/)。
