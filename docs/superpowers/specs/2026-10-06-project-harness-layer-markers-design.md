# 层入口表面命名：project-memory → project-harness

状态：2026-10-06 用户批准并实施。实施计划见 [project-harness-layer-markers](../plans/2026-10-06-project-harness-layer-markers.md)。不替代 [目录节点模型](2026-10-05-directory-node-model.md) 的组成关系。

> **标题翻案（2026-10-06 Q15c）：** 本层 / 下层章节标题改为「本层系统维护信息 / 下层系统维护信息」（不再用「本层组成 / 下层节点」）。标记名不变。见 [recursive-system-two-entries-design](2026-10-06-recursive-system-two-entries-design.md)。

基线：`main` @ `ac7b5a8a`（#165）。

## 目的

`AGENTS.md` 层入口的三章是 **Project Harness**：给一个 Git 项目搭的系统二如何落在文件上。现行注释族 `project-memory-*` 和标题「本层记忆 / 下层记忆索引」仍停在 Project Memory 时期，和 `.harness/` 布局、本层已登记的 tasks / evaluation / observation 对不上。

本轮只改**层入口表面**（HTML 注释、章节标题、协议与术语里对这三章的称呼），以及 skill / CLI 里读写这些注释的逻辑。三章职责、索引语义、类型入口标记、`.harness/` 目录名、skill 目录名、`edges memory` 命令名都不动。

## 已确认的模型

- 每个有 `AGENTS.md` 的节点有一份系统二。三章就是这份系统二的写法：约束、本层组成、下层节点。
- **Project Harness** 是这个角色在 Git 项目里的名称，不是 `.harness/` 目录的别名。目录仍放这份系统二的材料。
- 子目录（`notes/`、`teaching/` 等）的 `AGENTS.md` 用同一套标记：仍是该 Git 项目的系统二，只是挂在更窄的节点上。
- **Agent Harness**（CONTEXT 现有词）保持：Agent 持续工作的支撑机制。不要把 Agent Harness 与 Project Harness 并成一个词。CONTEXT 里「避免把 harness 当系统二的通用名称」改为：系统二落在层入口上的名称是 Project Harness；Agent Harness 仍不是系统二的通称。

## 新标记与标题

| 现在 | 改成 | 对应 |
| --- | --- | --- |
| `project-memory` | `project-harness` | 层入口受管外层 |
| `project-memory-important` | `project-harness-constraints` | 本层硬约束 |
| `project-memory-local` | `project-harness-local` | 本层组成 |
| `project-memory-children` | `project-harness-descendants` | 下层节点 |

标题：

- `本层硬约束`（兼容旧标题 `本层重要约束`）
- `本层组成`（取代 `本层记忆`）
- `下层节点`（取代 `下层记忆索引`；根上已手写的「下层作用域」视为旧标题别名，写入时用「下层节点」）

领域字段名保持 `constraints` / `localChildren` / `descendantChildren`。codec 内部 `SectionKey`（`memory` / `children`）本轮不改，避免和 HTML 重命名缠在一起。不得把旧 HTML 后缀 `important` / `children` 写回新文件。

## 本轮不动

- `project-memory-type` / `project-memory-entries`：类型入口身份与条目清单。几乎只给 doctor / remember 读写，没有层入口那种名实不符。需要时另做机械替换。
- `task-projects` 嵌套标记。
- `.harness/` 路径、Memory Type 名称、skill 名 `project-memory-*`、`edges memory` 命令名。
- 组成关系、parent / harnessPath、遍历默认只走 localChildren。
- 硬约束种子点名 `$project-memory-ask` / `$project-memory-remember`；只改包裹它的标记和章节标题。

实现约束：`agents/blocks.ts` 今天用同一个 `project-memory` 工厂生成外层、三章、type、entries。实施时必须拆开前缀，不能把 type / entries 一并改成 `project-harness-*`。

## 协议与布局

修改顺序仍是 PROTOCOL → LAYOUT → 模板 / CLI → 非 doctor skill → doctor。

**PROTOCOL：** 形状仍是三类（硬约束 + 本层索引 + 下层索引），不增加第四块。把「本层记忆入口 / 本层记忆索引 / 下层记忆索引」改成与标题一致的称呼（本层硬约束、本层组成、下层节点）。协议继续不写具体 HTML 标记名。本层 / 下层仍只含地址和描述。

**LAYOUT：** 层入口标记改为上表；写明 type / entries 仍为 `project-memory-*`。模板 `AGENTS.tmpl.md` 用新标记和新标题。

## 读写兼容

- **读：** 同时识别旧 `project-memory` 四条层标记和新 `project-harness` 四条。旧标题「本层记忆」「下层记忆索引」「下层作用域」「本层重要约束」仍能解析到对应章节。
- **写：** 只发出新标记和新标题。刷新索引时改标记和标题，不改条目与硬约束正文。
- **存量：** 可重复执行的迁移（doctor `--apply` 和/或仓内脚本）把已跟踪的层入口改到新标记。禁止逐文件手改。预览、冲突检查、可重跑。
- 类型入口文件若只有 type / entries、没有层三章，迁移不得给它们强加层三章，也不得改 type / entries 标记。

## 文档与记忆

实施时同步：

- `CONTEXT.md`：增加 **Project Harness**；收紧 Agent Harness 的「避免使用」。
- 层入口相关记忆（至少 `project_agents_three_blocks`、`project_important_block`）按新标记更新 How-to，不把旧注释名继续写成现行写法。
- 目录节点 spec / ADR 0024 等凡把「本层记忆」当作现行标题的句子，改成新标题或标明已更名。

## 验收

- 新建或刷新的层入口只含 `project-harness` 四条标记和三章新标题。
- 未迁移的旧层入口仍能被 parse；写回后变为新标记。
- 类型入口的 `project-memory-type` / `entries` 字节在本轮迁移中不变。
- `edges memory` 的 init / remember / doctor 在新标记下仍能刷新本层索引；类型入口刷新仍写 `project-memory-entries`。
- CLI 测试覆盖：旧标记解析、新标记序列化、type/entries 不受层前缀工厂牵连。

## 非目标

不重划三章职责，不把维护模块单独成块，不新建 `.harness/AGENTS.md` 当唯一系统二入口，不改 Agent 客户端的 skills 安装路径。
