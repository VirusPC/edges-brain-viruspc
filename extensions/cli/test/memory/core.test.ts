import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initMemory,
  rememberMemory,
  addMemoryType,
  doctorMemory,
} from "../../src/services/memory/index.js";
import { initSkills } from "../../src/services/init/service.js";
import { layerTypeSpecs } from "../../src/services/memory/types.js";
import { parseFrontmatter } from "../../src/services/memory/entries.js";
function fixture(t: any) {
  const dir = mkdtempSync(join(tmpdir(), "memory-core-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const read = (dir: string, file: string) =>
  readFileSync(join(dir, file), "utf8");
const put = (dir: string, file: string, body: string | Buffer) => {
  const path = join(dir, file);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, body);
};
const projectIndex = ".harness/memory/projects/README.md";
test("init requires selection without mutation and reruns preserve selected adoption", async (t) => {
  const targetDir = fixture(t);
  assert.equal((await initMemory({ targetDir })).selectionRequired, true);
  assert.deepEqual(readdirSync(targetDir), []);
  await initMemory({ targetDir, memoryTypes: ["project"] });
  assert.deepEqual(
    layerTypeSpecs(targetDir).map((s) => s.name),
    ["project"],
  );
  const before = read(targetDir, "AGENTS.md");
  await initMemory({ targetDir });
  assert.equal(read(targetDir, "AGENTS.md"), before);
  assert.equal(existsSync(join(targetDir, ".harness/memory/users")), false);
});
test("remember refreshes index and preserves YAML metadata and origin on update", async (t) => {
  const targetDir = fixture(t);
  await initMemory({ targetDir, memoryTypes: ["project"] });
  await rememberMemory({
    targetDir,
    type: "project",
    slug: "decision",
    title: "Decision",
    description: "When deciding",
    content: "Original",
    originSessionId: "first",
  });
  const path = ".harness/memory/projects/project_decision/INDEX.md";
  put(
    targetDir,
    path,
    read(targetDir, path).replace(
      "metadata:",
      "license: MIT\nmetadata:\n  vendor: {nested: [one, two]}",
    ),
  );
  await rememberMemory({
    targetDir,
    type: "project",
    slug: "decision",
    content: "Changed",
  });
  assert.match(read(targetDir, path), /vendor:/);
  assert.match(read(targetDir, path), /edges-origin-session-id: first/);
  assert.match(read(targetDir, path), /license: MIT/);
  assert.match(
    read(targetDir, projectIndex),
    /\[Decision\]\(<project_decision\/INDEX.md>\) — When deciding/,
  );
  assert.equal((await doctorMemory({ targetDir })).remaining.length, 0);
});
test("managed uses skill format and referenced remains read only with missing source diagnostics", async (t) => {
  const targetDir = fixture(t);
  const result = await initSkills({
    targetDir,
    skillTypes: ["managed", "referenced"],
  });
  assert.equal(result.complete, false);
  assert.equal(result.diagnostics?.[0]?.code, "source-scan-error");
  await rememberMemory({
    targetDir,
    type: "managed",
    slug: "my-method",
    description: "Run it",
    content: "Steps",
  });
  assert.equal(
    parseFrontmatter(
      join(targetDir, ".harness/skills/managed/my-method/SKILL.md"),
    ).name,
    "my-method",
  );
  await assert.rejects(
    async () =>
      await rememberMemory({
        targetDir,
        type: "referenced",
        slug: "no",
        content: "no",
      }),
    /只索引/,
  );
  assert.equal(existsSync(join(targetDir, ".agents")), false);
});
test("private custom privileges are preserved, ignored before writing, and cannot be inferred when lost", async (t) => {
  const targetDir = fixture(t);
  execFileSync("git", ["init", "-q", targetDir]);
  await initMemory({ targetDir, memoryTypes: ["project"] });
  await addMemoryType({
    targetDir,
    name: "recipes",
    description: "Private methods",
    gitignore: true,
    skillsFormat: true,
  });
  assert.match(
    read(targetDir, ".gitignore"),
    /\*\*\/\.harness\/memory\/recipes\//,
  );
  await addMemoryType({ targetDir, name: "recipes", description: "Retry" });
  await rememberMemory({
    targetDir,
    type: "recipes",
    slug: "my-recipe",
    description: "recipe",
    content: "Steps",
  });
  assert.equal(
    layerTypeSpecs(targetDir).find((s) => s.name === "recipes")?.gitignore,
    true,
  );
  const index = ".harness/memory/recipes/README.md";
  put(targetDir, index, read(targetDir, index).replace("writable: true\n", ""));
  await assert.rejects(
    async () => await initMemory({ targetDir }),
    /privilege/,
  );
  assert.ok(
    (await doctorMemory({ targetDir, apply: true })).remaining.some(
      (f) => f.code === "unsafe-layout",
    ),
  );
});
test("doctor diagnoses without writes and apply repairs foreign agents and stale indexes idempotently", async (t) => {
  const targetDir = fixture(t);
  await initMemory({ targetDir, memoryTypes: ["project"] });
  put(targetDir, "AGENTS.md", "# Manual\nKeep this.\n");
  put(
    targetDir,
    ".harness/memory/projects/project_a/INDEX.md",
    "---\nname: a\ndescription: test\n---\nBody\n",
  );
  const before = read(targetDir, projectIndex);
  const report = await doctorMemory({ targetDir });
  assert.ok(report.findings.length);
  assert.equal(read(targetDir, projectIndex), before);
  assert.equal(
    (await doctorMemory({ targetDir, apply: true })).remaining.length,
    0,
  );
  assert.match(read(targetDir, "AGENTS.md"), /^# Manual\nKeep this/);
  assert.deepEqual(
    (await doctorMemory({ targetDir, apply: true })).repaired,
    [],
  );
});
test("source read errors preserve existing indexes and invalid frontmatter remains diagnosed", async (t) => {
  const targetDir = fixture(t);
  await initMemory({ targetDir, memoryTypes: ["project"] });
  const before = read(targetDir, projectIndex);
  put(
    targetDir,
    ".harness/memory/projects/project_bad/INDEX.md",
    Buffer.from([0xff]),
  );
  assert.equal((await initMemory({ targetDir })).complete, false);
  assert.equal(read(targetDir, projectIndex), before);
  assert.ok(
    (await doctorMemory({ targetDir, apply: true })).remaining.some(
      (f) => f.code === "source-scan-error",
    ),
  );
  put(
    targetDir,
    ".harness/memory/projects/project_bad/INDEX.md",
    "---\ndescription: unclosed\n",
  );
  assert.ok(
    (await doctorMemory({ targetDir, apply: true })).remaining.some(
      (f) => f.code === "invalid-entry",
    ),
  );
});
test("managed symlink escapes are rejected and referenced links deduplicate by realpath", async (t) => {
  const targetDir = fixture(t);
  const external = fixture(t);
  await initMemory({
    targetDir,
    memoryTypes: ["project"],
  });
  await initSkills({
    targetDir,
    skillTypes: ["referenced"],
  });
  symlinkSync(external, join(targetDir, ".harness/memory/projects/escape"));
  await assert.rejects(
    async () =>
      await rememberMemory({
        targetDir,
        type: "project",
        slug: "escape/no",
        title: "x",
        description: "x",
        content: "x",
      }),
  );
  put(
    external,
    "SKILL.md",
    "---\nname: ext\ndescription: external\n---\nSteps",
  );
  mkdirSync(join(targetDir, ".agents/skills"), { recursive: true });
  symlinkSync(external, join(targetDir, ".agents/skills/a"));
  symlinkSync(external, join(targetDir, ".agents/skills/b"));
  const initialized = await initSkills({ targetDir });
  assert.equal(initialized.complete, true, JSON.stringify(initialized));
  assert.equal(
    read(targetDir, ".harness/skills/referenced/README.md").split(" — external")
      .length - 1,
    1,
  );
});
test("explicit registered descendants survive intermediate adoption and nested Git roots are excluded", async (t) => {
  const targetDir = fixture(t);
  mkdirSync(join(targetDir, ".git"));
  put(targetDir, "AGENTS.md", "# Existing owner\n");
  const child = join(targetDir, "a/b");
  mkdirSync(child, { recursive: true });
  await initMemory({
    targetDir: child,
    rootDir: targetDir,
    memoryTypes: ["project"],
    description: "Child",
  });
  assert.match(read(targetDir, "AGENTS.md"), /a\/b\/AGENTS.md/);
  await initMemory({
    targetDir: join(targetDir, "a"),
    rootDir: targetDir,
    memoryTypes: ["feedback"],
  });
  assert.match(read(targetDir, "AGENTS.md"), /a\/b\/AGENTS.md/);
  assert.doesNotMatch(read(targetDir, "a/AGENTS.md"), /b\/AGENTS.md/);
  const nested = join(targetDir, "nested");
  mkdirSync(join(nested, ".git"), { recursive: true });
  await initMemory({ targetDir: nested, memoryTypes: ["project"] });
  await assert.rejects(
    async () =>
      await initMemory({
        targetDir: nested,
        rootDir: targetDir,
        memoryTypes: ["project"],
      }),
    /Git root/,
  );
  assert.equal(
    (await doctorMemory({ targetDir, apply: true })).memoryDirs.includes(
      "nested",
    ),
    false,
  );
});

test('refreshing a memory type preserves a separately authored relation', async t => {
 const targetDir=fixture(t);await initMemory({targetDir,memoryTypes:['project']});
 put(targetDir,'other/AGENTS.md','# Other\n');
 const {ReadmeNode}=await import("../../src/domain/models/readme/readme-node.js");
 const file=join(targetDir,projectIndex), node=new ReadmeNode(file).parse(read(targetDir,projectIndex));
 node.addChild('local',{id:join(targetDir,'other/AGENTS.md'),name:'Other',description:'Authored relation'});
 put(targetDir,projectIndex,node.serialize());
 await rememberMemory({targetDir,type:'project',slug:'example',title:'Example',description:'Memory',content:'Body'});
 const saved=new ReadmeNode(file).parse(read(targetDir,projectIndex));
 assert.ok(saved.localChildren.some(ref=>ref.name==='Other'&&ref.description==='Authored relation'));
});
test('cross-scope init registers the child scope in the descendant section',async t=>{
 const targetDir=fixture(t);put(targetDir,'AGENTS.md','# Owner\n');mkdirSync(join(targetDir,'child'));
 await initMemory({targetDir:join(targetDir,'child'),rootDir:targetDir,memoryTypes:['project']});
 const {AgentsNode}=await import("../../src/domain/models/agents/agents-node.js");
 const owner=new AgentsNode(join(targetDir,'AGENTS.md')).parse(read(targetDir,'AGENTS.md'));
 assert.equal(owner.localChildren.length,0);
 assert.equal(owner.descendantChildren.length,1);
 assert.equal(owner.descendantChildren[0]?.id,join(targetDir,'child/AGENTS.md'));
});
