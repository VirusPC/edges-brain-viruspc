import { mkdir as fixtureMkdir } from "node:fs/promises";
import { dirname as fixtureDirname } from "node:path";
async function writeFile(...args: Parameters<typeof fixtureRawWriteFile>) {
  await fixtureMkdir(fixtureDirname(String(args[0])), { recursive: true });
  return fixtureRawWriteFile(...args);
}
import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile as fixtureRawWriteFile,
  rm,
  readdir,
  realpath,
  mkdir,
} from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { run } from "../../src/program.js";

async function fixture(t: TestContext) {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), "edges-memory-cli-")),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("memory init without selected types is a nonmutating recommendation", async (t) => {
  const root = await fixture(t);
  const result = await run(["--scope", root, "memory", "init"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout);
  assert.equal(JSON.parse(result.stdout).selectionRequired, true);
  assert.deepEqual(await readdir(root), []);
});

test("CLI initializes selected types and remembers a supplied Markdown file in that scope", async (t) => {
  const root = await fixture(t);
  const init = await run(
    ["--scope", root, "memory", "init", "--memory-types", "project"],
    { env: {} },
  );
  assert.equal(init.exitCode, 0, init.stdout);
  const source = path.join(root, "draft.md");
  await writeFile(source, "A decision with **context**.\n");
  const result = await run(
    [
      "--scope",
      root,
      "memory",
      "remember",
      "--type",
      "project",
      "--slug",
      "decision",
      "--title",
      "Decision",
      "--description",
      "A reusable decision",
      "--content-file",
      source,
      "--agent-client",
      "codex",
      "--username",
      "Test Agent",
      "--email",
      "test@example.com",
    ],
    { env: {} },
  );
  assert.equal(result.exitCode, 0, result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(
    output.path,
    ".harness/memory/projects/project_decision/INDEX.md",
  );
  assert.match(
    await readFile(path.join(root, output.path), "utf8"),
    /A decision with \*\*context\*\*\./,
  );
  assert.match(
    await readFile(path.join(root, output.index), "utf8"),
    /project_decision\/INDEX.md/,
  );
  assert.match(
    await readFile(path.join(root, "AGENTS.md"), "utf8"),
    /\.harness\/README\.md/,
  );
  assert.match(
    await readFile(path.join(root, ".harness/README.md"), "utf8"),
    /memory\/projects\/README\.md/,
  );
});

test("memory remember rejects conflicting or absent content arguments without writes", async (t) => {
  const root = await fixture(t);
  for (const flags of [
    [],
    ["--content", "body", "--content-file", "missing.md"],
  ]) {
    const result = await run(
      [
        "memory",
        "remember",
        "--target-dir",
        root,
        "--type",
        "project",
        "--slug",
        "test",
        ...flags,
      ],
      { env: {} },
    );
    assert.notEqual(result.exitCode, 0);
    assert.match(result.stdout, /content/);
    assert.deepEqual(await readdir(root), []);
  }
});

test("memory help exposes core operations and script arguments remain discoverable", async () => {
  const group = await run(["memory", "--help"]);
  assert.equal(group.exitCode, 0, group.stdout);
  for (const operation of [
    "init",
    "remember",
    "add-type",
    "doctor",
    "migrate",
    "backup",
    "restore",
  ])
    assert.match(group.stdout, new RegExp(`\\b${operation}\\b`));
  const remember = await run(["memory", "remember", "--help"]);
  assert.match(remember.stdout, /--content-file/);
  assert.match(remember.stdout, /--target-dir/);
});

test("memory migrate dry-run exposes the mapping without moving legacy files", async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, ".memory/projects"), { recursive: true });
  await writeFile(
    path.join(root, ".memory/projects/AGENTS.md"),
    "# Projects\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
  );
  const body =
    "---\nname: project_example\ndescription: Example\n---\nOriginal body\n";
  await writeFile(
    path.join(root, ".memory/projects/project_example/INDEX.md"),
    body,
  );
  await writeFile(
    path.join(root, "AGENTS.md"),
    "<!-- project-memory:start -->\n<!-- project-memory-local:start -->\n- [Projects](.memory/projects/AGENTS.md) — Projects\n<!-- project-memory-local:end -->\n<!-- project-memory-children:start -->\n<!-- project-memory-children:end -->\n<!-- project-memory:end -->\n",
  );
  const result = await run(
    ["--scope", root, "memory", "migrate", "--dry-run"],
    { env: {} },
  );
  assert.equal(result.exitCode, 0, result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.match(JSON.stringify(payload.pathMap), /\.harness\/memory\/projects/);
  assert.equal(
    await readFile(
      path.join(root, ".memory/projects/project_example/INDEX.md"),
      "utf8",
    ),
    body,
  );
  assert.deepEqual((await readdir(root)).sort(), [".memory", "AGENTS.md"]);
});
