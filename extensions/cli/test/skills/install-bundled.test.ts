import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ignoredInstallTokens } from "../../src/commands/init.js";
import { run } from "../../src/program.js";
import { acquireWriteLock } from "../../src/services/node/node-lock.js";
import { restoreBundledSkillsSpawnForTests } from "../register-skills-install-mock.js";
import {
  SkillsInstallError,
  VERCEL_SKILLS_VERSION,
  installBundledSkills,
  resolveBundledSkillsDir,
  setBundledSkillsSpawnForTests,
  skillsAddArgs,
} from "../../src/services/skills/install-bundled.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.resolve(here, "../../package.json");
const MOVED_SKILL_NAMES = [
  "paper-10-questions",
  "summarize-ai-article",
  "summarize-ai-article-ultra",
  "weekly-ai-blogs-digest",
  "horizontal-vertical-research",
  "learn-repo",
] as const;

test("skillsAddArgs is the bundled directory, --skill *, then forwarded tokens in order", () => {
  assert.deepEqual(skillsAddArgs("/abs/skills", ["-g", "-y", "--agent", "claude-code"]), [
    "add",
    "/abs/skills",
    "--skill",
    "*",
    "-g",
    "-y",
    "--agent",
    "claude-code",
  ]);
  assert.deepEqual(skillsAddArgs("/abs/skills", ["--all"]), ["add", "/abs/skills", "--skill", "*", "--all"]);
  assert.deepEqual(skillsAddArgs("/abs/skills", ["--agent", "*"]), [
    "add",
    "/abs/skills",
    "--skill",
    "*",
    "--agent",
    "*",
  ]);
  assert.deepEqual(skillsAddArgs("/abs/skills", []), ["add", "/abs/skills", "--skill", "*"]);
});

test("the vercel skills version constant is the exact package dependency", () => {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { dependencies: Record<string, string> };
  assert.equal(VERCEL_SKILLS_VERSION, "1.7.2");
  assert.equal(pkg.dependencies.skills, VERCEL_SKILLS_VERSION);
  assert.equal(/[\^~]/.test(pkg.dependencies.skills), false);
  const require = createRequire(packageJsonPath);
  const installed = require("skills/package.json") as { version: string };
  assert.equal(installed.version, VERCEL_SKILLS_VERSION);
});

test("install forwards the absolute bundled directory and inherits stdio", async (t) => {
  const calls: { command: string; args: string[]; stdio: string }[] = [];
  setBundledSkillsSpawnForTests(async (command, args, options) => {
    calls.push({ command, args: [...args], stdio: options.stdio });
    return 0;
  });
  t.after(() => restoreBundledSkillsSpawnForTests());

  await installBundledSkills(["-g", "-y", "--agent", "claude-code"]);

  const dir = resolveBundledSkillsDir();
  assert.equal(path.isAbsolute(dir), true);
  assert.equal(existsSync(path.join(dir, "edges-note", "SKILL.md")), true);
  for (const name of MOVED_SKILL_NAMES) {
    assert.equal(existsSync(path.join(dir, name)), false, name);
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.command, process.execPath);
  assert.equal(calls[0]!.stdio, "inherit");
  assert.equal(calls[0]!.args[0]?.endsWith(`${path.sep}bin${path.sep}cli.mjs`), true, calls[0]!.args[0]);
  assert.deepEqual(calls[0]!.args.slice(1), skillsAddArgs(dir, ["-g", "-y", "--agent", "claude-code"]));
});

test("a non-zero skills exit becomes SkillsInstallError with that exit code", async (t) => {
  setBundledSkillsSpawnForTests(async () => 1);
  t.after(() => restoreBundledSkillsSpawnForTests());
  await assert.rejects(installBundledSkills([]), (error: unknown) => {
    assert.ok(error instanceof SkillsInstallError);
    assert.equal(error.exitCode, 1);
    assert.match(error.message, /1/);
    return true;
  });
});

async function scope(t: test.TestContext): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "edges-skills-install-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

function recordSpawn(t: test.TestContext): { command: string; args: string[]; stdio: string }[] {
  const calls: { command: string; args: string[]; stdio: string }[] = [];
  setBundledSkillsSpawnForTests(async (command, args, options) => {
    calls.push({ command, args: [...args], stdio: options.stdio });
    return 0;
  });
  t.after(() => restoreBundledSkillsSpawnForTests());
  return calls;
}

test("edges skills init forwards -- tokens verbatim and still writes skill indexes", async (t) => {
  const root = await scope(t);
  const calls = recordSpawn(t);
  const result = await run(
    ["--scope", root, "skills", "init", "--", "-g", "-y", "--agent", "claude-code"],
    { env: {} },
  );
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  assert.equal(existsSync(path.join(root, ".harness/skills/managed/README.md")), true);
  assert.equal(existsSync(path.join(root, ".harness/skills/referenced/README.md")), true);
  const dir = resolveBundledSkillsDir();
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.stdio, "inherit");
  assert.deepEqual(calls[0]!.args.slice(1), skillsAddArgs(dir, ["-g", "-y", "--agent", "claude-code"]));
});

test("edges init memory skills -- x keeps those modules and forwards only x", async (t) => {
  const root = await scope(t);
  const calls = recordSpawn(t);
  const result = await run(["--scope", root, "init", "memory", "skills", "--", "x"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  const body = JSON.parse(result.stdout) as { modules: string[] };
  assert.deepEqual(body.modules, ["memory", "skills"]);
  assert.deepEqual(calls[0]!.args.slice(1), skillsAddArgs(resolveBundledSkillsDir(), ["x"]));
});

test("edges init notes projects -- x does not install skills", async (t) => {
  const root = await scope(t);
  const calls = recordSpawn(t);
  const result = await run(["--scope", root, "init", "notes", "projects", "--", "x"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  const body = JSON.parse(result.stdout) as { modules: string[] };
  assert.deepEqual(body.modules, ["notes", "projects"]);
  assert.equal(calls.length, 0);
});

test("edges init -- -y --agent * uses the default modules and forwards the tokens", async (t) => {
  const root = await scope(t);
  const calls = recordSpawn(t);
  const result = await run(["--scope", root, "init", "--", "-y", "--agent", "*"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  const body = JSON.parse(result.stdout) as { modules: string[] };
  assert.deepEqual(body.modules, ["memory", "skills", "notes", "projects"]);
  assert.equal(body.modules.includes("-y"), false);
  assert.deepEqual(calls[0]!.args.slice(1), skillsAddArgs(resolveBundledSkillsDir(), ["-y", "--agent", "*"]));
});

test("edges init a b -- x does not treat x as a module", async (t) => {
  const root = await scope(t);
  const calls = recordSpawn(t);
  const result = await run(["--scope", root, "init", "a", "b", "--", "x"], { env: {} });
  assert.notEqual(result.exitCode, 0);
  const body = JSON.parse(result.stdout) as { reason: string };
  assert.match(body.reason, /Unknown init module: a/);
  assert.doesNotMatch(body.reason, /Unknown init module: x/);
  assert.equal(calls.length, 0);
});

test("vercel exit 1 fails edges skills init and edges init", async (t) => {
  const root = await scope(t);
  setBundledSkillsSpawnForTests(async () => 1);
  t.after(() => restoreBundledSkillsSpawnForTests());
  const skills = await run(["--scope", root, "skills", "init"], { env: {} });
  const init = await run(["--scope", root, "init"], { env: {} });
  for (const result of [skills, init]) {
    assert.equal(result.exitCode, 1, result.stdout + result.stderr);
    const body = JSON.parse(result.stdout) as { status: string; reason: string };
    assert.equal(body.status, "failed");
    assert.ok(body.reason.length > 0);
  }
});

test("skills install that cannot start fails init", async (t) => {
  const root = await scope(t);
  setBundledSkillsSpawnForTests(async () => {
    throw Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" });
  });
  t.after(() => restoreBundledSkillsSpawnForTests());
  const result = await run(["--scope", root, "skills", "init"], { env: {} });
  assert.equal(result.exitCode, 1, result.stdout + result.stderr);
  const body = JSON.parse(result.stdout) as { status: string; reason: string };
  assert.equal(body.status, "failed");
  assert.match(body.reason, /could not be started/);
});

test("edges does not accept --no-skills, --skill, or -f", async (t) => {
  const root = await scope(t);
  const calls = recordSpawn(t);
  for (const argv of [
    ["--scope", root, "init", "--no-skills"],
    ["--scope", root, "skills", "init", "--no-skills"],
    ["--scope", root, "skills", "init", "--skill", "foo"],
    ["--scope", root, "skills", "init", "-f"],
    ["--scope", root, "skills", "init", "--force"],
  ]) {
    const result = await run(argv, { env: {} });
    assert.notEqual(result.exitCode, 0, argv.join(" "));
  }
  assert.equal(calls.length, 0);
});

test("running edges skills init twice installs twice", async (t) => {
  const root = await scope(t);
  const calls = recordSpawn(t);
  const first = await run(["--scope", root, "skills", "init"], { env: {} });
  const second = await run(["--scope", root, "skills", "init"], { env: {} });
  assert.equal(first.exitCode, 0, first.stdout + first.stderr);
  assert.equal(second.exitCode, 0, second.stdout + second.stderr);
  assert.equal(calls.length, 2);
  assert.equal(existsSync(path.join(root, ".harness/skills/managed/README.md")), true);
});

test("a skills process that cannot start fails with exit code 1", async (t) => {
  setBundledSkillsSpawnForTests(async () => {
    throw Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" });
  });
  t.after(() => restoreBundledSkillsSpawnForTests());
  await assert.rejects(installBundledSkills([]), (error: unknown) => {
    assert.ok(error instanceof SkillsInstallError);
    assert.equal(error.exitCode, 1);
    assert.match(error.message, /起不来|could not be started|ENOENT/);
    return true;
  });
});

test("clearing the fake spawn under node --test refuses the real installer", async (t) => {
  setBundledSkillsSpawnForTests(undefined);
  t.after(() => restoreBundledSkillsSpawnForTests());
  await assert.rejects(installBundledSkills([]), (error: unknown) => {
    assert.ok(error instanceof SkillsInstallError);
    assert.match(error.message, /refusing to spawn the real skills installer under test/);
    return true;
  });
});

test("vercel exit 3 is the process exit code and the envelope is SKILLS_INSTALL_FAILED", async (t) => {
  const root = await scope(t);
  setBundledSkillsSpawnForTests(async () => 3);
  t.after(() => restoreBundledSkillsSpawnForTests());
  const result = await run(["--scope", root, "init"], { env: {} });
  assert.equal(result.exitCode, 3, result.stdout + result.stderr);
  const body = JSON.parse(result.stdout) as {
    status: string;
    errorCode: string;
    created: string[];
  };
  assert.equal(body.status, "failed");
  assert.equal(body.errorCode, "SKILLS_INSTALL_FAILED");
  assert.notEqual(body.errorCode, "VALIDATION_ERROR");
  assert.ok(body.created.includes(".harness/skills/managed/README.md"), body.created.join(","));
  assert.equal(existsSync(path.join(root, "AGENTS.md")), true);
  assert.equal(existsSync(path.join(root, ".harness/skills/managed/README.md")), true);
});

test("edges init notes -- -y warns and does not install", async (t) => {
  const root = await scope(t);
  const calls = recordSpawn(t);
  const result = await run(["--scope", root, "init", "notes", "--", "-y"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  assert.match(result.stderr, /skills was not selected; ignoring install tokens: -y/);
  assert.equal(calls.length, 0);
  assert.equal(existsSync(path.join(root, ".harness/notes/README.md")), true);
  assert.equal(existsSync(path.join(root, ".harness/skills/managed/README.md")), false);
});

test("memory type selection does not warn when skills is in the resolved module set", () => {
  assert.equal(
    ignoredInstallTokens(["memory", "skills", "notes", "projects"], ["-y"]),
    "",
  );
  assert.equal(ignoredInstallTokens(undefined, ["-y"]), "");
  assert.match(ignoredInstallTokens(["notes"], ["-y"]), /ignoring install tokens: -y/);
});

test("edges memory init -- -y is not a skills install and does not warn", async (t) => {
  const root = await scope(t);
  const selected = await run(["--scope", root, "memory", "init"], { env: {} });
  assert.equal(selected.exitCode, 0, selected.stdout + selected.stderr);
  const body = JSON.parse(selected.stdout) as { selectionRequired: boolean };
  assert.equal(body.selectionRequired, true);
  assert.doesNotMatch(selected.stderr, /skills was not selected/);

  const withTokens = await run(["--scope", root, "memory", "init", "--", "-y"], { env: {} });
  assert.notEqual(withTokens.exitCode, 0, withTokens.stdout);
  assert.doesNotMatch(withTokens.stderr, /skills was not selected/);
  assert.match(withTokens.stdout + withTokens.stderr, /-y|too many arguments/);
});

test("edges skills get -- edges-note keeps the target operand", async (t) => {
  const root = await scope(t);
  const ready = await run(["--scope", root, "init", "notes"], { env: {} });
  assert.equal(ready.exitCode, 0, ready.stdout + ready.stderr);
  const result = await run(["--scope", root, "skills", "get", "--", "edges-note"], { env: {} });
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stdout, /skill not found: edges-note/);
  assert.doesNotMatch(result.stdout + result.stderr, /missing required argument/);
});

test("edges notes get -- -weird/INDEX.md keeps the path operand", async (t) => {
  const root = await scope(t);
  const ready = await run(["--scope", root, "init", "notes"], { env: {} });
  assert.equal(ready.exitCode, 0, ready.stdout + ready.stderr);
  const result = await run(["--scope", root, "notes", "get", "--", "-weird/INDEX.md"], { env: {} });
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stdout, /note path must be notes\/<stem>\/INDEX.md/);
  assert.doesNotMatch(result.stdout + result.stderr, /missing required argument/);
});

test("edges skills list -- nope does not drop the operand", async (t) => {
  const root = await scope(t);
  const result = await run(["--scope", root, "skills", "list", "--", "nope"], { env: {} });
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stdout + result.stderr, /nope|too many arguments/);
  assert.doesNotMatch(result.stderr, /skills was not selected/);
});

test("edges notes create keeps a title whose value is --", async (t) => {
  const root = await scope(t);
  const result = await run(
    ["--scope", root, "notes", "create", "--title", "--", "--body", "kept body"],
    { env: {} },
  );
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  const body = JSON.parse(result.stdout) as { title?: string; path: string };
  assert.equal(body.title, "--");
  assert.match(readFileSync(path.join(root, body.path), "utf8"), /kept body/);
});

test("multi-value --memory-types before -- is not forwarded and is not a module", async (t) => {
  const root = await scope(t);
  const calls = recordSpawn(t);
  const result = await run(
    ["--scope", root, "init", "--memory-types", "project", "feedback", "--", "-y"],
    { env: {} },
  );
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  const body = JSON.parse(result.stdout) as { modules: string[] };
  assert.deepEqual(body.modules, ["memory", "skills", "notes", "projects"]);
  assert.equal(existsSync(path.join(root, ".harness/memory/projects/README.md")), true);
  assert.equal(existsSync(path.join(root, ".harness/memory/feedbacks/README.md")), true);
  assert.equal(existsSync(path.join(root, ".harness/memory/references/README.md")), false);
  assert.equal(existsSync(path.join(root, ".harness/memory/users/README.md")), false);
  assert.deepEqual(calls[0]!.args.slice(1), skillsAddArgs(resolveBundledSkillsDir(), ["-y"]));
});

test("skills install runs after the init write lock is released", async (t) => {
  const root = await scope(t);
  let acquiredDuringInstall = false;
  setBundledSkillsSpawnForTests(async () => {
    const release = await acquireWriteLock(root);
    acquiredDuringInstall = true;
    await release();
    return 0;
  });
  t.after(() => restoreBundledSkillsSpawnForTests());
  const result = await run(["--scope", root, "skills", "init"], { env: {} });
  assert.equal(result.exitCode, 0, result.stdout + result.stderr);
  assert.equal(acquiredDuringInstall, true);
});

async function skillPackage(root: string, moduleRel: string): Promise<string> {
  const modulePath = path.join(root, "pkg", moduleRel);
  await mkdir(path.dirname(modulePath), { recursive: true });
  await writeFile(modulePath, "");
  await writeFile(path.join(root, "pkg", "package.json"), JSON.stringify({ name: "@viruspc/edges" }));
  return pathToFileURL(modulePath).href;
}

test("built package skills win over a sibling source tree", async (t) => {
  const root = await scope(t);
  const moduleUrl = await skillPackage(root, "dist/services/skills/install-bundled.js");
  await mkdir(path.join(root, "pkg/skills/shipped"), { recursive: true });
  await writeFile(path.join(root, "pkg/skills/shipped/SKILL.md"), "---\nname: shipped\n---\n");
  await mkdir(path.join(root, "skills/source-only"), { recursive: true });
  await writeFile(path.join(root, "skills/source-only/SKILL.md"), "---\nname: source-only\n---\n");
  assert.equal(resolveBundledSkillsDir(moduleUrl), path.resolve(root, "pkg/skills"));
});

test("source resolution ignores a stale package skills directory", async (t) => {
  const root = await scope(t);
  const moduleUrl = await skillPackage(root, "src/services/skills/install-bundled.ts");
  await mkdir(path.join(root, "pkg/skills/stale"), { recursive: true });
  await writeFile(path.join(root, "pkg/skills/stale/SKILL.md"), "---\nname: stale\n---\n");
  await mkdir(path.join(root, "skills/live"), { recursive: true });
  await writeFile(path.join(root, "skills/live/SKILL.md"), "---\nname: live\n---\n");
  assert.equal(resolveBundledSkillsDir(moduleUrl), path.resolve(root, "skills"));
});

test("source resolution does not fall back to a stale package skills directory", async (t) => {
  const root = await scope(t);
  const moduleUrl = await skillPackage(root, "src/services/skills/install-bundled.ts");
  await mkdir(path.join(root, "pkg/skills/stale"), { recursive: true });
  await writeFile(path.join(root, "pkg/skills/stale/SKILL.md"), "---\nname: stale\n---\n");
  assert.throws(() => resolveBundledSkillsDir(moduleUrl), SkillsInstallError);
});
