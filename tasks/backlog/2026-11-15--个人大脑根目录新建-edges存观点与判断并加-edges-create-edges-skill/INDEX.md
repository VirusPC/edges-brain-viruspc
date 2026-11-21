---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-15T14:49:18.616Z'
  edges-title: 改造现有认知优势目录 edges/：初始化 .edges 并加 edges-create-edges skill
  edges-tasks-status: backlog
  edges-task-priority: high
name: 改造现有认知优势目录_edges初始化_edges_并加_edges_create_edges_skill
description: >-
  在已有的「认知优势 (Edges)」目录上初始化 .edges，并补一个用于新写观点与判断的 skill，新文格式统一成「一句话 + 解释 +
  参考资料」。历史内容（除 backup）直接移到 notes/，backup 按归档约定移走。
---

**背景：**
今天你先提：在个人大脑根目录建一个叫 edges 的文件夹，专门记录一个个观点、洞察、判断和决策。每个点单独一篇，保持精简；并要求初始化 .edges，在 .edges 里补一个 edges-create-edges skill，格式是一句话加解释。原本准备直接交给云端 Agent 去做，你喊停，改成先记一张任务卡。开卡时发现根目录已有 edges/，README 标题是「认知优势 (Edges)」，用来放已经提炼、可复用的判断；现有格式要求每条有结论、理由、适用边界和检验方式，路径约定是 主题--核心洞察/INDEX.md；目录里还有大量历史导入内容，但没有 .edges。你确认要用的就是这个「认知优势」目录，不另起新目录。
- 你补充（2026-11-15 晚，Asia/Shanghai）：这个 edges/ 目录将是全仓库信噪比最高的地方。
- 现有笔记（notes）和任务（tasks）都装不下这种短小的单点判断。
- 关联：skill 命名与现有 edges-create-notes、edges-create-tasks 对齐。
- 你只读核对过：现有 edges/ 共 3136 个文件，全是历史导入的技术学习笔记和资料摘录（图形渲染&计算机视觉 1724、AI-LLM 418、前端 347、金融量化 127、数据可视化 106 等），没有一条符合 README 约定的 `主题--核心洞察/INDEX.md` Edge 格式。edges/backup 里是大模型课第一课讲义的两份旧版本（Lesson1 - LLM Foundation 1、第一课：大模型基础），配图与 edges/Lesson1 - LLM Foundation 相同，正文 INDEX.md 各不相同。
- 你决定：edges/ 下的历史内容（除 backup 外，包括顶层 4 个带日期的条目）整体直接移到 notes/ 下，不另建中间层，保留原有分类；之后 edges/ 只放新写的「一句话 + 解释 + 参考资料」条目。
- 你后来决定（2026-11-15 晚，Asia/Shanghai）：开卡时要求的格式是「一句话 + 解释」。你后来补充，格式末尾还要有参考资料，所以当前要求的格式是「一句话 + 解释 + 参考资料」。仍是一篇一个点，保持精简。
- 你决定：edges/backup 移到 archive/，按 archive/README.md 保留从仓库根起的原始相对路径，放到 archive/edges/backup/。
- 待核实：直接落到 notes/ 可能与已有子目录同名。顶层目录名对照，重名的是 memory（edges/memory 与 notes/memory 都在）；其余 edges/ 顶层目录与 notes/ 顶层没有同名。同名怎么并还没定，迁移时不能覆盖。
- 非目标：不另建第二个 edges/ 目录。迁移只移动不改写正文。

**目标：**
现有的认知优势目录 edges/ 完成 .edges 初始化，并配一个 edges-create-edges skill，新写的观点与判断可按「一句话 + 解释 + 参考资料」一篇一个点地写入。历史导入内容移出后，edges/ 只放这类新条目。

**动作：**
- 为现有 edges/ 初始化 .edges。
- 在 .edges 里加 edges-create-edges skill，规定每篇的格式是「一句话 + 解释 + 参考资料」，每篇只写一个点，保持精简。
- 把 edges/ 历史内容（除 backup）直接移到 notes/，保留原分类，不另建中间层；包括顶层 4 个带日期的条目。
- 把 edges/backup 移到 archive/，按 archive/README.md 放到 archive/edges/backup/。
- 迁移后修正受影响的内部链接。
- 更新 edges/README.md 为新定位（「一句话 + 解释 + 参考资料」、一篇一个点）。

**完成标准：**
- [ ] 现有 edges/ 里有初始化好的 .edges。
- [ ] .edges 里有 edges-create-edges skill，写明「一句话 + 解释 + 参考资料」这一完整格式，以及一篇一个点、保持精简的要求。
- [ ] edges/ 里只剩 README、.edges 和新格式条目。
- [ ] 原历史内容都在 notes/ 下且分类保留；没有另起第二个 edges/ 目录。
- [ ] backup 在 archive/edges/backup/。
- [ ] 仓库链接检查/构建通过。
