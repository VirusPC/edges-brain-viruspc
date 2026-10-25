# 运维壳：公网 HTTPS / 保活

业务进程是普通 HTTP，听 `127.0.0.1:8787`。Langfuse 保存 webhook 时会跑 `validateWebhookURL`：要公网 HTTPS、端口 443，并且拒绝 localhost 和内网地址。所以壳是下面几件事，不是更多业务代码。

公网 URL：`https://lf-experiment.viruspc.tech/langfuse/experiment`

## 文件

| 文件 | 作用 |
|---|---|
| `.env.example` | 托管时的环境变量名。复制成机器上的 env 文件再填，真实值不入库 |
| `langfuse-experiment-webhook.service` | systemd 保活。`Restart=always` |
| `cloudflared-ingress.yml` | 只给本服务的隧道 ingress：主机名 → `http://127.0.0.1:8787` |
| `docker-compose.yml`、`Dockerfile` | 可选的另一套保活。日常用上面的 unit |

Langfuse 自建 compose 不动。tunnel token 和 DNS 凭证留在本机。

## 保活

1. 把仓库里的 `business/` 放到这台机器上。
2. `cp .env.example` 到 unit 里的 `EnvironmentFile` 路径（示例是 `/etc/langfuse-experiment-webhook.env`），改掉 unit 里的 `WorkingDirectory`。
3. `sudo systemctl enable --now langfuse-experiment-webhook.service`

未设置 `DRY_RUN` 时进程仍是 dry-run。暴露到公网前设置 `LANGFUSE_WEBHOOK_SECRET`。

## 公网

1. DNS：`lf-experiment.viruspc.tech` CNAME 到这条 Cloudflare Tunnel。
2. 把 [`cloudflared-ingress.yml`](cloudflared-ingress.yml) 里的 hostname 规则并进隧道配置，重载 cloudflared。隧道终结 HTTPS，源站仍是本机 HTTP。
3. Langfuse UI → 数据集 → Start Experiment → Custom Experiment：URL 填上面的公网地址。

可选容器（在本目录，先有 `.env`）：

```bash
cp .env.example .env
docker compose up --build
```
