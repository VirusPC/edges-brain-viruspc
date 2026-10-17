import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("edges compose --help lists clone, pull, and push", async () => {
  const result = await run(["compose", "--help"]);
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^\s+clone\b/m);
  assert.match(result.stdout, /^\s+pull\b/m);
  assert.match(result.stdout, /^\s+push\b/m);
  assert.match(result.stdout, /^\s+register\b/m);
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
});
