import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { AgentsNode } from "../../src/domain/models/index.js";
import { setNodePath } from "../../src/domain/core/relations.js";
import { traverse } from "../../src/domain/operations/traverse.js";
import { NodeService } from "../../src/services/node/node-service.js";

const agents = (body: string) => `# Scope

<!-- project-harness:start -->
<!-- project-harness-constraints:start -->
## 本层硬约束

- keep
<!-- project-harness-constraints:end -->
${body}
<!-- project-harness:end -->
`;

test("compose block registers a local directory, name, description, and remote", () => {
  const file = "/repo/AGENTS.md";
  const node = new AgentsNode(file).parse(agents(`
<!-- project-harness-compose:start -->
## 组合

- [brain](<../brain>) — 个人大脑 remote: https://github.com/example/brain.git
<!-- project-harness-compose:end -->
<!-- project-harness-local:start -->
## 本层系统维护信息

- [tasks](<.harness/tasks/README.md>) — 维护任务
<!-- project-harness-local:end -->
`));
  assert.deepEqual(node.composeNode().entries().map((entry) => ({
    name: entry.name,
    directory: entry.directory,
    href: entry.href,
    description: entry.description,
    remote: entry.remote,
  })), [{
    name: "brain",
    directory: "/brain",
    href: "../brain",
    description: "个人大脑",
    remote: "https://github.com/example/brain.git",
  }]);
  assert.equal(node.compose?.id, "/repo/.compose/README.md");
  assert.equal(node.compose?.name, "组合");
  assert.deepEqual(node.composeNode().children, [{
    id: "/brain/AGENTS.md",
    name: "brain",
    description: "个人大脑",
  }]);
  assert.equal(node.children.some((child) => child.id === "/brain/AGENTS.md"), false);
  assert.equal(node.serialize(), node.parse(node.serialize()).serialize());
});

test("addChild writes the block and removeChild drops the last link", () => {
  const file = "/repo/AGENTS.md";
  const node = new AgentsNode(file).parse(agents(`
<!-- project-harness-local:start -->
## 本层系统维护信息

- [tasks](<.harness/tasks/README.md>) — 维护任务
<!-- project-harness-local:end -->
`));
  node.composeNode().addChild({
    name: "team",
    directory: "/repos/team",
    description: "团队库",
    remote: "git@github.com:example/team.git",
  });
  const source = node.serialize();
  assert.match(source, /project-harness-compose:start/);
  assert.match(source, /\[team\]\(<\/repos\/team>\) — 团队库 remote: git@github\.com:example\/team\.git/);
  assert.match(source, /\[tasks\]\(<\.harness\/tasks\/README\.md>\)/);
  const again = new AgentsNode(file).parse(source);
  assert.equal(again.composeNode().entries()[0]?.name, "team");
  assert.equal(again.localChildren[0]?.name, "tasks");
  again.composeNode().removeChild("/repos/team/AGENTS.md");
  const cleared = again.serialize();
  assert.doesNotMatch(cleared, /\[team\]/);
  assert.match(cleared, /\[tasks\]\(<\.harness\/tasks\/README\.md>\)/);
  assert.equal(new AgentsNode(file).parse(cleared).composeNode().entries().length, 0);
  assert.equal(new AgentsNode(file).parse(cleared).compose, undefined);
  assert.throws(
    () => again.composeNode().removeChild("/repos/team/AGENTS.md"),
    /compose entry not found/,
  );
});

test("a description survives serialize and parse next to the remote", () => {
  const file = "/repo/AGENTS.md";
  const node = new AgentsNode(file).parse(agents(""));
  node.composeNode().addChild({
    name: "brain",
    description: "个人大脑",
    remote: "https://github.com/example/brain.git",
  });
  const source = node.serialize();
  assert.match(source, /\[brain\]\(<~\/\.edges\/composed\/brain>\) — 个人大脑 remote: https:\/\/github\.com\/example\/brain\.git/);
  const loaded = new AgentsNode(file).parse(source);
  assert.equal(loaded.composeNode().entries()[0]?.description, "个人大脑");
  assert.equal(loaded.composeNode().entries()[0]?.remote, "https://github.com/example/brain.git");
  assert.equal(loaded.serialize(), source);
});

test("omitted directory uses ~/.edges/composed/<name> and checkout expands ~", () => {
  const file = "/repo/AGENTS.md";
  const node = new AgentsNode(file).parse(agents(""));
  node.composeNode().addChild({ name: "brain", remote: "https://github.com/example/brain.git" });
  const source = node.serialize();
  assert.match(source, /\[brain\]\(<~\/\.edges\/composed\/brain>\)/);
  const loaded = new AgentsNode(file).parse(source);
  assert.equal(loaded.composeNode().entries()[0]?.href, "~/.edges/composed/brain");
  assert.equal(
    loaded.composeNode().checkout("brain").directory,
    path.join(homedir(), ".edges", "composed", "brain"),
  );
  node.composeNode().addChild({ name: "custom", directory: "~/custom" });
  assert.match(node.serialize(), /\[custom\]\(<~\/custom>\)/);
  assert.equal(node.composeNode().checkout("custom").directory, path.join(homedir(), "custom"));
  node.composeNode().addChild({ name: "abs", directory: "/var/composed/abs" });
  assert.equal(node.composeNode().checkout("abs").directory, "/var/composed/abs");
  assert.match(node.serialize(), /\[abs\]\(<\/var\/composed\/abs>\)/);
  node.composeNode().addChild({ name: "rel", directory: "rel-dir" });
  assert.equal(node.composeNode().checkout("rel").directory, "/repo/rel-dir");
  assert.match(node.serialize(), /\[rel\]\(<\/repo\/rel-dir>\)/);
});

test("setNodePath moves the compose edge id", () => {
  const node = new AgentsNode("/repo/AGENTS.md").parse(agents(`
<!-- project-harness-compose:start -->
## 组合

- [brain](<../brain>) — 个人大脑
<!-- project-harness-compose:end -->
`));
  setNodePath(node, "/moved/AGENTS.md");
  assert.equal(node.compose?.id, "/moved/.compose/README.md");
  assert.equal(node.composeNode().path, "/moved/.compose/README.md");
});

test("default traverse stays in scope; --with-composed yields only the external entry", async () => {
  const foreignChild = new AgentsNode("/brain/nested/AGENTS.md");
  const foreign = new AgentsNode("/brain/AGENTS.md").parse(agents(`
<!-- project-harness-descendants:start -->
## 下层系统维护信息

- [nested](<nested/AGENTS.md>) — nested
<!-- project-harness-descendants:end -->
`));
  const root = new AgentsNode("/repo/AGENTS.md").parse(agents(`
<!-- project-harness-compose:start -->
## 组合

- [brain](</brain>) — 个人大脑 remote: https://github.com/example/brain.git
<!-- project-harness-compose:end -->
`));
  const entries = new Map([root, foreign, foreignChild].map((node) => [node.id, node]));
  const resolve = (parent: { compose?: { id: string }; path: string }, ref: { id: string }) => {
    if (ref.id === parent.compose?.id) return ref.id;
    return entries.has(ref.id) ? ref.id : undefined;
  };
  const load = async (parent: AgentsNode, _ref: { id: string }, id: string) => {
    if (parent.compose?.id === id) return parent.composeNode();
    return entries.get(id)!;
  };
  const collect = async (options: { withComposed?: boolean; localOnly?: boolean; includeHarness?: boolean }) => {
    const paths: string[] = [];
    for await (const node of traverse(root, options, resolve, load)) paths.push(node.path);
    return paths;
  };
  assert.deepEqual(await collect({}), ["/repo/AGENTS.md"]);
  assert.deepEqual(await collect({ localOnly: true }), ["/repo/AGENTS.md"]);
  assert.deepEqual(await collect({ includeHarness: true }), ["/repo/AGENTS.md"]);
  assert.deepEqual(await collect({ withComposed: true }), ["/repo/AGENTS.md", "/brain/AGENTS.md"]);
  assert.deepEqual(await collect({ withComposed: true, localOnly: true }), ["/repo/AGENTS.md", "/brain/AGENTS.md"]);
});

test("NodeService list includes an external entry only with withComposed", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "compose-node-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scope = path.join(root, "scope");
  const brain = path.join(root, "brain");
  mkdirSync(path.join(brain, "nested"), { recursive: true });
  mkdirSync(scope, { recursive: true });
  writeFileSync(path.join(scope, "AGENTS.md"), agents(`
<!-- project-harness-compose:start -->
## 组合

- [brain](<${brain}>) — 个人大脑 remote: https://github.com/example/brain.git
<!-- project-harness-compose:end -->
`));
  writeFileSync(path.join(brain, "AGENTS.md"), agents(`
<!-- project-harness-descendants:start -->
## 下层系统维护信息

- [nested](<nested/AGENTS.md>) — nested
<!-- project-harness-descendants:end -->
`));
  writeFileSync(path.join(brain, "nested", "AGENTS.md"), agents(""));
  const service = new NodeService({ managedRoot: scope });
  const plain = (await service.list(scope)).map((node) => node.path);
  assert.equal(plain.includes(path.join(brain, "AGENTS.md")), false);
  assert.equal(plain.includes(path.join(scope, ".compose", "README.md")), false);
  const composed = (await service.list(scope, { withComposed: true })).map((node) => node.path);
  assert.ok(composed.includes(path.join(brain, "AGENTS.md")));
  assert.equal(composed.includes(path.join(brain, "nested", "AGENTS.md")), false);
  assert.equal(composed.includes(path.join(scope, ".compose", "README.md")), false);

  const missing = path.join(root, "missing-repo");
  const node = (await service.get(path.join(scope, "AGENTS.md"), AgentsNode))!;
  node.composeNode().addChild({
    name: "later",
    directory: missing,
    remote: "https://github.com/example/later.git",
  });
  await service.update(node, {});
  const saved = (await service.get(path.join(scope, "AGENTS.md"), AgentsNode))!;
  assert.equal(saved.composeNode().entries().some((entry) => entry.name === "later"), true);
  assert.equal(saved.composeNode().checkout("later").directory, missing);
});
