import test from "node:test";
import assert from "node:assert/strict";
import {
  realpathSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { indexTaskFixtureBoard } from "../tasks/utils/helpers.js";
import { run } from "../../src/program.js";
import { initMemory } from "../../src/services/memory/init.js";

function fixture(t: any) {
  const root = realpathSync(
    mkdtempSync(path.join(tmpdir(), "production-nodes-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
test("task update adds title and priority metadata to an indexed task and status preserves its runlog", async (t) => {
  const root = fixture(t),
    scope = path.join(root, "nested");
  const folder = path.join(scope, "tasks/_default/todo");
  mkdirSync(folder, { recursive: true });
  const stem = "2026-10-05--plain";
  mkdirSync(path.join(folder, stem), { recursive: true });
  writeFileSync(
    path.join(folder, stem, "INDEX.md"),
    "---\nmetadata:\n  edges-type: task\n  edges-tasks-status: todo\n---\n# Original\n\nBody stays.\n",
  );
  writeFileSync(path.join(folder, stem, "run.log.md"), "Run evidence\n");
  await indexTaskFixtureBoard(path.join(scope, "tasks"));
  const call = (args: string[]) =>
    run(["--scope", scope, "--super", "tasks", ...args], { env: { EDGES_SCOPE: root } });
  const updated = await call([
    "update",
    stem,
    "--title",
    "Typed title",
    "--priority",
    "high",
  ]);
  assert.equal(updated.exitCode, 0, updated.stdout);
  const got = await call(["get", stem]);
  assert.match(got.stdout, /Typed title/);
  assert.match(got.stdout, /high/);
  const moved = await call(["status", stem, "done"]);
  assert.equal(moved.exitCode, 0, moved.stdout);
  assert.match(
    readFileSync(
      path.join(scope, "tasks/_default/done", stem, "INDEX.md"),
      "utf8",
    ),
    /Body stays/,
  );
  assert.equal(
    readFileSync(
      path.join(scope, "tasks/_default/done", stem, "run.log.md"),
      "utf8",
    ),
    "Run evidence\n",
  );
});
test("memory remember rejects malformed domain metadata without erasing the original entry", async (t) => {
  const root = fixture(t);
  await initMemory({ targetDir: root, memoryTypes: ["project"] });
  const file = path.join(root, ".harness/memory/projects/project_example.md");
  const source =
    "---\nname: example\ndescription: Existing\nmetadata: malformed\n---\nOriginal\n";
  writeFileSync(file, source);
  const result = await run(
    [
      "--scope",
      root,
      "memory",
      "remember",
      "--type",
      "project",
      "--slug",
      "example",
      "--title",
      "Changed",
      "--description",
      "Changed",
      "--content",
      "Replacement",
    ],
    { env: {} },
  );
  assert.equal(result.exitCode, 1, result.stdout);
  assert.equal(readFileSync(file, "utf8"), source);
});

test("note create refuses a linked destination before changing the outside note", async (t) => {
  const { symlinkSync } = await import("node:fs");
  const { localDateYmd } = await import("../../src/utils/date.js");
  const { run } = await import("../../src/program.js");
  const root = fixture(t),
    outside = fixture(t);
  writeFileSync(path.join(root, "AGENTS.md"), "# Scope\n");
  const target = path.join(outside, "source.md");
  writeFileSync(target, "Outside original\n");
  const dir = path.join(root, "notes", `${localDateYmd(new Date())}--hello`);
  mkdirSync(dir, { recursive: true });
  symlinkSync(target, path.join(dir, "INDEX.md"));
  const result = await run(
    ["--scope", root, "notes", "create", "--title", "Hello", "--body", "New body"],
    { env: {} },
  );
  assert.notEqual(result.exitCode, 0);
  assert.equal(readFileSync(target, "utf8"), "Outside original\n");
});

test("ordinary CLI startup works without the optional legacy migration implementation", async (t) => {
  const { cpSync, symlinkSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { execFileSync } = await import("node:child_process");
  const isolated = fixture(t),
    cli = fileURLToPath(new URL("../../", import.meta.url));
  cpSync(path.join(cli, "src"), path.join(isolated, "src"), {
    recursive: true,
  });
  rmSync(path.join(isolated, "src/services/memory/migrate.ts"));
  rmSync(path.join(isolated, "src/services/memory/migration-legacy.ts"));
  symlinkSync(
    path.join(cli, "node_modules"),
    path.join(isolated, "node_modules"),
  );
  writeFileSync(
    path.join(isolated, "package.json"),
    '{"type":"module","version":"0.0.0"}',
  );
  const output = execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      "const {run}=await import('./src/program.ts'); const result=await run(['tasks','--help']); process.stdout.write(result.stdout); process.exitCode=result.exitCode;",
    ],
    { cwd: isolated, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  assert.match(output, /create/);
});

test("indexed task with malformed status is rejected without changing its body or runlog", async t => {
  const root = fixture(t), folder = path.join(root, "tasks/_default/todo/bad");
  mkdirSync(folder, { recursive: true });
  const original = "---\nmetadata:\n  edges-type: task\n  edges-tasks-status: invalid\n---\nOriginal\n";
  writeFileSync(path.join(folder, "INDEX.md"), original);
  writeFileSync(path.join(folder, "run.log.md"), "Evidence\n");
  await indexTaskFixtureBoard(path.join(root, "tasks"));
  const result = await run(["--scope", root, "--super", "tasks", "update", "bad", "--title", "Changed"], { env: {} });
  assert.notEqual(result.exitCode, 0); assert.match(result.stdout, /Invalid edges-tasks-status/);
  assert.equal(readFileSync(path.join(folder, "INDEX.md"), "utf8"), original);
  assert.equal(readFileSync(path.join(folder, "run.log.md"), "utf8"), "Evidence\n");
});
