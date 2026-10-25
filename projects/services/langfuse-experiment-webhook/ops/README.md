# 运维壳：公网 HTTPS / 保活

业务进程是普通 HTTP，听 `0.0.0.0:8787`（环境文件没写监听时也是这个）。Langfuse 保存 webhook 时会跑 `validateWebhookURL`：要公网 HTTPS、端口 443，并且拒绝 localhost 和内网地址。壳是下面几件事。

公网 URL：`https://lf-experiment.viruspc.tech/langfuse/experiment`

签名、按 Dataset 名字调用 runner、写 Langfuse trace，都在框架仓 `packages/services/experiment-webhook`。本目录不复制那套代码。

## 迁移

2026-10-25 之前，`python3 -m langfuse_experiment_webhook` 是本仓自带的 dry-run 进程：没设 `LANGFUSE_WEBHOOK_SECRET` 就跳过签名，`DRY_RUN` 默认开着，评测靠 `EXPERIMENT_RUNNER_CMD` 或 `EXPERIMENT_RUNNER_URL`。

现在这条命令只做薄封装。已经在跑的 systemd unit **先不要重启**，按下面做完再切：

1. 框架仓检出要含 `packages/services/experiment-webhook`（`VirusPC/edges` main，`7da7994ad6a269514248c3f1a0f5827279f4969c` 起）。这台机器上的框架检出是 `/home/cheng-dev/projects/edges-framework`。
2. 在 unit 或 EnvironmentFile 里设置 `EDGES_ROOT`（框架仓根）或 `EXPERIMENT_WEBHOOK_HOME`（指到 `packages/services/experiment-webhook`）。两个都不设时，新进程退出，不会退回旧的 dry-run 服务器。
3. 设置 `LANGFUSE_WEBHOOK_SECRET`，并在 Langfuse 的 webhook 配置里用同一个 secret。签名现在默认开启：密钥为空时 POST 返回 401，不再当未签名请求收下。只有本机调试可以设 `EXPERIMENT_WEBHOOK_SIGNATURE=off`。公网不要关。
4. `DRY_RUN`、`EXPERIMENT_RUNNER_CMD`、`EXPERIMENT_RUNNER_URL` 不再有效。runner 由框架包的 `registry.json` 按 `datasetName` 选择。旧变量若还留在环境文件里，进程只记下变量名。
5. 健康检查从 `{"status":"ok"}` 变成 `{"ok":true}`。202 的正文字段从 `jobId` 变成 `runId`。路径仍是 `GET /health` 和 `POST /langfuse/experiment`。
6. 监听默认仍是 `8787`，隧道 ingress 不用改。环境文件里如果写了 `PORT`，以文件为准。

`ExecStart` 仍是 `python3 -m langfuse_experiment_webhook`，`WorkingDirectory` 仍是本服务的 `business/`。

## 文件

| 文件 | 作用 |
|---|---|
| `.env.example` | 托管时的环境变量名。复制成机器上的 env 文件再填，真实值不入库 |
| `langfuse-experiment-webhook.service` | systemd 保活。`Restart=always` |
| `cloudflared-ingress.yml` | 只给本服务的隧道 ingress：`lf-experiment.viruspc.tech` → `http://127.0.0.1:8787` |
| `docker-compose.yml`、`Dockerfile` | 可选的另一套保活。镜像在构建时检出框架包的固定 commit |

Langfuse 自建 compose 不动。tunnel token 和 DNS 凭证留在本机。

## 保活

1. 把仓库里的 `business/` 放到这台机器上。
2. `cp .env.example` 到 unit 里的 `EnvironmentFile` 路径（示例是 `/etc/langfuse-experiment-webhook.env`），填上 `EDGES_ROOT` 和 `LANGFUSE_WEBHOOK_SECRET`。改掉 unit 里的 `WorkingDirectory`。
3. 确认框架包能被这个环境找到之后，再 `sudo systemctl enable --now langfuse-experiment-webhook.service`。

## 公网

1. DNS：`lf-experiment.viruspc.tech` CNAME 到这条 Cloudflare Tunnel。
2. 把 [`cloudflared-ingress.yml`](cloudflared-ingress.yml) 里的 hostname 规则并进隧道配置，重载 cloudflared。隧道终结 HTTPS，源站仍是本机 HTTP。
3. Langfuse UI → 数据集 → Start Experiment → Custom Experiment：URL 填上面的公网地址。Dataset 名字要对上框架包 `registry.json` 里的键，第一条是 `harness-memory-ablation/v1`。

可选容器（在本目录，先有 `.env`）：

```bash
cp .env.example .env
docker compose up --build
```

镜像默认检出 `7da7994ad6a269514248c3f1a0f5827279f4969c`。要换框架版本，构建时传 `EDGES_REF`。
