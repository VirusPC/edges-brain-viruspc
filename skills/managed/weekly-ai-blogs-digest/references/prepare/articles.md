# 文章与补录

订阅真源是 [`feeds/ai-coding-blogs.opml`](../../feeds/ai-coding-blogs.opml)，退路和备注在 [`feeds/ai-coding-blogs.meta.json`](../../feeds/ai-coding-blogs.meta.json)。研究向的源不要新加。已经有原生 feed 的站，不再并一份抓同一页的源。

目标文件：

- `raw/window.json`：窗口、订阅入口
- `raw/articles/feeds.json`：feed 给出的正文，不截断
- `raw/articles/backfill.json`：仅当用户点名补进这一期、但订阅里没有的条目

`thin` 表示这条不足 280 字或为空，原样保留。不打开文章页去补全文。feed 里是简介，原文里就记简介。补录保持原发日，不改成窗口内的日期，也不并进 `feeds.json` 假装它当时就在订阅里。

没有拉到的源写入 `raw/gaps.json`，不写空文件充数。

## 订阅退路

同一发文方保留一个主源，另加若干备源。优先官方原生 RSS 或 Atom。没有原生源，或原生源停更时，用公开抓取 RSS 和转换源彼此作备源。列表页和 `listUrls` 是该发文方全部 feed 报错或停更之后的最后退路。

备源是一条独立 source，并写入 OPML。`publisher` 标发文方，`role` 为 `primary` 或 `backup`。`fallback` 只表示退路类型。只写在 notes 里的 URL，运行时不拉。

每次运行先体检。报错、条目为 0、最新条目早于约一个月的源，写入 `raw/gaps.json`。主源报错或停更时，用该发文方的备源。备源再失败，走列表页。列表页也补不到的，写明原因。同一发文方连续两期主源和备源都失败时，在缺口里提示换源。运行时不改 OPML。

多份源都抓到时，先按规范化 URL 去重，再按规范化标题去重，留下正文更完整的一条。标题在去掉首尾空白和句末标点、合并空白并忽略大小写之后相同；较短的一条至少 16 个字符，且较长一条紧跟着句末标点时，也视为同一篇。日期对不上时，以官网列表或 sitemap 为准。这一步只决定留下哪一份原文，不决定它会不会进入页面。

## 现行命令

Python 3.12。在本 skill 目录：

```bash
python3.12 -m venv /tmp/weekly-ai-blogs-digest-py312
/tmp/weekly-ai-blogs-digest-py312/bin/pip install -r scripts/requirements.txt -r scripts/requirements-leaderboard.txt
```

`scripts/requirements-leaderboard.txt` 固定 `pyarrow==17.0.0`。

```bash
PY=/tmp/weekly-ai-blogs-digest-py312/bin/python
$PY scripts/fetch_feeds.py \
  --since YYYY-MM-DD --until YYYY-MM-DD \
  --out /path/to/ai-news-data/issues/YYYY-MM-DD/feeds.json \
  --index-out /path/to/ai-news-data/issues/YYYY-MM-DD/feeds.index.json
```

这条命令今天仍写期次根目录。索引是给现行选文用的薄文件，不是 `usable/` 的候选清单。
