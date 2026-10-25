---
name: daily-conversation-deposit
description: >-
  每日沉淀扫描（日复盘）。回顾过去 24 小时各 Grok Bot 助手的对话，把沉淀候选直接落成文件并开 PR 到 main；当日复盘写入
  retrospectives/daily。审阅在 PR 上，不自动合并。
---

# 每日沉淀扫描（日复盘）

回顾 peng cheng 过去 24 小时（Asia/Shanghai）在所有 Grok Bot 助手里的对话，按 VirusPC/edges-brain-viruspc 根 AGENTS.md 判断哪些该沉淀、落到哪里（笔记、任务、记忆、feedback，以及它定义的其它类型）。个人内容去 VirusPC/edges-brain-viruspc-private。

入口是 Compose 工作区根 `VirusPC/edges-workspace-viruspc`（`.harness/compose/` 下挂着公开脑和私密脑）：先读它的根 `AGENTS.md`，再按公开脑根 AGENTS.md 判断去向。候选和当日复盘的 PR 开在挂进来的子仓（公开脑或私密脑），不写进工作区根。（2026-10-21 用户确认，通用约定见公开脑 `.harness/memory/projects/project_workspace_is_deposit_entry/`。）

何时跑见同目录 [INDEX.md](INDEX.md)。本文件不写日程。

## 步骤

### 1. 先抓取落盘

用 ReadTranscript，逐个传 agent_id 读每个助手（含自己），从最新往前翻页（before），翻到超出 24 小时窗口为止（记录无显式时间时，结合消息里的日期、PR 时间、记忆日期判断）。把每个助手窗口内的原始记录写到 `/workspace/daily-scan/YYYY-MM-DD/<助手名>.jsonl`，并按时间正序排好。这些落盘文件永久保留：不删除、不覆盖、不清理往期目录（同一天重跑时另存为带序号的新文件）。

### 2. 再离线分析

只基于落盘文件，按时间从前往后读，判断沉淀候选。共享记忆和 GitHub 合入记录只用来交叉核对、去重（已经合入或已经落过文件的跳过）。

每条候选在内部记下来源助手、内容、依据根 AGENTS.md 的去向，以及准备写入的路径。能从落盘对话里有依据写成文件的，进入步骤 3 直接落盘。必填不足、写了就会编造的，不写文件，稍后在清单里写不做原因。这一步不在对话里提问，也不征求确认。没有新候选也继续步骤 3，日复盘仍要入库。

### 3. 直接落文件并开 PR

分析出的候选直接写成文件，和当日复盘一起开到 main 的 PR。审阅放在 PR 上。保持 PR 开放，等人合并，不自动合并。对话里不先征求确认。

当日复盘：

`retrospectives/daily/YYYY-MM-DD--日复盘/INDEX.md`

日期取回看结束时刻所在的日历日（Asia/Shanghai）。同一日只保留一篇，补记改原来的 `INDEX.md`。章节按 [日复盘 README](../../../retrospectives/daily/README.md)：一级标题 `# <YYYY-MM-DD> 日复盘`，必写二级标题「范围」和「建议补充内容清单」。扫描局限、落盘目录、读到的助手和读不到的助手写进「范围」。

「建议补充内容清单」列出本次 PR 里落了哪些候选。每条一句话，写上建议去处，以及本次 PR 中的写入路径。没有新候选就写明没有。没有落成文件的写不做原因（例如 `posts/` 由人维护，不自动写入；背景或目标在对话里不足，写了就会编造）。

去向以根 AGENTS.md 为准。落盘用仓库已有技能和 CLI，保证格式和索引登记正确：笔记用 `edges notes`，看板任务用 `edges tasks`，记忆和 feedback 用 `edges memory remember`。这些命令只改工作区文件。git 发生在 PR 分支上：提交、推送、开到 main 的 PR。看板任务也走这条 PR，任务文件和当日 `INDEX.md` 放在一起，不直接 push `main`。

按仓库归属分 PR：

- VirusPC/edges-brain-viruspc 的公开内容，与当日 `INDEX.md` 同一个 PR，开到 main。
- edges-brain-viruspc-private 的个人内容，在 edges-brain-viruspc-private 另开一个到 main 的 PR，不并进公开仓。公开仓的清单只写「有 N 条私人内容已在 edges-brain-viruspc-private 开 PR」，并附该 PR 链接，不写私人正文。拿不到 edges-brain-viruspc-private 时，公开清单写明未落成及原因，私人正文仍不写入公开仓。

同一日补记：已落过的候选不重复写。新的公开候选并进尚未合并的当日 PR；该 PR 已经合并则另开一个到 main 的 PR。edges-brain-viruspc-private 同样处理。两个仓都不自动合并。

开 PR：用 Cursor 云端 Agent 开到 main 的 PR。Commit 带一行 `Co-authored-by: 日复盘 <grok-bot@users.noreply.github.com>`。

公开仓按根 README 的「隐私与脱敏」再写：不写个人身份细节、未公开 IP、鉴权链接、凭据、私人生活细节。凭据、鉴权链接、未公开 IP 在 edges-brain-viruspc-private 同样不写。原始 transcript 不进任何仓库，只留在 `/workspace/daily-scan/`。

### 4. 只回链接

对话里只告诉用户 PR 链接。公开仓一条；有 edges-brain-viruspc-private 的 PR 再加一条。不把候选清单贴出来征求确认。

## 成功标准

- 窗口内每个读到的助手都有一份按时间正序的 jsonl，落在 `/workspace/daily-scan/YYYY-MM-DD/`。往期目录仍在。同一天重跑没有覆盖已有文件。
- 候选只来自这些落盘文件。共享记忆和已合入记录只用于核对和去重。
- 能落盘的候选已按根 AGENTS.md 写成文件，并放进对应仓库开到 main 的 PR。看板任务在该 PR 里，没有直接 push `main`。对话里没有先征求确认。
- 当日 `INDEX.md` 的「建议补充内容清单」列出本次 PR 里落了哪些候选及其路径。没有就写明没有。私人内容在公开清单里只留条数和 edges-brain-viruspc-private 的 PR 链接。
- PR 开到 main，没有自动合并。commit 带 `Co-authored-by: 日复盘 <grok-bot@users.noreply.github.com>`。仓库里没有原始对话，也没有需要脱敏的内容。
- 给用户的回复只有 PR 链接。
