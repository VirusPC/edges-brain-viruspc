# Harbor 三组记忆消融已迁入 Edges

本实验验证 Edges 自身的分层记忆架构，程序与脱敏聚合报告由框架评测区维护；个人框架选型项目只保留本入口。

- [实验程序与运行说明](https://github.com/VirusPC/edges/tree/e73accc3b2b04b19b53fb926de7d7827f1035042/packages/evaluation/experiments/harness_memory_ablation/harbor)：`packages/evaluation/experiments/harness_memory_ablation/harbor/`
- [2026-11-09 真实实验聚合报告](https://github.com/VirusPC/edges/blob/e73accc3b2b04b19b53fb926de7d7827f1035042/packages/evaluation/reports/2026-11-09-harbor-memory-ablation.md)
- [框架迁移草稿 PR](https://github.com/VirusPC/edges/pull/114)

迁移保持 13 个非 README 程序、依赖和测试文件字节一致，迁移后 53 项离线测试与框架原有 18 项测试通过。279 次正式 trial 的结果与冻结来源未改变，未为迁移重新调用模型。真实问题、来源标识和原始日志仍保持非公开。

本仓历史提交 `53fdde090f621e76e26117fa3f5fbd76928b5281` 保留正式运行时的程序；历史复现继续使用当次冻结 source 与协议。既有四框架选型研究和其他程序保持原归属。
