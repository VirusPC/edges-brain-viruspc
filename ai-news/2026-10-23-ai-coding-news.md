覆盖窗口：2026-10-16～2026-10-22（生成日 2026-10-23）。

## 〇、薅羊毛

本期为补录。linux.do 福利 RSS 当前只剩生成日之后的帖子，Wayback 没有该地址的存档，窗口内的社区帖补不回来。订阅里没有核对到落在本窗口的开发者额度或订阅优惠。

#### The full Claude Platform, available on Google Cloud

Claude Models on Google Cloud（Anthropic 托管）现已正式开放，提供完整 Claude Platform 功能，并支持 Google Cloud IAM、统一账单及承诺额度抵扣。

> 原始链接：[The full Claude Platform, available on Google Cloud](https://claude.com/resources/articles/claude-models-on-google-cloud-anthropic-managed)（发布日 2026-10-22）

#### Introducing Qoder Lite: Start creating with Qoder for $10 a month

Qoder Lite 面向全球用户推出，月费 10 美元，包含每月 1,000 Credits 和精选模型，并提供 Qoder 全套功能及 Agent 能力，涵盖 Cloud Agents、Repo Wiki、IDE、CLI 等产品。

> 原始链接：[Introducing Qoder Lite: Start creating with Qoder for $10 a month](https://qoder.com/blog/qoder-lite)（发布日 2026-10-21）

#### See Your Runner's Desktop

Amp 现支持查看并控制 macOS 或 Linux Runner 桌面，便于试用 Amp 构建的原生应用（如 iOS 应用）。

> 原始链接：[See Your Runner's Desktop](https://ampcode.com/news/runner-desktop)（发布日 2026-10-16）

<br/>

## 一、本周关键词

MiniMax M3.1 Flash，DeepSeek V4.1 Flash

Reflection Beam 上 AWS，Claude Duet 开始候补

天猫数字员工，美团的 AutoResearch

<br/>

<br/>

## 二、模型进展

#### 整体排名

LLM Arena（同一份全量数据集，overall，榜单发布日 **2026-10-22**）。相对 2026-10-20 没有新模型进入 Top-15，图中不标 NEW。本环境无 Artificial Analysis 密钥，不单列 AA 小节。

![LLM Arena Top15 2026-10-22](llm-arena-top15-2026-10-22-marked.png)

#### MiniMax M3.1 Flash

MiniMax 公众号：M3.1 Flash 正式更新。文中称此前匿名处理超过 200T token 的 Space Bunny 是它的早期版本。Agent 任务、编程、计算机使用和网络安全有代际提升，线上推理速度约到原来的 3 倍，使用成本降低 70%。

> 原始链接：[MiniMax M3.1 Flash](https://mp.weixin.qq.com/s?__biz=MzE5MTA3NzcxMQ==&mid=2247489196&idx=1&sn=4c8b969db8bd136f47d7b1a7650790c4)（发布日 2026-10-19）

#### DeepSeek V4.1 Flash 1017

深度求索：网页、App 和 API 已切到 V4.1-Flash-1017。相对上一版，基准提升的同时缩短了任务时间和输出长度，并同步开放自研搜索 API。文中称在多个 Harness 下走到新的性能–费用帕累托前沿。

> 原始链接：[DeepSeek V4.1 Flash 新版本](https://mp.weixin.qq.com/s?__biz=Mzk0OTYwNzc3NQ==&mid=2247485876&idx=1&sn=2606d3fa9ac085f94290ddd1d94649cc)（发布日 2026-10-17）

#### Reflection Beam

AWS 机器学习博客（Wayback 补回的历史 RSS，当前 feed 只剩 11 月的约 20 篇）：Reflection 的 Beam 是面向 Agent 编码和长任务的开放权重模型。可以先用 SageMaker JumpStart 做实时端点，或用 HyperPod Inference 配合 JumpStart、SGLang、vLLM 做 Kubernetes 上的分布式 GPU。

> 原始链接：[Introducing Reflection Beam on AWS](https://aws.amazon.com/blogs/machine-learning/introducing-reflection-beam-an-open-weight-model-for-agentic-coding-on-aws/)（发布日 2026-10-16）

#### Removing images barely changed GPT-6 Luna’s SWE-bench Multimodal v2 score

在对SWE-bench Multimodal v2做消融测试时，作者用GPT‑6 Luna xhigh在三种条件（原始图片、OCR文本化、无图）上评估发现得分几乎不变，推测大多数题目所需信息都包含在文本或可从代码推导，只有少数任务需要图像信息，说明该基准对多模态能力的测试有限。

> 原始链接：[Removing images barely changed GPT-6 Luna’s SWE-bench Multimodal v2 score](https://sankalp.bearblog.dev/swe_multimodal/)（发布日 2026-10-20）

#### Train Qwen3 on AWS Trainium with torchtitan

介绍在单台 AWS trn2.48xlarge 上通过 torchtitan 使用 Trainium 训练 Qwen3 的三种方式：借助 Transformers v5、torchtitan 原生模型，以及 NKI MoE 内核；还演示注册自定义内核、加载和保存 safetensors 检查点及并行配置。

> 原始链接：[Train Qwen3 on AWS Trainium with torchtitan](https://aws.amazon.com/blogs/machine-learning/train-qwen3-on-aws-trainium-with-torchtitan/)（发布日 2026-10-21）

#### Fine-tuning GPT-OSS-20B for multilingual reasoning on Amazon SageMaker HyperPod

在 Amazon SageMaker HyperPod 上微调 GPT-OSS-20B，使其能用指定语言推理和作答：SFT 将推理语言正确率从 22% 提升至 100%，GRPO 在此基础上把答案语言正确率从 62% 提至 70%。

> 原始链接：[Fine-tuning GPT-OSS-20B for multilingual reasoning on Amazon SageMaker HyperPod](https://aws.amazon.com/blogs/machine-learning/fine-tuning-gpt-oss-20b-for-multilingual-reasoning-on-amazon-sagemaker-hyperpod/)（发布日 2026-10-20）

<br/>

## 三、项目开源

#### GitHub Trending（daily / all 前 5）

第三方 Trending RSS 没有这一天的存档。下面 5 条来自 Wayback 对 `github.com/trending`（Today / 全部语言）的存档，快照 **2026-10-22**。

> 存档：[2026-10-22 github.com/trending](https://web.archive.org/web/20261022014611/https://github.com/trending)

1. [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill)：给编码 Agent 用的分阶段安全审计技能。
2. [vllm-project/vllm](https://github.com/vllm-project/vllm)：高吞吐、省内存的大模型推理引擎。
3. [stablyai/orca](https://github.com/stablyai/orca)：并行跑多种编码 Agent 的环境。当日简介举例包括 Grok Bot 和 Claude Code。
4. [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom)：在工具输出、日志和检索片段进模型之前先压缩。存档页称编码 Agent 可少用约 20% 的 token。
5. [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)：让编码 Agent 少写不必要的代码。

#### DeepSeek 开源推理框架 DeepInfer

深度求索：在已开源的模型、TileLang 和算子库之外，把内部推理框架 DeepInfer 开源，用来调度大规模调用时的算力和电耗。

> 原始链接：[DeepSeek 开源推理框架](https://mp.weixin.qq.com/s?__biz=Mzk0OTYwNzc3NQ==&mid=2247485884&idx=1&sn=d457981abe7db1f1b5d600fc109dc836)（发布日 2026-10-20）

#### Turning Database Grading into RL Rewards: Post-Training Agents with ThinkingBox

ThinkingBox将代理任务结束后的数据库状态检查转为强化学习奖励，并按基座模型的成功概率离线筛选训练任务。

> 原始链接：[Turning Database Grading into RL Rewards: Post-Training Agents with ThinkingBox](https://huggingface.co/blog/microsoft/thinkingbox-training)（发布日 2026-10-22）

#### Ensemble forecasting with IBM Granite time-series models

IBM推出由四种预训练Granite时序模型组成的开源集成预测方案，无需再训练或拟合权重，可生成点预测和分位数预测。

> 原始链接：[Ensemble forecasting with IBM Granite time-series models](https://huggingface.co/blog/ibm-research/granite-timeseries-ensemble-r1)（发布日 2026-10-22）

#### Profiling TorchNeuron (Part 1): System-level profiling on AWS Trainium.

文章介绍如何用 torch.profiler 与 Neuron Explorer 分析 AWS Trainium 上的 PyTorch 推理耗时，并比较三种 RMSNorm 实现：独立算子耗时 2.355 毫秒，torch.rms_norm 与 torch.compile 融合后分别约为 403 和 376 微秒，可借…

> 原始链接：[Profiling TorchNeuron (Part 1): System-level profiling on AWS Trainium.](https://huggingface.co/blog/amazon/profiling-torchneuron-part-1)（发布日 2026-10-21）

#### NVIDIA Kumo Relational Outperforms Supervised Machine Learning on Relational Data, No Training Required

NVIDIA发布预训练关系数据基础模型Kumo Relational，可直接基于多表数据库以上下文学习完成预测，无需任务专属训练、特征工程或展平表格。

> 原始链接：[NVIDIA Kumo Relational Outperforms Supervised Machine Learning on Relational Data, No Training Required](https://huggingface.co/blog/nvidia/kumo-relational)（发布日 2026-10-21）

#### How Specializing the Vocabulary of SLMs Can Cut Inference Cost by 77% in Real Applications

VocabX为特定任务按推理成本重建词表，同时优化子词和重复短语宏词元，并控制词表规模。

> 原始链接：[How Specializing the Vocabulary of SLMs Can Cut Inference Cost by 77% in Real Applications](https://huggingface.co/blog/Dharma-AI/vocabx-vocabulary-specialization)（发布日 2026-10-21）

#### Granite Speech 5.0: Transcribe, Translate, and Attribute more Accurately and Faster

IBM发布并更新三款Granite语音模型，分别面向高精度多语种转写与翻译、快速端侧转写，以及多说话人录音的说话者归属和时间戳。

> 原始链接：[Granite Speech 5.0: Transcribe, Translate, and Attribute more Accurately and Faster](https://huggingface.co/blog/ibm-granite/granite-speech-5)（发布日 2026-10-21）

#### MPS in PyTorch 2.15

PyTorch 2.15 为 Apple Silicon 的 MPS 后端加入 FP8、原生 MoE 分组矩阵乘法及多种 Metal 内核，提升大语言模型解码、线性代数、音视频和训练性能；Wan2.2 视频解码峰值驱动内存从约270 GiB降至8 GiB，并新增 Python MPS 流控制。

> 原始链接：[MPS in PyTorch 2.15](https://huggingface.co/blog/mps-pytorch-2-15)（发布日 2026-10-20）

#### Hugging Face ❤️ TorchTPU: TPUs, Natively

Hugging Face 介绍 TorchTPU：为 PyTorch 增加原生 TPU 后端，支持 Transformers、Diffusers、Pallas 内核、分布式训练及 torch.compile，用户可通过 device_map="tpu" 加载模型。

> 原始链接：[Hugging Face ❤️ TorchTPU: TPUs, Natively](https://huggingface.co/blog/hf-torchtpu)（发布日 2026-10-20）

#### AnyLanguageModel 1.0: One Year of Local Models on Apple Platforms

AnyLanguageModel 1.0 为 Apple 平台应用提供兼容 Foundation Models 的统一 Swift API，可切换本地模型及多种托管推理服务。

> 原始链接：[AnyLanguageModel 1.0: One Year of Local Models on Apple Platforms](https://huggingface.co/blog/anylanguagemodel-1-0)（发布日 2026-10-20）

#### TorchNeuron: running HF models on AWS Trainium is easier than ever

TorchNeuron是面向AWS Trainium的原生PyTorch后端，支持 eager mode、torch.compile及分布式API。

> 原始链接：[TorchNeuron: running HF models on AWS Trainium is easier than ever](https://huggingface.co/blog/hf-torchneuron)（发布日 2026-10-19）

#### Welcome Beam: a 501B open model you can own, customize, and scale

Reflection 发布开源模型 Beam：5010 亿参数、每 token 激活 230 亿参数，支持百万 token 上下文及编码、智能体任务，采用 Apache 2.0 许可。

> 原始链接：[Welcome Beam: a 501B open model you can own, customize, and scale](https://huggingface.co/blog/reflection-beam)（发布日 2026-10-16）

<br/>

## 四、国内进展

#### &lt;协作&gt;天猫数字员工

大淘宝技术：数字员工以钉钉群为入口，和产品、开发、测试共享同一份需求上下文，从 PRD 走到发布复盘。文章把解法分成「协作」和「资产」，用来减少传递失真和隐性知识流失。

> 原始链接：[天猫数字员工（协作篇）](https://mp.weixin.qq.com/s?__biz=MzAxNDEwNjk5OQ==&mid=2650546508&idx=1&sn=2b2b8c196cc45f7043b59d2c5c3ce81c)（发布日 2026-10-21）

#### &lt;研究&gt;美团：从 LOOP 到图探索的 AutoResearch

美团技术博客：从 Karpathy 的 AutoResearch 出发，经过三次重构，做成能在企业云上训练的算法研究自进化系统。单线程 LOOP 换成 CyclicGraph Engine，用状态机维持长周期，并用业务知识库、真实闭环和经验沉淀让系统越用越好。

> 原始链接：[从 LOOP 到图探索](https://tech.meituan.com/2026/10/22/LOOP-AutoResearch.html)（发布日 2026-10-22）

#### &lt;组织&gt;快手：从工程师到全员的企业 AI

快手技术写企业 AI 生产力如何从工程师扩到全员、从个人扩到组织。同窗口还有 iWork 和 QCon 两篇分享合集，这里只记这一篇作为组织侧的入口。

> 原始链接：[从工程师到全员，从个体到组织](https://mp.weixin.qq.com/s?__biz=Mzg2NzU4MDM0MQ==&mid=2247501508&idx=1&sn=1cf0c6dfe048cc4a660ee64cdd114c89)（发布日 2026-10-20）

字节、阿里、腾讯、支付宝的 Wechat2RSS 已滚出本窗口且没有 Wayback 存档。模型发布写在「模型进展」。

#### NotebookLM's Video Overview System Prompt: The Full Creation Workflow

NotebookLM 视频概览流程通过多步协作将笔记本来源转为视频：收集上下文、确认用户意图与主题、设置格式和视觉风格，再提交生成。

> 原始链接：[NotebookLM's Video Overview System Prompt: The Full Creation Workflow](https://baoyu.io/blog/2026-10-20/notebooklm-video-overview-system-prompt)（发布日 2026-10-20）

#### Every Tenth of a Second Counts—A Technical Deep Dive into Fast Tier Performance Optimization

Qoder Fast 将首响应时间从8秒降至3秒，凭借客户端冷启动优化、异步解耦、工具复用与并行执行、按任务路由模型及专用网络路径缩短端到端耗时；桌面端冷启动降低逾60%，大载荷传输p95延迟降低逾50%。

> 原始链接：[Every Tenth of a Second Counts—A Technical Deep Dive into Fast Tier Performance Optimization](https://qoder.com/blog/qoder-fasttech)（发布日 2026-10-21）

<br/>

## 五、国际进展

#### &lt;产品&gt;Claude Duet

研究预览从即日起开放候补，先从美国的 Pro 和 Max 订阅者开始。RSS 摘要没有展开产品边界。

> 原始链接：[Introducing Claude Duet](https://claude.com/resources/articles/claude-duet)（发布日 2026-10-21）

#### &lt;工单&gt;在 Linear 里把问题派给 Amp

把 Linear 问题指派给 Amp 会开一条 Agent 会话并拉起 orb，也可以提及 @Amp。Amp 把回复送回同一条会话。

> 原始链接：[Assign It To Amp](https://ampcode.com/news/assign-it-to-amp)（发布日 2026-10-19）

#### &lt;语言&gt;低资源编程语言上的编码

OpenAI RSS：改进 ChatGPT 在低资源编程语言上的表现，并加上软件工程、SQLite 和 COBOL 迁移的新评测。

> 原始链接：[Advancing coding in low-resource programming languages](https://openai.com/index/low-resource-programming-languages)（发布日 2026-10-19）

#### Redesigning source control at Anthropic

Anthropic 因大量由 Claude 自动生成的代码，传统以 git 为中心的源码管理成为瓶颈，团队在五个月内将 monorepo 迁移到自主设计的 Scion。

> 原始链接：[Redesigning source control at Anthropic](https://www.anthropic.com/engineering/redesigning-source-control)（发布日 2026-10-19）

#### Write your own training loop — without managing GPUs — with Amazon SageMaker training session APIs

Amazon SageMaker AI 推出训练会话 API，以托管 GPU、分布式执行和故障恢复，让开发者用 Python 自定义 SFT、偏好优化或强化学习训练循环，并按 GPU 操作处理的 token 计费。

> 原始链接：[Write your own training loop — without managing GPUs — with Amazon SageMaker training session APIs](https://aws.amazon.com/blogs/machine-learning/write-your-own-training-loop-without-managing-gpus-with-amazon-sagemaker-training-sessions/)（发布日 2026-10-22）

#### Stream low-latency speech from AI agents using Kokoro TTS on Amazon SageMaker AI

介绍在 SageMaker AI 上部署 Kokoro-82M，并将 AI Agent 逐句生成的文本立即送去合成语音，通过持久双向会话降低首段音频延迟；实测端到端首段音频在部署环境中比批处理快 3.5 倍，并比较 SSE Base64 与二进制传输的成本。

> 原始链接：[Stream low-latency speech from AI agents using Kokoro TTS on Amazon SageMaker AI](https://aws.amazon.com/blogs/machine-learning/stream-low-latency-speech-from-ai-agents-using-kokoro-tts-on-amazon-sagemaker-ai/)（发布日 2026-10-22）

#### Stop guessing auto scaling targets for TTS on Amazon SageMaker AI

AWS 展示如何为 SageMaker AI 上的 Kokoro-82M TTS 端点实测自动扩缩容参数：测出单实例满足延迟 SLO 的并发上限 Q_max，以及扩容总耗时 T_total，再据此计算扩缩容阈值与冷却时间，并通过 AWS CDK 部署和配置校验避免使用未经测量的策略。

> 原始链接：[Stop guessing auto scaling targets for TTS on Amazon SageMaker AI](https://aws.amazon.com/blogs/machine-learning/stop-guessing-auto-scaling-targets-for-tts-on-amazon-sagemaker-ai/)（发布日 2026-10-22）

#### Self-Hosted Orbs

Amp 支持在自有基础设施中托管 Orbs：运行 amp orb provider 并提供调度程序，处理实例创建、暂停和删除；也可用 Helm 部署到 GKE、EKS 或 AKS。

> 原始链接：[Self-Hosted Orbs](https://ampcode.com/news/self-hosted-orbs)（发布日 2026-10-22）

#### LLMs are making formal software verification feasible at a much larger scale

Claude 与 Theorem 合作，利用大语言模型为123个开源库的RISC-V二进制程序证明安全属性，覆盖239个模糊测试入口，并发现、修复多年未察觉的漏洞。

> 原始链接：[LLMs are making formal software verification feasible at a much larger scale](https://www.anthropic.com/research/formal-verification)（发布日 2026-10-22）

#### How Rescale built an AI triage agent with Strands Agents and AI-DLC

Rescale采用AI-DLC协作流程与Strands SDK，在五天内构建并部署测试失败分流Agent，运行于EKS的CI/CD流水线，结合Bedrock、历史故障知识库和MCP日志生成供工程师审核的修复建议。

> 原始链接：[How Rescale built an AI triage agent with Strands Agents and AI-DLC](https://aws.amazon.com/blogs/machine-learning/how-rescale-built-an-ai-triage-agent-with-strands-agents-and-ai-dlc/)（发布日 2026-10-22）

#### How IskayPet unified corporate knowledge with Amazon Bedrock Managed Knowledge Bases

IskayPet基于Amazon Bedrock托管知识库和SharePoint构建企业知识助手，覆盖三国、四种语言及多个业务领域，并通过文档级权限、混合检索和来源引用保障回答相关且可核验。

> 原始链接：[How IskayPet unified corporate knowledge with Amazon Bedrock Managed Knowledge Bases](https://aws.amazon.com/blogs/machine-learning/how-iskaypet-unified-corporate-knowledge-with-amazon-bedrock-managed-knowledge-bases/)（发布日 2026-10-22）

#### Deploy AI in a HIPAA-eligible environment with Amazon Quick

Amazon Quick 是可处理 PHI 的 HIPAA 资格服务，涵盖网页、桌面和移动端。

> 原始链接：[Deploy AI in a HIPAA-eligible environment with Amazon Quick](https://aws.amazon.com/blogs/machine-learning/deploy-ai-in-a-hipaa-eligible-environment-with-amazon-quick/)（发布日 2026-10-22）

#### CodeRabbit joins the SpaceX Super Intelligence Partner Network

CodeRabbit加入SpaceX Super Intelligence Partner Network，并上架Grok Build插件市场。

> 原始链接：[CodeRabbit joins the SpaceX Super Intelligence Partner Network](https://coderabbit.ai/blog/coderabbit-spacex-super-intelligence-partner-network)（发布日 2026-10-22）

#### Building in London

Cognition宣布在伦敦芬斯伯里广场开设新办公室，过去六个月英国团队规模增长逾200%。

> 原始链接：[Building in London](https://cognition.com/blog/building-in-london)（发布日 2026-10-22）

#### Build more responsive apps with the Decisions API

OpenAI 正式推出基于 GPT‑6 Luna 的 Decisions API，面向分类、路由和下一步动作等有限答案问题，可处理文本、图像和原生 JSON，速度最高比经 Responses API 调用 Luna 快 10 倍。

> 原始链接：[Build more responsive apps with the Decisions API](https://openai.com/index/decisions-api/)（发布日 2026-10-22）

#### Announcing new ways to customize models with SageMaker AI, without managing GPUs

AWS推出SageMaker AI无服务器模型定制训练会话，支持自定义训练循环、损失函数和奖励信号，平台负责GPU分配、分布式执行、故障恢复及检查点存储。

> 原始链接：[Announcing new ways to customize models with SageMaker AI, without managing GPUs](https://aws.amazon.com/blogs/machine-learning/announcing-new-ways-to-customize-models-with-sagemaker-ai-without-managing-gpus/)（发布日 2026-10-22）

#### Amazon Polly delivers a major upgrade to its Generative engine

Amazon Polly Generative 引擎升级已正式推出，语音更自然、富有表现力，数字、金额和地址等内容的朗读也更准确。

> 原始链接：[Amazon Polly delivers a major upgrade to its Generative engine](https://aws.amazon.com/blogs/machine-learning/amazon-polly-delivers-a-major-upgrade-to-its-generative-engine/)（发布日 2026-10-22）

#### Which software engineering skills matter in the age of AI?

随着 AI 承担更多实现工作，工程师仍须理解问题、掌握基础并为交付负责；产品判断、协作和解释决策的重要性上升。

> 原始链接：[Which software engineering skills matter in the age of AI?](https://coderabbit.ai/blog/software-engineering-skills-ai-kunal-kushwaha)（发布日 2026-10-21）

#### Using thousands of AI agents to uncover new leads in biological data

OpenAI、PerturbAI 与 Scripps Research 用数千个 GPT‑Rosalind 智能体并行分析数百万小鼠脑细胞的 CRISPR 图谱：每个智能体调查基因扰动、检索文献并提出解释，32 分钟形成可查询的推理图谱。

> 原始链接：[Using thousands of AI agents to uncover new leads in biological data](https://openai.com/index/scaling-ai-research-for-complex-biological-data/)（发布日 2026-10-21）

#### Securing Quick access from corporate networks with AWS PrivateLink

介绍通过 AWS PrivateLink、VPC 连接及 Direct Connect 或站点到站点 VPN，让 Amazon Quick 私下访问企业网络中的数据，避免流量经过公共互联网。

> 原始链接：[Securing Quick access from corporate networks with AWS PrivateLink](https://aws.amazon.com/blogs/machine-learning/securing-quick-access-from-corporate-networks-with-aws-privatelink/)（发布日 2026-10-21）

#### Patch the Planet: global response coordination as agents uncover critical vulnerabilities

OpenAI 说明 Patch the Planet 如何协调维护者、研究机构、服务商和政府，应对 AI 发现的 PHP 严重漏洞：先验证与修复上游，再为受影响组织预留防御窗口、准备缓解与更新并公开指导。

> 原始链接：[Patch the Planet: global response coordination as agents uncover critical vulnerabilities](https://openai.com/index/coordinated-disclosure-of-critical-vulnerabilities/)（发布日 2026-10-21）

#### Lovable’s compliance and your app: what’s covered, what’s your responsibility

Lovable 的 SOC 2、ISO 27001、GDPR 支持和 AIUC-1 认证仅覆盖其自身及既定范围，不会自动认证用户的应用。

> 原始链接：[Lovable’s compliance and your app: what’s covered, what’s your responsibility](https://lovable.dev/blog/lovable-compliance-and-your-app)（发布日 2026-10-21）

#### How U.S. Hunger connects leaders and data using Amazon Quick

美国饥饿救济组织 U.S. Hunger 借助 Amazon Quick 探索捐助项目、财务及家庭需求数据，并通过共享空间统一指标定义、支持领导决策。

> 原始链接：[How U.S. Hunger connects leaders and data using Amazon Quick](https://aws.amazon.com/blogs/machine-learning/how-u-s-hunger-connects-leaders-and-data-using-amazon-quick/)（发布日 2026-10-21）

#### HCLTech joins the Claude Partner Network as a Global Premier partner

HCLTech加入Claude合作伙伴网络并成为最高级别的全球Premier合作伙伴，将通过专属业务部门与卓越中心、HCLSoftware产品及AI Force引入Claude和Claude Code，并以安全沙箱、策略护栏和人工审核支持企业部署。

> 原始链接：[HCLTech joins the Claude Partner Network as a Global Premier partner](https://claude.com/resources/articles/hcltech-joins-claude-partner-network)（发布日 2026-10-21）

#### Claude Security now scans continuously and tracks fixes

Claude Security 面向 Claude Enterprise 客户开放公测，可随代码变更持续扫描仓库、跟踪漏洞修复，并依据团队提供的环境知识和威胁模型调整风险判断。

> 原始链接：[Claude Security now scans continuously and tracks fixes](https://claude.com/resources/articles/claude-security-now-scans-continuously-and-tracks-fixes)（发布日 2026-10-21）

#### ChatGPT Ads expands to 26 new countries as over 100,000 advertisers have used the platform

ChatGPT Ads 已服务逾 10 万广告主，并新增 26 个国家和地区，使覆盖扩展至 89 个市场。

> 原始链接：[ChatGPT Ads expands to 26 new countries as over 100,000 advertisers have used the platform](https://openai.com/index/chatgpt-ads-expands-26-new-countries/)（发布日 2026-10-21）

#### Broad access through consistent standards

OpenAI 提出以一致标准推动模型广泛访问：无论用户直接使用、经托管伙伴或转售伙伴访问，都应落实相同的安全防护、滥用调查和处置要求。

> 原始链接：[Broad access through consistent standards](https://openai.com/index/broad-access-through-consistent-standards/)（发布日 2026-10-21）

#### Adaptive agentic intelligence framework using Strands Agents

AWS介绍基于Strands Agents构建自适应智能体框架AAIF：由本地小模型处理常规任务并进行请求分流，复杂分析则交由Amazon Bedrock模型。

> 原始链接：[Adaptive agentic intelligence framework using Strands Agents](https://aws.amazon.com/blogs/machine-learning/adaptive-agentic-intelligence-framework-using-strands-agents/)（发布日 2026-10-21）

#### 5 production challenges in multi-agent systems and how Deep Insight solved them

AWS团队介绍Deep Insight生产级多智能体系统，利用Strands Agents SDK编排任务与人工审核，按角色选择模型，并通过AgentCore部署、Fargate隔离执行代码，结合监控告警保障运行。

> 原始链接：[5 production challenges in multi-agent systems and how Deep Insight solved them](https://aws.amazon.com/blogs/machine-learning/5-production-challenges-in-multi-agent-systems-and-how-deep-insight-solved-them/)（发布日 2026-10-21）

#### 隆重推出 Agent SDK

Cursor 发布 Agent SDK，支持用代码定义并部署贴合团队工作流的智能体，可响应 PR 等事件、进行代码审查、调用工具并拆分任务。

> 原始链接：[隆重推出 Agent SDK](https://cursor.com/cn/blog/agent-sdk)（发布日 2026-10-20）

#### Securing AI agent identity with X.509 PKI on AWS

该参考架构结合 AWS 服务与 EJBCA，以 X.509 证书、签名请求信封、用户委托断言、受众限定令牌及实时 OCSP 撤销检查，验证多智能体调用身份并限制权限；示例采用 Bedrock、Strands Agents SDK 和 MCP，代码见配套 GitHub 仓库。

> 原始链接：[Securing AI agent identity with X.509 PKI on AWS](https://aws.amazon.com/blogs/machine-learning/securing-ai-agent-identity-with-x-509-pki-on-aws/)（发布日 2026-10-20）

#### Introducing memory in Kiro IDE and CLI

Kiro IDE 与 CLI 新增记忆功能，可记录工作偏好、仓库约定、纠错和调试经验，并在后续工作中提供相关上下文。

> 原始链接：[Introducing memory in Kiro IDE and CLI](https://kiro.dev/blog/memory-in-ide-cli/)（发布日 2026-10-20）

#### How Octave built a secure multi-tenant AI foundation on Amazon Bedrock

Octave基于Amazon Bedrock构建多租户AI基础平台，以按租户隔离的向量存储、AgentCore隔离执行和Guardrails内容防护保护受监管数据，并用Cohere Embed v4批量处理逾20亿份文档，使单租户吞吐达每日140万份，部署新用例时间缩短50%。

> 原始链接：[How Octave built a secure multi-tenant AI foundation on Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/how-octave-built-a-secure-multi-tenant-ai-foundation-on-amazon-bedrock/)（发布日 2026-10-20）

#### How Kiro fixes itself, and how we keep the fixes honest

Kiro 团队介绍内部系统 kiro-trace：从智能编程助手的运行轨迹中发现问题、提出提示词或工具改动，再以分阶段基准测试、回归检查和人工审查决定是否合并。

> 原始链接：[How Kiro fixes itself, and how we keep the fixes honest](https://kiro.dev/blog/how-kiro-fixes-itself/)（发布日 2026-10-20）

#### How Eon built multi-cloud investigation with an MCP Gateway on Amazon Bedrock AgentCore

Eon以Amazon Bedrock AgentCore搭建跨云调查MCP网关，整合数十个工具与数百项操作，并通过Cedar策略区分人员和智能体权限。

> 原始链接：[How Eon built multi-cloud investigation with an MCP Gateway on Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/how-eon-built-multi-cloud-investigation-with-an-mcp-gateway-on-amazon-bedrock-agentcore/)（发布日 2026-10-20）

#### From data to decisions: Conversational supply chain intelligence with Amazon Quick and Amazon Bedrock AgentCore

该方案以 Amazon Quick 提供对话入口，以 Amazon Bedrock AgentCore 编排 MCP 工具，实时关联供应链系统和文档，支持查询、影响评估、缓解建议及定时或邮件触发监控。

> 原始链接：[From data to decisions: Conversational supply chain intelligence with Amazon Quick and Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/from-data-to-decisions-conversational-supply-chain-intelligence-with-amazon-quick-and-amazon-bedrock-agentcore/)（发布日 2026-10-20）

#### Enterprise features October roundup

Lovable 发布企业功能更新，支持在自有 AWS 或 Azure 云部署应用、使用自有加密密钥及在欧盟处理 AI 请求；新增组织级身份与应用管理、发布审批和风险处置中心，并提供管理员 API 与审计日志导出，帮助企业在集中治理下让团队构建并发布应用。

> 原始链接：[Enterprise features October roundup](https://lovable.dev/blog/enterprise-features-october-roundup)（发布日 2026-10-20）

#### Discover tools at runtime with AWS Agent Registry

AWS Agent Registry 可让 Agent 在运行时检索经审批的 MCP 服务器和 A2A Agent，解析描述符并按请求创建客户端，减少新增能力对编排器代码和部署的依赖。

> 原始链接：[Discover tools at runtime with AWS Agent Registry](https://aws.amazon.com/blogs/machine-learning/discover-tools-at-runtime-with-aws-agent-registry/)（发布日 2026-10-20）

#### Build a semantic layer for agentic AI on AWS with Denodo and Amazon Bedrock AgentCore

Denodo Platform 在 AWS 上构建语义层，通过 MCP 将受治理的数据视图提供给 Bedrock AgentCore 智能体；联邦访问 Aurora、Redshift 和本地 PostgreSQL，并在查询时执行身份传递及行列级策略。

> 原始链接：[Build a semantic layer for agentic AI on AWS with Denodo and Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/build-a-semantic-layer-for-agentic-ai-on-aws-with-denodo-and-amazon-bedrock-agentcore/)（发布日 2026-10-20）

#### Beyond the KV cache: Training and serving i14’s Laplace 3B linear attention model on AWS Trainium2 with native PyTorch

i14与AWS将Laplace 3B线性注意力模型适配至Trainium2，采用原生PyTorch实现GLA、优化Muon通信并静态展开反向计算。

> 原始链接：[Beyond the KV cache: Training and serving i14’s Laplace 3B linear attention model on AWS Trainium2 with native PyTorch](https://aws.amazon.com/blogs/machine-learning/beyond-the-kv-cache-training-and-serving-i14s-laplace-3b-linear-attention-model-on-aws-trainium2-with-native-pytorch/)（发布日 2026-10-20）

#### Access OpenAI GPT models on Amazon Bedrock from Canada with cross-Region inference

加拿大中部和卡尔加里区域现可通过 Amazon Bedrock 跨区域推理调用 GPT-5.6、GPT-6 和 GPT-6.1，并使用 Responses、Chat Completions 或 Converse API。

> 原始链接：[Access OpenAI GPT models on Amazon Bedrock from Canada with cross-Region inference](https://aws.amazon.com/blogs/machine-learning/access-openai-gpt-models-on-amazon-bedrock-from-canada-with-cross-region-inference/)（发布日 2026-10-20）

#### Structured outputs for Anthropic Claude models on Amazon Bedrock

Amazon Bedrock 已为可用的 Anthropic Claude 模型提供结构化输出，支持 JSON Schema 响应格式和严格工具调用，可在生成时约束输出符合模式，减少解析、重试及校验代码。

> 原始链接：[Structured outputs for Anthropic Claude models on Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/structured-outputs-for-anthropic-claude-models-on-amazon-bedrock/)（发布日 2026-10-19）

#### Push-based KV transfer to improve TTFT and TPOT for disaggregated inference in vLLM

vLLM推出推送式NIXL KV传输连接器：预填充期间预先注册解码端内存，并由后台线程提交传输，减少首词延迟关键路径上的协调与设置开销。

> 原始链接：[Push-based KV transfer to improve TTFT and TPOT for disaggregated inference in vLLM](https://aws.amazon.com/blogs/machine-learning/push-based-kv-transfer-to-improve-ttft-and-tpot-for-disaggregated-inference-in-vllm/)（发布日 2026-10-19）

#### Pegasus 1.5 from TwelveLabs is now available in Amazon Bedrock

TwelveLabs 的视频语言模型 Pegasus 1.5 已在 Amazon Bedrock 的美国西部（俄勒冈）区域上线，可分析最长两小时的视频，无需预索引，并按用户定义条件返回带时间戳的 JSON 片段。

> 原始链接：[Pegasus 1.5 from TwelveLabs is now available in Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/pegasus-1-5-from-twelvelabs-is-now-available-in-amazon-bedrock/)（发布日 2026-10-19）

#### Improve TTFT for multi-turn agentic workloads with bi-directional KV transfer in vLLM

vLLM新增双向 KV 缓存传输：解码节点保留并回传历史 KV，供预填充节点跨轮复用，减少重复计算。

> 原始链接：[Improve TTFT for multi-turn agentic workloads with bi-directional KV transfer in vLLM](https://aws.amazon.com/blogs/machine-learning/improve-ttft-for-multi-turn-agentic-workloads-with-bi-directional-kv-transfer-in-vllm/)（发布日 2026-10-19）

#### How Numan built an eval-first AI health coach with LangGraph and LangSmith

Numan以LangGraph构建健康教练Nu，并用LangSmith追踪对话与评估。

> 原始链接：[How Numan built an eval-first AI health coach with LangGraph and LangSmith](https://blog.langchain.com/how-numan-built-an-eval-first-ai-health-coach-with-langgraph-and-langsmith)（发布日 2026-10-19）

#### How Deepgram optimized voice AI at scale with AWS Trainium

Deepgram与AWS将Nova-3语音识别模型移植到Trainium2，通过PyTorch编译、NKI内核调优和Rust数据并行运行时提升离线批处理效率。

> 原始链接：[How Deepgram optimized voice AI at scale with AWS Trainium](https://aws.amazon.com/blogs/machine-learning/how-deepgram-optimized-voice-ai-at-scale-with-aws-trainium/)（发布日 2026-10-19）

#### Developers can now access SageMaker Studio through the new AWS experience

AWS为新客户简化SageMaker Studio注册流程，支持用Google、GitHub、Apple、Amazon账号或邮箱在数步内登录，无需多数情况下提供信用卡，约20秒即可进入预配置环境。

> 原始链接：[Developers can now access SageMaker Studio through the new AWS experience](https://aws.amazon.com/blogs/machine-learning/developers-can-now-access-sagemaker-studio-through-the-new-aws-experience/)（发布日 2026-10-19）

#### Amazon SageMaker JumpStart: 2026 year-to-date in review

2026年前三季度，SageMaker JumpStart新增逾100个模型，覆盖30家提供商及多模态、语音、检索、代码生成等任务。

> 原始链接：[Amazon SageMaker JumpStart: 2026 year-to-date in review](https://aws.amazon.com/blogs/machine-learning/amazon-sagemaker-jumpstart-2026-year-to-date-in-review/)（发布日 2026-10-19）

#### Navan 将长达一个月的迁移缩短至一周，全程无需冻结代码库

Navan 借助 Cursor 云端智能体，将 Spring Boot 4 迁移涉及的 8 个应用和 15 个库从一个多月缩短至约一周，且未冻结代码库。

> 原始链接：[Navan 将长达一个月的迁移缩短至一周，全程无需冻结代码库](https://cursor.com/cn/blog/navan)（发布日 2026-10-16）

#### National Design Studio and Cognition Launch the American Forge Residency

National Design Studio 与 Cognition 发起为期六个月的 American Forge 驻留项目，招募工程师解决政府软件难题，推动美国联邦软件基础设施现代化。

> 原始链接：[National Design Studio and Cognition Launch the American Forge Residency](https://cognition.com/blog/american-forge-fellowship)（发布日 2026-10-16）

#### Building trust in AI agents: A production-ready evaluation framework with Amazon Bedrock AgentCore

AWS介绍基于Amazon Bedrock AgentCore Evaluations构建的生产级多智能体评估框架，以九个阶段覆盖从首次提交到生产运行的全生命周期，并在工具、单体智能体和多智能体层面持续评估安全、质量、性能、成本与运维控制，借助回归门禁、金丝雀评分和漂移检测减少静默错误。

> 原始链接：[Building trust in AI agents: A production-ready evaluation framework with Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/building-trust-in-ai-agents-a-production-ready-evaluation-framework-with-amazon-bedrock-agentcore/)（发布日 2026-10-16）

本期于 2026-11 按新版格式补录。
