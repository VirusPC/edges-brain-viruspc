import assert from "node:assert/strict";
import { test } from "node:test";
import * as fs from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { AgentsNode, TaskNode } from "../../src/domain/models/index.js";
import {
  listTaskNodes,
  listRepositoryTaskNodes,
  taskLocationOf,
} from "../../src/services/tasks/node-query.js";
import { taskBoardLocation } from "../../src/services/tasks/paths.js";
import {
  getTask,
  listTasks,
  createNodeBoardFs,
  listProjectIds,
} from "../../src/services/tasks/board.js";

function fixture(t: { after(fn: () => void): void }) {
  const root = fs.mkdtempSync(
    path.join(fs.realpathSync(tmpdir()), "task-query-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (rel: string, contents: string) => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
    return file;
  };
  const index = (
    rel: string,
    children: string[],
    descendants: string[] = [],
  ) => {
    const file = path.join(root, rel);
    write(
      rel,
      new AgentsNode(file)
        .create(
          {
            localChildren: children.map((id) => ({
              id: path.resolve(path.dirname(file), id),
            })),
            descendantChildren: descendants.map((id) => ({
              id: path.resolve(path.dirname(file), id),
            })),
          },
          { operation: "create" },
        )
        .serialize(),
    );
  };
  const task = (rel: string, project = "default") =>
    write(
      rel,
      new TaskNode(path.join(root, rel))
        .create(
          {
            name: "Same",
            status: "todo",
            metadata: {
              metadata:
                project === "default" ? {} : { "edges-task-project": project },
            },
          },
          { operation: "create" },
        )
        .serialize(),
    );
  return { root, write, index, task };
}
test("board reads only registered tasks/projects and keeps stem ambiguity checks", async (t) => {
  const { root, index, task } = fixture(t);
  index("tasks/AGENTS.md", ["alpha/AGENTS.md", "empty/AGENTS.md"]);
  index("tasks/alpha/AGENTS.md", ["todo/same/index.md"]);
  index("tasks/empty/AGENTS.md", []);
  task("tasks/alpha/todo/same/index.md", "alpha");
  task("tasks/unregistered/todo/same/index.md", "unregistered");
  const target = taskBoardLocation(root, { super: true }),
    io = createNodeBoardFs(target);
  assert.deepEqual(await listProjectIds(target, io), ["alpha", "empty"]);
  assert.equal((await listTasks(target, {}, io)).length, 1);
  assert.equal((await getTask(target, "same", io)).project, "alpha");
  index("tasks/empty/AGENTS.md", ["todo/same/index.md"]);
  task("tasks/empty/todo/same/index.md", "empty");
  await assert.rejects(getTask(target, "same", io), /multiple/);
});
test("missing board is empty, existing unindexed board requests migration", async (t) => {
  const { root, write } = fixture(t);
  const target = taskBoardLocation(root, { super: true });
  assert.deepEqual(await listTaskNodes(target), []);
  write("tasks/_default/todo/old/index.md", "Old");
  const material = (await import("../../src/domain/config/harness-materials.js")).placeHarnessMaterial(root, "tasks", { super: true }).absPath;
  await assert.rejects(listTaskNodes(target), (error: Error) =>
    error.message.includes("Task board material missing") && error.message.includes(material));
});
test("repository includes every harness depth and physical origins despite aliases", async (t) => {
  const { root, index, task, write } = fixture(t);
  const entries = [
    "tasks/_default/todo/same/index.md",
    ".harness/tasks/_default/todo/same/index.md",
    "notes/example/.harness/tasks/_default/todo/same/index.md",
    "extensions/cli/.harness/tasks/_default/todo/same/index.md",
    "tasks/_default/todo/same/.harness/tasks/_default/todo/same/index.md",
    "tasks/_default/todo/same/.harness/tasks/_default/todo/same/.harness/tasks/_default/todo/same/index.md",
  ];
  for (const entry of entries) {
    const board = path.dirname(path.dirname(path.dirname(path.dirname(entry))));
    index(`${board}/AGENTS.md`, ["_default/AGENTS.md"]);
    index(`${board}/_default/AGENTS.md`, ["todo/same/index.md"]);
    task(entry);
  }
  index(
    "AGENTS.md",
    ["tasks/AGENTS.md", ".harness/tasks/AGENTS.md"],
    ["notes/example/index.md", "extensions/cli/AGENTS.md"],
  );
  index(".harness/AGENTS.md", ["tasks/AGENTS.md"]);
  write("notes/example/index.md", "---\nbad: [\n---\n");
  index("notes/example/AGENTS.md", [".harness/tasks/AGENTS.md"]);
  index("extensions/cli/AGENTS.md", [".harness/tasks/AGENTS.md"]);
  index("tasks/_default/todo/same/AGENTS.md", [".harness/tasks/AGENTS.md"]);
  index(
    "tasks/_default/todo/same/.harness/tasks/_default/todo/same/AGENTS.md",
    [".harness/tasks/AGENTS.md"],
  );
  assert.equal(
    (await listTaskNodes(taskBoardLocation(root, { super: true }))).length,
    1,
  );
  const all = await listRepositoryTaskNodes(root);
  assert.equal(all.length, 6);
  assert.equal(new Set(all.map((n) => n.path)).size, 6);
  assert.deepEqual(
    all
      .map((n) => taskLocationOf(n, root).source)
      .sort(
        (a, b) =>
          a.scope.localeCompare(b.scope) || a.purpose.localeCompare(b.purpose),
      ),
    [
      { scope: ".", purpose: "domain" },
      { scope: ".", purpose: "maintenance" },
      { scope: "extensions/cli", purpose: "maintenance" },
      { scope: "notes/example", purpose: "maintenance" },
      { scope: "tasks/_default/todo/same", purpose: "maintenance" },
      {
        scope: "tasks/_default/todo/same/.harness/tasks/_default/todo/same",
        purpose: "maintenance",
      },
    ],
  );
});

test("global grouped projection preserves empty indexed projects and separates same-stem sources", async (t) => {
  const { root, index, task, write } = fixture(t);
  index("AGENTS.md", [
    "tasks/AGENTS.md",
    ".harness/tasks/AGENTS.md",
    "categories/AGENTS.md",
  ]);
  index("categories/AGENTS.md", []);
  for (const board of ["tasks", ".harness/tasks"]) {
    index(`${board}/AGENTS.md`, ["_default/AGENTS.md", "empty/AGENTS.md"]);
    index(`${board}/_default/AGENTS.md`, ["todo/same/index.md"]);
    index(`${board}/empty/AGENTS.md`, []);
    // Project metadata uses its established heading and description positions.
    for (const name of ["_default", "empty"]) {
      const file = path.join(root, `${board}/${name}/AGENTS.md`);
      write(
        `${board}/${name}/AGENTS.md`,
        `# ${name}\n\nProject description\n\n` + fs.readFileSync(file, "utf8"),
      );
    }
    task(`${board}/_default/todo/same/index.md`);
  }
  const { listRepositoryGroupedByProject } = await import(
    "../../src/services/tasks/grouped.js"
  );
  const all = await listRepositoryGroupedByProject(root, {});
  assert.equal(all.groups.length, 4);
  assert.equal(all.items.length, 2);
  assert.equal(new Set(all.items.map((item) => item.id)).size, 2);
  assert.deepEqual(all.items.map((item) => item.source?.purpose).sort(), [
    "domain",
    "maintenance",
  ]);
});

test("explicit get rejects status metadata mismatch just like indexed lists", async (t) => {
  const { root, index, task, write } = fixture(t);
  index("tasks/AGENTS.md", ["_default/AGENTS.md"]);
  index("tasks/_default/AGENTS.md", ["todo/same/index.md"]);
  task("tasks/_default/todo/same/index.md");
  const file = path.join(root, "tasks/_default/todo/same/index.md");
  write(
    "tasks/_default/todo/same/index.md",
    fs
      .readFileSync(file, "utf8")
      .replace("edges-tasks-status: todo", "edges-tasks-status: done"),
  );
  const target = taskBoardLocation(root, { super: true }),
    io = createNodeBoardFs(target);
  await assert.rejects(listTasks(target, {}, io), /dual-write mismatch/);
  await assert.rejects(
    getTask(target, "tasks/_default/todo/same/index.md", io),
    /dual-write mismatch/,
  );
});

test("selected board rejects a registered reference into another board", async (t) => {
  const { root, index, task } = fixture(t);
  index("tasks/AGENTS.md", ["../.harness/tasks/_default/todo/same/index.md"]);
  task(".harness/tasks/_default/todo/same/index.md");
  await assert.rejects(
    listTaskNodes(taskBoardLocation(root, { super: true })),
    /outside selected task board/,
  );
});

test('board query grouping keeps chaining lazy and repeatable after operations migration', async t => {
  const {root, index, task} = fixture(t);
  index('tasks/AGENTS.md', ['_default/AGENTS.md']);
  index('tasks/_default/AGENTS.md', ['todo/same/index.md']);
  task('tasks/_default/todo/same/index.md');
  const { taskBoardQuery } = await import('../../src/services/tasks/node-query.js');
  const source = await taskBoardQuery(taskBoardLocation(root, { super: true }));
  let calls = 0;
  const chain = source.filter((node): node is TaskNode => node instanceof TaskNode)
    .map(node => {calls++; return node;})
    .groupBy(node => node.type)
    .filter(nodes => nodes.length > 0)
    .map(nodes => nodes.map(node => node.id));
  assert.equal(calls, 0);
  const expected = [[path.join(root, 'tasks/_default/todo/same/index.md')]];
  assert.deepEqual(await chain.value(), expected);
  assert.deepEqual(await chain.value(), expected);
  assert.equal(calls, 2);
});
