# 2026-10-20--多仓整仓挂载行业方案与 compose

> 附属层要「整仓源码挂进工作区、不抢主系统包管理」时，行业常见方案多数绕回清单 + clone；与现有 edges compose + Node Tree / AGENTS.md 契约最贴。

> **后来的决定盖过这篇的行动指南。** 当天稍后 Compose 改成 git submodule，日常命令是 `edges compose add`、`list`、`update`，挂载在 `.edges/compose/<name>`。2026-10-21 又拍板：公开仓库不互相挂载，挂载在私有工作空间根 `VirusPC/edges-workspace-viruspc`。下面是这场对话当时的记录，不要按「git clone 到约定路径、不做 submodule」操作。

## 背景

在讨论 edges「写入后如何同步到远程」时，用户澄清 compose 不只挂 memory：也可能挂组件仓、学习用的 Agent 源码仓，以及 Work Agent 工作区挂载。进一步追问：没有 edges 时行业怎么做、能否用 submodule / subtree / 清单工具 / ghq 等替代或增强现有 compose。目标是把多种行业方案摊开比，而不是过早收敛到单一答案。

## 主题

这场在对照「一个主仓 / 主题工作区需要整仓挂载多个其他 git 仓」的行业做法，并判断哪些能直接给 edges compose 用、哪些只是借鉴。

- 难点一：要整仓源码，又不能走 npm / Go 等主系统包管理（附属层不能抢入口）。
- 难点二：笔记要持久化、跨端复用，但不想把被学源码推进笔记仓。
- 难点三：现成多仓工具多为「自己的多仓一起开发」，和「挂在任意主系统边上的附属层」语义不合。

## 过程

### 23:41–23:50 场景展开

用户指出 compose 不一定是 compose memory，也可以 compose 外部组件仓；前端开发时可按 tag 挂组件仓。组件库有时翻 `node_modules` 也够。又提出 Work Agent（Codex、CoWork、WorkBuddy 等）学习某个 Agent 仓库时可挂到工作区。追问这是否与 git 机制重合：有重合（clone / worktree / submodule / sparse-checkout）；compose 的差在统一入口、钉版本、按用途定读写与是否 push。

### 23:46–23:54 学习笔记与目录

用户问 submodule 是否好：不适合当默认（嵌套 clone、更新路径长、PR 难审、Agent 易脏）。学习单仓推荐工作区内独立 `git clone`（可浅克隆、钉 tag），学完可删。笔记要持久化但不想要源码：笔记进自己的仓，源码只读临时 clone，笔记钉 commit/tag。多仓主题学习：主题工作区下多个只读 clone，笔记统一进自己的仓；单仓 / 多仓只是 sources 数量不同。没有 edges 时：自己的笔记仓 + 旁路 clone。示例目录：`notes/` 提交、`sources/` ignore。大笔记仓同理在对应目录 ignore。跨端问题：其他端拉笔记仓后不知道要下哪些源码 → 需要清单（当时提过 `SOURCES.md` / lock）。

### 23:55–00:01 纠正「常见做法」并调研

用户质疑手写 `SOURCES.md` 是否常见；承认不常见。更常见是整仓一起 clone、submodule、或不跨端复用挂载。用户要求行业主流方案，并做 research。结论：笔记与源码分开放 + ignore + 手动或脚本再拉是默认；没有标准「学源码 + 笔记 + 多机」文件格式。用户又强调通用场景「一个仓要用多个其他仓」且不能上包管理、要整仓源码。

### 00:03–00:08 七条方案开聊

用户要求不要擅自收敛，出多种行业方案。列出：1 submodule；2 subtree；3 清单 + 批量 clone；4 ghq；5 多根工作区；6 Dev Container / Codespaces；7 compose / 自研挂载。用户已知 1，细聊 2：subtree 把源码并进父仓历史，多父仓可指向同一远程但各有一份拷贝；对本场景体积胀、diff 吵、跨端被迫拉源码，不合适。

### 00:08–00:15 清单工具与 meta

细聊 3：vcstool、Android repo、myrepos、mani、gita、meta。机制适合（清单 + 整仓、不进父仓），但多为个人多仓开发壳，不宜整包当 edges 底座。前端工程场景下这些不能替代包管理，但用户纠正：场景本来就不是包管理，是旁路整仓挂载——则清单工具能直接用。star 大致：meta ~2.2k，gita ~2.0k，mani ~0.8k，vcstool ~0.5k；ghq ~3.8k（统一目录而非项目清单）。问 compose 是否用 meta：不合适当底座（定位、入口、路径、读写、版本、包管理边界、演进成本）；用户认同「还不如现在」。

### 00:15–00:35 ghq、IDE、容器，回到 compose

细聊 4 ghq：同仓一份、路径可预测；可作可选本机缓存，契约仍在 Node Tree。用户认为不需要多 VCS、list/fzf；认可 compose 自己 git clone 即可，不必上 ghq。5 多根工作区绑 IDE，Cloud Agent 无编辑器则用不上。6 Dev Container / Codespaces 本质仍是脚本 + clone，绕回 7。用户认为不必再细聊 7：行业方案聊完，仍是现有 compose + Node Tree / AGENTS.md。

## 结果

- 摊开并否决了 submodule（学习默认）、subtree（本场景）、整包 meta/mani/gita/vcstool/ghq 当 compose 底座、多根工作区与 Codespaces 作为 Cloud Agent 方案。
- 确认可借鉴：清单 + clone 机制；格式上继续用 AGENTS.md / Node Tree，不必另造 SOURCES。
- 可选增强（未拍板要做）：compose 需要时调 ghq 作本机缓存——用户倾向不需要。
- 原「写入后同步」grill（html-plan）仍可能进行；本场行业方案讨论已收敛到「维持现有 compose」。
- 未新开实现任务。

## 所学

- 「笔记 + 多源码 + 跨机」没有行业标准产品形态；默认是分开放 + ignore + 脚本。
- 附属层不能抢 npm/Go 时，整仓挂载只能走 git 级机制，不是包管理。
- subtree 多父指向同仓可行，但与「源码不进附属仓」相反。
- meta 等清单 CLI 解决的是「多仓一起开发」，不是「挂到别人主系统边上」。
- ghq 价值单薄：防重复 clone + 统一路径；核心几行脚本也能做，对 edges 非必须。
- 多根工作区 / Dev Container 是 IDE 或容器生命周期便利，不是挂载契约。

补充取舍：可选项含 submodule、subtree、清单工具整包替换、ghq 缓存层、自研 compose。不做前几项的原因见过程；最终认的是现有 compose + Node Tree 契约，git clone 到约定路径。

## 行动指南

### 主题行动指南

#### 背景

附属系统要在主工作区挂多个整仓 git 依赖或学习源码，且不能接管主系统包管理。

#### 核心问题

用什么机制声明「要哪些仓、哪个版本、挂哪里、可否写」，并在本机 / 云端工作区落地，同时不把他人源码吞进笔记或业务仓历史。

#### 核心解决方案

1. 契约放在主系统已有的节点描述（如 AGENTS.md / Node Tree），声明 URL、ref（tag/commit）、挂载路径、读写策略；不另造行业式 SOURCES 标准文件。相关可选项：单独 SOURCES.md / vcstool `.repos` / meta 配置——不做，因与现有 Node Tree 重复且语义更偏多仓开发壳。
2. 运行时用附属层 compose（或等价薄封装）执行 `git clone` / checkout 到约定路径；源码目录 ignore，不进父仓历史。相关可选项：submodule、subtree——不做默认；前者痛、后者吞进历史。
3. 按用途区分：只读学习 / 钉版本依赖 / 可写业务仓；push 与否不统一默认。相关可选项：一律可写如 meta——不做。
4. 本机去重缓存（如 ghq）可选，非契约层。相关可选项：强制依赖 ghq——不做，仅 git 即可。

#### 验收标准

- 换机或新 Cloud Agent 工作区：读契约即可知道要拉哪些仓与 ref，执行后源码在约定路径且未进入笔记仓提交。
- 主系统包管理（npm/Go 等）不被附属层替换或劫持。
- 学习场景可删源码目录而不丢笔记；笔记仍能指向当时的 commit/tag。

### 细节与其他

#### 若只要学源码并记笔记

则：主题工作区 `notes/` 提交、`sources/` ignore；单仓或多仓只改 sources 数量。不做 subtree。

#### 若前端工程要旁路看组件整仓

则：包管理仍走 npm；整仓挂载另开 compose/clone。不做用清单工具替代 package.json。

#### 若考虑引入现成清单 CLI

则：最多借鉴 YAML/`.repos` 字段设计，不把 meta/mani 嵌为底座。

#### 若本机已装 ghq

则可在 compose 内「有则复用路径、无则 clone」；无 ghq 时行为不变。

## 补充说明

- 原始材料：Grok Bot 与 peng cheng 本会话（约 2026-10-19 23:41–2026-10-20 00:35，Asia/Shanghai）；此前同会话 html-plan「Edges 写入后如何同步到远程」：[artifacts](https://edges.viruspc.tech/artifacts/3564b30a-b138-483b-af4e-62fccd28f5e4/)。
- 调研涉及公开仓：[x-motemen/ghq](https://github.com/x-motemen/ghq)、[mateodelnorte/meta](https://github.com/mateodelnorte/meta)、[nosarthur/gita](https://github.com/nosarthur/gita)、[alajmo/mani](https://github.com/alajmo/mani)、[dirk-thomas/vcstool](https://github.com/dirk-thomas/vcstool)；star 数为整理当日 API 读数，会变。
- 前端用组件库（非学习）主流仍是 npm + lockfile 或 shadcn 拷贝进项目；本场刻意排除包管理路径。
