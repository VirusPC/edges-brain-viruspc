<!-- project-memory-type:start -->
name: project
module: memory
writable: true
gitignore: false
format: ordinary
<!-- project-memory-type:end -->

# PROJECT — 项目上下文

> 记：进行中的工作、关键时间点，以及无法从代码或 git 历史推导出来的决策及其原因，还有项目内的规范。对不上 `user` / `feedback` / `reference` 时也走这里（兜底）。
> 不记：架构、目录结构、文件路径、调试过程——这些直接读代码更准。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。相对日期换成绝对日期。
> 本文件只是索引，条目区块由脚本重算，正文写在 `projects/project_<slug>/index.md` 里。

<!-- project-entries-local:start -->
## 本层内容

- [Benchmark 审稿先看构念、数据、区分度与公平协议](project_benchmark_review_checklist/INDEX.md) — 设计或审阅 agent-memory / long-context 类 benchmark、或判断仓内冒烟分数能不能当证明时：先看构念效度 → 数据可信 → 区分度 → 可复现公平协议；分数表是证据不是贡献。全文见 knowledge/projects/memory/2026-09-16-benchmark-review-checklist.md。LoCoMo 个案仍看十问笔记；ADR 0008：Evaluation Smoke ≠ Benchmark Proof。
- [LoCoMo 可借的是造数哲学（结构先于互动），不是 QA 分](project_locomo_generator_structure_before_interaction/INDEX.md) — 决定从 LoCoMo 借什么、或评 PM / 事件图世界模型时：可借的是 persona→G→按日切 session→接地对话，不是官方 QA 分。只跑 QA 测不到 online write→use 或事件图世界模型。全文见 knowledge/projects/memory/2026-09-16-LoCoMo-paper-10-questions.md「补充：合成造数逻辑、宣传落差与审稿站台」。四臂仍 paused；分数按 ADR 0008 不是 PM proof。
- [LoCoMo 官方冒烟走 VirusPC/locomo submodule](project_locomo_official_submodule_path/INDEX.md) — 跑或改 LoCoMo Evaluation Smoke 时：首选 .harness/evaluation/run\_locomo\_official.py（submodule 官方 evaluate\_qa.py / evaluation.py F1）。print-command 无 key；真实 smoke 用 KIMI\_API\_KEY + kimi-for-coding。.harness/evaluation/cases/locomo-smoke 是 legacy hand-port。不是 Benchmark Proof / Project Memory proof。
- [LoCoMo 官方 QA 是事后静态库，不等于 PM-online](project_locomo_online_produce_consume_vs_posthoc_qa/INDEX.md) — 评 Project Memory / PM-online 或对照官方 RAG/截断基线时：官方 QA 是事后静态库，不等于对话中 write→use。全文见 knowledge/projects/memory/2026-09-16-LoCoMo-paper-10-questions.md「补充：过程中产生/消费 vs 事后静态库」。四臂仍 paused；分数按 ADR 0008 不是 PM proof。
- [LoCoMo 冒烟是截断上下文基线，dummy dry-run 无 API](project_locomo_smoke_truncated_baseline/INDEX.md) — 改 .harness/evaluation/cases/locomo-smoke 时：这是 legacy hand-port。新跑用 .harness/evaluation/run\_locomo\_official.py。dummy 仍可用 python3 run.py dry-run（不要 key）。真实 run 若走旧入口：KIMI\_API\_KEY + OPENAI\_BASE\_URL=https://api.kimi.com/coding/v1，模型 kimi-for-coding。SUT 是上游 locomo 打分；不要接 Project Memory。
- [检索评测 runner 已按 URL、codex、样本集实现](<project_retrieval_eval_migration/INDEX.md>) — 检索评测配置是 git URL（可选 ref）、agent client、samples。入口 .harness/evaluation/retrieval\_eval/run.py：print\-command 只打印命令，run 克隆后用 codex exec 只读沙箱打分。实机六题尚未跑。分数只是评测冒烟。
- [评测作用域有自己的 .harness](<project_evaluation_scope_own_harness/INDEX.md>) — 查评测层决策或给检索题标 gold 时：.harness/evaluation 自带 .harness。LoCoMo 官方冒烟入口在这一层的项目记忆 INDEX，不在根 .harness/memory，也不等于评测 README。
<!-- project-entries-local:end -->
