import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { run } from "../../src/program.js";
import { initMemory } from "../../src/services/memory/init.js";
import { initSkills } from "../../src/services/init/service.js";
function fixture(t: any) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(tmpdir(), "directory-cli-")),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
function put(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
test("Task directory create/get/update/status/project keep assets and runlog together", async (t) => {
  const root = fixture(t);
  put(path.join(root, "AGENTS.md"), "# Scope");
  const call = (args: string[]) =>
    run(["--scope", root, "tasks", ...args], { env: {} });
  const made = await call(["create", "--title", "Unit"]);
  assert.equal(made.exitCode, 0, made.stdout);
  const item = JSON.parse(made.stdout);
  assert.match(item.path, /\/INDEX.md$/);
  assert.equal(path.dirname(item.sidecarPath), path.dirname(item.path));
  put(path.join(root, path.dirname(item.path), "image.png"), "asset");
  put(path.join(root, path.dirname(item.path), "resource.md"), "not a task");
  const get = await call(["get", item.path]);
  assert.equal(get.exitCode, 0, get.stdout);
  const list = await call(["list"]);
  assert.equal(list.exitCode, 0, list.stdout);
  assert.equal(JSON.parse(list.stdout).tasks.length, 1);
  const moved = await call(["status", item.stem, "done"]);
  assert.equal(moved.exitCode, 0, moved.stdout);
  const done = JSON.parse(moved.stdout);
  assert.equal(
    fs.readFileSync(
      path.join(root, path.dirname(done.path), "image.png"),
      "utf8",
    ),
    "asset",
  );
  assert.equal(fs.existsSync(path.join(root, item.path)), false);
  const changed = await call(["update", item.stem, "--project", "resources"]);
  assert.equal(changed.exitCode, 0, changed.stdout);
  const changedItem = JSON.parse(changed.stdout);
  assert.match(changedItem.path, /resources\/done\/.*\/INDEX.md$/);
  assert.equal(
    fs.existsSync(
      path.join(
        root,
        path.dirname(changedItem.path),
        path.basename(item.sidecarPath),
      ),
    ),
    true,
  );
});
test("Memory directory format indexes only entry, updates by same slug and doctor sees actual entry", async (t) => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ["project"] });
  const source = path.join(root, "selected");
  put(path.join(source, "image.png"), "image");
  put(path.join(source, "details.md"), "resource");
  put(
    path.join(source, "INDEX.md"),
    "---\nname: project_unit\ndescription: Owned\nmetadata:\n  edges-title: Unit\n  edges-type: project\n---\n![image](image.png)",
  );
  const call = (args: string[]) =>
    run(["--scope", root, "memory", ...args], { env: {} });
  const made = await call([
    "remember",
    "--type",
    "project",
    "--slug",
    "unit",
    "--import-entry",
    path.join(source, "INDEX.md"),
  ]);
  assert.equal(made.exitCode, 0, made.stdout);
  const result = JSON.parse(made.stdout);
  assert.match(result.path, /project_unit\/INDEX.md$/);
  assert.equal(
    fs.readFileSync(
      path.join(root, path.dirname(result.path), "image.png"),
      "utf8",
    ),
    "image",
  );
  assert.match(
    fs.readFileSync(path.join(root, result.index), "utf8"),
    /project_unit\/INDEX.md/,
  );
  assert.doesNotMatch(
    fs.readFileSync(path.join(root, result.index), "utf8"),
    /details.md/,
  );
  const updated = await call([
    "remember",
    "--type",
    "project",
    "--slug",
    "unit",
    "--content",
    "Updated",
  ]);
  assert.equal(updated.exitCode, 0, updated.stdout);
  assert.equal(JSON.parse(updated.stdout).path, result.path);
  assert.equal(
    fs.existsSync(path.join(root, ".harness/memory/projects/project_unit.md")),
    false,
  );
  const doctor = await call(["doctor"]);
  assert.equal(doctor.exitCode, 0, doctor.stdout);
});
test("Task directory status refuses same-stem standalone destination and preserves unrelated siblings", async (t) => {
  const root = fixture(t);
  put(path.join(root, "AGENTS.md"), "# Scope");
  const call = (args: string[]) =>
    run(["--scope", root, "--super", "tasks", ...args], { env: {} });
  const result = await call(["create", "--title", "Collision"]);
  assert.equal(result.exitCode, 0, result.stdout);
  const item = JSON.parse(result.stdout);
  const collision = path.join(root, "tasks/_default/done", item.stem + ".md");
  put(collision, "# Independent");
  put(path.join(root, "tasks/_default/backlog/sibling.md"), "# Sibling");
  const move = await call(["status", item.path, "done"]);
  assert.notEqual(move.exitCode, 0);
  assert.equal(fs.existsSync(path.join(root, item.path)), true);
  assert.equal(fs.readFileSync(collision, "utf8"), "# Independent");
  assert.equal(
    fs.readFileSync(
      path.join(root, "tasks/_default/backlog/sibling.md"),
      "utf8",
    ),
    "# Sibling",
  );
});
test("private Memory directory entries stay ignored", async (t) => {
  const { execFileSync } = await import("node:child_process");
  const root = fixture(t);
  execFileSync("git", ["init", "-q"], { cwd: root });
  await initMemory({ targetDir: root, memoryTypes: ["user"] });
  const made = await run(
    [
      "--scope",
      root,
      "memory",
      "remember",
      "--type",
      "user",
      "--slug",
      "private",
      "--title",
      "Private",
      "--description",
      "Synthetic",
      "--content",
      "Synthetic private body",
    ],
    { env: {} },
  );
  assert.equal(made.exitCode, 0, made.stdout);
  const entry = path.join(root, JSON.parse(made.stdout).path);
  execFileSync("git", ["check-ignore", "-q", "--", entry], { cwd: root });
});
test("Skill type enumeration ignores resource recovery directories", async (t) => {
  const root = fixture(t);
  await initSkills({ targetDir: root, skillTypes: ["managed"] });
  put(
    path.join(root, ".harness/skills/managed/kept/SKILL.md"),
    "---\nname: kept\ndescription: Kept\n---\nBody",
  );
  put(
    path.join(root, ".harness/skills/managed/.node-recovery-example/SKILL.md"),
    "---\nname: recovered\ndescription: Recovery only\n---\nBody",
  );
  const { buildEntryIndex } =
    await import("../../src/services/memory/entries.js");
  const index = buildEntryIndex(root, "managed");
  assert.match(index, /kept\/SKILL.md/);
  assert.doesNotMatch(index, /recovery-example|recovered/);
});
test("Skill import validates full fields before writing and preserves its source", async (t) => {
  const root = fixture(t);
  await initSkills({ targetDir: root, skillTypes: ["managed"] });
  const source = path.join(root, "source/SKILL.md");
  put(source, "# Invalid skill");
  const result = await run(
    [
      "--scope",
      root,
      "memory",
      "remember",
      "--type",
      "managed",
      "--slug",
      "example",
      "--import-entry",
      source,
    ],
    { env: {} },
  );
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stdout, /SKILL.md.*name/);
  assert.equal(
    fs.existsSync(path.join(root, ".harness/skills/managed/example")),
    false,
  );
  assert.equal(fs.readFileSync(source, "utf8"), "# Invalid skill");
});
test("Memory rejects conflicting import content and wrong entry types before writing", async (t) => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ["project"] });
  const source = path.join(root, "source/SKILL.md");
  put(source, "---\nname: example\ndescription: Example\n---\nBody");
  const conflict = await run(
    [
      "--scope",
      root,
      "memory",
      "remember",
      "--type",
      "project",
      "--slug",
      "example",
      "--import-entry",
      source,
      "--content",
      "Other",
    ],
    { env: {} },
  );
  assert.notEqual(conflict.exitCode, 0);
  assert.match(conflict.stdout, /conflict|cannot/i);
  const wrong = await run(
    [
      "--scope",
      root,
      "memory",
      "remember",
      "--type",
      "project",
      "--slug",
      "example",
      "--import-entry",
      source,
    ],
    { env: {} },
  );
  assert.notEqual(wrong.exitCode, 0);
  assert.match(wrong.stdout, /expected INDEX.md/);
  assert.equal(
    fs.existsSync(path.join(root, ".harness/memory/projects/project_example")),
    false,
  );
});
test("business imports reject known source directory types instead of silently retyping them", async (t) => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ["project"] });
  const source = path.join(root, "tasks/_default/backlog/task/INDEX.md");
  put(source, "# Task");
  const result = await run(
    [
      "--scope",
      root,
      "memory",
      "remember",
      "--type",
      "project",
      "--slug",
      "wrong",
      "--import-entry",
      source,
    ],
    { env: {} },
  );
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stdout, /type.*task|task.*type/);
  assert.equal(
    fs.existsSync(path.join(root, ".harness/memory/projects/project_wrong")),
    false,
  );
});
test("doctor reports legacy memory migration without erasing the existing index", async (t) => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ["project"] });
  const index = path.join(root, ".harness/memory/projects/README.md");
  const original = fs
    .readFileSync(index, "utf8")
    .replace("- 暂无条目。", "- [Old](project_old.md) — Legacy");
  put(index, original);
  put(
    path.join(root, ".harness/memory/projects/project_old.md"),
    "---\ndescription: Legacy\n---\nOld",
  );
  const result = await run(["--scope", root, "memory", "doctor", "--apply"], {
    env: {},
  });
  assert.match(result.stdout, /migration-required/);
  assert.equal(fs.readFileSync(index, "utf8"), original);
});