# 文章与补录

订阅真源是 [`feeds/ai-coding-blogs.opml`](../../feeds/ai-coding-blogs.opml)，退路和备注在 [`feeds/ai-coding-blogs.meta.json`](../../feeds/ai-coding-blogs.meta.json)。研究向的源不要新加。已经有原生 feed 的站，不再并一份抓同一页的源。GitHub Trending 不在这一步抓，见 [开源项目](projects.md)。

窗口和订阅入口由 [确定窗口与入口](window.md) 写入 `raw/window.json`。先读那份文件里的 `since` 和 `until`。没有生成日、或窗口文件对不上，就停止，不用运行当天补窗口。

## 契约

输入：

- `raw/window.json` 的 `since`、`until`
- OPML 与 meta
- 用户点名的补录。没有就不写 `backfill.json`

输出：

- `raw/articles/feeds.json`：这一步决定留下的 feed 原文，正文不截断
- `raw/articles/backfill.json`：仅当用户点名补进这一期、但订阅里没有的条目
- 拉不到的源写入 `raw/gaps.json`，不写空文件

不写 `feeds.index.json`。目录树里没有这个文件，全文就在 `feeds.json` 的 `summary` 里。

Schema：

- `schemas/raw/articles/feeds.schema.json`
- `schemas/raw/articles/backfill.schema.json`（只在写出补录时）

生成用下面两个工具。校验：

```bash
python3 scripts/prepare/articles/validate.py issues/<生成日>
```

在本 skill 目录执行。这一步的文件写完后立刻跑这条命令。阶段目录齐了之后，再跑 [准备汇合](check.md)。

## 订阅退路

同一发文方保留一个主源，另加若干备源。优先官方原生 RSS 或 Atom。没有原生源，或原生源停更时，用公开抓取 RSS 和转换源彼此作备源。列表页和 `listUrls` 是该发文方全部 feed 报错或停更之后的最后退路。

备源是一条独立 source，并写入 OPML。`publisher` 标发文方，`role` 为 `primary` 或 `backup`。`fallback` 只表示退路类型。只写在 notes 里的 URL，脚本不拉。

脚本只返回各源自己的原文和体检，不决定开不开备源。体检 `status`：

- `ok`：可用
- `empty`：条目为 0
- `error`：抓取或解析报错
- `stopped`：最新条目早于约一个月

`issues` 用同样的词。快照源不标 `stopped`。

按这个顺序决定：

1. 从 meta 列出文章主源：`role` 为 `primary`，或者没有 `role`、但有 `xmlUrl`，并且 id 不是 `github-trending-weekly-all`。每个主源单独抓一次。
2. 读该源的 `status`。`ok` 就用它的 `items`，不要再抓它的备源。
3. `empty`、`error` 或 `stopped` 时，再对这个发文方的备源（`role` 为 `backup` 且 `publisher` 相同）各抓一次。备源 `ok` 就采用备源的 `items`。
4. 主源和备源都不 `ok`，并且 meta 有 `listUrls` 时，列表页是最后退路。脚本不抓 HTML。打开列表页仍补不到的，把原因写入 `raw/gaps.json`。
5. 同一发文方连续两期主源和备源都失败时，在缺口里提示换源。
6. 运行时不改 OPML。

多份已经决定纳入的源都有条目时，用 `write_feeds.py` 收成 `feeds.json`。它先按规范化 URL 去重，再按规范化标题去重，留下正文更完整的一条。标题在去掉首尾空白和句末标点、合并空白并忽略大小写之后相同；较短的一条至少 16 个字符，且较长一条紧跟着句末标点时，也视为同一篇。日期对不上时，以官网列表或 sitemap 为准，看 `dateConflicts`。这一步只决定留下哪一份原文，不决定它会不会进入页面。

`thin` 表示这条不足 280 字或为空，原样保留。不打开文章页去补全文。feed 里是简介，原文里就记简介。补录保持原发日，不改成窗口内的日期，也不并进 `feeds.json` 假装它当时就在订阅里。

## 命令

Python 3.12。在本 skill 目录：

```bash
python3.12 -m venv /tmp/weekly-ai-blogs-digest-py312
/tmp/weekly-ai-blogs-digest-py312/bin/pip install -r scripts/requirements.txt -r scripts/requirements-leaderboard.txt
```

`scripts/requirements-leaderboard.txt` 固定 `pyarrow==17.0.0`。

先核对订阅，再逐源抓取。`<id>` 换成 meta 里的 source id。备源只在上面的第 3 步才加 `--id`。

```bash
PY=/tmp/weekly-ai-blogs-digest-py312/bin/python
$PY scripts/prepare/articles/check_subscription.py
$PY scripts/prepare/articles/fetch_source.py \
  --id <主源或已决定启用的备源 id> \
  --since <raw/window.json 的 since> --until <raw/window.json 的 until> \
  --out /tmp/weekly-ai-blogs-digest-<id>.json
$PY scripts/prepare/articles/write_feeds.py \
  --since <raw/window.json 的 since> --until <raw/window.json 的 until> \
  --source /tmp/weekly-ai-blogs-digest-<id>.json \
  --out issues/<生成日>/raw/articles/feeds.json
```

`--id` 和 `--source` 都可以重复，但只放这一步已经决定要的源。临时文件不放进 `issues/`。`feeds.json` 的 `sources` 只保留这些源的体检，不列尚未抓取的备源。
