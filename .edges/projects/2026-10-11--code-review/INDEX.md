---
name: Code Review
description: 在 Cursor Bugbot 之外，为 edges 选型并试点自动 PR 代码审查方案。
---
# Code Review

在 Cursor Bugbot 之外，为 edges 选型并试点一套自动 PR 代码审查方案。本页只划定选型范围，不在这里重做目录触发。

## 结论

目的：在已经用过的 Cursor Bugbot 之外，给 edges 选一套可以试点的自动 PR 代码审查，并先把候选、评估维度和边界写清楚。选定哪一家、试点怎么验收，留到 grill 之后另开 Task。

## 背景

已经讨论过 Cursor Bugbot。为了少审非 CLI 的 PR，曾经尝试「只让 CLI 的 PR 自动触发 Bugbot」，没有达到预期。这条触发机制的实测结论记在 todo 卡里，本项目不重复做那份调研：

- [搁置：只让 CLI 的 PR 自动触发 Bugbot](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/todo/2026-10-11--%E6%90%81%E7%BD%AE%E5%8F%AA%E8%AE%A9-CLI-%E7%9A%84-PR-%E8%87%AA%E5%8A%A8%E8%A7%A6%E5%8F%91-Bugbot/INDEX.md)

用户接着问除 Cursor 以外的自动 review，并点名想了解 Codex、Kimi、MiniMax、GLM、Droid、Devin、Amp、Gemini 等是否支持自动审查。下面「候选范围」是 2026-10 按官方文档和官方仓库补的调研，不是已经选定的方案。

## 候选范围

口径：只记录官方文档或官方仓库里能查到的能力。官方没有产品化 PR review 的，标为「未找到官方产品化能力、仅社区/自建 Actions」。

名词：**托管 App** = 装 GitHub App 后由厂商的云端去跑；**Action** = 在自己仓库的 GitHub Actions 里跑，触发条件、`paths` 过滤、并发都由自己的 workflow 决定。

### 一句话结论

- **官方托管、开箱就能用**：Codex、Devin、Claude Code（Code Review）、Cursor Bugbot、Gemini Code Assist（企业版）。
- **官方 Action**（需自己写 workflow，但最可控）：Droid（`Factory-AI/droid-action`）、Claude Code（`anthropics/claude-code-action`）、Gemini CLI（`run-gemini-cli`）。
- **只有社区或自建 Actions**：Kimi、MiniMax、GLM/智谱、Amp。Amp 官方没有 PR review 产品，`amp review` 已废弃，只有官方示例仓库。
- **能硬性只审部分目录**：所有走 Action 的方案（workflow `on.pull_request.paths`），加上 Gemini 的 `.gemini/config.yaml` → `ignore_patterns`。其余托管方案只能在规则文件里用自然语言写「跳过 X 目录」，属于软约束。

### 对照表

| 产品 | 自动 review | 触发方式 | 规则 / 配置文件 | 只审部分目录 | 计费形态 | edges 契合度 |
|---|---|---|---|---|---|---|
| Codex（OpenAI） | ✅ 托管；默认手动，可开 Automatic review | GitHub 连接 Codex；`@codex review`、`@codex security review` | `AGENTS.md` 中的 `## Code Review Rules`，可分目录嵌套 | ⚠️ 只有软约束（嵌套 AGENTS.md 或写在规则里） | ChatGPT Plus 及以上套餐自带；GitHub review 有独立的 Code Review 额度，超出后可买 credits；**API Key 用不了** | ⭐⭐⭐ 手动触发、零基建 |
| Kimi（Moonshot） | ⚠️ 社区 Action | `/review`、`/ask`，或 PR 事件 | 社区 action 用 `.kimi-config.yml`、`.kimi/skills/`；`.kimi-review.yml` 属于另一个社区项目 | ✅ workflow `paths`；action 有 `exclude_patterns` | Moonshot / Kimi Code API 按量 | ⭐⭐ 中文好，但不是官方产品 |
| MiniMax | ⚠️ 社区 / 自建 | 自写 workflow | 自定（官方 CLI 仓库用 claude-code-action，读 AGENTS.md） | ✅ workflow `paths`；社区 action 有 `EXCLUDE_PATTERNS` | MiniMax API 或 Token Plan | ⭐⭐ 适合给 claude-code-action 当便宜后端 |
| GLM / 智谱（z.ai） | ⚠️ 社区 / 自建 | 自写 workflow；社区 bot 支持 `/zai …` | 自定 / `CLAUDE.md` | ✅ workflow `paths`；社区 action 有 `EXCLUDE_PATTERNS` | GLM Coding Plan（固定额度）或 API 按量 | ⭐⭐ 同上 |
| Droid（Factory） | ✅ 官方 Action；`automatic_review: true` 开自动 | `@droid review`、`@droid security`，或 PR 事件 | `.factory/skills/review-guidelines/SKILL.md` | ✅ 官方文档示例就是 `paths` | Factory 套餐（Pro $20 / Plus $100 / Max $200，按用量限额，待官方页核对）；`review_depth` 在 shallow / deep 间取舍 | ⭐⭐⭐ 可控性强 |
| Devin（Cognition） | ✅ 托管；仓库级或个人级 auto-review | `/devin review`；个人可设 Manual / On PR creation / Auto | `**/REVIEW.md`，也读 AGENTS.md、CLAUDE.md、.cursorrules 等 | ⚠️ 只有软约束（REVIEW.md 写 Ignore） | Enterprise 扣 ACU；Individual / Teams 走 on-demand 美元；可设单 PR 上限 | ⭐⭐ 功能全、偏重、贵 |
| Amp（Sourcegraph） | ❌ 未找到官方产品化能力 | 官方示例仓库 `sourcegraph/cra-github`（Action 或自托管 webhook） | `.agents/checks/*.md`（用于本地 CLI 插件） | ✅ 自写 workflow 可以 | Amp API key 按用量（价格未核实） | ⭐ 不建议 |
| Gemini Code Assist on GitHub | ✅ 托管（只剩企业版 Preview） | 开 PR 自动审；`/gemini review`、`/gemini summary`、`/gemini help` | `.gemini/config.yaml`、`.gemini/styleguide.md` | ✅ **`ignore_patterns` 是官方硬过滤** | Preview 期免费，但必须挂 GCP 结算账号；100+ PR/天 | ⭐⭐ 要先接 GCP |
| Claude Code（Anthropic） | ✅ 托管 Code Review（**仅 Team / Enterprise**）；✅ 官方 Action（个人可用） | 托管版：Once after PR creation / After every push / Manual，加 `@claude review [always]`。Action：`@claude` 或 PR 事件 | `REVIEW.md`（只给 review 用）、`CLAUDE.md`（分目录） | 托管版：REVIEW.md 软约束。Action：✅ `paths` | 托管版平均每次 $15–25，单独计费。Action：API token 或 Pro/Max 订阅 OAuth token，加 Actions 分钟 | ⭐⭐⭐ 走 Action 很合适 |
| Cursor Bugbot | ✅ 托管；每次 push 或每个 PR 一次 | `cursor review`、`bugbot run`；可设成只在提及时运行 | `.cursor/BUGBOT.md`（分目录）、`.cursor/config/bugbot.yaml` | ⚠️ yaml 里**没有** ignore 字段；只有规则的 Scoped paths 和 BUGBOT.md 软约束 | 按用量（2026-05 起）：先用套餐内额度，再走 on-demand | ⭐ 已试过，路径过滤痛 |

### 逐项说明

#### 1. Codex（OpenAI）

- **自动 review**：托管。仓库连接 Codex 后，在设置的 Review code 里打开 Automatic review。仓库级可选 All PRs 或 Follow personal preferences，个人偏好里还能设 Review trigger。不开的话，就在 PR 评论里写 `@codex review` 手动触发。
- **审什么**：GitHub 上只报 P0/P1 级问题。评论里可以附带临时关注点，例如 `@codex review for issues in the database migration`。另有 `@codex security review`（research preview）。`@codex fix the P1 issue` 会接着开一个修复任务。
- **规则文件**：在 `AGENTS.md` 里加 `## Code Review Rules`，可以用 `###` 分组。根目录放全局规则，子目录的 AGENTS.md 只作用于该目录下的改动。
- **路径过滤**：没有官方的 ignore / paths 配置，只能靠规则文本和分目录的 AGENTS.md 做软约束。
- **计费**：Plus（$20/月）及以上套餐包含 GitHub code review，用独立的 Code Review 额度。**API Key 方式不含 GitHub code review。** 没有 GitHub 的仓库或要自托管时，可参考官方 cookbook 用 `codex exec` 搭 CI。
- **edges 契合 / 坑**：手动 `@codex review` 天然可控，规则直接复用 AGENTS.md，很适合已有 `.edges`/AGENTS 体系的仓库。坑是没有硬路径过滤，开了 Automatic review 后每个 PR 都审，而且依赖 ChatGPT 账号连 GitHub。
- **文档**：<https://learn.chatgpt.com/docs/third-party/github>，<https://developers.openai.com/codex/guides/agents-md>，<https://learn.chatgpt.com/docs/pricing>

#### 2. Kimi（Moonshot）

- **结论**：**未找到官方产品化能力、仅社区/自建 Actions。** Moonshot 官方仓库 `MoonshotAI/kimi-agent-sdk` 自己的 workflow 用的是个人维护的 `xiaoju111a/kimi-actions@main`。kimi-cli 讨论区 #924 里，有人问官方 Action，回复者都是社区个人在自己做。
- **社区 action（xiaoju111a/kimi-actions）**：支持 `/review`、`/ask`、`/help`，用 `auto_review` 控制是否随 PR 事件自动审（官方示例里是 `false`）。仓库配置是 `.kimi-config.yml`（字段有 `ignore_files`、`extra_instructions`），可在 `.kimi/skills/` 下放自定义 skill。另有 `exclude_patterns`、`max_files`，支持 `language: zh-CN`。
- **`.kimi-review.yml`**：来自另一个社区项目 `howardpen9/kimi-code-reviewer`，不是官方格式。
- **计费**：Moonshot 或 Kimi Code API 按量，外加 Actions 分钟。
- **坑**：action 被 `@main` 钉在个人仓库上，有供应链风险，需要锁到具体 commit。
- **链接**：<https://github.com/MoonshotAI/kimi-agent-sdk/blob/main/.github/workflows/kimi-review.yml>，<https://github.com/marketplace/actions/kimi-code-review>，<https://github.com/MoonshotAI/kimi-cli/discussions/924>

#### 3. MiniMax

- **结论**：**未找到官方产品化能力、仅社区/自建 Actions。**
- **官方自用参考**：`MiniMax-AI/cli` 仓库的 `.github/workflows/ai-pr-review.yml` 用 `anthropics/claude-code-action`，再把 `ANTHROPIC_BASE_URL` 设为 MiniMax 的 Anthropic 兼容端点，模型用 MiniMax-M2.7-highspeed。它用 `paths` 只审 `src/**`、`test/**` 等，跳过 draft 和 fork PR，用 sticky comment，并让 agent 先读 AGENTS.md。这本身就是一个「路径过滤 + 可控触发」的可抄模板。
- **社区 action**：`tarmojussila/minimax-code-review`，支持 `EXCLUDE_PATTERNS`、`MAX_DIFF_CHARS`。
- **官方文档**：MiniMax 官方有「在 Claude Code 中使用」的文档，提供 Anthropic 兼容端点（国内另有 `.cn` 端点）。
- **链接**：<https://github.com/MiniMax-AI/cli/blob/c3a58e9d3e32875c4c7719e3d9bcfb41c82007ab/.github/workflows/ai-pr-review.yml>，<https://platform.minimax.io/docs/token-plan/claude-code>，<https://github.com/tarmojussila/minimax-code-review>

#### 4. GLM / 智谱（z.ai）

- **结论**：**未找到官方产品化能力、仅社区/自建 Actions。** 官方提供的是「在 Claude Code 里用 GLM Coding Plan」（Anthropic 兼容端点）。
- **常见做法**：claude-code-action 后端换成 GLM。见 anthropics/claude-code-action 讨论 #673，以及社区仓库 `duaneadam/glm-code-action`。
- **其他社区 action**：`tarmojussila/zai-code-review`（有 `EXCLUDE_PATTERNS`）；`iqaandev/zai-code-bot`，支持自动审，以及 `/zai ask|explain|describe|impact`。
- **计费**：GLM Coding Plan 固定额度，或 API 按量。
- **链接**：<https://docs.z.ai/devpack/tool/claude>，<https://github.com/anthropics/claude-code-action/discussions/673>，<https://github.com/tarmojussila/zai-code-review>

#### 5. Droid（Factory AI）

- **自动 review**：官方 Action `Factory-AI/droid-action`。
  - 自动审：`droid-review.yml`，设 `automatic_review: true`，在 opened / synchronize / reopened / ready_for_review 时触发，跳过 draft。
  - 按需：`droid.yml`，响应 `@droid review`、`@droid security`、`@droid fill`。
  - 一键安装：本地执行 `droid` → `/install-code-review`，会生成一个 PR。
- **发什么**：行内评论；没发现问题时会提交 approve。如果仓库不希望机器人 approve，要留意这一点。
- **规则文件**：`.factory/skills/review-guidelines/SKILL.md`，会自动注入每次 review。
- **路径过滤**：官方文档直接示例 `on.pull_request.paths`。也可以在 `if:` 里跳过 bot 的 PR 或标题带 `[skip-review]` 的 PR。
- **鉴权**：必需 `FACTORY_API_KEY`。GitHub 侧默认用 Factory Droid GitHub App（要 `id-token: write`），也可以换成自己的 PAT 或 App token。
- **计费**：用 Factory 套餐额度。`review_depth: shallow|deep` 控制成本。
- **链接**：<https://docs.factory.ai/software-factory/code-review-ci>，<https://github.com/Factory-AI/droid-action>

#### 6. Devin（Cognition）

- **自动 review**：Devin Review 是托管服务。
  - 管理员在 Settings > Review 把仓库加入 auto-review，仓库级只能选 Auto review 或 On PR creation。
  - 个人在 Settings > Preferences 自助加入，可选 Manual / On PR creation / Auto。注意：个人选 Auto 后，会审**自己发起的所有仓库的 PR**。
  - 仓库和个人设置同时命中时，取更宽松的那个。
- **手动触发**：`/devin review`（仅 GitHub，需要 write 权限，且 GitHub 账号已关联 Devin）。也可以把 PR 链接里的 `github.com` 换成 `devinreview.com` 打开。
- **规则文件**：`**/REVIEW.md`（任意层级，可分目录），也会读 AGENTS.md、CLAUDE.md、CONTRIBUTING.md、.cursorrules、`.coderabbit.yaml` 等。
- **路径过滤**：只能在 REVIEW.md 里写 Ignore，软约束。
- **评论语言**：可设为中文；REVIEW.md 里写的语言要求优先于该设置。
- **计费**：Enterprise 扣 ACU；Individual / Teams 走 on-demand 美元。可以设「单 PR 自动 review 花费上限」。
- **坑**：写操作必须用 GitHub App 连接，PAT 连接是只读的。
- **链接**：<https://docs.devin.ai/work-with-devin/devin-review>

#### 7. Amp（Sourcegraph）

- **结论**：**未找到官方产品化 PR review 能力。**
  - `amp review` 命令**已废弃**，checks 迁移到本地插件 `@amp/review-checks`。
  - Amp 的 GitHub App 主要用于克隆、推送、开 PR；GitHub 自动化功能仍是实验性的。
- **CI 方案**：官方示例仓库 `sourcegraph/cra-github` 提供 Action 或自托管 webhook，需要 `AMP_API_KEY`。另一个示例 `amp-examples-and-guides/github-review-bot` 需要额外配 PAT。
- **规则**：`.agents/checks/*.md`，按目录生效，但这是给本地插件用的。
- **链接**：<https://ampcode.com/docs/review>，<https://ampcode.com/news/liberating-code-review>，<https://github.com/sourcegraph/cra-github>，<https://ampcode.com/docs/github>

#### 8. Gemini（Gemini Code Assist on GitHub）

- **重要变化**：**消费者免费版已下线**：2026-06-18 起不能新装，2026-07-17 起停止审查。现在只剩**企业版（Preview）**，要在 Google Cloud 控制台通过 Developer Connect 接入。
- **自动 review**：开 PR 会自动做初审。手动命令有 `/gemini review`、`/gemini summary`、`/gemini`、`/gemini help`。
- **配置文件**：
  - `.gemini/config.yaml`：可设 `comment_severity_threshold`、`max_review_comments`、`ignore_patterns`、`include_drafts`、`code_review.disable` 等。
  - `.gemini/styleguide.md`：自然语言风格规则。
  - 不会审 `.github/workflows` 下的文件。
- **路径过滤**：✅ `ignore_patterns` 支持 glob，是托管类里**唯一官方的硬路径过滤**。
- **计费**：Preview 期间免费，但 GCP 项目必须挂有效结算账号，配额 100+ PR/天。
- **替代**：Google 官方 Action `google-github-actions/run-gemini-cli`。用 `GEMINI_API_KEY`，开 PR 自动审，或评论 `@gemini-cli /review`；读 `GEMINI.md`，可以自己写 `paths`。
- **链接**：<https://developers.google.com/gemini-code-assist/docs/customize-gemini-behavior-github>，<https://docs.cloud.google.com/gemini/docs/code-review/use-code-assist-github>，<https://developers.google.com/gemini-code-assist/docs/deprecations/consumer-code-review>，<https://github.com/google-github-actions/run-gemini-cli>

#### 9. Claude Code（Anthropic）

- **托管 Code Review**（research preview，**仅 Team / Enterprise**）：
  - 每个仓库选一种触发：Once after PR creation / After every push / Manual。
  - `@claude review` 只审一次；`@claude review always` 会订阅后续每次 push。
  - fork 来的 PR 只能靠评论触发。
  - check run 结论永远是 neutral，不会阻塞合并。
  - **规则文件**：`REVIEW.md`（根目录，只给 review 用，可写严重度、nit 上限、Skip 路径、必查项）；`CLAUDE.md`（分目录）。
  - **计费**：平均每次 $15–25，走 usage credits 单独计费，可设月度上限。
- **官方 Action** `anthropics/claude-code-action@v1`（个人可用）：
  - 鉴权用 `ANTHROPIC_API_KEY`，或 Pro/Max 订阅的 `CLAUDE_CODE_OAUTH_TOKEN`。
  - 两种模式：交互模式（`@claude`）和自动模式（给 `prompt`）。
  - 路径、触发、并发全由 workflow 决定。
  - 可以把 `ANTHROPIC_BASE_URL` 指向 MiniMax 或 GLM 的兼容端点（这是 MiniMax、z.ai 的文档和社区做法，不是 Anthropic 官方支持）。
- **坑**：托管版个人账号用不了。官方 Claude GitHub App 权限范围很宽；介意的话，用自建 App 加只读权限跑 Action。
- **链接**：<https://code.claude.com/docs/en/code-review>，<https://code.claude.com/docs/en/github-actions>

#### 10. Cursor（Bugbot）

- **自动 review**：托管，默认每次 PR 更新都审。手动用 `cursor review` 或 `bugbot run`；`verbose=true` 可以看这次用到了哪些规则。
- **控制触发**：个人设置可选「只在提及时运行」或「每个 PR 只跑一次」。Admin API 里有 `manualTriggerOnly`。
- **配置文件**：`.cursor/config/bugbot.yaml`（version 1），字段有 triggers.frequency（everyPush / oncePerPr）、drafts、review.effort、incremental、prSummary、autofix。读的是 **base 分支**上的版本。
- **规则文件**：`.cursor/BUGBOT.md`（根目录始终加载，子目录按改动文件加载）、Team Rules、learned / manual rules（可带 Scoped paths）。`.cursor/rules/*.mdc` **不生效**。
- **路径过滤**：yaml **没有** ignore / paths 字段。Scoped paths 只决定「哪条规则在哪些路径生效」，不决定「这些路径审不审」。所以只能在 BUGBOT.md 里写软约束。
- **计费**：2026-05 起按用量：先消耗套餐内额度，再走 on-demand。
- **本仓现状**：`extensions/cli/.cursor/BUGBOT.md` 仍在，内容是 CLI 审查要点，只作用于该目录的改动，属于软约束。仓库里没有 `.cursor/config/bugbot.yaml`。搁置卡的实测是：github-actions 发的 `bugbot run` 不被认；云端 Agent 以 Cursor App 身份发的评论也不认；不要引入 token/PAT。本页不重做这条触发调研，见 [搁置卡](https://github.com/VirusPC/edges/blob/main/.edges/tasks/edges-extensions/todo/2026-10-11--%E6%90%81%E7%BD%AE%E5%8F%AA%E8%AE%A9-CLI-%E7%9A%84-PR-%E8%87%AA%E5%8A%A8%E8%A7%A6%E5%8F%91-Bugbot/INDEX.md)。
- **链接**：<https://cursor.com/docs/bugbot>

### 试点建议

以下是 2026-10 调研给出的排序，面向 VirusPC/edges 这种个人或小团队、偏好可控触发、已经被 Bugbot 路径过滤坑过的仓库。**尚未选定**；grill 之后再定 1 个试点，范围和验收另开 Task。

**第一选：Codex `@codex review`（手动模式）。** 前提是已有 ChatGPT Plus 及以上。不开 Automatic review，只在想审的 PR 上评论 `@codex review`，可加一句关注点。规则直接写进现有 AGENTS.md 的 `## Code Review Rules`，按目录嵌套。好处是零基建、零 PAT、只报 P0/P1、噪声低，触发完全由人决定。代价是没有硬路径过滤，但手动触发已经绕开了这个问题。

**第二选：官方 Action 方案，用 `on.pull_request.paths` 做硬过滤，加评论或 `workflow_dispatch` 触发。** 想要「指定目录变更才自动审」时用这个，建议优先 **`anthropics/claude-code-action`**：

- 后端可以用 Pro/Max 的 OAuth token，也可以换成 MiniMax 或 GLM 的 Anthropic 兼容端点来压成本；
- 可直接参考 `MiniMax-AI/cli` 的 `ai-pr-review.yml` 模板（自带 paths、跳过 draft/fork、sticky comment），规则写在 `CLAUDE.md` 或 prompt 里。

已有 Factory 订阅的话，`Factory-AI/droid-action`（`automatic_review` 加 `paths`）是同等可控的替代，但要留意它没发现问题时会自动 approve。

**暂不建议**：

- Kimi / MiniMax / GLM 的社区 action：只适合当 claude-code-action 的模型后端，不要直接依赖 `@main` 的个人 action。
- Amp：官方没有 PR review 产品。
- Gemini：消费者版已下线，企业版需要接 GCP。
- Claude 托管 Code Review：仅 Team/Enterprise，且平均每次 $15–25。

### 待核实

- Codex：Review trigger 具体选项与 Code Review 额度数字官方未公开。
- Factory：套餐价格未在官方 pricing 页核对；`droid-action` 能否关闭自动 approve 未逐行核对。
- Gemini 企业版：Preview 结束后的收费方式未知；个人账号下 github.com 仓库是否可用需实测。
- Amp：价格未核实；`sourcegraph/cra-github` 维护状态未确认。
- Kimi：未在官方文档找到 Anthropic 兼容端点，能否作 claude-code-action 后端未确认。
- GLM Coding Plan / MiniMax Token Plan：条款是否允许 CI 无人值守调用未核对。
- Claude Pro/Max OAuth token 跑 Actions 的额度占用未量化。
- Devin：非 Enterprise 自助加入的价格未核实。
- Cursor：`Fail on unresolved issues` 适用范围不清；bugbot.yaml 未来是否加 ignore 字段需关注。

### 其他候选

本轮没有按上面的口径逐项核对，只保留名字，避免和已写过的 10 项重复。Claude Code 见第 9 项。

- CodeRabbit
- Greptile
- GitHub Copilot code review
- Graphite Diamond（仅在已经使用 stacked PR 时考虑）

## 评估维度

- 能力与误报
- 接入方式（GitHub App、Actions、@mention）
- 路径与规则过滤（能否只审 CLI 等指定范围）
- 成本
- 与 edges 的 `AGENTS.md` 和中文工作流是否契合
- 密钥与安全面

## 非目标

- 不在本项目里重做 Bugbot 的目录触发。
- 不同时在同一仓库开两套自动审查，避免两套评论互相争辩。

## 下一步

grill 之后选定 1 个试点。试点范围和验收另开 Task。
