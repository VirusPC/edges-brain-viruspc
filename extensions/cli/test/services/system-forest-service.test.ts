import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AgentsNode } from "../../src/domain/models/index.js";
import { SuperAgentsNode } from "../../src/domain/models/super-agents/super-agents-node.js";
import { buildSystemForest } from "../../src/services/node/system-forest-service.js";

function writeAgents(
  root: string,
  rel: string,
  localChildren: string[] = [],
) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const created = new AgentsNode(file).create(
    {
      localChildren: localChildren.map((id) => ({
        id: path.resolve(path.dirname(file), id),
      })),
    },
    { operation: "create" },
  );
  let body = created.serialize();
  // Empty composition serializes to ""; still need harness markers for root scan.
  if (!body.includes("project-harness-local:start")) {
    body = `# Scope\n\n<!-- project-harness-local:start -->\n## 本层系统维护信息\n\n<!-- project-harness-local:end -->\n`;
  }
  fs.writeFileSync(file, body);
  return file;
}

function fixture(t: { after(fn: () => void): void }) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()), "forest-svc-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, ".harness/tasks"), { recursive: true });
  fs.mkdirSync(path.join(root, "tasks"), { recursive: true });
  fs.writeFileSync(path.join(root, ".harness/tasks/README.md"), "# Maintenance\n");
  fs.writeFileSync(path.join(root, "tasks/README.md"), "# Content\n");
  const outer = writeAgents(root, "AGENTS.md", ["inner/AGENTS.md"]);
  const inner = writeAgents(root, "inner/AGENTS.md");
  return { root, outer, inner };
}

test("independent forest: both roots; outer tree excludes inner root path", async (t) => {
  const { root, outer, inner } = fixture(t);
  const forest = await buildSystemForest(root, { form: "independent" });
  const rootPaths = forest.map((tree) => tree[0]!.path);
  assert.ok(rootPaths.some((p) => p === outer));
  assert.ok(rootPaths.some((p) => p === inner));
  assert.ok(rootPaths.some((p) => path.basename(path.dirname(p)) === ".super"));

  const outerTree = forest.find((tree) => tree[0]!.path === outer)!;
  assert.ok(!outerTree.some((n) => n.path === inner));
});

test("innermost forest: drops outer when it can reach inner", async (t) => {
  const { root, outer, inner } = fixture(t);
  const forest = await buildSystemForest(root, { form: "innermost" });
  const rootPaths = forest.map((tree) => tree[0]!.path);
  assert.ok(!rootPaths.includes(outer));
  assert.ok(rootPaths.includes(inner));
});

test("Super root mounts materials, not scope AGENTS", async (t) => {
  const { root, outer } = fixture(t);
  const forest = await buildSystemForest(root, { form: "independent" });
  const superTree = forest.find((tree) => tree[0] instanceof SuperAgentsNode)!;
  assert.ok(superTree);
  assert.ok(
    superTree.some((n) => n.path === path.join(root, "tasks/README.md")),
  );
  assert.ok(
    !superTree.some((n) => n.path === path.join(root, ".harness/tasks/README.md")),
  );
  assert.ok(!superTree.slice(1).some((n) => n.path === outer));
});
