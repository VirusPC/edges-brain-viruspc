# Mission: Agent 评测基础

## Why
系统补齐 Agent 评测的概念与方法：能读懂评测设计、会定义可验证的成功标准，并在后续自己设计或审阅 agent eval。目标是通用能力，不绑定某一产品或仓库。

## Success looks like
- 能准确使用并区分 task、trial、transcript、outcome、grader、harness、suite 等核心术语。
- 能把「看起来成功」与「环境状态可验证成功」分开。
- 能说明 capability vs regression、多 trial 指标（如 pass@k / pass^k）各自回答什么问题。
- 能根据真实失败起草一小批无歧义的评测任务，并选择合适的 grader 类型。

## Constraints
- 偏好中文、短课、可立刻自测；证据优先，不捏造数字或出处。
- 主文献以 Anthropic《Demystifying evals for AI agents》(2026-01-09) 为起点，辅以已核验的高信任资源。
- 教学工作区产出 HTML lesson / reference；不擅自改业务仓库。

## Out of scope
- 绑定某一具体项目的评测改造或线上重打分。
- 一次写完全部课程；先按最近发展区逐课推进。
