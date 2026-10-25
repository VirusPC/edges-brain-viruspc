# services

可运行的个人服务。和某一次评测、Langfuse 自建 compose 分开存放。

- [langfuse-experiment-webhook](langfuse-experiment-webhook/README.md)：Langfuse UI「Custom Experiment」的公网入口。`business/` 把请求交给框架仓 `experiment-webhook`；`ops/` 是域名、隧道和保活。
