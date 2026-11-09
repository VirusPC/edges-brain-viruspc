# 区分 rubric、grader、score 与 metric

用户追问 rubric、grader 和 metrics 的关系。解释：rubric 是评分细则，grader 执行判分，score 是一次评分结果，metric 定义衡量表现的量，可以是单次运行的耗时、token 用量，也可以是跨任务的平均得分、通过率、pass@k 或 pass^k。指标不一定来自 rubric，也可来自代码检查或运行记录；不同工具的命名可能重叠，应看实际定义、取值范围与聚合口径。此条记录教学澄清，不代表已验证用户掌握。

补充：用户追问一个 grader 是否含多个 rubric、最终 score 是否就是 metric。澄清为：一个 grader 通常使用一套 rubric，其中可含多个评分项；一个任务也可挂多个 grader。score 是某次评分结果；只有被选作报告口径时才成为 metric，常见 metric 则是对多次 score 的聚合。
