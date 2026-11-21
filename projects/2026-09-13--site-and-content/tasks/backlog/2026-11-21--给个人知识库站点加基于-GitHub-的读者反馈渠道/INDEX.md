---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-21T12:42:42.466Z'
  edges-title: 给个人知识库站点加基于 GitHub 的读者反馈渠道
  edges-tasks-status: backlog
  edges-task-priority: none
name: site_github_reader_feedback
description: 读者目前没有途径对站点内容反馈；借助 GitHub 加上文章评论和问题反馈入口，不自建后端。
---
**背景：**
2026-11-21 合并 AI News 木牌筛选栏（[PR #549](https://github.com/VirusPC/edges-brain-viruspc/pull/549)）后，peng cheng 提出站点需要给大家反馈的渠道，想直接利用 GitHub。讨论中建议分两层：文章底部嵌入 Giscus 评论区（评论存进本仓库 GitHub Discussions），以及页脚或导航放「反馈」入口，跳到预填好的 Issue 模板。原本准备直接试做，随后改为先记成任务。
- 站点是本仓库 `site/`（Astro），推到 main 自动部署到 https://viruspc.github.io/edges-brain-viruspc/
- Giscus 前提：仓库公开、开启 Discussions、安装 giscus GitHub App；这几项尚未核对
- 约束：读者需要 GitHub 账号才能留言
- 非目标：本次不做面向无 GitHub 账号读者的表单
- 关联：PR #549

**目标：**
读者能在每篇文章下用 GitHub 账号评论，并能从站点一键提交带当前页面链接的反馈 Issue；视觉与站点亮色/暗色及木牌风格一致。

**动作：**
- 核对仓库公开状态，开启 Discussions，安装 giscus App
- 文章页底部嵌入 Giscus，主题随亮暗色切换
- 新增 Issue 模板（如「内容纠错」「站点问题」），页脚或导航加「反馈」入口并自动带上当前页面链接
- 由云端编码 agent 开 PR，截图验收后再合并
