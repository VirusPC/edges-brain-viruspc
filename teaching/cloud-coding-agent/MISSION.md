# Mission: 云端编程 Agent 产品的架构

## Why
peng cheng 想在面试里讲清楚“云端编程 Agent 产品是怎么搭起来的”，并且对这个领域的主要做法心里有数。选 vercel-labs/coding-agent-template 作为解剖对象，因为它是一个完整、开源、能读到每一行的真实系统（Vercel Sandbox + AI Gateway + 多种 Agent CLI + 自动推分支 / 开 PR）。

## Success looks like
- 不看笔记，用 60 秒讲清一个任务从提交到 PR、再到 Sandbox 收尾的全过程，并说出关键文件。
- 能讲出至少三个架构取舍（例如：用数据库传进度 vs 长连接；装现成 CLI vs 自己写 Agent；令牌放进 Sandbox vs 走代理），每个都能说清好处和代价。
- 能把这个模板和至少两个同类产品（OpenAI Codex Cloud、LangChain Open SWE 等）对比：隔离方式、联网、凭证、Agent 从哪来。
- 被追问细节时，能指出一处“文档和代码不一致”或“已经过时”的地方，证明自己真读过源码。

## Constraints
- 用平常的中文、完整的句子、不堆术语；产品名和 Agent、CLI、MCP、Sandbox、AI Gateway、PR 等词保持英文。
- 每课约 10 分钟，要能在手机上看。
- 只远程读代码（`gh api` / raw.githubusercontent），不 clone 仓库。所有说法都要附 GitHub 链接，固定到 main 的 commit e753e1b。

## Out of scope
- 自己部署或修改这个模板（除非以后任务改变）。
- 前端界面细节（shadcn/ui、Tailwind、文件浏览器、编辑器、LSP 等）。
- 大模型本身的原理和提示词技巧。
