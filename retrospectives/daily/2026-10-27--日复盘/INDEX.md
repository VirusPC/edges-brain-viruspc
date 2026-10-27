# 2026-10-27 日复盘

## 范围

时间窗：2026-10-26 05:17:54 至 2026-10-27 05:17:54（Asia/Shanghai）；日历日取回看结束日 2026-10-27。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-10-27/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- 探过约 66 个助手（名单见该目录 `_agents.tsv`）；窗口内有活动并落盘 5 个：Grok Bot（156）、IT资产管理（81）、周复盘（32）、日复盘（16）、通用（12）。
- 窗口内无活动或最新消息在窗外：其余约 61 个；未造空 jsonl。
- 入口：Compose/工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；业务正文写 composed 顶层子模块，不写工作区根。
- 局限：
  - `ReadTranscript` 未挂载；落盘来自 search-index.db 摘要（保留 `_ts` / role / text）；工具结果大字段可能截断。
  - 前一日日复盘 PR [#385](https://github.com/VirusPC/edges-brain-viruspc/pull/385) 仍 OPEN；本篇另开 **2026-10-27** 日，不改正 #385。
- 去重依据：
  - 已合：workspace [#10](https://github.com/VirusPC/edges-workspace-viruspc/pull/10)（三仓顶层 submodule）；brain [#386](https://github.com/VirusPC/edges-brain-viruspc/pull/386) 周复盘、[#387](https://github.com/VirusPC/edges-brain-viruspc/pull/387)/[#388](https://github.com/VirusPC/edges-brain-viruspc/pull/388) E2B 调研/部署/Tunnel；edges [#53](https://github.com/VirusPC/edges/pull/53) Compose 卸载卡、[#62](https://github.com/VirusPC/edges/pull/62) 等文档。
  - 仍开着、不重复另开同题：[#385](https://github.com/VirusPC/edges-brain-viruspc/pull/385)（10-26 日复盘）；edges [#63](https://github.com/VirusPC/edges/pull/63)（Langfuse skills 验收，日复盘侧已验完待审）。
  - 既有 E2B / ablation smoke / Langfuse 安装笔记不重写正文；本篇只沉淀未入库判断轴与漏记任务。

## 实际怎样

- **Workspace 卸 Compose（Grok Bot）**：三仓从 `.edges/compose/` 改为顶层 git submodule；补根 README/SVG 后按用户要求精简细则、改指子仓 README；[#10](https://github.com/VirusPC/edges-workspace-viruspc/pull/10) 已合。各在线机迁移；minigtr 经 Tailscale 新 clone + CLI 0.2.7。发现 `edges compose` 无卸载命令 → 框架仓卡 [#53](https://github.com/VirusPC/edges/pull/53) 已合入看板。
- **E2B Embed（IT资产管理）**：minigtr 自部署（改端口避开 Langfuse）、开机自启、台账登记；Cloudflare Tunnel 三域名公网接入。笔记 [#387](https://github.com/VirusPC/edges-brain-viruspc/pull/387)/[#388](https://github.com/VirusPC/edges-brain-viruspc/pull/388) 已合。用户明确 Pi 沙箱≠文件系统隔离。
- **周复盘**：[#386](https://github.com/VirusPC/edges-brain-viruspc/pull/386) 开出后已合。评测闭环讨论（采数→Dataset、主证据评测、云沙箱）对照看板，未新开重复卡。
- **日复盘侧**：用户催做完 #385 里 evaluation 验收卡 → 五项完成标准通过，edges [#63](https://github.com/VirusPC/edges/pull/63) 开出待审（子卡/母卡标 done）。
- **Langfuse 数据模型（Grok Bot）**：Session→Trace→Observation；Observation≈span；tags / metadata / attributes 选用规则谈清。
- **消融与 Dataset（Grok Bot，深夜）**：确认 10-25 报告是 smoke；正式版要真实 harness。Dataset 需 v1.1 对齐 + 线上扩库；用户叫停云端改库，要求起 task 再 grill，随后转 `/html-plan`，**任务卡窗口内未落库**（本篇补开）。
- **通用**：AI 硬件采购建议；Plaud NotePro / Rokid 台账核对（IT 台账，不进本仓）。

## 决定

- 工作区三内容仓：顶层 git submodule，不再走 Compose 挂载；workspace 根少写细则。
- minigtr 公网 HTTP：优先 Cloudflare Tunnel，不优先 nginx 扛公网。
- Pi 沙箱不能当 FS 隔离；实验隔离用 Docker/worktree/E2B。
- harness-memory-ablation：不日更全量；先 Dataset 对齐与扩库流水线，再正式跑。
- 否决为凑量做合成闲聊题；扩库走线上 trace→人审。

## 卡住了什么

- **#385** 仍开着等用户审。
- **edges#63** 验收 PR 待合。
- harness-memory-ablation 题库 / 扩库：本篇已补 backlog 卡，完成标准待 grill；html-plan 未完成不入库。
- Compose 卸载 CLI：卡在 backlog，实现未做。

## 下次做什么

- 审本 PR：更新后的工作区入口记忆、四条新 project 记忆、一张消融题库卡、本篇日复盘。
- 审合并 #385、edges#63。
- grill 消融题库卡 → 再改 Dataset / 流水线。
- 需要对外「系统能力」报告时，用正式 harness 消融，不要再交 smoke。

## 建议补充内容清单

- 记忆（project，更新）：沉淀入口改为顶层 git submodule 路径，不再写 `.edges/compose/`。来自 Grok Bot 2026-10-26 workspace#10。写入：`.edges/memory/projects/project_workspace_is_deposit_entry/INDEX.md`。
- 记忆（project）：Langfuse 标注字段优先级（专用 → metadata → tags → 裸 attributes）。来自 Grok Bot 2026-10-26 数据模型问答。写入：`.edges/memory/projects/project_langfuse_annotation_fields_priority/INDEX.md`。
- 记忆（project）：harness memory 消融不必日更全量。来自 Grok Bot 2026-10-27「有必要每天都采样跑实验吗」。写入：`.edges/memory/projects/project_harness_memory_ablation_cadence/INDEX.md`。
- 记忆（project）：Pi 沙箱不等于文件系统隔离。来自 IT资产管理 2026-10-26。写入：`.edges/memory/projects/project_pi_sandbox_not_fs_isolation/INDEX.md`。
- 记忆（project）：minigtr 公网入口优先 Cloudflare Tunnel。来自 IT资产管理 2026-10-26。写入：`.edges/memory/projects/project_prefer_cloudflare_tunnel_over_nginx_minigtr/INDEX.md`。
- 任务（backlog，**漏记补开**）：harness-memory-ablation 题库 v1.1 与线上扩库流水线。来自 Grok Bot 2026-10-27「需要起个 task，grill 下」；窗口内草稿未落库。写入：`.edges/tasks/_default/backlog/2026-10-27--harness-memory-ablation-题库-v1.1与线上扩库流水线/INDEX.md`。
- 不做：E2B 调研/部署/Tunnel 笔记——#387/#388 已合。
- 不做：Compose 卸载能力卡——edges#53 已合入看板。
- 不做：workspace#10 正文——已合；本篇只修正入口记忆路径。
- 不做：周复盘 #386——已合。
- 不做：evaluation Langfuse skills 验收——edges#63 已开；完成标准窗口内已验，不重复开脑仓卡。
- 不做：评测闭环三块新卡——evaluation 看板已有对应 backlog；周复盘只是对照缺口。
- 不做：html-plan 计划页——对话中断，无定稿可入库。
- 不做：Plaud/Rokid 型号 SN、台账路径——设备台账；公开仓不写可能 SN。
- 不做：AI 硬件购物建议——一次性问答。
- 不做：Langfuse 删 Trace 操作步骤——一次性运维问答；无新稳定项目约定。
- 不做：各机 submodule 指针运维流水——现场操作。
- 不做：`posts/`——由人维护。
- 私人内容：0 条；未开 edges-brain-viruspc-private PR。
