# 2026-11-12 日复盘

## 范围

时间窗：2026-11-11 05:15 → 2026-11-12 05:15（Asia/Shanghai）；日历日取回看结束日 **2026-11-12**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-12/`（按时间正序 jsonl，永久保留，不入库）。

- **主源局限**：本自动化运行没有 `ReadTranscript`。窗口内消息由本机 search-index 导出。
- 窗口内有活动并落盘 **6** 个助手、共 **183** 条：Grok Bot（132）、日复盘（19，自身，不分析）、通用-辅助（18）、Codex→Langfuse（7）、4070ts-win设备助手（4）、IT资产管理（3）。
- **Langfuse 缺口**：本机有公钥、私钥，但 `LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置（缺 BASE_URL/HOST 配置类）。按 Skill 不编 URL、不换旧接口；本窗未拉 Langfuse observations，候选只来自 search-index jsonl。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；PR 开在子仓。Skill commit：`1418e7dca5c42e1963d1173bf0ee37ab0490f92f`（公开脑 main）。
- 去重：窗内已合 brain [#460](https://github.com/VirusPC/edges-brain-viruspc/pull/460)（11-11 日复盘）、[#461](https://github.com/VirusPC/edges-brain-viruspc/pull/461)（ai-news 可视化任务卡）、[#462](https://github.com/VirusPC/edges-brain-viruspc/pull/462)（ai-news 上站）、[#463](https://github.com/VirusPC/edges-brain-viruspc/pull/463)（10 期周报按订阅重跑）、[#464](https://github.com/VirusPC/edges-brain-viruspc/pull/464)（3 张周报待办卡）；private #14 已合。

## 实际怎样

- **Grok Bot**：4070ts 两轮崩溃巡检因本机通道离线均未验证，用户澄清 minigtr 是 Ubuntu、本就不该装 Grok Bot；ai-news 周报上 Astro 站（brain [#462](https://github.com/VirusPC/edges-brain-viruspc/pull/462)，含滚动高亮、删 Archive 页）；10 期旧周报按现行 skill 重跑并合入旧稿可核对条目（[#463](https://github.com/VirusPC/edges-brain-viruspc/pull/463)，已合）；记 3 张待办卡（推文与播客单独成章、关键词词云、整体排版优化，[#464](https://github.com/VirusPC/edges-brain-viruspc/pull/464)，已合）；用户纠正「重跑」的含义（见下记忆候选）；edges 框架仓 [#116](https://github.com/VirusPC/edges/pull/116)/[#117](https://github.com/VirusPC/edges/pull/117) 合入，日复盘 [#460](https://github.com/VirusPC/edges-brain-viruspc/pull/460) 与 private #14 合入。
- **通用-辅助**：查「221」乐队、Codex 是否支持 PTC、mem0 插件 hook 触发机制。
- **Codex→Langfuse**：出口被 Cloudflare 拦，自动同步暂停。
- **4070ts-win设备助手、IT资产管理**：无需沉淀。

## 建议补充内容清单

- **公开候选 2 条，本 PR 落盘**：
  - 记忆（feedback）：「重跑」= 用现行 skill 原样从头完整跑；转交云端 Agent 的指令必须忠实于用户原话。写入：[`.edges/memory/feedbacks/feedback_rerun_means_full_rerun_with_current_skill/INDEX.md`](../../../.edges/memory/feedbacks/feedback_rerun_means_full_rerun_with_current_skill/INDEX.md)（`edges memory remember`，[`.edges/memory/feedbacks/README.md`](../../../.edges/memory/feedbacks/README.md) 已登记）。
  - 笔记：mem0 插件的 hook 触发机制。写入：[`notes/2026-11-12--mem0-插件的-hook-触发机制claude-code-插件/INDEX.md`](../../../notes/2026-11-12--mem0-插件的-hook-触发机制claude-code-插件/INDEX.md)（`edges notes create --super`，[`notes/README.md`](../../../notes/README.md) 已登记）。
- **私人候选 1 条**：已在 edges-brain-viruspc-private 开 PR（链接见交付消息），公开仓不写正文。
- 不做：ai-news 可视化 / 推文播客 / 词云 / 排版三张待办卡 —— 已落卡并合入（[#461](https://github.com/VirusPC/edges-brain-viruspc/pull/461)、[#464](https://github.com/VirusPC/edges-brain-viruspc/pull/464)），去重。
- 不做：周报上站、10 期重跑 —— 已合入，去重。
- 不做：Codex 是否支持 PTC —— 助手自述没找到官方文档说明默认是否开启，结论不确定，写了会编造。
- 不做：4070ts 巡检、Codex→Langfuse 同步暂停 —— 运维瞬时状态，用户未要求沉淀；221 乐队查询 —— 个人闲聊。
- 不做：edges [#116](https://github.com/VirusPC/edges/pull/116)/[#117](https://github.com/VirusPC/edges/pull/117) 合并 —— 已执行，非沉淀内容。
- 不做：`posts/` —— 由人维护。
