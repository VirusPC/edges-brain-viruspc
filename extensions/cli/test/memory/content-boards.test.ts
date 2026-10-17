import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { run } from "../../src/program.js";
import { loadHarnessMaterialsConfig } from "../../src/domain/config/harness-materials.js";

test("harness materials include projects and notes", () => {
  const ids = loadHarnessMaterialsConfig().materials.map((material) => material.id);
  assert.ok(ids.includes("projects"));
  assert.ok(ids.includes("notes"));
  const projects = loadHarnessMaterialsConfig().materials.find((material) => material.id === "projects");
  const notes = loadHarnessMaterialsConfig().materials.find((material) => material.id === "notes");
  assert.equal(projects?.path, "projects/README.md");
  assert.equal(notes?.path, "notes/README.md");
});

test("memory init recommends projects and notes and does not write their harness indexes", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "edges-content-boards-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const recommended = await run(["--scope", root, "memory", "init"], { env: {} });
  assert.equal(recommended.exitCode, 0, recommended.stdout);
  const body = JSON.parse(recommended.stdout) as { selectionRequired: boolean; recommendations: { modules: string[] } };
  assert.equal(body.selectionRequired, true);
  assert.ok(body.recommendations.modules.includes("projects"));
  assert.ok(body.recommendations.modules.includes("notes"));

  const init = await run(["--scope", root, "memory", "init", "--memory-types", "project"], { env: {} });
  assert.equal(init.exitCode, 0, init.stdout);
  for (const rel of [".harness/projects/README.md", ".harness/notes/README.md"]) {
    assert.equal(existsSync(path.join(root, rel)), false, rel);
  }
  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /\.harness\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/memory\/projects\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/projects\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/notes\/README\.md/);
  assert.match(await readFile(path.join(root, ".harness/README.md"), "utf8"), /memory\/projects\/README\.md/);
});
