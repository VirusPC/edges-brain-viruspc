import test from "node:test";
import assert from "node:assert/strict";
import {
  access,
  realpath,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { migrateLegacyBoard } from "../../../src/services/tasks/migrate.js";
import { listTasks } from "../../../src/services/tasks/board.js";
import { domainBoard, nodeBoardFs, nodeBoardWriter } from "./helpers.js";

test("migrateLegacyBoard moves Task + hidden sidecar and removes root status dirs", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const backlog = path.join(repo, "tasks/backlog");
    const done = path.join(repo, "tasks/done");
    await mkdir(backlog, { recursive: true });
    await mkdir(done, { recursive: true });
    await mkdir(path.join(repo, "tasks/.memory"), { recursive: true });
    await writeFile(path.join(repo, "tasks/AGENTS.md"), "# tasks\n", "utf8");
    await writeFile(path.join(repo, "tasks/README.md"), "# board\n", "utf8");
    await writeFile(
      path.join(backlog, "2026-09-16--open.md"),
      `---
name: open
description: open
metadata:
  edges-type: task
  edges-title: open
  edges-tasks-status: backlog
---

body
`,
      "utf8",
    );
    await writeFile(
      path.join(backlog, ".2026-09-16--open.log.md"),
      "# Run log: 2026-09-16--open\n",
      "utf8",
    );
    await writeFile(
      path.join(done, "2026-09-16--closed.md"),
      `---
name: closed
description: closed
metadata:
  edges-type: task
  edges-title: closed
  edges-tasks-status: done
---

body
`,
      "utf8",
    );
    const result = await migrateLegacyBoard(domainBoard(repo), nodeBoardWriter());
    assert.equal(result.moved, 3);
    assert.deepEqual(
      new Set(result.removedStatusDirs),
      new Set(["backlog", "done"]),
    );
    await access(path.join(repo, "tasks/_default/backlog/2026-09-16--open.md"));
    await access(
      path.join(repo, "tasks/_default/backlog/.2026-09-16--open.log.md"),
    );
    await access(path.join(repo, "tasks/_default/done/2026-09-16--closed.md"));
    await assert.rejects(access(backlog));
    await assert.rejects(access(done));
    const agents = await readFile(path.join(repo, "tasks/AGENTS.md"), "utf8");
    assert.equal(agents, "# tasks\n");
    await access(path.join(repo, "tasks/.memory"));
    const { execFileSync } = await import("node:child_process");
    const { planDirectoryMigration, applyDirectoryMigration } =
      await import("../../../../../scripts/migrate-directory-nodes.mjs");
    execFileSync("git", ["init", "-q"], { cwd: repo });
    execFileSync("git", ["add", "."], { cwd: repo });
    applyDirectoryMigration(planDirectoryMigration(repo));
    // Legacy layout migration and registered-index migration are separate explicit steps.
    const { planTaskIndexes, applyTaskIndexes } = await import("../../../src/services/tasks/index-migration.js");
    await writeFile(path.join(repo, "AGENTS.md"), "# Scope\n");
    await applyTaskIndexes(await planTaskIndexes(await realpath(repo)));
    const items = await listTasks(domainBoard(repo), {}, nodeBoardFs());
    assert.deepEqual(
      items.map((item) => `${item.project}:${item.status}:${item.stem}`).sort(),
      ["default:backlog:2026-09-16--open", "default:done:2026-09-16--closed"],
    );
    const open = await readFile(
      path.join(repo, "tasks/_default/backlog/2026-09-16--open/index.md"),
      "utf8",
    );
    assert.doesNotMatch(open, /edges-task-project/);
    const again = await migrateLegacyBoard(domainBoard(repo), nodeBoardWriter());
    assert.equal(again.moved, 0);
    assert.deepEqual(again.removedStatusDirs, []);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("migrateLegacyBoard refuses dest collision and unexpected subdirectory", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const legacy = path.join(repo, "tasks/todo");
    const dest = path.join(repo, "tasks/_default/todo");
    await mkdir(legacy, { recursive: true });
    await mkdir(dest, { recursive: true });
    await writeFile(
      path.join(legacy, "2026-09-16--dup.md"),
      "legacy\n",
      "utf8",
    );
    await writeFile(path.join(dest, "2026-09-16--dup.md"), "kept\n", "utf8");
    await assert.rejects(
      () => migrateLegacyBoard(domainBoard(repo), nodeBoardWriter()),
      (error: unknown) =>
        (error as { errorCode: string }).errorCode === "BOARD_IO_ERROR",
    );
    assert.equal(
      await readFile(path.join(dest, "2026-09-16--dup.md"), "utf8"),
      "kept\n",
    );
    await rm(path.join(dest, "2026-09-16--dup.md"));
    await mkdir(path.join(legacy, "nested"), { recursive: true });
    await assert.rejects(
      () => migrateLegacyBoard(domainBoard(repo), nodeBoardWriter()),
      (error: unknown) => {
        const err = error as { errorCode: string; message: string };
        return (
          err.errorCode === "BOARD_IO_ERROR" &&
          /unexpected subdirectory/.test(err.message)
        );
      },
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("migrateLegacyBoard rmdirs empty root status folders", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    await mkdir(path.join(repo, "tasks/blocked"), { recursive: true });
    const result = await migrateLegacyBoard(domainBoard(repo), nodeBoardWriter());
    assert.equal(result.moved, 0);
    assert.deepEqual(result.removedStatusDirs, ["blocked"]);
    const names = await readdir(path.join(repo, "tasks"));
    assert.equal(names.includes("blocked"), false);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
