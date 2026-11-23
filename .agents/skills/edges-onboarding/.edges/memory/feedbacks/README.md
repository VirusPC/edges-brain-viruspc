# FEEDBACK — 纠正与约束

> 记：用户给出的纠正、明确确认过的做法，以及必须始终生效的禁止模式和它的原因。
> 不记：读代码就能看出来的写法，以及 `AGENTS.md` 已经写过的规则。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。
> 本文件只是索引，条目区块由脚本重算，正文写在 `feedbacks/feedback_<slug>/index.md` 里。

<!-- edges-entries-local:start -->
## 本层内容

- [接入时从环境识别 Agent 宿主](<feedback_onboarding_detect_agent_host/INDEX.md>) — 设计 onboarding 提问时：Agent 宿主从当前会话和环境识别，不列为必答项；只在无法判断且影响入口配置时询问。
- [开场用新用户能回答的日常结果](<feedback_onboarding_two_scenarios/INDEX.md>) — 设计 onboarding 开场时：按还不了解系统的人来写；每条用日常结果说明用途和范围；整个项目和某一个文件夹必须分开；流程只作兜底；路径和公开范围只在当前选择需要且上下文没有时再问。
- [改后用 PR 分支 raw URL 测一句话接入](<feedback_onboarding_test_via_pr_branch_url/INDEX.md>) — 改 edges\-onboarding 后，把一句话安装的 main raw URL 换成 PR 分支即可测提问与接入；合入后改回 main。
<!-- edges-entries-local:end -->
