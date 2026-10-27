<!-- project-memory-type:start -->
name: feedback
module: memory
writable: true
gitignore: false
format: ordinary
<!-- project-memory-type:end -->

# FEEDBACK — 纠正与约束

> 记：用户给出的纠正、明确确认过的做法，以及必须始终生效的禁止模式和它的原因。
> 不记：读代码就能看出来的写法，以及 `AGENTS.md` 已经写过的规则。
> 怎么写：正文先一句结论，再跟 `**Why:**`（为什么，便于以后判断边界情况）和 `**How to apply:**`（具体怎么做）。
> 本文件只是索引，条目区块由脚本重算，正文写在 `feedbacks/feedback_<slug>/index.md` 里。

<!-- project-entries-local:start -->
## 本层内容

- [公网 URL 必须带 /teaching/ 前缀](feedback_teach_public_url_prefix/INDEX.md) — 对外给课页地址形如 /teaching/\<topic\>/...；不要用站点根下的 /changelog 或 /openhands
- [teach skill 跑完必须回在线 URL](feedback_teach_return_online_url/INDEX.md) — 跑完 teach skill、产出或更新课页后：回复里必须给可在浏览器打开的在线 URL；不要只丢仓库路径、file:// 或 Mesh 主机名。
<!-- project-entries-local:end -->
