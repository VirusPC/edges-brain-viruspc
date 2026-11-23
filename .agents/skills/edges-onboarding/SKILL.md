---
name: edges-onboarding
description: 帮用户给已有项目添加 edges harness 目录，创建独立 edges harness 仓库，或把已有个人大脑接入当前 Agent 客户端（接入已有大脑）。负责收齐必要信息、安装 CLI、初始化和验证；独立仓库默认包含 GitHub 建仓及首次推送。
version: 0.7.3
---

# Edges 接入

## 何时用

根据用户想做的事对照下表。多个场景可以使用同一条流程。

| 用户场景 | 使用流程 |
| --- | --- |
| 给正在开发的项目保存约定、经验和维护任务，方便 Agent 接续工作 | 已有项目添加 edges harness 目录 |
| 给某个目录，例如为 monorepo 中的某个子包单独积累上下文 | 已有项目添加 edges harness 目录 |
| 创建个人大脑，长期保存笔记、知识与个人项目，记录 idea 和个人待办并追踪后续进展 | 创建独立 edges harness 仓库 |
| 我已经有个人大脑，想在新的 Agent 客户端或客户端工作区里继续使用 | 接入已有大脑 |
| 把个人常用方法与 skills 放在一个仓库，供多个项目挂载复用 | 创建独立 edges harness 仓库 |
| 建立团队共享的规范与经验库，供各项目使用 | 创建独立 edges harness 仓库 |

仅安装 CLI 或排查接入问题时，处理对应步骤即可。

## 开始前提问

先看上下文；场景或流程已明确就沿用，不要再问。

**第一步：问场景（含流程兜底）。** 缺了则问一轮，选项按下列顺序给出——前六项是场景，后两项是流程兜底；不要把这两条流程当成开场的唯一菜单。

1. 给正在开发的项目保存约定、经验和维护任务，方便 Agent 接续工作（已有项目添加 edges harness 目录）
2. 给某个目录，例如为 monorepo 中的某个子包单独积累上下文（已有项目添加 edges harness 目录）
3. 创建个人大脑，长期保存笔记、知识与个人项目，记录 idea 和个人待办并追踪后续进展（创建独立 edges harness 仓库）
4. 我已经有个人大脑，想在新的 Agent 客户端或客户端工作区里继续使用（接入已有大脑）
5. 把个人常用方法与 skills 放在一个仓库，供多个项目挂载复用（创建独立 edges harness 仓库）
6. 建立团队共享的规范与经验库，供各项目使用（创建独立 edges harness 仓库）
7. 已有项目添加 edges harness 目录
8. 创建独立 edges harness 仓库

选前六项时走括号里的流程；选后两项时直接走对应流程。

**第二步：补参数。** 场景或流程确定后，能从上下文和环境推断的当作默认，只把缺失项集中问一轮。Agent 宿主从当前环境识别。

| 流程 | 需要确定 |
| --- | --- |
| 已有项目添加 edges harness 目录 | 目标目录 |
| 创建独立 edges harness 仓库 | 用途与内容边界、本地路径、GitHub owner/name，以及明确选择 private 或 public |
| 接入已有大脑 | 大脑所在路径或远端仓库地址（多份 clone 时列候选）；当前客户端若环境识别不出再问 |

private 仅向获授权的使用方开放，public 的内容公开可读。用户同时要求挂载时，一并确定使用方项目目录。

创建独立仓库默认包含本地建仓、GitHub 建仓、首次提交和推送。用户明确要求仅本地时，跳过 GitHub 信息收集与远程步骤。已获得这些信息和授权后连续完成，出现已有内容或配置冲突时再询问。

## 接入流程

选定流程后执行对应分支，先检查环境与操作边界：

- 先用 `edges --version`、`edges --help` 核对已有 CLI；检查 `node -v`（≥22.20.0）、`npm -v`、`git --version`。缺失或版本不符时先处理，不盲目重装。
- 安装前确认能访问当前 npm registry；超时先核对网络、代理与 `npm config get registry`，不擅自修改全局 npm 配置。仅在尚未安装 CLI 时执行下面的安装命令。
- 保留已有文件、说明与约束；Edges 的结构与索引交给 CLI，不手写替代。出现已有内容或配置冲突时先核对确认，不覆盖、不清理现场；提交和推送须在用户授权范围内。
- 不索取、读取或复述 token、密码、私钥等凭证，也不写进文件、日志或提交；需要凭证时由用户自行授权。

```bash
npm install -g @viruspc/edges@latest
edges --version
```

### 已有项目添加 edges harness 目录

1. 读取目标目录的 README.md 与 AGENTS.md，保留已有说明和约束。
2. 在目标目录运行初始化，生成 .edges/ 材料目录与 AGENTS.md 入口。

   ```bash
   edges --scope <目标目录> init -- -y
   ```

3. 让当前 Agent 加载目标 AGENTS.md，检查材料入口与 skills 可发现。提交和推送按用户要求执行。

### 创建独立 edges harness 仓库

1. 在选定位置创建目录并用 Git 建仓。已有目录先核对用途与状态。
2. 运行初始化。

   ```bash
   edges --scope <仓库目录> --super init -- -y
   ```

3. 补充 README.md 的用途说明。`init --super` 已在 AGENTS.md 硬约束写入独立仓提示；这里再记内容归属与隐私边界，不要删掉或再写一遍那句。检查当前 Agent 能加载入口并发现根目录材料与 skills。
4. 用已连接的 GitHub 工具或已鉴权的 gh 创建仓库；gh 未鉴权时，让用户在自己的终端执行 `gh auth login` 并完成授权，不索取 PAT。按明确选择设置 private/public。检查待提交文件，首次提交并推送，读回远程可见性和提交 SHA。返回仓库地址、本地路径和分支。仅本地接入在本地验证完成后交付。
5. **默认继续接入当前客户端**（缺参数再补问）。用户可选稍后再接。识别宿主后打开 [references/client-access/](references/client-access/README.md) 对应分组指南，再按 [contract.md](references/client-access/contract.md) 核验。步骤细节见下一节「接入已有大脑」的第 2–4 步。
6. **旁路（可选）**：仅当用户要求把大脑挂进某个代码项目时，在使用方项目执行 Compose，再检查条目已检出、入口可读。Compose 不是把大脑接到客户端工作区的主路径。

   ```bash
   edges --scope <使用方项目> compose add \
     --name <名称> --remote <仓库Git地址> \
     --description "存什么，以及何时往这里写"
   edges --scope <使用方项目> compose list
   ```

GitHub 同名仓库或已有 origin 先核对，遇到冲突保留现场并报告。中途失败时说明已完成的步骤，重试复用已有结果。

### 接入已有大脑

把已有个人大脑接入当前 Agent 客户端。不新建仓库、不在 GitHub 建仓，也不套用「已有项目添加 edges harness 目录」。

1. **定位大脑**：先问大脑在哪（本机目录或远端仓库地址；需要时再 clone）。若环境里有多份 clone，列出候选让用户选；只有存在真实使用记录时才把某份标为「最近使用」并优先，不猜。
2. **识别客户端**：从当前会话与环境识别宿主；识别不出且影响分组时再问。不要让用户先选 personal / work / coding / chat 菜单。按 [client-access/README.md](references/client-access/README.md) 打开对应分组指南。
3. **按指南接入**：有客户端工作区概念的客户端，把客户端工作区根设为大脑仓库根；Grok Bot 没有绑定工作区的概念，从所有 Bot 共用的共享长期记忆检索大脑仓库身份与路径，先读该路径的 `AGENTS.md`。指南在 `references/client-access/`（personal、work-space、coding、chat）。
4. **核验**：按 [contract.md](references/client-access/contract.md) 的七层可观察证据逐层确认。第 7 层 Git 同步必验；任一层失败记入报告，不阻塞其他层。未实测处保持「未实测 / 待试」，不得写成已支持。
5. **可选：接入 Langfuse 观测**：需要记录和评估 Agent 使用大脑的过程，可以继续接入 Langfuse，按对应可观测性 Skill 操作（[edges-langfuse-agent-tracing](../edges-langfuse-agent-tracing/SKILL.md)）。此步可选，不属于接入必验项。

### 遇到问题

先读 stdout 的 `errorCode`、`reason` 与 stderr 的诊断；分享输出前移除凭证及 URL 中的密钥。失败后核对已完成的步骤，修复原因再重试，不把部分成功当成全未执行。

| 现象 | 处理 |
| --- | --- |
| `edges: command not found` | 核对是否安装；已装时用 `npm prefix -g` 定位全局目录，检查对应可执行文件目录是否在 PATH（类 Unix 通常为该目录下的 `bin`），重开终端再验证。不因 PATH 问题反复安装。 |
| 找不到所属 scope / Git 仓库 | 核对目标路径，显式传 `--scope <目标目录>`；不要为消除报错在错误目录初始化。 |
| `SKILLS_INSTALL_FAILED` | 结构可能已写入，先看返回的 `created` 和安装器 stderr；检查 Node 版本、网络与非交互参数 `-y`，修好后重跑原命令，不删除已有材料。 |
| 已装 skill 但 Agent 找不到 | 核对目标 scope、宿主及安装目录；需要时运行 `edges --scope <目标目录> skills init -- -y --agent <宿主标识>`（有效标识查帮助）。默认装当前项目，只有明确要用户级安装时才加 `-g`；重新加载宿主后验证。 |
| busy / 写锁冲突 | 等同一 worktree 的其他写命令结束再重试，不手动删除正在使用的 `.edges-write.lock/`；无法判断锁状态时保留现场并报告。 |
| 答不出大脑 AGENTS.md 里的约定 | 客户端工作区可能不是大脑根，或（Grok Bot）共享记忆里的路径未检索到或已失效；按该客户端分组指南与 contract 第 2 层排查。 |
| 技能列表里没有 edges | 技能未装到当前客户端可发现的位置；两边皆可（仓库或用户级），不设权威。 |

命令参数以 `--help` 为准，详细用法见 [CLI 文档](../../cli/README.md)，挂载规则见 [Compose 说明](../edges/references/compose.md)。
