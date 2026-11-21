---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-21T17:20:00.000Z'
  edges-title: 给个人知识库站点加基于 GitHub 的读者反馈渠道
  edges-tasks-status: in_review
  edges-task-priority: none
name: site_github_reader_feedback
description: 文章页用 Giscus 的 Comments 分类评论，右下角反馈按钮打开预填 Issue；等验收。
---
**背景：**
2026-11-21 合并 AI News 木牌筛选栏（[PR #549](https://github.com/VirusPC/edges-brain-viruspc/pull/549)）后，peng cheng 提出站点需要给大家反馈的渠道，想直接利用 GitHub。文章底部用 Giscus，反馈入口后来定为视口右下角的悬浮按钮，不放页脚。
- 站点是本仓库 `site/`（Astro），推到 main 自动部署到 https://viruspc.github.io/edges-brain-viruspc/
- 2026-11-21 晚：Discussions 已启用。GitHub API 读到分类 Comments，id 为 `DIC_kwDOQzfxSc4DLqmP`，与 giscus 配置页一致。用户说明该分类格式是 Announcements，维护者开帖，读者评论。Giscus App 已只装在本仓库。
- 约束：读者需要 GitHub 账号才能留言
- 非目标：不做面向无 GitHub 账号读者的表单
- 关联：PR #549，实现 PR #561

**目标：**
读者能在每篇文章下用 GitHub 账号评论，并能从站点一键提交带当前页面链接的反馈 Issue；视觉与站点亮色/暗色及木牌风格一致。

**动作：**
- Discussions、Comments 分类和 Giscus App 已由人配好。分类名和 id 已写入 `site/src/lib/reader-feedback.mjs`。
- 文章页底部挂载 Giscus，按带站点 base 的 pathname 对应讨论，靠近视口才加载，主题跟随亮暗。配置缺失时不放空框。
- Issue 模板 `reader-feedback.yml` 含错误和建议。全站右下角一个「反馈」按钮，打开预填当前页面地址的新建 Issue 页。
- 待验收。没有代发评论、Discussion 或 Issue。验收通过后再标完成。
