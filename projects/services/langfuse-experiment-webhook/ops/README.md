# 运维壳：公网 HTTPS / 保活

业务进程是普通 HTTP。这台部署没写监听时，薄封装默认 `0.0.0.0:8787`，与隧道 ingress 一致。框架包自己的默认是 `127.0.0.1:8791`。Langfuse 保存 webhook 时会跑 `validateWebhookURL`：要公网 HTTPS、端口 443，并且拒绝 localhost 和内网地址。壳是下面几件事。

公网 URL：`https://lf-experiment.viruspc.tech/langfuse/experiment`

签名、按 Dataset 名字调用 runner、写 Langfuse trace，都在框架仓 `packages/services/evaluation`。本目录不复制那套代码。宿主上的运维入口是 `edges evaluation server`。`python -m langfuse_experiment_webhook` 只留给直接跑 python，以及下面的可选容器（镜像里没有 Node，也没有 `edges`）。

## 宿主

配置在 `~/.config/edges/edges.env`（`LANGFUSE_*`、`EXPERIMENT_WEBHOOK_*`，以及这台部署的 `HOST` / `PORT`）。`edges` 不再读 `artifacts-preview.env`，也不再读 `/etc/langfuse-experiment-webhook.env`。

```bash
edges config init
# 编辑 ~/.config/edges/edges.env：LANGFUSE_WEBHOOK_SECRET、LANGFUSE_*、EXPERIMENT_WEBHOOK_*、HOST、PORT
edges evaluation server install   # user systemd，只安装，不启动
edges evaluation server start
edges evaluation server status
edges evaluation server start --dev   # 前台，阻塞到进程退出
```

`install` 不启动。默认 `start` 用 user systemd。`start --dev` 在前台跑 `python3 -m experiment_webhook`。

这台机器上的框架检出是 `/home/cheng-dev/projects/edges-framework`。`edges` 要在这个账号的 `PATH` 上，并且该账号拥有 `~/.config/edges/edges.env`。

若仍要一份 system unit，用同目录的 `langfuse-experiment-webhook.service`。`ExecStart` 是 `edges evaluation server start --dev`，这样这份 unit 自己监督前台进程。不要写成不带 `--dev` 的 `start`，那会再去拉起 user systemd。把 `User=` 设成上面那个账号；没设 `User=` 时 `%h` 是 `/root`。

监听：环境文件里写了 `HOST` / `PORT`（或 `EXPERIMENT_WEBHOOK_HOST` / `EXPERIMENT_WEBHOOK_PORT`）就用文件里的值。这台部署要继续对隧道暴露时，写成 `HOST=0.0.0.0` 和 `PORT=8787`。

签名默认开启。密钥为空时 POST 返回 401。只有本机调试可以设 `EXPERIMENT_WEBHOOK_SIGNATURE=off`。公网不要关。`DRY_RUN`、`EXPERIMENT_RUNNER_CMD`、`EXPERIMENT_RUNNER_URL` 不再有效。健康检查是 `{"ok": true}`。202 的正文字段是 `runId`。路径仍是 `GET /health` 和 `POST /langfuse/experiment`。

## 文件

| 文件 | 作用 |
|---|---|
| `.env.example` | 变量名。宿主写进 `~/.config/edges/edges.env`；可选容器复制为本目录 `.env`。真实值不入库 |
| `langfuse-experiment-webhook.service` | 可选的 system unit。`ExecStart` 调用 `edges evaluation server start --dev` |
| `cloudflared-ingress.yml` | 只给本服务的隧道 ingress：`lf-experiment.viruspc.tech` → `http://127.0.0.1:8787` |
| `docker-compose.yml`、`Dockerfile` | 可选的另一套保活。镜像里没有 `edges`，所以容器仍跑 `python -m langfuse_experiment_webhook`，构建时检出框架包的固定 commit |

Langfuse 自建 compose 不动。tunnel token 和 DNS 凭证留在本机。

## 公网

1. DNS：`lf-experiment.viruspc.tech` CNAME 到这条 Cloudflare Tunnel。
2. 把 [`cloudflared-ingress.yml`](cloudflared-ingress.yml) 里的 hostname 规则并进隧道配置，重载 cloudflared。隧道终结 HTTPS，源站仍是本机 HTTP。
3. Langfuse UI → 数据集 → Start Experiment → Custom Experiment：URL 填上面的公网地址。Dataset 名字要对上框架包 `registry.json` 里的键，第一条是 `harness-memory-ablation/v1`。

可选容器（在本目录，先有 `.env`）：

```bash
cp .env.example .env
docker compose up --build
```

镜像默认检出 `b054de961e580ae0c1ce478e3eb4065d22b958ca`（`packages/services/evaluation`）。要换框架版本，构建时传 `EDGES_REF`。
