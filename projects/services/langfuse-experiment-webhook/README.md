# langfuse-experiment-webhook

Langfuse 数据集页面里的 Custom Experiment（Dataset → Start Experiment → ⚡）把一次触发 POST 到这里。本服务只负责接住请求、尽快回 2xx，再在后台做 dry-run 或把同一次 job 交给外部 runner。

本目录只做触发入口。打分、prompt、模型调用和消融条件放在外部 runner 里，用环境变量接进来。Langfuse 自建 compose 保持原样，这个服务用自己的 `docker-compose.yml`。

## 行为

| 请求 | 结果 |
|---|---|
| `GET /health` | `200`，`{"status":"ok"}` |
| `POST /langfuse/experiment` | 校验通过后立刻 `202`，`{"accepted":true,"jobId":"..."}`，工作在后台线程里做 |

请求体是 Langfuse remote experiment 的 JSON：

```json
{
  "projectId": "proj_123",
  "datasetId": "ds_123",
  "datasetName": "sample-dataset",
  "payload": {}
}
```

`projectId`、`datasetId`、`datasetName` 必须是非空字符串。`payload` 原样保留，可以是对象、字符串或别的 JSON 值；缺省当成 `null`。

后台任务：

1. 把脱敏后的 payload 打到 stdout。字段名像 secret、token、password、api key 的值会换成 `<redacted>`。`sk-`、`pk-lf-`、`sk-lf-`、`lf-whsec_` 开头的片段同样换成 `<redacted>`。
2. `LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`、`LANGFUSE_HOST` 三个都有时，用 Public API Basic Auth 做两件事：`GET /api/public/v2/datasets/{datasetName}`，以及 `GET /api/public/dataset-items?datasetName=...&limit=1`。日志里只有数据集 id、`meta.totalItems` 和这一页的 item id。条目正文留在 Langfuse，模型调用留给外部 runner。
3. 三个里缺任何一个，就跳过 Public API。HTTP 响应仍是 202。
4. dry-run（默认）到此为止。runner 保持不动。
5. `DRY_RUN=0` 时，若设置了 `EXPERIMENT_RUNNER_CMD`，用 `shlex` 拆成参数后直接执行，job JSON 走标准输入。若设置了 `EXPERIMENT_RUNNER_URL`，再把同一份 JSON POST 过去。两个都设置时先命令、后 URL。都没设置时，日志里 `command` 和 `url` 的 `reason` 都是 `unset`。

交给 runner 的 JSON：

```json
{
  "jobId": "...",
  "projectId": "...",
  "datasetId": "...",
  "datasetName": "...",
  "payload": {},
  "dryRun": false,
  "dataset": {
    "id": "...",
    "name": "...",
    "projectId": "...",
    "itemCount": 30,
    "itemIdsSample": ["..."]
  }
}
```

Public API 没配或查询失败时 `dataset` 为 `null`。job JSON 只含这次触发的字段和数据集摘要。runner 要能重复执行：Langfuse 在没收到 2xx 时可能重试。

## 本地运行

在本目录执行。只用 Python 3.11+ 标准库，本机没有 `python` 命令时用 `python3`：

```bash
cd projects/services/langfuse-experiment-webhook
python3 -m langfuse_experiment_webhook
```

默认听 `0.0.0.0:8787`。另开一个终端：

```bash
curl -sS http://127.0.0.1:8787/health
curl -sS -D- http://127.0.0.1:8787/langfuse/experiment \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"proj_123","datasetId":"ds_123","datasetName":"sample-dataset","payload":{"note":"dry-run"}}'
```

第二条应立刻返回 `202`，body 里 `accepted` 为 `true`。stdout 里能看到脱敏后的 payload，以及 `runner skipped ... reason=dry_run`。

测试：

```bash
python3 -m unittest discover -s tests -v
```

只跑这个 webhook 的容器（先复制 env 文件；`.env` 不入库）：

```bash
cp .env.example .env
docker compose up --build
```

## 环境变量

名字和默认行为见 [`.env.example`](.env.example)。不要把真实值写进仓库。

| 变量 | 作用 |
|---|---|
| `HOST` | 监听地址，默认 `0.0.0.0` |
| `PORT` | 监听端口，默认 `8787` |
| `DRY_RUN` | 未设置、空、`1` 都是 dry-run。`0` / `false` / `no` / `off` 才调用 runner |
| `LOG_LEVEL` | 日志级别 |
| `LANGFUSE_WEBHOOK_SECRET` | 设置后才校验 `x-langfuse-signature`；不设置就跳过 |
| `LANGFUSE_WEBHOOK_TOLERANCE_SECONDS` | 签名时间戳允许偏差，默认 300 秒 |
| `LANGFUSE_HOST` | Public API 根地址，例如 `https://cloud.langfuse.com` |
| `LANGFUSE_PUBLIC_KEY` | Public API 公钥 |
| `LANGFUSE_SECRET_KEY` | Public API 私钥 |
| `LANGFUSE_API_TIMEOUT_SECONDS` | Public API 超时，默认 20 |
| `EXPERIMENT_RUNNER_CMD` | dry-run 关闭时执行的命令，stdin 为 job JSON |
| `EXPERIMENT_RUNNER_URL` | dry-run 关闭时 POST job JSON 的 `http` 或 `https` 地址 |
| `EXPERIMENT_RUNNER_TIMEOUT_SECONDS` | runner 超时，默认 600 |
| `WEBHOOK_MAX_WORKERS` | 后台线程数，默认 4 |

签名算法与 Langfuse prompt webhook 相同：请求头 `x-langfuse-signature: t=<unix 秒>,v1=<hex>`，`v1` 是 HMAC-SHA256(secret, `f"{t}.{原始 body}"`)。校验用的是原始字节，不是重新序列化的 JSON。密钥来自 Langfuse 里开启 request signing 时只显示一次的 secret。

本进程默认绑在所有网卡上。隧道或反代暴露出去之前应设置 `LANGFUSE_WEBHOOK_SECRET`，否则任何能访问该端口的人都可以塞进一个 job。

## 在 Langfuse UI 里配置

1. 打开项目 → Datasets → 选中数据集。
2. 点 Start Experiment。
3. 在 Custom Experiment 下方点 ⚡。
4. URL 填公网地址，路径是 `/langfuse/experiment`，例如 `https://lf-experiment.viruspc.tech/langfuse/experiment`。
5. Default config 会作为请求体里的 `payload` 发出；触发时还可以改。
6. 需要鉴权时打开 request signing，把一次性 secret 放进 `LANGFUSE_WEBHOOK_SECRET`。本服务只校验 `x-langfuse-signature`。
7. 保存后用 Run 触发。端点必须尽快返回 2xx，实验在 webhook 收到请求之后异步进行。

Langfuse 在保存和触发时都会调用 `validateWebhookURL`。它拒绝 localhost、内网地址，以及 80/443 以外的端口。`http://127.0.0.1:8787` 只给本机 curl。UI 里填公网 HTTPS（443），由 Cloudflare Tunnel 或反向代理转到本机 `127.0.0.1:8787`。

只给本服务用的 ingress 示例。把它放在 tunnel 自己的配置里。tunnel token 留在本机：

```yaml
ingress:
  - hostname: lf-experiment.viruspc.tech
    service: http://127.0.0.1:8787
  - service: http_status:404
```

## 接上外部 runner

具体评测放在别的目录或另一台机器上，然后：

```bash
DRY_RUN=0
EXPERIMENT_RUNNER_CMD='python /path/to/your_runner.py'
# 或者
EXPERIMENT_RUNNER_URL=https://runner.example/experiments
```

命令的标准输入、以及 POST 的 body，都是上面的 job JSON。`payload` 是 Langfuse UI 里那次实验的 config，runner 用它决定跑什么。dry-run 停在日志和可选的数据集计数。
