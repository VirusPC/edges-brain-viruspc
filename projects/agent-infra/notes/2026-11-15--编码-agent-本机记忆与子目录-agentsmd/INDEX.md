# 编码 Agent 的本机记忆与子目录 AGENTS.md

> Claude Code 与 Codex 的产品记忆存在本机、不跟账号走；Cursor 和 Claude Code 能按需读子目录 `AGENTS.md`，Codex 只读从仓库根到启动目录这一路，不会再往下读。

## 背景

2026-11-15 晚上，用户向 Grok Bot 连续问了两件事：Claude Code 和 Codex 的 memory 是存在本机，还是跟账号走；以及 Claude Code、Codex、Cursor 这类编码 Agent，能不能读到子目录里的 `AGENTS.md`。助手在对话中对照各家官方文档后作答，并把它和 Edges 已有的做法对上：真正要所有 Agent 都遵守的硬规则，只能放在仓库根的 `AGENTS.md`。

同主题的普查已有一篇 2026-10-14 的笔记，记录过 Claude Code auto memory 只在本机、以及 Codex 从项目根读到当前工作目录的加载方式。本篇只收这场问答里核过的对照结论，尤其是「记在本机还是账号上」和「子目录 `AGENTS.md` 谁能读到」，不重写那篇普查。

## 主题

要分清两件容易混在一起的事：各家产品自己的 memory 存在哪里、换机器或上云端能不能带着走；以及仓库里层层 `AGENTS.md`，不同产品会不会读到子目录那一份。

- 难点一：ChatGPT 网页和 App 里的「记忆」跟 Codex 的 memories 不是同一套，不能用「OpenAI 账号有记忆」去推断 Codex 也能跨机器同步。
- 难点二：Cursor、Claude Code 对子目录 `AGENTS.md` 是按需加载，Codex 是启动时一次性沿路径加载，而且不会再往下探。
- 难点三：Claude Code 在已有 `CLAUDE.md` 时，默认可能根本不读 `AGENTS.md`，这和「支持嵌套 `AGENTS.md`」不是一回事。

## 过程

### 18:58 记忆是在本机，还是跟账号走

用户问 Claude Code 和 Codex 的 memory，是不是都存在本机，而不是本账号。助手核对官方文档后的结论是：对，两家都存在本机，不跟账号走。换一台电脑不会自动同步过去，云端任务也读不到。

Claude Code 的自动记忆（auto memory）是 Claude 自己写的笔记，路径是 `~/.claude/projects/<项目>/memory/`。它按 Git 仓分开，同一个仓的不同 worktree 共用一份，但官方文档写明不跨机器。人自己写的指令里，`~/.claude/CLAUDE.md` 同样只在本机；项目里的 `./CLAUDE.md` 提交进 git 后，可以随仓库跨机器共享。

Codex 存在 Codex home 下，默认是 `~/.codex/memories`，新装的是 `memories_v2`，官方文档也说是本地目录。它是整台机器共用一份，所有项目都读这一份；默认关闭，要自己打开。只有本地的 CLI、IDE 插件和 ChatGPT 桌面端的对话会喂给它，Codex Cloud 任务不会。另外要分清：ChatGPT 网页和 App 里的「记忆」是存在账号上的，跟 Codex 这套 memories 是两回事。

所以想在几台机器之间共用，靠它们自带的 memory 不行，得放进 git 仓库，比如项目里的 `CLAUDE.md` / `AGENTS.md`，或 Edges 的 memory。

这场对话没有问 Cursor 的 Memories 存在哪里，本篇也不补。

### 19:09 子目录里的 AGENTS.md 谁能读到

用户问 Claude Code、Codex、Cursor 等编码 Agent，能不能读到子目录下的 `AGENTS.md`。结论是：Cursor 和 Claude Code 都能按需读，Codex 不行。Codex 只读从仓库根到启动目录这一路上的文件，不会往下读。

- Cursor：官方文档写明支持嵌套 `AGENTS.md`。根目录那份每次都加载，子目录那份等 Agent 动到该目录或更深一层的文件时才加载。父子两层会合并，冲突时以子目录为准。
- Claude Code：子目录的 `AGENTS.md` 也是按需加载，用 Read 打开那个目录里的文件时才带上，前提是 2.1.277 及以上版本。有一个坑：根目录或上层目录里只要有任意一个 `CLAUDE.md`，或 `CLAUDE.local.md`，它默认就只读 `CLAUDE.md`，所有 `AGENTS.md` 都不读了。想两种都读，要在 `/config` 里把 Project instructions 设成 `claude-md-and-agents-md`。
- Codex：启动时一次性加载，从 Git 根一路往下读到启动的那个目录，每层最多读一份，然后就不再读了。例如在仓库根启动，`services/payments/AGENTS.md` 永远不会被读到，即使后来去改那里的文件也一样。想让它读，要用 `codex --cd services/payments` 从那个目录启动。另外这些文件加起来默认只读 32 KiB，超出的部分会被丢掉。

对 Edges 来说，这和此前已定的做法一致：真正要所有 Agent 都遵守的硬规则，只能放在仓库根的 `AGENTS.md`。子目录的 `AGENTS.md` 适合写局部约定，但不能指望 Codex 一定读到。

### 19:20 到 19:22 KV Cache 与 Prompt Caching

用户随后问为什么有人把 KV Cache、Prompt Caching 和记忆放在一起讲，并认为它们只是在优化性能。助手确认：它们本身不是记忆系统，只是让同一段已经算过的内容下次不用重算；缓存记的是计算状态，不是偏好、决策或跨会话结论。换会话、换机器，或提示词前面改一个字，缓存通常就对不上。重新计算一般也不会单单因此让结果更不确定，真正会飘的通常是采样本身。这部分是概念澄清，不作为本篇要保存的产品事实。

## 结果

形成了两条可复查的对照结论。产品记忆（Claude Code auto memory、Codex memories）在本机，不跟账号走，也不能指望云端任务读到；要跨机器共用，应放进仓库里的指令或 Edges memory。子目录 `AGENTS.md` 只有 Cursor 和符合版本与配置条件的 Claude Code 会按需读；Codex 只沿「仓库根 → 启动目录」这一路加载，硬规则必须写在仓库根。

## 所学

- 「这家公司的账号有记忆」不等于「这个编码 Agent 的 memory 会随账号走」。ChatGPT 网页和 App 的记忆跟 Codex memories 是两套。
- 本机产品记忆解决不了换机器和云端任务。跨环境要靠仓库里的 `CLAUDE.md` / `AGENTS.md`，或 Edges 自己的 memory。
- 嵌套 `AGENTS.md` 不是各家都支持。Codex 不是「动到那个目录再读」，而是启动时沿路径读完就停；在仓库根启动时，更深的子目录文件不会出现。
- Claude Code「能读 `AGENTS.md`」还有前置条件：版本要到 2.1.277，而且已有 `CLAUDE.md` 时，默认可能完全不读 `AGENTS.md`。
- 对所有编码 Agent 都生效的硬规则，仍然只能放在仓库根的 `AGENTS.md`。这不是新决定，这场核对给它补上了 Codex 读不到子目录这一条理由。

## 行动指南

### 主题行动指南

#### 背景

要决定一段规则或记忆写在产品自带 memory 里、子目录 `AGENTS.md` 里，还是仓库根的 `AGENTS.md` / Edges memory 里，并且期望本机、其他机器和云端任务都能遵守。

#### 核心问题

这段内容会不会只留在某一台电脑上，以及 Codex 会不会根本读不到它所在的子目录。

#### 核心解决方案

1. 不要把需要跨机器或云端任务也要用的内容，只写进 Claude Code auto memory 或 Codex memories。它们存在本机；Codex memories 还默认关闭，而且不进 Codex Cloud。
2. 需要所有编码 Agent 都遵守的硬规则，写在仓库根的 `AGENTS.md`。不要只写在子目录，并假定 Codex 之后改到那个目录时会补读。
3. 子目录 `AGENTS.md` 只放局部约定，并接受 Codex 在仓库根启动时可能读不到。若必须让 Codex 读到某层约定，要从那个目录启动，或把约定提升到它启动路径上的某一层。
4. 在已有 `CLAUDE.md` 的仓库里，若还希望 Claude Code 读 `AGENTS.md`，要把 Project instructions 设成 `claude-md-and-agents-md`，并确认版本不低于 2.1.277。可选项是只维护 `CLAUDE.md`、完全不依赖 `AGENTS.md`；若仓库要以 `AGENTS.md` 为一份跨产品约定，这条路不够。

#### 验收标准

- 能区分产品自带 memory、仓库内指令、Edges memory 各自能覆盖的范围：本机、跨机器、云端任务。
- 能说明 Cursor、Claude Code、Codex 对子目录 `AGENTS.md` 的差异，以及 Claude Code 在已有 `CLAUDE.md` 时的默认行为。
- 不把「ChatGPT 账号记忆」写成 Codex 或 Claude Code 的跨设备同步。

### 细节与其他

#### 若只在本机用 Claude Code 或 Codex，并接受记忆不同步

则可以把日常偏好留给产品自带 memory。这不影响硬规则仍应写在仓库根：只要还有 Codex 或其他机器、云端任务，子目录约定就不是全集。

#### 若要把某个子项目的约定给 Codex 用

则不要只在子目录放一份 `AGENTS.md` 并在仓库根启动。对话里的做法是 `codex --cd <子目录>` 从那一层启动，或把约定放到启动路径上。对话没有比较其它变通办法。

## 补充说明

- 原始材料：Grok Bot 对话，时间范围 2026-11-15 18:58–19:22（Asia/Shanghai）。助手在对话中说明已对照 Claude Code、Codex、Cursor 的官方文档，但没有给出具体文档 URL，本篇不补链接。结论以这场核对为准，产品行为后续可能变化。
- 相关笔记：[基于 git repo 与文件系统的 Agent Memory](../../../../notes/2026-10-14--基于-git-repo-与文件系统的-agent-memory/INDEX.md) — 2026-10-14 对文件式记忆的普查，已写过 Claude Code auto memory 只在本机、以及 Codex 从项目根读到当前工作目录。本篇是针对「本机还是账号」和「子目录 `AGENTS.md`」的对照，不替代那篇。
- KV Cache 与 Prompt Caching 的问答发生在同一次对话后半段，结论是它们属于性能优化、不是跨会话记忆。概念已经当场澄清，不写入本篇要保存的产品事实。
