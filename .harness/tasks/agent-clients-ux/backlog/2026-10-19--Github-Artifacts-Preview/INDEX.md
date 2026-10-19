---
metadata:
  edges-type: task
  edges-task-project: agent-clients-ux
  edges-updated-at: '2026-10-19T18:28:33.612Z'
  edges-title: Github Artifacts Preview
  edges-tasks-status: backlog
  edges-task-priority: none
name: github_artifacts_preview
description: 用 GitHub Pages 提供常开预览 URL，替代依赖自建服务端的 Artifacts Publish；浏览器看页，Grok 里继续决策。候选含 CF Pages 直传与 Tunnel+Nginx。
---
**背景：**
今晚聊 Grok Artifacts 预览体验：聊天里点开 HTML 会挡住对话，关掉后又丢 widget 选项，手机更没法分屏；grill-with-docs 也吃过「不能边聊边选」的亏。判断最好是发布成常开 URL，在浏览器打开，有问题再回 Grok 边聊边选。现有 Artifacts Publish 能出 URL，但绑服务端；希望有不依赖服务端的简单路径，并点名 GitHub Pages。进一步认为自建 Artifacts 预览服务也可以不要，默认就走 Pages，称之为 **Github Artifacts Preview**。
- 相关现状：已有 Artifacts Publish / ECS 预览；看板里已有「专用仓 + GitHub Pages」「预览服务打进 npm」等卡，方向需与本口径对齐
- 预期收益：预览与决策解耦；无服务端也能用；手机可用
- 非目标：不在本卡做 Pages 页内写回仓库；不要求立刻下线 ECS（可另卡退役）
- 关联：`Artifacts 预览改走专用仓 + GitHub Pages`；`artifacts 预览服务随 npm 包发布…`；看板可视化 Skill（artifacts publish）

**目标：**
edges / Grok 工作流默认用 GitHub Pages 发布静态预览（Github Artifacts Preview），对话里继续做选择；不再把自建 Artifacts 预览服务当成必需依赖。

**候选方案：**（2026-10-20 调研补充；未拍板）

1. **Cloudflare Pages Direct Upload（`wrangler pages deploy`）**
   - 形态：本机/Grok Bot box 生成 HTML → wrangler 上传 → `*.pages.dev` 常开 URL
   - 优点：免费档可用；秒级出链；不依赖 box 在线；不暴露本机端口；比自建服务运维轻
   - 代价：需要 Cloudflare 账号 + API token（Pages 编辑）+ account ID；站点默认公网可读，内容需脱敏
   - 相对 Nginx：不是在本机起站，而是上传到 CDN 托管

2. **Cloudflare Tunnel + Nginx（本机或 ECS 养静态站）**
   - 形态：Nginx 提供静态文件；Tunnel（或有公网 IP 时橙云/反代）挂出外链
   - 优点：完全自控路径/鉴权；与现有 ECS Artifacts 预览心智接近
   - 代价：要常驻 Nginx + Tunnel；链接依赖进程与机器在线；比 wrangler 运维重
   - 说明：仅 Nginx 不够——box 无公网 IP 时外网进不来，必须有 Tunnel 或公网机

对照：GitHub Pages 仍是「零 Cloudflare 账号」候选，但免费仅公开仓、部署有 Actions 延迟、私有可读性受限；纯 GitHub（raw / Actions artifact / gist）无法优雅提供私有仓可渲染常开 HTML。artifact.ci / nightly.link 偏 CI 报告，不适合当通用 Artifacts Preview 默认宿主。

倾向（未定）：快速发 HTML 默认走方案 1；需要自控/鉴权宿主时用方案 2。

**动作：**
- 定发布约定：专用仓或 gh-pages、路径/TTL/覆盖策略、与现有 `artifacts publish` 的关系（替换或降级为可选）
- Skill / CLI：HTML plan、grill-with-docs 等产出优先 publish 到 Pages 并回传 URL
- 回看相关 backlog，改口或合并，避免继续推「服务端必装」路线

**完成标准：**
待 grill-with-docs 补
