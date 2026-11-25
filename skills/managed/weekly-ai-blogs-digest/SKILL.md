---
name: weekly-ai-blogs-digest
description: 当用户想要汇总一段时间内（默认过去一周）AI / AI Coding 领域的新进展时使用。按数据准备、数据清洗、数据总结三阶段写入数据仓库，产出到 summary/ 为止。具体仓库由 routine 提供。栏目名是「AI 资讯」。触发短语：「本周 AI 资讯」「AI Coding 资讯」「汇总一下 AI 博客」「weekly AI digest」「看看这周 AI Coding 有什么新东西」。不要为单篇文章总结（用 summarize-ai-article）。
version: 0.0.10
---

# AI 资讯周报

生成日由输入「生成日」给出，记为 D。覆盖窗口是 D-7 到 D-1 的完整 UTC 日（含两端，不含 D）。一期数据放在数据仓库的 `issues/<生成日>/`，里面固定三个目录：`raw/`、`cleaned/`、`summary/`。同一期重跑就地更新这三个目录，Git 保留历史，不另建 run 目录。

## 输入

这里只声明需要哪些输入、各自是什么意思、缺了怎么处理。具体值由调用方的 routine 入口给出。当前定时任务见 [routine 入口](../../../.edges/routines/weekly-ai-blogs-digest/INDEX.md)。

- **数据仓库**。仓库 URL。基准 commit 可选，缺省为默认分支最新提交。没有 URL 就停止。脚本在该仓库的工作副本里写 `issues/<生成日>/`。
- **生成日**。D，`YYYY-MM-DD`。窗口是 D-7 到 D-1 的完整 UTC 日，含两端，不含 D。没有就停止，不用运行当天代替。
- **密钥**。环境变量名是 `AA_API_KEY`（或 `ARTIFICIAL_ANALYSIS_API_KEY`）和 `OPENROUTER_API_KEY`。未设置就跳过对应文件，在 `gaps.json` 写明原因，不写空文件。
- **补录**。可选。没有就不写 `raw/articles/backfill.json`。
- **上一期**。可选。没有就不对照，不把上一期文件复制进本期。

## 版本

`version` 写在本文件 frontmatter，格式是 semver。`stage.json` 仍记 skill 名和这个版本。`summary/index.json` 的 `skill` 是 `{name, version}`，不再另写顶层 `version`。`routine` 记调用方给出的仓库、commit 和入口路径。edges 的 skill 版本约定没有内容哈希，这里也不加。

改了本 skill 的 `SKILL.md`、scripts、references 或对外行为后，只升 patch（+0.0.1）。本技能不升 minor 或 major；即使行为或契约变化，也不按 [Edges skills 目录规范](https://github.com/VirusPC/edges/blob/main/packages/skills/README.md) 去升 0.1.0 或 1.0.0。把同目录 `CHANGELOG.md` 里 `[Unreleased]` 下的条目挪到 `## [x.y.z] - YYYY-MM-DD`。对同一个 commit 打 annotated tag `skill/weekly-ai-blogs-digest@<version>`。没改到本 skill 就不升版本。

下面的目录树和 `schemas/` 是这份结构的契约。分阶段校验通过，这一期才算写完。

三阶段按顺序做。上一阶段汇合校验通过，才把目录交给下一阶段。阶段内部没有依赖的任务可以并行。上游或 Skill 版本变了，只重算引用它的下游，再校验；没有引用关系的分支不动。不另做调度引擎或数据库。

```mermaid
flowchart LR
  prepare["数据准备"] --> raw["raw/"]
  raw --> clean["数据清洗"]
  clean --> cleaned["cleaned/"]
  cleaned --> summarize["数据总结"]
  summarize --> summary["summary/"]
  summary --> publish["发布收尾"]
```

- [数据准备](references/prepare/prepare.md)：窗口、订阅、补录和三路原始抓取，落入 `raw/`。
- [数据清洗](references/clean/clean.md)：去重、规范链接、核验事实和榜单数字，落入 `cleaned/`。不做选文。
- [数据总结](references/summarize/summarize.md)：三路展示内容并行写完后，先汇合，再撰写本周总结、提炼关键词并做整页校验，落入 `summary/`。
- [发布收尾](references/publish/publish.md)：整页校验通过后，CI 绿了再 squash 合并，部署成功并且线上 `latest.json` 指向这一期，这一期才算发布完成。

每期自包含。对照上一期时，锁定上一期的文件和版本，不建跨期共享目录，也不把上一期文件复制进本期。

稳定内容 ID 跟着内容走：文章用规范化后的链接，项目用仓库地址，模型用官方名。榜单条目用榜单名加模型官方名。不用文件路径，也不用写入顺序。这里不另定哈希算法。

每个阶段目录有 `stage.json` 和 `gaps.json`。`stage.json` 的 name 用目录名 `raw`、`cleaned` 或 `summary`，并记下 skill 名、`version`，以及本阶段入口 `prepare.md`、`clean.md` 或 `summarize.md`。`gaps.json` 记下缺口和原因。来源引用写在各条文件里。空文件不能当成这份数据已经准备好。来源对不上或文件损坏时，记入缺口，不能标成可以正常渲染。

## 数据存储

一期数据在数据仓库的 `issues/<生成日>/`。完整目录如下。没有单独文件名的官方发布原文，抓不到就写进 `raw/gaps.json`。

```text
issues/YYYY-MM-DD/
  raw/
    stage.json
    gaps.json
    window.json
    articles/
      feeds.json
      backfill.json
    projects/
      github-trending.json
      releases.json
    models/
      aa-language-models.json
      llm-arena-<榜单发布日>.json
      openrouter-rankings-daily.json
      openrouter-rankings-programming.json
      openrouter-app-rankings.json
      openrouter-app-rankings-coding.json
      openrouter-official-endpoints.json
  cleaned/
    stage.json
    gaps.json
    articles/
      index.json
      {id}.json
    projects/
      index.json
      {id}.json
    models/
      index.json
      {id}.json
      boards/
        {id}.json
  summary/
    stage.json
    gaps.json
    index.json
    overview.json
    keywords.json
    articles/
      {id}.json
    projects/
      {id}.json
    models/
      {id}.json
      boards/
        {id}.json
```

`articles/backfill.json` 只在用户点名补录时出现。`openrouter-app-rankings-coding.json` 是旁路，缺了不用写缺口。其余列出的文件，要么落盘，要么在该阶段 `gaps.json` 里有一条 `path` 和 `reason`。`stage.json` 本身不能用缺口代替。空文件、以及 `skipped: true` 的模型快照，都不算落盘。

`{id}.json` 的文件名不是 ID。ID 写在文件里：文章是规范化链接，项目是仓库地址，模型是官方名，榜单条目是榜单名加模型官方名。`index.json` 只列这些 ID。

契约在 `schemas/raw/`、`schemas/cleaned/`、`schemas/summary/`。每个子步骤说明自己写输入、输出文件、要调用的脚本、对应 schema 和校验命令。那一步的文件写完后立刻跑该步校验。三个阶段目录汇合时仍分别走 [准备汇合](references/prepare/check.md)、[清洗汇合](references/clean/check.md)、[整页校验](references/summarize/check.md)。脚本只做该步写明的那一件事，不代替说明里的判断。

侧重点是 Agent 与产品。研究向、红队、纯学术长文可以不写。融资、IPO、营收、定价套餐和厂商客户案例不收，除非里面有具体技术或产品细节。优惠和白嫖不写。判断依据是内容，不是 URL 路径。不要编造数字、名次或材料里没有的事实。

整页校验通过之后做发布收尾。日程、仓库、密钥和交接见 routine 入口。三阶段不写站点。站点如果要渲染，只读 `summary/`。
