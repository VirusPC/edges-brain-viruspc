---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-15T09:24:11.844Z'
  edges-title: 增加复盘的复盘，让 badcase 能 eval 和回归
  edges-tasks-status: backlog
  edges-task-priority: none
name: 增加复盘的复盘让_badcase_能_eval_和回归
description: 定期检查日复盘、周复盘和 AI 资讯等例程的产出，把 badcase 收成可回归的 eval 用例。
---
**背景：**
给根目录 `routines/` 建子作用域骨架时，用户要求增加「复盘的复盘」：要保证复盘不腐烂，发现的 badcase 要能够 eval，并能在之后回归到。举例是之前发现 AI 资讯例程忽略了 Claude Research 下关于 memory 的重要文章。
- 现状：日复盘、周复盘、AI 资讯等例程没有检查例程本身质量的机制，产出会随时间腐烂。
- 已知 badcase：AI 资讯例程漏掉了 Claude Research 栏目下关于 memory 的重要文章。文章标题和日期对话里没有给出，待确认。
- 非目标：这次不补写那篇文章，也不改日复盘、周复盘或 AI 资讯例程的执行步骤。
- 关联：与根目录 `routines/` 子作用域骨架同一张 PR。

**目标：**
有「复盘的复盘」：定期检查各例程的产出质量；发现的 badcase 沉淀成可执行的 eval 用例，例程改动后能拿这些用例做回归。

**完成标准：**（初稿，待用户确认）
- [ ] 有存放 badcase 的地方和格式。
- [ ] AI 资讯例程漏掉 Claude Research 栏目下关于 memory 的重要文章这一例，作为第一条用例收录。文章标题与日期仍待确认，不在本卡编造。
- [ ] 例程变更后能跑这些用例做回归。
