import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AgentsNode } from "../../src/domain/models/index.js";
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
  assert.deepEqual(node.composeEntries.map((entry) => ({
    name: entry.name,
    directory: entry.directory,
    description: entry.description,
    remote: entry.remote,
  })), [{
    name: "brain",
    directory: "/brain",
    description: "个人大脑",
    remote: "https://github.com/example/brain.git",
  }]);
  assert.deepEqual(node.composeChildren, [{
    id: "/brain/AGENTS.md",
    name: "brain",
    description: "个人大脑",
  }]);
  assert.equal(node.children.some((child) => child.id === "/brain/AGENTS.md"), false);
  assert.equal(node.serialize(), node.parse(node.serialize()).serialize());
});

test("registerCompose writes the block and keeps existing sections", () => {
  const file = "/repo/AGENTS.md";
  const node = new AgentsNode(file).parse(agents(`
<!-- project-harness-local:start -->
## 本层系统维护信息

- [tasks](<.harness/tasks/README.md>) — 维护任务
<!-- project-harness-local:end -->
`));
  node.registerCompose({
    name: "team",
    directory: "/repos/team",
    href: "../repos/team",
    description: "团队库",
    remote: "git@github.com:example/team.git",
  });
  const source = node.serialize();
  assert.match(source, /project-harness-compose:start/);
  assert.match(source, /\[team\]\(<\.\.\/repos\/team>\) — 团队库 remote: git@github\.com:example\/team\.git/);
  assert.match(source, /\[tasks\]\(<\.harness\/tasks\/README\.md>\)/);
  const again = new AgentsNode(file).parse(source);
  assert.equal(again.composeEntries[0]?.name, "team");
  assert.equal(again.localChildren[0]?.name, "tasks");
  again.unregisterCompose("team");
  const cleared = again.serialize();
  assert.doesNotMatch(cleared, /\[team\]/);
  assert.match(cleared, /\[tasks\]\(<\.harness\/tasks\/README\.md>\)/);
  assert.equal(new AgentsNode(file).parse(cleared).composeEntries.length, 0);
  assert.throws(
    () => again.unregisterCompose("team"),
    /compose entry not found: team/,
  );
});

test("traverse follows compose edges into another repository, including localOnly", async () => {
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
  const load = async (_parent: AgentsNode, _ref: { id: string }, id: string) => entries.get(id)!;
  const resolve = (_parent: AgentsNode, ref: { id: string }) => entries.has(ref.id) ? ref.id : undefined;
  const full: string[] = [];
  for await (const node of traverse(root, {}, resolve, load)) full.push(node.path);
  const local: string[] = [];
  for await (const node of traverse(root, { localOnly: true }, resolve, load)) local.push(node.path);
  assert.deepEqual(full, ["/repo/AGENTS.md", "/brain/AGENTS.md", "/brain/nested/AGENTS.md"]);
  assert.deepEqual(local, ["/repo/AGENTS.md", "/brain/AGENTS.md"]);
});

test("NodeService list crosses a compose edge and can save the block before clone", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "compose-node-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scope = path.join(root, "scope");
  const brain = path.join(root, "brain");
  mkdirSync(path.join(brain, "nested"), { recursive: true });
  mkdirSync(scope, { recursive: true });
  const scopeAgents = agents(`
<!-- project-harness-compose:start -->
## 组合

- [brain](<${brain}>) — 个人大脑 remote: https://github.com/example/brain.git
<!-- project-harness-compose:end -->
`);
  writeFileSync(path.join(scope, "AGENTS.md"), scopeAgents);
  writeFileSync(path.join(brain, "AGENTS.md"), agents(`
<!-- project-harness-descendants:start -->
## 下层系统维护信息

- [nested](<nested/AGENTS.md>) — nested
<!-- project-harness-descendants:end -->
`));
  writeFileSync(path.join(brain, "nested", "AGENTS.md"), agents(""));
  const service = new NodeService({ managedRoot: scope });
  const listed = (await service.list(scope)).map((node) => node.path);
  assert.ok(listed.includes(path.join(brain, "AGENTS.md")));
  assert.ok(listed.includes(path.join(brain, "nested", "AGENTS.md")));

  const missing = path.join(root, "missing-repo");
  const node = (await service.get(path.join(scope, "AGENTS.md"), AgentsNode))!;
  node.registerCompose({
    name: "later",
    directory: missing,
    href: path.relative(scope, missing),
    remote: "https://github.com/example/later.git",
  });
  await service.update(node, {});
  const saved = (await service.get(path.join(scope, "AGENTS.md"), AgentsNode))!;
  assert.equal(saved.composeEntries.some((entry) => entry.name === "later"), true);
});
