# 2026-11-13 日复盘

## 范围

时间窗：2026-11-12 05:17 → 2026-11-13 05:17（Asia/Shanghai）；日历日取回看结束日 **2026-11-13**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-13/`（按时间正序 jsonl，永久保留，不入库）。

- **主源局限**：本自动化运行没有 `ReadTranscript`。窗口内消息由本机 search-index 导出。
- 窗口内有活动并落盘 **5** 个助手、共 **193** 条：Grok Bot（169）、通用（14）、日复盘（4，自身，不分析）、4070ts-win设备助手（4）、全栈开发专家（2）。
- **Langfuse 缺口**：本机有公钥、私钥，但 `LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置（缺 BASE_URL/HOST 配置类）。按 Skill 不编 URL、不换旧接口；本窗未拉 Langfuse observations，候选只来自 search-index jsonl。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc` → 公开脑；PR 开在子仓。Skill commit：`d28a0bfc9cf079ca86ef221a4fbc6ebd7bb19e50`（公开脑 main）。
- 去重：窗内已合 brain [#466](https://github.com/VirusPC/edges-brain-viruspc/pull/466)（词云）、[#467](https://github.com/VirusPC/edges-brain-viruspc/pull/467)（ai-news-data 仓任务卡）、[#468](https://github.com/VirusPC/edges-brain-viruspc/pull/468)（缺项改记 notes、Arena 按窗口取历史榜）、[#469](https://github.com/VirusPC/edges-brain-viruspc/pull/469)（条目标题改链接）、[#470](https://github.com/VirusPC/edges-brain-viruspc/pull/470)（页脚 GitHub 链接）、[#471](https://github.com/VirusPC/edges-brain-viruspc/pull/471)（顶栏 Teaching 外链）。[#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465)（11-12 日复盘）与 [private #15](https://github.com/VirusPC/edges-brain-viruspc-private/pull/15) 仍开，不重写。

## 实际怎样

- **Grok Bot**：先查了 edges-memory-remember 在 Langfuse 里的调用次数（快照，不入库）。随后主要在改 AI News：词云选型与落地（[#466](https://github.com/VirusPC/edges-brain-viruspc/pull/466)）、每期抓取数据另存独立仓的任务卡（[#467](https://github.com/VirusPC/edges-brain-viruspc/pull/467)）、正文不再写缺项解释、Arena 复用窗口结束前最近一份榜（[#468](https://github.com/VirusPC/edges-brain-viruspc/pull/468)）、条目标题改成链接（[#469](https://github.com/VirusPC/edges-brain-viruspc/pull/469)）。用户指出站点阅读困难，助手给了分层精选、文首要看等建议，用户只确认了「标题做成链接」。站点补了页脚 GitHub 链接（[#470](https://github.com/VirusPC/edges-brain-viruspc/pull/470)）和顶栏 Projects 后的 Teaching 外链（[#471](https://github.com/VirusPC/edges-brain-viruspc/pull/471)）。交云端改 GitHub 链接时，助手把用户已定的「顶栏」改写成了「顶栏或页脚二选一」，造成位置偏移（见记忆候选）。晚间对照 Anthropic《Components of Agent Memory》核对了用户笔记（见笔记候选）。
- **通用**：问 Harbor 能否直接切换组件、open-grokbot 同事是不是各起沙箱、Codex 是否支持 Agent Teams，以及 Multica / Raft 这类架构的优势（见笔记与记忆候选）。
- **4070ts-win设备助手**：早间、晚间崩溃巡检都因本机通道离线、远端超时未连上，未验证窗口仍从 11-09 起算。
- **全栈开发专家**：短对话，无项目沉淀。
- **日复盘**：交付 11-12 公开 PR [#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465) 与私密 PR [private #15](https://github.com/VirusPC/edges-brain-viruspc-private/pull/15)，均未合并。

## 建议补充内容清单

- **公开候选 4 条，本 PR 落盘**：
  - 记忆（feedback）：用户已经定下来的位置、名称、范围或做法，转交云端 Agent 时必须写成硬性要求，不要改成二选一交给执行方取舍。写入：[`.edges/memory/feedbacks/feedback_user_decisions_are_hard_requirements_not_options/INDEX.md`](../../../.edges/memory/feedbacks/feedback_user_decisions_are_hard_requirements_not_options/INDEX.md)（`edges memory remember`，[`.edges/memory/feedbacks/README.md`](../../../.edges/memory/feedbacks/README.md) 已登记）。
  - 记忆（project）：Harbor 可用同一批 tasks 加多份 agent 配置切换组件（如 memory-on / memory-off），不必打包两套任务；记忆若在任务环境文件里则需任务变体。写入：[`.edges/memory/projects/project_harbor_agents_list_switches_components/INDEX.md`](../../../.edges/memory/projects/project_harbor_agents_list_switches_components/INDEX.md)（`edges memory remember`，[`.edges/memory/projects/README.md`](../../../.edges/memory/projects/README.md) 已登记）。
  - 笔记：Anthropic《Components of Agent Memory》的四层记忆与做梦，以及对话里核对过的评测数字和对 Edges 的映射。写入：[`notes/2026-11-13--anthropic-agent-memory-四层与做梦/INDEX.md`](../../../notes/2026-11-13--anthropic-agent-memory-四层与做梦/INDEX.md)（`edges notes create --super`，[`notes/README.md`](../../../notes/README.md) 已登记）。
  - 笔记：Codex 子 agent、Claude Agent Teams 与 Multica / Raft 三种协作结构的区分。写入：[`notes/2026-11-13--codex-子-agent-与-claude-agent-teams-及-multica-raft/INDEX.md`](../../../notes/2026-11-13--codex-子-agent-与-claude-agent-teams-及-multica-raft/INDEX.md)（`edges notes create --super`，[`notes/README.md`](../../../notes/README.md) 已登记）。
- **私人候选 0 条**。
- 不做：词云、ai-news-data 仓任务卡、缺项说明外置、Arena 历史榜、标题链接、页脚 GitHub、顶栏 Teaching —— 已合入 [#466](https://github.com/VirusPC/edges-brain-viruspc/pull/466)–[#471](https://github.com/VirusPC/edges-brain-viruspc/pull/471)，去重。
- 不做：其余可读性建议（分层精选、文首要看、章节硬上限、标题改三级等）—— 用户只确认了「标题做成链接」，其余未要求落卡。
- 不做：把「新模型」从「新进 Arena Top-15」改成「本周新发布」—— 助手提出了改法，用户未确认。
- 不做：edges-memory-remember 调用频率 —— 窗内快照数字，未形成可复用约定。
- 不做：open-grokbot 同事不是沙箱容器、而是 Durable Object 实例 —— 已写在该项目文档里，不重复落公开脑。
- 不做：4070ts 巡检未连上 —— 运维瞬时状态。
- 不做：磁盘清理已执行 —— 非沉淀内容。
- 不做：`posts/` —— 由人维护。
