# 薄封装

进程做两件事：找到框架仓的 `experiment_webhook`，补上这个部署的监听默认值，然后调用它的 `serve()`。签名、`GET /health`、`POST /langfuse/experiment`、202 之后的调度都不在这里。

公网、保活、DNS 在 [`../ops/`](../ops/README.md)。

## 文件

| 文件 | 作用 |
|---|---|
| `langfuse_experiment_webhook/wrap.py` | 解析 `EDGES_ROOT` / `EXPERIMENT_WEBHOOK_HOME`，未设置时默认 `0.0.0.0:8787` |
| `langfuse_experiment_webhook/server.py` | 兼容入口，转到 `wrap.main` |
| `tests/test_wrap.py` | 路径优先级、退役变量只记名字、以及对着固定 commit 的框架包打一次签名 POST |

框架包在 `PYTHONPATH` 上、或 `EDGES_ROOT` 指向框架仓检出、或 `EXPERIMENT_WEBHOOK_HOME` 指向 `packages/services/experiment-webhook` 时可用。三者都没有时进程退出。

`EXPERIMENT_WEBHOOK_HOME` 优先于 `EDGES_ROOT`，两者都优先于已经能导入的 `experiment_webhook`。

未设置 `HOST` / `EXPERIMENT_WEBHOOK_HOST` 时听 `0.0.0.0`。未设置 `PORT` / `EXPERIMENT_WEBHOOK_PORT` 时听 `8787`。未设置 `EXPERIMENT_WEBHOOK_REPORTS_DIR` 时报告写到本目录的 `reports/`（不入库）。环境文件里写了的值保持不变。

下面这些变量还在环境里时只打一条日志，进程不读它们的值：`DRY_RUN`、`EXPERIMENT_RUNNER_CMD`、`EXPERIMENT_RUNNER_URL`、`EXPERIMENT_RUNNER_TIMEOUT_SECONDS`、`WEBHOOK_MAX_WORKERS`、`LANGFUSE_API_TIMEOUT_SECONDS`。

## 本机看进程

```bash
cd projects/services/langfuse-experiment-webhook/business
EDGES_ROOT=/path/to/edges python3 -m langfuse_experiment_webhook
```

`EDGES_ROOT` 换成框架仓检出。听 `0.0.0.0:8787`。健康检查是框架包的 `{"ok": true}`。签名默认开启，没设 `LANGFUSE_WEBHOOK_SECRET` 时 POST 为 401。

```bash
python3 -m unittest discover -s tests -v
```

集成测试会把 `VirusPC/edges` 的 `7da7994ad6a269514248c3f1a0f5827279f4969c` 稀疏检到临时目录。需要能访问 GitHub。
