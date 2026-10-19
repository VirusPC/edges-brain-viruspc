# html-plan 审阅页与 grill-with-docs 的配合

## 背景

2026-10-18 晚（Asia/Shanghai），全栈开发专家对任务卡「安装 edges 后自动装好 skills」跑 grill-with-docs，开出 #274（任务卡 + ADR 0036）。用户觉得纯 markdown 的 PR「太难 review」，想找一个画架构图或生成 HTML 的 skill，印象里是 Claude Code 的 Boris 发过一个。

## 主题

找到合适的「HTML 审阅页」skill，弄清它的来源和交互方式，并决定怎么跟现有 grill-with-docs、plan 流程配合。

## 过程

1. **找来源。** 用户记的是 html-plan。它由 Claude Code 团队的 Thariq 在 2026-10-05 发布，Boris 转发过，所以容易被记成 Boris 的。Boris 本人没发过这个 skill，只建议过让 Claude 用 HTML 讲代码、画系统图。
2. **识别二手站点。** 第一次贴的链接来自 mdskill.dev。它是第三方 skill 索引站，从 GitHub 抓 SKILL.md 展示，并附自己的安装命令；与 Anthropic 无关，运营方不明，不能当来源。html-plan 的正式来源是 Anthropic 社区插件仓库 `anthropics/claude-plugins-community`，安装方式是 `claude plugin marketplace add anthropics/claude-plugins-community` 后 `claude plugin install html-plan@claude-community`。
3. **同类候选。** 专画架构图的还有 `plannotator/effective-html`（含 `html-diagram` 与 `html-plan`，可用 `npx skills add` 安装）和 `konraddzbik/architecture-diagram-skill`（单文件、可点击的动画架构图，更偏演示）。
4. **试用。** 用 html-plan 把 #274 渲染成一页：按「为什么、做什么、怎么做、改哪里」逐层展开，每条结论配 mockup、状态机、调用栈或代码片段，待拍板的决策挂在相关结论下；自带打包脚本，产出可离线打开的 `plan.packed.html`，不依赖 Claude Code。
5. **Respond 怎么回传。** 页面右下角 Respond 只会生成一段 markdown 并复制到剪贴板，需要用户手动粘回对话。官方 README 与 SKILL.md 都是这么写的；源码里有一个 `liveOn` 开关（打开后出现 Send 按钮），公开版写死为关闭、`send` 为空，即「直接提交」在官方版本里没有实现。
6. **和 grill 怎么配合。** 一开始建议只在 grill 结束后做一页；用户最后定为：grill-with-docs 的**每一轮提问**都做成一页 html-plan（不是每一步），用户点 Copy response 粘回来，助手把答案写回任务卡和 ADR。之后 #276 起，实现 PR 也附一页审阅页。

## 结果

- 用 html-plan 作为 grill 与实现 PR 的审阅层；md 的 plan、任务卡、ADR 仍是正本，HTML 是可重新生成的视图，不进主线。
- 回传暂时保持手动粘贴，不额外搭接收服务。
- 当天 #274 之后的 #276（skills init 实现）和 npm Actions 发布 grill（三轮决策）都按这个方式审阅。
- 偏好已作为反馈记忆入库（见本 PR 的 `feedback_grill_rounds_as_html_plan`）。

## 所学

- 记忆里的「谁发的」容易被转发者覆盖；找 skill 先追到原始仓库，再看索引站。
- 第三方索引站可以帮你找到东西，但不能当来源引用，也不要用它的安装命令代替官方方式。
- 问答式 grill 的每一轮做成可勾选的页面，比在聊天里读一长串 Q1–Q11 更容易审；但页面只做「视图」，结论还得写回能 diff、能 grep 的文本。

## 行动指南

- 要收进 skill 库前先处理三件事：支持中文句号、允许中文正文、确认许可证（html-plan 自述 MIT，所在仓库根 LICENSE 是 Apache-2.0）。
- 想要「点一下就回传」，需要自己打开 `liveOn` 并接一个能收提交的小服务；目前不做。
- 审阅页里发现写错（如 provenance、registry-url 这类事实）时，改 HTML 重新打包后再发，不要只在聊天里口头更正。

## 补充说明

以上来源、日期与源码细节来自当天助手的核查，本篇入库时没有再次复核。