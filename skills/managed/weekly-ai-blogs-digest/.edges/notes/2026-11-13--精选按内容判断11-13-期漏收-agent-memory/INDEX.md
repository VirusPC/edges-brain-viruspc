# 精选按内容判断：11-13 期漏收 Agent memory

2026-11-13。记录本期 AI 资讯漏收 Anthropic《The components of agent memory》的原因、skill 改动，以及用干净 agent 验证精选规则的结果。本文可独立阅读。

## 问题

2026-11-13 期《AI 资讯》没有收入 Anthropic 于 2026-11-06 发表的 [The components of agent memory](https://www.anthropic.com/research/components-of-agent-memory)。这篇文章讲的是 agent memory 与 dreaming，落在本期窗口（11-06～11-12）的第一天，按内容应属 Agent 重点。

## 排查

不是订阅缺失。窗口内 `claude-articles` 与 `anthropic-engineering` 两个源都抓到了这篇。去重时留下了产品源那一份：摘要薄、标题里没有 dream，又夹在十几条产品稿中间，精选时不容易认出来。

真正丢掉它的是 SKILL 第 12 行的总原则：「研究向、红队、纯学术长文不要当作重点，可以不写或一笔带过。」模型看到 URL 在 `/research/` 下，就把它当成研究长文跳过了。判断依据成了路径，而不是内容。

曾经考虑过补订 Olshansk 的 `feed_anthropic_research.xml`，里面也有这篇。但这个源会带进大量科学和对齐方向的长文，与 skill 里「研究向的源不要新加进订阅」冲突，噪声也大，所以不加新源，只改精选规则。

## 改动

在 SKILL 第 12 行末尾加了一句：「判断依据是内容，不是 URL 路径。」不改订阅，也不为 `/research/` 单开白名单。

## 验证

为了看这句是否真的改变精选行为，用一个没有本期上下文的干净 agent，只提供 skill 和日期，从头重跑 11-13 期：46 个源全部成功，窗口内 197 条；Arena 用到 2026-11-11 的榜，Gemini 4 Hydrogen (High) 新进入 Top-15，排第 15。

重跑结果里，这篇被自然选进「国际进展」，标签是〈Agent 记忆〉，并与 LangChain 的 context-engineering-deep-agents-remember 合并为同一条。同样发在 `/research/` 下的 claude-electronics-design 按内容没有选入。这说明精选是按内容判断，既不是看到 `/research/` 就全收，也不是全丢。

中间曾经先用一个已经知道这篇该收的 agent 重跑过，那次不能算盲测。教训是：测 skill 必须换干净的 agent，只给 skill 和输入，不要让它看到旧稿或本题结论。

## 遗留

干净重跑时还记下几处缺口，与这次精选规则无关，但会影响以后出报：

- 没有 Artificial Analysis 密钥，对应小节没写。
- AWS ML 的 RSS 只覆盖到 11-11～11-12，窗口前半段的 AWS 文章缺了。
- linux.do 福利 RSS 有截断，需要翻论坛列表页才能补齐整个窗口。
- Devin 与麦肯锡合作那篇链接已经 404，重跑时去掉了。

本次改动在 [brain#479](https://github.com/VirusPC/edges-brain-viruspc/pull/479)，尚未合并。

## 后续

干净重跑后用户发现仍收了 IPO 路演、Devin Teams 定价、CodeRabbit ARR、AWS Marketplace 等营销稿，因此在第 12 行补充上述营销过滤规则，并再次用干净 agent 重跑验证。

## 后续修正

2026-11-13。在同一分支上补三处运行规则。没有重跑周报，没有改精选结果、Devin、GitHub Trending、榜图或历史期正文。

### Arena 的比较基准和红圈

排名比较对照上一期周报正文实际采用的那份榜（发布日和 Top-N）。`fetch_llm_arena.py` 输出的 `prior_publish_date` 只是数据集里紧挨着的上一发布日，上一期正文没采用它时，不用它做基准，也不用任意一份更早的可核验快照。

红圈仍圈本周窗口内新发布、并且出现在本期这张榜上的模型，用绘图 skill 的 `--highlight` 标出。名次变化写在比较里，不拿来决定红圈。确认不了哪些是本周新发布的模型时，才用绘图 skill 的默认启发。

本期采用的榜仍是 `--until` 窗口结束日之前最近一份。发布日与上一期正文采用的榜相同时，沿用那一期的图，图注写发布日，并加上「较上周无新榜」。

### npm 工作目录

`package.json` 在 `scripts/`，不在 skill 根目录。在 skill 根目录执行 `npm install` 因找不到 `package.json` 失败，退出码 254。同一目录执行 `npm install --prefix scripts` 后，`node scripts/render_keyword_cloud.mjs --help` 能加载 `@napi-rs/canvas`、`@resvg/resvg-js` 和 `d3-cloud`。当时的 Node 是 v22.23.4；`scripts/package.json` 的 `engines` 要求 Node 20 或以上。

### Python 版本

`pyarrow` 保持 `17.0.0`，没有升级。PyPI 上这份没有 cp313 wheel。Python 3.13.18 上 `pip install pyarrow==17.0.0` 转去编译 sdist，在准备构建依赖时失败（`ModuleNotFoundError: No module named 'pkg_resources'`）。加上 `--only-binary=:all:` 则直接找不到 17.0.0，可见版本从 18.0.0 起。

Python 3.12.3 上按 skill 里的命令建 `/tmp/weekly-ai-blogs-digest-py312`，安装 `scripts/requirements.txt` 和 `scripts/requirements-leaderboard.txt` 成功。装上的是 feedparser 6.0.14、pyarrow 17.0.0，以及传递依赖 numpy 2.5.4（未另加 pin）。导入和一次内存 parquet 往返成功，`scripts/test_fetch_llm_arena.py` 4 项通过。三个抓取脚本的 `--help` 都由这个解释器跑通。Debian/Ubuntu 上 `python3.12 -m venv` 需要已安装 `python3.12-venv`，否则 ensurepip 不可用。
