# 01 采集数据并存入 ai-news-data

这一步只抓取并落盘。不选文，不写周报正文。

## 存到哪里

仓库 [VirusPC/ai-news-data](https://github.com/VirusPC/ai-news-data)，目录 `issues/YYYY-MM-DD/`，日期是生成日 D。

| 文件 | 内容 |
| --- | --- |
| `feeds.json` | `fetch_feeds.py --out` 的全文，就是 feed 给出的正文，不截断，也不打开文章页去补。一份文件，不再另存截断版。`thin` 表示这条不足 280 字或为空，原样保留。 |
| `feeds.index.json` | `--index-out`。只有标题、日期、链接、来源、`thin` 和开头约 400 字。选文只读这一份。 |
| `github-trending.json` | 从同一次抓取里抽出 `github-trending-weekly-all` 的全文。文件名不变。`fetch_feeds.py` 会按日期和标题重排，所以数组顺序不是榜上名次。`github-trending-weekly-python` 和 `github-trending-weekly-typescript` 只留在 `feeds.json`。 |
| `aa-language-models.json` | Artificial Analysis 免费接口全量精简字段，含 `performance` 中位数和 `performance_v3` 均值。 |
| `llm-arena-YYYY-MM-DD.json` | 窗口结束日之前最近一份已发布榜。 |
| `openrouter-*.json` | 日用量、编程用量、应用用量；coding 应用榜只作旁路。 |
| `openrouter-official-endpoints.json` | 有智力指数且能对上一个 OpenRouter 模型 id 的官方标准档端点。速度排名用这里的 latency p50。 |
| `model-releases.json` | 模型发布的价格、速度、智力指数，以及价格排名和速度排名。 |
| `keywords.json` | 本期词云。词、种类、score、mentions、sources、weight，以及一条 `theme: true`。站点直接读 `words`。 |
| `manifest.json` | 窗口、各文件来源、条数、字节数。不含密钥。 |
| `user-backfill.json` | 用户点名补进这一期、但当时快照没有的条目。日期保持原发日。不并进 `feeds.json` 或 `feeds.index.json`，也不改 `keywords.json`。 |

这周全文大约 1.7MB，大头是 Trending README。所以全文只存一份 `feeds.json`，再用小索引和 weekly/all 摘录给撰写步骤，避免每篇文章一个文件，也避免再存一份截断稿。

密钥只用环境变量：`AA_API_KEY`（或 `ARTIFICIAL_ANALYSIS_API_KEY`）、`OPENROUTER_API_KEY`。不要写进命令行、日志、仓库或快照。需要密钥的拉取只在有密钥的机器上跑。没有密钥就跳过该文件，在 manifest 里写明没拉，不要用空文件假装有数据。

## 环境

Python 3.12。在本 skill 目录：

```bash
python3.12 -m venv /tmp/weekly-ai-blogs-digest-py312
/tmp/weekly-ai-blogs-digest-py312/bin/pip install -r scripts/requirements.txt -r scripts/requirements-leaderboard.txt
```

`scripts/requirements-leaderboard.txt` 固定 `pyarrow==17.0.0`。不要为了换解释器升级它。Debian/Ubuntu 上若 `venv` 报 ensurepip 不可用，先装 `python3.12-venv`。

订阅真源是 [`feeds/ai-coding-blogs.opml`](../feeds/ai-coding-blogs.opml)。退路和备注在 [`feeds/ai-coding-blogs.meta.json`](../feeds/ai-coding-blogs.meta.json)。没有可用原生 feed 时，可以订公开的抓取 RSS 或 BestBlogs 转换源，并保留列表页退路。已经有原生 feed 的站不要再并一份抓取源。研究向的源不要新加。主源、备源和体检见 [订阅源兜底](../../../../.edges/routines/weekly-ai-blogs-digest/INDEX.md#订阅源兜底)。

## 命令

窗口按 UTC 日历日，含两端。日期写死在命令里。

```bash
PY=/tmp/weekly-ai-blogs-digest-py312/bin/python
$PY scripts/fetch_feeds.py \
  --since YYYY-MM-DD --until YYYY-MM-DD \
  --out /path/to/ai-news-data/issues/YYYY-MM-DD/feeds.json \
  --index-out /path/to/ai-news-data/issues/YYYY-MM-DD/feeds.index.json
```

然后从 `feeds.json` 抽出 `source` 为 `github-trending-weekly-all` 的条目，写入 `github-trending.json`。文件名仍是 `github-trending.json`。名次仍以 Trending feed 的 XML 原始顺序为准，不要用这个文件的数组顺序，也不要编造名次。不要再留 daily 源。

```bash
$PY scripts/fetch_artificial_analysis.py --limit 0 \
  --out /path/to/ai-news-data/issues/YYYY-MM-DD/aa-language-models.json
$PY scripts/fetch_llm_arena.py --until YYYY-MM-DD \
  --out /path/to/ai-news-data/issues/YYYY-MM-DD/llm-arena-YYYY-MM-DD.json
$PY scripts/fetch_openrouter.py --since YYYY-MM-DD --until YYYY-MM-DD \
  --out-dir /path/to/ai-news-data/issues/YYYY-MM-DD
$PY scripts/fetch_openrouter_endpoints.py \
  --aa /path/to/ai-news-data/issues/YYYY-MM-DD/aa-language-models.json \
  --out /path/to/ai-news-data/issues/YYYY-MM-DD/openrouter-official-endpoints.json
```

`aa-language-models.json` 保留免费接口的 `performance` 四个中位数和 `performance_v3` 三个均值。2026-12-10 起 AA 把 `performance` 各字段改为 null，`performance_v3` 仍是均值。这两份速度是备份，不参与卡片上的速度排名。

`openrouter-official-endpoints.json` 的宇宙是：这份 AA 快照里有 `intelligence_index`，并且能对上一个不带 `:` 的 OpenRouter 模型 id。思考档后缀 `max`、`xhigh`、`high`、`medium`、`low`、`minimal`、`none`、`non-reasoning` 并到同一个 id。对上多个或对不上的不进入目录。每个 id 只留官方标准档：`service_tier` 不是 flex / priority / fast / ultrafast，tag 路径段里也没有这四个词；tag 根等于作者 slug，或以 `作者-` 开头（如 `google-vertex`），或落在脚本的作者别名表里（`qwen` → `alibaba` 等）。多个官方标准档取 latency p50 与 throughput p50 各自的中位数。latency 从毫秒换成秒。没有 `OPENROUTER_API_KEY` 就写成 `skipped: true`，不请求端点，manifest 写明没拉。

模型发布 facts 在有 AA 快照、OpenRouter 用量和官方端点目录之后整理进 `model-releases.json`。价格数字先用发布原文，否则用 OpenRouter 官方提供商。速度数字用上面的官方标准档 latency / throughput。智力指数用 AA 免费接口，变体记在 `aa.aa_slug`。缺的数字写「暂无」。

价格排名和速度排名在这一步算好再写入，撰写只读：

```bash
$PY scripts/model_release_ranks.py \
  --aa /path/to/ai-news-data/issues/YYYY-MM-DD/aa-language-models.json \
  --endpoints /path/to/ai-news-data/issues/YYYY-MM-DD/openrouter-official-endpoints.json \
  --releases /path/to/ai-news-data/issues/YYYY-MM-DD/model-releases.json \
  --out /path/to/ai-news-data/issues/YYYY-MM-DD/model-releases.json \
  --pretty
```

价格排名用同一份 AA 快照的标价，不用卡片上的展示价。指标 `blended_input_plus_3_output_over_4` = (输入价 + 3 × 输出价) / 4，更低更好。分母是这份快照里既有 `intelligence_index` 又有输入和输出标价的模型。竞争排名：相同价格同名次，下一名次跳过。变体用该模型的 `aa.aa_slug`。对不上则 `price.rank` 为 null。

速度排名用官方端点目录的 `latency_s`，和卡片上的秒数同一口径，不用 AA 的 `performance`。更低更好，竞争排名。分母是目录里有 latency p50 的模型。目录 skipped、缺文件，或这条没有 latency，则 `speed.rank` 为 null。

两条排名都写 `rank`、`rank_of`、`rank_metric`、`rank_source`。价格另写 `rank_value`（混合价）和 `rank_variant`（AA 变体名）。不要改已经写好的智力指数名次，也不要改卡片上的价格数字和速度数字。

关键词也在这一步写好。条目先落盘，再从这些条目里选词，不要等周报正文：

```bash
node scripts/build_keywords.mjs \
  --issues-root /path/to/ai-news-data/issues \
  --issue YYYY-MM-DD \
  --out /path/to/ai-news-data/issues/YYYY-MM-DD/keywords.json \
  --snapshot-commit <这一期快照的完整 SHA> \
  --snapshot-ref <分支或 main>
```

`--issues-root` 下面更早的 `YYYY-MM-DD/` 用来判断一个名字是不是窗口前就公开了。没有更早目录时，`gaps` 里写明，不要假装已经排除过。

选词只认快照里的连续片段，或 `model-releases.json` 的 `models[].name`。不读周报，也不把两件事拼成一个新词。

- 新模型：`model-releases.json` 里的官方名，以及发布标题里的型号，例如 `Introducing …`、`正式发布`、`开源`、`上线`，或标题就以型号开头。`score` 为 5。这两条路都先看更早一期的标题和正文：已经出现过的名字本期不收，预览过再正式上线也不再当新模型。`is now available in` 只是旧产品里上架，不抽。评测、benchmark、测试报告标题不抽模型名。名字里带 Security、Review、Code、Evaluation、Benchmark、Test、Tool 的版本名是功能或工具，算产品，不算模型。
- 新产品：同一类标题里、窗口内第一次公开、而且不是阻断名单上的整词。`score` 为 4。`Codex`、`Claude Code`、`OpenRouter` 以及同类旧产品名（Cursor、Devin、Kiro、GitLab、ChatGPT、Claude、Gemini、Amp、Pierre、Kimi、千问、混元、LangSmith、llama.cpp、Grok Bot、DeepSeek、Octop）整词相等才排除。`Devin Bots` 这种新名字可以留。更早快照里已经出现过的名字不收。
- 概念：至少两条标题里原样出现的说法。用快照里的词，不要把英文译成快照里没有的中文。`score` 为 3。

`mentions` 是窗口内条目数。同一 link 用 `feeds.json` 和 `feeds-full.json` 里更长的 summary。`date` 必须落在 `feeds.json` 的 `window` 里。`linux-do-welfare` 不计数。`sources` 是这些条目链接的 hostname 数，同一主机只算一次。热度用 [榜单与图](04-榜单与图.md) 的公式，写进 `weight`。某条 mentions 为 0 就不收。

主题在这一步选定，写在其中一条的 `theme: true`。只在概念里选：`sources` 更高的优先，相同再比 `mentions`。型号和产品即使 `score` 更高也不占这个字段。没有概念就不标主题。清洗可以把已经选中的那条概念写成读者表达，但证据短语必须就是这条概念，不能另造一个语料里没有的话题。渲染不猜主题。

`keywords.json` 的 `words` 是站点要读的数组。每项有 `word`、`kind`（`model`、`product`、`concept`）、`score`、`mentions`、`sources`、`weight`。`gaps` 写这一期缺了什么，例如没有 `model-releases.json`。

相信这份订阅。采集不因为正文偏短去打开文章页。feed 里是简介，快照里就记简介。

抓完更新 `manifest.json` 的 `files` 和说明。提交到 ai-news-data 并开 PR，不合并。撰写步骤等这份快照在分支上可读之后再开始。
