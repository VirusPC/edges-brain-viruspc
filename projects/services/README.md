# services

可运行的个人服务。和某一次评测、Langfuse 自建 compose 分开存放。

- [langfuse-experiment-webhook](langfuse-experiment-webhook/README.md)：Langfuse UI「Custom Experiment」的 webhook。`business/` 收 POST，`ops/` 是公网 HTTPS 和保活。默认 dry-run，具体 runner 用环境变量外接。
