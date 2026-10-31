# Harbor 与 Inspect 深入对比

调研日期：2026-10-31。范围是固定仓库快照、启动真实编码 Agent、输入任务、验证结果，以及对规则、skills 和 memory 做对照实验。以下区分官方支持、源码行为与针对 Edges 的选型判断；没有运行真实付费评测，性能和接入工作量尚未经实测。

## 结论

两条路线都能满足基本执行链路。针对 Edges 当前以“仓库中的 harness 材料是否改善真实任务执行”为中心的目标，建议优先验证 Harbor；当研究需要统一模型调用配置、调用级预算、干预或复杂 Python 评分流程时，Inspect AI + Inspect SWE 更值得优先考虑。这是基于接口与实现的建议，尚未形成正式架构决策。

Harbor 以可独立分发的任务包、Agent 适配器、环境和 verifier 组织评测。Inspect AI 以 Dataset、Sample、Solver/Agent、Scorer 组织实验，Inspect SWE 把现成 CLI Agent 接到其中。两者都启动真实 Agent，但其默认适配配置都会成为实验条件。[Harbor 任务](https://docs.harborframework.com/tasks/overview)、[Harbor 自定义 Agent](https://docs.harborframework.com/agents/custom-agents)、[Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/)

## 调研版本

GitHub API 在调研时返回的默认分支 HEAD 如下；源码证据固定到这些提交，官方在线文档仍可能继续变化。

| 仓库 | 提交 | 提交时间 UTC |
| --- | --- | --- |
| Harbor | `5eb713ff9500daced4e143b98765a7c732744a1b` | 2026-10-31 02:35:25 |
| Inspect AI | `7340817a6fb5eb20c14520d13ce8c146d2d893c8` | 2026-10-30 20:18:04 |
| Inspect SWE | `7804cf7417999fcb743c48722e679ed3b5fe4d8d` | 2026-10-30 13:59:13 |

[Harbor 提交](https://github.com/harbor-framework/harbor/commit/5eb713ff9500daced4e143b98765a7c732744a1b)、[Inspect AI 提交](https://github.com/UKGovernmentBEIS/inspect_ai/commit/7340817a6fb5eb20c14520d13ce8c146d2d893c8)、[Inspect SWE 提交](https://github.com/meridianlabs-ai/inspect_swe/commit/7804cf7417999fcb743c48722e679ed3b5fe4d8d)。

## 核心比较

| 维度 | Harbor | Inspect AI + Inspect SWE | 对本项目的影响 |
| --- | --- | --- | --- |
| 评测基本单元 | instruction + environment + verifier 的任务包；trial 是一次尝试 | Sample + Agent/Solver + Scorer；SWE 是 CLI Agent 扩展 | Harbor 更适合把仓库任务做成可搬运资产；Inspect 更适合在 Python 中组合实验逻辑 |
| 真实执行 | installed Agent 在任务环境内启动 CLI；也支持外部 Agent loop | SWE 在 Sample sandbox 内启动真实 CLI | 两者都覆盖工具调用、文件读取和修改 |
| 模型调用 | 已核实的 Claude/Codex installed 适配器按连接配置调用服务；标准启动路径无需 Inspect 式统一模型代理 | 模型调用经 Inspect bridge，使用 Inspect provider 和配置 | 原生运行配置保真与统一调用控制的取舍是主要差异 |
| 仓库快照 | 在镜像或环境构建中准备指定 commit | 在 sandbox 镜像、setup 或文件准备步骤中准备指定 commit | 都需要编写任务环境；仓库 URL 不是完整实验定义 |
| skills / memory | 支持任务内 skills、job skills 注入；Claude 另有 memory_dir；能力随 Agent 集成而异 | SWE 暴露 skills、MCP、cwd、env 等；有适配器默认改动 | 必须核对文件实际加载位置与有效配置 |
| 结果评分 | test.sh 输出单值/多维 reward；支持独立 verifier、定制 Python verifier、LLM judge | Python scorer，可检查回答、sandbox 文件、执行测试、多维评分 | 代码任务验收两者都可以；复杂评分编排可直接表达在 Inspect 中 |
| 轨迹 | 原生日志转为 ATIF，viewer 查看轨迹、reward、token、成本和时间 | bridge 生成 Inspect 日志与模型使用记录 | Harbor 依赖 Agent 日志解析覆盖；Inspect 依赖代理与 provider 覆盖 |
| 批量运行 | 多 Agent、多任务、并发、独立重复、按错误类型重试 | Eval sets、并发、epochs、错误重试与 checkpoint 等 | 都需固定重试与统计协议，不能直接比较默认值 |
| 长期记忆 | 原生 multi-step；文件系统持续，默认新会话，可选择 resume | 默认 Sample 隔离；序列应在同一样本中编排或显式管理外部状态 | Harbor 的 steps 对“跨会话只保留文件记忆”较直接 |
| Edges 服务衔接 | 需任务/配置转换和结果、轨迹到现有服务的映射 | 需 Sample/Task 转换、SWE 配置和日志到现有服务的映射 | 两者均不能直接替代 Edges 业务定义和 Langfuse 实验关联 |

以上能力依据：[Harbor Agent 能力表](https://docs.harborframework.com/agents/pre-integrated-agents)、[Harbor 环境](https://docs.harborframework.com/tasks/environment)、[Harbor job](https://docs.harborframework.com/jobs/run-a-job)、[Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/)、[Inspect Agent Bridge](https://inspect.aisi.org.uk/agent-bridge.html)、[Inspect sandbox](https://inspect.aisi.org.uk/sandboxing.html)。表中的适用性和接入成本是本次分析判断。

## 一、运行架构与原生行为

Harbor 的 installed 模式可以概括为：构建环境 → 安装并配置 Agent → 执行 CLI → 收集产物与日志 → verifier 评分。其模型连接可以按 provider、base URL 和 Agent 配置设置。它同时支持外部 Agent loop，因此不能把所有 Harbor Agent 都描述成同一种运行方式。[自定义 Agent](https://docs.harborframework.com/agents/custom-agents)

Inspect SWE 的链路是：Inspect 创建 Sample sandbox → SWE 启动 Agent → Agent 模型 API 请求进入 bridge → Inspect provider 调用模型 → Agent 本地执行工具 → Scorer 评分。它保留真实 CLI 的执行循环，但模型 API 路径受 Inspect 管理。[Inspect SWE](https://meridianlabs-ai.github.io/inspect_swe/)

Bridge 默认不转发客户端的 temperature、max_tokens、reasoning effort 等生成参数，而使用 Inspect 的配置；system prompt、tools 等结构参数会转发。未映射的辅助模型调用默认由 eval 主模型服务。可用 forward_generation_config、model_aliases，以及 SWE 暴露的相关选项调整；开启转发后 Inspect 自身的显式配置仍有优先级。不能据此承诺任意 provider 和原生 API 特性完全等价。[Bridge 的模型及生成配置](https://inspect.aisi.org.uk/agent-bridge.html#generation-config)

因此，测试“固定 Agent+模型在日常配置下的整套效果”时，Harbor 的已核实 installed 路径所需检查的模型代理因素较少；测试“多个 Agent 在统一模型后端和调用协议下的表现”时，Inspect 的桥接机制更有价值。这是实验设计判断，不是运行结果。

## 二、快照必须覆盖仓库之外的状态

两个框架都可以把仓库固定在 commit，但完整可复现还要固定 submodule SHA、依赖锁文件、镜像 digest、Agent 版本、配置、模型标识、权限、环境变量、网络服务与初始记忆。若实验组使用未提交的删改文件，还应记录补丁或内容摘要；commit 本身不足以描述它。

Harbor 的 --repo 固定的是“存放评测任务定义的仓库”，默认读取其中 tasks/；任务所操作的业务仓库仍要在环境中准备，不能混为一谈。[Git 数据集仓库](https://docs.harborframework.com/datasets/git-repos)、[环境定义](https://docs.harborframework.com/tasks/environment)

对于 Edges，建议将业务代码快照与材料变体分开记录：同一任务基线下，只对 AGENTS、skills、memory 等指定材料做受控变更。A/B 实际材料差异应能被检查，题面与预算保持一致。这是建议的实验协议。

## 三、材料加载存在具体的适配器干预

Harbor 支持 --skill 从本地或 Git 获取 skills，上传后由 Agent 集成登记到原生位置；Claude 与 Codex 的路径不同。要研究“Agent 能否从仓库入口发现技能”，应让文件沿受测仓库自己的入口被发现；额外使用框架的全局 skill 注入，测到的是另一种实验。[Harbor job skills](https://docs.harborframework.com/jobs/skills)

Harbor 也有运行配置变更。固定版本中，Claude 的默认 permission_mode 为 bypassPermissions，并重定向 CLAUDE_CONFIG_DIR；Codex 标准启动命令包含 --dangerously-bypass-approvals-and-sandbox，并设置独立 CODEX_HOME。因此它保留真实 CLI，不代表自动复现宿主机所有配置或内部沙箱策略。[Claude 源码](https://github.com/harbor-framework/harbor/blob/5eb713ff9500daced4e143b98765a7c732744a1b/src/harbor/agents/installed/claude_code.py)、[Codex 源码](https://github.com/harbor-framework/harbor/blob/5eb713ff9500daced4e143b98765a7c732744a1b/src/harbor/agents/installed/codex.py)

Inspect SWE 有两个与 Edges 尤其相关的已核实行为：

- Claude 默认 CLAUDE_CODE_DISABLE_AUTO_MEMORY=1，可通过 env 显式覆盖。它关闭的是 Claude 自带的自动记忆机制，不等于阻止 Agent 读取仓库里的 .edges/memory 文件。做自动记忆持久化实验时需主动恢复并设计会话序列。[env.py](https://github.com/meridianlabs-ai/inspect_swe/blob/7804cf7417999fcb743c48722e679ed3b5fe4d8d/src/inspect_swe/_claude_code/env.py)
- Codex 默认 CODEX_HOME 为 cwd/.codex；当 state 中存在 system_messages 且未指定 home_dir 时，会用 write_file 将合并后的消息写入 cwd/AGENTS.md。指定 home_dir 会将该文件写到 Agent home。该行为有条件触发，不是每次无条件覆盖。测试仓库 AGENTS.md 时必须检查启动前后文件，并注意隔离 home 后的全局指令仍会进入实验条件。[codex_cli.py](https://github.com/meridianlabs-ai/inspect_swe/blob/7804cf7417999fcb743c48722e679ed3b5fe4d8d/src/inspect_swe/_codex_cli/codex_cli.py)

两者都支持 MCP，但传入配置不代表网络可达、凭据可用或外部状态已经固定。验证工具接通与版本一致属于任务准备工作。[Harbor Agent 能力](https://docs.harborframework.com/agents/pre-integrated-agents)、[Inspect SWE Claude 参数](https://meridianlabs-ai.github.io/inspect_swe/claude_code.html)

## 四、结果验收与过程评分

Harbor 标准 verifier 在 Agent 之后运行 tests/test.sh，输出 reward.txt 或多维 reward.json；也能使用 LLM/Agent judge，或实现 host 侧 BaseVerifier。独立 verifier 环境接收声明过的 artifacts，能在干净依赖环境里验收产物；没有收集的文件不会自动出现在独立验收环境里。[Verifier](https://docs.harborframework.com/tasks/verifier)、[独立 verifier](https://docs.harborframework.com/tasks/separate-verifier)、[Artifacts](https://docs.harborframework.com/tasks/artifacts)、[自定义 verifier](https://docs.harborframework.com/jobs/custom-verifiers)

Inspect 的 Scorer 可以读取 sandbox 文件或 exec 测试，不局限于最终回答。支持多个 scorer 和多值指标，适合把产物正确性、约束遵守、回答质量放在一套 Python 评分逻辑中。若要在全新环境中恢复产物再评分，需要显式设计相关隔离与传递过程。[多 scorer 与 sandbox 访问](https://inspect.aisi.org.uk/multiple-scorers.html#sandbox-access)

两者都能做复杂评分；差异在于标准组织方式。对于本项目，应分别记录任务完成、约束违反、工具错误及成本，不用 Agent 自述“已完成”替代验收。声称“读取了记忆”也不能仅靠最终回答：需要可审阅的工具痕迹，而“使用了记忆带来收益”还要依赖受控对照。

## 五、长期记忆与会话接续

Harbor multi-step 会保留同一任务的文件系统，默认每步启动新会话；支持原生 resume 的 Agent 可显式继续上一会话。可以把“做任务并沉淀记忆”和“新会话利用记忆解决相关任务”设为两个 step。新会话只能帮助隔离聊天历史，仍要核对 Agent home、缓存和其他持久文件，确保保留的是计划中的状态。[Multi-step](https://docs.harborframework.com/tasks/multi-step)

Inspect 默认为每个 Sample 创建独立 sandbox。研究跨会话学习时，可以在同一样本内编排多个会话，并控制哪些状态被传递；跨 Sample 共用长期记忆需要额外设计。Inspect 支持 checkpoint，SWE 的 Claude/Codex 适配器也已接入，不能笼统说其不支持恢复；恢复覆盖的文件与会话状态需要另行核实。恢复机制与学习效果评测是不同问题。[Sandboxing](https://inspect.aisi.org.uk/sandboxing.html)、[Checkpointing](https://inspect.aisi.org.uk/checkpointing.html)

## 六、轨迹、预算、并发与重新评分

Harbor 为支持的 Agent 生成 ATIF，并提供 viewer 查看轨迹、评分、耗时和使用量；是否完整记录辅助调用与工具细节取决于 Agent 原生日志及转换器。Inspect 的 bridge 统一管理调用与日志，调用级控制较直接，但未经过 bridge 的外部服务活动不应假定自动纳入成本。[ATIF](https://docs.harborframework.com/agents/atif)、[Harbor viewer](https://docs.harborframework.com/results/view-job-results)、[Inspect logs](https://inspect.aisi.org.uk/eval-logs.html)

Harbor 配置提供并发、重复次数和重试；其错误策略区分 Agent 超时、模型服务错误、环境错误、verifier 错误，并决定分数是否有效。Inspect 提供 sample 与 scoped limits，cost_limit 需要配置所有使用模型的价格，并在 generate 时检查，不是供应商账单的严格预付上限。[Harbor job](https://docs.harborframework.com/jobs/run-a-job)、[错误分类](https://docs.harborframework.com/jobs/error-classification)、[Inspect limits](https://inspect.aisi.org.uk/setting-limits.html)

独立重复、故障重试和得到评分反馈后再尝试，必须分别记录。否则一个框架默认允许更多尝试，就会使成功率比较失真。耗时也要区分镜像准备、Agent 执行、验收；token 区分输入、输出、缓存，成本包含辅助模型与 judge。

Harbor 支持根据保存的 artifacts 在独立 verifier 中重新评分，无须重跑 Agent；前提是已保存新验收所需的全部产物。Inspect 也能对日志重新评分，但依赖运行中 sandbox 的 scorer 需要先保存并重建所需状态，不能假定日志自动保存全部工作目录。[Harbor regrade](https://docs.harborframework.com/jobs/regrade)、[Inspect scoring](https://inspect.aisi.org.uk/scoring-workflow.html)

## 七、接入现有 Edges 的判断

已检查当前 Edges 源码：现有 memory 消融 runner 已调用真实 codex/pi client，在调用前准备好的 A/B 工作目录中执行；默认配置偏向只读问答。run_experiment 不 clone/reset，逐条件、逐题、逐重复运行并调用 judge，保存事件与报告。它已经是 Agent 执行评测的一个具体实现，不能按“当前只有 prompt + LLM”重新设计。[现有消融 runner](https://github.com/VirusPC/edges/blob/main/packages/evaluation/experiments/harness_memory_ablation/run.py)、[client](https://github.com/VirusPC/edges/blob/main/packages/evaluation/experiments/retrieval_eval/client.py)、[实验说明](https://github.com/VirusPC/edges/blob/main/packages/evaluation/experiments/harness_memory_ablation/README.md)

现有 evaluation server 接受 Langfuse Custom Experiment，经 datasetName 登记表分发到 runner，并提供报告和实验回写逻辑；它没有任务队列。新框架接入应优先复用这层已有业务边界，而不是让两个系统分别拥有同一份任务状态。[现有服务](https://github.com/VirusPC/edges/blob/main/packages/services/evaluation/README.md)、[runner 登记表](https://github.com/VirusPC/edges/blob/main/packages/services/evaluation/registry.json)

建议的职责划分是：Edges 保有题集含义、材料变体、快照清单、质量指标及 Langfuse 实验关联；候选框架承担试验执行、隔离、轨迹和基础评分调度。这是待验证的接入方案，不是已实现行为。

Harbor 官方提供 LangSmith、ATIF-to-OpenTelemetry 插件，后者当前文档中的内置上传路径面向 MLflow。存在 OTel 转换能力不等于已完成 Langfuse Dataset/Experiment/Score 的语义对接。Inspect 可通过 hooks 和 EvalLog API 导出；本次没有核实到可以直接替换现有 Edges Langfuse 回写链路的开箱方案。两者均应先验证现有 exporter 可复用范围。[Harbor plugins](https://docs.harborframework.com/plugins/existing-plugins)、[Inspect hooks](https://inspect.aisi.org.uk/extensions-hooks.html)

## 八、建议的最小选型验证

下表是后续候选验证内容，本轮未执行，也不视为用户已批准实施。

| 检查 | 通过条件 |
| --- | --- |
| 同一真实仓库任务 | 两框架使用相同快照、依赖、题面、Agent 版本与模型配置 |
| 材料加载 | Agent 启动前后 AGENTS 和 memory 内容可核对；预期 skills 可发现；没有框架隐式注入实验组材料 |
| 客观验收 | 对相同产物使用同一套独立检查，不以最终自述判完成 |
| 文件记忆效应 | 新会话保留指定记忆，隔离聊天历史与其他状态；有无记忆条件分开 |
| 成本与故障 | 重复、重试、限额、缓存与基础设施错误统计口径一致 |
| 记录可回放 | 能关联源 commit、变体摘要、有效启动配置、产物、原生日志和评分 |

若首要目标仍是“测仓库中的 Edges 材料对真实任务的影响”，Harbor 是首选验证对象；若转为“研究模型调用策略、统一代理控制或复杂过程干预”，Inspect 应提高优先级。无需在首次接入时同时实现两套后端；先验证关键假设，再决定长期接口。
