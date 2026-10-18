import { writeIndexedTaskFixture as writeFile } from "./helpers.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { domainBoard, nodeBoardFs } from "./helpers.js";
import { listTasks, getTask } from "../../../src/services/tasks/board.js";

async function seed() {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  const dir = path.join(repo, "tasks/_default/todo");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "2026-09-13--demo/index.md"),
    `---
name: demo
description: demo task
metadata:
  edges-type: task
  edges-title: demo task
  edges-tasks-status: todo
---

body
`,
    "utf8",
  );
  await writeFile(
    path.join(dir, "2026-09-13--demo/.2026-09-13--demo.log.md"),
    `# Run log: 2026-09-13--demo

| # | agent | started_at | ended_at | status | error_code |
|---|---|---|---|---|---|
| 1 | Agent | 2026-09-13T01:00:00Z |  | running |  |
`,
    "utf8",
  );
  await mkdir(path.join(repo, "tasks/.memory"), { recursive: true });
  await writeFile(path.join(repo, "tasks/AGENTS.md"), "# tasks\n", "utf8");
  return repo;
}

test("listTasks returns todo item and ignores AGENTS.md / .memory", async () => {
  const repo = await seed();
  try {
    const items = await listTasks(domainBoard(repo), {}, nodeBoardFs());
    assert.equal(items.length, 1);
    assert.equal(items[0]?.stem, "2026-09-13--demo");
    assert.equal(items[0]?.status, "todo");
    assert.equal(items[0]?.runCount, 1);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks --status backlog is empty when only todo exists", async () => {
  const repo = await seed();
  try {
    const items = await listTasks(domainBoard(repo), { status: "backlog" }, nodeBoardFs());
    assert.equal(items.length, 0);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("getTask by stem and by path", async () => {
  const repo = await seed();
  try {
    const byStem = await getTask(domainBoard(repo), "2026-09-13--demo", nodeBoardFs());
    const byPath = await getTask(
      domainBoard(repo),
      "tasks/_default/todo/2026-09-13--demo/index.md",
      nodeBoardFs(),
    );
    assert.equal(byStem.body.trim(), "body");
    assert.equal(byPath.stem, "2026-09-13--demo");
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("getTask by old layout path is TASK_NOT_FOUND", async () => {
  const repo = await seed();
  try {
    await getTask(domainBoard(repo), "tasks/todo/2026-09-13--demo/index.md", nodeBoardFs());
    assert.fail("expected throw");
  } catch (error) {
    assert.equal((error as { errorCode: string }).errorCode, "TASK_NOT_FOUND");
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("getTask missing stem is TASK_NOT_FOUND", async () => {
  const repo = await seed();
  try {
    await getTask(domainBoard(repo), "nope", nodeBoardFs());
    assert.fail("expected throw");
  } catch (error) {
    assert.equal((error as { errorCode: string }).errorCode, "TASK_NOT_FOUND");
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks and getTask expose priority none when the field is missing", async () => {
  const repo = await seed();
  try {
    const items = await listTasks(domainBoard(repo), {}, nodeBoardFs());
    assert.equal(items[0]?.priority, "none");
    const got = await getTask(domainBoard(repo), "2026-09-13--demo", nodeBoardFs());
    assert.equal(got.priority, "none");
    assert.equal(got.metadata["edges-task-priority"], undefined);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks and getTask expose project default when field is missing under _default", async () => {
  const repo = await seed();
  try {
    const items = await listTasks(domainBoard(repo), {}, nodeBoardFs());
    assert.equal(items[0]?.project, "default");
    const got = await getTask(domainBoard(repo), "2026-09-13--demo", nodeBoardFs());
    assert.equal(got.project, "default");
    assert.equal(got.metadata["edges-task-project"], undefined);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks sees named project dirs and ignores root status folders", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const named = path.join(repo, "tasks/cli/backlog");
    const legacy = path.join(repo, "tasks/backlog");
    await mkdir(named, { recursive: true });
    await mkdir(legacy, { recursive: true });
    await writeFile(
      path.join(named, "2026-09-16--named/index.md"),
      `---
name: named
description: named
metadata:
  edges-type: task
  edges-title: named
  edges-tasks-status: backlog
  edges-task-project: cli
---

body
`,
      "utf8",
    );
    await writeFile(
      path.join(legacy, "2026-09-16--legacy/index.md"),
      `---
name: legacy
description: legacy
metadata:
  edges-type: task
  edges-title: legacy
  edges-tasks-status: backlog
---

body
`,
      "utf8",
    );
    const items = await listTasks(domainBoard(repo), {}, nodeBoardFs());
    assert.equal(items.length, 1);
    assert.equal(items[0]?.stem, "2026-09-16--named");
    assert.equal(items[0]?.project, "cli");
    assert.equal(
      items[0]?.path,
      "tasks/cli/backlog/2026-09-16--named/index.md",
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks throws VALIDATION_ERROR on dual-write mismatch", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const dir = path.join(repo, "tasks/cli/todo");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "2026-09-16--drift/index.md"),
      `---
name: drift
description: drift
metadata:
  edges-type: task
  edges-title: drift
  edges-tasks-status: todo
  edges-task-project: other
---

body
`,
      "utf8",
    );
    try {
      await listTasks(domainBoard(repo), {}, nodeBoardFs());
      assert.fail("expected throw");
    } catch (error) {
      assert.equal(
        (error as { errorCode: string }).errorCode,
        "VALIDATION_ERROR",
      );
      assert.match((error as Error).message, /dual-write mismatch/);
    }
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks --project default OR cli filters after board walk", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    for (const spec of [
      {
        project: "default" as const,
        dir: "_default",
        field: "",
        stem: "2026-09-16--def",
      },
      {
        project: "cli",
        dir: "cli",
        field: "  edges-task-project: cli\n",
        stem: "2026-09-16--cli",
      },
      {
        project: "docs",
        dir: "docs",
        field: "  edges-task-project: docs\n",
        stem: "2026-09-16--docs",
      },
    ]) {
      const folder = path.join(repo, "tasks", spec.dir, "backlog");
      await mkdir(folder, { recursive: true });
      await writeFile(
        path.join(folder, `${spec.stem}/index.md`),
        `---
name: ${spec.stem}
description: ${spec.stem}
metadata:
  edges-type: task
  edges-title: ${spec.stem}
  edges-tasks-status: backlog
${spec.field}---

body
`,
        "utf8",
      );
    }
    const filtered = await listTasks(
      domainBoard(repo),
      { projects: ["default", "cli"] },
      nodeBoardFs(),
    );
    assert.deepEqual(
      filtered.map((item) => `${item.project}:${item.stem}`),
      ["default:2026-09-16--def", "cli:2026-09-16--cli"],
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks and getTask expose written edges-task-priority", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const dir = path.join(repo, "tasks/_default/backlog");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "2026-09-16--hot/index.md"),
      `---
name: hot
description: hot
metadata:
  edges-type: task
  edges-title: hot
  edges-tasks-status: backlog
  edges-task-priority: urgent
---

body
`,
      "utf8",
    );
    const items = await listTasks(domainBoard(repo), {}, nodeBoardFs());
    assert.equal(items[0]?.priority, "urgent");
    const got = await getTask(domainBoard(repo), "2026-09-16--hot", nodeBoardFs());
    assert.equal(got.priority, "urgent");
    assert.equal(got.metadata["edges-task-priority"], "urgent");
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks rejects invalid priority in a registered Task", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  try {
    const dir = path.join(repo, "tasks/_default/todo");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "2026-09-16--legacy/index.md"),
      `---
name: legacy
description: legacy
metadata:
  edges-type: task
  edges-title: legacy
  edges-tasks-status: todo
  edges-task-priority: P0
---

body
`,
      "utf8",
    );
    await assert.rejects(listTasks(domainBoard(repo), {}, nodeBoardFs()), /Invalid edges-task-priority: P0/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

async function seedPriorities() {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-tasks-"));
  const docs: Array<{
    status: "backlog" | "todo";
    stem: string;
    priorityLine: string;
  }> = [
    { status: "backlog", stem: "2026-09-16--none-one", priorityLine: "" },
    {
      status: "backlog",
      stem: "2026-09-16--high-one",
      priorityLine: "  edges-task-priority: high\n",
    },
    {
      status: "todo",
      stem: "2026-09-16--urgent-one",
      priorityLine: "  edges-task-priority: urgent\n",
    },
    {
      status: "todo",
      stem: "2026-09-16--high-two",
      priorityLine: "  edges-task-priority: high\n",
    },
    {
      status: "todo",
      stem: "2026-09-16--low-one",
      priorityLine: "  edges-task-priority: low\n",
    },
  ];
  for (const doc of docs) {
    const dir = path.join(repo, "tasks/_default", doc.status);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, `${doc.stem}/index.md`),
      `---
name: ${doc.stem}
description: ${doc.stem}
metadata:
  edges-type: task
  edges-title: ${doc.stem}
  edges-tasks-status: ${doc.status}
${doc.priorityLine}---

body
`,
      "utf8",
    );
  }
  return repo;
}

test("listTasks default order is board walk not priority", async () => {
  const repo = await seedPriorities();
  try {
    const items = await listTasks(domainBoard(repo), {}, nodeBoardFs());
    const stems = items.map((item) => item.stem);
    const backlog = stems.slice(0, 2);
    const todo = stems.slice(2);
    assert.deepEqual(
      new Set(backlog),
      new Set(["2026-09-16--none-one", "2026-09-16--high-one"]),
    );
    assert.deepEqual(
      new Set(todo),
      new Set([
        "2026-09-16--urgent-one",
        "2026-09-16--high-two",
        "2026-09-16--low-one",
      ]),
    );
    assert.notEqual(stems[0], "2026-09-16--urgent-one");
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks --sort priority is urgent to none and stable", async () => {
  const repo = await seedPriorities();
  try {
    const items = await listTasks(domainBoard(repo), { sort: "priority" }, nodeBoardFs());
    assert.deepEqual(
      items.map((item) => `${item.priority}:${item.stem}`),
      [
        "urgent:2026-09-16--urgent-one",
        "high:2026-09-16--high-one",
        "high:2026-09-16--high-two",
        "low:2026-09-16--low-one",
        "none:2026-09-16--none-one",
      ],
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("listTasks repeatable --priority is OR and ANDs with --status", async () => {
  const repo = await seedPriorities();
  try {
    const or = await listTasks(
      domainBoard(repo),
      { priorities: ["urgent", "high"] },
      nodeBoardFs(),
    );
    const orStems = or.map((item) => item.stem);
    assert.deepEqual(
      new Set(orStems),
      new Set([
        "2026-09-16--high-one",
        "2026-09-16--urgent-one",
        "2026-09-16--high-two",
      ]),
    );
    assert.equal(orStems[0], "2026-09-16--high-one");
    assert.notEqual(orStems[0], "2026-09-16--urgent-one");
    const and = await listTasks(
      domainBoard(repo),
      { status: "todo", priorities: ["high"] },
      nodeBoardFs(),
    );
    assert.deepEqual(
      and.map((item) => item.stem),
      ["2026-09-16--high-two"],
    );
    const none = await listTasks(domainBoard(repo), { priorities: ["none"] }, nodeBoardFs());
    assert.deepEqual(
      none.map((item) => item.stem),
      ["2026-09-16--none-one"],
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
