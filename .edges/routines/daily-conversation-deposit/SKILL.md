---
name: daily-conversation-deposit
description: >-
  每日沉淀扫描（日复盘）。回顾过去 24 小时各 Grok Bot 助手的对话，并必读同一窗口的 Langfuse
  observations；把沉淀候选直接落成文件并开 PR 到 main；当日复盘写入
  retrospectives/daily。审阅在 PR 上，不自动合并。
---

# 每日沉淀扫描（日复盘）

回顾 peng cheng 过去 24 小时（Asia/Shanghai）在所有 Grok Bot 助手里的对话，按 VirusPC/edges-brain-viruspc 根 AGENTS.md 判断哪些该沉淀、落到哪里（笔记、任务、记忆、feedback，以及它定义的其它类型）。个人内容去 VirusPC/edges-brain-viruspc-private。同一窗口的 Langfuse 是必读第二源：把该窗口里已上报的 turn 一并落盘（含 Grok Bot、Cursor、Codex，以及窗口里实际出现的其它 turn），再与 ReadTranscript 去重。

入口是 Compose 工作区根 `VirusPC/edges-workspace-viruspc`（`.edges/compose/` 下挂着公开脑和私密脑）：先读它的根 `AGENTS.md`，再按公开脑根 AGENTS.md 判断去向。候选和当日复盘的 PR 开在挂进来的子仓（公开脑或私密脑），不写进工作区根。（2026-10-21 用户确认，通用约定见公开脑 `.edges/memory/projects/project_workspace_is_deposit_entry/`。）

何时跑见同目录 [INDEX.md](INDEX.md)。本文件不写日程。

## 步骤

### 1. 先抓取落盘

同一过去 24 小时窗口（Asia/Shanghai）抓两路，都写到 `/workspace/daily-scan/YYYY-MM-DD/`（日期与当日复盘相同：回看结束时刻所在的日历日）。落盘永久保留：不删除、不覆盖、不清理往期目录。同一天重跑时，已有文件不动，另存为带序号的新文件。

**ReadTranscript（主源）**

用 ReadTranscript，逐个传 agent_id 读每个助手（含自己），从最新往前翻页（before），翻到超出 24 小时窗口为止（记录无显式时间时，结合消息里的日期、PR 时间、记忆日期判断）。把每个助手窗口内的原始记录写到 `/workspace/daily-scan/YYYY-MM-DD/<助手名>.jsonl`，并按时间正序排好。

**Langfuse（必读第二源）**

每次日复盘都拉同一窗口的 Langfuse，和 ReadTranscript 一起落盘后再做离线分析。已核对的自建实例是 Langfuse v4.38.0、events_only。不要调用 `GET /api/public/traces`、`GET /api/public/observations/:id`、`GET /api/public/sessions`（这些在该模式返回 404）。只用 `GET /api/public/v2/observations`。

- 凭据与地址只读环境变量：`LANGFUSE_PUBLIC_KEY`、`LANGFUSE_SECRET_KEY`，以及 `LANGFUSE_BASE_URL`（未设则用 `LANGFUSE_HOST`）。HTTP Basic，用户名是公钥，密码是私钥。去掉 base URL 末尾斜杠再接路径。公钥、私钥有缺，或两个地址变量都没有：不要编 URL，也不要换别的读数路径；按下面的失败条款记缺口后继续。
- 每次请求都带本窗口的 `fromStartTime` 与 `toStartTime`（同一 Asia/Shanghai 过去 24 小时，写成 ISO-8601）。
- 字段组必须是 `fields=core,basic,io,metadata,trace_context`。I/O 组名是 `io`，不是 `input` 或 `output`。不带 `io` 时 input/output 不会出现。不要传 `parseIoAsJson=true`（会 400）；input/output 是原始字符串，分析时再解析。
- 要根 / turn 级行，不要子 span。先按 `isRootObservation=true` 把窗口拉完。已知 turn 名包括 `Grok Bot Turn`、`Cursor Turn`，以及窗口里实际出现的 Codex / 云端 turn 名（例如 `Codex Turn`）。`name` 是精确匹配、一次一个；某个 turn 名没有标成根时，再按该 `name` 补拉，同样带时间边界。同一 observation `id` 只留一行。列表接口不能按 tags 过滤，设备信息在拉回的 metadata / `trace_context` 里看。
- 分页：响应里的 `meta.cursor` 有值时，原样作为下一次请求的 `cursor`，直到没有下一页。可以用较大的 `limit`（上限 1000）。不要只留第一页。
- 按 `startTime` 升序写成 `/workspace/daily-scan/YYYY-MM-DD/langfuse-observations.jsonl`（一行一条）。环境很多、单文件难读时，可以改成按 environment 拆开的 `langfuse-observations-<environment>.jsonl`，仍然升序。同一天重跑不覆盖：已有同名文件时写成 `langfuse-observations.2.jsonl`（按 environment 拆开时，给对应文件加同样的序号）。
- 原始 Langfuse payload 只留在这台机器的 daily-scan 目录，不进任何 git 仓库。
- Cursor / Codex 云端有的行没有 I/O。这些行仍写入落盘，保留 metadata 与 sessionId，供「范围」写覆盖。没有足够可核对的正文（user/assistant 文本，或等价的已落内容）就不做沉淀候选，也不凭 metadata 编文件。
- 环境变量缺失，或这次请求失败（网络错误、非 2xx、翻页中断）：在当日 `retrospectives/daily/YYYY-MM-DD--日复盘/INDEX.md` 的「范围」写明缺口（缺的是哪一类配置，或失败现象；不写凭据、主机名、IP、原始 payload）。然后只靠已经落盘的 ReadTranscript 继续步骤 2。不要因为 Langfuse 失败中止整次日复盘，也不要改去调用上面列出的旧接口。

### 2. 再离线分析

只基于落盘文件，按时间从前往后读，判断沉淀候选。当天目录里的 transcript jsonl 和 Langfuse jsonl 都要读。共享记忆和 GitHub 合入记录只用来交叉核对、去重（已经合入或已经落过文件的跳过）。同一轮对话可能同时出现在 ReadTranscript 和 Langfuse 里：时间窗重叠且 user/assistant 正文对得上，或 session / trace / 消息标识对得上，就视为同一条，只沉淀一次。

每条候选在内部记下来源（哪个助手的 jsonl，或哪份 Langfuse 落盘）、内容、依据根 AGENTS.md 的去向，以及准备写入的路径。能从落盘对话里有依据写成文件的，进入步骤 3 直接落盘。必填不足、写了就会编造的，不写文件，稍后在清单里写不做原因。Langfuse 行若只有 metadata / sessionId、没有可核对正文，同样不写文件，只在「范围」记覆盖。这一步不在对话里提问，也不征求确认。没有新候选也继续步骤 3，日复盘仍要入库。

### 3. 直接落文件并开 PR

分析出的候选直接写成文件，和当日复盘一起开到 main 的 PR。审阅放在 PR 上。保持 PR 开放，等人合并，不自动合并。对话里不先征求确认。

当日复盘：

`retrospectives/daily/YYYY-MM-DD--日复盘/INDEX.md`

日期取回看结束时刻所在的日历日（Asia/Shanghai）。同一日只保留一篇，补记改原来的 `INDEX.md`。章节按 [日复盘 README](../../../retrospectives/daily/README.md)：一级标题 `# <YYYY-MM-DD> 日复盘`，必写二级标题「范围」和「建议补充内容清单」。扫描局限、落盘目录、读到的助手和读不到的助手、Langfuse 是否拉到（失败则写缺口）写进「范围」。

「建议补充内容清单」列出本次 PR 里落了哪些候选。每条一句话，写上建议去处，以及本次 PR 中的写入路径。没有新候选就写明没有。没有落成文件的写不做原因（例如 `posts/` 由人维护，不自动写入；背景或目标在对话里不足，写了就会编造）。

去向以根 AGENTS.md 为准。落盘用仓库已有技能和 CLI，保证格式和索引登记正确：笔记用 `edges notes`，看板任务用 `edges tasks`，记忆和 feedback 用 `edges memory remember`。这些命令只改工作区文件。git 发生在 PR 分支上：提交、推送、开到 main 的 PR。看板任务也走这条 PR，任务文件和当日 `INDEX.md` 放在一起，不直接 push `main`。

按仓库归属分 PR：

- VirusPC/edges-brain-viruspc 的公开内容，与当日 `INDEX.md` 同一个 PR，开到 main。
- edges-brain-viruspc-private 的个人内容，在 edges-brain-viruspc-private 另开一个到 main 的 PR，不并进公开仓。公开仓的清单只写「有 N 条私人内容已在 edges-brain-viruspc-private 开 PR」，并附该 PR 链接，不写私人正文。拿不到 edges-brain-viruspc-private 时，公开清单写明未落成及原因，私人正文仍不写入公开仓。

同一日补记：已落过的候选不重复写。新的公开候选并进尚未合并的当日 PR；该 PR 已经合并则另开一个到 main 的 PR。edges-brain-viruspc-private 同样处理。两个仓都不自动合并。

开 PR：用 Cursor 云端 Agent 开到 main 的 PR。Commit 带一行 `Co-authored-by: 日复盘 <grok-bot@users.noreply.github.com>`。

公开仓按根 README 的「隐私与脱敏」再写：不写个人身份细节、未公开 IP、鉴权链接、凭据、私人生活细节。凭据、鉴权链接、未公开 IP 在 edges-brain-viruspc-private 同样不写。原始 transcript 与 Langfuse 原始 payload 不进任何仓库，只留在 `/workspace/daily-scan/`。

### 4. 只回链接

对话里只告诉用户 PR 链接。公开仓一条；有 edges-brain-viruspc-private 的 PR 再加一条。不把候选清单贴出来征求确认。

## 成功标准

- 窗口内每个读到的助手都有一份按时间正序的 jsonl，落在 `/workspace/daily-scan/YYYY-MM-DD/`。同一窗口的 Langfuse 根 / turn 级 observations 也落成按 `startTime` 升序的 jsonl（`langfuse-observations.jsonl`，或按 environment 拆分）。Langfuse 没配上或拉取失败时，「范围」写了缺口，transcript 落盘仍在，整次运行没有因此中止。往期目录仍在。同一天重跑没有覆盖已有文件。
- 候选来自当天已落盘的 transcript jsonl 与 Langfuse 离线文件。Langfuse 未落盘时，候选只来自 transcript，且「范围」已写缺口。同一轮只沉淀一次。共享记忆和已合入记录只用于核对和去重。没有足够正文的 Langfuse 行只用于覆盖说明。
- 能落盘的候选已按根 AGENTS.md 写成文件，并放进对应仓库开到 main 的 PR。看板任务在该 PR 里，没有直接 push `main`。对话里没有先征求确认。
- 当日 `INDEX.md` 的「建议补充内容清单」列出本次 PR 里落了哪些候选及其路径。没有就写明没有。私人内容在公开清单里只留条数和 edges-brain-viruspc-private 的 PR 链接。
- PR 开到 main，没有自动合并。commit 带 `Co-authored-by: 日复盘 <grok-bot@users.noreply.github.com>`。仓库里没有原始对话，也没有需要脱敏的内容。
- 给用户的回复只有 PR 链接。
