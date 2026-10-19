import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  existsSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveScope,
  isScope,
  discoverScopes,
} from "../../src/services/scope.js";
import {
  initMemory,
  doctorMemory,
  rememberMemory,
} from "../../src/services/memory/index.js";
import { NodeService } from "../../src/services/node/node-service.js";
import {
  refreshProjectIndex,
  parseProjectAgents,
  updateProject,
} from "../../src/services/tasks/project-meta.js";
import { domainBoard, nodeBoardWriter } from "../tasks/utils/helpers.js";
function fixture(t: any) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "uniform-nodes-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function put(root: string, file: string, text: string) {
  mkdirSync(join(root, file, ".."), { recursive: true });
  writeFileSync(join(root, file), text);
}
const read = (root: string, file: string) =>
  readFileSync(join(root, file), "utf8");
test("nearest unmarked, type and business AGENTS are CLI nodes without adopting Memory", async (t) => {
  const root = fixture(t);
  mkdirSync(join(root, ".git"));
  for (const [dir, text] of [
    ["plain", "# Plain\n"],
    [
      "plain/type",
      "<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
    ],
    ["tasks", "# Business\n"],
  ]) {
    put(root, `${dir}/AGENTS.md`, text);
    assert.equal(isScope(join(root, dir)), true);
    assert.equal(resolveScope({}, join(root, dir)), join(root, dir));
  }
  assert.equal(discoverScopes(root).length, 4);
  const target = resolveScope({}, root, "uninitialized");
  mkdirSync(target);
  assert.equal(
    (await initMemory({ targetDir: target, rootDir: target }))
      .selectionRequired,
    true,
  );
  await assert.rejects(
    rememberMemory({
      targetDir: target,
      type: "project",
      slug: "no",
      content: "no",
    }),
    /type|init|初始化/i,
  );
  assert.equal(existsSync(join(target, ".harness")), false);
});
test("Doctor preserves sparse generic nodes and registered cross-directory local and descendant ownership", async (t) => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ["project"] });
  put(
    root,
    "business/AGENTS.md",
    "# Business\n\n## 本层记忆\n- [shared](../shared/AGENTS.md) — shared content\n\n## 下层记忆索引\n- [deep](../nested/deep/AGENTS.md) — custom descendant\n\n## Authored\n[ordinary](../unowned/AGENTS.md)\n",
  );
  put(root, "shared/AGENTS.md", "# Shared\n");
  put(root, "nested/AGENTS.md", "# Physical intermediate\n");
  mkdirSync(join(root, "nested/deep"), { recursive: true });
  await initMemory({
    targetDir: join(root, "nested/deep"),
    rootDir: join(root, "nested/deep"),
    memoryTypes: ["project"],
  });
  put(root, "unowned/AGENTS.md", "# Unowned\n");
  const files = [
    "AGENTS.md",
    "business/AGENTS.md",
    "shared/AGENTS.md",
    "nested/AGENTS.md",
    "nested/deep/AGENTS.md",
    "unowned/AGENTS.md",
    ".harness/memory/projects/README.md",
  ];
  const before = files.map((file) => read(root, file));
  const report = await doctorMemory({ targetDir: root, apply: true });
  assert.deepEqual(report.remaining, []);
  assert.deepEqual(
    files.map((file) => read(root, file)),
    before,
  );
  const service = new NodeService({ managedRoot: root });
  const local = await service.list(join(root, "business"), { localOnly: true });
  assert.deepEqual(
    local.map((node) => node.path),
    [join(root, "business/AGENTS.md"), join(root, "shared/AGENTS.md")],
  );
  const all = await service.list(join(root, "business"));
  assert.deepEqual(
    all.map((node) => node.path),
    [
      join(root, "business/AGENTS.md"),
      join(root, "shared/AGENTS.md"),
      join(root, "nested/deep/AGENTS.md"),
      join(root, "nested/deep/.harness/README.md"),
      join(root, "nested/deep/.harness/memory/projects/README.md"),
    ],
  );
});
test("Task Project index lives once in local ownership while preserving authored sections", async (t) => {
  const root = fixture(t);
  const source =
    "# Board\n\n<!-- project-memory-local:start -->\n## 本层记忆\n\n- [guide](guide.md) — authored\n<!-- project-memory-local:end -->\n\n## Authored\nkeep this\n";
  const project = {
    project: "demo",
    dir: "demo",
    title: "Demo",
    description: "Business purpose",
    path: "tasks/demo/AGENTS.md",
  };
  put(root, "tasks/AGENTS.md", source);
  put(root, "tasks/guide.md", "guide");
  const tail =
    "\n<!-- project-memory:start -->\n<!-- project-memory-local:start -->\n## 本层记忆\n\n- [guide](../guide.md) — shared guide\n<!-- project-memory-local:end -->\n<!-- project-memory:end -->\n\n## Authored\nkeep exactly\n";
  put(root, "tasks/demo/AGENTS.md", "# Demo\n\nBusiness purpose\n" + tail);
  put(
    root,
    "tasks/demo/README.md",
    "# Demo\n\nBusiness purpose\n\n<!-- project-entries-local:start -->\n## 本层内容\n<!-- project-entries-local:end -->\n",
  );
  const agentsBefore = read(root, "tasks/demo/AGENTS.md");
  const parsed = parseProjectAgents(agentsBefore);
  assert.equal(parsed.description, "Business purpose");
  const board = domainBoard(root);
  await updateProject(board, "demo", { title: "New title" }, nodeBoardWriter());
  assert.equal(read(root, "tasks/demo/AGENTS.md"), agentsBefore);
  const projectReadme = read(root, "tasks/demo/README.md");
  assert.match(projectReadme, /^# New title\n/);
  assert.match(projectReadme, /project-entries-local:start/);
  const boardAgents = read(root, "tasks/AGENTS.md");
  assert.equal(boardAgents, source);
  assert.doesNotMatch(boardAgents, /## Task Projects/);
  assert.doesNotMatch(boardAgents, /demo\/AGENTS\.md/);
  const index = read(root, "tasks/README.md");
  assert.equal(index.split("demo/README.md").length - 1, 1);
  const { ReadmeNode } = await import("../../src/domain/models/readme/readme-node.js");
  const node = await new NodeService({ managedRoot: root }).get(
    join(root, "tasks/README.md"),
    ReadmeNode,
  );
  assert.ok(node);
  assert.ok(
    node.localChildren.some(
      (child) => child.id === join(root, "tasks/demo/README.md"),
    ),
  );
  assert.equal(
    node.descendantChildren.some(
      (child) => child.id === join(root, "tasks/demo/README.md"),
    ),
    false,
  );
  await refreshProjectIndex(board, nodeBoardWriter());
  assert.equal(read(root, "tasks/AGENTS.md"), source);
  assert.equal(read(root, "tasks/README.md"), index);
});
test("sparse Task Project markers are local content and a heading-only local section is reused", async (t) => {
  const root = fixture(t);
  put(
    root,
    "AGENTS.md",
    "# Board\n<!-- project-memory-local:start -->\n## Task Projects\n\n- [demo](demo/AGENTS.md) — business\n<!-- project-memory-local:end -->\n",
  );
  put(root, "demo/AGENTS.md", "# Demo\n");
  assert.equal(
    (await new NodeService({ managedRoot: root }).list(root)).length,
    2,
  );
  const source =
    "# Board\n\n## 本层记忆\n\nManual local prose.\n\n## Authored\nKeep me.\n";
  const { AgentsNode } = await import("../../src/domain/models/agents/agents-node.js");
  const node = new AgentsNode(join(root, 'AGENTS.md')).parse(source);
  node.addChild('local', { id: join(root, 'demo/AGENTS.md'), name: 'Demo', description: 'Business' });
  const updated = node.serialize();
  assert.equal(updated.split("## 本层记忆").length - 1, 1);
  assert.match(updated, /## Authored\nKeep me\./);
});
test("explicit init keeps an existing local owner and updates an explicitly supplied description", async (t) => {
  const root = fixture(t);
  put(
    root,
    "AGENTS.md",
    "# Root\n\n## 本层记忆\n- [owned](physical/deep/AGENTS.md) — old description\n",
  );
  put(root, "physical/AGENTS.md", "# Physical parent\n");
  put(root, "physical/deep/AGENTS.md", "# Owned\n");
  const result = await initMemory({
    targetDir: join(root, "physical/deep"),
    rootDir: root,
    memoryTypes: ["project"],
    description: "Updated description",
  });
  assert.equal(result.indexAnchor, root);
  assert.match(read(root, "AGENTS.md"), /Updated description/);
  assert.doesNotMatch(read(root, "AGENTS.md"), /project-memory-children/);
  assert.equal(read(root, "physical/AGENTS.md"), "# Physical parent\n");
});

test("Doctor diagnoses overlapping ownership groups without choosing an authored edge", async (t) => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ["project"] });
  put(root, "owned/AGENTS.md", "# Owned\n");
  const localLine =
    "- [Local label](owned/AGENTS.md) — Keep this local description.";
  put(
    root,
    "AGENTS.md",
    read(root, "AGENTS.md")
      .replace(
        "<!-- project-harness-local:end -->",
        `${localLine}\n<!-- project-harness-local:end -->`,
      )
      .replace(
        "<!-- project-harness:end -->",
        "<!-- project-harness-descendants:start -->\n## 下层系统维护信息\n\n- [Descendant](owned/AGENTS.md) — Old descendant description.\n- [Duplicate](owned/AGENTS.md) — Duplicate description.\n<!-- project-harness-descendants:end -->\n<!-- project-harness:end -->",
      ),
  );
  const beforeLocal = read(root, "AGENTS.md").match(
    /<!-- project-harness-local:start -->[\s\S]*?<!-- project-harness-local:end -->/,
  )![0];
  const result = await doctorMemory({ targetDir: root, apply: true });
  assert.ok(
    result.remaining.some(
      (f) =>
        f.code === "invalid-entry" && /child already indexed/.test(f.detail),
    ),
  );
  assert.equal(
    read(root, "AGENTS.md").match(
      /<!-- project-harness-local:start -->[\s\S]*?<!-- project-harness-local:end -->/,
    )![0],
    beforeLocal,
  );
  assert.equal(read(root, "AGENTS.md").split("owned/AGENTS.md").length - 1, 3);
  assert.deepEqual(
    (await doctorMemory({ targetDir: root, apply: true })).repaired,
    [],
  );
});

test("Doctor repairs an adopted child missing AGENTS and its missing registration in one pass", async (t) => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ["project"] });
  const child = join(root, "child");
  mkdirSync(child);
  await initMemory({
    targetDir: child,
    rootDir: child,
    memoryTypes: ["project"],
  });
  rmSync(join(child, "AGENTS.md"));
  put(root, "business/AGENTS.md", "# Business stays sparse\n");
  const result = await doctorMemory({ targetDir: root, apply: true });
  assert.ok(
    result.findings.some(
      (finding) =>
        finding.code === "missing-agents" && finding.path === "child/AGENTS.md",
    ),
  );
  assert.deepEqual(result.remaining, []);
  assert.equal(isScope(child), true);
  const node = (
    await new NodeService({ managedRoot: root }).list(root)
  )[0]!;
  assert.ok(
    node.descendantChildren.some(
      (ref) => ref.id === join(root, "child/AGENTS.md"),
    ),
  );
  assert.equal(read(root, "business/AGENTS.md"), "# Business stays sparse\n");
  assert.equal(existsSync(join(root, "business/.harness")), false);
  assert.deepEqual(
    (await doctorMemory({ targetDir: root, apply: true })).repaired,
    [],
  );
});

test("doctor repairs independent valid index while retaining invalid sibling and its reference", async (t) => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ["project"] });
  const index = ".harness/memory/projects/README.md";
  put(
    root,
    ".harness/memory/projects/project_new/index.md",
    "---\nname: project_new\ndescription: New\n---\nBody",
  );
  const broken =
    "<!-- project-memory-local:start -->\n- [one](child/AGENTS.md)\n- [two](child/AGENTS.md)\n<!-- project-memory-local:end -->";
  put(root, "broken/AGENTS.md", broken);
  put(root, "broken/child/AGENTS.md", "# Child");
  const agents = read(root, "AGENTS.md").replace(
    "<!-- project-harness:end -->",
    "<!-- project-harness-descendants:start -->\n- [Broken](broken/AGENTS.md) — retain\n<!-- project-harness-descendants:end -->\n<!-- project-harness:end -->",
  );
  put(root, "AGENTS.md", agents);
  const result = await doctorMemory({
    targetDir: root,
    rootDir: root,
    apply: true,
  });
  assert.ok(
    result.findings.some((f) => f.code === "stale-index" && f.path === index),
  );
  assert.ok(result.repaired.some((f) => f.includes(index)));
  assert.match(read(root, index), /project_new\/index.md/);
  assert.equal(read(root, "broken/AGENTS.md"), broken);
  assert.match(read(root, "AGENTS.md"), /broken\/AGENTS.md/);
  assert.ok(
    result.remaining.some(
      (f) => f.code === "invalid-entry" && f.path === "broken/AGENTS.md",
    ),
  );
});
