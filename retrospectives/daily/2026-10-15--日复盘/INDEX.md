# 2026-10-15 日复盘

## 范围

时间窗：2026-10-14 05:00 至 2026-10-15 05:06（Asia/Shanghai）。原始对话已按助手落盘到本机 `/workspace/daily-scan/2026-10-15/`（按时间正序的 jsonl，永久保留，不入库）。

- 读到且窗口内有活动的助手：Grok Bot（511 条）、Agent Memory 专家（420 条）、日复盘（118 条）、罗辑（10 条）、史强、章北海、维德（各 8 条）、通用-辅助（6 条）。
- 其余约 58 个助手只抽样看了最新几条消息，没有发现窗口内的活动；其中不少最新消息没有时间戳，只能结合内容判断不在窗口内，存在漏看的可能。
- 去重依据：VirusPC/edges 近两天的 PR（#240–#253，除 #251 外均已合入）和 main 上的现有文件；edges-private 近两天没有 PR。已合入、本次不再重复的有 [#252](https://github.com/VirusPC/edges/pull/252)（日复盘候选直接开 PR）、[#253](https://github.com/VirusPC/edges/pull/253)（RSS 笔记与任务卡），以及当天已入库的关注清单、Agent Memory 笔记、connector 笔记与任务卡等。

## 实际怎样

- **Agent Memory 专家**：把「调研 Agent 能力时优先关注的产品与团队」清单（#240）反复收窄：先改成二级列表并补播客，后按「调研对象要有一手材料」拆分，个人博客和播客迁到 `weekly-ai-blogs-digest` skill，描述去掉专门讲记忆的说法，合入。发现根目录 `memory/` 是手写的，不合 CLI 规范，记成任务卡「memory init/remember 支持 --super」（#245）。写了基于 git 与文件系统的 Agent Memory 调研笔记（#246，补 MemGPT、GBrain、Devin Agent Memory Repo、文件系统记忆论文等）和 OpenViking 补充（#250）。晚上讨论了大厂团队知识库做法，以及自动沉淀型 skill 怎么被用户感知、拿到反馈。
- **Grok Bot**：讨论 skill 在 ChatGPT 等无工作区窗口里用不了的问题，收敛到自建 edges connector（远程 MCP），落了笔记和任务卡（#243、#244），后续确定服务端在常驻机器上本地跑 Codex、每任务一个 worktree 加容器（#247、#248），补了 OAuth / Auth0 核实（#249）。查清 `--content-file` 不是 CLI 坏了而是本地 skill 副本过时，随后建了「skill 合入即同步」routine，并从 Agent Memory 专家接手「CLI 合并后自动重编译」routine。整理 Harness Playbook 书签（#241、#242），写了 Folo / BestBlogs RSS 笔记和「Agent 取内容优先走 RSS」任务卡（#253）。另有一些个人设备和网络配置的问答。
- **日复盘**：把 routine 改成候选直接落文件开 PR（#252），已合入。
- **三体群聊**（罗辑、史强、章北海、维德、通用-辅助）：围绕「给岁月以文明」的闲聊，没有沉淀价值。

## 下次做什么

- connector 已有任务卡和方案，下一步是按卡实现（先 capture / search / read / status 四个工具）。
- `memory init/remember --super` 任务卡待实现，之后再把根目录 `memory/` 用 CLI 重做。
- PR #251（端到端评测笔记）仍开着，待审。
- 资讯 skill 是否加入 Meta 博客，用户说「先这样」，暂不动。

## 建议补充内容清单

- 笔记：让自动沉淀型知识 skill 被用户感知并拿到反馈（「用上时点名」、存时轻提示、反馈挂在提示上等）。去处：`notes/`。写入：`notes/2026-10-15--让自动沉淀型知识-skill-被用户感知并拿到反馈/INDEX.md`。
- 任务：入库类 skill 增加无工作区降级模式（connector 卡把它列为非目标、另行处理，至今没有卡）。去处：根看板 `edges-extensions`。写入：`.edges/tasks/edges-extensions/backlog/2026-10-15--入库类-skill-增加无工作区降级模式/INDEX.md`。
- 反馈：精简内容前先把要删的迁到合适去处（#240 删播客时被用户纠正）。去处：根记忆 feedbacks。写入：`.edges/memory/feedbacks/feedback_migrate_before_delete/INDEX.md`。
- 不做：「笔记里不记工作量估算」（#249 用户要求删掉）。只针对那一篇，看不出是通用偏好，写成反馈就是过度推广。
- 不做：大厂团队知识库调研。用户没要求入库，部分结论未核实，写了容易把未核实内容固化。
- 不做：「edges 算弱 RSI」的讨论。是观点问答，没有可执行的结论。
- 不做：个人设备（手表配对、耳机切换）和本机代理配置的问答。属于私人生活和本机环境细节，价值低，也没有开 edges-private PR。
- 私人内容：0 条，edges-private 未开 PR。
