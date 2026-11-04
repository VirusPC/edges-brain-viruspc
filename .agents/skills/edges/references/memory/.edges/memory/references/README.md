<!-- edges-memory-type:start -->
name: reference
module: memory
writable: true
gitignore: false
format: ordinary
<!-- edges-memory-type:end -->

# REFERENCE — 外部引用

> 记：项目之外的信息去哪找，例如需求文档、设计稿、接口文档、监控面板、工单系统，以及各自的用途。
> 不记：链接里的内容本身，也不记密钥。
> 本文件只是索引，条目区块由脚本重算，正文写在 `references/reference_<slug>/index.md` 里。

<!-- edges-entries-local:start -->
## 本层内容

- [学术论文与 benchmark](reference_academic_papers/INDEX.md) — 记忆索引粒度、膨胀与检索的论文证据。
- [编码 agent 的工程实践](reference_coding_agents/INDEX.md) — 各家编码 agent / AI IDE 的记忆与 AGENTS.md 实践。
- [索引粒度的先验与阈值](reference_index_granularity/INDEX.md) — 索引粒度、路标 vs 摘要，以及可落地的阈值。
- [Agent Skills 规范正文](reference_official_skills_spec/INDEX.md) — 写或核对 SKILL.md / 普通记忆 YAML 头时查：顶层闭集、name 规则、metadata 用途。规范 https://agentskills.io/specification；本仓与生态落差见 extensions 的 reference\_skill\_format\_spec。
- [开源记忆框架](reference_oss_frameworks/INDEX.md) — 开源记忆框架的机制细节与源码取证。
- [同类方案调研：文件系统式记忆](reference_prior_art/INDEX.md) — 四路并行调研的综合结论，改变本方案决策的外部证据总入口。
<!-- edges-entries-local:end -->
