---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-23T21:35:44.267Z'
  edges-title: 文章拉取在 feed 截断时启用退路
  edges-tasks-status: backlog
  edges-task-priority: none
name: 文章拉取在_feed_截断时启用退路
description: '历史窗口里主源 feed 被截断时，才启用备源或列表退路，避免只留最近数十条的 feed 静默漏文。不重开 #567。'
---
**背景：**
2026-11-23，任务记录员说明 [#567](https://github.com/VirusPC/edges-brain-viruspc/pull/567) 要修的是：历史窗口缺失、feed 被截断时，才用已声明的列表退路。AWS Machine Learning Blog 一类 feed 大约只留最近 20 篇，被截断时会悄悄漏文。该 PR 已关闭、未合并。用户不要直接 rebase 旧分支。

同日 17:34 用户问「fallback那个事，也看下怎么重新做一遍？」并确认「是的」。要求把这条规则迁到新的拉取步骤，不照搬 #567 的代码。

[#596](https://github.com/VirusPC/edges-brain-viruspc/pull/596) 已把退路决定权收回 skill。`skills/managed/weekly-ai-blogs-digest/references/prepare/articles.md` 里，订阅退路的 status 是 `ok`、`empty`、`error`、`stopped`。列表页只在主源和备源都不 `ok` 时启用，没有「截断」这一档。

`feeds/ai-coding-blogs.meta.json` 里 aws-ml 已有 `listUrls`，notes 写了「脚本若标 truncated，用列表页补窗口里更早的文章」。拉取步骤说明还没有把截断写成启用退路的条件。2026-11-24 核对 main（`9a6ab626917b7d6deadd481cce2ca1d247ce8cc1`）时，脚本会给源标 `truncated`，`articles.md` 的决定顺序仍不因截断去开备源或列表页。

- 非目标：不重开 #567，不把旧分支 rebase 上来。
- 关联：[#567](https://github.com/VirusPC/edges-brain-viruspc/pull/567)、[#596](https://github.com/VirusPC/edges-brain-viruspc/pull/596)。

**目标：**
在拉取步骤补上：当主源 feed 未覆盖本期窗口起点（截断）时，才启用备源或列表退路，避免只保留最近数十条的 feed 静默漏文。

**动作：**
- 把「主源 feed 未覆盖本期窗口起点」写进拉取步骤的退路决定顺序，作为启用备源或列表页的条件。
- 沿用现有拉取步骤，不照搬 #567 的代码。

**完成标准：**
- [ ] 拉取步骤写明：主源被截断（最旧一条没有覆盖本期窗口起点）时，才启用备源或已声明的列表退路。
- [ ] 主源已经覆盖窗口起点时，不因此再去抓备源或列表页。
- [ ] 没有重开 #567。
