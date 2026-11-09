# 相关高信任资源（已 WebFetch 核验）

整理时间：2026-11-09 Asia/Shanghai。每条 URL 均实际抓取过；404 已剔除。

## Knowledge（5–8 条核心）

1. **[Demystifying evals for AI agents（Anthropic）](https://www.anthropic.com/research/demystifying-evals-for-ai-agents)**  
   本文主文。Agent eval 术语、三类 grader、capability/regression、pass@k vs pass^k、从 0 到 1 路线图。Use for: 课程主轴与术语表。

2. **[Building effective agents（Anthropic）](https://www.anthropic.com/research/building-effective-agents)**  
   主文 Introduction 明确引用；workflows vs agents、何时用 agent、工具 ACI。Use for: 理解“被评对象是 harness+model”的前置架构语境。

3. **[Your AI Product Needs Evals（Hamel Husain）](https://hamel.dev/blog/posts/evals/index.html)**  
   产品级 eval 经典：L1 断言 / L2 人机 / L3 A/B；强调看 traces、领域专用 eval。Use for: 与 Anthropic 路线图对照的“工程落地”视角。

4. **[Using LLM-as-a-Judge（Hamel Husain）](https://hamel.dev/blog/posts/llm-judge/index.html)**  
   Critique Shadowing：领域专家 pass/fail + 批评 → 校准 LLM judge；TPR/TNR 而非裸 agreement。Use for: 校准 Edges 相关 LLM grader（含 user_disagreement 类分数）。

5. **[τ-bench 论文（arXiv:2406.12045）](https://arxiv.org/abs/2406.12045)**  
   引入 **pass^k**；用最终 DB 状态对照 annotated goal；工具–agent–用户交互。Use for: 可靠性指标定义与公式出处。

6. **[Inspect AI — Using Agents（UK AISI）](https://inspect.aisi.org.uk/agents.html)**  
   主流 agent eval harness 文档：react、sandbox、Inspect SWE（含 Codex CLI）。Use for: 实际跑 coding agent / Codex harness 评估。

7. **[Harbor（harborframework.com）](https://harborframework.com)**  
   主文 Appendix 提到的容器化 agent eval/优化框架；Terminal-Bench 2.0 官方路径。配套公告：[Terminal-Bench 2.0 and Harbor](https://www.tbench.ai/news/announcement-2-0)。Use for: 与 Inspect 对照的另一套 coding/agent 评测基础设施。

8. **[SWE-bench Verified](https://www.swebench.com/verified)**  
   主文 coding 节核心基准：500 道人工校验 GitHub issue；测试套件判分。Use for: coding capability/regression 外部标尺。

### 补充（主文提及、已核验入口）

- **[Langfuse Evaluation Overview](https://langfuse.com/docs/evaluation/overview)** — 自托管可观测 + 离线/在线评估；用户已有自建 Langfuse 时直接对照。  
- **[τ-bench GitHub（Sierra）](https://github.com/sierra-research/tau-bench)** — 代码与数据（仓库注明部分任务过时，可另跟 τ³）；与论文配套。

## Wisdom（实践者社区，已核验存在）

1. **[Latent Space Discord](https://discord.gg/xJJMRaWCRt)**（入口说明：[Join the Latent.Space Community](https://latent.space/p/community/)）  
   AI Engineer / evals 导向社区；有 Paper Club、城市 meetup。配套知识页：[Evals — Latent Space wiki](https://latent.space/wiki/evals/)（直接引用 Anthropic 本文与 Hamel）。Use for: 问“别人怎么建 product eval / 读 transcript”。

2. **[r/AIEval](https://www.reddit.com/r/AIEval)**  
   Reddit 子版：AI/LLM evaluation、benchmark、safety；规则要求贴合 eval 主题。Use for: 异步讨论评测设计与踩坑。

3. **[Terminal-Bench / Harbor 社区（Discord，公告称约 1k 成员）](https://www.tbench.ai/news/announcement-2-0)**  
   公告写明 Terminal-Bench 社区 Discord；偏 coding/agent harness 与任务质量。Use for: 容器化 coding agent 评测与任务验题经验。（具体 invite 以 tbench/Harbor 站点当前入口为准。）


### 本课补充（第 6 课）

- **[Anthropic engineering 同文](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)** — 与 research 路径同文；附录框架列表与「投资任务/grader」。Use for: 框架立场与 Swiss Cheese。
- **[Harbor Rewardkit · Judge criteria](https://docs.harborframework.com/rewardkit/judge-criteria)** — 声明式 rubric/权重/采样/guard；不替代业务标准与人对齐。Use for: 框架便利层示例。

## Gaps

- τ2-Bench / BrowseComp / WebArena / OSWorld：主文有提，本轮未逐一深读；需要时可单开抓取。
- Braintrust / LangSmith / Arize 产品页：主文 Appendix 有述；若课程要比框架，再补官方 docs 摘要。
