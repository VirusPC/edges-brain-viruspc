# Harbor 分层记忆三臂实验

本程序使用 Harbor 0.25.0 的内置 `codex`、每次独立 Docker 环境和 separate verifier。它与相邻旧程序的 off/on 实验相互独立，不修改旧程序或四框架共用代码。准备模式和离线测试不调用模型。

## 三个条件

| 条件 | 记忆正文 | 发现入口 |
| --- | --- | --- |
| `scoped` | `<scope>/.edges/memory/memory-<id>.md` | 各真实作用域 `AGENTS.md` 链接最近的下层作用域及本层记忆；不在每个物理中间目录造入口 |
| `root` | 根目录 `memory-<id>.md` | 根 `AGENTS.md` 和扁平 `MEMORY_INDEX.md` |
| `none` | 无 | 无记忆索引、无 `AGENTS.md` |

每条问题仅能看到 `available_at < query_at` 的记忆。两种有记忆条件都包含全部时间合格的记忆，**不会按问题作用域提前过滤候选集**。根目录条件保留正文里的 scope、时间、标题等事实；scoped/root 逐记忆 SHA-256 必须相同。处理变量包括存放位置和发现索引，不能解释成单独的目录深度效果。

三臂任务提示完全相同，明确任务 scope，要求只读本地材料，最终返回 `{"answer":"…","selected_memory_ids":["…"]}`。最多选 5 个不同 ID，只有实际读过正文的记忆才可选择。三臂均在 `/workspace/<scope>` 启动；镜像在 `/workspace` 建立相同空 Git 仓库，便于原生 Codex 从项目根发现祖先 AGENTS。none 保留相同基础 README 与空作用域目录，不可见记忆正文。评分标准、gold IDs、源 trace 标识及 marker 映射只放在 task 的 `tests/`，不会复制进 Agent 镜像。

## 输入与执行

输入为 `schema_version: 1`，含 `memories` 和 `cases` 两个数组。memory 需要 `memory_id / scope / title / body / available_at / source`；case 需要 `case_id / question / query_at / scope / gold_memory_ids / source / split`，可含 `answer_checks: [{check_id, pattern}]` 与 `forbidden_patterns: [pattern]`。scope 是规范相对 POSIX 路径，根为 `.`；时间必须带时区。case 的 source 可提供 session_id 以进行聚类统计。所有 gold 必须在问题发生前已存在；同一 source session 不能同时进入 dev/test。

`task_mode` 默认为 `memory_qa`。对于真实代码修改、写笔记等工作请求，可使用 `pre_task_retrieval`：保留原始用户请求，明确只做执行前的记忆选择与适用规则说明，不实际执行外部操作或改仓库。逐 trial 保留 task_mode，最终分析须按这两个 track 分层；本程序整体汇总不能自动解释成完整真实任务成功率。

真实 trace、记忆、题目及运行记录应保存在私密归档或工作区 `.work/`；本公开目录只保存通用程序和合成测试。数据来源核验、作者归属、问题去重、人工 gold 审核和正文脱敏由数据集建设阶段负责；通过本程序 schema 检查不等于数据集质量已获认证。

```bash
uv venv --python 3.12 /path/to/work/venv
uv pip install --python /path/to/work/venv/bin/python -r requirements.txt

# 只生成材料并用真实 Harbor SDK 校验任务结构
/path/to/work/venv/bin/python run.py \
  --dataset /private/dataset.json --output /private/prepared \
  --model gpt-6.1-sol --split dev --repeats 1 --limit 2 --prepare-only

# Docker 与模型凭据就绪后才实际执行；输出目录须尚不存在
/path/to/work/venv/bin/python run.py \
  --dataset /private/dataset.json --output /private/run \
  --model gpt-6.1-sol --codex-version 0.162.1 \
  --auth-json /private/auth.json --split test --repeats 3 --seed 20261108

/path/to/work/venv/bin/python -m unittest discover -s tests -v
```

默认 reasoning effort 为 low，Agent 阶段超时 180 秒；可显式覆盖。安装、构建和 verifier 有独立时限，不计入 agent latency。Web search 关闭，但 Docker 网络仍用于安装和模型访问；“不联网”是任务指令，不应宣称网络硬隔离。`--agent-image` 默认 `python:3.12-slim`，正式复现实验应传固定 digest 并记录实际 Docker/模型服务版本。这个 Dockerfile 要求基于 Debian 的 Python 镜像。

调用前写出固定 seed 的随机 trial 顺序；每个 case×condition×repeat 都有明确 trial ID。按计划逐个调用 `harbor run`，每个 Job 只有一个 trial，不依赖框架内部排序或重试。默认没有自动重试，失败保留；新的重跑应使用新的输出目录并完整报告。`--limit` 按输入数据顺序截取，适用于 smoke，不能把这种方便样本说成随机代表样本。

登录文件仅以 `CODEX_AUTH_JSON_PATH` 环境指针交给 Harbor；不把内容、路径写入任务、命令或 manifest。显式登录文件会移除 Agent API-key 环境候选，控制器使用隔离 HOME。Harbor 内置适配器负责容器内临时导入、独立 Codex HOME 与清理；不继承本机 Codex 配置、skills 或会话。

## 指标口径

| 字段 | 含义 |
| --- | --- |
| `selected_recall_at_5` | 选出的前 5 个稳定 ID 与 gold 的交集大小 / gold 数量；不是实际文件读取证明 |
| `evidence_recall_at_5` | 上述命中还须在 Codex **工具返回内容**中出现该记忆正文的随机 marker；命令文本和最终回答不计证据 |
| `precision_at_5` | selected 命中数 / 5；少于 5 个选择仍以 5 为分母 |
| `mrr` | 第一个正确 selected ID 的排名倒数 |
| `answer_checks_pass` | 预声明正则全部匹配的 0/1；只是窄规则检查，不等于语义正确率 |
| `forbidden_violation_rate` | 任一预声明禁止正则命中的 0/1；没定义规则则为 null |
| `unknown_selected_count` | 选择了当前条件不存在的 ID 数量 |
| `empty_gold_selection_rate` | 无相关 gold 的问题仍选择了记忆的 0/1；用于观察不必要检索 |
| `observed_memory_count` | 工具返回中出现 marker 的记忆数；不要求被最终选中 |
| `tool_calls` | JSONL 中完成的工具 item 数量，以 item ID 去重 |
| `input/output/cached/uncached/total_tokens` | Codex 实际提供的用量；uncached=input−cached，total=input+output，未知不补零 |
| `agent_latency_ms` | Harbor 原生 `agent_execution` 开始至结束 |
| `trial_wall_ms` | 控制器执行单个 Job 的墙钟时间，含构建、安装和 verifier |

没有 gold 的问题 recall/P@5/MRR 为 null，避免除零或把无相关记忆误算失败。none 在有 gold 的问题上 recall=0，即使猜中 ID 也没有可检索文件；这是结构性基线。读取 marker 证明内容在工具结果中暴露，**不能证明整份文件被读完、理解正确或因果使用**；局部读取或 grep 未返回末尾 marker 时也可能漏计，因此 evidence recall 是保守的可观察证据指标。该指标可检测“只报 ID 未读正文”，不是防恶意模型伪造证据的安全协议。

JSON 不合规格、Agent/基础设施/验证器失败不会作为答错；质量指标为 null，已知资源用量仍保留并报告失败率。读取失败或截断日志不能冒充成功。缺失 cache 明细不补成零，部分 turn 缺失某个 token 字段则该字段总量为 null。

每题先平均全部重复，再按题等权汇总；某题某指标的任意重复缺失，则该题该指标不进入比较，报告完整覆盖率与失败率。覆盖率以适用于该指标的 eligible_cases 为分母，区别无 gold/无答案规则的 N/A 与真实缺失。指标主层的 mean/median/p95 基于每题重复均值；`raw_trial_distribution` 另给实际 trial 的 median/p95/count，速度报告应采用这里的原始延迟分布。三个对比为 scoped−root、scoped−none、root−none；按 source session 聚类 bootstrap，缺少 session 时以 case 聚类。输出配对题数、cluster 数与 percentile 95% CI；不足两个 cluster 不出 CI。区间未做多指标校正，缺失样本下描述的是完整配对样本，不应隐去覆盖率声称总体效果。正式因果结论需要完整矩阵、合理样本、独立 gold 审核与结果盲评。

## 可复现产物

- `dataset.json`：输入文件原样冻结，位于所有构建上下文之外。
- `plan.json`、`commands.json`：随机执行计划、精确 case/condition/repeat/ID 及无凭据命令。
- `manifest.json`：代码/数据/快照摘要、逐记忆内容校验、模型、CLI、Harbor、预算与机器环境。
- `tasks/`：Harbor 任务；`environment/` 只有该条件可见材料，`tests/` 保存私密 gold 和 verifier。
- `jobs/`、`controller-logs/`：原生执行记录。
- `trials.json`、`result.json`：逐 trial 结果、覆盖率、三组汇总与三个配对比较；每个 trial 后写检查点。

输出目录默认权限 0700。`status=complete` 只代表计划矩阵全部尝试完成，必须同时检查 `failed_trials`；失败时 CLI 非零退出。结果支持观察分层是否有收益，也允许平局或退化，程序不预设分层必须获胜。
