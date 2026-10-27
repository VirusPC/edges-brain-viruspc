---
name: learn-repo
description: 当用户想长期学习、精读某个外部代码仓库，并把它关联进 teaching 教学工作区时使用。以 git submodule 把仓库挂到对应主题的 repos/ 下——主仓库只记一个提交指针，不涨克隆体积——并在 RESOURCES.md 登记来源与 commit。触发短语如「我想学一下 XX 仓库」「把 XX 仓库挂进来学」。只是临时看看、总结一下某个仓库时不触发；往 teaching 之外的路径挂载也不归本技能管。
---

# learn-repo — 把要学的仓库挂进教学工作区

在公开仓库 edges 里学习外部仓库的姿势是 git submodule：主仓库只存一个 gitlink（指向该仓库某次提交）加 `.gitmodules` 配置，内容不进主仓库历史，克隆体积几乎零增长，同时关联可追溯、可 review。选型依据见 `teaching/link-external-repo/`（专门的选型课与速查表）。

## 硬约束

- edges 是公开仓库：只挂**可公开访问**的仓库；URL 必须是可匿名克隆的形式（不带 token、不用私有 SSH 地址）。私有、含未公开 IP 或个人信息的仓库不入库。
- 挂载点固定为 `teaching/<topic>/repos/<repo-name>`，不要挂到工作区其他位置或仓库根。
- submodule 是只读的学习参考：不在其中做修改。要改就先 fork，挂 fork。

## 执行流程

1. **定位主题**。`teaching/<topic>/` 已存在则直接进入下一步；不存在则先初始化教学工作区：`MISSION.md`、`NOTES.md`、`RESOURCES.md`、`lessons/`、`learning-records/`（放 `.gitkeep`）、`assets/`、`reference/`，并在 `teaching/README.md` 的 Topics 列表登记一行。topic 用短横线命名的英文 slug。
2. **挂载前校验**：
   - `git ls-remote <url> HEAD` 能通，确认仓库存在且可匿名读；
   - `teaching/<topic>/repos/` 下没有同名目录。repo-name 取 URL 末段去掉 `.git`；重名时用 `<org>-<name>`。
3. **挂载**（在仓库根执行）：
   ```bash
   git submodule add <url> teaching/<topic>/repos/<repo-name>
   ```
4. **登记来源**。在该主题 `RESOURCES.md` 的 `## Knowledge` 节最上面加一条：
   ```markdown
   - [<repo-name>（本地 submodule）](repos/<repo-name>/)
     挂载于 YYYY-MM-DD，commit `<short-sha>`。上游：<url>。学习用途：<一句话>。
   ```
   `short-sha` 取 `git submodule status` 输出里 SHA 的前 7 位。学习用途这半句是后续课程选材的依据，必须写。
5. **Obsidian 排除**（仅首次挂载任何 submodule 前做一次）。确认 `.obsidian/app.json` 的 `userIgnoreFilters` 数组包含 `"teaching/*/repos/"`，让代码仓库的文件不进 vault 搜索、快速切换和关系图谱。
6. **提交**。遵循根 `AGENTS.md` 的 git 纪律（`type: subject`、AI 参与加 `Co-authored-by`、不提交 `.obsidian/workspace.json`）。一个提交同时包含 `.gitmodules`、gitlink 与 `RESOURCES.md` 登记，建议 message：`chore(teach): <topic> 挂载 <repo-name> submodule`。

## 日常操作

- 别人（或 CI、Agent 会话）clone edges 后要看到内容：`git submodule update --init teaching/<topic>/repos/<repo-name>`。目录默认为空是设计如此，不是坏了。
- 跟进上游：进 submodule 目录 `git fetch && git checkout <新提交>`，回仓库根提交指针变更——diff 只有一行 SHA。
- 学习结束移除：`git submodule deinit -f <path> && git rm -f <path>` 并提交；`.git/modules/` 下的残留可手动删除。`RESOURCES.md` 里的条目同步删掉或改标「已移除」。
