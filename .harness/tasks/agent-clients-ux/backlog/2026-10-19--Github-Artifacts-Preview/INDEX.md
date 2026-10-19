---
metadata:
  edges-type: task
  edges-task-project: agent-clients-ux
  edges-updated-at: '2026-10-19T17:06:40.558Z'
  edges-title: Github Artifacts Preview
  edges-tasks-status: backlog
  edges-task-priority: none
name: github_artifacts_preview
description: 用 GitHub Pages 提供常开预览 URL，替代依赖自建服务端的 Artifacts Publish；浏览器看页，Grok 里继续决策。
---
**背景：**
今晚聊 Grok Artifacts 预览体验：聊天里点开 HTML 会挡住对话，关掉后又丢 widget 选项，手机更没法分屏；grill-with-docs 也吃过「不能边聊边选」的亏。判断最好是发布成常开 URL，在浏览器打开，有问题再回 Grok 边聊边选。现有 Artifacts Publish 能出 URL，但绑服务端；希望有不依赖服务端的简单路径，并点名 GitHub Pages。进一步认为自建 Artifacts 预览服务也可以不要，默认就走 Pages，称之为 **Github Artifacts Preview**。
- 相关现状：已有 Artifacts Publish / ECS 预览；看板里已有「专用仓 + GitHub Pages」「预览服务打进 npm」等卡，方向需与本口径对齐
- 预期收益：预览与决策解耦；无服务端也能用；手机可用
- 非目标：不在本卡做 Pages 页内写回仓库；不要求立刻下线 ECS（可另卡退役）
- 关联：`Artifacts 预览改走专用仓 + GitHub Pages`；`artifacts 预览服务随 npm 包发布…`；看板可视化 Skill（artifacts publish）

**目标：**
edges / Grok 工作流默认用 GitHub Pages 发布静态预览（Github Artifacts Preview），对话里继续做选择；不再把自建 Artifacts 预览服务当成必需依赖。

**动作：**
- 定发布约定：专用仓或 gh-pages、路径/TTL/覆盖策略、与现有 `artifacts publish` 的关系（替换或降级为可选）
- Skill / CLI：HTML plan、grill-with-docs 等产出优先 publish 到 Pages 并回传 URL
- 回看相关 backlog，改口或合并，避免继续推「服务端必装」路线

**完成标准：**
待 grill-with-docs 补
