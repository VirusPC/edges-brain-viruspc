# Grok Bot HTML 预览：拖拽异常（产品问题）

来源：Coding Agent 专家转述；peng cheng 确认（2026-09-17）。

## 结论

Grok Bot **聊天里的 HTML 附件/预览**环境下，页面拖拽异常：HTML5 DnD 与自定义 pointer drag 都可能出问题（松手不触发、UI 不刷新、看不到成功 toast）。**同一 HTML** 在系统浏览器 / 本地 http server 下正常。

## Why / 背景

- **场景：** Task Project classify 审阅页（按住右侧 task 拖到左侧分组）。
- **排查：** Coding Agent 专家在 box 浏览器测通过；用户在 Grok Bot 预览里一直失败；用户确认「是 Grok Bot HTML 预览的 bug，其他环境都好」。
- **影响：** 不能在聊天预览里可靠做拖拽审阅；需下载后用外部浏览器打开，或改用非拖拽交互（用户明确只要拖拽）。

## How to apply

- 遇到 HTML 交互（尤其拖拽）在 Grok Bot 预览异常时，**先用系统浏览器/本地打开验证**，勿先判业务代码有问题。
- 可向 SpaceXAI / 产品侧反馈：Grok Bot HTML preview 的 DnD / pointer 事件异常。

## 交叉

- classify 审阅 HTML（`tools/classify-review` 或 `/workspace/classify-review`）
- `project-tasks-classify` 流程
- [ADR 0012](https://github.com/VirusPC/edges/blob/main/docs/adr/0012-task-project-review-page-is-render-only-cli.md)：Task Project 审阅页仍只渲染，不依赖本预览当闸门
- [ADR 0013](https://github.com/VirusPC/edges/blob/main/docs/adr/0013-artifacts-preview-service.md)：Artifacts 预览服务（聊天预览不可靠时的短生命周期托管出口）
