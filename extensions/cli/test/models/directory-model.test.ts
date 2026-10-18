import assert from "node:assert/strict";
import test from "node:test";
import {
  BaseNode,
  AgentsNode,
  InternalNode,
  LeafNode,
  ReadmeNode,
  SkillNode,
  TaskNode,
  MemoryNode,
} from "../../src/domain/models/index.js";
const create = { operation: "create" as const },
  update = { operation: "update" as const };
test("entry nodes extend InternalNode and business nodes extend BaseNode", () => {
  assert.ok(new AgentsNode("/repo/AGENTS.md") instanceof InternalNode);
  assert.ok(new ReadmeNode("/repo/README.md") instanceof InternalNode);
  assert.equal(new TaskNode("/repo/tasks/a/INDEX.md") instanceof InternalNode, false);
  assert.ok(new LeafNode("/repo/plain.md") instanceof BaseNode);
  assert.equal(new LeafNode("/repo/plain.md") instanceof InternalNode, false);
});
test("directory identity is independent of YAML and references project only public fields", () => {
  const skill = new SkillNode("/repo/skills/../skills/a/SKILL.md");
  assert.equal(skill.id, "/repo/skills/a/SKILL.md");
  assert.equal(skill.isLeaf, true);
  const root = new AgentsNode("/repo/AGENTS.md").parse(
    "my untouched comment\n",
  );
  root.addChild("local", skill);
  assert.deepEqual(root.localChildren, [{ id: skill.id }]);
  assert.equal(root.isLeaf, false);
  assert.match(root.serialize(), /my untouched comment/);
  assert.match(root.serialize(), /skills\/a\/SKILL.md/);
  assert.throws(() => root.addChild("descendant", { id: skill.id }));
  root.moveChild(skill.id, "descendant");
  assert.equal(root.localChildren.length, 0);
  assert.equal(root.descendantChildren.length, 1);
  const base = new BaseNode("/repo/index.md").parse("---\nid: human-id\n---\n");
  assert.equal(base.id, base.path);
  assert.equal(base.metadata?.id, "human-id");
});
test("structured task mutations generate defaults and roll back invalid updates", () => {
  const task = new TaskNode("/repo/tasks/a/index.md").create(
    { title: "Build", body: "Keep", metadata: { vendor: 42 } },
    create,
  );
  assert.equal(task.title, "Build");
  assert.equal(task.status, "backlog");
  assert.equal(task.priority, "none");
  const before = task.serialize();
  assert.throws(
    () =>
      task.update(
        { title: "Changed", status: "bad" as any, body: "Lost" },
        update,
      ),
    /status/,
  );
  assert.equal(task.serialize(), before);
  task.update({ priority: "high", metadata: { extra: true } }, update);
  assert.equal(task.body, "Keep");
  assert.equal(task.metadata?.vendor, 42);
  assert.equal(task.metadata?.extra, true);
});
test("memory and skill use validated structured fields and preserve unknown metadata", () => {
  const memory = new MemoryNode("/repo/memory/a/index.md").create(
    { memoryType: "project", description: "Useful", body: "Body" },
    create,
  );
  assert.equal(memory.memoryType, "project");
  const before = memory.serialize();
  assert.throws(() =>
    memory.update({ memoryType: 42 as any, body: "bad" }, update),
  );
  assert.equal(memory.serialize(), before);
  const skill = new SkillNode("/repo/a/SKILL.md").create(
    { name: "a", description: "A", metadata: { vendor: { keep: true } } },
    create,
  );
  assert.throws(() => skill.update({ name: 42 as any }, update));
  skill.update({ description: "Revised" }, update);
  assert.equal(skill.name, "a");
  assert.deepEqual(skill.metadata?.vendor, { keep: true });
});
test("internal structured updates preserve prose and reject body conflicts atomically", () => {
  const root = new AgentsNode("/repo/AGENTS.md").parse(
    "my untouched comment\n",
  );
  root.update(
    {
      constraints: ["Rule"],
      localChildren: [{ id: "/repo/a/index.md", name: "A" }],
    },
    update,
  );
  const before = root.serialize();
  assert.throws(() =>
    root.update({ body: "Replacement", constraints: ["other"] }, update),
  );
  assert.equal(root.serialize(), before);
  root.destroy({ operation: "destroy" });
  assert.equal(root.serialize(), before);
  assert.equal(root.children.length, 1);
});
test("ordinary navigation links remain authored prose rather than children", () => {
  const source =
    "## 本层记忆\n\n- [Guide](README.md) — guide\n- [Web](https://example.test/)\n- [A](a/index.md#section)\n";
  const node = new AgentsNode("/repo/AGENTS.md").parse(source);
  assert.deepEqual(node.children, [{ id: "/repo/a/index.md", name: "A" }]);
  assert.equal(node.serialize(), source);
  node.updateChild("/repo/a/index.md", { name: "Changed" });
  assert.match(node.serialize(), /README.md/);
  assert.match(node.serialize(), /index.md#section/);
});

test("layout follows canonical task statuses, registered contracts and recursive harness paths", async () => {
  const {
    identifyNodeType,
    harnessPath,
    lifecycleUnits,
    assertMovableLayout,
    registerDirectoryClassifier,
    resolveHref,
  } = await import("../../src/domain/models/node/layout.js");
  for (const status of ["cancelled", "in_review", "blocked"])
    assert.equal(
      identifyNodeType(`/repo/tasks/_default/${status}/a/index.md`),
      "task",
    );
  assert.equal(
    identifyNodeType("/repo/types/a/index.md", { module: "memory" }),
    "memory",
  );
  assert.equal(identifyNodeType("/repo/notes/a/index.md"), "note");
  assert.equal(identifyNodeType("/repo/misc/a/index.md"), "text");
  assert.equal(identifyNodeType("/repo/misc/a.md"), undefined);
  const unregister = registerDirectoryClassifier((path) =>
    path.includes("/custom/") ? "custom" : undefined,
  );
  assert.equal(identifyNodeType("/repo/custom/a/index.md"), "custom");
  unregister();
  assert.equal(harnessPath("/repo/a/SKILL.md"), "/repo/a/AGENTS.md");
  assert.equal(harnessPath("/repo/a/AGENTS.md"), "/repo/a/.harness/AGENTS.md");
  assert.equal(
    harnessPath("/repo/a/.harness/AGENTS.md"),
    "/repo/a/.harness/.harness/AGENTS.md",
  );
  assert.deepEqual(lifecycleUnits("/repo/a/AGENTS.md", true), [
    "/repo/a/AGENTS.md",
    "/repo/a/.harness",
  ]);
  assert.deepEqual(lifecycleUnits("/repo/a/SKILL.md", true), ["/repo/a"]);
  assert.throws(
    () => assertMovableLayout("/repo/a/AGENTS.md", true),
    /content node/,
  );
  assert.equal(
    resolveHref("/repo/AGENTS.md", "//example.test/a/index.md"),
    undefined,
  );
});
test("updates preserve unedited body bytes and reject non-entry child identities", () => {
  const node = new TaskNode("/repo/tasks/a/index.md").parse(
    "---\nname: a\n---\nBody without trailing newline",
  );
  node.update({ priority: "high" }, update);
  assert.equal(node.body, "Body without trailing newline");
  const root = new AgentsNode("/repo/AGENTS.md").parse("Keep\n");
  assert.throws(
    () => root.addChild("local", { id: "/repo/README.md" }),
    /entry/,
  );
  assert.equal(root.serialize(), "Keep\n");
});
test("structured defaults preserve explicitly supplied task metadata and diagnostics identify the file", () => {
  const task = new TaskNode("/repo/a/index.md").create(
    {
      metadata: {
        metadata: {
          "edges-tasks-status": "todo",
          "edges-task-priority": "high",
          vendor: "keep",
        },
      },
    },
    create,
  );
  assert.equal(task.status, "todo");
  assert.equal(task.priority, "high");
  assert.throws(
    () => task.parse("---\nmetadata: invalid\n---\nBody"),
    /\/repo\/a\/index.md/,
  );
});

test("mixed navigation/index items expose nodes without discarding their authored links", () => {
  const source = "## 本层记忆\n\n- [A](a/index.md) and [Guide](README.md)\n";
  const root = new AgentsNode("/repo/AGENTS.md").parse(source);
  assert.deepEqual(
    root.children.map((child) => child.id),
    ["/repo/a/index.md"],
  );
  assert.equal(root.serialize(), source);
  assert.throws(
    () => root.updateChild("/repo/a/index.md", { name: "Changed" }),
    /multi-link/,
  );
  assert.equal(root.serialize(), source);
  root.addChild("local", { id: "/repo/b/index.md", name: "B" });
  assert.ok(
    root.serialize().includes("- [A](a/index.md) and [Guide](README.md)"),
  );
});

test("ordinary percent filenames stay navigation while malformed entry paths fail", () => {
  const source = "## 本层记忆\n\n- [Guide](docs/100%.md)\n- [A](a/index.md)\n";
  const root = new AgentsNode("/repo/AGENTS.md").parse(source);
  assert.deepEqual(
    root.children.map((child) => child.id),
    ["/repo/a/index.md"],
  );
  assert.equal(root.serialize(), source);
  root.updateChild("/repo/a/index.md", { name: "Changed" });
  assert.ok(root.serialize().includes("- [Guide](docs/100%.md)"));
  const before = root.serialize();
  assert.throws(
    () => root.parse("## 本层记忆\n\n- [Bad](docs/100%/index.md)\n"),
    /invalid encoded child href/,
  );
  assert.equal(root.serialize(), before);
});

test("round-tripping extension hooks support create and avoid reparsing unchanged body on update", () => {
  class JsonBodyNode extends BaseNode {
    value: unknown = {};
    parseCount = 0;
    protected override parseBody(body: string): void {
      this.value = JSON.parse(body);
      this.parseCount++;
    }
    protected override serializeBody(): string {
      return JSON.stringify(this.value);
    }
  }
  const node = new JsonBodyNode("/repo/index.md").create(
    { body: '{"keep":true}' },
    create,
  );
  assert.equal(node.body, '{"keep":true}');
  const parses = node.parseCount;
  node.update({ name: "Changed" }, update);
  assert.equal(node.parseCount, parses);
  assert.equal(node.body, '{"keep":true}');
  node.update({ body: '{"next":true}' }, update);
  assert.equal(node.body, '{"next":true}');
});
test("BaseNode exposes addChild: non-composite nodes reject, composite nodes accept", () => {
  assert.throws(() => new SkillNode("/repo/skills/a/SKILL.md").addChild("local", { id: "/repo/x/INDEX.md" }), /composition/);
  const root = new AgentsNode("/repo/AGENTS.md").parse("");
  const viaBase: BaseNode = root;
  viaBase.addChild("local", { id: "/repo/skills/a/SKILL.md" });
  assert.equal(root.localChildren.length, 1);
});
