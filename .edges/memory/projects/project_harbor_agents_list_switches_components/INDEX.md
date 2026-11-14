---
name: project_harbor_agents_list_switches_components
description: 在 Harbor 做记忆消融或组件开关时打开：同一批 tasks 配多个 agents 即可切换；记忆若在任务环境文件里则需任务变体。
metadata:
  edges-title: Harbor 用同一批任务加多份 agent 配置切换组件
  edges-type: project
  edges-origin-session-id: daily-retro-2026-11-13
  edges-agent-client: grok-bot
  edges-username: 日复盘
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: '2026-11-13T05:24:50+08:00'
---

Harbor 的 job 里 `agents` 是一个列表，每一项可以单独配 `skills`、`mcp_servers`、`env` 和 `kwargs`。它会把每个任务和每个 agent 配置两两组合着跑，所以同一批任务、同一个模型，写两个 agent 配置就能切换 memory-on / memory-off 这类组件，不必把题库打包成两套任务。

记忆装在哪里，决定怎么切。如果记忆是通过 MCP、skill 或环境变量接进来的，在 agent 配置里切就行。如果记忆是任务环境自带的文件，例如仓里的 `.edges` 目录，那它属于任务本身，就得做两个任务变体，或者用一个环境变量在 setup 阶段把它去掉。

同名 agent 写两项能不能在结果里分清，对话里没有在文档中查到。建议先用 `harbor run -c config.yaml --print-config` 或 `--dry-run` 确认；分不清就拆成两个 job，用 `job_name` 区分。

**Why:**
2026-11-12 用户问「harbor可以直接切换不同组件？」。当时 memory-on 直接用线上 trace、不重跑，memory-off 在 Harbor 里重跑，两组的运行时间、环境和随机性都不一样。若都放进 Harbor 跑，比较更干净。Harbor 也支持用 `load_trajectory` 加载 ATIF 或原生 trajectory，但它只恢复对话，不恢复沙箱文件，所以不等于重放线上那次运行。

**How to apply:**
做记忆消融或组件开关时，优先用同一批 tasks 加两份 agent 配置，而不是复制题库。先确认记忆是挂在 agent 上，还是写在任务环境里。结果分不清时拆 job，不要假设同名两项一定能分开。不要把 `load_trajectory` 当成完整重放线上运行。
