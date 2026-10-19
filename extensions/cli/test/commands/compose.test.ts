import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { run } from "../../src/program.js";

const agents = (body = "") => `# Scope

<!-- project-harness:start -->
<!-- project-harness-constraints:start -->
## 本层硬约束

- keep
<!-- project-harness-constraints:end -->
${body}<!-- project-harness:end -->
`;

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Edges Test",
      GIT_AUTHOR_EMAIL: "edges@example.com",
      GIT_COMMITTER_NAME: "Edges Test",
      GIT_COMMITTER_EMAIL: "edges@example.com",
      GIT_TERMINAL_PROMPT: "0",
    },
  });
}

function commit(cwd: string, message: string, file: string, contents: string): void {
  writeFileSync(path.join(cwd, file), contents);
  git(["add", file], cwd);
  git(
    ["-c", "commit.gpgsign=false", "-c", "user.email=edges@example.com", "-c", "user.name=Edges Test", "commit", "-m", message],
    cwd,
  );
}

function failed(stdout: string): { status: string; errorCode: string; reason: string } {
  return JSON.parse(stdout) as { status: string; errorCode: string; reason: string };
}

test("compose register --help marks --description as required", async () => {
  const result = await run(["compose", "register", "--help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /--description\s+<text>/);
  assert.match(result.stdout, /required/i);
});

test("compose register without --description is a validation error and leaves AGENTS.md unchanged", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "compose-register-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scope = path.join(root, "scope");
  mkdirSync(scope, { recursive: true });
  const file = path.join(scope, "AGENTS.md");
  const before = agents();
  writeFileSync(file, before);
  const env = { ...process.env, EDGES_SCOPE: scope };

  const missing = await run(
    ["compose", "register", "--name", "brain", "--remote", "https://github.com/example/brain.git"],
    { env },
  );
  assert.equal(missing.exitCode, 2);
  const missingBody = failed(missing.stdout);
  assert.equal(missingBody.status, "failed");
  assert.equal(missingBody.errorCode, "VALIDATION_ERROR");
  assert.match(missingBody.reason, /--description/);
  assert.match(missingBody.reason, /required/i);
  assert.equal(readFileSync(file, "utf8"), before);

  const empty = await run(
    ["compose", "register", "--name", "brain", "--remote", "https://github.com/example/brain.git", "--description", ""],
    { env },
  );
  assert.equal(empty.exitCode, 2);
  const emptyBody = failed(empty.stdout);
  assert.equal(emptyBody.errorCode, "VALIDATION_ERROR");
  assert.match(emptyBody.reason, /--description/);
  assert.match(emptyBody.reason, /required/i);
  assert.equal(readFileSync(file, "utf8"), before);

  const blank = await run(
    ["compose", "register", "--name", "brain", "--description", "   "],
    { env },
  );
  assert.equal(blank.exitCode, 2);
  assert.equal(failed(blank.stdout).errorCode, "VALIDATION_ERROR");
  assert.equal(readFileSync(file, "utf8"), before);
});

test("compose register writes the description into the Compose block", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "compose-desc-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scope = path.join(root, "scope");
  mkdirSync(scope, { recursive: true });
  const file = path.join(scope, "AGENTS.md");
  writeFileSync(file, agents());
  const env = { ...process.env, EDGES_SCOPE: scope };
  const registered = await run(
    [
      "compose",
      "register",
      "--name",
      "brain",
      "--remote",
      "https://github.com/example/brain.git",
      "--description",
      "个人大脑：只在记跨项目判断时写入",
    ],
    { env },
  );
  assert.equal(registered.exitCode, 0, registered.stdout + registered.stderr);
  const source = readFileSync(file, "utf8");
  assert.match(
    source,
    /\[brain\]\(<~\/\.edges\/composed\/brain>\) — 个人大脑：只在记跨项目判断时写入 remote: https:\/\/github\.com\/example\/brain\.git/,
  );
  const body = JSON.parse(registered.stdout) as { description?: string };
  assert.equal(body.description, "个人大脑：只在记跨项目判断时写入");
});

test("edges compose --help lists clone, pull, and push", async () => {
  const result = await run(["compose", "--help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^\s+clone\b/m);
  assert.match(result.stdout, /^\s+pull\b/m);
  assert.match(result.stdout, /^\s+push\b/m);
  assert.match(result.stdout, /^\s+register\b/m);
  assert.match(result.stdout, /^\s+unregister\b/m);
  assert.match(result.stdout, /^\s+list\b/m);
});

test("compose register, clone, pull, and push use the repo's own git flow", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "compose-cli-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scope = path.join(root, "scope");
  const bare = path.join(root, "remote.git");
  const source = path.join(root, "source");
  const checkout = path.join(root, "brain");
  mkdirSync(scope, { recursive: true });
  writeFileSync(path.join(scope, "AGENTS.md"), agents());
  git(["init", "--bare", "-b", "main", bare]);
  git(["init", "-b", "main", source]);
  commit(source, "init", "README.md", "origin\n");
  git(["remote", "add", "origin", bare], source);
  git(["push", "-u", "origin", "main"], source);

  const env = { ...process.env, EDGES_SCOPE: scope };
  const registered = await run(
    ["compose", "register", "--name", "brain", "--path", checkout, "--remote", bare, "--description", "个人大脑"],
    { env },
  );
  assert.equal(registered.exitCode, 0, registered.stdout + registered.stderr);
  const listed = await run(["compose", "list"], { env });
  assert.equal(listed.exitCode, 0, listed.stdout);
  const listBody = JSON.parse(listed.stdout) as { entries: Array<{ name: string; directory: string; remote: string }> };
  assert.equal(listBody.entries[0]?.name, "brain");
  assert.equal(listBody.entries[0]?.directory, checkout);
  assert.equal(listBody.entries[0]?.remote, bare);

  const cloned = await run(["compose", "clone", "--name", "brain"], { env });
  assert.equal(cloned.exitCode, 0, cloned.stdout + cloned.stderr);
  assert.equal(JSON.parse(cloned.stdout).entries[0].action, "cloned");
  assert.equal(readFileSync(path.join(checkout, "README.md"), "utf8"), "origin\n");
  const again = await run(["compose", "clone", "--name", "brain"], { env });
  assert.equal(again.exitCode, 0, again.stdout + again.stderr);
  assert.equal(JSON.parse(again.stdout).entries[0].action, "present");

  commit(source, "upstream", "NOTE.md", "from-upstream\n");
  git(["push"], source);
  const pulled = await run(["compose", "pull"], { env });
  assert.equal(pulled.exitCode, 0, pulled.stdout + pulled.stderr);
  assert.equal(JSON.parse(pulled.stdout).entries[0].action, "pulled");
  assert.equal(readFileSync(path.join(checkout, "NOTE.md"), "utf8"), "from-upstream\n");

  commit(checkout, "local", "LOCAL.md", "from-checkout\n");
  const pushed = await run(["compose", "push", "--name", "brain"], { env });
  assert.equal(pushed.exitCode, 0, pushed.stdout + pushed.stderr);
  assert.equal(JSON.parse(pushed.stdout).entries[0].action, "pushed");
  const seen = git(["--git-dir", bare, "log", "-1", "--format=%s", "main"]);
  assert.match(seen, /local/);

  const removed = await run(["compose", "unregister", "--name", "brain"], { env });
  assert.equal(removed.exitCode, 0, removed.stdout + removed.stderr);
  assert.equal(JSON.parse(removed.stdout).name, "brain");
  assert.equal(existsSync(path.join(checkout, "README.md")), true);
  const after = JSON.parse((await run(["compose", "list"], { env })).stdout) as {
    entries: unknown[];
  };
  assert.equal(after.entries.length, 0);
  assert.doesNotMatch(readFileSync(path.join(scope, "AGENTS.md"), "utf8"), /\[brain\]/);
  const missing = await run(["compose", "unregister", "--name", "brain"], { env });
  assert.notEqual(missing.exitCode, 0);
  assert.match(missing.stdout, /Compose entry not found: brain/);
});
