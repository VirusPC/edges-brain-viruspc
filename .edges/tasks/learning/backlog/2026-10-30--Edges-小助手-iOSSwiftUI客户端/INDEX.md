---
metadata:
  edges-type: task
  edges-task-project: learning
  edges-updated-at: '2026-10-29T21:24:52.566Z'
  edges-title: Edges 小助手 iOS（SwiftUI）客户端
  edges-tasks-status: backlog
  edges-task-priority: none
name: edges_小助手_ios_swiftui_客户端
description: >-
  按 edges-rag POST /api/ask 契约，在 Mac/Xcode 验证并收口 VirusPC/edges-assistant-ios 原生
  SwiftUI 客户端。
---
**背景：**
2026-10-29～30 与全栈开发专家从「open-grokbot 能否上 iOS」谈到「自己封装 iOS App」，最终收敛为：不改后端，按公网 Edges 小助手契约（`POST /api/ask`，返回 `answer` + `citations`）做一个可在 Xcode 打开的原生 SwiftUI 工程。已建公开仓 VirusPC/edges-assistant-ios（工程名 EdgesAssistant），云端 Linux 无法代跑 Xcode；首次云端 push 曾失败，随后仓内已有 README / EdgesAssistant / xcodeproj。教学向讲解（Signing、模拟器、Swift 语言对照）较多，产品侧下一步是本机验证。
- 相关：公网试用页 https://edges-rag.viruspc.tech/ ；框架 README「Edges 小助手」入口已合（edges #82 / edges-rag #2）
- 非目标：不上架 App Store；不改 edges-rag 后端；不把 open-grokbot Workers/Agent 整栈搬进 iOS
- 关联：learning 卡「open-grokbot Electron/Tauri 桌面壳」是另一条线（#406），本卡只管 Edges 小助手 iOS 客户端

**目标：**
在装了 Xcode 的 Mac 上，能打开 EdgesAssistant 工程，对公网（或可改的 base URL）提问并看到回答与引用；仓内 README 足以让自己复现。

**动作：**
- 在 Mac 上 clone VirusPC/edges-assistant-ios，用 Xcode 15+ 打开 `EdgesAssistant.xcodeproj`
- 模拟器或真机跑通：示例回答 + 真实提问（公网 HTTPS）
- 按需修正 Signing / Bundle ID / README 最短步骤；不负责上架
- 验证完成后把本卡标 done，并在卡内或笔记记一句实测结论

**完成标准：**
- [ ] Mac 上 Xcode 能打开工程并成功 Run（模拟器或真机其一即可）
- [ ] 能展示本地「看示例回答」；真实提问能拿到非空 answer（网络可达时）
- [ ] README 仍写清：默认 API、改 base URL、Signing、不上架
