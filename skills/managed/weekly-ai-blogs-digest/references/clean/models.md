# 模型清洗

读取 `raw/models/`。把能对上的官方名、价格、速度、智力指数和发布时间整理成模型事实。榜单数字规范成可画图的字段，保留来源和榜单发布日。

## 契约

输入是 `raw/models/`。

输出：

- `cleaned/models/index.json`
- `cleaned/models/{id}.json`：一个官方名一个文件，含 `publisher`、`category`、`url`
- `cleaned/models/boards/`：规范化后的榜单数字，不含 GitHub 项目榜。每份含 `publisher`、`category`、`url`

Schema：

- `schemas/cleaned/models/index.schema.json`
- `schemas/cleaned/models/item.schema.json`
- `schemas/cleaned/models/board.schema.json`

价格排名和速度排名用同一个工具。`--releases` 是一份带 `models` 数组的事实文件，脚本把 `price.rank` 和 `speed.rank` 写回去。再把这些名次抄进对应的 `cleaned/models/{id}.json`。没有端点文件就去掉 `--endpoints`，速度排名为 null。

```bash
python3 scripts/clean/models/model_release_ranks.py \
  --aa issues/<生成日>/raw/models/aa-language-models.json \
  --releases <带 models 数组的事实文件> \
  --endpoints issues/<生成日>/raw/models/openrouter-official-endpoints.json \
  --pretty
```

发布方：

```bash
python3 scripts/clean/stamp_publishers.py issues/<生成日> --lane models
python3 scripts/clean/models/validate.py issues/<生成日>
```

在本 skill 目录执行。这一路写完后立刻跑校验。阶段汇合走 [清洗汇合](check.md)。

价格先用发布原文，原文没有再用 OpenRouter 官方提供商。速度用官方标准档的 latency / throughput。智力指数用 Artificial Analysis，变体记在来源里。缺的数字写「暂无」，不拿后来的报价填充。

价格排名的指标是 (输入价 + 3 × 输出价) / 4。速度排名用端点 latency。算完的名次写入各条 `cleaned/models/{id}.json`。

用量榜的名次不写进模型事实。官方名变了，才影响后面用这个名字做 ID 的文件。
