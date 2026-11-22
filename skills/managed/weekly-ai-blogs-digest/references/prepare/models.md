# 模型与榜单

这一路保存模型相关的原始响应。不在这里做价格排名、速度排名或给读者看的说明。和 GitHub 项目榜分开。

目标目录 `raw/models/`：

- `aa-language-models.json`：Artificial Analysis 免费接口。保留 `performance` 四个中位数和 `performance_v3` 三个均值。这两份速度是备份。
- `llm-arena-<榜单发布日>.json`：窗口结束日之前最近一份已发布榜。
- `openrouter-rankings-daily.json`、`openrouter-rankings-programming.json`、`openrouter-app-rankings.json`：日用量、编程用量、应用用量。`openrouter-app-rankings-coding.json` 只作旁路。
- `openrouter-official-endpoints.json`：官方端点原始目录。匹配规则以 `scripts/fetch_openrouter_endpoints.py` 为准。
- 官方发布原文能抓到的，按来源另存；抓不到就写入 `raw/gaps.json`。

密钥只用环境变量 `AA_API_KEY`（或 `ARTIFICIAL_ANALYSIS_API_KEY`）和 `OPENROUTER_API_KEY`。不写进命令、日志或文件。没有密钥就跳过该文件，在 `raw/gaps.json` 写明，不用空文件假装有数据。端点要等 AA 这份文件有了结果再拉；没有密钥就不请求端点。

## 现行命令

```bash
PY=/tmp/weekly-ai-blogs-digest-py312/bin/python
$PY scripts/fetch_artificial_analysis.py --limit 0 \
  --out issues/<生成日>/aa-language-models.json
$PY scripts/fetch_llm_arena.py --until <生成日的 D-1> \
  --out issues/<生成日>/llm-arena-<榜单发布日>.json
$PY scripts/fetch_openrouter.py --since <生成日的 D-7> --until <生成日的 D-1> \
  --out-dir issues/<生成日>
$PY scripts/fetch_openrouter_endpoints.py \
  --aa issues/<生成日>/aa-language-models.json \
  --out issues/<生成日>/openrouter-official-endpoints.json
```

这些命令今天仍写期次根目录。AA 全量不按文章窗口过滤。Arena 和 OpenRouter 用量使用上面的窗口。
