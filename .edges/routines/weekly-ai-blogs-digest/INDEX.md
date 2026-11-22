---
name: weekly-ai-blogs-digest
description: '每周五 09:00 运行 AI 资讯周报，调用 weekly-ai-blogs-digest，周报与数据快照各开 PR、不合并。'
---
# 日程

这条 Grok Bot routine 何时跑、密钥留在哪、结果交到哪。流程只看 [SKILL.md](../../../skills/managed/weekly-ai-blogs-digest/SKILL.md)。这里不另写三阶段。这不是跨厂商共用格式。

- cron: `0 9 * * 5`
- timezone: Asia/Shanghai
- timing: flexible ±15 分钟（early/late 各 15）
- platform: Grok Bot routine
- id: ai-coding
- owner: AI 资讯
- skill: [SKILL.md](../../../skills/managed/weekly-ai-blogs-digest/SKILL.md)

## 定义来源与运行入口

仓库中的本入口是期望定义；外部平台负责实际调度与执行。维护这条记录不配置平台。

- repository: [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)
- entry: `.edges/routines/weekly-ai-blogs-digest/INDEX.md`
- ref: 默认读取仓库默认分支 `main` 的最新版本；接入方明确指定的 branch、tag 或 commit 优先于默认值。

平台每次运行前必须把所选 ref 解析成一次 commit，用这一版重新读取本 `INDEX.md`，再读取这里引用的 Skill。Skill 指向的 `references/` 也用同一 commit。所选 ref 不存在，或本入口、Skill、以及这次要执行的那份 reference 读不到，就停止本次运行并报告来源、ref、路径与失败原因。不回退到别的分支，也不沿用以前保存的提示词。

`owner` 只是原有作者标签，不表示平台账号、授权状态或运行状态。

## 平台接入

只记 `ai-coding` 这条定时任务怎么跑。窗口和三阶段以 Skill 为准。

- 交付：回到这条定时任务所在的对话。
- 结果：周报 PR 写在本仓 `ai-news/`，快照 PR 写在 [VirusPC/ai-news-data](https://github.com/VirusPC/ai-news-data) 的 `issues/YYYY-MM-DD/`。两个 PR 都开着，不合并。回复里给出两个链接，以及这份快照缺了什么。
- 生成来源：动手前把所选 ref 解析成的完整 commit，连同本文件路径 `.edges/routines/weekly-ai-blogs-digest/INDEX.md` 和 skill 路径 `skills/managed/weekly-ai-blogs-digest/SKILL.md`，写入 `summary/index.json` 的来源。数据快照用数据仓里已经存在的那次提交和 `issues/<生成日>`，`kind` 为 `tree`。没解析到或没落库的一侧写 `null`。不要把即将提交的周报稿自己的 commit 填进去。格式见 Skill 的总结阶段。

## 输入

这些是 Skill「输入」一节的具体值。日程不在这里改。

- **数据仓库**。远端是 [VirusPC/ai-news-data](https://github.com/VirusPC/ai-news-data)。本地检出是这次运行检出该远端后的工作副本，脚本输出以这个检出为根，期次在 `issues/<生成日>/`。本文件没有另给一台机器上的固定克隆路径。下面交接目录只在 box 和云端之间传当期 JSON，不是这个检出，也不是第二份真源。
- **生成日**。运行当天的 Asia/Shanghai 日历日。这条任务是周五 09:00，不在这里写死某一个日期。
- **规则仓库**。仓库是 [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)。commit 是运行前把所选 ref 解析出的 40 位提交。默认 ref 是本仓 `main` 的最新版本。没有解析到就停，不用周报稿自己的提交。
- **站点仓库**。同一个 [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)。只在渲染 `ai-news/` 时用。规则看 Skill，站点看这个仓里的周报稿。
- **密钥**。环境变量名是 `AA_API_KEY` 和 `OPENROUTER_API_KEY`，只在 box 上。没有设置就按 Skill 跳过对应文件并记缺口。细则见下一节。
- **补录**。默认为空。只有当次对话里用户点名要补的条目才算有。
- **上一期**。数据仓库里生成日之前最近的一个 `issues/` 目录，并锁定该期当时的提交。没有更早的期次就不对照。

### 密钥

`OPENROUTER_API_KEY` 和 `AA_API_KEY` 只在 box 的环境里。要这两份数据，就在 box 上拉。密钥不发给云端。

- 只在 box 上用 `[ -n "$OPENROUTER_API_KEY" ]` 和 `[ -n "$AA_API_KEY" ]` 看有没有设置。
- 不打印，不写进文件、日志或提交。
- 云端没有这两把密钥。没有密钥就按 Skill 跳过对应文件，在 manifest 和说明里写明没拉。

### 交接

box 把不含密钥的 JSON 写到：

`/cursor/stores/store-f2a99105-0bec-4f8e-95cf-507b07e0e1e9/ai-news-data/YYYY-MM-DD/`

云端读映射后的同一份：

`/cursor/stores/bot/ai-news-data/YYYY-MM-DD/`

日期与生成日相同。这只是 box 到云端的交接，不是数据仓库的本地检出，也不是另一份真源。入库位置仍是数据仓库远端的 `issues/<生成日>/`。

## 流程

准备、清洗、总结和订阅退路只写在 Skill。关键词不在这里重复。
