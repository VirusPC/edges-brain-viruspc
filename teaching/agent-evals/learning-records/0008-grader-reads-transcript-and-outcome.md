# Grader 同时可评 transcript 与 outcome

用户把关系链修正为「task 跑 trial 得到 transcript，grader 按 rubric 给 transcript 打 score，再汇总成 metric」，指出此前「grader 给 trial 打分」不够准确。补充澄清：每个 trial 留下 transcript 与 outcome；代码 grader 常查 outcome（如数据库状态），模型 grader 常读 transcript；代码 grader 不一定用 rubric。另：第 5 课起步应表述为从 20 到 50 个简单任务开始，任务优先来自真实失败，也可来自真实使用、手动检查和缺陷记录。
