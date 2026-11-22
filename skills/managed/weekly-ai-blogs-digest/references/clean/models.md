# 模型清洗

读取 `raw/models/`。把能对上的官方名、价格、速度、智力指数和发布时间整理成模型事实。榜单数字规范成可画图的字段，保留来源和榜单发布日。

产出：

- `cleaned/models/index.json`
- `cleaned/models/{id}.json`：一个官方名一个文件
- `cleaned/models/boards/`：规范化后的榜单数字，不含 GitHub 项目榜

价格先用发布原文，原文没有再用 OpenRouter 官方提供商。速度用官方标准档的 latency / throughput。智力指数用 Artificial Analysis，变体记在来源里。缺的数字写「暂无」，不拿后来的报价填充。

`scripts/clean/models/model_release_ranks.py` 用同一份 AA 标价写价格排名，指标是 (输入价 + 3 × 输出价) / 4。速度排名用端点 latency。结果写入 `cleaned/models/`。

用量榜的名次不写进模型事实。官方名变了，才影响后面用这个名字做 ID 的文件。
