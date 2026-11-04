<!-- edges-memory-type:start -->
name: feedback
module: memory
writable: true
gitignore: false
format: ordinary
<!-- edges-memory-type:end -->

# FEEDBACK — 纠正与约束

> 记：用户给出的纠正、明确确认过的做法，以及必须始终生效的禁止模式和它的原因。
> 不记：读代码就能看出来的写法，以及 `AGENTS.md` 已经写过的规则。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。
> 本文件只是索引，条目区块由脚本重算，正文写在 `feedbacks/feedback_<slug>/index.md` 里。

<!-- edges-entries-local:start -->
## 本层内容

- [AGENTS.md 本层入口顺序：user → feedback → project → reference](feedback_agents_local_type_order/INDEX.md) — 改 AGENTS.md 本层记忆清单或挑类型时：先 user，再 feedback，再 project（兜底），再 reference；skills / agent\_skills 仍靠后。
- [--root-dir 封住记忆树，不把外面的 .memory 当祖先](feedback_isolated_root_dir/INDEX.md) — 目标目录就是 --root-dir 时，不要把仓库里其他位置的 .memory 当成这棵树的祖先。
<!-- edges-entries-local:end -->
