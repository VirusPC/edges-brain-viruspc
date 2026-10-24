# Grok Bot → Langfuse 导出频率用量评测：每小时与每 10 分钟对照实验报告

- 实验日期：2026-10-24（Asia/Shanghai，下文记作 CST；UTC = CST − 8 小时）
- 关联项目：[`projects/routines/grokbot-langfuse-export/`](../../projects/routines/grokbot-langfuse-export/)（意图见 `SKILL.md`，日程见 `schedule.md`）

## 1. 摘要

**结论：保留每小时运行。** 实测每 10 分钟运行时，routine 每次唤醒平均消耗约 31 万 token，其中约 85% 为 cache read，属于与导出数据量关系较弱的固定开销。按唤醒次数折算，每 10 分钟约 4500 万 token/天，每小时约 750 万 token/天，成本相差约 6 倍；而提高频率带来的收益仅为最大延迟从约 60 分钟降到约 10 分钟，Langfuse 净写入量基本不变。在当前观测用途下，这一收益不足以抵消 6 倍的额度消耗。

## 2. 背景与目的

Routine「Grok Bot 会话每小时写入 Langfuse」（folder `grok-bot-langfuse`）定时唤醒一个 Grok Bot automation 会话，从 box 本地 `search-index.db` 增量读取全部助手的对话，生成 staging 后写入自建 Langfuse（`https://langfuse.viruspc.tech`）。去重依赖 box 本地 cursor 与稳定 traceId，因此重复运行不会重复写入。

原日程为 `CRON_TZ=Asia/Shanghai 0 * * * *`（flexible ±15 分钟）。为判断是否值得改为更高频率，本实验回答两个问题：

1. 每 10 分钟运行相比每小时运行，额度消耗增加多少；
2. 增加的消耗换来了什么收益。

## 3. 实验设计

### 3.1 分组与时间窗口

| 组别 | 日程 | 时间窗口（CST） | 时间窗口（UTC） | 运行次数 |
|---|---|---|---|---|
| 对照组（每小时） | `0 * * * *` | 20:09 至 20:10 | 12:09 至 12:10 | 1 次 |
| 实验组（每 10 分钟） | `*/10 * * * *`（自 20:41 CST 起临时启用，flexible 约 ±2 分钟） | 20:50 至 22:50 | 12:50 至 14:50 | 约 12 次（cron 槽位 13 个） |

对照组为 routine 第一次正式跑通的那次运行，含首次 24 小时回填 247 轮。

### 3.2 计量口径

- 数据源：cursor.com/dashboard/usage 页面 Export CSV 导出的 `usage-events-2026-10-24.csv`。
- 模型标签：仅统计 `Model = grok-bot-automation` 的行，即 routine 唤醒产生的用量。
- 额度来源：该用量计入 Cursor Ultra 的周额度池，CSV 中 `Kind` 与 `Cost` 均为 `Included`。
- 计量单位：token，按 CSV 的 `Cache Read`、`Input (w/ Cache Write)`、`Input (w/o Cache Write)`、`Output Tokens`、`Total Tokens` 五列汇总。

### 3.3 唤醒识别方法

Routine 成功时默认静默，没有逐次运行日志。每次唤醒在 CSV 中表现为 `grok-bot-automation` 在一两分钟内连续出现的一组行（短爆发），按此识别唤醒次数。窗口内没有其它 routine 运行，因此这些爆发均归属本 routine。辅助证据为 automation_status 的最后一次运行（22:53:24 CST，succeeded）和 box 上 cursor 文件与残留 stdout 的写入摘要。

### 3.4 排除项

同一窗口内其它模型标签的用量不计入本实验：

| 模型标签 | 窗口内行数 | 窗口内 token | 说明 |
|---|---|---|---|
| `grok-bot-default` | 348 | 24,223,032（约 24.2M） | 交互式对话 |
| `grok-bot-cua` | 323 | 20,115,475（约 20.1M） | 桌面 / 浏览器操作 |

## 4. 数据与结果

### 4.1 用量汇总

| 指标 | 对照组（每小时，1 次） | 实验组（每 10 分钟，约 12 次） |
|---|---|---|
| CSV 行数 | 10 | 89 |
| 总 token | 653,289 | 3,773,640 |
| 单次唤醒 token | 653,289（含回填，偏大） | 约 314,470（3,773,640 ÷ 12，约 31 万） |
| 每 10 分钟桶 token 区间 | 不适用 | 228,250 至 442,882（约 23 万至 44 万） |

### 4.2 Token 构成

| 构成 | 对照组 token | 占比 | 实验组 token | 占比 |
|---|---|---|---|---|
| Cache read | 591,893 | 90.6% | 3,189,431 | 84.5% |
| Cache write input | 57,238 | 8.8% | 345,968 | 9.2% |
| 非 cache input | 22 | 0.0% | 219,295 | 5.8% |
| Output | 4,136 | 0.6% | 18,946 | 0.5% |
| 合计 | 653,289 | 100% | 3,773,640 | 100% |

### 4.3 导出侧结果

| 指标 | 数值 |
|---|---|
| 对照组写入轮数 | 247（首次回填过去 24 小时） |
| 实验组抽样写入轮数 | 22:38 写 3 轮；22:47 写 4 轮；22:53 写 6 轮；均无 failures |
| 评测时点 Langfuse 中 `Grok Bot Turn` trace 数 | 304 |
| 脚本耗时（20:38 基准） | stage 约 0.254 秒（60 bots / 17161 rows）；dry-run export 约 0.561 秒 |

### 4.4 日折算

按稳态单次约 31 万 token 折算：

| 日程 | 每日唤醒次数 | 每日 token |
|---|---|---|
| 每小时 | 24 | 约 750 万 |
| 每 10 分钟 | 144 | 约 4500 万 |
| 倍数 | 6× | 约 6× |

### 4.5 额度状态（实验时点）

Cursor Usage 页面 Spending：Grok Bot weekly usage 已用 40%，10-26 重置；on-demand 关闭。

## 5. 分析

**成本主要是固定的唤醒开销。** 实验组 84.5% 的 token 为 cache read，即每次唤醒重新读取的系统提示、技能与工具定义等上下文；output 仅占 0.5%。导出脚本本身在 1 秒内完成，每次写入的新轮数仅 3 至 6 轮。单次成本因此主要由「醒来一次」决定，与本次需导出的数据量关系较弱。

**频率与成本近似线性。** 由于单次成本基本固定，唤醒次数提高 6 倍，token 消耗也近似提高 6 倍。按 4.4 折算，每 10 分钟方案每天多消耗约 3750 万 token，在周额度池中占用明显。

**时效收益有限。** 由于 cursor 去重与稳定 traceId，两种频率一天内写入 Langfuse 的净轮数应接近，差别只在延迟：最大延迟从约 60 分钟降到约 10 分钟。本 routine 的用途是事后观测与统计会话，不依赖近实时数据，该延迟改善价值有限。

## 6. 局限与效度威胁

1. **样本小**：实验组仅 2 小时、约 12 次唤醒，10 分钟桶间波动达约 2 倍（23 万至 44 万），单次均值存在误差。
2. **基线不具代表性**：对照组仅 1 次，且含 247 轮首次回填，单次 token 偏大，因此日折算统一采用实验组的稳态单次成本，而非对照组数值。
3. **唤醒识别为推断**：唤醒次数依据 CSV 短爆发识别，cron 槽位 13 个而识别约 12 次，未能逐次核对运行记录。
4. **同时段其它活动**：`grok-bot-default` 与 `grok-bot-cua` 同期用量远大于本 routine，虽按模型标签排除，但若存在标签归属差异会影响结果。
5. **网页表格显示限制**：Usage 网页只能按整天 UTC 筛选、无模型筛选，精确数字只能依赖 Export CSV。
6. **token 与额度换算未公开**：Cursor 未公开 token 与周额度百分比之间的换算规则，cache read 是否按折扣计费也不可知，因此本报告以 token 比较，无法给出精确的额度百分比代价。

## 7. 结论与建议

**建议**：保留每小时运行，`CRON_TZ=Asia/Shanghai 0 * * * *`，flexible，early / late 各 15 分钟。

**重新评估的触发条件**：

- 出现需要近实时（延迟不超过 10 分钟）查看会话数据的场景；
- Cursor 额度规则变化，例如 cache read 免计或周额度显著放宽；
- 单次唤醒成本显著下降，例如 routine 上下文大幅精简。

**可选优化方向**：在 routine 开头检查 `search-index.db` 是否有 cursor 之后的新消息，无新消息时立即结束，以降低空跑唤醒的单次成本。该优化对两种频率都有效，并可能缩小二者的成本差距。

## 附录

### A. 原始数据来源

| 来源 | 说明 |
|---|---|
| `usage-events-2026-10-24.csv` | cursor.com/dashboard/usage 导出，2921 行；时间戳为 UTC。仅存于 box，不提交仓库 |
| automation_status | 最后一次运行 22:53:24 CST，succeeded |
| `/home/box/agent-data/langfuse/grokbot-export-cursors.json` | `last_run_at` 2026-10-24T14:53:47.323Z（22:53:47 CST）；`last_summary`：bots_seen 50，turns_written 6，turns_skipped_cursor 2556 |
| `/tmp/lf-summary.json`、`/tmp/lf-export.json` | 22:38 与 22:47 的 export stdout |
| `/tmp/stage-bench.log`、`/tmp/export-bench.log` | 20:38 脚本耗时基准 |
| Langfuse v2 observations API | 统计 `Grok Bot Turn` trace 数 |

### B. 计算方法

1. 解析 CSV 的 `Date` 列为 UTC 时间，筛选 `Model = grok-bot-automation`。
2. 实验组取 `12:50 ≤ Date < 14:50`（UTC）的行；对照组取 `12:09 ≤ Date < 12:11`（UTC）的行，对应 20:09:52 至 20:10:44 CST 的连续 10 行。
3. 对各组分别求五个 token 列之和；占比 = 分项 ÷ `Total Tokens` 之和。
4. 10 分钟桶：按 UTC 分钟向下取整到 10 分钟分组求和。
5. 单次唤醒 token = 实验组总 token ÷ 识别出的唤醒次数（12）。
6. 日折算 = 单次唤醒 token（约 31 万）× 每日唤醒次数（24 或 144）。
