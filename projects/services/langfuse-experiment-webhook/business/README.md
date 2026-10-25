# 业务：收 POST

进程只做三件事：收下 Langfuse 的 HTTPS POST，立刻回 202，再在后台 dry-run 或把 job 交给外部 runner。

公网、保活、DNS 在 [`../ops/`](../ops/README.md)。

## 文件

| 文件 | 作用 |
|---|---|
| `langfuse_experiment_webhook/server.py` | `GET /health`，`POST /langfuse/experiment` → 202 |
| `langfuse_experiment_webhook/jobs.py` | 后台任务。默认 dry-run |
| `langfuse_experiment_webhook/langfuse_api.py` | 三个密钥都在时，按数据集名读条数 |
| `langfuse_experiment_webhook/runner.py` | `DRY_RUN=0` 时执行命令或 POST URL |
| `langfuse_experiment_webhook/signature.py` | 可选的 `x-langfuse-signature` |
| `langfuse_experiment_webhook/sanitize.py` | 日志脱敏 |
| `langfuse_experiment_webhook/config.py` | 读环境变量 |
| `tests/test_webhook.py` | 健康检查、202、dry-run、签名 |

环境变量的名字在 [`../ops/.env.example`](../ops/.env.example)。默认 `DRY_RUN` 未设置就是 dry-run。评测代码不在这里，用 `EXPERIMENT_RUNNER_CMD` 或 `EXPERIMENT_RUNNER_URL` 外接。

## 本机看进程

```bash
cd projects/services/langfuse-experiment-webhook/business
python3 -m langfuse_experiment_webhook
```

听 `0.0.0.0:8787`。

```bash
curl -sS http://127.0.0.1:8787/health
curl -sS -D- http://127.0.0.1:8787/langfuse/experiment \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"proj_123","datasetId":"ds_123","datasetName":"sample-dataset","payload":{"note":"dry-run"}}'
```

第二条立刻 `202`，`accepted` 为 `true`。stdout 出现 `reason=dry_run`。

```bash
python3 -m unittest discover -s tests -v
```

请求体是 `{projectId, datasetId, datasetName, payload}`。后台在三个 Langfuse 变量都有时只记录数据集 id 和条数。`DRY_RUN=0` 时，命令的 stdin 和 URL 的 body 都是同一份 job JSON。
