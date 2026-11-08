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
uv pip install --python /path/to/work/venv/bin/python -r requirements.lock.txt
docker build -t edges-harbor-codex:0.162.1 - < Dockerfile.base

# 只生成材料并用真实 Harbor SDK 校验任务结构
/path/to/work/venv/bin/python run.py \
  --dataset /private/dataset.json --output /private/prepared \
  --model gpt-6.1-sol --split dev --repeats 1 --limit 2 --prepare-only

# Docker 与模型凭据就绪后才实际执行；输出目录须尚不存在
/path/to/work/venv/bin/python run.py \
  --dataset /private/dataset.json --output /private/run \
  --model gpt-6.1-sol --codex-version 0.162.1 \
  --agent-image edges-harbor-codex:0.162.1 \
  --auth-json /private/auth.json --split test --repeats 3 --seed 20261108 \
  --concurrency 3

# 仅离线汇总，使用 run/source/ 中冻结的指标协议；不再调用模型
/path/to/work/venv/bin/python report.py \
  --run /private/run --output /private/report

/path/to/work/venv/bin/python -m unittest discover -s tests -v
```

默认 reasoning effort 为 low，Agent 阶段超时 180 秒；可显式覆盖。安装、构建和 verifier 有独立时限，不计入 agent latency。Web search 关闭，但 Docker 网络仍用于安装和模型访问；“不联网”是任务指令，不应宣称网络硬隔离。`--agent-image` 默认 `python:3.12-slim`，正式复现实验应使用内容固定的镜像并记录实际 Docker/模型服务版本。`Dockerfile.base` 固定 Node 基础镜像 digest 与 Codex 版本，预装 Python、Git 和 ripgrep；任务构建层要求 Debian 兼容的包管理器。

调用前写出固定 seed 的随机 trial 顺序；每个 case×condition×repeat 都有明确 trial ID。`--concurrency` 为正整数、默认 1，限制同时在途的原生 `harbor run` Job 数量。控制器按既定计划派发，每个 Job 只有一个 trial，使用独立容器、`jobs/<trial_id>/` 和控制器日志；完成顺序可不同，结果始终按原 trial 身份配对。只有主线程收集结果，每完成一个 trial 就写 `trials.json` 和 `result.json` 检查点，保存顺序仍按计划排列。没有自动重试，进程启动或单次结果收集异常保留为失败行，其他 trial 继续完成；新的重跑使用新输出目录并完整报告。`--limit` 按输入数据顺序截取，适用于 smoke，不能把这种方便样本说成随机代表样本。

第一次 Ctrl-C 停止派发新 Job，取消尚未启动的工作，并等待已在途 Job 按自身时限结束、逐条保存结果后退出；manifest 标记 `interrupted=true`。它不会立即杀掉原生 Harbor 进程，等待时间可能包含构建、安装及 Agent 的时限。再次中断可能只留下此前检查点；未收集的计划仍显示为不完整，不能把它们算作成功或自动补跑。

manifest 记录 `concurrency`、`latency_context` 和 `execution_wall_ms`（整批执行墙钟，含调度及逐条检查点，不含材料准备、镜像检查和最后的统计计算）。三路并发的整批耗时可能缩短，但不等于单独运行一个 trial 的时延；单 trial 的 `agent_latency_ms` 与 `trial_wall_ms` 仍可能受到共享 CPU、内存、Docker 和模型服务并发的影响。比较延迟时须同时报告并发设置，不把整批墙钟除以 trial 数当单 trial 延迟，也不把重叠的 trial 墙钟求和当整批耗时。

登录文件仅以 `CODEX_AUTH_JSON_PATH` 环境指针交给 Harbor；不把内容、路径写入任务、命令或 manifest。显式登录文件会移除 Agent API-key 环境候选，控制器使用隔离 HOME。Harbor 内置适配器负责容器内临时导入、独立 Codex HOME 与清理；不继承本机 Codex 配置、skills 或会话。

## 真实数据建设

`export_langfuse.py` 只读 [Langfuse v2 observations](https://langfuse.com/docs/api-and-data-platform/features/public-api)，限定起止时间并遍历 cursor；凭据配置需有 `base_url/public_key/secret_key`。原始分页逐份保存校验和，终页后的完整性检查完成才标记 complete；可中断后续传。多版本同 ID 的所有行保留在原件中，候选建设保守排除这些 observation，不修改服务端记录。

```bash
python export_langfuse.py --config /private/langfuse.json \
  --output /private/raw/roots --start 2026-10-20T00:00:00Z --end 2026-11-08T00:00:00Z
python build_dataset.py memories \
  --repo framework=/local/framework --repo brain=/local/brain \
  --cutoff 2026-10-31T00:00:00Z --output /private/memories.json
python build_dataset.py candidates --export /private/raw/roots \
  --cutoff 2026-10-20T00:00:00Z --output /private/candidates.json
# 标注及独立复核后，才可组装正式集
python build_dataset.py assemble --memories /private/memories.json \
  --candidates /private/candidates.json --annotations /private/annotations-reviewed.json \
  --output /private/dataset.json
```

memory 库取 cutoff 前 Git 快照中的叶子正文，去掉作者等 frontmatter，仅保留内容、稳定 ID、scope、标题、最近 Git 变更时间及原件摘要。针对比快照更早的题，过滤掉后来变更过的文件；这是一份保守的固定历史候选库，**不是完整历史版本回放**。不要仅凭 frontmatter 时间断言文件更早存在。

候选按整个 source session 的稳定 hash 预分 dev/test；过滤已知非 user 包装、子 Agent、机器转发结果、空 I/O、重复观测等。user 槽仍可能含其他 Agent 派发的任务，必须人工式标注 `source_request_origin=direct_user/delegated_agent/uncertain`；主集与辅助集分开。近重复主题仍需复核，不能把 schema 通过当作语义独立证明。

`annotations` 每条需给 candidate_id、status、annotator、task_mode、scope 证据、gold IDs、逐 gold relevance_rationale、reference_answer、origin；改变原题时保留原文与 normalization_notes。`review` 必须由不同 reviewer 批准，并用 `memory_corpus_sha256`、`candidate_sha256` 和 `annotation_sha256` 绑定审过的文件/对象（后两者使用 `build_dataset.object_sha`，annotation 不含 review）。这些摘要防止批准后材料静默改变，不替代审阅者实际阅读证据。没有任何时间合格记忆的题禁止进入正式 placement/误检对照。没有相关 gold 的负例必须经过对可见库的检查。

## 指标口径

| 字段 | 含义 |
| --- | --- |
| `selected_recall_at_5` | 选出的前 5 个稳定 ID 与 gold 的交集大小 / gold 数量；不是实际文件读取证明 |
| `evidence_recall_at_5` | 上述命中还须在已完成工具的**返回内容**中出现正文 marker 或正文唯一连续片段；命令文本和最终回答不计证据 |
| `marker_recall_at_5` / `content_recall_at_5` | 分别只按末尾 marker / 可见库内唯一正文片段核验，便于识别取证方法差异 |
| `precision_at_5` | selected 命中数 / 5；少于 5 个选择仍以 5 为分母 |
| `mrr` | 第一个正确 selected ID 的排名倒数 |
| `answer_checks_pass` | 预声明正则全部匹配的 0/1；只是窄规则检查，不等于语义正确率 |
| `forbidden_violation_rate` | 任一预声明禁止正则命中的 0/1；没定义规则则为 null |
| `unknown_selected_count` | 选择了当前条件不存在的 ID 数量 |
| `empty_gold_selection_rate` | 无相关 gold 的问题仍选择了记忆的 0/1；用于观察不必要检索 |
| `observed_memory_count` | 工具返回中出现 marker 或唯一正文片段的记忆数；不要求被最终选中 |
| `tool_calls` | JSONL 中完成的工具 item 数量，以 item ID 去重 |
| `input/output/cached/uncached/total_tokens` | Codex 实际提供的用量；uncached=input−cached，total=input+output，未知不补零 |
| `agent_latency_ms` | Harbor 原生 `agent_execution` 开始至结束 |
| `trial_wall_ms` | 控制器执行单个 Job 的墙钟时间，含构建、安装和 verifier |

没有 gold 的问题 recall/P@5/MRR 为 null，避免除零或把无相关记忆误算失败。none 在有 gold 的问题上 recall=0，即使猜中 ID 也没有可检索文件；这是结构性基线。**主指标是 selected recall@5**，取证指标用于审计。正文片段使用每隔16字符采样的64字符窗口，短正文至少32字符；仅合并空白，保留标点和顺序；可见库内共享片段不用于指认某一个ID，metadata、标题与marker不参与正文片段生成。这补充了末尾marker无法覆盖长文件局部读取的问题，仍可能漏计短片段、加行号或转义的工具输出。两种证据都只能说明材料暴露，**不能证明整份文件被读完、理解正确或因果使用**，也不是防恶意模型伪造证据的安全协议。

JSON 不合规格、Agent/基础设施/验证器失败不会作为答错；质量指标为 null，已知资源用量仍保留并报告失败率。读取失败或截断日志不能冒充成功。缺失 cache 明细不补成零，部分 turn 缺失某个 token 字段则该字段总量为 null。

每题先平均全部重复，再按题等权汇总；某题某指标的任意重复缺失，则该题该指标不进入比较，报告完整覆盖率与失败率。覆盖率以适用于该指标的 eligible_cases 为分母，区别无 gold/无答案规则的 N/A 与真实缺失。指标主层的 mean/median/p95 基于每题重复均值；`raw_trial_distribution` 另给实际 trial 的 median/p95/count，速度报告应采用这里的原始延迟分布。三个对比为 scoped−root、scoped−none、root−none；按 source session 聚类 bootstrap，缺少 session 时以 case 聚类。输出配对题数、cluster 数与 percentile 95% CI；不足两个 cluster 不出 CI。区间未做多指标校正，缺失样本下描述的是完整配对样本，不应隐去覆盖率声称总体效果。正式因果结论需要完整矩阵、合理样本、独立 gold 审核与结果盲评。

## 可复现产物

- `dataset.json`：输入文件原样冻结，位于所有构建上下文之外。
- `source/`：实际运行的程序、依赖锁与基础镜像定义副本，位于构建上下文之外；不能只靠一个无法还原的哈希追溯版本。
- `plan.json`、`commands.json`：随机执行计划、精确 case/condition/repeat/ID 及无凭据命令。
- `manifest.json`：代码/数据/快照摘要、逐记忆内容校验、模型、CLI、Harbor、预算与机器环境。
- `tasks/`：Harbor 任务；`environment/` 只有该条件可见材料，`tests/` 保存私密 gold 和 verifier。
- `jobs/`、`controller-logs/`：原生执行记录。
- `trials.json`、`result.json`：逐 trial 结果、覆盖率、三组汇总与三个配对比较；每个 trial 后写检查点。

输出目录默认权限 0700。`status=complete` 只代表计划矩阵全部尝试完成，必须同时检查 `failed_trials`；失败时 CLI 非零退出。结果支持观察分层是否有收益，也允许平局或退化，程序不预设分层必须获胜。

`report.py` 校验冻结数据、代码摘要和完整计划矩阵，再按整体、QA、执行前检索、有已知子作用域、共同根/未知作用域分别汇总。报告目录必须新建且位于 run 之外，产物包括中文 `report.md`、完整 `report.json`、组指标与配对比较 CSV、逐题/逐 trial/完整计划矩阵 CSV，以及 `tool-commands.jsonl`。Markdown 不复制原始问题、答案和来源 ID；详细表和命令仍属于私密数据。命令审计须阅读实际执行语义，不能把搜索词里出现 curl 等词误判为联网。scope 为 `.` 的已知全局场景也进入共同根/未知组，不能将该分组全称为缺失来源。

离线测试覆盖原件完整性、时间与 session 泄漏、金标批准绑定、任务隔离、累计 token、正文暴露证据、失败缺失值和报告覆盖率；并通过假进程检验并发上限、每 trial 恰好一次、乱序完成的身份配对、逐条检查点以及失败和中断后的结果保存。另已完成独立 Docker 中的三条件真实开发 smoke；开发 smoke 只证明链路可运行，正式效应须以冻结 test 矩阵为准。
