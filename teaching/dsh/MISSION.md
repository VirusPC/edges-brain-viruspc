# Mission: DeepSeek Harness（dsh）

## Why
把 dsh 当作日常编码助手先用熟，同时拆解其「一切皆插件 / profile 装配」架构，把可迁移的设计借鉴到自己直接基于 Pi（vendored `pi-agent-core` / `pi-ai` + `PiTurnRunner`）的 coding agent 上。

## Success looks like
- 能安全启动 `web` profile：空目录小任务、理解启动 token / 工作区选择 / 模型配置边界。
- 能准确区分：启动 **profile** ≠ 选择 **模型**；组合包 / patch / Cordis 插件各管什么。
- 能对照官方文档与可核验源码，说明 profile 如何由有序 bundle + `cordis.patch.yml` 叠成。
- 能写出「从 dsh 借鉴到自己 Pi agent」的取舍清单（不照搬未证实说法）。

## Constraints
- 中文、短课（约 5–10 分钟；第 1 课可扩到约 15–20 分钟分小节）、可立刻自测；证据优先。
- 以官方仓 `deepseek-ai/deepseek-harness`（标签 `dsh-v0.2.2-rc.1`）与文档站点为准；不要与商业 Harness.io 混淆。
- 本主题落在个人大脑 `VirusPC/edges-brain-viruspc` 的 `teaching/dsh/`（teach skill 约定目录）；课页经公网 `/teaching/dsh/` 访问。
- 课程内指导用户自行操作；不代跑付费模型调用、不收集 API key。

## Out of scope
- 把商业 Harness.io 插件生态当成 dsh。
- 未核验就断言「默认只有 web」「装插件就有 TUI」「主配置是 `~/.dsh/settings.yaml`」。
- 一次写完全部插件/迁移实现课；按最近发展区逐课推进。
