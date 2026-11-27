---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-24T03:24:10.000Z'
  edges-title: 自研扩展为 AI 资讯站点做分屏阅读与会话沉淀
  edges-tasks-status: backlog
  edges-task-priority: none
name: 自研扩展为_ai_资讯站点做分屏阅读与会话沉淀
description: 浏览 AI 资讯站点时，常要点进原文并用侧边栏 AI 辅助理解。做一个自研的 Chrome 与 Edge 扩展，让点击文章后左右分屏打开原文，并在侧边栏里问答、把会话传到自建 Langfuse、把笔记沉淀回个人大脑。
---
**背景：**
2026-11-24，用户在谈自己浏览 AI 资讯站点（https://viruspc.github.io/edges-brain-viruspc/ai-news/）的习惯：经常要点进原文看细节，再借助浏览器侧边栏 AI 插件理解文章。他希望点文章后右侧自动打开原文，并配合侧边栏 AI；侧边栏 AI 最好还能把会话上传到自建 Langfuse（https://langfuse.viruspc.tech），并把笔记沉淀回个人大脑。讨论里他先想到在站点里加内置浏览器，随后改口说其实是开一个内嵌外源页面的容器，并问除了内嵌框架还有没有更好的办法。把几条路排除掉之后，细看了自研浏览器扩展的方案。用户认为可以，要求先记一张任务卡，后面再用 grill 细聊，这次先不开工。

- 已排除的方案及原因：用内嵌框架（iframe）显示原文，多数原文站点设置了 X-Frame-Options 或内容安全策略的 frame-ancestors，嵌进去会是白屏，而且侧边栏 AI 插件也读不到内嵌框架里的正文；在服务端反向代理原文后再显示，登录态、付费墙和页面脚本都会出问题，还有版权风险；网页里的脚本触发不了浏览器自带分屏，用脚本打开独立小窗口再摆到右半边，效果也不稳定。
- 仍可作为备选、但不是当前主方案的路径：站内阅读模式，用数据仓 cleaned 里已抓好的全文在站点中渲染，缺全文的文章仍需跳转原文；用 Electron 或 Tauri 做桌面壳，壳里可以同时放原文和 AI 面板，但浏览器里现成的 AI 插件装不进去，侧边栏 AI 只能自建，工作量最大。
- 预期收益：原文按原样打开，登录态、付费墙和图片都正常；读原文、向 AI 提问、把会话和笔记存回去，可以连成一条路径。
- 非目标：这张卡只记录已谈清的方向，不开始实现。不做内嵌框架，也不做服务端反向代理。不把桌面壳当作第一步。
- 约束：Langfuse 密钥和 GitHub 令牌只存放在用户本机的 chrome.storage，不写入仓库或这张卡片。卡片里不写密钥、内网地址等敏感信息。笔记经 GitHub 接口开拉取请求到 edges-brain-viruspc，不直接推送主分支。站点上的「分屏读」按钮属于站点交互，验收时仍要同时看手机、电脑、浅色和暗色；这款扩展在手机上不可用，未安装扩展时按钮应退回为普通新标签打开原文。
- 开工前还要用 grill-with-docs 细聊的问题：侧边栏是继续用现成 AI 插件（会话多半导不出来，往往只能做分屏），还是做扩展自带的 Side Panel；模型怎么选；扩展用开发者模式安装，还是发到商店当私有扩展；Arc 对分屏和 Side Panel 的支持要考虑到什么程度；要不要先做站内阅读模式。
- 关联：栏目名是「AI 资讯」，页面做在脑仓 site/ 的 /ai-news/，不要改 VirusPC/blog。笔记格式走 edges-create-notes。会话追踪可参考 edges-langfuse-agent-tracing。传到 Langfuse 时，文章网址和条目编号这类需要筛选的业务维度，按已有约定写入可过滤的 metadata，不要只挂裸属性。细化并动手前，按仓内约定先检索项目记忆，再用 grill 达成共识，然后出中文实现计划并发布预览，经用户确认后再改代码。同一 Project 下已有「ai-news 周报在 Astro 博客上可视化展示」等资讯站点卡。

**目标：**
做成一款自研的 Manifest V3 Chrome 与 Edge 扩展，并在 AI 资讯站点的每篇文章旁加上「分屏读」按钮。装了扩展后，点击按钮会把文章网址、期号和条目编号交给扩展，站点与原文左右分屏，或在同一窗口打开 Side Panel；扩展自带的 Side Panel 能读取原文正文并问答，还能把带文章网址与条目编号的追踪传到自建 Langfuse，以及按 edges-create-notes 的格式生成中文笔记、经 GitHub 接口向 edges-brain-viruspc 开拉取请求。未安装扩展时，按钮只作为普通新标签打开原文。密钥只存在用户本机。

**动作：**
- 开工前先用 grill-with-docs 把背景里那些待定问题聊清；按仓内约定，达成共识后再出中文实现计划并发布预览，经用户确认后再改代码。
- 第一步：在站点每篇文章旁加上「分屏读」按钮，并在扩展的清单里允许 viruspc.github.io 通过 externally_connectable 把文章网址、期号和条目编号发给扩展。扩展用 chrome.system.display 和 chrome.windows 把站点窗口与原文窗口左右各放一半，或在同一窗口打开 chrome.sidePanel。未安装扩展时，按钮退回为普通新标签打开。
- 第二步：扩展自带 Side Panel，用内容脚本读取原文正文并做问答；在 Side Panel 里提供「传 Langfuse」和「存回 brain」两个按钮，分别把这次问答整理成一条带文章网址与条目编号的追踪发到自建 Langfuse，以及按 edges-create-notes 的格式生成中文笔记、经 GitHub 接口开拉取请求到 edges-brain-viruspc。

完成标准待 grill-with-docs 后再补。
