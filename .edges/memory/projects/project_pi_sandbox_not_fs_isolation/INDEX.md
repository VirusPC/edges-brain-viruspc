---
name: project_pi_sandbox_not_fs_isolation
description: >-
  在 Pi 或本机 Agent 上跑实验/消融前打开：Pi 自带沙箱主要是本地执行权限，文件系统未真正隔离；要 FS 隔离再套 Docker/干净 worktree 或自托管 E2B
metadata:
  edges-title: Pi 沙箱不等于文件系统隔离
  edges-type: project
  edges-origin-session-id: daily-retro-2026-10-27
  edges-agent-client: grok-bot
  edges-username: VirusPC
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: '2026-10-27T05:21:00+08:00'
---

Pi 自带沙箱主要是**本地执行权限**沙箱，**文件系统并没有真正隔开**。要隔离文件，还得再套 Docker / 干净 worktree（或只挂实验目录），或使用自托管 E2B Embed（Firecracker/KVM）一类真实 FS 隔离沙箱；不能指望 Pi 自带沙箱顶这一层。

**Why:** 2026-10-26 用户对 IT资产管理明确指出这一点，并据此决定在 minigtr 自部署 E2B Embed（调研+部署+Cloudflare 公网接入笔记已合入 `projects/agent-infra/`）。

**How to apply:**
- 消融 / 评测「干净基线」不要默认信任 Pi 沙箱等于干净 clone。
- 需要多租户或不可信代码隔离时，优先看 `projects/agent-infra/` 下 E2B Embed 部署与接入笔记；密钥不进公开仓，本机用 `docker compose exec ready cat /run/e2b/sdk.env`。
