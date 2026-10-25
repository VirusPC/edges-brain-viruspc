# langfuse-experiment-webhook

**业务 = 薄封装。运维壳 = 公网 HTTPS / 保活。**

Langfuse 的 Custom Experiment 向一个 URL 发 HTTPS POST。签名、HTTP 和按 Dataset 名字调度在框架仓 [`packages/services/experiment-webhook`](https://github.com/VirusPC/edges/tree/7da7994ad6a269514248c3f1a0f5827279f4969c/packages/services/experiment-webhook)。本目录只负责把这个进程放到 `lf-experiment.viruspc.tech` 上，并在框架包能导入时把请求交给它。

公网 URL：`https://lf-experiment.viruspc.tech/langfuse/experiment`

## 文件归哪边

| | 路径 | 内容 |
|---|---|---|
| 薄封装 | [`business/`](business/README.md) | 找框架包、补上本部署的监听默认值，然后调用 `experiment_webhook` |
| 运维壳 | [`ops/`](ops/README.md) | 域名、隧道、systemd、托管环境变量、可选容器 |

找不到框架包时进程退出，不退回以前写在本仓的 dry-run HTTP。已经在跑的 unit 不要先重启；步骤在 [ops/README.md](ops/README.md) 的「迁移」。

本机看进程：`cd business && python3 -m langfuse_experiment_webhook`。测试：`cd business && python3 -m unittest discover -s tests -v`。
