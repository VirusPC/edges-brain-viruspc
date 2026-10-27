# 2026-10-26 日复盘

## 范围

时间窗：2026-10-25 05:18 至 2026-10-26 05:18（Asia/Shanghai）；日历日取回看结束日 2026-10-26。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-10-26/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- 探过 66 个助手（名单见该目录 `_agents.tsv`）；窗口内有活动并落盘 11 个：Grok Bot、IT资产管理、通用、全栈开发专家、通用-辅助、Codex→Langfuse、mini-gtr-ubuntu设备助手、Coding Agent 专家、周复盘、日复盘、4070ts-win设备助手。
- 窗口内无活动或最新消息在窗外：其余约 55 个；未造空 jsonl。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；业务正文写 composed 子仓，不写工作区根。
- 局限：
  - 本 routine 自动化**未挂载 ReadTranscript**；按 2026-10-24 langfuse 旁路笔记约定，改用 box `search-index.db`（`/home/box/agent-data/search-index.db`）的 `messages` 表落盘。内容与 transcript 同源索引，但非完整会话 API 导出。
  - 落盘为分析级消息 jsonl（时间序 + role + text）；工具大字段可能截断。
  - 本执行器用独立 worktree + `gh` 开到 main（与近几日日复盘相同兜底）；未自动合并。
- 去重依据：
  - 昨日日复盘 [#377](https://github.com/VirusPC/edges-brain-viruspc/pull/377) 已合 main；本篇不重投其记忆/任务。
  - 窗口内框架已合：edges ~#30–#52（含 evaluation webhook、edges.env、grilling 删除、skills 迁移、0.2.6/0.2.7、structured-output 笔记 #43、changelog 用户视角反馈 #42、按模块拆 skill #48、routines #49 等）。
  - 窗口内脑仓已合：#377–#384（含 Rokid #383、routines 迁 `.edges/routines/` #384、周复盘入口 #370）。
  - 工作区 compose 指针 bump #3–#9；不在本仓重复。
  - 看板既有卡：OpenCode/Pi tags 缺口、Langfuse 旁路、evaluation Dataset/Skill 卡等——不重复另开同题卡。

## 实际怎样

- **Evaluation / Langfuse skills（全栈 / Grok Bot / Coding Agent）**：grill 后把「Dataset Skill」纠正为「迁移 Langfuse 接入 Agent 的 skills」；落地合入 edges #45、brain #382。助手明确说看板状态未改、标 done 需再拍板——**窗口内未落验收卡**（本篇补）。
- **grilling 删除**：跨机删除与文档清理已合框架 PR；不重开。
- **Routines**：定义迁到 `.edges/routines/`（#384）；日复盘/周复盘入口约定已合，不重写。
- **Rokid 眼镜 webhook routine（Grok Bot）**：运维级接通；含鉴权 URL/token，不进公开仓笔记。
- **Langfuse 数据耐久（IT）**：用户问停机是否丢数据 → 确认 named volume 停机不丢，`down -v`/擦盘会丢；查数走 API 不直连库。此前无对应 project 记忆（本篇补）。
- **周复盘 #370**：窗口内已 MERGED；昨日收口卡仍在 backlog（本篇标 done）。
- **changelog 用户视角反馈 / structured-output / 拆 skill**：对应框架 PR 已合；不重投脑仓。
- **设备助手**：mini-gtr / 4070ts 有少量运维对话，无可落库新约定。

## 决定

- Langfuse 持久数据：named volume 前提下正常停机/重启可保留；备份到盘外另开卡，本条不假设已有备份。
- 业务读数：优先 Langfuse UI / Public API / SDK，不默认直连 Postgres/ClickHouse。
- evaluation Skill 子卡：代码已合，状态未改 → 需显式验收后标 done，并决定母卡。

## 卡住了什么

- evaluation「迁移 Langfuse Agent skills」卡仍在框架 `evaluation/backlog/`（标题已改目录名未改）；完成标准验收与母卡收口未做。
- OpenCode/Pi Langfuse tags、Langfuse 旁路卡等既有 backlog：本窗无新完成标准共识，不代写。

## 下次做什么

- 审本 PR：1 条 project 记忆、1 张新 backlog 卡、#370 收口卡 → done、本篇日复盘。
- 推进「验收并标 done：evaluation 迁移 Langfuse Agent skills」→ 框架看板改状态 + 母卡决定。
- 既有 OpenCode/Pi tags、旁路卡：有新共识再 grill，勿重复开卡。

## 上次遗留项跟进

- **#370 收口卡**：目标已达成（#370 MERGED），本篇标 done。
- **昨日记忆（脏数据保留、Tailscale 静默丢失）**：已在 #377，不重投。
- **OpenCode/Pi tags 卡**：仍 backlog，本窗无新谈清。
- **routines Project 分组等旧卡**：非本窗新共识。

## 注意事项

- 无 ReadTranscript：范围已写；落盘路径永久保留在 box。
- 公开仓不写未公开 IP、鉴权链接、凭据、私人生活；Rokid webhook URL/token 不入库。
- `posts/` 由人维护，不自动写。
- 私人内容：0 条；未开 edges-brain-viruspc-private PR。

## 建议补充内容清单

- 记忆（project）：Langfuse 数据在 named volume，停机不丢；`down -v`/擦盘才会丢；查数走 API。来自 IT资产管理 2026-10-25 停机是否丢数据与后续「企业侧不直连库」确认。写入：`.edges/memory/projects/project_langfuse_data_named_volumes_survive_restart/INDEX.md`。
- 任务（backlog）：验收并标 done：evaluation 迁移 Langfuse Agent skills 卡（并决定母卡）。来自全栈/Grok Bot：#45/#382 已合但看板未改、助手说需再拍板却未开卡。写入：`.edges/tasks/_default/backlog/2026-10-26--验收并标-doneevaluation-迁移-Langfuse-Agent-skills-卡/INDEX.md`。
- 任务（done）：收口周复盘 PR #370 文案后合入 → 标 done。来自窗口内 #370 已 MERGED。写入：`.edges/tasks/_default/done/2026-10-25--收口周复盘-PR-370统一-READMEskill-文案后合入/INDEX.md`。
- 不做：evaluation / Langfuse webhook、edges.env、grilling 删除、skills 迁移、0.2.6/0.2.7、structured-output 笔记、changelog 反馈、按模块拆 skill、routines #384、Rokid 公开笔记——窗口内已合或含秘密，不重投。
- 不做：昨日 #377 已落记忆/任务——不重复。
- 不做：OpenCode/Pi tags、Langfuse 旁路——已有卡；本窗无新完成标准。
- 不做：Langfuse 盘外备份卡——对话未谈清目标/完成标准，写了会编造。
- 不做：Rokid webhook 实现细节/鉴权 URL——脱敏；非 AGENTS.md 级公开约定。
- 不做：QQ 飞车等私人话题——若有仅进 private；本窗未形成可落库私人正文。
- 不做：`posts/`——由人维护。
- 私人内容：0 条；未开 edges-brain-viruspc-private PR。
