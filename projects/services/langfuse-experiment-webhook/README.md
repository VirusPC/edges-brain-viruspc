# langfuse-experiment-webhook

**业务 = 收 POST。运维壳 = 公网 HTTPS / 保活。**

Langfuse 的 Custom Experiment 就是向一个 URL 发普通 HTTPS POST。进程收下后立刻回 202，后台默认 dry-run。复杂的是把这个进程一直放在公网上：systemd 保活、Cloudflare Tunnel、DNS、HTTPS。

公网 URL：`https://lf-experiment.viruspc.tech/langfuse/experiment`

## 文件归哪边

| | 路径 | 内容 |
|---|---|---|
| 业务 | [`business/`](business/README.md) | 收 POST → 202 → 后台 dry-run 或外部 runner |
| 运维壳 | [`ops/`](ops/README.md) | systemd、隧道、DNS/HTTPS、托管环境变量、可选容器 |

业务：

- `business/langfuse_experiment_webhook/`：进程。`GET /health`，`POST /langfuse/experiment`
- `business/tests/`：健康检查和 dry-run 示例 POST

运维壳：

- `ops/langfuse-experiment-webhook.service`：保活
- `ops/cloudflared-ingress.yml`：`lf-experiment.viruspc.tech` → `http://127.0.0.1:8787`
- `ops/.env.example`：托管用的变量名，没有真实值
- `ops/Dockerfile`、`ops/docker-compose.yml`：可选容器。不并进 Langfuse compose

打分、prompt、消融放在外部 runner，用 `EXPERIMENT_RUNNER_CMD` 或 `EXPERIMENT_RUNNER_URL` 接。默认 dry-run，不调用模型。

本机看进程：`cd business && python3 -m langfuse_experiment_webhook`。测试：`cd business && python3 -m unittest discover -s tests -v`。壳怎么装见 [ops/README.md](ops/README.md)。
