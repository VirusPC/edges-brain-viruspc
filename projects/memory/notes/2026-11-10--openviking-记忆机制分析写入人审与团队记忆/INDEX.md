---
description: 分析 OpenViking 个人/项目/团队记忆的写入时机与频率、人审方式与晋升缺口，并对照 Edges 的人审后落库。
---
# OpenViking 记忆机制分析：写入、人审与团队记忆

整理日期：2026-11-10（Asia/Shanghai）。依据 OpenViking 官方文档查阅，不是源码审计。

相关笔记：同项目既有扁平笔记 `2026-10-19-Agent记忆写入与读取触发机制调研.md`、`2026-10-17-Letta与Devin-git记忆的接入检索与沉淀.md`。

## 定位

OpenViking 是字节跳动 / 火山引擎开源（AGPLv3）的 Agent 上下文数据库。它把上下文暴露成 `viking://` 虚拟文件系统，按 `user`、`peers`（项目同伴）和 `resources` 分区，并提供 L0 / L1 / L2 分层摘要和语义检索。

它的本质是「为 Agent 场景做好分区的上下文存储，再加上自动读写管道」。价值主要在自动捕获、自动召回和按层级省 token，而不是当真相源或治理层。

## 个人记忆与项目记忆：写入时机和频率

### 自动抽取管道

插件 hook 会在每一轮对话自动捕获。会话 `commit` 分两阶段：

- Phase 1 同步归档本轮原文。
- Phase 2 在后台异步用 LLM 抽取记忆，类型包括 profile、preferences、entities、events、identity、soul、cases、trajectories、experiences，以及自定义类型。抽取结果可以新增、改写或删除已有记忆，并写出 `memory_diff.json` 和 `.done`。

落点是：

- 个人：`viking://user/<id>/memories/`
- 项目同伴：`viking://user/<id>/peers/<projectPeer>/memories/`

抽取是异步的，新记忆通常要过几分钟才能被检索到。因此「写入频率」接近「每轮都捕获、每次 commit 都抽取」，但「可检索频率」滞后几分钟。

### Agent 主动写入的项目资料

另一条路径不是抽取，而是规则驱动的主动落盘。插件会把协作规则写入 `CLAUDE.md` / `AGENTS.md`（`<!-- openviking:start -->` … `<!-- openviking:end -->` 区块），让 Agent 把决策和进度写到 `viking://user/<id>/resources/<project>/notes/` 以及项目资源目录。新决策会覆盖旧内容；再同步导入的材料也会被覆盖。

### 自动召回

每轮对话开始前，插件会自动检索并注入相关记忆。捕获和召回都可以按项目用 `.openviking/config.json` 关闭，例如 `{"version":1,"capture":{"enabled":false},"recall":{"enabled":false}}`。

## 团队记忆

团队记忆没有自动写入，也不会从个人或项目记忆里自动汇总。

共享区是 `viking://resources/...`，靠 ACL 保护：

- 主体：`user:{id}`、`group:{id}`、`user:*`
- 级别：read、write、manage
- 授权默认向下继承；restricted 模式会切断继承
- 权限变更是最终一致

`acl.enabled` 默认关闭。打开后，根目录默认授予 `user:* = manage`。私有 user 空间不能挂 ACL。

要往共享区写，只能手动 `add-resource`，或让 Agent 按规则写。导入流程是先 dry-run，再由人确认。

## 人审

OpenViking 没有写入前的审批队列，也没有 PR / blame / 按提交回滚。模式是「先写后审计」。

事后可看的材料主要是每次 commit 归档目录里的 `memory_diff.json`，其中记录 adds、updates（含 before / after）、deletes 和 skipped_operations。记忆本身是 Markdown 文件，可用 `ov ls` / `read` / 编辑，或在 Studio、桌面应用里查看。

可控手段是：memory policy、ACL，以及按项目关闭 capture / recall。若要把共享区变成「只有整理者可写」，需要先打开 ACL，再把其他人收成 read，由专人审过后再写入。文档未把这套流程做成内置功能。

## 缺口

- 没有「个人记忆或项目记忆 → 团队记忆」的晋升通道。自动抽取出的记忆只落在私有 `user/<id>/memories` 或 `peers/` 下；私有空间挂不上 ACL，共享区也不会自动汇总。
- 和 git 相比，缺版本历史、PR 审核、blame，也不能按 commit 回滚。审计只能靠各次会话的 `memory_diff.json`。
- 强项在读侧：每轮自动召回，分层摘要省 token。更准确的定位是检索与注入层，而不是存储真相源。

## 与 Edges 的对照和建议

Edges 是「人审后落库」（候选经过 PR 再进 git）。OpenViking 是「先写后审计」。

建议的分工：

- 真相源和团队层留在 Edges 的 git，审核走 PR。
- OpenViking 可作个人 / 项目层的自动捕获，以及 Agent 侧的检索与注入层。
- 共享区对其他人只开 read，由人整理后再 `add-resource`。
- 若两边一起用，可以写脚本把 `memory_diff.json` 转成 Edges 的 PR 候选，相当于补上缺失的晋升通道。

## 来源

查阅日期：2026-11-10。

- [OpenViking GitHub README](https://github.com/volcengine/OpenViking)
- [会话概念 concepts/08-session](https://docs.openviking.ai/en/concepts/08-session)
- [ACL 概念 concepts/15-acl](https://docs.openviking.ai/en/concepts/15-acl)
- [Agents onboarding](https://docs.openviking.ai/agents/en/onboarding.md)
