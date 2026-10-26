# agent-infra

Agent 基础设施专项工作区：记录支撑 Agent 运行的底层设施，比如运行环境与沙箱、云端与本机执行、调度与 routine 触发、可观测性与评测接入（如自建 Langfuse）、工具与连接器接入、凭据与权限等方面的调研、选型、部署记录和决策。

只和某个具体模块绑定的内容放回对应项目（如 `projects/memory/`、`projects/routines/`）；这里放横跨多个 Agent、偏基础设施的部分。

调研、部署和踩坑记在本目录，命名 `YYYY-MM-DD--主题.md`，并补进下面的列表。

## 文档

- [prompt-caching.md](prompt-caching.md)：Prompt caching 知识笔记：各厂商（Anthropic / OpenAI / Gemini / DeepSeek）机制和计价对比、Agent 场景实践，以及 pi cache warmer 案例
- [2026-10-19--pi生态与插件扩展.md](2026-10-19--pi生态与插件扩展.md)：pi 本体、按月下载量排的插件、omp 硬分叉与 OpenClaw；结论是插件 / SDK 扩展 + 锁版本可行，分叉 core 是陷阱
- [2026-10-19--云沙箱Agent开源产品的Agent内核.md](2026-10-19--云沙箱Agent开源产品的Agent内核.md)：云沙箱 + agent 开源产品的三条内核路线（自研 loop / SDK / 沙箱里无头跑现成 CLI）、沙箱层选型，以及每会话容器的通用启动模式
- [2026-10-19--云沙箱服务SDK语言与隔离技术调研.md](2026-10-19--云沙箱服务SDK语言与隔离技术调研.md)：托管 Sandbox 服务的 TS/Python/Go/Java SDK 矩阵、隔离技术、大厂 Agent 公开用法、国内 E2B 兼容趋势与面试要点
- [2026-10-19--Vercel-coding-agent-template源码分析.md](2026-10-19--Vercel-coding-agent-template源码分析.md)：Vercel Sandbox 里无头跑多家 CLI 的流程、adapter 与命令、会话恢复、清理方式，以及该借鉴和不该照抄的地方
- [2026-10-19--OpenCode生态.md](2026-10-19--OpenCode生态.md)：基于 OpenCode 的项目分类表、为什么选它、v2 迁移等风险
- [2026-10-26--E2B-Embed自部署调研.md](2026-10-26--E2B-Embed自部署调研.md)：官方 E2B Embed 单机 Compose 自托管（Firecracker/KVM）、主机要求、端口，以及与 Langfuse 共址的风险。已在 minigtr-ubuntu 部署，见部署记录
- [2026-10-26--E2B-Embed-minigtr部署.md](2026-10-26--E2B-Embed-minigtr部署.md)：同机避开 Langfuse 改端口、smoke 通过
- [2026-10-26--E2B-Embed-Cloudflare公网接入.md](2026-10-26--E2B-Embed-Cloudflare公网接入.md)：已有 Cloudflare Tunnel 暴露三个公网域名（API `e2b`、Dashboard `e2b-dash`、sandbox 代理 `e2b-sandbox`，均为 `viruspc.tech`）
