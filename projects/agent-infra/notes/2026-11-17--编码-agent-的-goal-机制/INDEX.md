# 编码 Agent 的 Goal 机制

> 以长时目标（`/goal`）为研究对象。记下五家怎么存目标、怎么续跑、怎么判完成、预算和进度落在哪，供以后按节往下挖。

## 研究问题与范围

这场只看编码 Agent 里的 goal：人设下一个还没做完的目标，宿主在回合结束后自己再开一轮，直到完成、卡住或被刹车停住。对照的是 Codex、Claude Code、DeepSeek Harness（CLI 名 dsh）、Kimi Code，以及 pi 核心和两个只读了 README 的第三方扩展。更早的替代写法 Ralph loop 放在后面，用来解释各家为什么没有照搬。

材料日期是 2026-11-17。开源部分本轮按下面的提交浅克隆后读过；标成「调研记录、本轮未重开」的路径来自同一天的上一轮记录，没有在这个提交上再打开。

- Codex：[openai/codex@59ac39addbbcd3499319c805a916846ca8ac5fef](https://github.com/openai/codex/commit/59ac39addbbcd3499319c805a916846ca8ac5fef)（2026-11-17）
- dsh：[deepseek-ai/deepseek-harness@39163dd30f703a79079e2d2446545cff3c453738](https://github.com/deepseek-ai/deepseek-harness/commit/39163dd30f703a79079e2d2446545cff3c453738)（2026-11-13）
- Kimi Code：[MoonshotAI/kimi-code@2931c7efd542a7cb2486faec0fc35bc2fde0f533](https://github.com/MoonshotAI/kimi-code/commit/2931c7efd542a7cb2486faec0fc35bc2fde0f533)（2026-11-17，调研记录版本 v2.6.2）
- ralph-loop 插件：[anthropics/claude-plugins-official@fd30cee3ecd5a8ee772733c5d20c0f2bae2da2f0](https://github.com/anthropics/claude-plugins-official/commit/fd30cee3ecd5a8ee772733c5d20c0f2bae2da2f0)（2026-11-16）
- Claude Code `/goal` 闭源，只引文档 [Keep Claude working toward a goal](https://code.claude.com/docs/en/goal)（本轮读的是同页 markdown）
- pi 核心与两个第三方扩展本轮没有克隆，仍用 2026-11-17 调研记录

相关笔记：[Codex 的 Code Mode](../2026-11-17--codex-的-code-mode/INDEX.md) — 同一天核对的另一项 Codex 能力。本篇只写 goal。

## Codex

### 命令与开关

`/goal [<objective>|clear|edit|pause|resume]`。调研记录的位置是 `codex-rs/tui/src/goal_display.rs:5`，本轮未重开该文件。`features.goals` 在调研记录里是 `Stage::Stable`、`default_enabled true`（`features/src/lib.rs:2286`），本轮未重开。本轮读到的配置只有一项：`[goals] max_goal_token_budget`，类型 `Option<NonZeroU64>`，注释写明它既是上限也是新目标的默认预算（`codex-rs/config/src/config_toml.rs:798-802`）。目标最长 4000 字、超长写成 `goal-objective.md` 附件，来自调研记录（`protocol/src/protocol.rs:4525`、`tui/src/goal_files.rs`），本轮未重开。实现在独立 crate `codex-rs/ext/goal/`。

### 目标存储

独立 SQLite。本轮读到的表 `thread_goals` 每线程一行，字段是 `thread_id`、`goal_id`、`objective`、`status`、`token_budget`、`tokens_used`、`time_used_seconds`、`created_at_ms`、`updated_at_ms`（`codex-rs/state/goals_migrations/0001_thread_goals.sql`；后续迁移 `migrations/0033_thread_goal_stopped_statuses.sql` 重写了表，字段没有增加）。状态是 `active`、`paused`、`blocked`、`usage_limited`、`budget_limited`、`complete`。另有 `thread_goal_continuation_deferrals`，只有 `thread_id` 一列（`goals_migrations/0002_thread_goal_continuation_deferrals.sql`）。库文件名 `goals_1.sqlite` 和「exec fork 的非临时线程推迟续跑」来自调研记录（`state/src/sqlite.rs:50`、`exec/src/lib.rs:1208`），本轮未重开。

### 续跑触发

线程空闲时 `continue_if_idle()`。状态不是 `Active` 就 `clear_active_goal()` 并返回；是 `Active` 才在同一条 thread 上 `start_turn_if_idle`，`turn_trigger` 为 `"goal"`（`codex-rs/ext/goal/src/runtime.rs:434-492`）。续跑请求带内部上下文 `continuation.md`，目标原文以 `AdditionalContextKind::Untrusted` 附带（`steering.rs:59-70`）。

### 完成判定

模型自评。`update_goal` 的参数只有 `status`，枚举是 `complete`、`blocked`、`paused`（`spec.rs:60-70`）。宿主只检查枚举，不检查「是不是真做完」（`tool.rs:270-278`）。`continuation.md` 的 Completion audit 要求按需求逐条对当前工作区取证，证据弱就继续做，不要标完成。blocked 的「同一阻塞连续至少 3 轮」写在这段 prompt 和工具描述里，`accounting.rs` 里的连续计数是空回复和执行失败，不是 blocked 轮数。

### 停止条件与兜底

token 预算到了变 `budget_limited`，并注入 `budget_limit.md` 收尾（模板在 `templates/goals/budget_limit.md`；状态分支在 `runtime.rs:241-251`）。额度用完变 `usage_limited`。调研记录：PR #23094 修 issue #23828 的无限循环和反复压缩；回合出错会停目标（`extension.rs:423` 注释 "Block the goal to prevent automatic continuation from looping"），本轮未重开该注释。本轮读到连续 3 轮执行失败或 3 轮空回复会交出 goal id（`accounting.rs:172`、`245`）。用户中断记 interrupted、无进展检查只在 prompt，来自调研记录，本轮未重开中断路径。`time_used_seconds` 有累计，`GoalsToml` 没有时间上限字段。

### 上下文压缩

每轮重注入 `goal_objective`。压缩边界会单独保留用户通过 goal API 写下的目标说明；目标 JSON 超过 700 字节时，这段证据改成「objective omitted」，避免截断后把限制读成授权（`codex-rs/core/src/context/user_goal.rs:16-18`、`30-38`、`100-105`）。`restore_after_resume` 重挂 active 目标来自调研记录，本轮未重开。续跑本身不新开线程。

### 权限

沿用线程上已有的 `TurnStartOptions`，续跑只改 `turn_trigger`（`runtime.rs:478-492`）。审批和沙箱不因设了目标而变。

### 已知问题

调研记录，本轮未重开 issue 正文：[#36503](https://github.com/openai/codex/issues/36503) PreToolUse hook 拦住全部工具，包括 `update_goal`，循环 2514 次约 8 小时；[#41831](https://github.com/openai/codex/issues/41831)、[#40929](https://github.com/openai/codex/issues/40929) 里，目标内的暂停条件或用户早前说的「先别测」和仍是 active 的调度冲突，空转。结论：只靠 prompt 约束不住调度器。

### 来源

见上面各节的文件。仓库提交 `59ac39addbbcd3499319c805a916846ca8ac5fef`。

## Claude Code

### 命令与开关

文档：`/goal <condition>` 设定并立即开一轮；无参数查看；`/goal clear`，别名 `stop`、`off`、`reset`、`none`、`cancel`。`/clear` 开新对话也会清掉目标。条件最长 4000 字、支持 `-p`、桌面端、Remote Control、v2.1.139（2026-05-11）引入，后三项来自调研记录，本轮未重开发布页。文档原话："`/goal` is a wrapper around a session-scoped prompt-based Stop hook"。

### 目标存储

按会话。`--continue` / `--resume` 带回仍 active 的条件，但轮数、计时、token 基线清零；已经完成或清掉的目标不恢复（文档 "Resume with an active goal"）。具体落盘格式闭源，未核实。

### 续跑触发

每轮结束把条件和对话交给小快模型（可用 `ANTHROPIC_DEFAULT_HAIKU_MODEL` 改）。判 **Not yet met** 就再开一轮，并把理由当作下一轮指引；**Met** 清除并记下达成；**Impossible** 清除并记下失败。评估器不调工具，只看对话。

### 完成判定

另一个小模型看对话，不看文件。文档要求把「证据会出现在对话里」写进条件，例如测试结果要先被 Claude 跑出来。

### 停止条件与兜底

没有内置轮数或 token 预算。要把 `or stop after 20 turns` 写进条件，由评估器从对话里判，这是软限制。连续几轮没有工具调用会停循环、留着目标，具体轮数文档只写 several turns，数字未核实。鉴权失败、余额耗尽、压缩救不回的上下文溢出、磁盘满到无法续登录，会清除目标。偶发错误重试；限流、额度用完、hook 结束回合会暂停。有子代理或后台命令时跳过评估，空闲最多主动 check-in 3 次（文档写 v2.1.236 起，第三次后暂停到用户再发消息）。

### 上下文压缩

同会话续跑。过长走普通自动压缩。压缩救不回的溢出会清目标。文档没有写 Stop hook 会清空上下文。

### 权限

文档："A goal doesn't change your permission mode"。无人值守要自己开 auto mode。`disableAllHooks` 时不可用。

### 已知问题

调研记录，只看过搜索摘要，本轮未重开：[#85594](https://github.com/anthropics/claude-code/issues/85594) 完成后仍无限循环；[#58334](https://github.com/anthropics/claude-code/issues/58334) `/goal clear` 不生效。

### 来源

[code.claude.com/docs/en/goal](https://code.claude.com/docs/en/goal)。更早的插件替代见下文 Ralph。

## dsh

### 命令与开关

`/goal`、`/goal <objective>`、`edit`、`pause`、`resume`、`clear`，在 UI 命令层执行，不耗模型回合。拆成四包：`goal`、`tool-goal`、`command-goal`、`goal-round-driver`（续跑可选）。base bundle 默认全装来自调研记录（`packages/bundle/base/cordis.patch.yml:327`），本轮未重开该补丁。`dsh-superagent-prototype` 只是插件，与 goal 无关，来自调研记录。

### 目标存储

事件溯源。每次修改写 `goal/change`，带完整快照或清除标记，以及 revision，CAS 写入。持久字段是 `id`、`revision`、`objective`、`phase`、`blockedReason`、`maxGoalRounds`；视图再加 `roundsStarted`、`createdAt`、`updatedAt`（`packages/goal/goal/src/types.ts:59-99`）。`activation`（armed / disarmed）只在进程内，不进持久投影。恢复或 fork 之后不会自动续跑，要人 `/goal resume`。类型里的 checkpoint 是回放投影，不是工作进度。

### 续跑触发

`goal-round-driver` 在整个 agent 空闲、子代理结束后，用 `agent.followup()` 投递一条 `<goal_round>` 用户消息（`goal-round-driver/src/index.ts:190-208`，`prompt.ts:12-25`）。只计真正入历史的轮。pre-step 前后校验 revision，挡并发和过期轮，来自包 README。

### 完成判定

`update_goal` 的 `action` 是 `edit`、`pause`、`resume`、`complete`、`blocked`（`tool-goal/src/index.ts:47`、`234-253`）。`complete` 和 `blocked` 可以由 goal round 调用。`blocked` 在 goal-round 权限下，`roundsStarted` 小于 `blockedAfterConsecutiveRounds`（默认 3）会抛 `GOAL_TOOL_BLOCK_THRESHOLD`（`index.ts:39`、`282-292`）。这是代码门槛，不是只写在 prompt 里。`edit`、`pause`、`resume` 要求直接人类请求。模型不能把 paused 恢复成 active（`GOAL_TOOL_RESUME_PAUSED`）。`create_goal` 允许从人的长时请求推断目标，和 Codex「不要从普通任务推断」相反。

### 停止条件与兜底

`defaultMaxGoalRounds` 256，用完记 `round-limit` 并 block（`goal-round-driver/src/index.ts:182-187`）。写入失败、取消、卸载插件都停；取消后不自动重启。README 写明没有 token、费用、时间预算。没有独立评估器，"evaluator-backed certification remains deferred"。异常不自动重试。

### 上下文压缩

同会话。README 写：已准入的 round 留在历史里，直到压缩把它们挡住；不新建 agent，不复制一段对话前缀。续跑本身不裁历史，只是再追加一块 `<goal_round>`。

### 权限

`tool-goal` 里看到的是「谁可以改状态」（直接人类，或当前 goal round），没有看到审批或沙箱策略。和续跑回合的审批关系未逐行核实。

### 已知问题

README 的已知限制就是上面这些：无独立评估器、只同会话、异常不自动重试。同仓库另有实验工具 `dsh-tool-ralph`，不在 goal 包里，见后文。

### 来源

`packages/goal/` 与 `docs/subsystems/goal.md` 所在提交 `39163dd30f703a79079e2d2446545cff3c453738`。

## Kimi Code

### 命令与开关

`/goal`，以及 `status`、`pause`、`resume`、`cancel`、`replace`、`next`。`/goal next` 是目标队列。`kimi -p "/goal ..."` 的退出码 0 完成、3 阻塞、6 暂停，来自调研记录，本轮未重开文档页。[交互说明](https://www.kimi.com/code/docs/en/kimi-code-cli/guides/interaction.html)、[斜杠命令](https://www.kimi.com/code/docs/en/kimi-code-cli/reference/slash-commands.html)。实现在 `packages/agent-core-v2/src/features/goal/`，`goalService.ts` 约 1500 行。旧 Python `kimi-cli` 已归档，社区 PR #2276 未合，来自调研记录，本轮未重开该 PR。

### 目标存储

会话 wire 事件 `goal.create`、`update`、`clear`、`account_usage`、`continuation`，回放重建（调研记录：`agent/replayBuilder/fold.ts:45`，本轮未重开）。状态 `active`、`paused`、`blocked`、`complete`。快照字段是 `goalId`、`objective`、可选 `completionCriterion`、`status`、`turnsUsed`、`tokensUsed`、`wallClockMs`、`budget`、可选 `terminalReason`（`types.ts:24-34`）。`completionCriterion` 是「怎样算做完」，不是做到哪一步的流水。

### 续跑触发

`TurnEnded` 之后 `launchContinuationTurn`，把 `GOAL_CONTINUATION_PROMPT` 当成 `system_trigger` 名为 `goal_continuation` 的用户消息，交给同一个 agent loop（`goalService.ts:749-770`）。单轮步数到上限就换一段提示，要求把工作切小。有 `WaitFor` 时提示别结束回合干等后台。

### 完成判定

`UpdateGoal` 的 `status` 是 `active`、`complete`、`blocked`（`tools/update-goal/update-goal.ts:6-14`）。宿主检查枚举、目标还在不在、这一轮目标有没有被改过，然后 `markComplete` / `markBlocked`；不数「是不是已经卡了 3 轮」（`updateGoalTool.ts:30-76`）。3 轮门槛写在 `GOAL_CONTINUATION_PROMPT`（`goalService.ts:152-163`）。另外：目标明显不可能、不安全或自相矛盾，当轮就可以 `blocked`。大多数轮次不应调用 `UpdateGoal`。

### 停止条件与兜底

token、轮数、墙钟三种预算都有，默认都不设；只有用户明说「最多 20 轮」「花 1 小时」时，模型才调 `SetGoalBudget`（`set-goal-budget.md`，调研记录）。到预算变 `blocked`，最后一轮剩余工具调用全部否决，让模型写总结（`goalService.ts:122-130`）。墙钟只在会话开着时走。用户中断暂停。限流、鉴权、API 错误暂停并写原因前缀。`UserPromptSubmit` hook 拦截标 `blocked`。

### 上下文压缩

首次或状态变化注入完整提醒，之后用精简版（`goal-active-sparse-reminder.md`）。`goalInjection.ts:121` 里的 `Progress:` 是「续跑轮数、token、已用墙钟」，不是工作进度叙述。压缩后若历史里出现压缩摘要，下一轮改回完整提醒（`goalInjection.ts:93-94`）。续跑不新开会话。fork 是另一条路径：fork 可以清掉当前目标。

### 权限

本轮没有重开 TUI 文件。调研记录：创建前若不是 auto 模式，会弹 goal start review，让用户切 auto 或 yolo（`goalService.ts:1167`、`apps/kimi-code/src/tui/commands/goal.ts`），创建失败回滚权限模式。设目标本身不改审批策略。

### 已知问题

本轮没有另搜 Kimi 的 goal issue。上面的异常路径是源码里写明的暂停和 blocked。

### 来源

`packages/agent-core-v2/src/features/goal/`，提交 `2931c7efd542a7cb2486faec0fc35bc2fde0f533`。

## pi

### 命令与开关

核心没有 `/goal`。调研记录：在 `src` 和 CHANGELOG 里搜 goal，只见到压缩摘要模板里的「## Goal」。最接近的扩展点是 `agent_before_settle` 返回 `{ entries, continue: true }` 再续一轮，或在 `agent_end` 里 `pi.sendUserMessage(..., {deliverAs:"followUp"})`（`docs/extensions.md:661`）。示例扩展是 plan-mode。本轮没有重开 pi 仓库，提交号仍是调研记录里的 `badlogic/pi-mono@4afe78de`（coding-agent 1.5.2）。

### 目标存储

核心无。第三方只读过 README：`pi-mono-goal`（emanuelcasco）用 `goal-event` 自定义条目记在会话里；`@mocito/pi-goal` 状态随分支。

### 续跑触发

核心靠扩展钩子，不是内建调度。`pi-mono-goal` 有 manual、assist、auto 三模式。

### 完成判定

视扩展。本轮没有读到它们的完成判定代码。

### 停止条件与兜底

`pi-mono-goal` 的 auto 默认最多 10 轮、30 分钟。`@mocito/pi-goal` 有 token 预算，取消或出错不续。都只来自 README。

### 上下文压缩

未读源码。核心那条「## Goal」只是压缩摘要模板里的一节标题，不是 goal 运行时。

### 权限

调研记录：核心不因 goal 改权限。两个扩展的权限行为未读源码。

### 已知问题

未读源码，没有记。

### 来源

2026-11-17 调研记录。本轮未克隆 pi。

## 横向对比

| | Codex | Claude Code | dsh | Kimi Code | pi（扩展） |
| --- | --- | --- | --- | --- | --- |
| 原生支持 | 默认开 | 有 | 有，续跑包可选 | 有 | 核心无，仅第三方 |
| 目标存在哪 | 独立 SQLite `thread_goals` | 会话；格式未核实 | 会话事件日志 + revision | 会话 wire 事件 | 会话自定义条目（仅 README） |
| 谁触发续跑 | 空闲时 `continue_if_idle` | Stop hook | 空闲 round driver | `TurnEnded` | `before_settle`（仅 README） |
| 谁判完成 | 模型自评 | 另一个小模型 | 自评 | 自评 | 视扩展 |
| blocked 门槛 | prompt 写连续 3 轮，代码不数 | 判官判 impossible | 代码强制，默认 3 轮 | prompt 写 3 轮，代码不数；不可能可当轮报 | 视扩展 |
| 判定代码 | 只收 `complete`/`blocked`/`paused` | 闭源；文档三态 | `GOAL_TOOL_BLOCK_THRESHOLD` | `UpdateGoal` 枚举 `active`/`complete`/`blocked` | 未读源码 |
| 预算 | 仅 token。不写配置则无上限。配置值既是上限也是新目标默认。`create_goal` 可设更小。到点 `budget_limited` | 无内置。只能写进条件，由判官判。硬停只有错误类 | 仅轮数，默认 256，宿主计数。到点 `round-limit` 转 blocked | token、轮数、墙钟都有，默认都不设。用户明说才 `SetGoalBudget`。到点 blocked，否决剩余工具 | README：auto 默认 10 轮 30 分钟；另一扩展有 token |
| 硬兜底 | 连续 3 轮空回复或执行失败；回合出错；额度用完 | 连续几轮无工具调用则停但留目标；鉴权、余额、救不回的溢出会清除 | 轮数用尽、写入失败、取消、卸载；取消不自动重启 | 中断、限流、鉴权、API 错误会暂停；hook 拦截则 blocked | 视扩展 |
| 恢复会话后 | 同一线程可再续；有推迟表 | 带回条件，轮数、计时、token 基线清零 | 不自动续，要人 resume | 回放重建；fork 可清目标 | 跟随分支（仅 README） |
| 权限 | 不变 | 不变，无人值守要自己开 auto | 未见改审批；未逐行核沙箱 | 创建时提示切 auto/yolo | 不变（仅 README） |
| 目标队列 | 无 | 无 | 无 | `/goal next` | 无 |

判定代码的展开在下一节。预算的展开在「预算怎么定」。

## 预算怎么定

差别在谁来算，以及默认有没有上限。Codex 和 Kimi 由宿主计数，到点强制收尾。Codex 一旦写了配置就有上限，不写就没有。Kimi 三种预算默认都没有，要用户把数字说出来。dsh 只数轮，默认 256，上限宽。Claude 没有宿主预算，全靠判官读条件。

### Codex

只有 token 预算。`[goals] max_goal_token_budget` 的注释就是 "Maximum token budget allowed for a goal and default budget for new goals"（`config_toml.rs:800-802`）。它是 `Option<NonZeroU64>`，JSON Schema 的这项没有 `default`。解析时缺省就是 `None`（`core/src/config/mod.rs:4759-4771`）。所以没有写死的默认数字。不写这项时，新目标的 `token_budget` 也是空，宿主不会按 token 把目标打成 `budget_limited`。

单个目标可以设得比上限更小。`create_goal` 有可选参数 `token_budget`，工具说明是 "Omit unless explicitly requested" / "Set token_budget only when an explicit token budget is requested"（`spec.rs:35-47`）。创建时没带就用配置上限：`request.token_budget = request.token_budget.or(self.max_goal_token_budget)`（`tool.rs:219`）。`validate_goal_budget` 拒绝小于等于 0，也拒绝大于上限（`tool.rs:445-461`）。`update_goal` 不能改预算，只能改状态。TUI 新建目标时传的预算是 `None`，于是走上限；编辑时沿用原来的预算（`tui/src/app/thread_goal_actions.rs:196-203`）。app-server 的 `thread_goal_set` 可以 `Set` 一个预算（`thread_goal_processor.rs:192-196`）。

宿主把 `tokens_used` 累计进 SQLite。到预算后状态变成 `budget_limited`，并注入 `budget_limit.md`。`time_used_seconds` 会记，但 `GoalsToml` 只有 token 这一项，本轮没有看到按墙钟把目标停掉的配置。

### Claude Code

无内置预算。文档让人把 `or stop after 20 turns` 写进条件，评估器从对话里判，这是软限制。硬停止只有错误类：鉴权失败、余额耗尽、自动压缩救不回的上下文溢出。

### dsh

只限轮数。`defaultMaxGoalRounds` 256，用完记 `round-limit` 并转 blocked。只计真正进入历史的轮。README 写明没有 token、费用、时间预算。

### Kimi Code

token、轮数、墙钟三种都有，默认都不设。用户明确说「最多 20 轮」或「花 1 小时」时，模型才调 `SetGoalBudget`。到点变 blocked，最后一轮剩余工具调用全部否决，逼模型写总结。墙钟只在会话开着时计。

### pi 扩展

仅 README。`pi-mono-goal` 的 auto 默认最多 10 轮、30 分钟。`@mocito/pi-goal` 有 token 预算。

## 模型怎么判断完成

自评派的本质是：prompt 里有一份审计清单，模型自己调用 `update_goal` 或 `UpdateGoal`。宿主只校验形式（枚举、门槛、目标还在不在），不校验「工作区是不是真的做完了」。Claude Code 是另一个小模型看对话下判。

### Codex

工具 schema：`update_goal.status` 只能是 `complete`、`blocked`、`paused`（`spec.rs:63-66`）。

续跑 prompt 节选（`templates/goals/continuation.md:31-42`）：

```text
Completion audit:
Before deciding that the goal is achieved, treat completion as unproven...
Only mark the goal achieved when current evidence proves every requirement has been satisfied and no required work remains.
...
Only use status "blocked" when the same blocking condition has repeated for at least three consecutive goal turns
```

宿主收到之后（`tool.rs:270-305`）：枚举不对就把错误回给模型；对了就记账并 `update_thread_goal` 写成这个状态。不读工作区，不数 blocked 轮数。状态一旦不是 `Active`，`continue_if_idle` 不再开下一轮（`runtime.rs:474-476`）。

### Claude Code

闭源，没有工具 schema。文档写评估器的输入是「条件 + 到目前为止的对话」，输出三态，各带短理由：

- Not yet met：继续，理由成为下一轮指引
- Met：清除目标，记下达成
- Impossible：清除目标，记下失败

评估器不调工具。更早的 ralph-loop 不是这个判官。它的 Stop hook 只做字符串相等：从助手最后一段文本里取出 `<promise>...</promise>`，和 frontmatter 里的 `completion_promise` 用 `=` 比较，相等就删状态文件并放行；否则输出 `{"decision":"block","reason": <原 prompt>}`（`plugins/ralph-loop/hooks/stop-hook.sh:128-188`）。

### dsh

工具 schema：`update_goal` 必填 `goal_id`、`revision`、`action`。`action` 枚举 `edit`、`pause`、`resume`、`complete`、`blocked`。`blocked` 还要非空的 `blocked_reason`（`tool-goal/src/index.ts:234-252`）。

续跑 prompt（`goal-round-driver/src/prompt.ts:18-23`）要模型先取证，再读当前目标，做完了就标 complete；没做完就留着 active。blocked 的轮数门槛不在这段里，而在系统提示和执行时的抛错。

宿主（`index.ts:282-299`）：goal-round 权限下，轮数不够就抛 `GOAL_TOOL_BLOCK_THRESHOLD`。过了门槛才 `goals.complete` 或 `goals.block`。`complete` 要求当前不是 complete，然后把 phase 写成 complete 并 disarm（`goal/src/index.ts:393-402`）。`block` 只接受当前是 active（`index.ts:412-426`）。fold 再拒绝非法相位（`fold.ts:239-245`）。语义上「是不是同一个阻塞」仍由模型写进 `blocked_reason`，代码不比较原因文本。

### Kimi Code

工具 schema：`UpdateGoal.status` 为 `active`、`complete`、`blocked`（`update-goal.ts:8-12`）。

续跑 prompt 节选（`goalService.ts:144-163`）：做完有边界的一片就正常结束回合，不要调用 `UpdateGoal`。只有全部要求做完、该跑的验证过了、没有下一步，才 `complete`。非终局阻塞要同一条件连续 3 个 goal 回合。不可能、不安全、自相矛盾可以当轮 `blocked`。

宿主（`updateGoalTool.ts:64-76`）：`complete` 调 `markComplete`，`blocked` 调 `markBlocked`。两者都要求当前是 active（`goalService.ts:451`、`464`），然后改状态并 `stopTurn: true`。没有 3 轮计数器。

### pi

核心没有这套工具。两个第三方扩展本轮未读源码，判定代码未核实。

## 进度记录在哪

原生 goal 没有「做到哪一步」这种进度字段。宿主记的是计量：token、时间、轮数、状态。做到哪一步，留在对话历史和压缩摘要里。和这个判断不一致的地方如下。

Codex 的 `thread_goals` 没有 progress、summary 或笔记列。`continuation.md` 没有要求写 `progress.md`。

dsh 的持久快照也没有进度叙述。`GoalProjectionState` 名叫 checkpoint，指的是回放用的投影，不是工作日志。

Kimi 的快照多了 `completionCriterion`（完成标准）和 `terminalReason`（为什么停）。提醒文案里有一行 `Progress: ${turns} continuation turns, ${tokens} tokens, ${elapsed} elapsed`（`goalInjection.ts:121`），这是计量，不是工作进度。预算耗尽时的提醒要求模型在对话里写一段最终状态，不要求写文件。

ralph-loop 的状态文件 `.claude/ralph-loop.local.md` 不只迭代数和 completion promise。frontmatter 还有 `active`、`session_id`、`max_iterations`、`started_at`，正文是原始 prompt（`scripts/setup-ralph-loop.sh:140-151`）。没有进度字段。

Geoffrey Huntley 的原文（[Ralph Wiggum as a "software engineer"](https://ghuntley.com/ralph/)，2025-07-14 发表）里没有 `progress.md`。进度约定写在 prompt 里，文件是 `fix_plan.md`（按优先级列还没做的事）和 `specs/*`，并要求用 git 把它们加进去。原文还写不要把状态报告塞进 `AGENT.md`。社区若用 `progress.md` 或 TODO 文件，那是 prompt 约定，不是这篇原文里的文件名，本轮没有另查社区仓库。

## 同会话续跑与 Ralph 式新会话

Stop hook 不清上下文。Claude `/goal` 和官方 ralph-loop 都在当前会话里续。hook 输出 `decision: block` 之后，原 prompt 或判官理由作为新消息追加，历史还在。过长靠会话自己的自动压缩。

原版 Ralph 不是这条路。Huntley 原文写："In its purest form, Ralph is a Bash loop." 命令是：

```bash
while :; do cat PROMPT.md | claude-code ; done
```

没有 `claude -p`，也没有 `--continue`。每次是新进程。文章没有写「上下文全空」这四个字，但这条命令没有把上一轮会话带回来。进度靠 `PROMPT.md` 指向的 `specs`、`fix_plan.md` 和 git。

官方插件的 help 把示意循环写成了 `cat PROMPT.md | claude-code --continue`（`commands/help.md:15-17`），和原文不一致。插件真正执行的路径也不是这个 shell：README 写循环发生在当前会话里，Stop hook 拦住退出，把同一段 prompt 喂回去（`README.md:27`，`stop-hook.sh:179-188`）。

dsh 的 goal 续跑是同会话 `followup`。README 写明：不 spawn 新 agent，不 fork 会话前缀，不做 Ralph 式独立尝试，那件事属于插件层（`goal-round-driver/README.md:108-126`）。压缩会把旧 round 挡住，续跑本身不另开会话。同仓库的实验工具 `dsh-tool-ralph` 才是每轮一个全新子会话，父对话和上一个子会话都不带过去，只交一份有界结构化报告，工作区是长期记忆（`packages/experimental/tool-ralph/src/index.ts:180-184`）。

Codex 续跑是同一条 thread 的 `start_turn_if_idle`，不新开线程，也不在续跑时裁掉历史。压缩是会话自己的机制；用户目标说明在压缩边界另留一份，超长目标在这份证据里整段省略。fork 会复制目标快照，但是另一条路径，而且非临时 exec fork 可以推迟续跑。

Kimi 续跑是同一个 loop 再提交一条用户消息。提醒可以从完整版换成精简版，那是少注入一段文字，不是删历史。压缩摘要出现后，提醒会回到完整版。fork 可以清掉当前目标，同样不是续跑路径。

代价：同会话留得住细节和中途指示，但越跑越长，压缩可能丢掉关键句。新会话上下文干净，但必须把进度写进文件和 git，否则下一轮什么都不记得。

## 为什么各家不直接用 Ralph loop

官方没有公开一篇「我们为什么不用 Ralph」的说明。下面是从实现反推。能找到的原文和官方表态附在节末，没有表态的家不写。

各家留下了 Ralph 的「没做完就再喂一轮」，换掉了原版的两点：每轮新进程清上下文，以及靠 `<promise>` 暗号判定。

1. 每轮新开进程代价高。要重读代码，会忘掉已经踩过的坑和用户中途的指示，除非 prompt 约定模型去维护 `fix_plan.md` 这类文件。产品不能把这份约定交给每个用户现写。同会话再加上原来的自动压缩，和日常一轮轮说话是同一条路。
2. 暗号判定脆弱。提前喊出 `<promise>` 会停，不喊就空转。结构化的 `update_goal(complete)` 至少能校验枚举、设门槛、配一份审计清单。Claude 再进一步，用另一个小模型看对话。
3. 原版没有刹车。没有 token 预算、轮数上限，也没有把报错和额度用完接进循环。Codex 上 hook 把 `update_goal` 一起拦住、循环两千多次的事故说明，这些得写进调度，不能只写在 prompt 里。
4. 原版在产品外面。外层 shell 看不到目标状态，用户没法在产品里暂停、恢复、改目标，界面也不显示进度。`/goal` 把状态、审批、权限、恢复和计费放进宿主。
5. 自动化风险。原版常和跳过审批的无人值守一起用。上面几家设目标都不改权限模式。

Ralph 没有被换掉。它适合超长、可以按文件切块的批量任务，例如按清单改很多文件：干净的上下文是优点。它仍以插件或实验工具存在。dsh 的 goal README 明确不做这条，实验包里另有实现。

一句话：各家拿走自动续跑，把清空上下文和暗号判定换成同会话续跑和结构化判定，并加上宿主刹车。

已找到的原文和表态：

- Geoffrey Huntley，[Ralph Wiggum as a "software engineer"](https://ghuntley.com/ralph/)（2025-07-14）。纯形式就是上面的 bash 循环。
- Anthropic 官方插件 [ralph-loop README](https://github.com/anthropics/claude-plugins-official/blob/fd30cee3ecd5a8ee772733c5d20c0f2bae2da2f0/plugins/ralph-loop/README.md) 引用这句话，并写明自己改成当前会话里的 Stop hook。
- dsh [goal-round-driver README](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/goal/goal-round-driver/README.md) 写不做 Ralph 式独立尝试。[工具目录里的 `ralph`](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/tool-catalog.md) 写：每轮全新子会话，普通的长期同会话工作用 goal。
- Claude Code 的 `/goal` 文档没有提到 Ralph。Codex 这次检出的 goal 代码里没有 Ralph 这个词。Kimi 的循环配置里有一个字段名 `maxRalphIterations`（`configSection.ts:16`），旁边没有解释它和 Ralph 技法的关系，所以不把它当成表态。

## 设计取舍

1. 自评还是独立评估。自评便宜，而且看得到工作区里的真实文件；容易提前报完成，或卡住了还在空转。各家用很长的 completion audit 压这件事。Claude 的独立判官不容易自己骗自己，但只看对话、看不到文件，于是「证据必须出现在对话里」变成写条件的人的负担。
2. 规则写在 prompt 里还是写进代码。Codex 那些高消耗事故都出在 prompt 挡不住调度器。dsh 把 blocked 门槛、谁能改状态、恢复后不自动续跑写进代码，是最直接的回应。
3. 预算放在宿主还是放进语义。Codex 和 Kimi 由宿主计 token、轮数或时间，到点强制收尾。Claude 只能写进条件，让评估器判，结果不确定。
4. 同会话续跑还是每次新会话。原生 `/goal` 都是同会话，靠压缩。Ralph 式新会话加文件系统传状态，留在插件或实验工具。dsh 的 goal README 写明 goal 不做。
5. 安全。目标文本都当不可信数据：Codex 用 `Untrusted`，Kimi 用 `<untrusted_objective>`。设目标都不改审批策略。

## 为什么模型没有 delete_goal

人可以删。Codex、dsh、Claude 是 `/goal clear`，Kimi 是 `/goal cancel`。给模型的工具故意没有删除。

第一，防止模型交差。目标就是逼它做到真完成。若能删，遇到难做的，最省事的出路是删掉目标。宿主看见没有 active 就停止续跑，完成审计被绕开。Codex 的 `update_goal` 只允许 `complete`、`blocked`、`paused`，各自还有门槛。

第二，留下状态比删掉好。`complete` 和 `blocked` 是结果。目标、消耗的 token、卡住的原因都还在。删了就看不出是做完了还是放弃了。

第三，dsh 更严。`edit`、`pause`、`resume` 都要求直接的人类请求，由代码强制。模型只能报完成，或连续卡满门槛后报 blocked。

一句话：结束目标有两条路。模型只能走要说明理由的那条（`complete` 或 `blocked`）。不留痕的删除只留给人。

## 关键代码片段

Codex 只在 active 时续跑（`runtime.rs:474-492`）：

```rust
if goal.status != codex_state::ThreadGoalStatus::Active {
    self.inner.accounting_state.clear_active_goal();
    return Ok(());
}
thread.start_turn_if_idle(request.on_start(TurnStartOptions {
    turn_trigger: Some("goal".to_string()),
    ..start_options
})).await
```

Codex 连续 3 轮空回复（`accounting.rs:244-245`）：

```rust
inner.consecutive_empty_turns = inner.consecutive_empty_turns.saturating_add(1);
(inner.consecutive_empty_turns >= 3).then_some(goal_id)
```

dsh 的 blocked 门槛（`tool-goal/src/index.ts:286-292`）：

```ts
if (args.action === 'blocked' && authority.kind === 'goal-round'
    && authority.goal.roundsStarted < resolved.blockedAfterConsecutiveRounds)
  throw new HarnessError(
    `blocked requires at least ${resolved.blockedAfterConsecutiveRounds} consecutive goal rounds`,
    'GOAL_TOOL_BLOCK_THRESHOLD')
```

Kimi 在回合结束后，目标仍是 active 才续跑（`goalService.ts:674-677`）。用户中断走 `settleAbnormalTurn`，里面 `pauseOnInterrupt`（`716-718`）。

```ts
if (state === null || state.status !== 'active' || state.goalId !== lifecycleGoalId) return;
if (blockIfBudgetReached(context, state) !== null) return;
launchContinuationTurn(context, lifecycleGoalId, stepCapped);
```

## 未核实点

Claude Code 闭源。存储格式、评估 prompt 原文、无工具调用停止的具体轮数看不到。两个 issue 只看过搜索摘要。

pi 的两个第三方扩展只读过 README，本轮没有克隆。

dsh 续跑回合和审批、沙箱的关系没有逐行看完。goal 工具里没有审批逻辑。

Codex 自 0.128.0 起有 Goals，这个版本号来自 cookbook 搜索摘要，未核原文。

`features.goals` 的默认开关、4000 字上限、`goals_1.sqlite` 路径、exec fork 推迟续跑、`extension.rs:423` 的注释，本轮没有重开那些文件。

社区仓库里是否流行 `progress.md` 这个文件名，本轮没有另查。Huntley 原文用的是 `fix_plan.md`。

## 后续可深挖问题

下面的小节先留空，供以后按主题追加。本轮不写结论。

### 完成判定

### 预算与兜底

### 续跑与恢复

### 权限

### 上下文压缩

## 补充说明

- 原始材料：2026-11-17 的调研，以及同日按提交浅克隆后读到的源码。Claude 文档为当天拉取的 [goal](https://code.claude.com/docs/en/goal)。Huntley 原文为 [ghuntley.com/ralph](https://ghuntley.com/ralph/)。
- 相关笔记：[Codex 的 Code Mode](../2026-11-17--codex-的-code-mode/INDEX.md) — 同一天的 Codex 实现笔记，写的是把工具收进一次 JavaScript 执行。本篇只写 goal。
