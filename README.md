# Edges

[![npm](https://img.shields.io/npm/v/@viruspc/edges?label=npm&color=CB3837)](https://www.npmjs.com/package/@viruspc/edges) [![站点部署](https://github.com/VirusPC/edges/actions/workflows/deploy.yml/badge.svg)](https://github.com/VirusPC/edges/actions/workflows/deploy.yml) ![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/VirusPC/edges?utm_source=oss&utm_medium=github&utm_campaign=VirusPC%2Fedges&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

**harness 任何目录。你的大脑，也是一个目录。**

*Harness any directory. Your brain is one too.*

harness 就是一组 Markdown 文件加 Git。仓库里的那套，给 Cursor、Codex 这类写代码的 Agent 用；你的大脑是一个不落盘的虚拟目录，它的那套单独放在一个仓库里，给 Grok Bot 这类 personal agent 用。你纠正过的、拍板过的、想明白的，都会留在对应的那一套里，经你审核合并后，下一个 Agent 直接接着用。

- **持续自进化**：每一次反馈都会自动沉淀，下次不再重犯。Edges 自己也用 Edges 维护：改进 Edges 的方法，也在被 Edges 改进，RSI 的成果随每一次升级交到你手里。
- **将 harness 放在与被 harness 对象最近的地方**：Edges 允许为任何目录创建局部 harness，并通过树结构将整个仓内的 harness 文件串联起来。每次任务只加载与其最相关的 harness。
- **不止停留在仓库**：海量经验知识从不同端捕获到仓库，但不止停留在仓库。将它们提炼成简单可复用的判断优势（Edge，Edges 由此得名），并进一步转化为博客、播客、视频、PPT 等丰富的对外分发资料，用更低的边际成本取得更大收益。
- **任何目录**：以文件系统模型为核心，允许为任何仓库、仓库里的任何目录配置 harness。你的大脑，也是一个目录。
- **任何人**：既是个人的 harness，也是团队的 harness，取决于目录的共享范围。
- **任何 Agent**：不与 Codex、Claude Code、Grok Bot 等任何 Agent 绑定。记忆、技能、任务看板、笔记——跟随仓库的多 Agent 多人协作平台。一切尽在掌控之中。
- **超级个体**：个人第二大脑，认知复利系统。持续快速地提升自己，实现个人大脑的快速进化。

经验在这几层之间循环，越滚越大：

```text
(1) 多端捕获：对话 / 文章 / 实践 / 学习
        │
        ▼
(2) 提炼：可复用的判断优势（Edge）
        │
        ├──> 调用：用在新的判断和行动里
        └──> 输出：博客 / 播客 / 视频 / PPT / 站点
        │
        ▼
(3) 反馈：结果 / 问题 / 反驳 / 新证据 ──> 回到 (1)
```

## 使用方式

### 推荐：让 AI 接入

把下面这句话复制给你的 AI：

```text
读 https://raw.githubusercontent.com/VirusPC/edges/main/extensions/skills/edges-onboarding/SKILL.md ，帮我接入 edges
```

AI 会检查 Node 和 git，安装 edges CLI，在你选定的目录里初始化，并在临时目录里验证笔记和任务能写、能读。

### 手动

需要 Node.js 22.20 及以上，以及 git。

```bash
npm install -g @viruspc/edges
cd <你的目录>
edges --scope . init -- -g -y
```

`--` 后面的 `-g -y` 交给 skill 安装器：`-g` 装到用户目录，`-y` 在没有 TTY 时跳过确认。然后可以写笔记、建任务：

```bash
edges --scope . notes create --title "标题" --body "正文 Markdown"
edges --scope . notes list
edges --scope . tasks create --title "修复构建" --project default
edges --scope . tasks list
```

把外部 harness 仓库挂进当前目录用 `edges compose`，步骤见 [`edges-compose`](extensions/skills/edges-compose/SKILL.md)。完整命令见 [`extensions/cli/README.md`](extensions/cli/README.md)，或运行 `edges --help`。

## 本仓：作者的大脑仓库

本仓既是 Edges 的源码仓库，也是作者大脑的 harness 仓库。这个实例的目标是：持续提升自己，也持续提升自我改进的能力。

| 目录 | 作用 |
| --- | --- |
| [`notes/`](notes/README.md)、[`projects/`](projects/)、[`memory/`](memory/README.md)、[`teaching/`](teaching/README.md) | 知识生产：低成本捕获、专项工作区、Agent 能力调研备忘、教学工作区 |
| [`retrospectives/`](retrospectives/README.md) | 阶段性回看：周复盘与日复盘 |
| [`edges/`](edges/README.md) | 提炼出来、可以反复使用的判断 |
| [`posts/`](posts/README.md) | 对外博客成稿，由作者亲手维护 |
| [`tasks/`](tasks/README.md)、[`.harness/tasks/`](.harness/tasks/README.md) | 领域任务与 Edges 维护任务看板 |
| [`archive/`](archive/README.md) | 退出活跃区域的内容 |
| [`extensions/`](extensions/README.md) | 接入和操作 Edges 的 CLI、MCP、skill 与应用。打进 npm 包的是 `extensions/skills/` |
| [`shared-extensions/`](shared-extensions/README.md) | 不依赖 Edges、跨机器跨 Agent 共用的能力。通用 skill 在 [`shared-extensions/skills/`](shared-extensions/skills/README.md)，不打进 `@viruspc/edges` |
| [`.harness/`](.harness/) | 本仓自身的维护记忆、技能、评测与观测 |

对外输出可以直接看：[教学站](https://edges.viruspc.tech/teaching/)、[任务看板](https://edges.viruspc.tech/tasks/)。

## 参与开发

```bash
git clone --recurse-submodules https://github.com/VirusPC/edges.git && cd edges
pnpm install && pnpm setup && pnpm skills:link
pnpm build && pnpm test
```

已有克隆若没有评测 submodule：`git submodule update --init .harness/evaluation/third_party/locomo`。可用命令以根 [`package.json`](package.json) 为准，专项命令见各子目录 README。

## 文档地图

- [`AGENTS.md`](AGENTS.md)：Agent 的入口，含硬约束与分层项目记忆。
- [`CONTEXT.md`](CONTEXT.md)：领域术语表。
- [`docs/adr/`](docs/adr/)：架构决策记录。
- [`docs/architecture.md`](docs/architecture.md)：内部架构思想。
- [`docs/recursive-layout-migration.md`](docs/recursive-layout-migration.md)：目录升级与本机私有材料迁移。
- [`CHANGELOG.md`](CHANGELOG.md)：仓库级变更记录，tag 使用 `vX.Y.Z`；对外 skill 各自独立 semver，`shared-extensions/` 整层使用自己的 [`VERSION`](shared-extensions/VERSION) 与 [`CHANGELOG.md`](shared-extensions/CHANGELOG.md)。
- [`scripts/`](scripts/README.md)、[`.harness/evaluation/`](.harness/evaluation/README.md)、[`.harness/observation/`](.harness/observation/README.md)：维护脚本、评测与观测。

## 隐私与脱敏

本仓库公开在 `github.com/VirusPC/edges`，写入即等同公开发表：

- token、API key、密码、私钥、cookie 等凭据，个人信息、未公开 IP，以及 `.docx`、`.xlsx`、`.pptx` 等办公二进制文件绝不入库。
- 内部域名、系统名、服务名、代码路径、同事身份和排期等标识符必须删除或改写为通用表述后才能入库。
- 截图按「能否直接放到公开博客」判断；需要打码、包含内部 UI 或可能泄漏上下文的截图不要入库。
- 发现疑似泄漏时立即停止并告知仓库所有者；删除工作区文件不等于清除 Git 历史，`git filter-repo`、force push 等历史重写必须由仓库所有者确认并执行。

## License

[MIT License](LICENSE)。

<!-- project-entries-local:start -->
## 本层内容

- [领域任务](tasks/README.md) — 根作用域领域工作项看板（系统入口见同目录 AGENTS.md）。
- [笔记](notes/README.md) — 低成本捕获与在研想法。
- [调研备忘](memory/README.md) — Agent 能力调研时的优先关注清单等短备忘。
- [复盘](retrospectives/README.md) — 周复盘与日复盘的阶段性回看记录。
- [教学](teaching/README.md) — 有状态的教学工作区与主题课页。
- [认知优势](edges/README.md) — 已提炼、可复用的判断资产。
- [对外成稿](posts/README.md) — 准备公开发表的博客成稿（人维护）。
<!-- project-entries-local:end -->
