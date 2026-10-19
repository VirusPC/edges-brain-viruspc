# agent-infra

Agent 基础设施专项工作区：记录支撑 Agent 运行的底层设施，比如运行环境与沙箱、云端与本机执行、调度与 routine 触发、可观测性与评测接入（如自建 Langfuse）、工具与连接器接入、凭据与权限等方面的调研、选型、部署记录和决策。

只和某个具体模块绑定的内容放回对应项目（如 `projects/memory/`、`projects/routines/`）；这里放横跨多个 Agent、偏基础设施的部分。

调研、部署和踩坑记在本目录，命名 `YYYY-MM-DD--主题.md`，并补进下面的列表。

## 文档

- [prompt-caching.md](prompt-caching.md)：Prompt caching 知识笔记：各厂商（Anthropic / OpenAI / Gemini / DeepSeek）机制和计价对比、Agent 场景实践，以及 pi cache warmer 案例
- [2026-10-19--pi生态与插件扩展.md](2026-10-19--pi生态与插件扩展.md)：pi 本体、按月下载量排的插件、omp 硬分叉与 OpenClaw；结论是插件 / SDK 扩展 + 锁版本可行，分叉 core 是陷阱
- [2026-10-19--云沙箱Agent开源产品的Agent内核.md](2026-10-19--云沙箱Agent开源产品的Agent内核.md)：云沙箱 + agent 开源产品的三条内核路线（自研 loop / SDK / 沙箱里无头跑现成 CLI）、沙箱层选型，以及每会话容器的通用启动模式
- [2026-10-19--Vercel-coding-agent-template源码分析.md](2026-10-19--Vercel-coding-agent-template源码分析.md)：Vercel Sandbox 里无头跑多家 CLI 的流程、adapter 与命令、会话恢复、清理方式，以及该借鉴和不该照抄的地方
- [2026-10-19--OpenCode生态.md](2026-10-19--OpenCode生态.md)：基于 OpenCode 的项目分类表、为什么选它、v2 迁移等风险
