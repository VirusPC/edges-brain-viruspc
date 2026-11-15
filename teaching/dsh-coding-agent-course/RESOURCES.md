# DSH Resources

源码基线：`39163dd30f703a79079e2d2446545cff3c453738`，提交时间 `2026-11-13T07:37:50Z`；本轮只读源码与文档，没有安装或运行 DSH。

## Knowledge

- [官方仓库 README](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/README.md)：确认项目身份与官方入口。需要厘清 DSH 与第三方 UI/插件关系时读。
- [架构总览](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/architecture.md)：包职责、插件组合及 turn flow。用于建立架构导航图；已阅读与本课相关部分。
- [agent 包说明](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent/README.md)：公开控制面与 factory 边界。用于判断调用者依赖什么。
- [agent-loop 包说明](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent-loop/README.md)：默认驱动及 step 行为。用于解释执行职责。
- [AgentRegistry 实现](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent/src/index.ts)：`setFactory`、`create`、`resume`。用于验证接口到工厂的委派。
- [ReactLoopAgent 实现](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent-loop/src/agent.ts)：`step` 中模型流、工具调用分支和 `tools.execute`。用于验证执行循环；本轮重点阅读该分支。
- [agent-loop 插件入口](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/core/agent-loop/src/index.ts)：默认驱动的创建与生命周期。已取得源码；深度走读留给后续课。
- [Agent 生命周期](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/agent-lifecycle.md)：后续追踪完整生命周期；已取得资料，尚未系统讲解。
- [本机 teach 指令来源](https://github.com/mattpocock/skills/tree/main/skills/productivity/teach)：本轮实际加载已安装的 SKILL.md 及四份格式文件，用于课程组织和教学执行。

## Wisdom (Communities)

- [官方仓库 Issues](https://github.com/deepseek-ai/deepseek-harness/issues)：需要核实观察到的行为、复现差异或设计限制时使用。本轮未发帖；是否参与由学习者决定。

## Gaps

- 学习者尚未作答，无法判断已有知识和合适的下一课难度。
- 尚未选定比较对象；不提前宣称 DSH 相比其他 Agent 的优劣。
- 尚未运行示例；静态源码判断不等于运行验证或性能结论。
