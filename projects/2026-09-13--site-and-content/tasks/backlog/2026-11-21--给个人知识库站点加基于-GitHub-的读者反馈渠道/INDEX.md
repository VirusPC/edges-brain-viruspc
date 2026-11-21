---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-21T17:10:00.000Z'
  edges-title: 给个人知识库站点加基于 GitHub 的读者反馈渠道
  edges-tasks-status: backlog
  edges-task-priority: none
name: site_github_reader_feedback
description: 读者目前没有途径对站点内容反馈；借助 GitHub 加上文章评论和问题反馈入口，不自建后端。
---
**背景：**
2026-11-21 合并 AI News 木牌筛选栏（[PR #549](https://github.com/VirusPC/edges-brain-viruspc/pull/549)）后，peng cheng 提出站点需要给大家反馈的渠道，想直接利用 GitHub。讨论中建议分两层：文章底部嵌入 Giscus 评论区（评论存进本仓库 GitHub Discussions），以及页脚或导航放「反馈」入口，跳到预填好的 Issue 模板。原本准备直接试做，随后改为先记成任务。同日又确定入口改为视口右下角的悬浮按钮，不放页脚。
- 站点是本仓库 `site/`（Astro），推到 main 自动部署到 https://viruspc.github.io/edges-brain-viruspc/
- 2026-11-21 核对：仓库公开，Issues 已开。Discussions 关闭，接口返回 410，没有讨论分类，读不到 category id。Giscus App 不能由实现代为安装。
- 约束：读者需要 GitHub 账号才能留言
- 非目标：本次不做面向无 GitHub 账号读者的表单
- 关联：PR #549

**目标：**
读者能在每篇文章下用 GitHub 账号评论，并能从站点一键提交带当前页面链接的反馈 Issue；视觉与站点亮色/暗色及木牌风格一致。

**动作：**
- 核对仓库公开状态，开启 Discussions，安装 giscus App。公开和 Issues 已核对；Discussions 和 App 仍要人工完成。
- 文章页底部已接入 Giscus 挂载。分类 id 为空时不加载脚本，页面保留 GitHub 反馈链接。填入真实分类名和 id 并重新构建后才会加载。
- 新增 Issue 模板 `reader-feedback.yml`（类型为错误或建议）。全站右下角一个「反馈」按钮，打开预填当前页面地址的新建 Issue 页。
- 评论区仍未上线。开启 Discussions、建立分类、安装 https://github.com/apps/giscus 后，把分类名和 id 写入 `site/src/lib/reader-feedback.mjs`。
