---
name: edges-create-notes
description: >-
  把材料写成笔记。输入是对话记录，或用户要求整理、总结对话时，打开 references/conversation.md。
  用户给了文章、视频、播客、代码链接或内容，并要学习或边看边记时，打开 references/learning.md。
  判断不了先问一句。落盘用 edges notes create。用户说整理对话、记笔记、边看边记时使用。
version: 0.1.0
---

# edges-create-notes

先判断场景，再打开对应 reference。两种正文不要混用。

## 分流

- **conversation**：输入是对话记录，或用户要求整理、总结对话。读 [references/conversation.md](references/conversation.md)。
- **learning**：用户给了外部材料（文章、视频、播客、代码链接或内容），并要学习或边看边记。读 [references/learning.md](references/learning.md)。
- 判断不了：先问一句「这是整理对话，还是为外部材料做学习笔记？」得到回答再继续。不要猜。

## 共同规则

- **不编造。** 材料或对话里没有的数字、引语、结论、需求不写。
- **落盘。** 在 Edges 仓库里用 `edges notes create`（技能 `edges`；旧名 `edges-note` 已并入这一处）。有 shell 时：`edges --scope <目录> notes create --title "<标题>" --body "<Markdown>"`。无 shell 时按 `$edges` 的 [Notes reference](../edges/references/notes.md) 调用 `new_note`。更新已有笔记时改原文件，不新建。reference 里写的 `edges-note` 就是这一处。
- **frontmatter。** 笔记文件的 `title` 与正文一级标题一致。对话笔记的标题只写主题简述；学习笔记的标题用材料标题。场景专有字段以对应 reference 为准，不要互相套用。

场景的章节、模板和步骤都在 reference 里。本文件不重复那些正文。
