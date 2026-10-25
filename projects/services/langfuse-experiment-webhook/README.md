# langfuse-experiment-webhook

**业务 = 薄封装。运维壳 = 公网 HTTPS / 保活。**

Langfuse 的 Custom Experiment 向一个 URL 发 HTTPS POST。签名、HTTP 和按 Dataset 名字调度在框架仓 [`packages/services/evaluation`](https://github.com/VirusPC/edges/tree/b054de961e580ae0c1ce478e3eb4065d22b958ca/packages/services/evaluation)。本目录只负责把这个进程放到 `lf-experiment.viruspc.tech` 上。宿主保活是 `edges evaluation server`；薄封装只在还要直接跑 python，或跑没有 `edges` 的可选容器时使用。

公网 URL：`https://lf-experiment.viruspc.tech/langfuse/experiment`

## 文件归哪边

| | 路径 | 内容 |
|---|---|---|
| 薄封装 | [`business/`](business/README.md) | 找框架包、补上本部署的监听默认值，然后调用 `experiment_webhook` |
| 运维壳 | [`ops/`](ops/README.md) | 域名、隧道、systemd、托管环境变量、可选容器 |

找不到框架包时薄封装退出，不退回以前写在本仓的 dry-run HTTP。宿主步骤在 [ops/README.md](ops/README.md)。

宿主：`edges config init`，然后 `edges evaluation server install` / `start`。直接看薄封装：`cd business && EDGES_ROOT=/path/to/edges python3 -m langfuse_experiment_webhook`。测试：`cd business && python3 -m unittest discover -s tests -v`。
