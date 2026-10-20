# 这套 project-memory 系统的优点

本文只收「为什么值得用」：文件系统树 + `AGENTS.md` + `.memory` + ask / remember / doctor 这一族，相对常见的向量记忆 / 常驻服务，便宜在哪、稳在哪。机制、树算法和「当前边界」见 [memory-filesystem-tree.md](memory-filesystem-tree.md)；形状契约见 [PROTOCOL.md](https://github.com/VirusPC/edges/blob/main/extensions/skills/project-memory-init/references/PROTOCOL.md)。不重画架构，也不主张「第一次把记忆写成 Markdown / 树 / Git」——那些已有先例，见 [related-work](memory-filesystem-tree-related-work.md)。

真正站得住的优点是组合：把 harness 已经会做的事（加载 `AGENTS.md`）当成发现层，把目录位置当成作用域，把 Markdown 当成事实源。下面每条都是工程判断，不是产品口号。

## 1. 发现与按需加载几乎零自建成本

记忆体系最难的一环从来不是「怎么存」，是 **agent 凭什么会去读**。各家 coding harness 已经内建了 `AGENTS.md` 的加载语义：根那份无条件常驻，子树那份在读到该子树文件时才加载。索引直接写进这份文件，发现机制和渐进加载就都不用自己造——这是整套东西能只靠「文件 + `rg`」、不需要常驻进程或向量库的地基。

代价也写在同一处：一份文件同时装着人写正文和工具索引，所以受管区块不是便利，是合并的成立条件。工具只拥有自己划出的那块，区块外一字不动。

## 2. 目录位置直接编码作用域

「这条结论对哪些代码成立」由挂载目录表达，不另维护 repo / module / path 一类 scope 字段。一个文件的相关记忆就是从记忆根到它所在目录的祖先链——查表，不是猜。越深越窄，下层补充上层，读的时候叠加。

再加稀疏性：只有需要独立知识边界的目录才有 `AGENTS.md` + `.memory/`。父节点是最近的带记忆祖先，不是上级目录；中间空层不转发。检索成本主要跟树深度走，默认看不见兄弟子树，跨模块误召回天然少一截。

## 3. Git 可审计、人可编辑、可移植

记忆是仓库里的普通 Markdown。人用编辑器和 PR review，agent 用同一套文件；diff、blame、回滚都是现成的。换机器、换 harness、离线打开，都不依赖隐藏数据库或厂商客户端。权限边界也跟着仓库走：能 clone 就能读，gitignore 挡住的（本机 `user`）就不会进公开历史。

这不是独创，但是正确的默认：项目记忆本来就该和代码一起被审、一起被迁。

## 4. 有事实源的索引全量重算，减少漂移

具体记忆文件是 canonical source。类型入口可以从 frontmatter 整表重算，所以幂等：漂移能机械恢复，重复执行结果一样，并发写入也不靠文件锁——最后一次重算看得到磁盘上已有的全部条目。

抽出来的原则比实现细节更有用：**有事实源就全量重算；缺事实源、必须扫全树才能判断的，才交给 doctor。** 下层索引为什么增量、为什么 doctor 必须存在，都是这一条的推论，不是另起一套同步流程。

## 5. ask / remember 依赖自描述物，同步成本低

`remember` 认 `memory.py --help`，`ask` 认产物里每个链接后面那句 description。两者和实现是同一件事的两面，不会过期。整套几乎没有「改了 A 记得改 B」的人工同步点。

消费方因此可以版本偏斜：skill 单独升级，只要落盘仍是「链接 + 一句说明」，读方还能走。契约冻的是形状，不是入口叫 `FEEDBACK.md` 还是别的名字。

## 6. 硬约束与可检索记忆分流

不加载就会做错的规则写在 `AGENTS.md` 的 important 区块，入口一加载就在上下文里，不靠召回。只在特定问题下才需要的判断依据进 `.memory/`，按 description 挑，不永久占上下文。

这是 Instruction 与 Memory 的分家：硬约束失败是「没遵守」，记忆失败是「没打开」。混在一处，要么召回失败等于没写，要么背景知识常驻到把真正的仓规挤掉。ask / remember 也必须点名写在硬约束里——skill 列表一长，只靠 description 匹配会淹掉。

## 7. 渐进披露：索引一句，再决定打不打开

本层固定两跳：`AGENTS.md` → 某类型入口 → 条目正文。每一跳只暴露地址 + 一句说明。Agent 按问题和说明选下一跳，不把整棵树灌进上下文。

写时把入口清单、条目索引和 description 都算好；运行时只做两件不可预计算的事——挑哪一层、挑哪几条。于是 **description 质量就是运行时性能**：写得准就少打开正文。这是目前最值得加投资的写时杠杆，也是空档最大的地方。

## 8. 与代码仓库同构，不另造向量库也能工作

项目已经有目录树、Git、Markdown、`AGENTS.md`。记忆挂在这棵树上，作用域、发现、审计、生命周期都复用现成结构，而不是平行造一个「记忆产品」。BM25 / embedding / 图检索可以后加，但只该当派生物，不能取代文件事实源。

配套的写入闸门比换更强 embedding 更重要：能从代码或 git 推出的不记，临时进度不记，未验证猜测不记。规模化下的头号失败是膨胀和 context collapse；这套系统把「不记什么」写成闸门，而不是指望离线整理服务事后收拾。

## 9. 条目与清单用 slug / 无序列表，不用序号

协作写入时，身份靠 slug，清单靠无序子弹，不靠 `0001`、`0002` 或正文有序列表的插入点。文件名是 `project_<slug>.md` 这类 snake_case，不是 `0001-...`。类型入口是脚本从 frontmatter 重算出来的子弹列表，不是人手维护的编号序列。

多个 agent、多个 PR 同时往编号清单末尾加一项，就会抢下一个序号、互相改编号，diff 看起来像整表重排。无序子弹各插各的一行；独立 slug 文件各写各的路径。索引全量重算，入口文件里的顺序本来就不是协作身份。机制见 [memory-filesystem-tree.md](memory-filesystem-tree.md) 的「Markdown 是事实源」。

这和 ADR 的 `docs/adr/0001-...` 不是一回事。ADR 是给人读的决策日志，序号是人类时间线；记忆条目是多 agent 并发插入的工作文件。不要把这边的无序号纪律套到 ADR 上，也不要反过来用 ADR 编号当记忆身份。

## 这些优点对应的代价

便宜来自「白拿 harness、白拿目录、白拿 Git」，脆点也在同一批假设上：子树 `AGENTS.md` 的加载是 harness 行为，不是本仓库能保证的；下层索引缺独立事实源，所以要 doctor；常驻入口没有硬上限；结构正确不等于 description 能选路、内容仍然对。这些不是附录里的免责声明，是这套优点的另一面——展开见 [memory-filesystem-tree.md](memory-filesystem-tree.md) 的「当前边界」，以及 skill 层 [承重点与最脆三处](https://github.com/VirusPC/edges/blob/main/extensions/skills/project-memory-init/.harness/memory/projects/project_architecture/INDEX.md)。
