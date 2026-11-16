# 2026-11-17 日复盘

## 范围

时间窗：2026-11-16 05:15:31 → 2026-11-17 05:15:31（Asia/Shanghai）；日历日取回看结束日 **2026-11-17**。原始对话按助手落盘在本机 `/workspace/daily-scan/2026-11-17/`（按时间正序 jsonl，永久保留，不入库）。本篇只基于这些文件分析。

- **主源局限**：本运行没有 `ReadTranscript`。窗口内消息由本机 search-index 导出，只含 `in_main_chat=1`；窗内非主聊天消息 0 条。
- 共扫描 72 个助手配置；窗口内有活动并落盘 **11** 个助手、共 **196** 条：Coding Agent 专家（85）、周复盘（30）、IT资产管理（27）、全栈开发专家（22）、任务记录员（9）、Grok Bot（7）、4070ts-win设备助手（4）、通用-辅助（4）、Agent Eval 专家（3）、通用（3）、日复盘（2）。`unknown_agent_ids` 为空。
- **Langfuse 缺口**：本机有公钥、私钥，但 `LANGFUSE_BASE_URL` 与 `LANGFUSE_HOST` 均未设置（缺 BASE_URL/HOST 配置类）。按 Skill 不编 URL、不换其它读数路径；本窗未拉 Langfuse observations，候选只来自 search-index jsonl。
- 入口：Skill 与 INDEX 读自公开脑默认分支 main 的最新版本。
- 去重：窗内由助手当场开出并仍待用户审阅的 PR 不重写：公开脑 [#506](https://github.com/VirusPC/edges-brain-viruspc/pull/506)（周复盘 2026-11-09）；前一日日复盘 [#505](https://github.com/VirusPC/edges-brain-viruspc/pull/505)；公开脑 [#507](https://github.com/VirusPC/edges-brain-viruspc/pull/507)（项目列表标题重复）已由用户合入；私密仓 [private#20](https://github.com/VirusPC/edges-brain-viruspc-private/pull/20)（Personal Agent 场景面试题阶梯）；框架仓 edges#131（edges 拆分主框架与 personal harness 扩展，urgent 任务卡）。

## 建议补充内容清单

- **公开候选 0 条**；**私人候选 0 条**，未开私密 PR。本窗内值得沉淀的事项均已由对应助手当场落库（见去重），日复盘不重复写。
- 不做：edges 拆为主框架与 personal harness 扩展的 urgent 任务 —— 任务记录员已落卡到 edges#131，去重。
- 不做：Personal Agent 场景面试题阶梯 —— 属私人内容，已在 private#20，去重；公开清单不写私人正文。
- 不做：personal agent（Claude 常驻 agent、DeepSeek harness）文章的课程与事件收件箱问答 —— Coding Agent 专家已把课程放入个人大脑 teaching 并合并，问答只是对原文的复述，后续可回查课程本身，不另写笔记。
- 不做：订阅源 x-feeds 改名与补入上周资讯 —— Coding Agent 专家已当场改并合并，一次性操作。
- 不做：周复盘补「沉淀 memory / skill / task / routine 与展望」规则 —— 已在仍开的 #506。
- 不做：4070ts 崩溃监控（早晚两次均为本机离线 CLEAR）—— 例程输出，无新结论；该机持续离线、未验证窗口仍待核对，属设备助手跟进，不落卡。
- 不做：IT资产管理的 Cursor 插件缓存占用、网速慢与公司 DNS 重装问答 —— 一次性排障，后续用不到；设备与网络细节涉及私人环境，不入公开仓。
- 不做：Agent Eval「pi eval」、Ralph loop、通用助手零散问答 —— 纯问答，没有可跟进事项，背景和目标不足以写卡。
- 不做：`posts/` —— 由人维护，不自动写入。
