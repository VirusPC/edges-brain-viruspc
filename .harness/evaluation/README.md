# 评测 (evaluation/)

`evaluation/` 评测**整套 Edges**：skills、记忆循环、note→edge 流程、Agent 对着本仓库的行为等。这是系统元工作，不是个人知识笔记，也不进入 notes → edges → archive 主链。

## 放什么

- 评测用例、harness、benchmark 定义、scorecard
- 对照某次变更或某条假设的评测报告
- 用来判断「系统有没有变好」的可复现实验设计

## 不放什么

- 个人认知资产、研究笔记、对外博客 → [`knowledge/`](../../knowledge)
- 已采纳的决策、纠错、操作手册 → [`.harness/memory/`](.harness/memory/)
- 接入 Edges 的 CLI / MCP / skill 实现 → [`extensions/`](../../extensions/README.md)
- 野外使用记录、运行日志、仪表盘笔记 → [`observation/`](../observation/README.md)
- 编造的数据集、假分数、尚未跑过的「结果」

本仓公开。用例与报告按根 README「公开仓库边界」脱敏；不要写入凭据、未公开 IP 或可识别个人。

## 和其他目录的关系

| 目录 | 关系 |
| --- | --- |
| [`knowledge/`](../../knowledge) | 认知资产。评测可以*调用*其中的材料当输入，但不把报告写成 Note / Edge / Post。一条评测结论若值得沉淀为可复用判断，先回到捕获入口。 |
| [`.harness/memory/`](.harness/memory/) | 运营账本。评测*发现*并被采纳的决策写进所属作用域的 `.harness/memory`；过程、用例和分数留在本目录。 |
| [`extensions/`](../../extensions/README.md) | 接口层。评测对象常常是 extensions 的行为；评测用例本身不因此变成 extension。 |
| [`observation/`](../observation/README.md) | 观测提供「野外看到了什么」；本目录把假设做成可复现对照。观测不是评测。 |

## 起步布局

先有真实用例再往下加目录，不要预埋空数据文件。

- [`run_locomo_official.py`](run_locomo_official.py)：首选官方路径（VirusPC/locomo submodule → `task_eval/evaluate_qa.py` → official `evaluation.py` F1）
- [`third_party/`](third_party/README.md)：评测用 git submodule（现有 [`third_party/locomo/`](third_party/locomo)）
- [`retrieval_eval/`](retrieval_eval/run.py)：仓库 URL × agent client × samples 的检索评测。第一组克隆 `edges` 的 `main`，用 `codex exec` 交出路径，按簇打 P@5 / R@5 / nDCG@5。这是评测冒烟。
- [`cases/`](cases/README.md)：用例与 benchmark 定义（[`cases/locomo-smoke/`](cases/locomo-smoke/README.md) 是历史 hand-port，legacy）
- [`reports/`](reports/README.md)：某次运行的报告
- 本 README

LoCoMo 冒烟是 Evaluation Smoke，不是 Benchmark Proof，也不是 Project Memory proof。见 [`docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md`](../../docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md)。

## Clone with the LoCoMo submodule

```bash
git clone --recurse-submodules https://github.com/VirusPC/edges.git
```

Already cloned without the submodule:

```bash
git submodule update --init .harness/evaluation/third_party/locomo
```

## Preferred official-path smoke

Print the official `evaluate_qa.py` command (no API key; safe in CI):

```bash
python3 .harness/evaluation/run_locomo_official.py print-command
```

Live conv-44 / 2 QA per category / `kimi-for-coding` run (key via env, never commit the key):

```bash
pip install -r .harness/evaluation/third_party/locomo/requirements-openai-compat.txt
KIMI_API_KEY=... OPENAI_BASE_URL=https://api.kimi.com/coding/v1 \
  python3 .harness/evaluation/run_locomo_official.py smoke
```

Optional official crop (keeps `observation` / `session_summary` / `event_summary` for later RAG; default out-file is gitignored under `.harness/evaluation/.cache/`):

```bash
python3 .harness/evaluation/run_locomo_official.py crop
```

Reports go to [`reports/`](reports/README.md) with titles that say **Evaluation Smoke / not Project Memory proof**. F1 is official `task_eval/evaluation.py`, not the hand-port in `cases/locomo-smoke/scoring.py`.

Retrieval smoke prints the clone and `codex exec` commands without running them:

```bash
python3 .harness/evaluation/retrieval_eval/run.py print-command
```

A live run clones `https://github.com/VirusPC/edges.git` at `main` into `.harness/evaluation/.cache/` (gitignored), then runs `codex exec --json` once per sample. The default `codex` client also passes `-c model_reasoning_summary=detailed`, `-c show_raw_agent_reasoning=true`, and `-c model_reasoning_effort=high`, so the event stream includes `reasoning` items. Those three settings are written on the report and on the exported root span (`reasoning_summary`, `reasoning_effort`, `show_raw_reasoning`) so runs with different effort are not compared silently. Change them in [`retrieval_eval/config/clients.json`](retrieval_eval/config/clients.json). The report lands in [`reports/`](reports/README.md) and is an Evaluation Smoke, not a Benchmark Proof.

```bash
python3 .harness/evaluation/retrieval_eval/run.py run
```

第二个 client 是 [pi-coding-agent](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)（CLI `pi`，已在 1.3.0 上核对，需要 Node.js >= 22.19）。默认配置块仍是 `codex`。单样本冒烟用 `--client` 和 `--samples` 换 client 与样本集，不改 `config.json`：

```bash
python3 .harness/evaluation/retrieval_eval/run.py print-command --client pi --samples retrieval-smoke/edges-one
MINIMAX_API_KEY=... python3 .harness/evaluation/retrieval_eval/run.py run --client pi --samples retrieval-smoke/edges-one
```

`retrieval-smoke/edges-one` 只有 `edges_smoke_0008`。`pi` 的 provider / model 是 `minimax-cn` / `MiniMax-M3`，thinking 是 `high`。不传 `--tools`，用 pi 的默认工具 `read`、`bash`、`edit`、`write`。命令是 `--mode json --no-session -ns -np -nc --no-themes --no-mcp -na --offline`，工作目录是克隆下来的仓库，stdin 关闭。没有 `-o` 和 max-turns，只靠 `timeout_seconds`（默认 600）。Codex 的命令和沙箱不变。

每次运行另建一个临时 `PI_CODING_AGENT_DIR`。先写入 `sandbox.json`，再执行 `pi install npm:pi-sandbox@0.7.1 --no-approve`，然后用同一份读写列表在沙箱里跑一条 `true`，通过后才跑上面的命令。不传 `-ne`，装进这个目录的包才会被加载；`--no-approve` 仍忽略项目里的 `.pi`。结束后删除该目录。见 [ADR 0039](../../docs/adr/0039-pi-client-sandbox-read-scope.md)。

`filesystem.denyRead` 由 Python 把 `/` 展开成根下的真实目录：跳过符号链接，也跳过 `proc`、`dev`、`sys`。`allowRead` 是 `["."]` 再加上仍是真实目录、不是符号链接的系统路径（候选为 `/usr`、`/bin`、`/lib`、`/lib64`，macOS 上还有 `/System`）。merged-/usr 上 `/bin`、`/lib`、`/lib64` 是指向 `usr/...` 的符号链接，两边都不写；`/usr` 仍在 `allowRead` 里，`bash`、`rg`、`git`、`python3` 走 `/usr/bin`。`allowWrite` 是 `[]`。插件写了某个数组就不再并上该键的默认值，所以空的 `allowWrite` 会去掉默认的 `.` 和 `/tmp`。若把 `denyRead` 写成 `["/"]`，插件会跟符号链接给 `/bin` 挂 tmpfs，bubblewrap 0.11 及以上报 `Can't mount on symlink destination /bin`，每条 bash 退出码 1，而 pi 进程仍可能是 0。展开后副本内可读，副本外的仓库文件、`/home`、`/etc`、宿主机 `/tmp` 不可读；`/proc/1/root` 为 Permission denied。`read` / `write` / `edit` 走同一份允许列表。

`@carderne/sandbox-runtime` 仍会把 `/tmp/agents`、`~/.npm/_logs`、`~/.claude/debug` 做成可写挂载，空的 `allowWrite` 去不掉。`denyWrite` 写上这几项（以及 macOS 的 `/private/tmp/agents`），写入变成只读文件系统错误。这几项目录里的已有文件，bash 仍能读到。bash 往其它 `/tmp` 路径写，会写进那块空 tmpfs，退出码可能是 0，但落不到宿主机，也改不到真正的 `sandbox.json`。bash 里仍能看到 `MINIMAX_CN_API_KEY`。

`--mode json` 没有界面。沙箱初始化失败时，插件只做一次不会显示出来的通知，然后继续无沙箱运行。评测不跟着降级：Linux 上缺少 `rg`、`bwrap` 或 `socat`，macOS 上缺少 `sandbox-exec`，`pi install` 失败，或沙箱里的 `true` 非 0，该样本记 `parse_error`（自检失败为 `pi sandbox bash check failed: ...`），不启动后面的 pi。依赖齐全且自检通过时，越界由沙箱阻止，评测不再另做越界检测或标记。

`clients.json` 里 `MINIMAX_CN_API_KEY` 写成 `$MINIMAX_API_KEY`，运行时从进程环境展开；变量缺失则该样本记 `parse_error`，错误里只有变量名。`PI_TELEMETRY` 固定为 `0`。认证失败时退出码仍可能是 0，最后一条 assistant `message_end` 的 `stopReason` 为 `error` 或 `aborted` 时记为失败。`pi --version` 的第一行写入 trace metadata `client_version`。

过程痕迹留在缓存，不进 `reports/`。一次 `run` 后，样本 `<sample_id>` 的事件流（Codex 的 `command_execution`、`reasoning`、`agent_message`、`turn.completed`，或 pi 的 `message_end` / `tool_execution_*`）在：

`.harness/evaluation/.cache/retrieval/sessions/<时间戳>/<cell_id>/<sample_id>.events.jsonl`

同目录的 `<sample_id>.last.txt`：Codex 是 `-o` 写下的最终消息，打分优先读它；pi 没有 `-o`，runner 把最后一条 `stopReason=stop` 的 assistant 文本写到同一路径。`<sample_id>.stderr.txt` 是该次进程的 stderr。Codex 的文件搜索和读取没有单独的事件类型，它们出现在 `command_execution`（`rg`、`cat` 等）里。pi 的工具调用在 `tool_execution_start` / `tool_execution_end`。

可选上报走 Observation 的 [`TraceExporter`](../observation/langfuse_sink/)（[ADR 0038](../../docs/adr/0038-observation-trace-exporter.md)）。`import retrieval_eval` 时把 `.harness/observation` 放进 `sys.path`，然后 `import langfuse_sink`。这个包不安装，也不带第三方依赖。三个环境变量都设置时，`exporter_from_env()` 返回会 POST 的 exporter，每个样本打分后调用 `export(trace)`；缺任何一个则是 no-op。变量是 `LANGFUSE_HOST`（未设置时用 `LANGFUSE_BASE_URL`）、`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`。上传失败只往 stderr 打一行，不影响分数。密钥和实例域名不要写进仓库，轨迹也不进 `reports/`。`service.name` 仍由评测写成 `edges-retrieval-eval`。

同一次 `run` 共用一个 session，每个样本仍是一条 trace。session id 由 `make_session_id(namespace="retrieval", ...)` 生成，格式仍是 `retrieval/{样本集}:{仓库}:{client}/{时间戳}/{4位hex}`，不是单独的时间戳。样本集路径里的 `/` 写成 `:`；仓库 id 若已是样本集最后一段就不再重复。多个 cell 用 `+` 连起来。例如 `retrieval/retrieval-smoke:edges:codex/2026-10-19-021500/ab12`。Codex 事件流里若已有 `model` 或 `cli_version`，会抄进 trace metadata；不会再跑 `codex --version`。pi 的 `model` / `provider` 从事件里的嵌套字段读取，版本来自 `pi --version`。child span 按 `client.kind` 分派：Codex 走 `spans_from_codex_jsonl`，pi 走 `spans_from_pi_jsonl`。

Official-path tests (no API key):

```bash
python3 -m unittest discover -s .harness/evaluation/tests -v
```
