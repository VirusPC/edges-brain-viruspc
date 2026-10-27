---
name: project_use_latest_edges_cli_on_machines
description: >-
  在用户机器上 edges init、重装 skill 或其他 edges 操作前打开：先对比本机版本与 npm latest，落后先升级；main
  未发版的改动先说明再让用户选
metadata:
  edges-title: 在用户机器上操作 edges 前先对齐 npm 最新版
  edges-type: project
  edges-origin-session-id: sand-subagent-ce7b2d5e-de1c-ad6f-6451-4f15d78beee6
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-10-22T05:20:19+08:00'
---

在用户的机器上跑 `edges init`、重装 skill 或做其他 edges 操作前，先对一下本机 `edges --version` 和 npm 上的 latest（`npm view @viruspc/edges version`）。本机落后的话，先 `npm i -g @viruspc/edges@latest` 再操作。

**Why:** 2026-10-21 在一台工作电脑上初始化项目时，助手直接用了本机的旧版 0.2.3。装进去的 `edges-compose` skill 还在教已经删掉的 `register`、`clone` 命令。用户说「应该用最新命令吧」「npm 发包了么」。助手还先答错一次，说 npm 没发 0.2.4，查了才知道当天中午已经发了。升到 0.2.4 重装 skill 以后，init 也不再报「未完成」。

**How to apply:**
- 对版本号时以 npm registry 为准，不凭记忆说「发了」还是「没发」。
- 需要的改动只在框架仓 main 上、还没发版（例如 2026-10-21 合入的 #26、#27）时，先告诉用户 npm 版不含这些改动，让用户选：发新版，还是临时用源码构建。不要默默用源码现编一个 CLI。
- 操作完的回报里写上用的 edges 版本。
