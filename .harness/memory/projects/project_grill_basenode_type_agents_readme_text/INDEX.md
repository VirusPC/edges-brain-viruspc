---
name: project_grill_basenode_type_agents_readme_text
description: >-
  改节点类层次或 type 时：AgentsNode 与 ReadmeNode 继承 InternalNode；业务节点继承
  BaseNode；LeafNode 是纯 text；组织/叶子看组成登记，type 不含 internal。
metadata:
  edges-title: InternalNode 承接组成索引
  edges-type: project
  edges-origin-session-id: bc-01a11167-6384-72b0-a940-c268664860c1
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-10-18T05:03:18+00:00'
---

`AgentsNode` 与 `ReadmeNode` 继承 `core/InternalNode`。`InternalNode` 持有本层/下层 `localChildren` / `descendantChildren`，以及 `addChild`、`updateChild`、`removeChild`、`moveChild`。业务节点继承 `BaseNode`。`LeafNode` 仍是纯 text 节点。`type` 为 `agents` / `readme` / `task` / `memory` / `note` / `skill` / `text`，没有 `internal`。组织节点还是叶子仍看有没有组成登记，不看类。

**Why:** 用户拍板：两套入口上重复的 children 索引与 `LeafNode` 对称，放在 `core/`。AGENTS 与 README 的区块格式、parse/serialize 各自保留。

**How to apply:** 新的带本层/下层索引的入口继承 `InternalNode`，不要再复制这四套索引方法。不要把块解析抽进 `InternalNode`。不要用 `instanceof InternalNode` 区分组织节点和叶子。`SuperAgentsNode` 仍继承 `AgentsNode`，只在 `--super` 时使用。
