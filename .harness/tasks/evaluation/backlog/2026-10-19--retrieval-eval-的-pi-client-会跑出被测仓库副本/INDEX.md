---
metadata:
  edges-type: task
  edges-task-project: evaluation
  edges-updated-at: '2026-10-19T05:27:35.812Z'
  edges-title: retrieval eval 的 pi client 会跑出被测仓库副本
  edges-tasks-status: backlog
  edges-task-priority: none
name: retrieval_eval_的_pi_client_会跑出被测仓库副本
description: pi client 没有沙箱，检索时会跑出被测副本，到外层仓库里去搜，样本因此被污染。要让没有沙箱的 client 也只在被测副本里检索。
---
**背景：**
PR #294 给 retrieval eval 加了 pi-coding-agent client（MiniMax-M3），pi 没有沙箱。2026-10-19 13:11（UTC+8）冒烟时，模型第一步就 `cd` 出了被测副本 `.harness/evaluation/.cache/retrieval/<repo>/<ref>`，到外层 edges 工作目录里去搜，得分 0，样本被污染（只读了外面的文件，没写坏东西）。上一轮冒烟碰巧没跑出去，得分 1.0。Codex 有沙箱，没遇到这个问题。用户决定 #294 保持现状，这个问题单独开卡。
- 涉及文件：`.harness/evaluation/retrieval_eval/run.py`、`config.py`
- 关联：PR #294

**目标：**
pi 以及以后没有沙箱的 client 只能在被测副本里检索，得分反映的是被测提交本身。

**动作（候选，待定）：**
1. 把被测副本挪到任何 git 仓库之外的临时或缓存目录，路径可配置。这是根治办法。
2. 在提示词里限定只在当前目录检索。
3. 可选：去掉 pi 的 bash。这样 pi 和 Codex 的工具就不对等了，而且用绝对路径照样能读到外面。
4. 可选：记录工具调用有没有用到当前目录之外的路径，把越界的样本标出来。
5. 后续：给 pi 补一个沙箱插件，让它和 Codex 一样在受限环境里跑。

**完成标准：**
- [ ] pi 冒烟里不再出现越界路径
- [ ] 越界会被检测并标记
- [ ] Codex 的结果不受影响
- [ ] 有对应测试
