import { mkdir as fixtureMkdir } from "node:fs/promises";
import { dirname as fixtureDirname } from "node:path";
async function writeFile(...args: Parameters<typeof fixtureRawWriteFile>) {
  await fixtureMkdir(fixtureDirname(String(args[0])), { recursive: true });
  return fixtureRawWriteFile(...args);
}
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile as fixtureRawWriteFile,
  rm,
  access,
} from "node:fs/promises";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { domainBoard, nodeBoardWriter } from "./utils/helpers.js";
import {
  createProject,
  getProject,
  listProjects,
  renderProjectAgents,
  updateProject,
} from "../../src/services/tasks/project-meta.js";

async function virginRepo(): Promise<string> {
  const repo = await mkdtemp(path.join(realpathSync(tmpdir()), "edges-proj-"));
  await mkdir(path.join(repo, "tasks"), { recursive: true });
  return repo;
}

async function seedMaintenanceScope(repo: string): Promise<void> {
  await writeFile(
    path.join(repo, "AGENTS.md"),
    "# Scope\n\n<!-- project-harness-local:start -->\n## 本层系统维护信息\n\n- [Tasks](.harness/tasks/README.md) — maintenance tasks\n<!-- project-harness-local:end -->\n",
    "utf8",
  );
}

test("create/list/get/update project metadata; create default on virgin board", async () => {
  const repo = await virginRepo();
  try {
    const createdDefault = await createProject(
      domainBoard(repo),
      {
        project: "default",
        title: "Default",
        description:
          "Ungrouped tasks that have not been assigned a named Task Project.",
      },
      nodeBoardWriter(),
    );
    assert.equal(createdDefault.project, "default");
    assert.equal(createdDefault.dir, "_default");
    assert.equal(createdDefault.path, "tasks/_default/README.md");

    const created = await createProject(
      domainBoard(repo),
      { project: "cli", title: "CLI", description: "edges CLI work" },
      nodeBoardWriter(),
    );
    assert.equal(created.project, "cli");
    assert.equal(created.path, "tasks/cli/README.md");

    const listed = await listProjects(domainBoard(repo), nodeBoardWriter());
    assert.deepEqual(
      listed.map((item) => item.project),
      ["default", "cli"],
    );

    const got = await getProject(domainBoard(repo), "cli", nodeBoardWriter());
    assert.equal(got.title, "CLI");
    assert.equal(got.description, "edges CLI work");

    const updated = await updateProject(
      domainBoard(repo),
      "cli",
      { description: "updated CLI" },
      nodeBoardWriter(),
    );
    assert.equal(updated.description, "updated CLI");
    assert.equal(updated.title, "CLI");

    await assert.rejects(access(path.join(repo, "tasks/AGENTS.md")));
    const list = await readFile(path.join(repo, "tasks/README.md"), "utf8");
    assert.match(list, /\[CLI\]\(<cli\/README\.md>\) — updated CLI/);
    assert.match(list, /<!-- project-entries-local:start -->/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("createProject duplicate and getProject missing", async () => {
  const repo = await virginRepo();
  try {
    await createProject(
      domainBoard(repo),
      { project: "cli", title: "CLI", description: "edges CLI work" },
      nodeBoardWriter(),
    );
    await assert.rejects(
      () =>
        createProject(
          domainBoard(repo),
          { project: "cli", title: "CLI", description: "edges CLI work" },
          nodeBoardWriter(),
        ),
      (error: unknown) => {
        assert.equal(
          (error as { errorCode: string }).errorCode,
          "VALIDATION_ERROR",
        );
        assert.match((error as Error).message, /project already exists: cli/);
        return true;
      },
    );
    await assert.rejects(
      () => getProject(domainBoard(repo), "docs", nodeBoardWriter()),
      (error: unknown) => {
        assert.equal(
          (error as { errorCode: string }).errorCode,
          "PROJECT_NOT_FOUND",
        );
        assert.match((error as Error).message, /project not found: docs/);
        return true;
      },
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateProject preserves pointers and does not rewrite a Task file", async () => {
  const repo = await virginRepo();
  try {
    await createProject(
      domainBoard(repo),
      { project: "cli", title: "CLI", description: "edges CLI work" },
      nodeBoardWriter(),
    );
    await writeFile(
      path.join(repo, "tasks/cli/README.md"),
      "# CLI\n\nedges CLI work\n\n## Pointers\n\n- keep\n",
      "utf8",
    );
    const taskRel = "tasks/_default/backlog/2026-09-13--keep/index.md";
    await mkdir(path.join(repo, "tasks/_default/backlog"), { recursive: true });
    await writeFile(
      path.join(repo, taskRel),
      "---\nmetadata:\n  edges-tasks-status: backlog\n  edges-task-priority: high\n---\n\nbody\n",
      "utf8",
    );
    await updateProject(domainBoard(repo), "cli", { title: "CLI work" }, nodeBoardWriter());
    const readme = await readFile(
      path.join(repo, "tasks/cli/README.md"),
      "utf8",
    );
    assert.match(readme, /^# CLI work\n/);
    assert.match(readme, /## Pointers\n\n- keep\n/);
    const task = await readFile(path.join(repo, taskRel), "utf8");
    assert.match(task, /edges-tasks-status: backlog/);
    assert.match(task, /edges-task-priority: high/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateProject rejects a project directory that has no README.md", async () => {
  const repo = await virginRepo();
  try {
    const task = path.join(repo, "tasks/docs/backlog/2026-09-17--orphan/index.md");
    const body = "---\nmetadata:\n  edges-tasks-status: backlog\n  edges-task-project: docs\n---\n\nbody\n";
    await writeFile(task, body, "utf8");
    await writeFile(
      path.join(repo, "tasks/README.md"),
      "# Tasks\n\n<!-- project-entries-local:start -->\n## 本层内容\n<!-- project-entries-local:end -->\n",
    );
    const writer = nodeBoardWriter();
    await assert.rejects(
      () => updateProject(domainBoard(repo), "docs", { title: "Docs", description: "documentation work" }, writer),
      (error: unknown) => {
        assert.equal((error as { errorCode: string }).errorCode, "VALIDATION_ERROR");
        assert.match((error as Error).message, /missing README\.md/);
        assert.match((error as Error).message, /tasks\/docs\/README\.md/);
        return true;
      },
    );
    await assert.rejects(
      () => getProject(domainBoard(repo), "docs", writer),
      (error: unknown) => {
        assert.match((error as Error).message, /missing README\.md/);
        assert.match((error as Error).message, /tasks\/docs\/README\.md/);
        return true;
      },
    );
    assert.equal(await readFile(task, "utf8"), body);
    await assert.rejects(access(path.join(repo, "tasks/docs/README.md")));
    assert.match(await readFile(path.join(repo, "tasks/README.md"), "utf8"), /## 本层内容\n<!-- project-entries-local:end -->/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("createProject rejects _default as the CLI id", async () => {
  const repo = await virginRepo();
  try {
    await assert.rejects(
      () =>
        createProject(
          domainBoard(repo),
          { project: "_default", title: "Default", description: "x" },
          nodeBoardWriter(),
        ),
      (error: unknown) => {
        assert.equal(
          (error as { errorCode: string }).errorCode,
          "VALIDATION_ERROR",
        );
        return true;
      },
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("project get returns the read-only listed project after ordinary task creation", async () => {
  const { run } = await import("../../src/program.js");
  const repo = await mkdtemp(path.join(realpathSync(tmpdir()), "edges-project-get-"));
  try {
    await seedMaintenanceScope(repo);
    const env = { EDGES_SCOPE: repo };
    const created = await run(
      [
        "tasks",
        "create",
        "--title",
        "Fresh",
        "--project",
        "cli",
      ],
      { env },
    );
    assert.equal(created.exitCode, 0, created.stdout);
    const indexedPaths = ["AGENTS.md", ".harness/tasks/cli/README.md", ".harness/tasks/README.md", ".harness/tasks/_default/README.md"];
    const before = await Promise.all(indexedPaths.map(rel => readFile(path.join(repo, rel), "utf8")));
    const listResult = await run(["tasks", "project", "list"], { env });
    assert.equal(listResult.exitCode, 0, listResult.stdout + listResult.stderr);
    const listed = JSON.parse(listResult.stdout);
    const got = await run(
      ["tasks", "project", "get", "cli"],
      { env },
    );
    assert.equal(got.exitCode, 0, got.stdout);
    const { status, command, ...record } = JSON.parse(got.stdout);
    assert.equal(status, "success");
    assert.deepEqual(
      record,
      listed.projects.find((project: any) => project.project === "cli"),
    );
    assert.deepEqual(await Promise.all(indexedPaths.map(rel => readFile(path.join(repo, rel), "utf8"))), before);
    for (const rel of ["tasks", ".harness/tasks/AGENTS.md", ".harness/tasks/cli/AGENTS.md", ".harness/tasks/_default/AGENTS.md"]) {
      await assert.rejects(access(path.join(repo, rel)));
    }
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

for (const all of [false, true]) {
  test(`project list${all ? " --all" : ""} preserves custom metadata from reached README projects without writes`, async () => {
    const { run } = await import("../../src/program.js");
    const repo = await mkdtemp(path.join(realpathSync(tmpdir()), "edges-project-custom-"));
    try {
      await seedMaintenanceScope(repo);
      const env = { EDGES_SCOPE: repo };
      const title = "CLI tools & workflows";
      const description = "First paragraph.\n\nSecond paragraph with **Markdown**.";
      const created = await run(
        ["tasks", "project", "create", "cli", "--title", title, "--description", description],
        { env },
      );
      assert.equal(created.exitCode, 0, created.stdout);
      const updated = await run(
        ["tasks", "project", "update", "default", "--title", "Unsorted work", "--description", "Pending assignment."],
        { env },
      );
      assert.equal(updated.exitCode, 0, updated.stdout);
      // An unindexed sibling must not be parsed or given metadata by either query.
      await writeFile(path.join(repo, ".harness/tasks/unindexed/README.md"), "Unindexed, malformed project metadata.\n", "utf8");
      const indexedPaths = ["AGENTS.md", ".harness/tasks/README.md", ".harness/tasks/cli/README.md", ".harness/tasks/_default/README.md", ".harness/tasks/unindexed/README.md"];
      const before = await Promise.all(indexedPaths.map(rel => readFile(path.join(repo, rel), "utf8")));
      const result = await run([...(all ? ["--all"] : []), "tasks", "project", "list"], { env });
      assert.equal(result.exitCode, 0, result.stdout + result.stderr);
      const expected = [
        { project: "cli", dir: "cli", title, description, path: ".harness/tasks/cli/README.md" },
        { project: "default", dir: "_default", title: "Unsorted work", description: "Pending assignment.", path: ".harness/tasks/_default/README.md" },
      ];
      assert.deepEqual(JSON.parse(result.stdout).projects.sort((a: any, b: any) => a.project.localeCompare(b.project)), expected);
      for (const wanted of expected) {
        const got = await run(["tasks", "project", "get", wanted.project], { env });
        assert.equal(got.exitCode, 0, got.stdout);
        const { status, command, ...record } = JSON.parse(got.stdout);
        assert.equal(status, "success");
        assert.equal(command, "project.get");
        assert.deepEqual(record, wanted);
      }
      assert.deepEqual(await Promise.all(indexedPaths.map(rel => readFile(path.join(repo, rel), "utf8"))), before);
      for (const rel of [".harness/tasks/AGENTS.md", ".harness/tasks/cli/AGENTS.md", ".harness/tasks/_default/AGENTS.md", ".harness/tasks/unindexed/AGENTS.md"]) {
        await assert.rejects(access(path.join(repo, rel)));
      }
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });
}

test("update does not seed a README when the directory is missing or AGENTS-only", async () => {
  const repo = await virginRepo();
  try {
    const writer = nodeBoardWriter();
    const board = path.join(repo, "tasks/AGENTS.md");
    await writeFile(
      board,
      "# Tasks\n\n<!-- project-harness-local:start -->\n## 本层系统维护信息\n\n- [Alpha](alpha/AGENTS.md) — alpha work\n- [Beta](beta/AGENTS.md) — beta work\n<!-- project-harness-local:end -->\n",
    );
    await writeFile(
      path.join(repo, "tasks/alpha/AGENTS.md"),
      renderProjectAgents({ title: "Alpha", description: "alpha work" }),
    );
    await writeFile(
      path.join(repo, "tasks/beta/AGENTS.md"),
      renderProjectAgents({ title: "Beta", description: "beta work" }),
    );
    const before = await readFile(board, "utf8");
    const alphaAgents = await readFile(path.join(repo, "tasks/alpha/AGENTS.md"), "utf8");
    const betaAgents = await readFile(path.join(repo, "tasks/beta/AGENTS.md"), "utf8");

    await assert.rejects(
      () => updateProject(domainBoard(repo), "unknown", { description: "nope" }, writer),
      (error: unknown) => {
        assert.equal((error as { errorCode: string }).errorCode, "PROJECT_NOT_FOUND");
        return true;
      },
    );
    assert.equal(await readFile(board, "utf8"), before);
    for (const rel of [
      "tasks/README.md",
      "tasks/alpha/README.md",
      "tasks/beta/README.md",
      "tasks/_default",
      "tasks/unknown",
    ]) {
      await assert.rejects(access(path.join(repo, rel)));
    }

    await assert.rejects(
      () => updateProject(domainBoard(repo), "alpha", { description: "alpha v2" }, writer),
      (error: unknown) => {
        assert.equal((error as { errorCode: string }).errorCode, "VALIDATION_ERROR");
        assert.match((error as Error).message, /missing README\.md/);
        assert.match((error as Error).message, /tasks\/alpha\/README\.md/);
        return true;
      },
    );
    await assert.rejects(
      () => getProject(domainBoard(repo), "alpha", writer),
      (error: unknown) => {
        assert.equal((error as { errorCode: string }).errorCode, "VALIDATION_ERROR");
        assert.match((error as Error).message, /missing README\.md/);
        assert.match((error as Error).message, /tasks\/alpha\/README\.md/);
        return true;
      },
    );
    assert.equal(await readFile(path.join(repo, "tasks/alpha/AGENTS.md"), "utf8"), alphaAgents);
    assert.equal(await readFile(path.join(repo, "tasks/beta/AGENTS.md"), "utf8"), betaAgents);
    await assert.rejects(access(path.join(repo, "tasks/alpha/README.md")));
    await assert.rejects(access(path.join(repo, "tasks/beta/README.md")));
    await assert.rejects(access(path.join(repo, "tasks/_default/README.md")));
    await assert.rejects(access(path.join(repo, "tasks/README.md")));
    assert.equal(await readFile(board, "utf8"), before);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("README Task Projects are discovered, read and updated; a user-initialised AGENTS project stays a system entry", async () => {
  const repo = await virginRepo();
  try {
    const writer = nodeBoardWriter();
    await createProject(domainBoard(repo), { project: "cli", title: "CLI", description: "edges CLI work" }, writer);
    const board = path.join(repo, "tasks/AGENTS.md");
    // This case intentionally covers a user-initialised legacy system entry.
    await writeFile(board, "# Tasks\n\n<!-- project-harness-local:start -->\n## 本层系统维护信息\n\n<!-- project-harness-local:end -->\n");
    await writeFile(path.join(repo, "tasks/legacy/AGENTS.md"), renderProjectAgents({ title: "Legacy", description: "legacy work" }));
    await fixtureRawWriteFile(
      board,
      (await readFile(board, "utf8")).replace("<!-- project-harness-local:end -->", "- [Legacy](legacy/AGENTS.md) — legacy work\n<!-- project-harness-local:end -->"),
    );

    const listed = await listProjects(domainBoard(repo), writer);
    assert.deepEqual(listed.map((item) => [item.project, path.basename(item.path)]).sort(), [
      ["cli", "README.md"],
      ["default", "README.md"],
    ]);
    await assert.rejects(
      () => getProject(domainBoard(repo), "legacy", writer),
      (error: unknown) => {
        assert.equal((error as { errorCode: string }).errorCode, "VALIDATION_ERROR");
        assert.match((error as Error).message, /missing README\.md/);
        assert.match((error as Error).message, /tasks\/legacy\/README\.md/);
        return true;
      },
    );
    const got = await getProject(domainBoard(repo), "cli", writer);
    assert.equal(got.title, "CLI");
    assert.equal(got.description, "edges CLI work");
    assert.equal(got.path, "tasks/cli/README.md");

    const updated = await updateProject(domainBoard(repo), "cli", { description: "updated CLI" }, writer);
    assert.equal(updated.path, "tasks/cli/README.md");
    const readme = await readFile(path.join(repo, "tasks/cli/README.md"), "utf8");
    assert.match(readme, /^# CLI\n\nupdated CLI\n/);
    assert.match(readme, /<!-- project-entries-local:start -->\n## 本层内容\n/);
    await assert.rejects(access(path.join(repo, "tasks/cli/AGENTS.md")));

    const legacyAgentsBefore = await readFile(path.join(repo, "tasks/legacy/AGENTS.md"), "utf8");
    const listBefore = await readFile(path.join(repo, "tasks/README.md"), "utf8");
    await assert.rejects(
      () => updateProject(domainBoard(repo), "legacy", { description: "legacy v2" }, writer),
      (error: unknown) => {
        assert.equal((error as { errorCode: string }).errorCode, "VALIDATION_ERROR");
        assert.match((error as Error).message, /missing README\.md/);
        assert.match((error as Error).message, /tasks\/legacy\/README\.md/);
        return true;
      },
    );
    assert.equal(await readFile(path.join(repo, "tasks/legacy/AGENTS.md"), "utf8"), legacyAgentsBefore);
    await assert.rejects(access(path.join(repo, "tasks/legacy/README.md")));
    const agentsBoard = await readFile(board, "utf8");
    assert.match(agentsBoard, /\[Legacy\]\(<?legacy\/AGENTS\.md>?\) — legacy work/);
    const list = await readFile(path.join(repo, "tasks/README.md"), "utf8");
    assert.equal(list, listBefore);
    assert.match(list, /cli\/README\.md>?\) — updated CLI/);
    assert.doesNotMatch(list, /legacy\/README\.md/);

    await assert.rejects(
      createProject(domainBoard(repo), { project: "cli", title: "X", description: "dup" }, writer),
      /project already exists/,
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("maintenance board: CLI-created project is a README org list and never gets a seed AGENTS", async () => {
  const { run } = await import("../../src/program.js");
  const repo = await mkdtemp(path.join(realpathSync(tmpdir()), "edges-project-readme-"));
  try {
    await seedMaintenanceScope(repo);
    const env = { EDGES_SCOPE: repo };
    const args = ["tasks"];
    assert.equal((await run([...args, "create", "--title", "Fresh", "--project", "cli"], { env })).exitCode, 0);
    const dir = path.join(repo, ".harness/tasks/cli");
    await assert.rejects(access(path.join(dir, "AGENTS.md")));

    const listResult = await run([...args, "project", "list"], { env });
    assert.equal(listResult.exitCode, 0, listResult.stdout + listResult.stderr);
    const listed = JSON.parse(listResult.stdout);
    const cli = listed.projects.find((p: any) => p.project === "cli");
    assert.equal(cli.path, ".harness/tasks/cli/README.md");
    const updated = await run([...args, "project", "update", "cli", "--description", "d2"], { env });
    assert.equal(updated.exitCode, 0, updated.stdout);
    await assert.rejects(access(path.join(dir, "AGENTS.md")));
    assert.match(await readFile(path.join(dir, "README.md"), "utf8"), /^# [^\n]+\n\nd2\n/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
