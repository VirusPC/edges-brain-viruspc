任务：
给定30+数据源，用不同 AI Desktop 做多Agent资料汇总任务。

结论：
看重质量用Manus，看重价格用Kimi。Minimax agent teams 能力表现一般。
1. 并行度：Manus（全部并行） > Kimi （5个一batch，batch之间并行）> Minimax（约7个一batch，batch之间串行）
2. 价格：Manus >> Kimi ≈ Minimax
3. 效果：Manus > Kimi > Minimax

Claude：
![[edges/_eval_agent_desktop/多信息源下的汇总资料能力/Pasted image 20260625215636.png]]
Manus：
![[edges/_eval_agent_desktop/多信息源下的汇总资料能力/Pasted image 20260621155726.png]]
Kimi：
![[edges/_eval_agent_desktop/多信息源下的汇总资料能力/Pasted image 20260621155432.png|815]]


Minimax：
![[edges/_eval_agent_desktop/多信息源下的汇总资料能力/Pasted image 20260621155613.png]]