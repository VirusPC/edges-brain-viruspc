# 云沙箱 + Agent 开源产品：Agent 内核与沙箱层

> 日期: 2026-10-19（Asia/Shanghai）。star 数为当天实测。⚠️ 表示未逐项核实或属于推断。

## 结论

开源的「云沙箱 + agent」产品，agent 内核大致三条路：

1. **自研 loop**：头部项目基本都是自研。
2. **基于 SDK**：LangGraph / Deep Agents / pi-agent-core。
3. **在沙箱里无头跑现成 CLI**：OpenCode、Claude Code、Codex 等，外层只做控制面。

smolagents、OpenAI Agents SDK 很少被当作这类产品的内核。

## 三条路线

| 路线 | 项目（★，2026-10-19） | 备注 |
|---|---|---|
| 自研 loop | OpenClaw 392k、Hermes Agent 255k、opencode 217k、Codex 130k、OpenHands 91k、Cline 70.5k、OpenManus 58.7k、Goose 55k | 内核和产品一起演进 |
| SDK | DeerFlow 84k（LangGraph）、Open SWE 11k（Deep Agents）；Kortix daemon 用 pi-agent-core | 编排交给框架 |
| 沙箱里无头跑现成 CLI | Kortix / Suna 20.3k（OpenCode）、background-agents 3.4k（OpenCode / Claude / Codex）、Vercel coding-agent-template 1.8k（多 CLI）、VibeKit（多 CLI，已基本停更） | 见 [coding-agent-template 源码分析](2026-10-19--Vercel-coding-agent-template源码分析.md)、[OpenCode 生态](2026-10-19--OpenCode生态.md) |

## 沙箱层

| 方式 | 典型 | 特点 |
|---|---|---|
| 每会话一个 Docker 容器 | 自托管方案（OpenHands 等） | 简单，隔离弱于 VM |
| 可插拔云沙箱 | Modal / Daytona / E2B | 一套接口接多家 provider |
| 绑定平台 | Vercel Sandbox、Cloudflare Durable Objects | 和平台部署深度耦合 |
| microVM | Kortix | 强隔离，可做快照 |

- Daytona 的主 GitHub 仓库 2026-07 已归档（归档时约 71.5k★）。
- E2B 14.4k★，仍活跃。

## 每会话容器通常怎么起来（通用模式，⚠️ 未逐个项目核实）

1. **控制面创建沙箱**：通过 Docker / K8s API 或 E2B、Modal、Daytona、Vercel 的 SDK 创建容器或沙箱。
2. **准备工作区**：clone 仓库，注入密钥（环境变量或配置文件）。
3. **启动 agent**，两种方式：
   - 容器里常驻 agent server（如 OpenHands Agent Server、`opencode serve`），控制面通过 HTTP / WebSocket / SSE 驱动；
   - 每轮无头执行一次（如 `codex exec`），收集 stdout / JSON 流。
4. **收尾**：空闲时暂停或做快照，任务结束后销毁。
5. **加速**：预热池（warm pool）、microVM 快照恢复。

## 待确认

- 各项目内核归类来自 README 和代码结构的快速阅读，没有逐个跑通 ⚠️。
- 「smolagents / OpenAI Agents SDK 很少被当内核」是样本内观察，不是统计结论。
