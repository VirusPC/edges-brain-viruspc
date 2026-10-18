import assert from "node:assert/strict";
import test from "node:test";
import { AgentsNode } from "../../src/domain/models/index.js";
import { INTERNAL_SECTIONS } from "../../src/domain/config/sections.js";

const source = `# Context

See [plain](plain/index.md).

<!-- project-memory-important:start -->
## 本层重要约束

- Keep the rule.
<!-- project-memory-important:end -->

<!-- project-memory-local:start -->
## 本层记忆

Authored **introduction**, kept verbatim.

- [One](one/index.md) — first description
<!-- project-memory-local:end -->

<!-- project-memory-children:start -->
## 下层记忆索引

- [Nested](nested/AGENTS.md) — nested scope
<!-- project-memory-children:end -->

Footer stays.
`;

const modern = source
  .replaceAll("project-memory-important", "project-harness-constraints")
  .replaceAll("project-memory-local", "project-harness-local")
  .replaceAll("project-memory-children", "project-harness-descendants")
  .replaceAll("本层重要约束", "本层硬约束")
  .replaceAll("本层记忆", "本层系统维护信息")
  .replaceAll("下层记忆索引", "下层系统维护信息");

test("legacy and canonical layer markers parse to the same ownership", () => {
  const oldNode = new AgentsNode("/scope/AGENTS.md").parse(source);
  const newNode = new AgentsNode("/scope/AGENTS.md").parse(modern);
  assert.deepEqual(oldNode.content.constraints, newNode.content.constraints);
  assert.deepEqual(oldNode.children, newNode.children);
});

test("internal nodes derive only indexed ownership and preserve authored source", () => {
  const node = new AgentsNode("/scope/AGENTS.md").parse(source);
  assert.deepEqual(node.content.constraints, ["Keep the rule."]);
  assert.deepEqual(node.children, [
    {
      id: "/scope/one/index.md",
      name: "One",
      description: "first description",
    },
    {
      id: "/scope/nested/AGENTS.md",
      name: "Nested",
      description: "nested scope",
    },
  ]);
  assert.deepEqual(node.content.localChildren, [
    {
      id: "/scope/one/index.md",
      name: "One",
      description: "first description",
    },
  ]);
  assert.equal(node.serialize(), source);
  (node.content as any).localChildren[0].id = "bad";
  (node.children as any)[0].id = "bad";
  assert.equal(node.children[0].id, "/scope/one/index.md");
});

test("index edits replace optional fields, move group, and retain non-index prose", () => {
  const node = new AgentsNode("/scope/AGENTS.md").parse(source);
  node.updateChild("/scope/one/index.md", {
    name: undefined,
    description: undefined,
  });
  node.moveChild("/scope/one/index.md", "descendant");
  assert.deepEqual(node.children, [
    {
      id: "/scope/nested/AGENTS.md",
      name: "Nested",
      description: "nested scope",
    },
    { id: "/scope/one/index.md" },
  ]);
  node.addChild("local", {
    id: "/scope/dir/a space (#1)/index.md",
    name: "[x] *literal*",
    description: "Use [a] & <b>",
  });
  node.setConstraints(["New *literal* rule"]);
  const rendered = node.serialize();
  const read = new AgentsNode(node.path).parse(rendered);
  assert.deepEqual(read.children, [
    {
      id: "/scope/dir/a space (#1)/index.md",
      name: "[x] *literal*",
      description: "Use [a] & <b>",
    },
    {
      id: "/scope/nested/AGENTS.md",
      name: "Nested",
      description: "nested scope",
    },
    { id: "/scope/one/index.md", name: "one/index.md" },
  ]);
  assert.deepEqual(read.content.constraints, ["New *literal* rule"]);
  assert.match(rendered, /Authored \*\*introduction\*\*, kept verbatim\./);
  assert.match(rendered, /See \[plain\]\(plain\/index\.md\)\./);
  assert.match(rendered, /## 本层重要约束/);
  assert.match(rendered, /Footer stays\./);
  node.removeChild("/scope/one/index.md");
  assert.equal(
    new AgentsNode(node.path).parse(node.serialize()).children.length,
    2,
  );
});

test("index mutation validates group and identity before changing document", () => {
  const node = new AgentsNode("/scope/AGENTS.md").parse(source);
  for (const action of [
    () => node.addChild("bad" as any, { id: "/scope/new.md" }),
    () => node.addChild("local", { id: "/scope/one/index.md" }),
    () => node.updateChild("/scope/missing.md", {}),
    () => node.moveChild("/scope/one/index.md", "other" as any),
    () => node.addChild("local", { id: "/scope/broken\npath" }),
  ]) {
    assert.throws(action);
    assert.equal(node.serialize(), source);
  }
});

test("parse and body replacement discard old sections and indexes", () => {
  const node = new AgentsNode("/scope/AGENTS.md").parse(source);
  node.body = "## 本层记忆\n\n- [Second](second/index.md)\n";
  assert.deepEqual(node.children, [
    { id: "/scope/second/index.md", name: "Second" },
  ]);
  assert.deepEqual(node.content.constraints, []);
  node.parse("A standalone entry.\n");
  assert.deepEqual(node.children, []);
  assert.equal(node.body, "A standalone entry.\n");
  node.addChild("local", { id: "/scope/fresh/index.md" });
  assert.equal(
    new AgentsNode(node.path).parse(node.body).children[0].id,
    "/scope/fresh/index.md",
  );
});

test("existing type index entries behave as local without adding section headings", () => {
  const original = `<!-- project-memory-type:start -->
name: project
module: memory
<!-- project-memory-type:end -->

# PROJECT

> Authored purpose.

<!-- project-memory-entries:start -->
- [First](first/index.md) — keep
<!-- project-memory-entries:end -->
`;
  const node = new AgentsNode("/scope/types/AGENTS.md").parse(original);
  assert.deepEqual(node.children, [
    { id: "/scope/types/first/index.md", name: "First", description: "keep" },
  ]);
  assert.equal(node.serialize(), original);
  node.updateChild("/scope/types/first/index.md", { name: "Revised" });
  node.addChild("local", {
    id: "/scope/types/second/index.md",
    name: "Second",
  });
  const rendered = node.serialize();
  assert.match(rendered, /project-memory-entries:start/);
  assert.match(rendered, /name: project\nmodule: memory/);
  assert.match(rendered, /> Authored purpose\./);
  assert.doesNotMatch(
    rendered,
    /## 本层记忆|## 本层组成|## 本层系统维护信息|project-memory-local|project-harness-local|project-memory-children/,
  );
  assert.deepEqual(
    new AgentsNode(node.path).parse(rendered).children.map((ref) => ref.id),
    ["/scope/types/first/index.md", "/scope/types/second/index.md"],
  );
});

test("multiple actual indexed links are exposed while ordinary prose remains unchanged", () => {
  const original =
    "## 本层记忆\n\n- [One](one/index.md) and [Two](two/index.md) — shared\n\nAn introduction.\n";
  const node = new AgentsNode("/scope/AGENTS.md").parse(original);
  assert.deepEqual(
    node.children.map((ref) => ref.id),
    ["/scope/one/index.md", "/scope/two/index.md"],
  );
  assert.equal(node.serialize(), original);
});

test("re-added children serialize in the same order as the current view", () => {
  const node = new AgentsNode("/scope/AGENTS.md").parse(
    "## 本层记忆\n\n- [A](a/index.md)\n- [B](b/index.md)\n",
  );
  node.removeChild("/scope/a/index.md");
  node.addChild("local", { id: "/scope/a/index.md", name: "A" });
  assert.deepEqual(
    node.children.map((ref) => ref.id),
    ["/scope/b/index.md", "/scope/a/index.md"],
  );
  assert.deepEqual(
    new AgentsNode(node.path)
      .parse(node.serialize())
      .children.map((ref) => ref.id),
    ["/scope/b/index.md", "/scope/a/index.md"],
  );
});

test("CRLF type indexes preserve their markers and local ownership", () => {
  const original =
    "# Type\r\n\r\n<!-- project-memory-entries:start -->\r\n- [A](a/index.md)\r\n<!-- project-memory-entries:end -->\r\n";
  const node = new AgentsNode("/scope/types/AGENTS.md").parse(original);
  assert.deepEqual(node.children, [
    { id: "/scope/types/a/index.md", name: "A" },
  ]);
  assert.equal(node.serialize(), original);
  node.updateChild("/scope/types/a/index.md", { name: "B" });
  assert.match(node.serialize(), /project-memory-entries:start -->\r\n/);
});

test("linked prose within ownership sections stays ordinary and survives index edits", () => {
  for (const [heading, kind] of [
    ["本层记忆", "local"],
    ["下层记忆索引", "descendant"],
  ] as const) {
    const original = `## ${heading}\n\nSee [README](README.md) for usage.\n\n- [Task](task/index.md) — owned\n`;
    const node = new AgentsNode("/scope/AGENTS.md").parse(original);
    assert.deepEqual(node.children, [
      { id: "/scope/task/index.md", name: "Task", description: "owned" },
    ]);
    assert.equal(node.serialize(), original);
    node.updateChild("/scope/task/index.md", {
      name: "Changed",
      description: "owned",
    });
    const rendered = node.serialize();
    assert.match(rendered, /^See \[README\]\(README\.md\) for usage\.$/m);
    assert.match(rendered, /^- \[Changed\]\(<task\/index\.md>\) — owned$/m);
    assert.deepEqual(new AgentsNode(node.path).parse(rendered).children, [
      { id: "/scope/task/index.md", name: "Changed", description: "owned" },
    ]);
  }
});

test("ambiguous multi-link index edits reject before changing content or Markdown", () => {
  const original =
    "## 本层记忆\n\n- [One](one/index.md) and [Two](two/index.md) — shared\n";
  const node = new AgentsNode("/scope/AGENTS.md").parse(original);
  const before = node.content;
  for (const edit of [
    () => node.updateChild("/scope/one/index.md", { name: "Changed" }),
    () => node.moveChild("/scope/two/index.md", "descendant"),
    () => node.removeChild("/scope/one/index.md"),
  ]) {
    assert.throws(edit, /multi-link/i);
    assert.deepEqual(node.content, before);
    assert.equal(node.body, original);
    assert.equal(node.serialize(), original);
  }
  node.addChild("local", { id: "/scope/three/index.md", name: "Three" });
  const rendered = node.serialize();
  assert.match(
    rendered,
    /^- \[One\]\(one\/index\.md\) and \[Two\]\(two\/index\.md\) — shared$/m,
  );
  assert.match(rendered, /^- \[Three\]\(<three\/index\.md>\)$/m);
});

test("ownership hrefs retain filename escapes, Unicode, spaces and fragments across unrelated index edits", () => {
  const targets = [
    "a%23b/index.md#heading",
    "a%3Fb/index.md?view=1",
    "a%25b/index.md",
    "a%2523b/index.md",
    "plain/index.md#section",
    "目录/有 空格/index.md",
  ];
  const source = `<!-- project-memory-local:start -->\n${targets.map((target, i) => `- [item ${i}](<${target}>)`).join("\n")}\n<!-- project-memory-local:end -->\n`;
  const node = new AgentsNode("/scope/AGENTS.md").parse(source);
  assert.deepEqual(
    node.children.map((reference) => reference.id),
    targets.map(
      (target) => "/scope/" + decodeURIComponent(target.split(/[?#]/, 1)[0]!),
    ),
  );
  node.updateChild(node.children[0]!.id, { name: "changed" });
  const saved = node.serialize();
  assert.deepEqual(
    new AgentsNode(node.path)
      .parse(saved)
      .children.map((reference) => reference.id),
    node.children.map((reference) => reference.id),
  );
  assert.equal(saved.includes("a%2523b/index.md#heading"), false);
});

test('managed block replacement preserves CRLF and refuses malformed boundaries', async () => {
 const {upsertBlock}=await import('../../src/domain/models/node/document.js');
 const start='<!-- project-memory-local:start -->',end='<!-- project-memory-local:end -->';
 const source='Intro  \r\n'+start+'\r\nOld\r\n'+end+'\r\nTail  \r\n';
 assert.equal(upsertBlock(source,start,end,start+'\nNew\n'+end),'Intro  \r\n'+start+'\r\nNew\r\n'+end+'\r\nTail  \r\n');
 assert.throws(()=>upsertBlock('Intro\n'+start,start,end,start+'\nNew\n'+end),/marker|boundary|unclosed/i);
});

test("AGENTS section headings are system-maintenance titles", () => {
  assert.equal(INTERNAL_SECTIONS.localChildren.heading, "本层系统维护信息");
  assert.equal(INTERNAL_SECTIONS.descendantChildren.heading, "下层系统维护信息");
});
