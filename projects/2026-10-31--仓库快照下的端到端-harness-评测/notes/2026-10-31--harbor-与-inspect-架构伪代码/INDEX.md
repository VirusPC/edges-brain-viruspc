# Harbor 与 Inspect 架构伪代码

以下是同一个 memory 消融实验的结构伪代码，未实现或运行。`Task`、`setup`、`solver`、`scorer`、`BaseInstalledAgent.install/run` 使用框架正式名称；其余业务函数是本文自定义命名，没有统一行业标准。`example_*` 仅模拟框架调度行为。每个函数均注释职责、输入和返回或输出；装饰器、序列化、并发、凭据和错误处理细节从略。

## 对比速览

两者都按“准备 → 执行 → 打分”运行。下表对应本文的具体接入代码；Harbor 示例把动态材料准备放在 `MemoryAgent.run` 开头，固定材料也可以预先放进镜像。

| 实验阶段 | 公共业务函数与输入输出 | Inspect 的绑定位置 | Harbor 的绑定位置 |
| --- | --- | --- | --- |
| 启动环境 | 创建本次独立运行环境，交出命令执行入口 | `Task.sandbox` 选择 provider；在每个样本执行前创建环境 | 任务的 `environment/` 定义初始环境；provider 为每个 trial 启动新环境 |
| 准备材料 | `prepare_workspace(exec_command, snapshot, condition)`：执行入口、仓库快照、记忆条件 → 工作目录 | `Task.setup` → `memory_setup(condition)` 返回的 `setup` → 公共函数 | `MemoryAgent.run` 的准备阶段 → 公共函数；读取 `experiment.json` 取得快照和条件 |
| 执行 Agent | `run_agent(exec_command, workspace, question)`：工作目录、问题 → 回答、用量、耗时、轨迹或错误 | `Task.solver` → `agent_solver` → 公共函数 | `BaseInstalledAgent.run` → `MemoryAgent.run` → 公共函数；任务指令来自 `instruction.md` |
| 单次打分 | `score_result(case, result)`：题目标准、执行结果 → 评分或错误状态 | `Task.scorer` → `result_scorer` → 公共函数 | `tests/test.sh` → `verify.py` 的 `main` → 公共函数；标准来自 `tests/case.json` |
| 整场比较 | `compare_trials(trials)`：全部已评分记录 → 两组质量、成本差异和门槛判断 | `run_with_inspect` 在实验结束后读取、转换日志，再调用公共函数 | `run_with_harbor` 在 Job 结束后读取、转换 trial 结果，再调用公共函数 |

## 两者怎样传递执行结果

| 传递环节 | Inspect 本例 | Harbor 本例 |
| --- | --- | --- |
| 执行函数产生结果 | `run_agent` 返回结果，`agent_solver` 接收 | `run_agent` 返回结果，`MemoryAgent.run` 接收 |
| 把结果交给评分环节 | 回答写入 `state.output`，完整结果写入 `state.metadata` | 把结果写成 `RESULT_PATH` 文件，并在 `task.toml` 声明为 artifact |
| 评分环节取得结果 | `result_scorer` 读取执行后的 `state` | 框架将 artifact 传入独立 verifier，`verify.py` 读取文件 |
| 把评分交回框架 | Scorer 返回 Inspect 格式的 Score | Verifier 写出 `reward.json` 与详细结果文件 |

## 同一个 memory 消融实验怎样配置

| 实验内容 | Inspect 本例 | Harbor 本例 |
| --- | --- | --- |
| 同一批问题 | 两个 Task 使用相同 Dataset | 各题任务目录的 `instruction.md` 保存相同问题 |
| memory-on/off 条件 | 两个 Task 分别绑定 `memory_setup("memory-on")` 和 `memory_setup("memory-off")` | 同一题创建两个任务目录，各自的 `experiment.json` 指定 memory-on/off |
| 同一个 Agent | 两组使用同一个 `agent_solver`，运行同一个 CLI | 两组使用同一个 `MemoryAgent` 适配器，运行同一个 CLI |
| 同一套判分规则 | `result_scorer` 调用共同的 `score_result` | `verify.py` 调用共同的 `score_result` |
| 每题每组重复三次 | `epochs=3` | `n_attempts=3`，CLI 对应 `-k 3` |
| 最后比较两组 | 日志转换成共同的 trial 记录后调用 `compare_trials` | Job 结果转换成共同的 trial 记录后调用 `compare_trials` |

这里配置的是独立重复次数；故障重试需要另行配置并保持比较口径一致。

## Inspect setup 的两次调用

| 时机 | 调用 | 输入 | 返回 |
| --- | --- | --- | --- |
| 配置 Task 时 | `setup_callback = memory_setup(condition)` | 记忆条件 | 内层 `setup` 函数；通过闭包保留 condition |
| 每次执行样本时 | `state = await task.setup(state, generate)` | 当前状态、框架的生成回调 | 准备好工作目录的状态；此时 `task.setup` 指向上一步返回的函数 |

```python
# 展开绑定过程；此处只显示赋值与调用，不引入新的架构函数。
setup_callback = memory_setup("memory-on")
task = Task(setup=setup_callback, solver=agent_solver, scorer=result_scorer, ...)
state = await task.setup(state, generate)
```


## 1. 公共业务函数

```python
SNAPSHOT = "固定仓库快照"
CONDITIONS = ["memory-off", "memory-on"]
REPEATS = 3
WORKSPACE = "/workspace"
RESULT_PATH = "/workspace/trial-result.json"

# exec_command(argv, cwd) 是传入的命令执行函数。
# 本地实验传入 subprocess 调用；框架实验传入 sandbox/environment.exec。

async def prepare_workspace(exec_command, snapshot, condition):
    """准备一次执行的工作目录，由 Inspect setup 或 Harbor Agent.run 调用。
    输入：命令执行函数、仓库快照、记忆条件；返回：准备好的工作目录路径。
    """
    # 通过 exec_command 恢复快照、应用记忆条件、准备相同的 Agent 初始状态。
    # 只准备环境；不调用被测 Agent，不判分。
    ...
    return WORKSPACE


async def run_agent(exec_command, workspace, question):
    """执行被测 Agent，由 Inspect solver 或 Harbor Agent.run 调用。
    输入：命令执行函数、工作目录、问题；返回：回答、用量、耗时、轨迹和错误。
    """
    # 真实 harness 自己实现模型与工具循环。
    started = monotonic_clock()
    raw = await exec_command(
        ["my-agent", "--prompt", question],
        cwd=workspace,
    )
    result = parse_cli_output(raw)  # answer、usage、trace、error
    result.latency = monotonic_clock() - started
    return result


async def score_result(case, result):
    """为单次执行判分，由 Inspect scorer 或 Harbor verifier 调用。
    输入：题目及判分标准、执行结果；返回：判定与违反项，或执行错误状态。
    """
    if result.error:
        return {"status": "error", "error": result.error}
    return judge.score(
        question=case.question,
        answer=result.answer,
        criteria=case.criteria,
        violations=case.violations,
    )


def compare_trials(trials):
    """分析整场 A/B 实验，由三种 run_experiment/run_with_* 入口调用。
    输入：全部执行记录及评分；返回：各条件汇总、质量与成本差异、收益门槛判断。
    此函数按题目和条件汇总重复运行，不负责执行 Agent 或给单条回答判分。
    """
    # 此处对应项目已有 harness_memory_ablation.score.compare_trials。
    # 按 case_id 和 condition 汇总各次重复，比较质量、违反项、token 和耗时。
    ...
```

## 2. 公共架构

```python
async def run_trial(case, condition, repeat, exec_command):
    """完成一个题目在一种条件下的一次尝试，由公共 run_experiment 调用。
    输入：题目、条件、重复编号、执行函数；返回：包含执行结果和评分的 TrialRecord。
    """
    # exec_command 已连接本次独立工作目录或沙箱。
    workspace = await prepare_workspace(exec_command, SNAPSHOT, condition)
    result = await run_agent(exec_command, workspace, case.question)
    score = await score_result(case, result)
    return TrialRecord(case.id, condition, repeat, result, score)


async def run_experiment(cases, open_execution_context):
    """调度不依赖框架的完整实验，负责条件、题目、重复次数的遍历。
    输入：题库和执行上下文工厂；返回：compare_trials 生成的整场实验比较结果。
    """
    trials = []
    for condition in CONDITIONS:
        for case in cases:
            for repeat in range(REPEATS):
                # 上下文负责创建、释放本次工作目录或沙箱。
                async with open_execution_context() as exec_command:
                    trial = await run_trial(case, condition, repeat, exec_command)
                    trials.append(trial)
    return compare_trials(trials)
```

## 3. Inspect 的接口绑定

```python
# setup/solver/scorer 是框架接口；其函数体直接调用公共业务函数。
# exec_command 的参数转换写在函数中，不额外引入环境封装类。

def memory_setup(condition):
    """创建绑定记忆条件的 Inspect setup 回调，供 Task.setup 配置使用。
    输入：memory-on/off 条件；返回：异步 setup 函数，此时尚未准备工作目录。
    """
    async def setup(state, generate):
        """由 Inspect 在主 solver 之前调用，准备当前样本的工作目录。
        输入：TaskState 与框架 generate 回调；返回：写入目录和条件后的 TaskState。
        本例准备阶段不使用 generate。
        """
        async def exec_command(argv, cwd=None):
            """将 argv、cwd 传给当前 Inspect sandbox 执行，返回命令执行结果。"""
            return await sandbox().exec(cmd=argv, cwd=cwd)

        state.metadata["workspace"] = await prepare_workspace(
            exec_command, SNAPSHOT, condition,
        )
        state.metadata["condition"] = condition
        return state
    return setup


async def agent_solver(state, generate):
    """实现 Inspect 的样本执行入口，通过 run_agent 启动真实 harness。
    输入：TaskState 与框架 generate 回调；返回：携带回答和原始执行结果的 TaskState。
    本例模型调用由外部 harness 完成，不调用 generate。
    """
    async def exec_command(argv, cwd=None):
        """将 argv、cwd 传给当前 Inspect sandbox 执行，返回命令执行结果。"""
        return await sandbox().exec(cmd=argv, cwd=cwd)

    result = await run_agent(
        exec_command,
        state.metadata["workspace"],
        state.input_text,
    )
    state.output = to_inspect_output(result.answer)
    state.metadata["result"] = result  # 实际接入时转换为可序列化数据
    return state


async def result_scorer(state, target):
    """实现 Inspect 的样本评分入口，通过 score_result 进行判分。
    输入：执行后的 TaskState、框架 target；返回：转换为 Inspect 格式的评分。
    本例评分标准由 case_from_sample 读取，不直接使用 target 参数。
    """
    case = case_from_sample(state)
    score = await score_result(case, state.metadata["result"])
    return to_inspect_score(score)


async def run_with_inspect(cases):
    """构造并执行 memory-on/off 两组 Inspect Task，再比较整场结果。
    输入：题库；返回：将 Inspect 日志转为 trial 记录后得到的组间比较结果。
    """
    tasks = [
        Task(
            dataset=to_inspect_samples(cases),  # 携带 case_id 与判分标准
            sandbox="docker",
            setup=memory_setup(condition),    # 调用 prepare_workspace
            solver=agent_solver,              # 调用 run_agent
            scorer=result_scorer,             # 调用 score_result
            epochs=REPEATS,
        )
        for condition in CONDITIONS
    ]
    logs = await inspect.eval_async(tasks)
    trials = normalize_inspect_results(logs)
    return compare_trials(trials)
```

## 4. Inspect 的调用关系

```python
# 教学模拟，不是 Inspect 内部源码；仅展示成功路径。
async def example_inspect_runner(task):
    """教学模拟：展示 Inspect 依次调用 setup、solver、scorer 的位置。
    输入：一个 Task；输出：写出的样本结果记录；无显式返回值，不是正式 SDK 函数。
    """
    for sample in task.dataset:
        for epoch in range(task.epochs):
            async with sample_sandbox(task.sandbox):
                state = make_task_state(sample, epoch)

                state = await task.setup(state, generate)
                # memory_setup 返回的 setup -> prepare_workspace

                state = await task.solver(state, generate)
                # agent_solver -> run_agent -> sandbox().exec

                score = await task.scorer(state, sample.target)
                # result_scorer -> score_result

                record_sample(state, score)
```

## 5. Harbor 的任务与执行绑定

```python
# 每个任务是目录；直接显示文件内容，不引入任务文件生成接口。
# 例：tasks/question-01-memory-on/

instruction.md = case.question

environment/Dockerfile = """
FROM <固定版本且已安装 my-agent 和公共业务模块的镜像>
COPY experiment.json /opt/experiment.json
WORKDIR /workspace
"""

environment/experiment.json = {
    "snapshot": SNAPSHOT,
    "condition": "memory-on",
}

task.toml = {
    "metadata": {"case_id": case.id, "condition": "memory-on"},
    "artifacts": [RESULT_PATH],
    "verifier": {"environment_mode": "separate"},
}

tests/case.json = case
tests/test.sh = "python /tests/verify.py"
```

```python
class MemoryAgent(BaseInstalledAgent):

    async def install(self, environment):
        """Harbor 安装阶段接口；本例检查镜像内预装 Agent 的可用性。
        输入：任务环境；返回：无；检查失败时由命令错误反馈给框架。
        """
        # 本例镜像已安装固定版本的 Agent，此处检查可用性。
        await self.exec_as_agent(environment, command="my-agent --version")

    async def run(self, instruction, environment, context):
        """Harbor 执行入口：准备实验条件，调用 run_agent，再上传结果产物。
        输入：任务指令、环境、AgentContext；返回：无，结果通过 RESULT_PATH 产物交付。
        本例不直接使用 context。
        """
        async def exec_command(argv, cwd=None):
            """把 argv 安全转换为 Harbor 的命令字符串并执行，返回命令执行结果。"""
            return await environment.exec(command=shlex.join(argv), cwd=cwd)

        raw = await environment.exec(command="cat /opt/experiment.json")
        experiment = json.loads(raw.stdout)

        # 在 Agent 适配器中，每个 trial 启动真实 Agent 前准备实验条件。
        workspace = await prepare_workspace(
            exec_command, experiment["snapshot"], experiment["condition"],
        )
        result = await run_agent(exec_command, workspace, instruction)

        # 框架通过声明过的 artifact 把结果传给独立 verifier。
        # 本地临时 JSON 的写入与清理细节从略。
        with temporary_json(result) as local_file:
            await environment.upload_file(local_file, RESULT_PATH)


# tests/verify.py；运行在 verifier 环境，公共业务模块需在其中可用。
async def main():
    """独立 verifier 的脚本入口，由 tests/test.sh 启动。
    输入：评分环境中的题目文件与 Agent 结果产物；输出：reward 和详细评分文件。
    无显式返回值；内部调用与 Inspect 相同的 score_result。
    """
    case = read_case("/tests/case.json")
    result = read_result(RESULT_PATH)
    score = await score_result(case, result)
    write_json("/logs/verifier/reward.json", numeric_rewards(score))
    write_json("/logs/verifier/detail.json", score)
```

```python
async def run_with_harbor():
    """执行预先准备好的 Harbor 任务目录，并比较两组实验结果。
    输入：配置好的 tasks/、Agent 适配器与重复次数；返回：规范化后的组间比较结果。
    """
    # tasks/ 下已准备好各题 × memory-on/off 的任务目录。
    subprocess.run([
        "harbor", "run",
        "-p", "./tasks",
        "-a", "my_adapter:MemoryAgent",  # install/run 使用框架正式接口
        "-e", "docker",
        "-k", str(REPEATS),
    ], check=True)

    trials = normalize_harbor_results("./jobs")
    return compare_trials(trials)
```

## 6. Harbor 的调用关系

```python
# 教学模拟，不是 Harbor 内部源码；配置访问与资源管理已简化。
async def example_harbor_runner(job):
    """教学模拟：展示 Harbor 如何启动 Agent、收集产物并运行 verifier。
    输入：Job 配置；输出：写出的 trial 结果记录；无显式返回值，不是正式 SDK 函数。
    """
    for task in job.tasks:
        for attempt in range(job.n_attempts):
            async with fresh_task_environment(task) as environment:
                agent = load_configured_agent(job)
                await agent.setup(environment)  # 包含 install/configure 等步骤

                await agent.run(task.instruction, environment, context())
                # MemoryAgent.run -> prepare_workspace
                #                 -> run_agent -> environment.exec
                #                 -> 上传 RESULT_PATH

                artifacts = await collect_artifacts(environment, task)
                async with separate_verifier_environment(task) as verifier:
                    await transfer_artifacts(artifacts, verifier)
                    await verifier.exec(command="bash /tests/test.sh")
                    # test.sh -> verify.py main -> score_result

                    score = await read_rewards(verifier)
                    record_trial(task, attempt, artifacts, score)
```

## 7. 本例的边界

```python
# prepare_workspace 在本例中的调用位置：
# Inspect：Task.setup
# Harbor：MemoryAgent.run 的准备阶段
# 这是本例的接入选择；两框架都可以把固定准备步骤预先放入镜像。

# Inspect 本例不使用 Inspect SWE / Agent Bridge。
# 原生 CLI 的 token、轨迹和错误由 parse_cli_output 显式解析。
# normalize_* 只转换结果格式；compare_trials 复用同一比较口径。
# 实际适配时须补齐失败分类、序列化、资源清理和标准框架装饰器。
# run_with_* / example_* 均不是框架内部正式函数名。
```

## 来源

- [Inspect Task](https://inspect.aisi.org.uk/tasks.html) — dataset、setup、solver、scorer、sandbox 与 epochs。
- [Inspect Solver](https://inspect.aisi.org.uk/solvers.html) 与 [Scorer](https://inspect.aisi.org.uk/scorers.html) — 执行和评分的正式接口。
- [Inspect Sandbox](https://inspect.aisi.org.uk/sandboxing.html) — `sandbox().exec()` 等环境操作。
- [Harbor 自定义 Agent](https://docs.harborframework.com/agents/custom-agents) — `BaseInstalledAgent.install/run`。
- [Harbor 任务格式](https://docs.harborframework.com/tasks/overview) — instruction、environment、tests。
- [Harbor Artifacts](https://docs.harborframework.com/tasks/artifacts) 与 [独立 verifier](https://docs.harborframework.com/tasks/separate-verifier) — 声明并传递评分所需产物。
- [现有消融 runner](https://github.com/VirusPC/edges/blob/main/packages/evaluation/experiments/harness_memory_ablation/run.py) 与 [比较逻辑](https://github.com/VirusPC/edges/blob/main/packages/evaluation/experiments/harness_memory_ablation/score.py) — 本文没有修改实现。
- 原始材料：2026-10-31 本次 Codex 对话。用户要求用函数伪代码表示架构、关联框架配置，并统一命名、删减额外示意层。
