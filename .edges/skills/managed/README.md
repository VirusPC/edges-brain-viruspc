<!-- edges-memory-type:start -->
name: managed
module: skills
writable: true
gitignore: false
format: skills
<!-- edges-memory-type:end -->

# SKILLS — 可复用技能

> 记：项目内可复用的能力说明、操作流程与使用规范。
> 本文件只是索引，内容放在 `skills/`，其内部结构遵循 Agent Skills 自身协议。

<!-- edges-entries-local:start -->
## 本层内容

- [linux-nas-direct-link](linux-nas-direct-link/SKILL.md) — 当要把消费级 NAS（尤其绿联 UGOS）用网线直连到 Linux 主机时使用：共享上网/NAT、专用用户 SMB 挂载、Tailscale（含 tailscale0 缺 IPv4）、SSH 防锁与管理页访问。
- [box\-disk\-cleanup](<box-disk-cleanup/SKILL.md>) — grok\-bot 工作盘空间紧张、仓库体积异常膨胀、或用户要清理无用 worktree / 一次性克隆目录时使用。先判断安全再删，不要碰主仓和还在用的目录。
- [publish\-article\-as\-post](<publish-article-as-post/SKILL.md>) — 用户要把笔记或知识条目改成对外成稿（posts），或发布页出现标题层级不分、目录混进图片、后半段直接显示原文时使用。
<!-- edges-entries-local:end -->
