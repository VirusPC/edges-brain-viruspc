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
- 生成来源：动手前把所选 ref 解析成的完整 commit，连同本文件路径 `.edges/routines/weekly-ai-blogs-digest/INDEX.md` 和 skill 路径 `skills/managed/weekly-ai-blogs-digest/SKILL.md`，写入 `summary/index.json` 的来源。数据快照用数据仓里已经存在的那次提交和 `issues/YYYY-MM-DD`，`kind` 为 `tree`。没解析到或没落库的一侧写 `null`。不要把即将提交的周报稿自己的 commit 填进去。格式见 Skill 的总结阶段。

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

日期与周报生成日相同。这只是 box 到云端的交接，不是另一份真源。入库位置仍是数据仓的 `issues/YYYY-MM-DD/`。

## 流程

准备、清洗、总结和订阅退路只写在 Skill。关键词不在这里重复。
