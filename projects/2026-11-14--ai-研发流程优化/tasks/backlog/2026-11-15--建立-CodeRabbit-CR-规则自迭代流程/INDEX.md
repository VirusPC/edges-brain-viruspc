---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-15T08:15:08.048Z'
  edges-title: 建立 CodeRabbit CR 规则自迭代流程
  edges-tasks-status: backlog
  edges-task-priority: none
name: 建立_coderabbit_cr_规则自迭代流程
description: >-
  把 CodeRabbit 官方的 Learnings、emit path
  instructions，和按真实审查结果改规则的做法，写成可执行、可验证的自迭代流程，并守住中央配置不被业务仓本地 yaml 覆盖。
---
解决什么：CodeRabbit 中央配置已经生效，但还缺少一套按真实审查结果持续改规则的方法。做成后：有可执行、可验证的自迭代流程，官方机制用在该用的地方，且不会把业务仓的本地配置写成覆盖中央基线。

**背景：**
2026-11-14 这次对话先把 AI CR 规则优化的重点定在 CodeRabbit，随后系统梳理了规则机制、用账号做了中央仓实验，并确认业务仓不必再做本地关联。中央配置已在 [VirusPC/coderabbit](https://github.com/VirusPC/coderabbit) 的 main 上生效（正式基线由 [coderabbit#2](https://github.com/VirusPC/coderabbit/pull/2) 合入，squash merge 提交 `a83565aa40baa5e234b88f13fbcf2c567dabb77e`）。这份基线对 VirusPC 账号下没有自己 `.coderabbit.yaml` 的仓库生效，包括 edges；公开仓如果还不足 10 个 star，自动审查仍会跳过，需要时在 PR 上发 `@coderabbitai review`。Advanced 套餐显示每小时 1 次 included review。

在此之后，用户问 CodeRabbit 有没有文章讲「CR 规则怎么自迭代」。查官方材料后的结论是：没有一篇专门讲规则自迭代方法的独立文章，官方把这件事拆成两条机制。用户要求把「CR 规则自迭代」记成 Task，并写详细点。最初落在 VirusPC/edges 的 Code Review 项目（[edges#129](https://github.com/VirusPC/edges/pull/129)，未合并）；2026-11-15 用户确认改放个人大脑：edges 现在只是框架仓，那个项目讲的是给 edges 本身选审查工具，而本卡管的是对 VirusPC 账号下所有仓生效的中央配置，属于个人 AI 研发流程，因此归入本仓的「AI 研发流程优化」项目（AI code review 环节）。本卡只记这件事，不覆盖 VirusPC/edges 里已有的「探索新的 CR 方式」，也不把已经做完的中央配置接入再写成另一张未决卡。

官方两条机制（2026-11-14 按文档核对，不是本轮实验复现）：

- **Learnings（增量偏好）**：在 PR 或 issue 的评论里用 `@coderabbitai` 说明偏好和原因，CodeRabbit 可能把它存成学习项，并在回复里给出「Learnings Added」折叠段。文档建议：只记可复用的模式、不要把一次性例外写成学习项；写清「为什么」，不要只写「不要做什么」；尽量直接回复具体行评，以便绑定路径和上下文。适用学习项可在 [Learnings 文档](https://docs.coderabbit.ai/knowledge-base/learnings) 和 [Learnings 控制台](https://app.coderabbit.ai/learnings) 查看、编辑或删除；文档还建议定期清理过时或互相矛盾的条目。正式、需要长期执行的标准，文档明确应放到 review instructions 或 coding guidelines，而不是只留在 Learnings 里。Path instructions 优先级高于 Learnings。当前中央配置已写 `knowledge_base.learnings.scope: auto`（公开仓只用该仓自己的学习项，私有仓使用账号/组织下的学习项）。本轮对话没有实际验证「评论 → 生成 Learning → 后续 PR 生效」这条链路，也没有核对 VirusPC 个人账号在 Learnings 控制台里的现况。
- **`emit path instructions`（把建议写成仓级规则）**：在 PR 评论里发 `@coderabbitai emit path instructions`，CodeRabbit 会根据过去 7 天的路径指令建议另开一份 PR，把建议合并进该仓的 `.coderabbit.yaml`：只补还没有指令的路径，不覆盖已有条目；若最近没有现成建议，会先生成新建议（生成新建议需要有效订阅）。说明见 [Path-based review instructions](https://docs.coderabbit.ai/configuration/path-instructions) 和 [Review commands](https://docs.coderabbit.ai/reference/review-commands)。写规则本身的要求见 [Instructions/Guidelines best practices](https://kb.coderabbit.ai/articles/8553898196-instructions-guidelines-best-practices)：具体、可观察、写清作用范围，避免主观词和互相冲突的规则。博客如 [Context Engineering](https://www.coderabbit.ai/blog/context-engineering-ai-code-reviews)、[You Can Build an AI Reviewer. Can You Maintain It?](https://www.coderabbit.ai/blog/build-ai-code-reviewer-cant-maintain-it) 只是产品向介绍，没有更细的迭代方法。

必须守住的约束：`emit path instructions` 会往「当前这条命令所在的仓库」写本地 `.coderabbit.yaml`。VirusPC 现在靠中央仓提供基线，业务仓（包括 edges）默认没有自己的配置文件。如果在 edges 等业务仓直接跑这条命令，新写出来的本地文件可能盖掉中央基线。要用时，仓级文件应加 `inheritance: true` 做覆盖而不是整份复制，或把准备采纳的规则改回 [VirusPC/coderabbit](https://github.com/VirusPC/coderabbit)，不要在各业务仓平行维护一份完整配置。

与官方机制并列的是本轮已确定的工作方法：不以官方命令自动堆规则为准，而以真实 PR 的审查结果为证据。收集漏报（该提没提）、误报/噪音（不该提却提了）、措辞含糊的评论，归类后再改规则；每次改规则要说清改了哪条、针对哪类问题、预期效果、怎么验证；改完用后续 PR 或回放旧 PR 复核，记录有效与无效的改动。规则要少而精、可执行、可验证；区分阻断级与建议级；删掉长期只产生噪音的规则。规则改动写进仓库时走 Cursor 云端 Agent + PR，不直接推 main，未获明确授权不合并 PR；不把 CodeRabbit 的自动评论当成用户要求的工作，也不替用户在业务 PR 上发评论或审批，除非用户明确要求。

- 相关现状：中央基线已含中文审查意见、`reviews.profile: chill`、只评论本次 diff 改动行、优先报告运行时错误/数据丢失/密钥泄露/违反 AGENTS.md 硬约束，以及公开仓中标记凭据与未脱敏个人信息；并已开启 `knowledge_base.code_guidelines` 与 `learnings.scope: auto`。
- 基线核验样本：探针仓 [coderabbit-config-probe#1](https://github.com/VirusPC/coderabbit-config-probe/pull/1) 在无本地配置时，运行配置显示 Layers: Central YAML，Path: `.coderabbit.yaml`。早期探针标记和 `high_level_summary_instructions` 未被正式基线沿用；正式基线合入后，尚未用 edges 的业务 PR 做一次对照复核。
- 2026-10 至 10-26 期间、中央配置生效前的历史噪音（供对照，不是当前基线的新证据）：docstring 80% 检查曾在约 41 个 PR 出现（该检查已于 2026-11-11 退役）；[edges#51](https://github.com/VirusPC/edges/pull/51) 有过 diff 外评论。有用但未采纳的例子包括 [edges#35](https://github.com/VirusPC/edges/pull/35)、[edges-brain-viruspc#262](https://github.com/VirusPC/edges-brain-viruspc/pull/262)；被采纳样本当时为 0。
- 预期收益：后续改规则有证据、有验证、能复盘，避免只靠自动建议把规则越堆越多，也避免业务仓本地配置把中央基线冲掉。
- 非目标：不在本卡重做 CR 工具选型；不把其他审查工具的规则迭代一起做完；不在未授权时合并任何 PR；不在业务 PR 上代发 CodeRabbit 评论或代为审批。
- 关联：所属项目「AI 研发流程优化」；框架仓的工具选型项目 [Code Review](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-10-11--code-review/INDEX.md)；兄弟卡（不覆盖）[探索新的 CR 方式](https://github.com/VirusPC/edges/blob/main/.edges/projects/2026-09-09--edges-extensions/tasks/backlog/2026-10-11--探索新的-CR-方式/INDEX.md)；中央仓 [VirusPC/coderabbit](https://github.com/VirusPC/coderabbit) 与 [coderabbit#2](https://github.com/VirusPC/coderabbit/pull/2)。

**目标：**
形成一套可执行、可验证的 CodeRabbit CR 规则自迭代流程：以真实 PR 审查结果为证据，判断何时用 Learnings、何时改中央配置；官方的自动建议只作为输入，不直接灌进业务仓；改动能说明对象、预期和验证方式，并能用后续或回放审查核对是否有效。

**动作：**
- 持续收集真实 PR 上的 CodeRabbit 评论，按漏报、误报/噪音、措辞含糊归类，再决定改不改规则；没有证据不堆新规则。
- 对可复用的审查偏好，在具体行评下用 `@coderabbitai` 反馈并写清原因，让它生成 Learning；定期在 Learnings 控制台检查是否生效，并清理过时或互相矛盾的条目。一次性例外不要写成 Learning。
- 对要长期执行、需要可验证表述的规则，改 [VirusPC/coderabbit](https://github.com/VirusPC/coderabbit) 的中央 `.coderabbit.yaml`（例如 `path_instructions`、语气与审查范围），走云端 Agent + PR，不直接推 main，未获授权不合并。仓级若必须覆盖，另写该仓 `.coderabbit.yaml` 并设 `inheritance: true`，不要整份复制中央文件。
- 不要默认在 edges 或其他业务仓运行 `emit path instructions`。若试用，先确认产出的 PR 带 `inheritance: true`，或改为把建议摘进中央仓；不能接受一份会盖掉中央基线的本地配置。
- 每次改规则在本卡进展或对应 PR 里写清：改了哪条、针对哪类问题、预期效果、怎么验证。改完用后续 PR 或回放旧 PR 复核，并记录这次改动有效还是无效。
- 保持规则少而精；能区分阻断级与建议级时再区分；长期只产生噪音的规则删掉或收窄。
- 写规则时遵循官方最佳实践：具体、可观察、写清路径或范围，避免「干净 / 简单 / 合适」这类主观词，以及互相冲突的条文。
- 公开仓不足 10 个 star 时，复核审查需手动 `@coderabbitai review`，并注意每小时 included review 额度。

**完成标准：**
- [ ] 本卡（或由本卡引出、已入库的说明）写清自迭代流程，至少覆盖：证据分类（漏报 / 误报 / 措辞）、Learnings 与中央 `path_instructions` 的分工、以及「不要在无 `inheritance: true` 的业务仓用 `emit path instructions` 覆盖中央基线」。
- [ ] 至少完整走一轮真实样本：归类 → 改中央规则或新增 Learning → 写明预期与验证方法 → 用后续 PR 或回放旧 PR 核对，并记下这次改动有效还是无效。
- [ ] 若试用过 `emit path instructions`，所开 PR 没有让业务仓失去对 `VirusPC/coderabbit` 中央配置的继承；否则在本卡写明不采用该命令的原因。
- [ ] 规则改动均以 PR 提出，没有直推 `main`，也没有在未授权时合并。
