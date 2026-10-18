import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AgentsNode } from "../../src/domain/models/agents/agents-node.js";
import { ReadmeNode } from "../../src/domain/models/readme/readme-node.js";
import { initScope } from "../../src/services/init/service.js";
import { migrateScopeMaterialIndex } from "../../src/services/init/migrate-scope-readme.js";
import { SCOPE_README_ENTRY_NAME } from "../../src/services/init/modules.js";

async function scope(t: test.TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), "edges-hidx-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("edges init ensures .harness/README.md and a single AGENTS local pointer", async (t) => {
  const root = await scope(t);
  await initScope({ targetDir: root, modules: ["memory", "notes"] });
  const index = path.join(root, ".harness/README.md");
  const text = await readFile(index, "utf8");
  assert.equal(existsSync(index), true);
  assert.doesNotMatch(text, /^---/m);
  assert.match(text, /<!-- project-entries-local:start -->/);
  assert.match(text, /## 本层内容/);
  assert.match(text, /\.harness\/notes\/README\.md|notes\/README\.md/);
  assert.match(text, /memory\/feedbacks\/README\.md/);
  const agents = new AgentsNode(path.join(root, "AGENTS.md")).parse(
    await readFile(path.join(root, "AGENTS.md"), "utf8"),
  );
  assert.deepEqual(
    agents.localChildren.map((child) => path.relative(root, child.id)),
    [".harness/README.md"],
  );
  assert.equal(agents.localChildren[0]?.name, SCOPE_README_ENTRY_NAME);
  assert.equal(
    agents.localChildren.some((child) => child.id.endsWith(".harness/notes/README.md")),
    false,
  );
  const readme = new ReadmeNode(index).parse(text);
  assert.ok(readme.localChildren.some((child) => child.id.endsWith(".harness/notes/README.md")));
  assert.ok(
    readme.localChildren.some((child) =>
      child.id.endsWith(".harness/memory/feedbacks/README.md"),
    ),
  );
});

test("edges init is idempotent after the harness index exists", async (t) => {
  const root = await scope(t);
  await initScope({ targetDir: root, modules: ["notes"] });
  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  const index = await readFile(path.join(root, ".harness/README.md"), "utf8");
  await initScope({ targetDir: root, modules: ["notes"] });
  assert.equal(await readFile(path.join(root, "AGENTS.md"), "utf8"), agents);
  assert.equal(await readFile(path.join(root, ".harness/README.md"), "utf8"), index);
});

test("migrate moves local material links onto .harness/README.md and keeps descendants", async (t) => {
  const root = await scope(t);
  await mkdir(path.join(root, ".harness/notes"), { recursive: true });
  await mkdir(path.join(root, "child"), { recursive: true });
  await writeFile(path.join(root, ".harness/notes/README.md"), "# Notes\n");
  await writeFile(
    path.join(root, "child/AGENTS.md"),
    "# Child\n\n<!-- project-harness-local:start -->\n## 本层系统维护信息\n<!-- project-harness-local:end -->\n",
  );
  const agents = `# Scope

手写前言。

<!-- project-harness-constraints:start -->
## 本层硬约束

保持这条。
<!-- project-harness-constraints:end -->

<!-- project-harness-local:start -->
## 本层系统维护信息

下面这些是索引。

- [Notes](.harness/notes/README.md) — 笔记材料。
- [目录说明](README.md) — 内容面。
<!-- project-harness-local:end -->

<!-- project-harness-descendants:start -->
## 下层系统维护信息

- [子作用域](child/AGENTS.md) — 下层。
<!-- project-harness-descendants:end -->
`;
  await writeFile(path.join(root, "AGENTS.md"), agents);
  await writeFile(path.join(root, "README.md"), "# Public\n");
  const moved = await migrateScopeMaterialIndex(root);
  assert.ok(moved.moved.some((id) => id.endsWith(".harness/notes/README.md")));
  const after = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(after, /保持这条。/);
  assert.match(after, /手写前言。/);
  assert.match(after, /child\/AGENTS\.md/);
  assert.match(after, /下面这些是索引。/);
  const node = new AgentsNode(path.join(root, "AGENTS.md")).parse(after);
  assert.deepEqual(
    node.localChildren.map((child) => path.relative(root, child.id)),
    [".harness/README.md"],
  );
  assert.deepEqual(
    node.descendantChildren.map((child) => path.relative(root, child.id)),
    ["child/AGENTS.md"],
  );
  const index = new ReadmeNode(path.join(root, ".harness/README.md")).parse(
    await readFile(path.join(root, ".harness/README.md"), "utf8"),
  );
  assert.ok(index.localChildren.some((child) => child.id.endsWith(".harness/notes/README.md")));
  assert.equal(index.localChildren.find((child) => child.id.endsWith("notes/README.md"))?.description, "笔记材料。");
  assert.doesNotMatch(await readFile(path.join(root, ".harness/README.md"), "utf8"), /^---/m);
  const again = await readFile(path.join(root, "AGENTS.md"), "utf8");
  await migrateScopeMaterialIndex(root);
  assert.equal(await readFile(path.join(root, "AGENTS.md"), "utf8"), again);
});
