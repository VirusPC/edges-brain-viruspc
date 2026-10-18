# Project Harness 层入口表面命名 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `AGENTS.md` 层入口的注释和标题从 `project-memory` 改成 `project-harness`，类型入口 `type` / `entries` 不动。

**Architecture:** `layout.ts` 给出层入口的 canonical 标记与旧别名。`blocks.ts` 拆开层前缀和类型前缀。parse 双读；无原稿的 serialize 只写新标记；有原稿的 patch 仍保全未改字节。remember / doctor 刷新整份层入口时走 `rewriteLayerSurface`。存量用可预览、可重跑的脚本迁移，禁止逐文件手改。

**Tech Stack:** TypeScript、Node 22、`node:test`、tsx、现有 `edges-cli`。不新增依赖。

**Spec:** `docs/superpowers/specs/2026-10-06-project-harness-layer-markers-design.md`

## Global Constraints

- 层标记：`project-harness` / `project-harness-constraints` / `project-harness-local` / `project-harness-descendants`。
- 标题：`本层硬约束` / `本层组成` / `下层节点`。旧标题 `本层重要约束`、`本层记忆`、`下层记忆索引`、`下层作用域` 只作读别名。
- `project-memory-type` 与 `project-memory-entries` 本轮字节不变。
- codec `SectionKey` 仍是 `constraints` | `memory` | `children`；领域字段仍是 `constraints` / `localChildren` / `descendantChildren`。
- 修改顺序：PROTOCOL → LAYOUT → 模板 → CLI codec → memory 服务 → doctor → 仓内迁移。不能先改 doctor 再改协议。
- 不改 `.harness/` 目录名、skill 名 `project-memory-*`、`task-projects`、`harnessPath()`、`posts/`。
- 禁止逐文件手改存量 `AGENTS.md`；迁移必须可预览、查冲突、安全重跑。

---

### Task 1: PROTOCOL、LAYOUT、层入口模板

**Files:**
- Modify: `extensions/skills/project-memory-init/references/PROTOCOL.md`
- Modify: `extensions/skills/project-memory-init/references/LAYOUT.md`
- Modify: `extensions/skills/project-memory-init/references/templates/AGENTS.tmpl.md`
- `.claude/skills/project-memory-init` 与 `.agents/skills/project-memory-init` 是指向 `extensions/skills/project-memory-init` 的软链，不要另改一份。

**Interfaces:**
- Consumes: spec 的标记表与标题
- Produces: 协议用词「本层硬约束 / 本层组成 / 下层节点」；LAYOUT 写明层标记与「type/entries 仍为 project-memory-*」；`AGENTS.tmpl.md` 发出新标记和新标题

- [ ] **Step 1: 改 PROTOCOL 称呼，不写 HTML 标记名**

把 `## AGENTS.md — 本层记忆入口` 改成 `## AGENTS.md — 本层入口`。第一段改为：里面有三类东西：本层硬约束、本层组成、下层节点。后文「本层记忆和下层记忆仍是索引」改为「本层组成和下层节点仍是索引」。不要把 `project-harness` 写进 PROTOCOL。

- [ ] **Step 2: 改 LAYOUT 受管区块段**

`LAYOUT.md`「受管区块与条目」中：

- 外层标记改为 `<!-- project-harness:start -->`，内部顺序 constraints → local → descendants。
- 三类标题改为「本层硬约束」（兼容「本层重要约束」）、「本层组成」、「下层节点」。
- 明确写：类型入口仍用 `project-memory-type` / `project-memory-entries`。
- 前面若仍写「important 区块」，改成「硬约束区块」。

- [ ] **Step 3: 改 `AGENTS.tmpl.md`**

层入口模板只改这四组注释和两个标题。硬约束种子正文不动。`project-memory-type` 模板（`TYPE.tmpl.md` 等）不动。

```markdown
# {title}

<!-- project-harness:start -->

<!-- project-harness-constraints:start -->
## 本层硬约束

- 本目录有项目记忆。提问或动手前用 `$project-memory-ask`；该沉淀用 `$project-memory-remember`。本轮查过不重复。
- 本层硬约束直接写在这个区块里，不要链到记忆正文文件。
<!-- project-harness-constraints:end -->

<!-- project-harness-local:start -->
## 本层组成

下面这些是索引，不是正文。按条目说明挑要读的，再打开对应内容。

- [.harness/memory/users/AGENTS.md](.harness/memory/users/AGENTS.md) — 绑定本仓库、不宜公开的个人材料（个人偏好、凭据与密钥）。本机文件，不进 git。
- [.harness/memory/feedbacks/AGENTS.md](.harness/memory/feedbacks/AGENTS.md) — 用户的纠正、确认过的做法与必须遵守的禁止模式。
- [.harness/memory/projects/AGENTS.md](.harness/memory/projects/AGENTS.md) — 进行中的工作、关键时间点，无法从代码或 git 历史推导的决策，以及项目内的规范。兜底：对不上更具体类型时走这里。
- [.harness/memory/references/AGENTS.md](.harness/memory/references/AGENTS.md) — 需求文档、设计稿、接口文档、监控面板等外部资料。
- [.harness/skills/managed/AGENTS.md](.harness/skills/managed/AGENTS.md) — 从会话里沉淀出来的可复用流程，动手前先看本层有没有现成的。
- [.harness/skills/referenced/AGENTS.md](.harness/skills/referenced/AGENTS.md) — 本层 `.agents/skills/` 的原位技能或安装链接，只维护索引，不改正文。
<!-- project-harness-local:end -->

<!-- project-harness-descendants:start -->
## 下层节点

按任务目录加载对应 `AGENTS.md`。

{index_entries}
<!-- project-harness-descendants:end -->

<!-- project-harness:end -->
```

- [ ] **Step 4: 核对协议没有混入标记名**

Run:

```bash
rg -n "project-harness|project-memory-important|本层记忆索引" extensions/skills/project-memory-init/references/PROTOCOL.md
```

Expected: PROTOCOL 无这些实现名。LAYOUT 与 `AGENTS.tmpl.md` 含新标记。

- [ ] **Step 5: Commit**

```bash
git add extensions/skills/project-memory-init/references/PROTOCOL.md \
  extensions/skills/project-memory-init/references/LAYOUT.md \
  extensions/skills/project-memory-init/references/templates/AGENTS.tmpl.md
git commit -m "docs: 层入口协议与模板改用 project-harness"
```

---

### Task 2: 布局常量、拆开标记工厂、`rewriteLayerSurface`

**Files:**
- Modify: `extensions/cli/src/domain/models/layout.ts`
- Modify: `extensions/cli/src/domain/models/agents/blocks.ts`
- Test: `extensions/cli/test/models/layer-markers.test.ts`

**Interfaces:**
- Consumes: Task 1 的 canonical 名称
- Produces:
  - `INTERNAL_SECTIONS.constraints.marker === "project-harness-constraints"`
  - `INDEX_MARKERS.type === "project-memory-type"`
  - `rewriteLayerSurface(source: string): string`
  - `LAYER_BLOCK_ALIASES`：每个 canonical 标记对应旧标记列表
  - `CONSTRAINTS_START` 等 canonical 常量；保留 `IMPORTANT_START` 作为旧别名或删除后改全部引用（本任务在 blocks 内一次做完）

- [ ] **Step 1: Write the failing test**

创建 `extensions/cli/test/models/layer-markers.test.ts`：

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { INTERNAL_SECTIONS, INDEX_MARKERS } from "../../src/domain/models/layout.js";
import {
  CONSTRAINTS_START,
  LOCAL_START,
  DESCENDANTS_START,
  OUTER_START,
  ENTRIES_START,
  TYPE_META_START,
  rewriteLayerSurface,
} from "../../src/domain/models/agents/blocks.js";

test("canonical layer markers are project-harness, type markers stay project-memory", () => {
  assert.equal(INTERNAL_SECTIONS.constraints.marker, "project-harness-constraints");
  assert.equal(INTERNAL_SECTIONS.localChildren.marker, "project-harness-local");
  assert.equal(INTERNAL_SECTIONS.descendantChildren.marker, "project-harness-descendants");
  assert.equal(INTERNAL_SECTIONS.constraints.heading, "本层硬约束");
  assert.equal(INTERNAL_SECTIONS.localChildren.heading, "本层组成");
  assert.equal(INTERNAL_SECTIONS.descendantChildren.heading, "下层节点");
  assert.equal(INDEX_MARKERS.type, "project-memory-type");
  assert.equal(INDEX_MARKERS.entries, "project-memory-entries");
  assert.equal(OUTER_START, "<!-- project-harness:start -->");
  assert.equal(CONSTRAINTS_START, "<!-- project-harness-constraints:start -->");
  assert.equal(LOCAL_START, "<!-- project-harness-local:start -->");
  assert.equal(DESCENDANTS_START, "<!-- project-harness-descendants:start -->");
  assert.equal(TYPE_META_START, "<!-- project-memory-type:start -->");
  assert.equal(ENTRIES_START, "<!-- project-memory-entries:start -->");
});

test("rewriteLayerSurface upgrades layer comments and titles without touching type indexes", () => {
  const source = `# T

<!-- project-memory:start -->
<!-- project-memory-important:start -->
## 本层重要约束

- Keep.
<!-- project-memory-important:end -->
<!-- project-memory-local:start -->
## 本层记忆

- [A](a/AGENTS.md)
<!-- project-memory-local:end -->
<!-- project-memory-children:start -->
## 下层作用域

- [B](b/AGENTS.md)
<!-- project-memory-children:end -->
<!-- project-memory:end -->
`;
  const out = rewriteLayerSurface(source);
  assert.match(out, /<!-- project-harness:start -->/);
  assert.match(out, /<!-- project-harness-constraints:start -->/);
  assert.match(out, /## 本层硬约束/);
  assert.match(out, /## 本层组成/);
  assert.match(out, /## 下层节点/);
  assert.doesNotMatch(out, /project-memory-(important|local|children)/);
  assert.equal(rewriteLayerSurface(out), out);

  const typeIndex = `<!-- project-memory-type:start -->
name: project
module: memory
writable: true
gitignore: false
format: ordinary
<!-- project-memory-type:end -->
# PROJECT
<!-- project-memory-entries:start -->
- [x](project_x/index.md) — x
<!-- project-memory-entries:end -->
`;
  assert.equal(rewriteLayerSurface(typeIndex), typeIndex);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter edges-cli exec node --test --import tsx './test/models/layer-markers.test.ts'`

Expected: FAIL，`INTERNAL_SECTIONS.constraints.marker` 仍是 `project-memory-important`，且没有 `rewriteLayerSurface`。

- [ ] **Step 3: Write minimal implementation**

`layout.ts`：

```ts
export const INTERNAL_SECTIONS = {
  constraints: { heading: "本层硬约束", marker: "project-harness-constraints" },
  localChildren: { heading: "本层组成", marker: "project-harness-local" },
  descendantChildren: {
    heading: "下层节点",
    marker: "project-harness-descendants",
  },
} as const;
```

`INDEX_MARKERS` 保持 `project-memory-type` / `project-memory-entries`。

`blocks.ts` 拆成两个工厂，禁止再用一个 `project-memory` 函数生成层标记：

```ts
const layer = (name: string, edge: string) =>
  `<!-- project-harness${name ? `-${name}` : ""}:${edge} -->`;
const type = (name: string, edge: string) =>
  `<!-- project-memory-${name}:${edge} -->`;
const legacyLayer = (name: string, edge: string) =>
  `<!-- project-memory${name ? `-${name}` : ""}:${edge} -->`;

export const OUTER_START = layer("", "start"),
  OUTER_END = layer("", "end");
export const CONSTRAINTS_START = layer("constraints", "start"),
  CONSTRAINTS_END = layer("constraints", "end");
export const LOCAL_START = layer("local", "start"),
  LOCAL_END = layer("local", "end");
export const DESCENDANTS_START = layer("descendants", "start"),
  DESCENDANTS_END = layer("descendants", "end");
export const ENTRIES_START = type("entries", "start"),
  ENTRIES_END = type("entries", "end");
export const TYPE_META_START = type("type", "start"),
  TYPE_META_END = type("type", "end");
export const LEGACY_OUTER_START = legacyLayer("", "start");
export const LEGACY_IMPORTANT_START = legacyLayer("important", "start");
export const LEGACY_LOCAL_START = legacyLayer("local", "start");
export const LEGACY_CHILDREN_START = legacyLayer("children", "start");
```

为减少下游改名噪音，临时保留：

```ts
export const IMPORTANT_START = CONSTRAINTS_START;
export const IMPORTANT_END = CONSTRAINTS_END;
export const CHILDREN_START = DESCENDANTS_START;
export const CHILDREN_END = DESCENDANTS_END;
```

`rewriteLayerSurface` 只替换**整行 HTML 注释**和**章节标题行**，不要全局替换 `project-memory` 子串（会误伤 type/entries）：

```ts
const COMMENT_REWRITES: Array<[RegExp, string]> = [
  [/^<!-- project-memory:start -->$/gm, "<!-- project-harness:start -->"],
  [/^<!-- project-memory:end -->$/gm, "<!-- project-harness:end -->"],
  [/^<!-- project-memory-important:(start|end) -->$/gm, "<!-- project-harness-constraints:$1 -->"],
  [/^<!-- project-memory-local:(start|end) -->$/gm, "<!-- project-harness-local:$1 -->"],
  [/^<!-- project-memory-children:(start|end) -->$/gm, "<!-- project-harness-descendants:$1 -->"],
];
const TITLE_REWRITES: Array<[RegExp, string]> = [
  [/^## 本层重要约束\s*$/gm, "## 本层硬约束"],
  [/^## 本层记忆\s*$/gm, "## 本层组成"],
  [/^## 下层记忆索引\s*$/gm, "## 下层节点"],
  [/^## 下层作用域\s*$/gm, "## 下层节点"],
];
export function rewriteLayerSurface(source: string): string {
  let next = source;
  for (const [from, to] of COMMENT_REWRITES) next = next.replace(from, to);
  for (const [from, to] of TITLE_REWRITES) next = next.replace(from, to);
  return next;
}
```

`INNER_BLOCK_ORDER` 改为 `[CONSTRAINTS_START, LOCAL_START, DESCENDANTS_START]`。`insertInnerBlock` 报错文案里的 `project-memory` 改成 `project-harness`。

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter edges-cli exec node --test --import tsx './test/models/layer-markers.test.ts'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/cli/src/domain/models/layout.ts \
  extensions/cli/src/domain/models/agents/blocks.ts \
  extensions/cli/test/models/layer-markers.test.ts
git commit -m "feat: 拆开 project-harness 层标记与 type 标记"
```

---

### Task 3: parse 双读、serialize 新稿、entries 适配

**Files:**
- Modify: `extensions/cli/src/domain/models/agents/parse.ts`
- Modify: `extensions/cli/src/domain/models/agents/serialize.ts`
- Modify: `extensions/cli/src/domain/models/agents/syntax.ts`
- Test: `extensions/cli/test/models/agents-node.test.ts`
- Test: `extensions/cli/test/utils/node-tree/codec.test.ts`

**Interfaces:**
- Consumes: `INTERNAL_SECTIONS` canonical markers；`rewriteLayerSurface` 不在 patch 路径调用
- Produces: 旧层标记与新层标记都能 `decodeBody`；无 `originalSource` 的 serialize 发出 `<!-- project-harness:start -->`；type index 的 entries 仍往返为 `project-memory-entries`

- [ ] **Step 1: Write the failing tests**

在 `internal.test.ts` 追加：

```ts
const modern = source
  .replaceAll("project-memory-important", "project-harness-constraints")
  .replaceAll("project-memory-local", "project-harness-local")
  .replaceAll("project-memory-children", "project-harness-descendants")
  .replaceAll("本层重要约束", "本层硬约束")
  .replaceAll("本层记忆", "本层组成")
  .replaceAll("下层记忆索引", "下层节点");

test("legacy and canonical layer markers parse to the same ownership", () => {
  const oldNode = new InternalNode("/scope/AGENTS.md").parse(source);
  const newNode = new InternalNode("/scope/AGENTS.md").parse(modern);
  assert.deepEqual(oldNode.content.constraints, newNode.content.constraints);
  assert.deepEqual(oldNode.children, newNode.children);
});

test("fresh serialize emits project-harness markers", () => {
  const node = new InternalNode("/scope/AGENTS.md").parse(source);
  node.setConstraints(["Keep the rule.", "Also this."]);
  const out = new InternalNode("/tmp/fresh/AGENTS.md")
    .parse(node.serialize())
    .serialize();
  // 若 setConstraints 走原稿 patch，另测无原稿路径：
});
```

更稳的无原稿断言放在 codec 测试：给 `serializeNode(model)` **不传** `originalSource`，期望含 `<!-- project-harness:start -->`，不含 `<!-- project-memory:start -->`。

保留现有「未改模型则 serialize === 原稿」和「改一条约束保留周围旧标记」——这是有原稿的 patch 合同，不要改成强制升格，否则会破坏 `codec.test.ts`。

在 `syntax.ts` 相关测试（`internal.test.ts` 后半或 memory 测试）确认：含 `project-memory-entries` 的类型入口 parse 后 serialize 仍是 entries，不是 `project-harness-local`。

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter edges-cli exec node --test --import tsx './test/models/agents-node.test.ts' './test/utils/node-tree/codec.test.ts'`

Expected: FAIL，parse 不认 `project-harness-constraints`；无原稿 serialize 仍写 `project-memory`。

- [ ] **Step 3: Write minimal implementation**

`parse.ts` 不要再用 `marker.replace("project-memory-", "")` 当键。改为按完整标记查表：

```ts
const LAYER_HTML = /<!-- (project-harness-constraints|project-harness-local|project-harness-descendants|project-memory-important|project-memory-local|project-memory-children):(start|end) -->/;
const LAYER_TO_KEY: Record<string, SectionKey> = {
  "project-harness-constraints": "constraints",
  "project-memory-important": "constraints",
  "project-harness-local": "memory",
  "project-memory-local": "memory",
  "project-harness-descendants": "children",
  "project-memory-children": "children",
};
```

html 节点同时认 `<!-- project-harness:end -->` 与 `<!-- project-memory:end -->` 作为 `appendAt`。

`titles` 增加：

```ts
本层组成: "memory",
下层节点: "children",
下层作用域: "children",
本层记忆: "memory",
下层记忆索引: "children",
本层重要约束: "constraints",
本层硬约束: "constraints",
```

`serialize.ts` 无原稿分支把硬编码的 `<!-- project-memory:start -->` 换成 `OUTER_START` / `OUTER_END`（从 blocks 导入）。`renderSection` 已用 `CODEC_SECTIONS[key].marker`，改 layout 后会自动写新标记。

`syntax.ts` `adaptEntries`：把 entries 改写成 **canonical** `project-harness-local`，这样 decodeBody 能解析类型入口。回写时 **两种** local 都要映回 entries：

```ts
function adaptEntries(source: string): string {
  return source.replace(
    /^<!-- project-memory-entries:(start|end) -->$/gm,
    "<!-- project-harness-local:$1 -->",
  );
}
// serialize 回写
source
  .replace(/^<!-- project-harness-local:(start|end) -->$/gm, "<!-- project-memory-entries:$1 -->")
  .replace(/^<!-- project-memory-local:(start|end) -->$/gm, "<!-- project-memory-entries:$1 -->");
```

若当前文件同时把层入口的 `project-harness-local` 误跑进这条回写，类型入口专用路径必须只在 `this.#entries` 为真时执行（现有 `syntax.ts` 已有 `#entries` 判定，保持这个门闩）。

- [ ] **Step 4: Run tests**

Run: `pnpm --filter edges-cli exec node --test --import tsx './test/models/agents-node.test.ts' './test/utils/node-tree/codec.test.ts' './test/models/layer-markers.test.ts'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/cli/src/domain/models/agents/parse.ts \
  extensions/cli/src/domain/models/agents/serialize.ts \
  extensions/cli/src/domain/models/agents/syntax.ts \
  extensions/cli/test/models/agents-node.test.ts \
  extensions/cli/test/utils/node-tree/codec.test.ts
git commit -m "feat: 层入口标记双读，新稿只写 project-harness"
```

---

### Task 4: memory 刷新与 doctor 认旧写新

**Files:**
- Modify: `extensions/cli/src/services/memory/agents.ts`
- Modify: `extensions/cli/src/services/memory/blocks.ts`
- Modify: `extensions/cli/src/services/memory/doctor.ts`
- Modify: `extensions/cli/src/services/memory/entries.ts`（若直接使用 LOCAL_START）
- Test: `extensions/cli/test/memory/core.test.ts` 或新增 `extensions/cli/test/memory/layer-markers.test.ts`

**Interfaces:**
- Consumes: `rewriteLayerSurface`、`CONSTRAINTS_START`、legacy 常量
- Produces: `classifyAgentsSource` 把旧外层/三章也判成 `managed`；`ensureImportantBlock` 见旧 important 或新 constraints 都算已有；`syncLoadedAgents` 写入前对整份文档调用 `rewriteLayerSurface`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { classifyAgentsSource } from "../../src/services/memory/agents.js";
import { ensureImportantBlock } from "../../src/services/memory/blocks.js";
import { rewriteLayerSurface } from "../../src/domain/models/agents/blocks.js";

const legacy = `<!-- project-memory:start -->
<!-- project-memory-important:start -->
## 本层硬约束

- Keep.
<!-- project-memory-important:end -->
<!-- project-memory-local:start -->
## 本层记忆
<!-- project-memory-local:end -->
<!-- project-memory:end -->
`;

test("legacy layer markers still count as managed", () => {
  assert.equal(classifyAgentsSource(legacy), "managed");
  assert.equal(ensureImportantBlock(legacy), legacy);
});

test("refreshing a legacy file rewrites the layer surface", () => {
  const updated = rewriteLayerSurface(legacy);
  assert.match(updated, /project-harness-constraints/);
  assert.doesNotMatch(updated, /project-memory-important/);
});
```

再补一条：类型入口 `classifyAgentsSource` 若只有 type/entries、没有层外层，保持现有行为（今天靠层标记判 managed；不要因为 type 标记把类型入口误判成层入口 managed 并塞进三章）。`rewriteLayerSurface` 已在 Task 2 保证不改 type 文件。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter edges-cli exec node --test --import tsx './test/memory/layer-markers.test.ts'`

Expected: FAIL，`classifyAgentsSource(legacy)` 为 `foreign`（只查新 `OUTER_START`）。

- [ ] **Step 3: Write minimal implementation**

`classifyAgentsSource` 的列表同时包含 canonical 与 legacy：

```ts
[
  OUTER_START,
  LEGACY_OUTER_START,
  CONSTRAINTS_START,
  LEGACY_IMPORTANT_START,
  LOCAL_START,
  LEGACY_LOCAL_START,
  DESCENDANTS_START,
  LEGACY_CHILDREN_START,
  AUTO_START,
]
```

不要把 `TYPE_META_START` / `ENTRIES_START` 加进去。

`ensureImportantBlock`：若文档含 `CONSTRAINTS_START` 或 `LEGACY_IMPORTANT_START` 则原样返回，否则插入 canonical constraints 块。

`syncLoadedAgents` 在 `upsertBlock` 之后：

```ts
if (updated !== existing) updated = rewriteLayerSurface(updated);
```

`upsertBlock(updated, LOCAL_START, LOCAL_END, local)` 在旧文件上找不到新 start 会再插入一块。必须先升格或让 upsert 认别名。最小做法：upsert 之前先 `updated = rewriteLayerSurface(existing!)`，再 ensure/upsert canonical 块。

doctor 的 `text.includes(IMPORTANT_START)` 改为「含 canonical 或 legacy constraints start」。`blockPattern(LOCAL_START, LOCAL_END)` 在 rewrite 之后跑，或同时匹配 legacy local。

- [ ] **Step 4: Run tests**

Run: `pnpm --filter edges-cli exec node --test --import tsx './test/memory/layer-markers.test.ts' './test/memory/core.test.ts' './test/memory/cli.test.ts'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/cli/src/services/memory/agents.ts \
  extensions/cli/src/services/memory/blocks.ts \
  extensions/cli/src/services/memory/doctor.ts \
  extensions/cli/test/memory/layer-markers.test.ts
git commit -m "feat: memory 刷新认旧层标记并写回 project-harness"
```

---

### Task 5: 可预览的仓内迁移脚本

**Files:**
- Create: `scripts/rewrite-project-harness-markers.mts`
- Create: `extensions/cli/test/memory/rewrite-layer-surface-script.test.ts`（测 `planLayerMarkerRewrite`，不要在测试里扫整个仓库）
- Modify: `package.json`（加 `migrate:project-harness-markers`）

**Interfaces:**
- Consumes: `rewriteLayerSurface`、`checkPath`、与 `scripts/migrate-agents-indexes.mts` 相同的 preview/apply/锁
- Produces: `planLayerMarkerRewrite(root: string): { root; edits: Array<{ path; before; after }> }`；默认预览；`--apply` 才写；跳过 `posts/`、类型入口、无层标记文件

- [ ] **Step 1: Write the failing test**

在临时目录写两份文件：一份旧层入口、一份只有 type/entries。调用 `planLayerMarkerRewrite(tmp)`。断言层入口出现在 `edits`，type 入口不在。第二次对 already-new 文件 `edits` 为空。

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter edges-cli exec node --test --import tsx './test/memory/rewrite-layer-surface-script.test.ts'`

Expected: FAIL，模块不存在。

- [ ] **Step 3: Write the script**

照 `scripts/migrate-agents-indexes.mts`：`plan*` + `applyPlan` + CLI `--root` `--apply`。`convert` 只做：

```ts
function convert(file: string, source: string): string {
  const next = rewriteLayerSurface(source);
  if (next.includes("<!-- project-memory-type:start -->") &&
      !/<!-- project-(?:memory|harness)-(?:important|constraints|local|children|descendants):/.test(source) &&
      !/<!-- project-memory:(?:start|end) -->/.test(source) &&
      !/<!-- project-harness:(?:start|end) -->/.test(source)) {
    return source;
  }
  return next;
}
```

更干净：若 rewrite 前后相等则不入 edits。类型入口 rewrite 是 no-op，自然跳过。

排除目录与现有脚本一致，且路径含 `posts` 直接拒绝。无 `--apply` 只打印将改路径列表到 stdout。冲突（标记不成对）抛错，不要猜测。

`package.json`：

```json
"migrate:project-harness-markers": "pnpm --filter edges-cli exec tsx ../../scripts/rewrite-project-harness-markers.mts"
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter edges-cli exec node --test --import tsx './test/memory/rewrite-layer-surface-script.test.ts'`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/rewrite-project-harness-markers.mts \
  extensions/cli/test/memory/rewrite-layer-surface-script.test.ts \
  package.json
git commit -m "feat: 预览并重写层入口 project-harness 标记"
```

---

### Task 6: 迁移本仓、术语与现行文档

**Files:**
- Modify: 脚本选出的层入口 `AGENTS.md`（含根、teaching、notes、extensions、shared-extensions、`.harness/tasks` 等）。不要改类型入口。
- Modify: `CONTEXT.md`（新增 **Project Harness**；收紧 **Agent Harness** 的避免使用）
- Modify: `docs/adr/0024-scope-first-content-ownership.md` 现行三部分名称
- Modify: `docs/superpowers/specs/2026-10-05-directory-node-model.md` 若把旧标题写成现行合同
- Modify: `extensions/cli/src/domain/models/README.md` 表格标题
- Modify: `.harness/memory/projects/project_agents_three_blocks/index.md`
- Modify: `extensions/skills/project-memory-init/.harness/memory/projects/project_important_block/index.md` 及其根层对应条目（若根层没有则只改 skill 层那份，或 remember 更新 `project_harness_layer_markers`）
- Modify: `docs/superpowers/specs/2026-10-06-project-harness-layer-markers-design.md` 状态改为已批准并实施
- Test: 全量 `pnpm --filter edges-cli test`

**Interfaces:**
- Consumes: Task 5 脚本
- Produces: 本仓层入口只含新标记；CONTEXT 有 Project Harness 定义

- [ ] **Step 1: 预览迁移**

Run:

```bash
pnpm migrate:project-harness-markers -- --root "$(pwd)"
```

Expected: 列出将改的层入口；列表中**没有** `.harness/memory/projects/AGENTS.md` 这类类型入口（它们只有 type/entries）。若有误伤，停下来改 `rewriteLayerSurface` / convert，不要 `--apply`。

- [ ] **Step 2: 应用迁移**

Run:

```bash
pnpm migrate:project-harness-markers -- --root "$(pwd)" --apply
```

再跑同一命令，Expected: `edits` 为空。

- [ ] **Step 3: CONTEXT 与现行标题**

在 `CONTEXT.md` Language 里、**Agent Harness** 之前插入：

```markdown
**Project Harness（Edges 语境）**：
Git 项目里系统二落在 `AGENTS.md` 层入口上的写法，三章为硬约束、本层组成、下层节点。`.harness/` 是这份系统二的材料目录，不是另一套入口形状。
_避免使用_：Agent Harness 的同义词、只等于 `.harness/` 目录、Project Memory 三章的旧称
```

**Agent Harness** 的「避免使用：系统二的通用名称」改为：「避免使用：Project Harness 的同义词、系统二落在 AGENTS 层入口上的名称」。

ADR 0024 与 models README 表格把「本层记忆 / 下层记忆索引」改成新标题。历史 discussion / 已完成旧计划不必批量改写。

`project_agents_three_blocks` 的 How-to 改成现行标记名 `project-harness-*`，并写明旧 `project-memory-*` 只是读兼容。

- [ ] **Step 4: 跑 CLI 测试并修仍写死「写出旧标记」的断言**

Run: `pnpm --filter edges-cli test`

Expected: PASS。输入夹具可以继续用旧标记。失败的若是「init/模板必须输出 project-memory」，改期望为新标记，不要改回 codec。

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md teaching/AGENTS.md notes/AGENTS.md extensions/AGENTS.md \
  shared-extensions/AGENTS.md CONTEXT.md docs/adr/0024-scope-first-content-ownership.md \
  extensions/cli/src/domain/models/README.md \
  .harness/memory/projects \
  extensions/skills/project-memory-init/.harness/memory/projects \
  docs/superpowers/specs/2026-10-06-project-harness-layer-markers-design.md
git commit -m "refactor: 存量层入口与术语改用 project-harness"
```

实际 `git add` 以脚本改动的路径为准，不要把类型入口或 `posts/` 加进去。

---

## Self-review

- Spec 表面四条层标记 → Task 1–2
- 双读单写 → Task 3
- type/entries 不动 → Task 2 测试 + Task 5 预览断言
- blocks 工厂拆开 → Task 2
- doctor/remember 刷新 → Task 4
- 可重复迁移 → Task 5–6
- CONTEXT Project Harness vs Agent Harness → Task 6
- SectionKey 不改 → Global Constraints + Task 2 不改 `CODEC_SECTIONS` 的 key
- 无原稿 serialize 才强制新标记；有原稿 patch 保全 → Task 3，避免和 codec 保真测试打架
