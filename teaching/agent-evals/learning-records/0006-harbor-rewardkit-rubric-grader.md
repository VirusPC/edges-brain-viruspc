# Harbor 官方 Rewardkit 支持声明式 rubric grader

用户问 Harbor 是否自带方便定义 rubric 的 grader。2026-11-09 核对官方文档：Harbor 团队维护独立包 harbor-rewardkit，可用 TOML 声明 judge 与 criterion；rubric 类型用从差到好的 levels 定义评分档位，也支持 binary、likert、numeric、权重与聚合。应区分 Harbor 的 verifier 执行入口和 Rewardkit 的评分便利层；现成运行机制不代表评分标准已与人类校准。

来源：https://docs.harborframework.com/rewardkit/judge-criteria 、https://docs.harborframework.com/tasks/verifier
