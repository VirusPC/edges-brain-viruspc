import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "../../src/program.js";
import "../register-skills-install-mock.js";
import { initMemory } from "../../src/services/memory/init.js";
import { acquireWriteLock } from "../../src/services/node/node-lock.js";

const commandsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/commands",
);

async function scope(t: test.TestContext) {
  const root = await mkdtemp(path.join(tmpdir(), "edges-init-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function tree(root: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  async function walk(dir: string) {
    for (const name of await readdir(dir)) {
      const abs = path.join(dir, name);
      const rel = path.relative(root, abs).split(path.sep).join("/");
      const info = await stat(abs);
      if (info.isDirectory()) await walk(abs);
      else out.set(rel, await readFile(abs, "utf8"));
    }
  }
  await walk(root);
  return out;
}

test("edges init --help separates tasks from modules this command creates and ignores --super", async () => {
  const help = await run(["init", "--help"], { env: {} });
  assert.equal(help.exitCode, 0, help.stdout + help.stderr);
  assert.match(help.stdout, /does not read --super/);
  const createdAt = help.stdout.indexOf("CREATED WHEN NO MODULE IS GIVEN");
  const notCreatedAt = help.stdout.indexOf("NOT CREATED HERE");
  assert.ok(createdAt >= 0 && notCreatedAt > createdAt, help.stdout);
  const created = help.stdout.slice(createdAt, notCreatedAt);
  const rest = help.stdout.slice(notCreatedAt);
  assert.match(created, /feedback, project, reference/);
  assert.match(created, /\bskills\b/);
  assert.match(created, /\bnotes\b/);
  assert.match(created, /\bprojects\b/);
  assert.doesNotMatch(created, /\btasks\b/);
  assert.match(rest, /\btasks\b/);
  assert.doesNotMatch(rest, /adopts skill types/);
});

test("edges init on an empty scope writes AGENTS, public memory types, and harness boards", async (t) => {
  const root = await scope(t);
  const result = await run(["--scope", root, "init"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  const body = JSON.parse(result.stdout) as { status: string; command: string; modules: string[] };
  assert.equal(body.status, "success");
  assert.equal(body.command, "init");
  assert.deepEqual(body.modules, ["memory", "skills", "notes", "projects"]);
  for (const rel of [
    "AGENTS.md",
    ".harness/notes/README.md",
    ".harness/projects/README.md",
    ".harness/memory/feedbacks/README.md",
    ".harness/memory/projects/README.md",
    ".harness/memory/references/README.md",
    ".harness/skills/managed/README.md",
    ".harness/skills/referenced/README.md",
  ]) {
    assert.equal(existsSync(path.join(root, rel)), true, rel);
  }
  for (const rel of [
    "notes/README.md",
    "projects/README.md",
    ".harness/memory/users/README.md",
    ".harness/tasks/README.md",
    ".harness/evaluation/README.md",
    ".harness/observation/README.md",
  ]) {
    assert.equal(existsSync(path.join(root, rel)), false, rel);
  }
  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /\.harness\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/notes\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/projects\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/memory\/feedbacks\/README\.md/);
  const index = await readFile(path.join(root, ".harness/README.md"), "utf8");
  assert.match(index, /notes\/README\.md/);
  assert.match(index, /projects\/README\.md/);
  assert.match(index, /memory\/feedbacks\/README\.md/);
  assert.doesNotMatch(index, /^---/m);
});

test("edges init notes and edges notes init write the same files", async (t) => {
  const left = await scope(t);
  const right = await scope(t);
  const fromRoot = await run(["--scope", left, "init", "notes"], { env: {} });
  const fromDomain = await run(["--scope", right, "notes", "init"], { env: {} });
  assert.equal(fromRoot.exitCode, 0, fromRoot.stdout + fromRoot.stderr);
  assert.equal(fromDomain.exitCode, 0, fromDomain.stdout + fromDomain.stderr);
  const normalize = async (root: string) => {
    const name = path.basename(root);
    const files = await tree(root);
    return new Map([...files].map(([rel, text]) => [rel, text.replaceAll(name, "<scope>")]));
  };
  assert.deepEqual(await normalize(left), await normalize(right));
  const rootBody = JSON.parse(fromRoot.stdout) as { modules: string[]; command: string };
  const domainBody = JSON.parse(fromDomain.stdout) as { modules: string[]; command: string };
  assert.deepEqual(rootBody.modules, ["notes"]);
  assert.deepEqual(domainBody.modules, ["notes"]);
  assert.equal(rootBody.command, "init");
  assert.equal(domainBody.command, "notes.init");
  assert.equal(existsSync(path.join(left, ".harness/projects/README.md")), false);
  assert.equal(existsSync(path.join(left, "notes/README.md")), false);
  const notesAgents = await readFile(path.join(left, "AGENTS.md"), "utf8");
  assert.match(notesAgents, /\.harness\/README\.md/);
  assert.doesNotMatch(notesAgents, /\.harness\/notes\/README\.md/);
  assert.match(await readFile(path.join(left, ".harness/README.md"), "utf8"), /notes\/README\.md/);
});

test("edges init memory does not create notes or projects boards", async (t) => {
  const root = await scope(t);
  const result = await run(["--scope", root, "init", "memory"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  assert.equal(existsSync(path.join(root, ".harness/memory/feedbacks/README.md")), true);
  assert.equal(existsSync(path.join(root, ".harness/notes/README.md")), false);
  assert.equal(existsSync(path.join(root, ".harness/projects/README.md")), false);
});

test("edges init is idempotent and keeps an existing harness board", async (t) => {
  const root = await scope(t);
  const first = await run(["--scope", root, "init"], { env: {} });
  assert.equal(first.exitCode, 0, first.stdout);
  const notes = path.join(root, ".harness/notes/README.md");
  const custom = `${await readFile(notes, "utf8")}\n手写说明保留。\n`;
  const { writeFile } = await import("node:fs/promises");
  await writeFile(notes, custom);
  const before = await readFile(path.join(root, "AGENTS.md"), "utf8");
  const second = await run(["--scope", root, "init"], { env: {} });
  assert.equal(second.exitCode, 0, second.stdout + second.stderr);
  assert.equal(await readFile(path.join(root, "AGENTS.md"), "utf8"), before);
  assert.equal(await readFile(notes, "utf8"), custom);
});

test("edges init does not read --super when choosing the write root", async (t) => {
  const root = await scope(t);
  const result = await run(["--scope", root, "--super", "init", "notes"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  assert.equal(existsSync(path.join(root, ".harness/notes/README.md")), true);
  assert.equal(existsSync(path.join(root, "notes/README.md")), false);
});

test("commands do not import the harness material catalog", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(abs);
      return entry.name.endsWith(".ts") ? [abs] : [];
    });
  }
  const files = walk(commandsRoot);
  assert.ok(files.length > 0);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(
      text,
      /domain\/config\/harness-materials/,
      path.relative(commandsRoot, file),
    );
  }
});

test("init commands do not import the material catalog or write files themselves", () => {
  const files = [
    "init.ts",
    "notes/init.ts",
    "projects/init.ts",
    "memory/init.ts",
    "skills/init.ts",
    "tasks/init.ts",
  ].map((rel) => path.join(commandsRoot, rel));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /harness-materials/);
    assert.doesNotMatch(text, /writeFileSync|readFileSync|mkdirSync/);
    assert.match(text, /services\/(init|notes|projects|memory|skills|tasks)\/service\.js/);
  }
});

test("new init commands take the scope write lock", async (t) => {
  const root = await scope(t);
  const release = await acquireWriteLock(root);
  t.after(() => release());
  for (const args of [
    ["--scope", root, "init"],
    ["--scope", root, "notes", "init"],
    ["--scope", root, "projects", "init"],
    ["--scope", root, "skills", "init"],
    ["--scope", root, "tasks", "init"],
  ]) {
    const blocked = await run(args, { env: {} });
    assert.notEqual(blocked.exitCode, 0, args.join(" "));
    assert.match(blocked.stdout, /write lock.*busy/i, blocked.stdout);
  }
});

test("type flags without the memory module are rejected", async (t) => {
  const root = await scope(t);
  const result = await run(["--scope", root, "init", "notes", "--memory-types", "project"], { env: {} });
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stdout, /require the memory module/);
  assert.equal(existsSync(path.join(root, "AGENTS.md")), false);
});

test("memory init does not create or register notes or projects", async (t) => {
  const root = await scope(t);
  const result = await run(["--scope", root, "memory", "init", "--memory-types", "project"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  assert.equal(existsSync(path.join(root, ".harness/memory/projects/README.md")), true);
  for (const rel of [
    ".harness/notes/README.md",
    ".harness/projects/README.md",
    ".harness/tasks/README.md",
    ".harness/skills/managed/README.md",
  ]) {
    assert.equal(existsSync(path.join(root, rel)), false, rel);
  }
  const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /\.harness\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/memory\/projects\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/notes\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/projects\/README\.md/);
  assert.match(await readFile(path.join(root, ".harness/README.md"), "utf8"), /memory\/projects\/README\.md/);
});

test("memory init rejects skill type flags and writes nothing", async (t) => {
  const root = await scope(t);
  await assert.rejects(
    () => initMemory({ targetDir: root, skillTypes: ["managed"] }),
    /require the skills module/,
  );
  const cli = await run(["--scope", root, "memory", "init", "--skill-types", "managed"], { env: {} });
  assert.notEqual(cli.exitCode, 0);
  assert.match(cli.stdout, /skill-types|unknown option/i);
  assert.equal(existsSync(path.join(root, "AGENTS.md")), false);
  assert.equal(existsSync(path.join(root, ".harness")), false);
});

test("skill type flags without the skills module are rejected", async (t) => {
  const root = await scope(t);
  const result = await run(["--scope", root, "init", "notes", "--skill-types", "managed"], { env: {} });
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stdout, /require the skills module/);
  assert.equal(existsSync(path.join(root, "AGENTS.md")), false);
});

test("edges init skills and edges skills init write the same files", async (t) => {
  const left = await scope(t);
  const right = await scope(t);
  const fromRoot = await run(["--scope", left, "init", "skills"], { env: {} });
  const fromDomain = await run(["--scope", right, "skills", "init"], { env: {} });
  assert.equal(fromRoot.exitCode, 0, fromRoot.stdout + fromRoot.stderr);
  assert.equal(fromDomain.exitCode, 0, fromDomain.stdout + fromDomain.stderr);
  const normalize = async (dir: string) => {
    const name = path.basename(dir);
    const files = await tree(dir);
    return new Map([...files].map(([rel, text]) => [rel, text.replaceAll(name, "<scope>")]));
  };
  assert.deepEqual(await normalize(left), await normalize(right));
  const rootBody = JSON.parse(fromRoot.stdout) as { modules: string[]; command: string };
  const domainBody = JSON.parse(fromDomain.stdout) as { modules: string[]; command: string };
  assert.deepEqual(rootBody.modules, ["skills"]);
  assert.deepEqual(domainBody.modules, ["skills"]);
  assert.equal(rootBody.command, "init");
  assert.equal(domainBody.command, "skills.init");
  for (const rel of [
    ".harness/skills/managed/README.md",
    ".harness/skills/referenced/README.md",
  ]) {
    assert.equal(existsSync(path.join(left, rel)), true, rel);
  }
  for (const rel of [
    ".harness/notes/README.md",
    ".harness/projects/README.md",
    ".harness/tasks/README.md",
    ".harness/memory/projects/README.md",
  ]) {
    assert.equal(existsSync(path.join(left, rel)), false, rel);
  }
});

test("edges init tasks and edges tasks init write only the tasks board", async (t) => {
  const left = await scope(t);
  const right = await scope(t);
  const fromRoot = await run(["--scope", left, "init", "tasks"], { env: {} });
  const fromDomain = await run(["--scope", right, "tasks", "init"], { env: {} });
  assert.equal(fromRoot.exitCode, 0, fromRoot.stdout + fromRoot.stderr);
  assert.equal(fromDomain.exitCode, 0, fromDomain.stdout + fromDomain.stderr);
  const normalize = async (dir: string) => {
    const name = path.basename(dir);
    const files = await tree(dir);
    return new Map([...files].map(([rel, text]) => [rel, text.replaceAll(name, "<scope>")]));
  };
  assert.deepEqual(await normalize(left), await normalize(right));
  const domainBody = JSON.parse(fromDomain.stdout) as { modules: string[]; command: string };
  assert.deepEqual(domainBody.modules, ["tasks"]);
  assert.equal(domainBody.command, "tasks.init");
  const board = await readFile(path.join(left, ".harness/tasks/README.md"), "utf8");
  assert.match(board, /project-entries-local:start/);
  const agents = await readFile(path.join(left, "AGENTS.md"), "utf8");
  assert.match(agents, /\.harness\/README\.md/);
  assert.doesNotMatch(agents, /\.harness\/tasks\/README\.md/);
  assert.match(await readFile(path.join(left, ".harness/README.md"), "utf8"), /tasks\/README\.md/);
  for (const rel of [
    ".harness/notes/README.md",
    ".harness/projects/README.md",
    ".harness/skills/managed/README.md",
    ".harness/memory/feedbacks/README.md",
    "tasks/README.md",
  ]) {
    assert.equal(existsSync(path.join(left, rel)), false, rel);
  }
  const custom = `${board}\n手写看板保留。\n`;
  const { writeFile } = await import("node:fs/promises");
  await writeFile(path.join(left, ".harness/tasks/README.md"), custom);
  const again = await run(["--scope", left, "tasks", "init"], { env: {} });
  assert.equal(again.exitCode, 0, again.stdout + again.stderr);
  assert.equal(await readFile(path.join(left, ".harness/tasks/README.md"), "utf8"), custom);
});
