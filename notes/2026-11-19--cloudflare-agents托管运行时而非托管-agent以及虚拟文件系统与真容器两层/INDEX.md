---
title: Cloudflare Agents：托管运行时而非托管 Agent，以及虚拟文件系统与真容器两层
---
# Cloudflare Agents：托管运行时而非托管 Agent，以及虚拟文件系统与真容器两层

## 背景

2026-11-19 晚用户在「通用-辅助」连续追问 Cloudflare Agents 是什么、是否等于 managed agents、能否像云端 Codex 那样跑、有没有 bash、是不是虚拟文件系统。助手部分回答经联网核对官方文档，细节会随版本变化，以 2026-11-19 为准。

## 要点

- Cloudflare Agents（npm 包 agents）基于 Durable Objects：每个 Agent 一个有状态实例，自带 SQLite、WebSocket、定时任务、可接 Workflows、空闲休眠、可做成远程 MCP 服务器。
- 它是「托管的 Agent 运行时」，不是 Claude Managed Agents / OpenAI Agents 那种「托管的 Agent」：Agent 循环、选哪个模型、怎么用工具都要自己写。比喻：租现成员工 vs 租一间带水电的办公室。
- 与云端 Codex 不同：Cloudflare Agents 本身没有完整 Linux，不能 git clone、npm install；要那种能力需再加 Cloudflare Sandbox（容器），Agent 负责调度与记忆，Sandbox 负责跑代码。
- Think 框架给每个 Agent 一个 /workspace，存在 Durable Object 的 SQLite（大文件放 R2），是模拟文件系统，不是真磁盘；自带 read、ls、grep、write、edit 与 exec，早先内置的 bash 工具已移除。exec 需挂执行后端：①Worker shell 后端（just-bash，JS 写的 bash 解释器，跑在 Dynamic Worker，快且便宜，支持 cat/grep/sed/awk/jq 与部分 git，不能 npm install 或跑原生程序，官方标为实验性，不建议上生产）；②Container 后端（真实 Linux 容器，什么都能跑，每会话一个容器，更贵更慢）。两者共用同一份存储：平时用便宜虚拟层，需要真跑命令再起容器。

## 去向建议

公开脑 notes（跨项目的 agent 运行时架构判断）；可与 [开源 Personal Agent 的主动性：定时任务与 Event Inbox](../2026-11-19--开源-personal-agent-的主动性定时任务与-event-inbox/INDEX.md) 中 open-grokbot 事件收件箱的讨论互相引用。
