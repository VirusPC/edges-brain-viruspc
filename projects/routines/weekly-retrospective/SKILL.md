---
name: weekly-retrospective
description: 每周一周复盘。以 Compose 工作区根 VirusPC/edges-workspace-viruspc 为入口，回顾上一个自然周；结果经 PR 写入公开脑 retrospectives/weekly（敏感内容如有则私密脑另开 PR）。
---

# 每周一周复盘

回顾 peng cheng 上一个自然周（周一 00:00 到周日 23:59，Asia/Shanghai）在 Compose 工作区下各子仓的 GitHub 活动，以及各 Grok Bot 助手的对话。只做复盘和总结，不改代码，不动看板。用中文写。

入口是 Compose 工作区根 `VirusPC/edges-workspace-viruspc`（`.harness/compose/` 下挂着公开脑、私密脑和框架仓）：先读它的根 `AGENTS.md` 与 `.harness/compose/README.md`，再读公开脑 `VirusPC/edges-brain-viruspc` 根 AGENTS.md。仓库层复盘要覆盖挂进来的子仓：公开脑、框架仓 `VirusPC/edges`（`@viruspc/edges` 仓库里的 CLI、skills、extensions、ADR 等框架改动）、必要时私密脑。私密脑只在「范围」里说明读了；公开清单不写私人正文。周复盘的 PR 开在挂进来的子仓，不写进工作区根。（2026-10-21 用户确认，通用约定见公开脑 `.harness/memory/projects/project_workspace_is_deposit_entry/`。）

何时跑见同目录 [schedule.md](schedule.md)。本文件不写日程。

## 提示词

本次运行只看各子仓的 GitHub：commits，PR 的开启、合并和审阅，Issue 和 `.harness/tasks` 看板的状态变化，CI 情况。框架仓的活动算进仓库层；私密脑的活动如有，公开正文只在「范围」里记读过，不写私人正文。其他助手的对话本次运行读不到，不要尝试。结尾附一段交接说明：请主聊天逐个助手扫一遍上周对话补进来，合成一版发给用户，再经云端代理在公开脑 `VirusPC/edges-brain-viruspc` 开 PR，写入 `retrospectives/weekly/<周一日期>--周复盘/INDEX.md`。不写进工作区根。

正文结构以公开脑 `retrospectives/weekly/README.md` 为准。一级标题写 `# <周一日期> 周复盘`，下面六节都用 `##`，顺序是：范围、本该怎样、实际怎样、为什么、下次做什么、建议补充内容清单。上期的行动放在「本该怎样」里列出，到「实际怎样」里逐条验收。正文 `INDEX.md` 写定后不改，后续评论记同目录 `COMMENTS.md`。

每条结论都要写依据。仓库方面给 PR 链接、commit 链接或文件路径，必要时引一两行原文。框架仓的依据链接用 `VirusPC/edges`，个人内容的依据链接用公开脑或私密脑。对话方面写明是哪个助手、什么时间，附原话摘录，再交代上下文：当时在讨论什么，谁答应了什么，后来有没有落地。找不到依据就直说找不到。建议补充内容清单里的每一条都要写清楚：这条是什么、建议放到哪里、为什么值得补、不补会付出什么代价、处理结果。「下次做什么」最多 3 条，每条写明怎样算完成，并注明来源。

鸡毛小事不写，比如 PR 合并时间刚好跨过周边界。对事不对人，不编造，公开仓库内容必须脱敏。篇幅以足够支撑决策为准。

敏感内容如有，在私密脑 `VirusPC/edges-brain-viruspc-private` 另开一个到 main 的 PR。公开仓只写「有 N 条敏感内容已在 edges-brain-viruspc-private 开 PR」，并附该 PR 链接，不写私人正文。拿不到私密脑时，公开清单写明未落成及原因，私人正文仍不写入公开仓。两个仓都不自动合并。Commit 带一行 `Co-authored-by: 周复盘 <grok-bot@users.noreply.github.com>`。

## 对话层

例程运行时读不到其他助手的对话，所以对话层要由主聊天逐个助手去读（每个助手的转写先写到文件，按时间戳筛出时间窗，再交给便宜的模型提炼），最后由主聊天合成。
