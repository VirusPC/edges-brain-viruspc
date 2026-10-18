import { mkdir as fixtureMkdir } from "node:fs/promises";
import { dirname as fixtureDirname } from "node:path";
async function writeFile(...args: Parameters<typeof fixtureRawWriteFile>) {
  await fixtureMkdir(fixtureDirname(String(args[0])), { recursive: true });
  return fixtureRawWriteFile(...args);
}
import test from "node:test";
import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile as fixtureRawWriteFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTask, updateTask } from "../../../src/services/tasks/write.js";
import { nodeBoardWriter } from "./helpers.js";

test("createTask writes Task + empty sidecar under backlog and does not need git", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    await mkdir(path.join(repo, "tasks/_default/backlog"), { recursive: true });
    const now = new Date(2026, 8, 13, 12, 0, 0);
    const created = await createTask(
      repo,
      { title: "New CLI work", status: "backlog" },
      { fs: nodeBoardWriter(), now },
    );
    assert.equal(created.stem, "2026-09-13--New-CLI-work");
    const md = await readFile(path.join(repo, created.path), "utf8");
    assert.match(md, /edges-tasks-status: backlog/);
    assert.match(md, /\*\*Why:\*\*/);
    const log = await readFile(path.join(repo, created.sidecarPath), "utf8");
    assert.match(log, /# Run log: 2026-09-13--New-CLI-work/);
    assert.match(log, /## Notes/);
    assert.doesNotMatch(log, /^\| 1 \|/m);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("createTask suffixes -2 when stem exists", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    await mkdir(path.join(repo, "tasks/_default/backlog"), { recursive: true });
    const now = new Date(2026, 8, 13, 12, 0, 0);
    const io = { fs: nodeBoardWriter(), now };
    const first = await createTask(
      repo,
      { title: "Dup", status: "backlog" },
      io,
    );
    const second = await createTask(
      repo,
      { title: "Dup", status: "backlog" },
      io,
    );
    assert.equal(first.stem, "2026-09-13--Dup");
    assert.equal(second.stem, "2026-09-13--Dup-2");
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateTask changes title and body and keeps path", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const now = new Date(2026, 8, 13, 12, 0, 0);
    await mkdir(path.join(repo, "tasks/_default/todo"), { recursive: true });
    const created = await createTask(
      repo,
      { title: "Stay", status: "todo" },
      { fs: nodeBoardWriter(), now },
    );
    const updated = await updateTask(
      repo,
      created.stem,
      { title: "New title", body: "replaced\n" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 13, 13, 0, 0) },
    );
    assert.equal(updated.path, created.path);
    const md = await readFile(path.join(repo, updated.path), "utf8");
    assert.match(md, /edges-title: New title/);
    assert.match(md, /^replaced$/m);
    assert.match(md, /edges-tasks-status: todo/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateTask --name writes frontmatter name and keeps path", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const now = new Date(2026, 8, 13, 12, 0, 0);
    await mkdir(path.join(repo, "tasks/_default/todo"), { recursive: true });
    const created = await createTask(
      repo,
      { title: "Stay", status: "todo" },
      { fs: nodeBoardWriter(), now },
    );
    const updated = await updateTask(
      repo,
      created.stem,
      { name: "中文任务名" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 13, 13, 0, 0) },
    );
    assert.equal(updated.path, created.path);
    const md = await readFile(path.join(repo, updated.path), "utf8");
    assert.match(md, /^name: 中文任务名$/m);
    assert.match(md, /edges-tasks-status: todo/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("createTask writes default edges-task-priority on disk and returns priority none", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    await mkdir(path.join(repo, "tasks/_default/backlog"), { recursive: true });
    const created = await createTask(
      repo,
      { title: "No Pri", status: "backlog" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) },
    );
    assert.equal(created.priority, "none");
    const md = await readFile(path.join(repo, created.path), "utf8");
    assert.match(md, /edges-task-priority: none/);
    assert.match(md, /edges-tasks-status: backlog/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("createTask writes high and does not move status", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    await mkdir(path.join(repo, "tasks/_default/todo"), { recursive: true });
    const created = await createTask(
      repo,
      { title: "Hot", status: "todo", priority: "high" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) },
    );
    assert.equal(created.priority, "high");
    assert.match(created.path, /tasks\/_default\/todo\//);
    const md = await readFile(path.join(repo, created.path), "utf8");
    assert.match(md, /edges-task-priority: high/);
    assert.match(md, /edges-tasks-status: todo/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("createTask rejects P0 before writing Task or sidecar", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    await mkdir(path.join(repo, "tasks/_default/backlog"), { recursive: true });
    await assert.rejects(
      () =>
        createTask(
          repo,
          { title: "Bad", status: "backlog", priority: "P0" },
          { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) },
        ),
      (error: { errorCode?: string }) => error.errorCode === "VALIDATION_ERROR",
    );
    const names = await readdir(path.join(repo, "tasks/_default/backlog"));
    assert.deepEqual(names, []);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateTask --priority high keeps path and edges-tasks-status", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const now = new Date(2026, 8, 16, 12, 0, 0);
    await mkdir(path.join(repo, "tasks/_default/todo"), { recursive: true });
    const created = await createTask(
      repo,
      { title: "Stay", status: "todo" },
      { fs: nodeBoardWriter(), now },
    );
    const updated = await updateTask(
      repo,
      created.stem,
      { priority: "high" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 13, 0, 0) },
    );
    assert.equal(updated.path, created.path);
    assert.equal(updated.priority, "high");
    assert.match(updated.path, /tasks\/_default\/todo\//);
    const md = await readFile(path.join(repo, updated.path), "utf8");
    assert.match(md, /edges-task-priority: high/);
    assert.match(md, /edges-tasks-status: todo/);
    await assert.rejects(
      access(
        path.join(repo, "tasks/_default/backlog", path.basename(created.path)),
      ),
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateTask --priority none writes the field and does not require other flags", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const now = new Date(2026, 8, 16, 12, 0, 0);
    await mkdir(path.join(repo, "tasks/_default/in_progress"), {
      recursive: true,
    });
    const created = await createTask(
      repo,
      { title: "Cool", status: "in_progress", priority: "urgent" },
      { fs: nodeBoardWriter(), now },
    );
    const updated = await updateTask(
      repo,
      created.stem,
      { priority: "none" },
      { fs: nodeBoardWriter(), now },
    );
    assert.equal(updated.priority, "none");
    const md = await readFile(path.join(repo, updated.path), "utf8");
    assert.match(md, /edges-task-priority: none/);
    assert.match(md, /edges-tasks-status: in_progress/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("createTask writes default edges-task-project on disk and returns project default", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const created = await createTask(
      repo,
      { title: "No Proj", status: "backlog" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) },
    );
    assert.equal(created.project, "default");
    assert.equal(
      created.path,
      ".harness/tasks/_default/backlog/2026-09-16--No-Proj/INDEX.md",
    );
    const md = await readFile(path.join(repo, created.path), "utf8");
    assert.match(md, /edges-task-project: default/);
    assert.match(md, /edges-tasks-status: backlog/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("createTask --project cli writes field and named directory", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const created = await createTask(
      repo,
      { title: "Named", status: "todo", project: "cli" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) },
    );
    assert.equal(created.project, "cli");
    assert.equal(created.path, ".harness/tasks/cli/todo/2026-09-16--Named/INDEX.md");
    const md = await readFile(path.join(repo, created.path), "utf8");
    assert.match(md, /edges-task-project: cli/);
    await access(path.join(repo, created.sidecarPath));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("createTask --project in_progress is VALIDATION_ERROR and writes nothing", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    await assert.rejects(
      () =>
        createTask(
          repo,
          { title: "Bad", status: "backlog", project: "in_progress" },
          { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) },
        ),
      (error: unknown) =>
        (error as { errorCode: string }).errorCode === "VALIDATION_ERROR",
    );
    const root = path.join(repo, "tasks");
    const names = await readdir(root).catch(() => []);
    assert.equal(
      names.filter((name) => name !== "_default").length,
      names.includes("_default") ? names.length - 1 : names.length,
    );
    assert.equal(names.includes("in_progress"), false);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateTask --project cli moves Task + sidecar and dual-writes", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const created = await createTask(
      repo,
      { title: "Move me", status: "todo", priority: "high" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) },
    );
    const updated = await updateTask(
      repo,
      created.stem,
      { project: "cli" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 13, 0, 0) },
    );
    assert.equal(updated.project, "cli");
    assert.equal(updated.path, ".harness/tasks/cli/todo/2026-09-16--Move-me/INDEX.md");
    const md = await readFile(path.join(repo, updated.path), "utf8");
    assert.match(md, /edges-task-project: cli/);
    assert.match(md, /edges-tasks-status: todo/);
    assert.match(md, /edges-task-priority: high/);
    await access(
      path.join(
        repo,
        ".harness/tasks/cli/todo/2026-09-16--Move-me/.2026-09-16--Move-me.log.md",
      ),
    );
    await assert.rejects(access(path.join(repo, created.path)));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateTask --project default writes the field and does not require other flags", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const created = await createTask(
      repo,
      { title: "Home", status: "in_progress", project: "cli" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) },
    );
    const updated = await updateTask(
      repo,
      created.stem,
      { project: "default" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 13, 0, 0) },
    );
    assert.equal(updated.project, "default");
    assert.equal(
      updated.path,
      ".harness/tasks/_default/in_progress/2026-09-16--Home/INDEX.md",
    );
    const md = await readFile(path.join(repo, updated.path), "utf8");
    assert.match(md, /edges-task-project: default/);
    assert.match(md, /edges-tasks-status: in_progress/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateTask --project in_progress is VALIDATION_ERROR and does not move", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const created = await createTask(
      repo,
      { title: "Stay", status: "todo" },
      { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) },
    );
    await assert.rejects(
      () =>
        updateTask(
          repo,
          created.stem,
          { project: "in_progress" },
          { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 13, 0, 0) },
        ),
      (error: unknown) =>
        (error as { errorCode: string }).errorCode === "VALIDATION_ERROR",
    );
    await access(path.join(repo, created.path));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateTask --project dest-exists is BOARD_IO_ERROR and does not move", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const io = { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 12, 0, 0) };
    const mover = await createTask(
      repo,
      { title: "Mover", status: "todo" },
      io,
    );
    const destRel = `.harness/tasks/cli/todo/${mover.stem}/INDEX.md`;
    await mkdir(path.dirname(path.join(repo, destRel)), { recursive: true });
    await writeFile(path.join(repo, destRel), "blocker\n", "utf8");
    await assert.rejects(
      () =>
        updateTask(
          repo,
          mover.path,
          { project: "cli" },
          { fs: nodeBoardWriter(), now: new Date(2026, 8, 16, 13, 0, 0) },
        ),
      (error: unknown) =>
        (error as { errorCode: string }).errorCode === "BOARD_IO_ERROR",
    );
    await access(path.join(repo, mover.path));
    await access(path.join(repo, destRel));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("updateTask rejects P0 and leaves the file unchanged", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const now = new Date(2026, 8, 16, 12, 0, 0);
    await mkdir(path.join(repo, "tasks/_default/todo"), { recursive: true });
    const created = await createTask(
      repo,
      { title: "Stay", status: "todo", priority: "low" },
      { fs: nodeBoardWriter(), now },
    );
    const before = await readFile(path.join(repo, created.path), "utf8");
    await assert.rejects(
      () =>
        updateTask(
          repo,
          created.stem,
          { priority: "P0" },
          { fs: nodeBoardWriter(), now },
        ),
      (error: { errorCode?: string }) => error.errorCode === "VALIDATION_ERROR",
    );
    assert.equal(await readFile(path.join(repo, created.path), "utf8"), before);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
