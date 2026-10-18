import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, realpath } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTask, updateTask } from "../../src/services/tasks/write.js";
import {
  getTask,
  listProjectIds,
  listRepositoryTasksWithDocs,
  listTasks,
  relativePathInsideScope,
  useTaskBoardRealpathForTests,
  type BoardFs,
} from "../../src/services/tasks/board.js";
import { listRepositoryGroupedByProject } from "../../src/services/tasks/grouped.js";
import { domainBoard, nodeBoardFs, nodeBoardWriter, writeFixtureIndex, type BoardWriter } from "./utils/helpers.js";
import { TasksError } from "../../src/domain/models/tasks/types.js";
import { run } from "../../src/program.js";
import type { BoardTarget } from "../../src/services/tasks/paths.js";

// Linux test hosts are case-sensitive, so a differently cased --scope path does not exist.
// The board realpath seam stands in for macOS: JS realpath keeps the caller's casing,
// native realpath returns the directory spelling. path.relative is case-sensitive and
// turns that mismatch into a ".." path.
function flipCase(value: string): string {
  const flipped = [...value]
    .map((char) => {
      const upper = char.toUpperCase();
      return char === upper ? char.toLowerCase() : upper;
    })
    .join("");
  if (flipped === value) throw new Error(`cannot simulate a casing alias for ${value}`);
  return flipped;
}

function callerCasing(resolved: string, repo: string, callerRoot: string): string {
  if (resolved === repo) return callerRoot;
  const prefix = repo + path.sep;
  return resolved.startsWith(prefix) ? callerRoot + resolved.slice(repo.length) : resolved;
}

async function withAliasedScope(
  title: string,
  mode: "domain" | "maintenance",
  runCase: (ctx: {
    repo: string;
    board: BoardTarget;
    fs: BoardFs;
    writer: BoardWriter;
    stem: string;
    wanted: string;
    projectPath: string;
  }) => Promise<void>,
): Promise<void> {
  const repo = await realpath(await mkdtemp(path.join(tmpdir(), "edges-scope-case-")));
  const callerRoot = path.join(path.dirname(repo), flipCase(path.basename(repo)));
  const fs = nodeBoardFs();
  const writer = nodeBoardWriter();
  const board: BoardTarget = mode === "domain" ? domainBoard(repo) : repo;
  try {
    const statusParent = mode === "domain"
      ? path.join(repo, "tasks/_default/todo")
      : path.join(repo, ".harness/tasks/_default/todo");
    await mkdir(statusParent, { recursive: true });
    const created = await createTask(
      board,
      { title, status: "todo" },
      { fs: writer, now: new Date(2026, 9, 11, 12, 0, 0) },
    );
    const wanted = mode === "domain"
      ? `tasks/_default/todo/${created.stem}/INDEX.md`
      : `.harness/tasks/_default/todo/${created.stem}/INDEX.md`;
    const projectPath = mode === "domain"
      ? "tasks/_default/README.md"
      : ".harness/tasks/_default/README.md";
    assert.equal(created.path, wanted);
    assert.ok(
      path.relative(callerRoot, path.join(repo, wanted)).startsWith(".."),
      "the casing alias must be one path.relative would escape",
    );
    useTaskBoardRealpathForTests({
      javascript: (target) => callerCasing(realpathSync(target), repo, callerRoot),
      native: (target) => realpathSync.native(target),
    });
    await runCase({ repo, board, fs, writer, stem: created.stem, wanted, projectPath });
  } finally {
    useTaskBoardRealpathForTests();
    await rm(repo, { recursive: true, force: true });
  }
}

test("scope casing alias keeps listed task paths inside the scope", async () => {
  await withAliasedScope("Scope case", "domain", async ({ board, fs, writer, stem, wanted }) => {
    const items = await listTasks(board, {}, fs);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.path, wanted);
    assert.equal(items[0]?.path.includes(".."), false);
    assert.equal(items[0]?.sidecarPath, `tasks/_default/todo/${stem}/.${stem}.log.md`);

    const fetched = await getTask(board, items[0]!.path, fs);
    assert.equal(fetched.stem, stem);
    assert.equal(fetched.title, "Scope case");

    const updated = await updateTask(
      board,
      items[0]!.path,
      { title: "Scope case renamed" },
      { fs: writer, now: new Date(2026, 9, 11, 13, 0, 0) },
    );
    assert.equal(updated.path, wanted);
    const again = await getTask(board, updated.path, fs);
    assert.equal(again.title, "Scope case renamed");
  });
});

test("scope casing alias still finds a task by stem", async () => {
  await withAliasedScope("Stem case", "domain", async ({ board, fs, stem, wanted }) => {
    const fetched = await getTask(board, stem, fs);
    assert.equal(fetched.stem, stem);
    assert.equal(fetched.path, wanted);
    assert.equal(fetched.path.includes(".."), false);
  });
});

test("repository list keeps task paths inside a casing-aliased root", async () => {
  await withAliasedScope("Repo case", "domain", async ({ repo, stem, wanted }) => {
    await writeFixtureIndex(path.join(repo, "AGENTS.md"), ["tasks/README.md"]);
    const rows = await listRepositoryTasksWithDocs(repo);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.stem, stem);
    assert.equal(rows[0]?.path, wanted);
    assert.equal(rows[0]?.path.includes(".."), false);
    assert.equal(rows[0]?.sidecarPath.includes(".."), false);
    assert.equal(rows[0]?.sidecarPath, `tasks/_default/todo/${stem}/.${stem}.log.md`);
  });
});

test("project ids stay visible under a scope casing alias", async () => {
  await withAliasedScope("Project case", "domain", async ({ board, fs }) => {
    const ids = await listProjectIds(board, fs);
    assert.ok(ids.includes("default"));
  });
});

test("grouped repository list keeps task paths inside a casing-aliased root", async () => {
  await withAliasedScope("Grouped case", "domain", async ({ repo, stem, wanted }) => {
    await writeFixtureIndex(path.join(repo, "AGENTS.md"), ["tasks/README.md"]);
    const grouped = await listRepositoryGroupedByProject(repo);
    const item = grouped.items.find((row) => row.stem === stem);
    assert.ok(item);
    assert.equal(item?.path, wanted);
    assert.equal(item?.path.includes(".."), false);
  });
});

test("maintenance scope casing alias keeps default list, get, and project paths inside the scope", async () => {
  await withAliasedScope("Maintenance case", "maintenance", async ({ repo, stem, wanted, projectPath }) => {
    await writeFixtureIndex(path.join(repo, "AGENTS.md"), [".harness/tasks/README.md"]);
    const env = { EDGES_SCOPE: repo };
    const listed = await run(["tasks", "list"], { env });
    assert.equal(listed.exitCode, 0, listed.stdout + listed.stderr);
    const tasks = JSON.parse(listed.stdout).tasks as Array<{ path: string; stem: string }>;
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0]?.stem, stem);
    assert.equal(tasks[0]?.path, wanted);
    assert.equal(tasks[0]?.path.includes(".."), false);

    const fetched = await run(["tasks", "get", stem], { env });
    assert.equal(fetched.exitCode, 0, fetched.stdout + fetched.stderr);
    assert.equal(JSON.parse(fetched.stdout).task.path, wanted);

    const projects = await run(["tasks", "project", "list"], { env });
    assert.equal(projects.exitCode, 0, projects.stdout + projects.stderr);
    const rows = JSON.parse(projects.stdout).projects as Array<{ path: string; project: string }>;
    assert.equal(rows.find((row) => row.project === "default")?.path, projectPath);
    assert.equal(rows.some((row) => row.path.includes("..")), false);
  });
});

test("domain scope casing alias keeps super list, all, get, update, and project paths inside the scope", async () => {
  await withAliasedScope("Command case", "domain", async ({ repo, stem, wanted, projectPath }) => {
    await writeFixtureIndex(path.join(repo, "AGENTS.md"), ["tasks/README.md"]);
    const env = { EDGES_SCOPE: repo };
    const listed = await run(["--super", "tasks", "list"], { env });
    assert.equal(listed.exitCode, 0, listed.stdout + listed.stderr);
    const tasks = JSON.parse(listed.stdout).tasks as Array<{ path: string }>;
    assert.equal(tasks.find((row) => row.path === wanted)?.path, wanted);
    assert.equal(tasks.some((row) => row.path.includes("..")), false);

    const all = await run(["--all", "tasks", "list"], { env });
    assert.equal(all.exitCode, 0, all.stdout + all.stderr);
    const allTasks = JSON.parse(all.stdout).tasks as Array<{ path: string; stem: string }>;
    assert.equal(allTasks.find((row) => row.stem === stem)?.path, wanted);
    assert.equal(allTasks.some((row) => row.path.includes("..")), false);

    const fetched = await run(["--super", "tasks", "get", wanted], { env });
    assert.equal(fetched.exitCode, 0, fetched.stdout + fetched.stderr);
    assert.equal(JSON.parse(fetched.stdout).task.path, wanted);

    const updated = await run(["--super", "tasks", "update", stem, "--title", "Command case renamed"], { env });
    assert.equal(updated.exitCode, 0, updated.stdout + updated.stderr);
    assert.equal(JSON.parse(updated.stdout).path, wanted);

    const projects = await run(["--super", "tasks", "project", "list"], { env });
    assert.equal(projects.exitCode, 0, projects.stdout + projects.stderr);
    const rows = JSON.parse(projects.stdout).projects as Array<{ path: string; project: string }>;
    assert.equal(rows.find((row) => row.project === "default")?.path, projectPath);
    assert.equal(rows.some((row) => row.path.includes("..")), false);
  });
});

test("matching scope spelling stays a relative path inside the scope", () => {
  assert.equal(
    relativePathInsideScope(
      "/repo/Scope",
      "/repo/Scope/tasks/_default/todo/stem/INDEX.md",
    ),
    "tasks/_default/todo/stem/INDEX.md",
  );
});

test("a task path outside the scope is rejected instead of returned as ..", () => {
  assert.throws(
    () =>
      relativePathInsideScope(
        "/repo/Scope",
        "/other/tasks/_default/todo/stem/INDEX.md",
      ),
    (error: unknown) => error instanceof TasksError && error.errorCode === "VALIDATION_ERROR",
  );
});

test("mixed realpath casing cannot bypass the scope check", () => {
  assert.throws(
    () =>
      relativePathInsideScope(
        "/repo/scope",
        "/repo/Scope/tasks/_default/todo/stem/INDEX.md",
      ),
    (error: unknown) => error instanceof TasksError && error.errorCode === "VALIDATION_ERROR",
  );
});
