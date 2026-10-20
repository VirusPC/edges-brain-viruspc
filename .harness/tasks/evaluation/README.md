# Evaluation

知识库/Agent Evaluation 评测与可重复 cases（benchmark、评测流水线等）。

<!-- project-entries-local:start -->
## 本层内容

- [find\_public\_memory\_benchmarks](<backlog/2026-09-11--%E6%89%BE%E5%85%AC%E5%BC%80benchmark%E8%AF%81%E6%98%8Ememory%E6%9C%89%E6%95%88%E6%80%A7/INDEX.md>) — 寻找公开 benchmark，用于证明本套 memory 体系的有效性
- [knowledge\_base\_evaluation\_system](<backlog/2026-09-13--%E7%9F%A5%E8%AF%86%E5%BA%93Evaluation%E7%B3%BB%E7%BB%9F/INDEX.md>) — 用 edges 自有内容出可复跑的问答评测集，对照 Edges 项目记忆与无记忆、全文检索的差异。
- [locomo\_four\_arm\_exploratory](<backlog/2026-09-16--LoCoMo%E5%9B%9B%E8%87%82%E6%8E%A2%E7%B4%A2%E5%AF%B9%E7%85%A7/INDEX.md>) — LoCoMo 四臂探索对照（baseline已有｜补 RAG｜PM\-online｜empty）；非 PM proof
- [swe\_contextbench\_main\_eval](<backlog/2026-09-16--SWE-ContextBench%E4%B8%BB%E8%AF%84%E6%B5%8B/INDEX.md>) — SWE\-ContextBench 主评测（公开基准证明）；与 LoCoMo 冒烟分开，构念匹配的主证据任务
- [evaluation\_cases\_register\_repeatable](<backlog/2026-09-16--evaluation-cases%E7%99%BB%E8%AE%B0%E5%8F%AF%E9%87%8D%E5%A4%8D%E7%94%A8%E4%BE%8B/INDEX.md>) — 在 evaluation/cases 登记可重复 case 定义；冒烟本次只写 reports，cases 另开
- [edges\_skills\_agent](<backlog/2026-10-11--edges-skills-%E4%B8%8E-Agent-%E5%9B%9E%E5%BD%92%E8%AF%84%E6%B5%8B/INDEX.md>) — 用固定真实任务做回归集，自动检查 Agent 是否按 skill 执行、是否守住 AGENTS.md 硬约束。
- [locomo\_observation\_trace\_exporter](<backlog/2026-10-19--LoCoMo%E8%B5%B0Observation-TraceExporter/INDEX.md>) — LoCoMo 评测改走 Observation 的 TraceExporter 上报轨迹，调用方不依赖 Langfuse。
- [retrieval\_eval\_的\_pi\_client\_会跑出被测仓库副本](<done/2026-10-19--retrieval-eval-%E7%9A%84-pi-client-%E4%BC%9A%E8%B7%91%E5%87%BA%E8%A2%AB%E6%B5%8B%E4%BB%93%E5%BA%93%E5%89%AF%E6%9C%AC/INDEX.md>) — pi client 没有沙箱，检索时会跑出被测副本，到外层仓库里去搜，样本因此被污染。要让没有沙箱的 client 也只在被测副本里检索。
- [agent\_eval\_接入云沙箱干净快照重跑](<backlog/2026-10-20--Agent-Eval-%E6%8E%A5%E5%85%A5%E4%BA%91%E6%B2%99%E7%AE%B1%E5%B9%B2%E5%87%80%E5%BF%AB%E7%85%A7%E9%87%8D%E8%B7%91/INDEX.md>) — 给 Agent Eval 接上云沙箱，从干净快照重跑，才能公平对比有无 Edges，并把轨迹接到 Langfuse。
<!-- project-entries-local:end -->
