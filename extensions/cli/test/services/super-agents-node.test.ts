import assert from "node:assert/strict";
import { test } from "node:test";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NodeService } from "../../src/services/node/node-service.js";
import { AgentsNode } from "../../src/domain/models/index.js";
import { SuperAgentsNode } from "../../src/domain/models/super-agents/super-agents-node.js";

function fixture(withAgents = false) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), "edges-super-")));
  fs.mkdirSync(path.join(root, ".git"));
  fs.mkdirSync(path.join(root, "tasks"));
  fs.writeFileSync(path.join(root, "tasks", "AGENTS.md"), "# Tasks\n");
  fs.writeFileSync(
    path.join(root, "README.md"),
    "# Edges\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n- [领域任务](tasks/AGENTS.md) — 看板。\n<!-- project-entries-local:end -->\n",
  );
  if (withAgents) fs.writeFileSync(path.join(root, "AGENTS.md"), "# Root\n");
  return root;
}
const snapshot = (dir: string) =>
  fs.readdirSync(dir, { recursive: true }).map(String).sort();

test("scope without AGENTS fails without --super", async () => {
  const root = fixture();
  const service = new NodeService({ managedRoot: root });
  await assert.rejects(
    () => service.list(root),
    /--super/,
  );
});

test("with --super roots at SuperAgentsNode over root README", async () => {
  const root = fixture();
  const before = snapshot(root);
  const service = new NodeService({ managedRoot: root });
  const nodes = await service.list(root, { super: true });
  assert.ok(nodes[0] instanceof SuperAgentsNode);
  assert.ok(nodes[0] instanceof AgentsNode);
  assert.deepEqual(
    nodes[0]!.children.map((child) => child.id),
    [path.join(root, "README.md")],
  );
  const paths = nodes.map((node) => node.path);
  assert.ok(paths.includes(path.join(root, "README.md")));
  assert.ok(paths.includes(path.join(root, "tasks", "AGENTS.md")));
  assert.deepEqual(snapshot(root), before);
  assert.equal(fs.existsSync(nodes[0]!.path), false);
});

test("a real AGENTS stays the default entry; --super still builds the super node", async () => {
  const root = fixture(true);
  const service = new NodeService({ managedRoot: root });
  const plain = await service.list(root);
  assert.ok(!plain.some((node) => node instanceof SuperAgentsNode));
  assert.equal(plain[0]!.path, path.join(root, "AGENTS.md"));
  const superNodes = await service.list(root, { super: true });
  assert.ok(superNodes[0] instanceof SuperAgentsNode);
});

test("--super with no materials mounts empty SuperAgentsNode", async () => {
  const root = fixture();
  fs.rmSync(path.join(root, "README.md"));
  const service = new NodeService({ managedRoot: root });
  const nodes = await service.list(root, { super: true });
  assert.ok(nodes[0] instanceof SuperAgentsNode);
  assert.deepEqual(nodes[0]!.children, []);
});

test("--super prefers .harness/README.md and does not flat-mount other materials", async (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()), "super-idx-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".harness/tasks"), { recursive: true });
  fs.mkdirSync(path.join(root, "tasks"), { recursive: true });
  fs.writeFileSync(path.join(root, "tasks/README.md"), "# Content tasks\n");
  fs.writeFileSync(path.join(root, ".harness/tasks/README.md"), "# Maintenance tasks\n");
  fs.writeFileSync(
    path.join(root, "README.md"),
    "# Public\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n- [Notes](notes/README.md)\n<!-- project-entries-local:end -->\n",
  );
  fs.writeFileSync(
    path.join(root, ".harness/README.md"),
    "# 本层 harness 材料索引\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n- [Tasks](tasks/README.md)\n<!-- project-entries-local:end -->\n",
  );
  const service = new NodeService({ managedRoot: root });
  const nodes = await service.list(root, { super: true });
  assert.deepEqual(nodes[0]!.children.map((child) => child.id), [
    path.join(root, ".harness/README.md"),
  ]);
  const rel = nodes.map((node) => path.relative(root, node.path));
  assert.ok(rel.includes(path.join(".harness", "tasks", "README.md")));
  assert.ok(!rel.includes(path.join("tasks", "README.md")));
  assert.ok(!rel.includes("README.md"));
});

test("--super falls back to flat harness-materials mounts when no index README exists", async (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()), "super-flat-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "tasks"), { recursive: true });
  fs.mkdirSync(path.join(root, "notes"), { recursive: true });
  fs.writeFileSync(path.join(root, "tasks/README.md"), "# Tasks\n");
  fs.writeFileSync(path.join(root, "notes/README.md"), "# Notes\n");
  const service = new NodeService({ managedRoot: root });
  const nodes = await service.list(root, { super: true });
  assert.deepEqual(
    nodes[0]!.children.map((child) => path.relative(root, child.id)),
    [path.join("tasks", "README.md"), path.join("notes", "README.md")],
  );
});

test("super treats the scope directory as its harness and does not mount the scope's own .harness", async (t) => {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()), "super-m-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".harness/tasks"), { recursive: true });
  fs.mkdirSync(path.join(root, "tasks"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Scope\n");
  fs.writeFileSync(path.join(root, ".harness/tasks/README.md"), "# Maintenance\n");
  fs.writeFileSync(path.join(root, "tasks/README.md"), "# Content\n");
  const service = new NodeService({ managedRoot: root });
  const nodes = await service.list(root, { super: true });
  const rel = nodes.map((n) => path.relative(root, n.path));
  assert.ok(rel.includes(path.join("tasks", "README.md")));
  assert.ok(!rel.includes(path.join(".harness", "tasks", "README.md")));
  assert.ok(!rel.includes("AGENTS.md"));
});
