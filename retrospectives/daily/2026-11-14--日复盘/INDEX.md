# 2026-11-14 日复盘

## 范围

时间窗：2026-11-13 05:22:31.307 → 2026-11-14 05:22:31.307（Asia/Shanghai）；日历日取回看结束日 **2026-11-14**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-14/`（按时间正序 jsonl，永久保留，不入库）。

- **主源局限**：本自动化运行没有 `ReadTranscript`。窗口内消息由本机 search-index 导出，且只含 `in_main_chat=1`；窗内另有 7 条非主聊天消息已跳过、未落盘。
- 共扫描 70 个助手配置；窗口内有活动并落盘 **4** 个助手、共 **329** 条：Grok Bot（299）、DIY Coding Agent（17）、日复盘（9，本助手自身的交付与合并往来，不作为新用户决策来源，惟窗内明确「合并」的 [#472](https://github.com/VirusPC/edges-brain-viruspc/pull/472) 已完成）、4070ts-win设备助手（4）。其余 66 个配置在窗内没有主聊天消息，未写空 jsonl。
- **Langfuse 缺口**：本机有公钥、私钥，但 `LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置（缺 BASE_URL/HOST 配置类）。按 Skill 不编 URL、不换其它读数路径；本窗未拉 Langfuse observations，候选只来自 search-index jsonl。
- 入口：Compose 工作区根 `VirusPC/edges-workspace-viruspc`（main `6c879db91fe96f9e79a179904560e54aa8dce6fb`）→ 公开脑；PR 开在子仓。Skill commit：`b4c8763e7e92bb6b5a7db576230477e33cf57ef1`（公开脑 main，与本窗所用 Skill 相同）。
- 去重：窗内已合公开脑 [#472](https://github.com/VirusPC/edges-brain-viruspc/pull/472)（11-13 日复盘）、[#473](https://github.com/VirusPC/edges-brain-viruspc/pull/473)（11-13 周报）、[#474](https://github.com/VirusPC/edges-brain-viruspc/pull/474)（详情页目录）、[#475](https://github.com/VirusPC/edges-brain-viruspc/pull/475)（页脚 GitHub 指向个人大脑仓）、[#476](https://github.com/VirusPC/edges-brain-viruspc/pull/476)（站点 dev 预览任务卡）、[#477](https://github.com/VirusPC/edges-brain-viruspc/pull/477)（分类前缀胶囊）、[#478](https://github.com/VirusPC/edges-brain-viruspc/pull/478)（栏目改名「AI 资讯」）、[#479](https://github.com/VirusPC/edges-brain-viruspc/pull/479)（精选改按内容判断，并补 Agent memory、营销过滤、Trending、Arena 基准、AA 榜等）、[#480](https://github.com/VirusPC/edges-brain-viruspc/pull/480)（LLM Arena 与 Artificial Analysis 分节）、[#481](https://github.com/VirusPC/edges-brain-viruspc/pull/481)（OpenRouter 用量榜）、[#483](https://github.com/VirusPC/edges-brain-viruspc/pull/483)（按 Dashboard 思路重构 AI News 任务卡）、[#484](https://github.com/VirusPC/edges-brain-viruspc/pull/484)（建设个人 Dashboard 框架任务卡）、[#485](https://github.com/VirusPC/edges-brain-viruspc/pull/485)（补 Dashboard 框架调研）、[#486](https://github.com/VirusPC/edges-brain-viruspc/pull/486)（学习异步 Agent 任务卡）；框架仓 [edges#124](https://github.com/VirusPC/edges/pull/124)（Edges server 官方 OCI 镜像任务卡）；数据仓 [ai-news-data#1](https://github.com/VirusPC/ai-news-data/pull/1)–[#3](https://github.com/VirusPC/ai-news-data/pull/3)（11-13 抓取 / AA / OpenRouter 快照）。仍开着、不重写：[#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465)（11-12 日复盘）、[private #15](https://github.com/VirusPC/edges-brain-viruspc-private/pull/15)（11-12 私人候选）、[#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482)（按 Dashboard 思路重构 AI News 的数据与可视化）。
- 覆盖缺口：落盘的 Grok Bot 主聊天最后一条在 2026-11-14 01:35（Asia/Shanghai）。此后 GitHub 上 [#485](https://github.com/VirusPC/edges-brain-viruspc/pull/485) 于 02:46 合入、[#486](https://github.com/VirusPC/edges-brain-viruspc/pull/486) 于 03:07 创建并合入；这两段若有后续用户原话，未出现在本窗 `in_main_chat` 导出中，不另写候选。

## 实际怎样

- **Grok Bot**：白天把 Edges server 开源发行 OCI 镜像记成任务并合入框架仓 [#124](https://github.com/VirusPC/edges/pull/124)；合并 11-13 周报 [#473](https://github.com/VirusPC/edges-brain-viruspc/pull/473) 与数据快照。随后改个人大脑站点：详情页都显示章节目录（[#474](https://github.com/VirusPC/edges-brain-viruspc/pull/474)）、页脚 GitHub 指向公开个人大脑仓（[#475](https://github.com/VirusPC/edges-brain-viruspc/pull/475)）、周报分类前缀渲染成胶囊（[#477](https://github.com/VirusPC/edges-brain-viruspc/pull/477)），并记下站点 dev 预览环境任务卡（[#476](https://github.com/VirusPC/edges-brain-viruspc/pull/476)）。栏目「AI Coding 资讯」改名为「AI 资讯」，已发布各期与文件名一并改（[#478](https://github.com/VirusPC/edges-brain-viruspc/pull/478)）。下午发现 11-13 期漏收 Anthropic Agent memory 文，将精选规则改为「判断依据是内容，不是 URL 路径」，并用干净 agent 重跑验证；同时在 skill 目录下开了 `.edges/`，把这次优化写成笔记，上述均随 [#479](https://github.com/VirusPC/edges-brain-viruspc/pull/479) 合入。随后补营销过滤、GitHub Trending、Arena 基准说明、Artificial Analysis 小节，再按用户要求把 LLM Arena 与 Artificial Analysis 分成各自小节并加「模型发布」（[#480](https://github.com/VirusPC/edges-brain-viruspc/pull/480)），晚上补 OpenRouter 用量 / 编程用量 / 应用榜（[#481](https://github.com/VirusPC/edges-brain-viruspc/pull/481)）。夜间接连记下「按 Dashboard 思路重构 AI News」（[#483](https://github.com/VirusPC/edges-brain-viruspc/pull/483)）和「建设个人 Dashboard 框架」（[#484](https://github.com/VirusPC/edges-brain-viruspc/pull/484)），并把对照调研补进后者（[#485](https://github.com/VirusPC/edges-brain-viruspc/pull/485)）。
- **DIY Coding Agent**：询问如何定制 dsh、插件 API 是否稳定，以及 pi 是否稳定、如何学习 pi 架构。属于问答，未约定落笔记或开任务卡。
- **4070ts-win设备助手**：早间、晚间崩溃巡检均因本机通道离线、远端不可达未连上，未验证窗口仍从 11-09 18:00 起算。
- **日复盘**：交付并（在用户要求后）合入 11-13 公开 PR [#472](https://github.com/VirusPC/edges-brain-viruspc/pull/472)；冲突仅项目记忆索引，已解决后 squash 合入。无新的用户决策。

## 建议补充内容清单

- **公开候选 0 条**。本次 PR 只写入当日复盘：[`retrospectives/daily/2026-11-14--日复盘/INDEX.md`](INDEX.md)。
- **私人候选 0 条**。
- 不做：skill 优化笔记（「这个skill开一个.edges，这次优化记录一篇笔记」）—— 已写入 `skills/managed/weekly-ai-blogs-digest/.edges/notes/2026-11-13--精选按内容判断11-13-期漏收-agent-memory/INDEX.md`，随 [#479](https://github.com/VirusPC/edges-brain-viruspc/pull/479) 合入 main，去重。
- 不做：把「测 skill 必须换干净的 agent」再写成一条 feedback —— 该教训已写进上述 skill 笔记；相近的「重跑用现行 skill 从头完整生成」已在仍开的 [#465](https://github.com/VirusPC/edges-brain-viruspc/pull/465) 中。用户在助手说「我记下了」后回「这还需要记？」，不把它当作另开一条记忆的指令。
- 不做：dsh / pi 架构问答 —— 未形成约定的下一步或可复用结论，用户没有要求落笔记或开卡。
- 不做：RSS 是否缺少快手、美团、Claude Code，以及站点导出 RSS 是聚合还是自己的内容 —— 问答已当场澄清，无新规则或未落卡任务。
- 不做：OpenRouter / Arena / AA 的榜单偏好（用量、编程维度、应用级榜，以及分节）—— 已写入 skill 与 11-13 期正文，并合入 [#479](https://github.com/VirusPC/edges-brain-viruspc/pull/479)–[#481](https://github.com/VirusPC/edges-brain-viruspc/pull/481)，去重。
- 不做：已在窗内落下并合并的任务卡与实现 —— 框架仓 [#124](https://github.com/VirusPC/edges/pull/124)，公开脑 [#473](https://github.com/VirusPC/edges-brain-viruspc/pull/473)–[#481](https://github.com/VirusPC/edges-brain-viruspc/pull/481)、[#483](https://github.com/VirusPC/edges-brain-viruspc/pull/483)–[#486](https://github.com/VirusPC/edges-brain-viruspc/pull/486)，数据仓 [#1](https://github.com/VirusPC/ai-news-data/pull/1)–[#3](https://github.com/VirusPC/ai-news-data/pull/3)；仍开的 [#482](https://github.com/VirusPC/edges-brain-viruspc/pull/482) 不重写。
- 不做：「学习异步 Agent」任务卡 —— 落盘对话未见用户原话，但 [#486](https://github.com/VirusPC/edges-brain-viruspc/pull/486) 已在 2026-11-14 03:07（Asia/Shanghai）合入 main，不另写。
- 不做：把第三方密钥存入密码管理器 —— 是针对当次密钥的一次性操作请求，授权未完成；对话没有形成可写入仓库的长期偏好。凭据与个人登录信息不入库。
- 不做：4070ts 巡检未连上 —— 运维瞬时状态。
- 不做：窗内「合并」指令 —— 已执行，非沉淀内容。
- 不做：`posts/` —— 由人维护。
