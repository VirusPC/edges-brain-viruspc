import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addMemoryType,
  initMemory,
  rememberMemory,
} from "../../src/services/memory/index.js";
import { initSkills } from "../../src/services/init/service.js";
import {
  typeIndexRelpath,
  AGENTS_FILE_NAME,
} from "../../src/services/memory/paths.js";
import { layerTypeSpecs } from "../../src/services/memory/types.js";
import { memoryNodes } from "../../src/services/memory/service.js";

function fixture(t: any) {
  const dir = mkdtempSync(join(realpathSync(tmpdir()), "type-index-readme-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const read = (dir: string, file: string) =>
  readFileSync(join(dir, file), "utf8");

test("type index path is README.md", () => {
  assert.equal(
    typeIndexRelpath("project"),
    ".harness/memory/projects/README.md",
  );
  assert.equal(
    typeIndexRelpath("managed"),
    ".harness/skills/managed/README.md",
  );
});

test("init creates system entry AGENTS.md only at scope root, not organization README.md", async (t) => {
  const dir = fixture(t);
  await initMemory({
    targetDir: dir,
    memoryTypes: ["project"],
  });
  assert.equal(existsSync(join(dir, "README.md")), false);
  assert.match(read(dir, AGENTS_FILE_NAME), /## 本层系统维护信息/);
  assert.match(read(dir, AGENTS_FILE_NAME), /project-harness-local:start/);
});

test("init writes README type indexes with project-entries markers", async (t) => {
  const dir = fixture(t);
  await initMemory({
    targetDir: dir,
    memoryTypes: ["project"],
  });
  await initSkills({
    targetDir: dir,
    skillTypes: ["managed"],
  });
  for (const rel of [
    ".harness/memory/projects/README.md",
    ".harness/skills/managed/README.md",
  ]) {
    const text = read(dir, rel);
    assert.match(text, /<!-- project-entries-local:start -->\n## 本层内容/);
    assert.doesNotMatch(text, /project-memory-entries/);
  }
  assert.equal(existsSync(join(dir, ".harness/memory/projects/AGENTS.md")), false);
  assert.match(read(dir, AGENTS_FILE_NAME), /\]\(\.harness\/README\.md\)/);
  assert.match(read(dir, ".harness/README.md"), /memory\/projects\/README\.md/);
  assert.doesNotMatch(read(dir, AGENTS_FILE_NAME), /memory\/projects\/README\.md/);
  assert.deepEqual(
    layerTypeSpecs(dir).map((s) => [s.name, s.indexFile]),
    [
      ["project", ".harness/memory/projects/README.md"],
      ["managed", ".harness/skills/managed/README.md"],
    ],
  );
});

test("remember lists the entry in README project-entries-local and registers it once", async (t) => {
  const dir = fixture(t);
  await initMemory({ targetDir: dir, memoryTypes: ["project"] });
  const result = await rememberMemory({
    targetDir: dir,
    type: "project",
    slug: "decision",
    title: "Decision",
    description: "When deciding",
    content: "Body",
  });
  assert.equal(result.index, ".harness/memory/projects/README.md");
  const text = read(dir, ".harness/memory/projects/README.md");
  assert.match(text, /<!-- project-entries-local:start -->\n## 本层内容/);
  assert.equal(
    text.match(/\]\(<?project_decision\/INDEX\.md>?\)/g)?.length,
    1,
  );
  assert.doesNotMatch(text, /project-memory-entries/);
  assert.doesNotMatch(text, /暂无条目/);
  const again = await rememberMemory({
    targetDir: dir,
    type: "project",
    slug: "decision",
    title: "Decision",
    description: "When deciding",
    content: "Body 2",
  });
  assert.equal(again.action, "updated");
  assert.equal(
    read(dir, ".harness/memory/projects/README.md").match(/project_decision/g)
      ?.length,
    1,
  );
});

test("add-type creates a README index and links it from layer AGENTS", async (t) => {
  const dir = fixture(t);
  await initMemory({ targetDir: dir, memoryTypes: ["project"] });
  const result = await addMemoryType({
    targetDir: dir,
    name: "docs",
    description: "Docs notes",
  });
  assert.equal(result.index, ".harness/memory/docs/README.md");
  const text = read(dir, ".harness/memory/docs/README.md");
  assert.match(text, /<!-- project-memory-type:start -->\nname: docs/);
  assert.match(text, /<!-- project-entries-local:start -->/);
  assert.match(read(dir, AGENTS_FILE_NAME), /\]\(\.harness\/README\.md\)/);
  assert.match(read(dir, ".harness/README.md"), /memory\/docs\/README\.md/);
  assert.doesNotMatch(
    read(dir, AGENTS_FILE_NAME),
    /\]\(<?\.harness\/memory\/docs\/README\.md>?\)/,
  );
});

test("a missing type index is created as README.md for memory and skills", async (t) => {
  const dir = fixture(t);
  await initMemory({
    targetDir: dir,
    memoryTypes: ["project"],
  });
  await initSkills({
    targetDir: dir,
    skillTypes: ["managed"],
  });
  const projects = join(dir, ".harness/memory/projects");
  const managed = join(dir, ".harness/skills/managed");
  rmSync(join(projects, "README.md"));
  rmSync(join(managed, "README.md"));
  const { refreshIndex } = await import("../../src/services/memory/entries.js");
  await refreshIndex(dir, "project");
  await refreshIndex(dir, "managed");
  assert.equal(existsSync(join(projects, "README.md")), true);
  assert.equal(existsSync(join(projects, "AGENTS.md")), false);
  assert.equal(existsSync(join(managed, "README.md")), true);
  assert.equal(existsSync(join(managed, "AGENTS.md")), false);
  assert.match(read(dir, ".harness/memory/projects/README.md"), /project-entries-local/);
  assert.match(read(dir, ".harness/skills/managed/README.md"), /project-entries-local/);
});

test("legacy AGENTS.md type index still discovers and loads until migrated", async (t) => {
  const dir = fixture(t);
  await initMemory({ targetDir: dir, memoryTypes: ["project"] });
  const base = join(dir, ".harness/memory/projects");
  const legacy = `<!-- project-memory-type:start -->
name: project
module: memory
writable: true
gitignore: false
format: ordinary
<!-- project-memory-type:end -->

# PROJECT

<!-- project-memory-entries:start -->
- 暂无条目。
<!-- project-memory-entries:end -->
`;
  rmSync(join(base, "README.md"));
  writeFileSync(join(base, "AGENTS.md"), legacy);
  writeFileSync(
    join(dir, ".harness/README.md"),
    read(dir, ".harness/README.md").replaceAll(
      "memory/projects/README.md",
      "memory/projects/AGENTS.md",
    ),
  );
  assert.deepEqual(
    layerTypeSpecs(dir).map((s) => [s.name, s.indexFile]),
    [["project", ".harness/memory/projects/AGENTS.md"]],
  );
  const node = await memoryNodes(dir).get(join(base, "AGENTS.md"));
  assert.ok(node);
  const result = await rememberMemory({
    targetDir: dir,
    type: "project",
    slug: "legacy_ok",
    title: "Legacy",
    description: "Still works",
    content: "Body",
  });
  assert.equal(result.index, ".harness/memory/projects/AGENTS.md");
  assert.match(read(dir, ".harness/memory/projects/AGENTS.md"), /project_legacy_ok/);
});

test("layer AGENTS owns README type indexes under .harness but not ordinary README links", async () => {
  const { AgentsNode } = await import(
    "../../src/domain/models/agents/agents-node.js"
  );
  const node = new AgentsNode("/repo/AGENTS.md").parse(
    [
      "<!-- project-harness-local:start -->",
      "## 本层系统维护信息",
      "",
      "- [projects](.harness/memory/projects/README.md) — type",
      "- [guide](docs/README.md) — navigation",
      "<!-- project-harness-local:end -->",
      "",
    ].join("\n"),
  );
  assert.deepEqual(
    node.localChildren.map((ref) => ref.id),
    ["/repo/.harness/memory/projects/README.md"],
  );
});
