import assert from "node:assert/strict";
import { test } from "node:test";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NodeService } from "../../src/services/node/node-service.js";
import { BaseNode, AgentsNode, ReadmeNode } from "../../src/domain/models/index.js";
import { traverse } from "../../src/domain/operations/traverse.js";
import type { NodeQueryOptions } from "../../src/domain/operations/traverse.js";

const refs = (nodes: BaseNode[]) => nodes.map((n) => ({ id: n.id }));
const agents = (dir: string, local: BaseNode[] = [], descendants: BaseNode[] = []) =>
  new AgentsNode(`/r/${dir}/AGENTS.md`).create(
    { localChildren: refs(local), descendantChildren: refs(descendants) },
    { operation: "create" },
  );
const readme = (dir: string, local: BaseNode[] = [], descendants: BaseNode[] = []) =>
  new ReadmeNode(`/r/${dir}/README.md`).create(
    { localChildren: refs(local), descendantChildren: refs(descendants) },
    { operation: "create" },
  );

function graph(nodes: BaseNode[]) {
  const entries = new Map(nodes.map((n) => [n.id, n]));
  const run = async (roots: BaseNode, options: NodeQueryOptions = {}) => {
    const paths: string[] = [];
    for await (const n of traverse(
      roots,
      options,
      (_p, ref) => (entries.has(ref.id) ? ref.id : undefined),
      async (_p, _r, id) => entries.get(id)!,
    ))
      paths.push(n.path);
    return paths;
  };
  return { run };
}

test("traverse defaults to all children", async () => {
  const mem = agents("scope/.harness/memory/projects");
  const nestedAgents = agents("scope/nested");
  const root = agents("scope", [mem], [nestedAgents]);
  const { run } = graph([root, mem, nestedAgents]);
  const paths = await run(root);
  assert.ok(paths.includes(nestedAgents.path));
  assert.ok(paths.includes(mem.path));
});

test("localOnly skips descendant group", async () => {
  const mem = agents("scope/.harness/memory/projects");
  const nestedAgents = agents("scope/nested");
  const root = agents("scope", [mem], [nestedAgents]);
  const { run } = graph([root, mem, nestedAgents]);
  const paths = await run(root, { localOnly: true });
  assert.ok(paths.includes(mem.path));
  assert.ok(!paths.includes(nestedAgents.path));
});

test("README local/descendants honour localOnly", async () => {
  const tasksReadme = readme("scope/tasks");
  const lowerReadme = readme("scope/lower");
  const scopeReadme = readme("scope", [tasksReadme], [lowerReadme]);
  const { run } = graph([scopeReadme, tasksReadme, lowerReadme]);
  assert.deepEqual(await run(scopeReadme, { localOnly: true }), [scopeReadme.path, tasksReadme.path]);
});

test("real AGENTS traverse does not reach same-dir README content face", async () => {
  const mem = agents("scope/.harness/memory/projects");
  const tasksReadme = readme("scope/tasks");
  const lowerReadme = readme("scope/lower");
  const scopeAgents = agents("scope", [mem]);
  const scopeReadme = readme("scope", [tasksReadme], [lowerReadme]);
  const { run } = graph([scopeAgents, scopeReadme, mem, tasksReadme, lowerReadme]);

  const paths = await run(scopeAgents);
  assert.deepEqual(paths, [scopeAgents.path, mem.path]);
  assert.ok(!paths.includes(scopeReadme.path));
  assert.ok(!paths.includes(tasksReadme.path));
});

const scopeAgentsMd = `# Scope

<!-- project-harness-constraints:start -->
## 本层硬约束

Keep constraints.
<!-- project-harness-constraints:end -->
<!-- project-harness-local:start -->
## 本层系统维护信息

<!-- project-harness-local:end -->
<!-- project-harness-descendants:start -->
## 下层系统维护信息

<!-- project-harness-descendants:end -->
`;

test("NodeService list from AGENTS is system-two only; --super reaches content face", async (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()), "dual-entry-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  };
  write("AGENTS.md", scopeAgentsMd);
  write(
    "README.md",
    `# Root\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n- [Tasks](tasks/README.md)\n<!-- project-entries-local:end -->\n\n<!-- project-entries-descendants:start -->\n## 下层内容\n\n- [Lower](lower/README.md)\n<!-- project-entries-descendants:end -->\n`,
  );
  write("tasks/README.md", "# Tasks\n");
  write("lower/README.md", "# Lower\n");
  const service = new NodeService({ managedRoot: root });
  const rel = (nodes: BaseNode[]) => nodes.map((n) => path.relative(root, n.path));
  assert.deepEqual(rel(await service.list(root)), ["AGENTS.md"]);
  const superList = await service.list(root, { super: true });
  assert.equal(path.basename(path.dirname(superList[0]!.path)), ".super");
  // No .harness/README.md, so super flat-mounts materials (tasks before readme)
  // and then expands README children (lower), with seen-path dedupe.
  assert.deepEqual(
    superList.slice(1).map((n) => path.relative(root, n.path)),
    ["tasks/README.md", "README.md", "lower/README.md"],
  );
});

test("harness discovery from AGENTS does not walk content face", async (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()), "dual-entry-harness-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  };
  write("AGENTS.md", scopeAgentsMd);
  write("README.md", "# Root\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n- [Notes](notes/README.md)\n<!-- project-entries-local:end -->\n");
  write("notes/AGENTS.md", scopeAgentsMd);
  write("notes/README.md", "# Notes\n");
  const rel = (nodes: BaseNode[]) => nodes.map((n) => path.relative(root, n.path));
  const nodes = await new NodeService({ managedRoot: root }).query(root, { includeHarness: true }).toArray().value();
  assert.deepEqual(rel(nodes), ["AGENTS.md"]);
});

test("harness discovery skips symlinked mirrors of entries reachable by their real path", async (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()), "dual-entry-symlink-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  };
  write("AGENTS.md", scopeAgentsMd.replace("## 本层系统维护信息\n", "## 本层系统维护信息\n\n- [Skills](.harness/skills/referenced/README.md)\n"));
  write("skills/real/SKILL.md", "---\nname: real\ndescription: Real skill.\n---\n\nBody\n");
  fs.mkdirSync(path.join(root, ".agents/skills"), { recursive: true });
  fs.symlinkSync("../../skills/real", path.join(root, ".agents/skills/real"));
  write(".harness/skills/referenced/README.md", "<!-- project-memory-type:start -->\nname: referenced\nmodule: skills\nwritable: false\n<!-- project-memory-type:end -->\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n- [real](../../../.agents/skills/real/SKILL.md) — Real skill.\n<!-- project-entries-local:end -->\n");
  const nodes = await new NodeService({ managedRoot: root }).query(root, { includeHarness: true }).toArray().value();
  assert.deepEqual(nodes.map((n) => path.relative(root, n.path)), ["AGENTS.md", ".harness/skills/referenced/README.md"]);
});
