# edges-brain-viruspc

[![npm](https://img.shields.io/npm/v/@viruspc/edges?label=npm&color=CB3837)](https://www.npmjs.com/package/@viruspc/edges) [![教学站部署](https://github.com/VirusPC/edges-brain-viruspc/actions/workflows/deploy.yml/badge.svg)](https://github.com/VirusPC/edges-brain-viruspc/actions/workflows/deploy.yml)

> **这是 peng cheng 的个人大脑主干仓。** 笔记、教学、复盘、个人任务、个人项目、博客成稿都在这里长，也是 `edges-publish` 写入个人内容的目标。不绑定 Edges 的通用 skill 在根 [`skills/managed/`](skills/managed/README.md)，装机笔记在 [`new-server/`](new-server/)。长期保留，不归档。

**harness 任何目录。你的大脑，也是一个目录。**

*Harness any directory. Your brain is one too.*

## 两个仓库

| | 本仓 `VirusPC/edges-brain-viruspc` | 框架仓 [`VirusPC/edges`](https://github.com/VirusPC/edges) |
| --- | --- | --- |
| 是什么 | peng cheng 的个人大脑 | Edges 框架 |
| 放什么 | 笔记、教学、复盘、个人任务、个人项目、博客成稿（`posts/`）、通用 skill（根 `skills/managed/`）、装机笔记（`new-server/`）、`edges-publish` 的写入目标 | CLI `@viruspc/edges`、extensions、skills、ADR、任务看板站点构建、artifacts 预览服务、相关 workflow |
| 怎么用 | 直接在本仓写个人内容 | `npm install -g @viruspc/edges`，或克隆框架仓开发 |
| ECS | `/teaching/`：检出 `/home/cheng-dev/projects/edges`，本仓 Deploy 只更新这份检出 | `/tasks/` 与 `/artifacts`：检出 `/home/cheng-dev/projects/edges-framework`，由框架仓部署 |

公开仓库之间不互相 Compose。本仓不挂 [`VirusPC/edges`](https://github.com/VirusPC/edges)，框架仓也不挂本仓。Compose 挂载在私有工作空间根 `VirusPC/edges-workspace-viruspc`：那边已经把两个大脑装成 `.edges/compose/` 下的 git submodule。

要用 Compose，日常命令是 `edges compose add`、`edges compose list`、`edges compose update`。没有 `clone`。挂载目录是仓内 `.edges/compose/<name>`，底层是 git submodule。这些挂载不写在本仓。

查 CLI、extensions、skills、ADR 时直接看框架仓；要改框架，去那边开 PR。个人知识写本仓。

术语表与架构决策在框架仓：[`CONTEXT.md`](https://github.com/VirusPC/edges/blob/main/CONTEXT.md)、[`docs/adr/`](https://github.com/VirusPC/edges/tree/main/docs/adr)。

## 这个仓库在做什么

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

| 目录 | 作用 |
| --- | --- |
| [`notes/`](notes/README.md)、[`projects/`](projects/)、[`memory/`](memory/README.md)、[`teaching/`](teaching/README.md) | 知识生产：低成本捕获、专项工作区、调研备忘、教学工作区 |
| [`retrospectives/`](retrospectives/README.md) | 阶段性回看：周复盘与日复盘 |
| [`edges/`](edges/README.md) | 提炼出来、可以反复使用的判断 |
| [`posts/`](posts/README.md) | 对外博客成稿，由作者亲手维护。博客成稿和「站点与内容」维护项目（[`.edges/tasks/site-and-content/`](.edges/tasks/site-and-content/README.md)）只在本仓，框架仓不再保留 |
| [`tasks/`](tasks/README.md)、[`.edges/tasks/`](.edges/tasks/README.md) | 领域任务，以及仍留在本仓的个人维护任务（技术阅读、客户端体验、站点与内容、拆仓卡） |
| [`archive/`](archive/README.md) | 退出活跃区域的内容 |
| [`new-server/`](new-server/) | 新服务器开荒的个人运维笔记（建用户、DNS、Claude Code 切模型）。不是可安装扩展 |
| [`skills/managed/`](skills/managed/README.md) | 不绑定 Edges 的通用 skill。跨机靠 Compose 挂本脑仓即可用，不再做全局 `~/.agents` 安装，也不再打 `shared-extensions@*` |
| [`.edges/`](.edges/README.md) | 本仓自己的项目叶子、维护向 skill、个人任务。`.edges/skills` 仍是本仓 materials；维护向 skill（如 `linux-nas-direct-link`）在 [`.edges/skills/managed/`](.edges/skills/managed/README.md) |

对外可以看：[教学站](https://edges.viruspc.tech/teaching/)。任务看板 [https://edges.viruspc.tech/tasks/](https://edges.viruspc.tech/tasks/) 和 artifacts 预览由框架仓部署，不在本仓的 Deploy 里构建。

## 要用 Edges CLI

```bash
npm install -g @viruspc/edges
edges --help
```

需要 Node.js 22.20 及以上。开发 CLI、extensions 或 skills 时克隆框架仓，不要在本仓找 `extensions/` 或 `package.json`。框架仓的快速开始以[那边的 README](https://github.com/VirusPC/edges/blob/main/README.md) 为准。

## 文档

- [`AGENTS.md`](AGENTS.md)：本仓 Agent 入口，含硬约束与个人内容索引。本仓没有 Compose 登记。
- [`CHANGELOG.md`](CHANGELOG.md)：本仓变更。拆仓前的系统条目仍留在这里，对应正文在框架仓。`shared-extensions/` 隔间已废止，最后 annotated tag 是 [`shared-extensions@6.0.0`](https://github.com/VirusPC/edges-brain-viruspc/releases/tag/shared-extensions@6.0.0)，之后不再打该系列 tag。

## 隐私与脱敏

本仓库公开在 `github.com/VirusPC/edges-brain-viruspc`，写入即等同公开发表：

- token、API key、密码、私钥、cookie 等凭据，个人信息、未公开 IP，以及 `.docx`、`.xlsx`、`.pptx` 等办公二进制文件绝不入库。
- 内部域名、系统名、服务名、代码路径、同事身份和排期等标识符必须删除或改写为通用表述后才能入库。
- 截图按「能否直接放到公开博客」判断；需要打码、包含内部 UI 或可能泄漏上下文的截图不要入库。
- 发现疑似泄漏时立即停止并告知仓库所有者；删除工作区文件不等于清除 Git 历史，`git filter-repo`、force push 等历史重写必须由仓库所有者确认并执行。

## License

框架仓 [`VirusPC/edges`](https://github.com/VirusPC/edges/blob/main/LICENSE) 使用 MIT。本仓不再附带那份许可证副本。

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
