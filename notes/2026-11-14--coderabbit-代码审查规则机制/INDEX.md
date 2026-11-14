---
title: CodeRabbit 代码审查规则机制
---
# CodeRabbit 代码审查规则机制

> CodeRabbit 的规则按层选取，默认不自动合并。个人账号下的中央仓 `VirusPC/coderabbit` 已在 2026-11-14 得到实证，业务仓不必再写本地配置文件。

本文系统梳理 CodeRabbit 如何解析、合并和执行审查规则，依据均为官方文档与 Configuration V2 schema（[schema.v2.json](https://coderabbit.ai/integrations/schema.v2.json)，文档标注更新于 2026-11-14）。未声明 `version` 的 `.coderabbit.yaml` 按 V2 处理；V3 目前是有限预览，字段布局不同，下文示例仍用 V2。文末「核实记录」先记录对照官方文档与当日 schema 的结论；随后「实证与落地」补上当晚实验和正式基线合入后的现状。正文里与实验前不同的判断，以「实证与落地」为准。

## 1. 规则来源与优先级

CodeRabbit 默认**不合并**多层配置：有更高层时，只采用最高优先级的完整来源，未写出的键回落到 schema 默认值，而不是自动继承下层。要「团队基线 + 仓库补充」，必须显式打开继承。

云端（SaaS）优先级如下（数字越小越高）：

| 优先级 | 来源 | 位置 |
| --- | --- | --- |
| 0（最高） | 工作区全局覆盖 | UI：Workspace Settings → Global Overrides（Enterprise 工作区） |
| 1 | 组织全局覆盖 | UI：Review settings → Organization defaults → Global overrides |
| 2 | 仓库配置文件 | 仓库根目录 `.coderabbit.yaml` / `.coderabbit.yml`，或 `.coderabbit.config.ts` |
| 3 | 中央仓库 | 同组织下名为 `coderabbit` 的仓库中的配置文件 |
| 4 | 仓库 UI 设置 | Review settings 中选中某一仓库（仅当 UI 来源为 Repository settings） |
| 5 | 组织 UI 设置 | Organization defaults |
| 6 | 工作区设置 | Workspace Settings（Enterprise；可作为未置键的默认填充） |
| 7（最低） | 默认值 | schema 默认值 |

全局覆盖在继承链解析完成后再叠加，是仓库无法关闭的红线。若同一键在工作区与组织全局覆盖中都出现，工作区覆盖胜出。仓库 UI 来源若设为 Organization defaults，会跳过该仓库已保存的 UI 设置（含其中的 Inheritance 开关）。

同一仓库里，已提交的 YAML **始终优先于** `.coderabbit.config.ts`。云端默认使用正在审查的功能分支上的配置。要查看最终生效值及每项来源，在 PR 上发 `@coderabbitai configuration`。

### 中央 `coderabbit` 仓库

在 Git 组织下建一个**名字必须叫** `coderabbit` 的仓库（GitHub 形如 `organization/coderabbit`），在根目录放 `.coderabbit.yaml` 或 `.coderabbit.config.ts`，并**必须把 CodeRabbit App 安装到这个仓库**，否则它读不到配置。之后，组织里**没有自己配置文件**的仓库会自动套用这份中央配置。仓库一旦有了自己的 yaml/ts，默认就整体改用仓库文件，中央配置不再生效。GitLab 会沿 group 层级就近查找；Azure DevOps 不能跨 project 共享；Bitbucket Server 尚不支持中央配置。

官方文档只写了组织仓，没有写个人账号下的 `用户名/coderabbit` 是否同样被识别；公开例子也是组织仓。2026-11-14 晚用 `VirusPC/coderabbit` 做了探针实验：个人账号下的中央仓可以生效，运行配置会把来源标成 Central YAML。详见文末「实证与落地」。团队若要按官方文档来共享，仍可把仓库放进 GitHub 组织后再建 `组织名/coderabbit`。

### 配置继承与 `remote_config`

继承默认关闭。在配置根级写 `inheritance: true`（或在仓库 UI 的 General 中打开 Inheritance）后，本层会与上一层深合并：对象递归合并，标量子级覆盖，数组合并时子级在前，并按 `path` / `name` / `id` 等键去重。上一层也开启时继续向上，直到某一层为 `false` 或未设置。也可在**全局覆盖**里写 `inheritance: true`，强制全组织走完整继承链，仓库无法退出。

另一条共享路径是 YAML 的 `remote_config`：引用同 owner/组织下另一仓库中的配置文件（需安装可读取），或引用公开 HTTPS URL（官方不推荐，无鉴权且 5 秒超时）。例如：

```yaml
remote_config:
  repository: "shared-configs"
  ref: "main"
  path: ".shared-coderabbit.yaml"
```

TypeScript 配置不支持 `remote_config`，应改用 `includeRemote`。`remote_config` 写在[YAML 配置文档](https://docs.coderabbit.ai/getting-started/yaml-configuration)中，但 2026-11-14 的 [V2 schema](https://coderabbit.ai/integrations/schema.v2.json) 根对象为 `additionalProperties: false`，属性列表里没有该键；同日更新的 [V3 配置参考](https://docs.coderabbit.ai/reference/configuration-v3) 顶层也未列出。直接写进 `.coderabbit.yaml` 可能通不过校验。团队共享更稳妥的是中央仓库加 `inheritance: true`，或用 `.coderabbit.config.ts` 的 `includeRemote`。当晚原计划用探针仓再试 `remote_config`，因当小时 included review 额度用尽而搁置；后来改走中央仓基线，业务仓不再依赖 `remote_config`。

## 2. 审查规则的具体手段

**审查风格。** `reviews.profile` 默认为 `chill`（平衡）；`quiet` 只把最重要意见放在行内，其余收进摘要；`assertive` 更全面，也可能更啰嗦。该 profile 也会影响部分工具的严格度。

**范围与指引。** `reviews.path_filters` 用 glob 决定审哪些**变更文件**：`!` 前缀为排除且优先；只有排除项时其他文件仍可审，一旦出现不含 `!` 的包含项，审查范围就收窄到这些包含项。官方还内置了一长串默认忽略路径（`dist/`、锁文件、生成代码等）。`reviews.path_instructions` 按路径追加审查指引，只影响评语侧重点，不改变是否开审。GitHub Cloud 还可把指引放到 `.coderabbit/instructions/` 的 Markdown 里，与 V2 内联项并存。

**合并前检查。** V2 的 `reviews.pre_merge_checks` 含内置的标题、描述、关联 Issue 评估，以及 `custom_checks`（自然语言通过/失败条件）。每项模式为 `off` / `warning`（默认）/ `error`。`error` 搭配 Automatic Approvals 时可挡住合并。目录形式的自定义检查写在 `.coderabbit/pre-merge-checks/`。历史上还有 Docstring Coverage（默认 `warning`、阈值 80%）；官方 changelog 写明该检查已于 2026-11-11 退役，现有 `docstrings` 设置会被忽略，schema 中该字段已标为 deprecated。

**自动审查。** `reviews.auto_review` 控制何时自动开审（详见第 4 节）。`reviews.review_status` 默认为 `true`，会在 walkthrough 中写明跳过等原因。

**工具。** `reviews.tools` 接入 50 余种 linter / SAST（ESLint、Semgrep、Gitleaks、Trivy 等），几乎全部默认开启，按文件类型自动选用。发现先作为提示交给模型，不一定逐条发评论。Essentials 及以上可用。

**知识库。** 默认开启 `knowledge_base.code_guidelines`，自动读取 `AGENTS.md`、`CLAUDE.md`、`.cursorrules`、`.cursor/rules/*`、`AGENT.md` 等（文件名大小写敏感），作用域为该文件所在目录及其子目录。可用 `filePatterns` 增补，也可引用同组织其他仓库的规范。Learnings、过去 PR、GitHub/GitLab Issue 的 scope 默认为 `auto`（公开仓只用本仓，私有仓用组织级）。Jira / Linear 需单独接入，`auto` 表示私有仓启用、公开仓关闭。路径指引优先于 learnings。

**常用指令**（一行一条，写在普通评论文本里，不要放进代码块）：

| 指令 | 作用 |
| --- | --- |
| `@coderabbitai review` | 增量审查自上次以来的提交 |
| `@coderabbitai full review` | 对整个 PR 重新完整审查 |
| `@coderabbitai pause` / `resume` | 暂停 / 恢复该 PR 的自动审查 |
| `@coderabbitai resolve` | 顶层关闭全部 CodeRabbit 讨论；在某条线程里回复则只关闭该线程 |
| `@coderabbitai configuration` | 输出带来源注释的最终配置 |

PR 描述中写 `@coderabbitai ignore` 会抑制自动审查，但手动 `review` / `full review` 仍可触发。

## 3. Learnings 的产生与管理

Learnings 是从聊天中沉淀下来的自然语言偏好，存在与 Git 组织关联的内部库里，不是 git 文件。在 PR 或 Issue 里用自然语言回复 `@coderabbitai`（最好回在具体行评上并说明「为什么」）；若被采纳，回复里会出现 Learnings added。也可 `@coderabbitai add a learning using path/to/file.md` 从文件导入。已有 `AGENTS.md` / `CLAUDE.md` 这类文件应走 code guidelines，不必再导入为 learnings。

开放 PR 上产生的 learning，在 SaaS 上先只作用于该 PR，合入后才对全仓可见。`knowledge_base.learnings.approval_delay` 默认为 0（立即生效）；设为 1–30 天则需管理员在 [Learnings 面板](https://app.coderabbit.ai/learnings) 审批，到期自动通过。管理员可在面板或 API 中编辑、删除、导出。正式、需审计的规范应写进 yaml / `AGENTS.md`，不要只靠 learnings。

## 4. 触发与跳过条件

默认会自动审查，但仍有多层过滤：

- **Draft：** `drafts` 默认为 `false`，草稿 PR 不自动审。
- **目标分支：** 默认只审指向默认分支的 PR；`base_branches` 用正则**追加**其他目标分支，默认分支始终包含在内。
- **标题关键词：** `ignore_title_keywords` 命中则静默跳过（大小写不敏感）。
- **标签：** `labels` 可做正向选择或 `!wip` 这类排除；`enabled: false` 时，正向标签可作为 opt-in。
- **描述关键词：** `enabled: false` 且设置了 `description_keyword` 时，描述里出现该词才自动审。
- **作者：** `ignore_usernames` 精确、区分大小写；一旦命中，优先于其他自动审查开关。官方示例常用来跳过 `dependabot[bot]` 等。CodeRabbit **不会**仅因作者是 bot 就默认跳过，除非写入该列表。被跳过的作者仍可用 `@coderabbitai review` 强制审查。
- **增量：** 默认每次 push 再审；`auto_pause_after_reviewed_commits` 默认为 5，达到后暂停自动增量审查。

无论自动审查如何配置，都可以手动 `@coderabbitai review` 或 `full review`。

**不足 10 个 star 的公开仓库：** [Plans and pricing](https://docs.coderabbit.ai/management/plans) 的 Rate limits 一节写明，公开仓库少于 10 个 star 时必须手动触发：在状态评论里点 Trigger review，或评论 `@coderabbitai review` / `@coderabbitai full review`。知识库文章 [How do I activate CodeRabbit Team for my open source project?](https://kb.coderabbit.ai/articles/8856795235-how-do-i-activate-coderabbit-pro-for-my-open-source-project) 在介绍公开仓免费 Team 能力时也写了同一条。这可以解释 VirusPC 各仓自 10-29 起只发 skip、不再自动审的现象。该句写在 Rate limits 一节，没有按套餐区分，也没有文档写明 Essentials、Team、Advanced 或 Enterprise 可以豁免。2026-11-14 的探针实验再次对上：套餐显示为 Advanced，仍因不足 10 个 star 跳过自动审查。按官方文档，公开仓不足 10 个 star 就要手动触发；这条只写了公开仓，私有仓不适用。

Free 计划对私有仓主要提供 PR 摘要；公开仓走 OSS、可使用 Team 级能力，但受上述 star 限制和独立速率限制。

## 5. 团队共享的推荐分层

建议分成四层：

1. **组织 / 工作区全局覆盖：** 只放不能让仓库关掉的红线（合规、必须启用的继承、关键路径指引）。
2. **中央 `coderabbit` 仓库：** 放团队基线，例如 `profile: chill`、共用 `path_filters`、默认 `auto_review`、关闭无用内置检查。改规则走该仓的 PR。
3. **各仓库 `.coderabbit.yaml`：** 打开 `inheritance: true`，只补本仓的 `path_instructions` 和必要覆盖。不要整份复制中央配置。
4. **仓规放 `AGENTS.md`（或 `CLAUDE.md` 等）：** 交给 knowledge base 自动读取，同时供编码 agent 使用。yaml 里不要把 `AGENTS.md` 误写成 `path_instructions` 的审查对象。

Learnings 只用来收审查过程中冒出来的偏好，不作为团队规范的主存。个人账号若只维护自己的仓库，可以用账号下的 `用户名/coderabbit` 做中央基线（已实证）；若要按官方文档做团队共享，再把仓库放到 GitHub 组织下。

## 6. 结合 VirusPC 现状

现行做法（2026-11-14 晚正式基线合入后）：账号级基线放在 [VirusPC/coderabbit](https://github.com/VirusPC/coderabbit) 的 `main` 上，由 [coderabbit#2](https://github.com/VirusPC/coderabbit/pull/2) 合入。没有自己 `.coderabbit.yaml` 的仓库会自动使用这份基线，包括 `VirusPC/edges` 和本仓；不必再往业务仓添加配置文件。仓级若必须覆盖，应另写该仓 `.coderabbit.yaml` 并设 `inheritance: true`，不要整份复制中央文件。公开仓不足 10 个 star 时仍不会自动审查，需要时在 PR 上发 `@coderabbitai review`。正式基线合入后，尚未用 edges 的业务 PR 做一次对照复核；这件事记在仍开的框架仓任务 [edges#129](https://github.com/VirusPC/edges/pull/129)，本篇不另开卡。

基线要点（以中央仓文件为准，规则改动走该仓 PR）：简体中文、`reviews.profile: chill`、用 `tone_instructions` 和 `path_instructions` 约束只评本次 diff 改动过的文件和行、优先报告运行时错误 / 数据丢失 / 泄露密钥 / 违反该仓 `AGENTS.md` 硬约束，TypeScript 等改动检查是否绕过 `NodeService`，跳过 `dependabot[bot]`，并开启 `knowledge_base.code_guidelines` 与 `learnings.scope: auto`。

更早的历史背景仍然有用。在中央配置生效前，VirusPC 各仓都没有 `.coderabbit.yaml`，拆仓后原网页过滤也未带过来，实际跑的是 schema 默认值。自 2026-10-29 起，公开仓因不足 10 个 star 只发跳过评论、不再自动审。在 10-17 到 10-26 仍有真实审查的窗口里：Docstring Coverage 默认 80% 曾出现在 41 个 PR 上，但项目并无此要求；该检查现已退役，不必再为它写关闭项。另有对 diff 之外文件提 Major 的噪音（[edges#51](https://github.com/VirusPC/edges/pull/51)）。官方文档说明审查对象是 PR diff，同时会用仓库其他文件作上下文；`path_filters` 只按路径包含或排除，不能写成「只评本次 PR 改动过的文件」。V2 schema 与 V3 配置参考中都没有「禁止评论未改文件」的开关。知识库文章 [Some comments are outside the diff](https://kb.coderabbit.ai/articles/7238891275-what-does-the-caution-message-some-comments-are-outside-the-diff-and-can-t-be-posted-inline-due-to-platform-limitations-mean) 说的是已改文件里、未改动的行没法发行内评，和去评一个根本没改的文件不是一回事。这类噪音目前只能靠 `path_instructions` 或 `tone_instructions` 的文字约束，或把无关目录加进 `path_filters`。现行中央基线就是用文字约束来压这类噪音。有用但未处理的例子包括 [edges#35](https://github.com/VirusPC/edges/pull/35)（报告路径、网络错误处理）和 [edges-brain-viruspc#262](https://github.com/VirusPC/edges-brain-viruspc/pull/262)（写 `AGENTS.md` 未走 NodeService）。这些 PR 很快合入，评论既未被回复也未被标为已解决，因此当时「被采纳」样本为 0。

下面是实验前草拟、准备写进 `VirusPC/edges` 的一份最小 V2 示例。事后并未采用这条「往业务仓加本地文件」的路，只保留作对照。字段均对照官方 V2 schema。路径 glob 需按仓库实际目录微调；`path_filters` 过滤的是文件，不是整类 PR。若希望整类文档 / 任务卡 PR 直接跳过，应改用标题关键词或标签。下面**没有**写入「不评 diff 外文件」的配置，因为官方 schema 没有对应字段。加文件也不会解除 10-star 手动触发限制。

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: "en-US"
reviews:
  profile: "chill"
  review_status: true
  path_filters:
    - "!docs/**"
    - "!**/.gitmodules"
    - "!**/tasks/**"
  path_instructions:
    - path: "**/*.{ts,js,mjs,cjs}"
      instructions: |
        Enforce repository hard rules from AGENTS.md:
        - Route Node.js execution through NodeService; do not spawn
          node, npm, or npx directly when NodeService is required.
        - In public-repo changes, flag secrets, credentials, private
          URLs, and unsanitized personal data.
    - path: "**/{eval,evals,benchmarks}/**"
      instructions: |
        Treat these as locally run evaluation scripts, not production
        services. Do not require production HTTPS or open-redirect
        protections unless the change clearly exposes them publicly.
  auto_review:
    enabled: true
    drafts: false
knowledge_base:
  code_guidelines:
    enabled: true
  learnings:
    scope: "auto"
```

## 7. 参考链接

- [Configuration overview](https://docs.coderabbit.ai/guides/configuration-overview)
- [Central configuration](https://docs.coderabbit.ai/configuration/central-configuration)
- [Configuration inheritance](https://docs.coderabbit.ai/configuration/configuration-inheritance)
- [Configuration via YAML file](https://docs.coderabbit.ai/getting-started/yaml-configuration)（含 `remote_config`）
- [Configuration via TypeScript file](https://docs.coderabbit.ai/configuration/typescript-configuration)
- [Configuration V2 reference](https://docs.coderabbit.ai/reference/configuration)
- [Configuration V2 schema](https://coderabbit.ai/integrations/schema.v2.json)
- [Migrate configuration to V3](https://docs.coderabbit.ai/guides/migrate-configuration-v3)
- [Path-based review instructions](https://docs.coderabbit.ai/configuration/path-instructions)
- [Automatic review controls](https://docs.coderabbit.ai/configuration/auto-review)
- [Built-in Pre-Merge Checks](https://docs.coderabbit.ai/pr-reviews/pre-merge-checks)
- [Third-party tools overview](https://docs.coderabbit.ai/tools)
- [Knowledge Base overview](https://docs.coderabbit.ai/knowledge-base)
- [Code Guidelines](https://docs.coderabbit.ai/knowledge-base/code-guidelines)
- [Learnings](https://docs.coderabbit.ai/knowledge-base/learnings)
- [Review commands](https://docs.coderabbit.ai/reference/review-commands)
- [Plans and pricing](https://docs.coderabbit.ai/management/plans)
- [How do I activate CodeRabbit Team for my open source project?](https://kb.coderabbit.ai/articles/8856795235-how-do-i-activate-coderabbit-pro-for-my-open-source-project)
- [Configuration V3 reference](https://docs.coderabbit.ai/reference/configuration-v3)
- [Changelog（Docstring Coverage 退役，2026-11-11）](https://docs.coderabbit.ai/changelog)
- [Some comments are outside the diff](https://kb.coderabbit.ai/articles/7238891275-what-does-the-caution-message-some-comments-are-outside-the-diff-and-can-t-be-posted-inline-due-to-platform-limitations-mean)

## 核实记录（2026-11-14）

对照当日官方文档与 [V2 schema](https://coderabbit.ai/integrations/schema.v2.json)、[V3 配置参考](https://docs.coderabbit.ai/reference/configuration-v3) 补核先前四处未决项，结论已写入正文，摘要如下。第 1 条在当晚实验后有实证更新，见下一节。

1. **个人账号中央仓库：官方未写支持，当晚实验证明可以生效。** [Central configuration](https://docs.coderabbit.ai/configuration/central-configuration) 只写了 `organization/coderabbit`，公开例子也是组织仓。仅凭文档和旁证（`remote_config` / `includeRemote` 的「同一 owner」措辞，以及个人账号可安装和订阅）不能当成承诺。`VirusPC/coderabbit` 是否生效，要看审查评论里的配置来源。实验结论见下一节。
2. **`remote_config`：文档有，schema 里没有。** YAML 文档写了该字段，但 V2 schema 根对象为 `additionalProperties: false` 且未列出该键，V3 配置参考顶层也未列出。直接写进 `.coderabbit.yaml` 可能通不过校验。更稳妥的是中央仓库加 `inheritance: true`，或 TypeScript 的 `includeRemote`。
3. **不足 10 个 star 要手动触发：按文档，付费计划也没豁免。** [Plans and pricing](https://docs.coderabbit.ai/management/plans) 写的是通例，没有按套餐区分；OSS 知识库文章重复了同一条。没有文档说付费计划可以自动审这类公开仓。这条只写了公开仓，私有仓不适用。当晚实验在 Advanced 套餐上再次对上。
4. **没有「禁止评 diff 以外文件」的开关。** V2 schema 与 V3 参考中都找不到这类选项。`path_filters` 只能按路径过滤。知识库「outside the diff」说的是已改文件中未改动的行没法发行内评，与评一个根本没改的文件不是一回事。这类噪音只能靠 `path_instructions`、`tone_instructions` 或把无关目录加入 `path_filters`。

## 实证与落地（2026-11-14 晚）

用户允许用账号做最小可撤回实验后，新建了两个公开仓：[VirusPC/coderabbit](https://github.com/VirusPC/coderabbit)（中央配置）和 [VirusPC/coderabbit-config-probe](https://github.com/VirusPC/coderabbit-config-probe)（自身不放配置文件）。CodeRabbit App 已覆盖账号下仓库，不必再手动把新仓加进安装范围。

先把带唯一标记的探针配置合进中央仓 main（[coderabbit#1](https://github.com/VirusPC/coderabbit/pull/1)）。在该 PR 上，CodeRabbit 把这份文件识别为 Repository YAML，profile 生效为 ASSERTIVE，套餐显示为 Advanced，但仍因不足 10 个 star 跳过审查，探针正文因此没有出现。随后在探针仓 [coderabbit-config-probe#1](https://github.com/VirusPC/coderabbit-config-probe/pull/1) 上手动 `@coderabbitai review`。运行配置为：Layers: Central YAML；Path: `.coderabbit.yaml`；File: No configuration file from this repository applied；Review profile: ASSERTIVE。探针仓本身没有配置文件，所以这份配置只能来自刚合进 main 的中央仓。walkthrough 和行内评论带上了探针标记与简体中文，markdown 路径指引也生效；故意留下的除零和坏链接都被点到。有一处没完全按字面执行：`high_level_summary_instructions` 要求的字面标记被 `tone_instructions` 的标记占了第一行，没有出现。这次审查用掉了 Advanced 套餐里「每小时 1 次 included review」的额度。

随后把探针配置换成正式基线，由 [coderabbit#2](https://github.com/VirusPC/coderabbit/pull/2) 合入 main。业务仓（包括 edges）不必再做本地关联。实验用的探针仓可以先留着，不必删。

规则如何按真实审查结果自迭代，已记入框架仓 Code Review 项目的仍开任务 [edges#129](https://github.com/VirusPC/edges/pull/129)。官方没有一篇专讲「CR 规则怎么自迭代」的独立文章，而是拆成 Learnings 与 `emit path instructions`；后者会往当前仓写本地 `.coderabbit.yaml`，可能盖掉中央基线，要用时须加 `inheritance: true`，或把采纳的规则改回中央仓。本篇只记录机制与落地现状，不重写那张卡。

## 补充说明

- 原始材料：peng cheng 与「AI CR 专家」，2026-11-14 20:17–22:40（Asia/Shanghai）。用户先要求系统梳理 CodeRabbit 的 CR 规则机制并写成笔记；对照官方文档与当日 schema 核实后，用账号做了中央仓实验，再换成正式基线。对话里的笔记原稿写于 20:55，当时尚未做实验。本篇在入库时补上当晚实证，并改写「结合 VirusPC 现状」，不把实验前的未决判断当成现行结论。
- 公开正文不写凭据、鉴权链接、未公开地址或私人生活细节。探针标记只用于说明实验是否生效，已从中央仓正式基线中去掉。
- 现行配置以 [VirusPC/coderabbit](https://github.com/VirusPC/coderabbit) 的 `main` 为准；第 6 节里的 yaml 示例是实验前草拟、并未写入 edges 的对照稿。
