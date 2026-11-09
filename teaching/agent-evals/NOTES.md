# Notes

- 2026-11-09：用户澄清 mission——系统补齐 Agent 评测概念与方法，**不绑定具体项目**。此前误写成 Edges /「用户是 Agent Eval 专家」已纠正（那是 bot 角色，不是用户标签）。
- 教学偏好：中文、约 5 分钟一课、可验证成功标准、自测题要即时反馈；选项长度尽量一致。
- 交付形态：模块化源文件 + 可离线打开的单文件 portable HTML；不用 Canvas。
- 2026-11-09：Lesson 02 三类 grader 已写（源 lessons/0002 + portable lesson-02.html）。
- 2026-11-09：边学边问默认记到本课 `learning-records/`（不默认进 edges）；重要洞见用 learning-record 格式落盘。
- 2026-11-09：用户要求 Demystifying evals 的**全部课与笔记**都同步进大脑仓库 VirusPC/edges-brain-viruspc（`teaching/agent-evals/`，PR #452）。此前「边学边问不默认进 edges」仅指不自动写入 edges 知识库笔记流；课程 learning-records 仍应随课入库大脑。
- 用户已熟悉 Langfuse Evaluator（含代码型）与 human annotation，可与三类 grader 对照，勿当成初学者从零介绍。

- 2026-11-09：用户要求课程入库个人大脑；已取消云端 Agent，直接开 PR https://github.com/VirusPC/edges-brain-viruspc/pull/452 → teaching/agent-evals/
- 2026-11-09：Lesson 03 capability vs regression 已写；已同步到 edges-brain 教学目录（未 push）。

- 2026-11-09：用户问 Anthropic evaluation harness 用什么；记入 LR-0004。
- 2026-11-09：Lesson 04 pass@k vs pass^k；引用 engineering URL；乘方示意标为假设；不写掌握型 learning-record；artifacts 发布 portable。
- 2026-11-09：用户问 rubric 含义；记入 LR-0005，术语首次出现需先解释。

- 2026-11-09：用户问 Harbor rubric grader，核对官方 Rewardkit 文档并记入 LR-0006。

- 2026-11-09：澄清 rubric / grader / score / metric 的关系，记入 LR-0007。

- 2026-11-09：用户纠正评分关系链，补 outcome；LR-0008 关系链已吸收进第 5 课；暂停已解除。
- 2026-11-09：Lesson 05 读 transcript/核 outcome/归因；20–50 标为建议起步；artifacts 发布；不写掌握型 LR。
- 2026-11-09：用户标记「约 20–50 道简单任务」起步规模值得记，记入 LR-0009。
- 2026-11-09：Lesson 06 框架 vs 任务/grader 质量；结课闭环；Harbor Rewardkit 仅作便利层例；artifacts + 入库大脑 PR452。答案序列 C/B/D/A。
