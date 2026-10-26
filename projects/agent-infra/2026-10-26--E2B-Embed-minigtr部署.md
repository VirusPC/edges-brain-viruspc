# 2026-10-26 E2B Embed 在 minigtr-ubuntu 部署记录

## 背景

要在本机给 agent / 评估任务用**真实文件系统隔离**的沙箱（Pi 自带沙箱只有本地执行权限隔离，不够）。选型走官方 **E2B Embed**（单机 Docker Compose + Firecracker/KVM），与现有 Langfuse **同机共存**，只改 E2B 端口。

一手调研见同目录 `2026-10-26--E2B-Embed自部署调研.md`。

## 主机与前置

- 机器：minigtr Ubuntu 侧（对话/台账名 minigtr-ubuntu）
- Docker / Compose 已满足 Embed 要求；`viruspc` 在 `docker`、`kvm` 组；`/dev/kvm` 可读
- 部署目录：`~/services/e2b-embed/`
- 内存当时约 55 GiB available；默认 `HUGEPAGES=2048`（约 4 GiB）可接受
- Langfuse 已占用：`3000`、`5432`、`6379`、`8123`、`9000`（不动）

## 端口重映射（相对官方 compose）

| 服务 | 官方默认 | 本机 |
|---|---|---|
| API（host network） | 3000 | **3100** |
| Dashboard（host） | 3001 | 3001 |
| Client proxy（host） | 3002 / 3003 | 3002 / 3003 |
| Dashboard API（host） | 3010 | 3010 |
| Postgres publish | 127.0.0.1:5432 | **127.0.0.1:15432** |
| Redis publish | 127.0.0.1:6379 | **127.0.0.1:16379** |
| ClickHouse HTTP / native | 8123 / 9000 | **18123 / 19000** |

同时改了：API `command --port`、healthcheck、`POSTGRES_CONNECTION_STRING` / `REDIS_URL` / `CLICKHOUSE_CONNECTION_STRING`、orchestrator/dashboard 等处的 `E2B_*_API_URL`，以及 `ready` 写出的 `sdk.env` 模板（`E2B_API_URL=…:3100`）。原文件备份为 `compose.yaml.upstream` / `.env.upstream`；目录内有 `PORTS.md`。

## 安装步骤（已执行）

```bash
mkdir -p ~/services/e2b-embed && cd ~/services/e2b-embed
curl -fsSL --remote-name-all \
  "https://raw.githubusercontent.com/e2b-dev/runtime/main/embed/compose/{compose.yaml,.env}"
# …按上表改 compose.yaml…
sg kvm -c 'docker compose up -d --build --wait'
```

首次会拉 `us-docker.pkg.dev/e2b-prod/...` 等镜像，并构建 base template（本机约 5 分钟量级）。

## 验收

- `curl http://127.0.0.1:3100/health` → Health check successful
- Dashboard `http://127.0.0.1:3001` → HTTP 200
- `docker compose --profile test run --rm smoke` → `smoke: ok`（sandbox 经 `http://127.0.0.1:3002` 通）
- Langfuse `http://127.0.0.1:3000` → 仍 200；容器仍 Up

取本机 SDK 环境（**勿把 API key 写进公开笔记**）：

```bash
cd ~/services/e2b-embed
eval "$(docker compose exec ready cat /run/e2b/sdk.env)"
# 或：chmod 600 ~/services/e2b-embed/sdk.env 后 source
```

预期变量：`E2B_API_URL=http://localhost:3100`，`E2B_SANDBOX_URL=http://localhost:3002`，`E2B_DASHBOARD_URL=http://localhost:3001`。

Tailscale 他机访问时，把 `localhost` 换成该机 MagicDNS / Tailscale IP，并只暴露需要的端口；**不要**把未鉴权的内部口（调研笔记里提到的 5008 等）打到公网。

## 运维

- 停服务（保留数据与 `/var/lib/e2b`）：`docker compose down`
- 连库 volume 一起清：`docker compose down -v`
- 撤销 host 侧改动：须先 down -v，再 `docker compose --profile purge run --rm host-teardown`
- 与 Langfuse 共存：两边各自 compose；回滚 E2B 不要动 Langfuse volumes

## 结果

minigtr-ubuntu 上 E2B Embed 已可本地用；与 Langfuse 端口冲突通过改 E2B 侧解决；官方 smoke 通过。公网 Tunnel / 固定域名未做，需要时另开。
