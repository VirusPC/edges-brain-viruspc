# 模型与榜单

这一路保存模型相关的原始响应。不在这里做价格排名、速度排名或给读者看的说明。和 GitHub 项目榜分开。

目标目录 `raw/models/`：

- `aa-language-models.json`：Artificial Analysis 免费接口。保留 `performance` 四个中位数和 `performance_v3` 三个均值。这两份速度是备份。
- `llm-arena-<榜单发布日>.json`：窗口结束日之前最近一份已发布榜。
- `openrouter-rankings-daily.json`、`openrouter-rankings-programming.json`、`openrouter-app-rankings.json`：日用量、编程用量、应用用量。`openrouter-app-rankings-coding.json` 只作旁路。
- `openrouter-official-endpoints.json`：官方端点原始目录。匹配规则以 `scripts/prepare/models/fetch_openrouter_endpoints.py` 为准。
- 官方发布原文能抓到的，按来源另存；抓不到就写入 `raw/gaps.json`。

密钥只用环境变量 `AA_API_KEY`（或 `ARTIFICIAL_ANALYSIS_API_KEY`）和 `OPENROUTER_API_KEY`。不写进命令、日志或文件。没有密钥就跳过该文件，在 `raw/gaps.json` 写明，不用空文件假装有数据。端点要等 AA 这份文件有了结果再拉；没有密钥就不请求端点。

## 契约

输入是 `raw/window.json` 的 `since`、`until`，以及环境变量里的密钥。没有生成日就停止。

输出是上面列出的 `raw/models/` 文件。Schema 在 `schemas/raw/models/`，文件名与输出文件对应（Arena 用 `llm-arena.schema.json`）。

写完立刻校验：

```bash
python3 scripts/prepare/models/validate.py issues/<生成日>
```

在本 skill 目录执行。阶段汇合走 [准备汇合](check.md)。

## 命令

```bash
PY=/tmp/weekly-ai-blogs-digest-py312/bin/python
$PY scripts/prepare/models/fetch_artificial_analysis.py --limit 0 \
  --out issues/<生成日>/raw/models/aa-language-models.json
$PY scripts/prepare/models/fetch_llm_arena.py --until <生成日的 D-1> \
  --out issues/<生成日>/raw/models/llm-arena-<榜单发布日>.json
$PY scripts/prepare/models/fetch_openrouter.py --since <生成日的 D-7> --until <生成日的 D-1> \
  --out-dir issues/<生成日>/raw/models
$PY scripts/prepare/models/fetch_openrouter_endpoints.py \
  --aa issues/<生成日>/raw/models/aa-language-models.json \
  --out issues/<生成日>/raw/models/openrouter-official-endpoints.json
```

这些命令在数据仓库的工作副本里执行，文件落在 `issues/<生成日>/raw/models/`。AA 全量不按文章窗口过滤。Arena 和 OpenRouter 用量使用上面的窗口。
