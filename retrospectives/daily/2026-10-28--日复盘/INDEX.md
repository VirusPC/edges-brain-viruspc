# 2026-10-28 日复盘

## 范围

时间窗：2026-10-27 05:17 至 2026-10-28 05:21（Asia/Shanghai）；日历日取回看结束日 2026-10-28。本篇为补跑（原 05:21 例程因路径 404 错过）。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-10-28/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- 探过助手名单见该目录 `_agents.tsv`；窗口内有活动并落盘 10 个：全栈开发专家（552）、Grok Bot（80）、IT资产管理（66）、mini-gtr-ubuntu设备助手（24）、任务记录员（23）、Coding Agent 专家（21）、4070ts-win设备助手（8）、日复盘（5）、记录员（4）、周复盘（1）。
- 入口：Compose/工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；业务正文写顶层内容子模块，不写工作区根。
- Langfuse 补扫（本机 `langfuse-observations.jsonl`，不入库）：`GET /api/public/v2/observations`（fields=`core,basic,io,metadata,trace_context`）；窗口对齐本篇范围（fromStartTime=`2026-10-26T21:17:00Z`，toStartTime=`2026-10-27T21:21:00Z`）。根 turn **322** 条——`Grok Bot Turn` 273、`Cursor Turn` 31、`Codex Turn`/`Codex Subagent Turn` 8、`codex-cloud-ws:*` 2、`Execute evaluator: user_disagreement_llm` 8；环境 `grok-bot` / `cursor-cloud` / `codex-local` / `codex-cloud` / `langfuse-llm-as-a-judge`。与 ReadTranscript 去重后**无相对本 PR 的新公开候选**（私人 0）。
- 局限：
  - 主源仍为 cursor `ReadTranscript`（十个活跃助手均已探测；大页经 `write_to_file`）；窗口裁切与正序 jsonl 另用 search-index.db 对齐时间戳（旁路仅作索引/草稿，永久落盘为 SI 形 `_ts`/`role`/`text` jsonl，与既有日复盘格式一致）。未把原始 transcript / Langfuse io 入库。
  - Langfuse：events_only v4.38.0 只拉 observations；部分 `Cursor Turn` 无 user/io；部分 `Grok Bot Turn` 时间精度到分钟；evaluator 根 span 不作会话候选。
- 去重依据：
  - 已合（本窗内大量落地，不重复沉淀正文）：edges [#67](https://github.com/VirusPC/edges/pull/67)/[#71](https://github.com/VirusPC/edges/pull/71)/[#72](https://github.com/VirusPC/edges/pull/72)/[#73](https://github.com/VirusPC/edges/pull/73)/[#75](https://github.com/VirusPC/edges/pull/75)/[#76](https://github.com/VirusPC/edges/pull/76)/[#77](https://github.com/VirusPC/edges/pull/77)/[#79](https://github.com/VirusPC/edges/pull/79)/[#80](https://github.com/VirusPC/edges/pull/80)/[#81](https://github.com/VirusPC/edges/pull/81)；brain [#391](https://github.com/VirusPC/edges-brain-viruspc/pull/391)/[#395](https://github.com/VirusPC/edges-brain-viruspc/pull/395)/[#396](https://github.com/VirusPC/edges-brain-viruspc/pull/396)/[#397](https://github.com/VirusPC/edges-brain-viruspc/pull/397)/[#398](https://github.com/VirusPC/edges-brain-viruspc/pull/398)/[#399](https://github.com/VirusPC/edges-brain-viruspc/pull/399)/[#400](https://github.com/VirusPC/edges-brain-viruspc/pull/400)；workspace [#12](https://github.com/VirusPC/edges-workspace-viruspc/pull/12)/[#13](https://github.com/VirusPC/edges-workspace-viruspc/pull/13)/[#14](https://github.com/VirusPC/edges-workspace-viruspc/pull/14)/[#15](https://github.com/VirusPC/edges-workspace-viruspc/pull/15)/[#16](https://github.com/VirusPC/edges-workspace-viruspc/pull/16)；edges 任务卡 [#68](https://github.com/VirusPC/edges/pull/68)/[#69](https://github.com/VirusPC/edges/pull/69)/[#78](https://github.com/VirusPC/edges/pull/78)。
  - agents/teams（channels）模块：edges [#69](https://github.com/VirusPC/edges/pull/69) 已落卡，不另开。
  - Langfuse 独有 Codex 本地「对外推广」会话：主卡+子卡与 `project_edges_promotion_intent` 已由 edges [#71](https://github.com/VirusPC/edges/pull/71) 合入，不重复。
  - 前一日日复盘重放 [#395](https://github.com/VirusPC/edges-brain-viruspc/pull/395)/[#396](https://github.com/VirusPC/edges-brain-viruspc/pull/396) 已合；本篇另开 **2026-10-28**。

## 实际怎样

- **.harness → .edges 硬切（全栈 / 任务记录员 / 设备助手）**：框架 [#67](https://github.com/VirusPC/edges/pull/67)（0.3.0）、公开脑 [#391](https://github.com/VirusPC/edges-brain-viruspc/pull/391)、私密脑 private#6、workspace 直推迁移；各机对齐 CLI 0.3.0 与子模块 tip；旧 annotated skill tag 改挂 squash。
- **废止 shared-extensions；通用 skill → 脑仓根 `skills/managed/`**：brain [#397](https://github.com/VirusPC/edges-brain-viruspc/pull/397)/[#398](https://github.com/VirusPC/edges-brain-viruspc/pull/398)；框架 ADR 0048 与 [#72](https://github.com/VirusPC/edges/pull/72)/[#73](https://github.com/VirusPC/edges/pull/73)/[#75](https://github.com/VirusPC/edges/pull/75)（使用方仓布局自定、脑仓当可 Compose 的共享 `.edges`）。
- **edges-\* 硬切断 + 发版 0.4.0**：[#76](https://github.com/VirusPC/edges/pull/76)/[#77](https://github.com/VirusPC/edges/pull/77)、brain [#400](https://github.com/VirusPC/edges-brain-viruspc/pull/400)、workspace [#12](https://github.com/VirusPC/edges-workspace-viruspc/pull/12)/[#13](https://github.com/VirusPC/edges-workspace-viruspc/pull/13)；补 done 卡 [#78](https://github.com/VirusPC/edges/pull/78)。
- **随包 skill 收敛为总入口 `edges`（否掉一模块一 skill）**：grill → html-plan → [#80](https://github.com/VirusPC/edges/pull/80) → 0.4.1 [#81](https://github.com/VirusPC/edges/pull/81)；workspace [#15](https://github.com/VirusPC/edges-workspace-viruspc/pull/15)/[#16](https://github.com/VirusPC/edges-workspace-viruspc/pull/16)。用户纠正：合并须经其审；grill 前先 memory ask；老是不用 html-plan。
- **其它**：knowledge 误放笔记迁出框架 [#74](https://github.com/VirusPC/edges/pull/74)/brain [#399](https://github.com/VirusPC/edges-brain-viruspc/pull/399)；agents/teams 卡 [#69](https://github.com/VirusPC/edges/pull/69)；minigtr 接 APC UPS（含 SN，台账侧）；Cloudflare Tunnel 证书升级通知；用户提出框架 README 改 `npx skills` 安装主路径——云端代理已开又取消，**窗口内未落卡**。
- **Langfuse 补扫核对**：Codex 本地谈清推广准备（实验 / Skills / 场景文章 → 主任务+子任务）仅见于 Langfuse，ReadTranscript 未覆盖；已由框架 [#71](https://github.com/VirusPC/edges/pull/71) 落卡并合入，本篇不新开。其余 Langfuse 会话与 RT/#401 已列候选重合或为一过性运维/未完成工作讨论。

## 决定

- 材料目录名 `.edges`；标记与随包 skill 只认 `edges-*`。
- 不绑定 Edges 的通用 skill 放使用方内容仓（脑仓根 `skills/managed/`）；脑仓按可 Compose 的共享 `.edges` 理解。
- 随包 skill：**默认一个总入口 `edges`，特殊才拆**；否决「一模块一 skill」。
- 合 PR 须用户审；grill 工作流：memory ask → grill → html-plan → 再改代码。

## 卡住了什么

- 框架 README 新人安装改 `npx skills`：窗口内谈过、代理取消后未落卡。审 #401 时用户否掉补开的跟踪卡——让 AI 安装 skill 即可，不把框架 README 改成以 `npx skills` 为主路径这件事单独跟踪，不保留该 backlog。
- 「规范 skill」专卡：看板无同名卡；意图已被总入口收敛取代，不另开。推广主卡下旧子卡「按模块拆 skill（一模块一个）」仍 backlog，与「默认一个 edges 总入口」决定冲突——本篇仍不另开取消卡（与上条一致；看板清理可随审 #401 / 框架仓另议）。
- minigtr UPS：已识别型号，正式 inventory 登记不在公开脑。
- Langfuse 补扫：相对本 PR **无新漏记公开候选**；私人内容仍 0。

## 下次做什么

- 审本 PR：三条 project 记忆、本篇日复盘。README/`npx skills` 跟踪卡已按审阅删除，不在待合内容里。
- 继续遵守：开 PR 不自动合；grill 前 ask、动手前 plan。

## 建议补充内容清单

- 记忆（project）：随包 skill 默认一个 edges 总入口，特殊才拆。来自全栈 2026-10-27 grill / [#80](https://github.com/VirusPC/edges/pull/80)。写入：`.edges/memory/projects/project_edges_skill_default_one_entry/INDEX.md`。
- 记忆（project）：合 PR 须经用户审，Agent 不自行 merge。来自全栈 2026-10-27「每次合并怎么都不让我审了」。写入：`.edges/memory/projects/project_pr_merge_needs_user_review/INDEX.md`。
- 记忆（project）：grill 前先 memory ask，动手前先 html-plan。来自全栈 2026-10-27 连续纠正。写入：`.edges/memory/projects/project_grill_memory_ask_then_html_plan/INDEX.md`。
- 不做：框架 README 新人安装改为 npx skills 的 backlog。审 #401 时用户否掉：让 AI 安装 skill 即可，不单独跟踪、也不改框架 README 主路径。原目录 `.edges/tasks/_default/backlog/2026-10-28--框架-README-新人安装改为-npx-skills/` 已删。
- 不做：.harness→.edges / shared-extensions / edges-\* 硬切 / 0.4.x 发版 / workspace pin——对应 PR 已合。
- 不做：agents/teams 模块——edges [#69](https://github.com/VirusPC/edges/pull/69) 已开卡。
- 不做：「规范 skill」新卡——无独立需求正文；被总入口约定取代。
- 不做：edges-migrate-directory-nodes 删除与 user-memory 改名——[#79](https://github.com/VirusPC/edges/pull/79) 已合。
- 不做：html-plan 硬约束正文——edges [#66](https://github.com/VirusPC/edges/pull/66) 已合；本篇只补工作流记忆。
- 不做：Cloudflare Tunnel 证书升级操作流水——一次性运维。
- 不做：各机 submodule / CLI 升级流水——现场操作。
- 不做：UPS 型号与 SN、台账路径——设备台账；公开仓不写 SN；私密脑无现成 inventory 落点，本篇不编造 private 文件（私人内容 0 条，未开 edges-brain-viruspc-private PR）。
- 不做：Langfuse 独有 Codex「对外推广」——edges [#71](https://github.com/VirusPC/edges/pull/71) 与 `project_edges_promotion_intent` 已合；不重复开脑仓卡。
- 不做：Langfuse 中 AirPods 电流音问答——一次性排障。
- 不做：Langfuse codex-cloud 小红书/团队知识整合讨论——未完成（浏览器不可用），属工作向；本篇不编造 private 笔记（私人内容仍 0，未开 edges-brain-viruspc-private PR）。
- 不做：`posts/`——由人维护。
