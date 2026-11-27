---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-24T21:24:42.843Z'
  edges-title: AI 资讯内嵌阅读容器与 AI 侧边栏
  edges-tasks-status: backlog
  edges-task-priority: none
name: ai_资讯内嵌阅读容器与_ai_侧边栏
description: 评估并确定 AI 资讯站点阅读原文的内嵌容器方案（含 iframe 之外与自研浏览器扩展），并与 AI 侧边栏、Langfuse 上传和笔记沉淀串起来。
---
**背景：**
用户经常需要点进 AI 资讯里的文章原文看细节，并借助浏览器侧边栏里的 AI 插件辅助理解。2026-11-24 用户明确说先记一张任务，后面再 grill 细聊。当时的设想是：点击资讯里的文章时，页面右侧自动打开一个内嵌外源 HTML 的容器做浏览，并推荐结合 AI 侧边栏插件一起分析。侧边栏里的 AI 还可以安装 skill，把会话上传到 Langfuse，把内容沉淀回 edges brain。
- 对话里还谈过两件没有定下来的事：能不能用脚本触发分屏；除 iframe 之外有没有更好的方案。自研浏览器扩展当时听起来可行，细节留到后面再聊。这些都是设想，不是已经选定的做法。
- 预期：读原文、用侧边栏理解，以及把会话和内容沉淀回大脑，可以接在同一条路径上。
- 非目标：本卡不直接实现内嵌容器、浏览器扩展或侧边栏 skill。
- 关联：AI 资讯在本仓站点 `/ai-news/`。细化顺序已有记忆 `.edges/memory/projects/project_grill_memory_ask_then_html_plan`（先 memory ask，再 grill，中文 html-plan 确认后再改代码）。

**目标：**
评估并确定在 AI 资讯站点里阅读原文的内嵌容器方案（iframe 之外的选项含自研浏览器扩展），并与 AI 侧边栏、Langfuse 上传和笔记沉淀串起来。

**动作：**
- 后续先用 grill-with-docs 细聊，再定方案。

**完成标准：**
- [ ] 方案结论写入本卡。
- [ ] 按该结论拆出实现卡。
