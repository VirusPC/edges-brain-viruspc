import assert from "node:assert/strict";
import test from "node:test";
import {
  BaseNode,
  TaskNode,
  MemoryNode,
  NoteNode,
  SkillNode,
} from "../../src/domain/models/index.js";
import { setNodeRelations } from "../../src/domain/core/relations.js";

test("base documents replace parsed content without injecting path or tree context", () => {
  const node = new BaseNode("/scope/one.md");
  assert.throws(() => new BaseNode("relative.md"), /absolute/i);
  assert.equal(node.parse("Body\n"), node);
  assert.equal(node.metadata, undefined);
  assert.equal(node.serialize(), "Body\n");
  node.parse(
    "---\nid: author-id\nparent: authored-data\nmetadata:\n  nested: [one]\n---\nFirst\n",
  );
  const metadata = node.metadata as any;
  metadata.metadata.nested.push("bad");
  assert.deepEqual((node.metadata as any).metadata.nested, ["one"]);
  setNodeRelations(node, {
    parent: { id: "/scope/AGENTS.md" },
    harness: { id: "/scope/one/AGENTS.md" },
  });
  (node.parent as any).id = "bad";
  assert.equal(node.parent?.id, "/scope/AGENTS.md");
  assert.deepEqual(node.children, []);
  assert.equal(node.harness?.id, "/scope/one/AGENTS.md");
  assert.equal(node.id, "/scope/one.md");
  assert.match(node.serialize(), /parent: authored-data/);
  assert.doesNotMatch(node.serialize(), /\/scope|children:/);
  assert.throws(
    () => setNodeRelations(node, { parent: { id: "relative.md" } }),
    /absolute/i,
  );
  node.parse("Replacement\n");
  assert.equal(node.metadata, undefined);
  assert.equal(node.serialize(), "Replacement\n");
});

test("body hooks run after construction and on body replacement", () => {
  class HookNode extends BaseNode {
    ready = true;
    protected override parseBody(body: string) {
      assert.equal(this.ready, true);
      super.parseBody(body.toUpperCase());
    }
    protected override serializeBody() {
      return super.serializeBody() + "!";
    }
  }
  const node = new HookNode("/hook.md");
  node.parse("one");
  assert.equal(node.body, "ONE!");
  node.body = "two";
  assert.equal(node.serialize(), "TWO!");
});

test("frontmatter rejects executable languages and preserves default YAML values", () => {
  const node = new BaseNode("/base.md").parse(
    "---\nwhen: 2026-01-01\n---\nHello\n",
  );
  assert.ok(node.metadata?.when instanceof Date);
  assert.throws(
    () => node.parse("---javascript\n({ unsafe: true })\n---\n"),
    /YAML/,
  );
  assert.equal(node.body, "Hello\n");
  const value = { list: ["one"] };
  node.setMetadata("vendor", value);
  value.list.push("bad");
  assert.deepEqual(node.metadata?.vendor, { list: ["one"] });
  node.removeMetadata("vendor");
  assert.equal(node.metadata?.vendor, undefined);
});

test("task setters preserve vendor fields and round trip existing business keys", () => {
  const node = new TaskNode("/scope/tasks/one.md").parse(
    "---\nname: one\nmetadata:\n  edges-title: Before\n  edges-tasks-status: todo\n  vendor: keep\n---\nBody\n",
  );
  node.title = "After";
  node.status = "in_progress";
  node.assignee = "alice";
  node.priority = "high";
  const read = new TaskNode(node.path).parse(node.serialize());
  assert.equal(read.title, "After");
  assert.equal(read.status, "in_progress");
  assert.equal(read.assignee, "alice");
  assert.equal(read.priority, "high");
  assert.equal((read.metadata?.metadata as any).vendor, "keep");
  read.assignee = undefined;
  assert.equal(read.assignee, undefined);
  assert.equal(new TaskNode("/optional.md").parse("Body").priority, "none");
  assert.equal(
    new TaskNode("/optional.md").parse("---\nname: fallback\n---\n").title,
    "fallback",
  );
});

test("invalid task metadata is rejected before the document changes", () => {
  const node = new TaskNode("/task.md").parse(
    "---\nmetadata:\n  edges-tasks-status: todo\n  edges-task-priority: high\n---\nOriginal\n",
  );
  const before = node.serialize();
  for (const action of [
    () => {
      node.status = "wrong" as any;
    },
    () => {
      node.priority = "wrong" as any;
    },
    () => node.setMetadata("metadata", { "edges-tasks-status": "wrong" }),
    () => node.setMetadata("metadata", []),
    () =>
      node.parse("---\nmetadata:\n  edges-task-priority: wrong\n---\nChanged"),
  ]) {
    assert.throws(action);
    assert.equal(node.serialize(), before);
  }
});

test("memory fields update canonical nested type and outer description", () => {
  const node = new MemoryNode("/memory.md").parse(
    "---\ndescription: old\nmetadata:\n  edges-type: project\n  vendor: keep\n---\nBody",
  );
  node.memoryType = "feedback";
  node.description = "new";
  const read = new MemoryNode(node.path).parse(node.serialize());
  assert.equal(read.memoryType, "feedback");
  assert.equal(read.description, "new");
  assert.equal((read.metadata?.metadata as any).vendor, "keep");
  read.memoryType = undefined;
  read.description = undefined;
  assert.equal(read.memoryType, undefined);
  assert.equal(read.description, undefined);
});

test("note title changes the first real H1 without adding YAML", () => {
  const node = new NoteNode("/note.md").parse(
    "```md\n# code\n```\n\n# Old\n\nText\n",
  );
  assert.equal(node.title, "Old");
  node.title = "New [title]";
  assert.equal(
    new NoteNode(node.path).parse(node.serialize()).title,
    "New [title]",
  );
  assert.match(node.body, /# code/);
  assert.equal(node.metadata, undefined);
  const noTitle = new NoteNode("/plain.md").parse("Text\n");
  noTitle.title = "Added";
  assert.match(noTitle.body, /^# Added\n\nText/);
});

test("skill name and description are frontmatter fields with optional header support", () => {
  const node = new SkillNode("/skill/SKILL.md").parse("Steps\n");
  node.name = "example";
  node.description = "Useful skill";
  node.setMetadata("vendor", { keep: true });
  const read = new SkillNode(node.path).parse(node.serialize());
  assert.equal(read.name, "example");
  assert.equal(read.description, "Useful skill");
  assert.equal(read.body, "Steps\n");
  assert.deepEqual(read.metadata?.vendor, { keep: true });
});

test("typed task setters reject empty values instead of silently selecting defaults", () => {
  const node = new TaskNode("/task.md");
  assert.throws(() => {
    node.status = "" as any;
  });
  assert.throws(() => {
    node.priority = "" as any;
  });
  assert.equal(node.metadata, undefined);
});
