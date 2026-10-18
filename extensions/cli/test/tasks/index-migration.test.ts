import { planAgentsIndexes, applyAgentsIndexes } from '../../../../scripts/migrate-agents-indexes.mts';
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { tmpdir } from "node:os";
import { AgentsNode, TaskNode } from "../../src/domain/models/index.js";
import {
  planTaskIndexes,
  applyTaskIndexes,
} from "../../src/services/tasks/index-migration.js";
import {
  listRepositoryTaskNodes,
  listTaskNodes,
} from "../../src/services/tasks/node-query.js";
import { taskBoardLocation } from "../../src/services/tasks/paths.js";
function fixture(t: { after(fn: () => void): void }) {
  const root = fs.mkdtempSync(
    path.join(fs.realpathSync(tmpdir()), "task-migrate-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (rel: string, source: string) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, source);
    return p;
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
  write("AGENTS.md", "# Scope\n\nManual introduction\n");
  write("tasks/AGENTS.md", "# Board\n");
  write(
    "tasks/alpha/AGENTS.md",
    "# Alpha\n\nProject description\n\n## Pointers\n\nHuman prose\n",
  );
  task("tasks/alpha/todo/same/index.md", "alpha");
  task(".harness/tasks/_default/todo/same/index.md");
  return { root, write, task };
}
test("preview preserves prose and bytes; apply indexes exact task identities, including nested harnesses", async (t) => {
  const { root, write, task } = fixture(t);
  const nested =
    "tasks/alpha/todo/same/.harness/tasks/_default/todo/same/index.md";
  task(nested);
  const internal = "tools/cli/.harness/tasks/_default/todo/same/index.md";
  task(internal);
  write("tools/cli/AGENTS.md", "# CLI\n");
  write("tasks/alpha/resources.txt", "resource");
  const project = path.join(root, "tasks/alpha/AGENTS.md");
  const node = new AgentsNode(project).parse(
    fs.readFileSync(project, "utf8"),
  );
  node.setConstraints(["Preserve this rule"]);
  node.addChild("local", {
    id: path.join(root, "tasks/alpha/todo/same/index.md"),
  });
  fs.writeFileSync(project, node.serialize());
  const before = fs.readFileSync(project, "utf8");
  const plan = await planTaskIndexes(root);
  assert.equal(fs.readFileSync(project, "utf8"), before);
  assert.equal(plan.tasks.length, 4);
  const bytes = new Map(
    plan.tasks.map((p) => [p, fs.readFileSync(path.join(root, p))]),
  );
  await applyTaskIndexes(plan);
  assert.deepEqual(
    (await listRepositoryTaskNodes(root))
      .map((n) => path.relative(root, n.path))
      .sort(),
    plan.tasks,
  );
  assert.equal(
    (await listTaskNodes(taskBoardLocation(root, { super: true }))).length,
    1,
  );
  for (const [p, bytesBefore] of bytes)
    assert.deepEqual(fs.readFileSync(path.join(root, p)), bytesBefore);
  assert.equal(fs.readFileSync(project, "utf8"), before);
  assert.equal(
    fs.readFileSync(path.join(root, "tasks/alpha/resources.txt"), "utf8"),
    "resource",
  );
  assert.equal((await planTaskIndexes(root)).edits.length, 0);
  assert.ok(!fs.existsSync(path.join(root, "tasks/alpha/todo/AGENTS.md")));
});
for (const kind of ["addition", "deletion", "task edit", "index edit"] as const)
  test(`rejects ${kind} after preview before any write`, async (t) => {
    const { root, task, write } = fixture(t);
    const plan = await planTaskIndexes(root);
    if (kind === "addition") task("tasks/alpha/todo/new/index.md", "alpha");
    if (kind === "deletion") fs.unlinkSync(path.join(root, plan.tasks[0]!));
    if (kind === "task edit")
      fs.appendFileSync(path.join(root, plan.tasks[0]!), "\nChanged\n");
    if (kind === "index edit") write("AGENTS.md", "# Changed\n");
    await assert.rejects(applyTaskIndexes(plan), /changed|drift|Missing/i);
    assert.ok(!fs.existsSync(path.join(root, ".harness/tasks/AGENTS.md")));
  });
test("rejects conflicting duplicate indexes and out-of-root references with paths", async (t) => {
  const { root, write } = fixture(t);
  write(
    "tasks/AGENTS.md",
    "<!-- project-memory-local:start -->\n- [A](alpha/AGENTS.md)\n- [B](alpha/AGENTS.md)\n<!-- project-memory-local:end -->\n",
  );
  await assert.rejects(
    planTaskIndexes(root),
    /tasks\/AGENTS.md.*already indexed/s,
  );
  write(
    "tasks/AGENTS.md",
    "<!-- project-memory-local:start -->\n- [outside](../../outside/AGENTS.md)\n<!-- project-memory-local:end -->\n",
  );
  await assert.rejects(planTaskIndexes(root), /tasks\/AGENTS.md.*outside/s);
});
test("malformed markers reject the whole plan; private and foreign content stays outside discovery", async (t) => {
  const { root, write } = fixture(t);
  write(".harness/memory/users/AGENTS.md", "malformed private");
  write("journal/tasks/_default/todo/private/index.md", "private");
  write("posts/tasks/_default/todo/post/index.md", "post");
  assert.equal((await planTaskIndexes(root)).tasks.length, 2);
  write("tasks/AGENTS.md", "<!-- project-memory-local:start -->\n");
  await assert.rejects(planTaskIndexes(root), /tasks\/AGENTS.md/);
});
test("write failure rolls back only writes made by this apply", async (t) => {
  const { root } = fixture(t);
  const plan = await planTaskIndexes(root);
  const { syncBuiltinESMExports } = await import("node:module");
  const original = fs.linkSync;
  let calls = 0;
  const mocked = t.mock.method(fs, "linkSync", ((
    ...args: Parameters<typeof fs.linkSync>
  ) => {
    if (++calls === 2) throw new Error("injected write failure");
    return original(...args);
  }) as typeof fs.linkSync);
  syncBuiltinESMExports();
  try {
    await assert.rejects(
      applyTaskIndexes(plan),
      /injected write failure.*Recovered:/s,
    );
  } finally {
    mocked.mock.restore();
    syncBuiltinESMExports();
  }
  for (const edit of plan.edits) {
    const file = path.join(root, edit.path);
    if (edit.before === null) assert.ok(!fs.existsSync(file));
    else assert.equal(fs.readFileSync(file, "utf8"), edit.before);
  }
});
test("CLI requires root, defaults to preview, writes a report, and applies idempotently", async (t) => {
  const { root } = fixture(t);
  const { execFileSync } = await import("node:child_process");
  const script = path.resolve("../../scripts/index-task-nodes.mts");
  const run = (args: string[]) =>
    execFileSync(process.execPath, ["--import", "tsx", script, ...args], {
      encoding: "utf8",
      stdio: "pipe",
    });
  assert.throws(() => run([]), /Explicit --root required/);
  const preview = JSON.parse(
    run(["--root", root, "--report", path.join(root, "preview.json")]),
  );
  assert.equal(preview.mode, "preview");
  assert.equal(preview.tasks, 2);
  assert.ok(!fs.existsSync(path.join(root, ".harness/tasks/AGENTS.md")));
  const applied = JSON.parse(run(["--root", root, "--apply"]));
  assert.equal(applied.validation.applied, true);
  assert.deepEqual(JSON.parse(run(["--root", root])).edits, []);
});
test("preserves existing scope groups, labels, descriptions, and unmanaged text byte for byte", async (t) => {
  const { root, write } = fixture(t);
  const source =
    "# Scope\n\nManual text\n<!-- project-memory-important:start -->\n## 本层硬约束\n\n- A rule\n<!-- project-memory-important:end -->\n<!-- project-memory-local:start -->\n## 本层记忆\n\n- [Custom maintenance](<.harness/tasks/AGENTS.md>) — exact description\n<!-- project-memory-local:end -->\n<!-- project-memory-children:start -->\n## 下层作用域\n\n- [Custom domain](tasks/AGENTS.md) — kept\n<!-- project-memory-children:end -->\n\nTail\n";
  write("AGENTS.md", source);
  const plan = await planTaskIndexes(root);
  assert.ok(!plan.edits.some((e) => e.path === "AGENTS.md"));
  await applyTaskIndexes(plan);
  assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), source);
});
test("adopts legacy task-projects-only board index into a readable local section", async (t) => {
  const { root, write } = fixture(t);
  write(
    "tasks/AGENTS.md",
    "# Board\n\nHuman board prose\n\n<!-- task-projects:start -->\n- [Alpha](alpha/AGENTS.md) — existing\n<!-- task-projects:end -->\n",
  );
  await applyAgentsIndexes(planAgentsIndexes(root));
  await applyTaskIndexes(await planTaskIndexes(root));
  assert.equal(
    (await listTaskNodes(taskBoardLocation(root, { super: true }))).length,
    1,
  );
  assert.match(
    fs.readFileSync(path.join(root, "tasks/AGENTS.md"), "utf8"),
    /Human board prose/,
  );
  assert.equal((await planTaskIndexes(root)).edits.length, 0);
});

for (const entryName of ["index.md", "INDEX.md", "SKILL.md"] as const)
  for (const drift of ["addition", "deletion", "content", "identity"] as const)
    test(`rejects ${entryName} owner ${drift} after preview without index writes`, async (t) => {
      const { root, write, task } = fixture(t);
      write("tools/foo/AGENTS.md", "# Owner\n");
      task("tools/foo/.harness/tasks/_default/todo/owned/index.md");
      const relative = `tools/foo/${entryName}`;
      if (drift !== "addition") write(relative, "# Owner content\n");
      const plan = await planTaskIndexes(root);
      const entry = path.join(root, relative);
      if (drift === "addition") write(relative, "# Added owner\n");
      if (drift === "deletion") fs.unlinkSync(entry);
      if (drift === "content") fs.appendFileSync(entry, "Changed\n");
      if (drift === "identity") {
        const replacement = write(
          "replacement.md",
          fs.readFileSync(entry, "utf8"),
        );
        fs.renameSync(replacement, entry);
      }
      await assert.rejects(applyTaskIndexes(plan), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(entry), error.message);
        return true;
      });
      for (const edit of plan.edits) {
        const file = path.join(root, edit.path);
        if (edit.before === null) assert.ok(!fs.existsSync(file), edit.path);
        else
          assert.equal(fs.readFileSync(file, "utf8"), edit.before, edit.path);
      }
    });

test("tracks both possible owner entries, while unrelated content does not cause drift", async (t) => {
  const { root, write, task } = fixture(t);
  write("tools/foo/index.md", "# Owner\n");
  task("tools/foo/.harness/tasks/_default/todo/owned/index.md");
  const plan = await planTaskIndexes(root);
  write("tools/foo/SKILL.md", "# New alternative owner\n");
  await assert.rejects(applyTaskIndexes(plan), /tools\/foo\/SKILL.md/);
  const next = await planTaskIndexes(root);
  write("unrelated/index.md", "# Unrelated content\n");
  write("unrelated/SKILL.md", "# Unrelated skill\n");
  await applyTaskIndexes(next);
  assert.equal((await planTaskIndexes(root)).edits.length, 0);
});

for (const kind of ['directory', 'file'] as const) {
  test('migration excludes foreign Git ' + kind + ' boundaries before reading content', async t => {
    const { root, write, task } = fixture(t);
    fs.mkdirSync(path.join(root, '.git')); // The selected root itself remains eligible.
    write('ordinary/AGENTS.md', '# Ordinary scope\n');
    task('ordinary/.harness/tasks/_default/todo/local/index.md');
    write('vendor/upstream/AGENTS.md', '# Foreign scope\n');
    task('vendor/upstream/tasks/_default/todo/foreign/index.md');
    if (kind === 'directory') fs.mkdirSync(path.join(root, 'vendor/upstream/.git'));
    else write('vendor/upstream/.git', 'gitdir: /not-opened\n');
    const original = fs.openSync;
    const guard = t.mock.method(fs, 'openSync', ((file: any, ...args: any[]) => {
      if (String(file).startsWith(path.join(root, 'vendor/upstream'))) throw new Error('foreign content read');
      return (original as any)(file, ...args);
    }) as typeof fs.openSync);
    syncBuiltinESMExports();
    t.after(() => { guard.mock.restore(); syncBuiltinESMExports(); });
    const plan = await planTaskIndexes(root);
    assert.equal(plan.tasks.length, 3);
    assert.ok(plan.tasks.includes('ordinary/.harness/tasks/_default/todo/local/index.md'));
    assert.ok(plan.tasks.every(file => !file.startsWith('vendor/')));
    assert.ok(plan.edits.every(edit => !edit.path.startsWith('vendor/')));
    await applyTaskIndexes(plan);
    guard.mock.restore();
    assert.equal(fs.readFileSync(path.join(root, 'vendor/upstream/AGENTS.md'), 'utf8'), '# Foreign scope\n');
    assert.ok(!fs.existsSync(path.join(root, 'vendor/upstream/tasks/AGENTS.md')));
  });
  test('introduced Git ' + kind + ' boundary invalidates preview before any write', async t => {
    const { root, write, task } = fixture(t);
    write('ordinary/AGENTS.md', '# Ordinary scope\n');
    task('ordinary/tasks/_default/todo/local/index.md');
    const plan = await planTaskIndexes(root);
    if (kind === 'directory') fs.mkdirSync(path.join(root, 'ordinary/.git'));
    else write('ordinary/.git', 'gitdir: /not-opened\n');
    await assert.rejects(applyTaskIndexes(plan), /Discovery changed/);
    for (const edit of plan.edits) {
      const file = path.join(root, edit.path);
      if (edit.before === null) assert.ok(!fs.existsSync(file));
      else assert.equal(fs.readFileSync(file, 'utf8'), edit.before);
    }
  });
}

for (const entryName of ['index.md', 'INDEX.md']) {
  test(`migration preserves an already registered ${entryName} content owner byte for byte`, async t => {
    const { root, write, task } = fixture(t);
    await applyTaskIndexes(await planTaskIndexes(root));
    const content = write(`tools/foo/${entryName}`, '# Owner content\n');
    const owner = path.join(root, 'AGENTS.md');
    const node = new AgentsNode(owner).parse(fs.readFileSync(owner, 'utf8'));
    node.addChild('local', { id: content, name: 'Content', description: 'Keep registration' });
    fs.writeFileSync(owner, node.serialize());
    const before = fs.readFileSync(owner, 'utf8');
    task('tools/foo/.harness/tasks/_default/todo/owned/index.md');
    const plan = await planTaskIndexes(root);
    await applyTaskIndexes(plan);
    assert.equal(fs.readFileSync(owner, 'utf8'), before);
    assert.equal(fs.readFileSync(content, 'utf8'), '# Owner content\n');
    assert.deepEqual(fs.readdirSync(path.dirname(content)).filter(name => /^(INDEX|index)\.md$/.test(name)), [entryName]);
    assert.equal((await planTaskIndexes(root)).edits.length, 0);
  });
}

for (const entryName of ['index.md', 'INDEX.md'])
  for (const group of ['local', 'descendant'] as const) {
    test(`migration preserves ${group} inverse-spelling registration for actual ${entryName}`, async t => {
      const { root, write, task } = fixture(t);
      await applyTaskIndexes(await planTaskIndexes(root));
      const content = write(`tools/foo/${entryName}`, '# Owner content\n');
      const alias = path.join(path.dirname(content), entryName === 'index.md' ? 'INDEX.md' : 'index.md');
      const registered = fs.existsSync(alias) ? alias : content;
      const owner = path.join(root, 'AGENTS.md');
      const node = new AgentsNode(owner).parse(fs.readFileSync(owner, 'utf8'));
      node.addChild(group, { id: registered, name: 'Keep authored label', description: 'Keep authored description' });
      fs.writeFileSync(owner, node.serialize());
      const before = fs.readFileSync(owner, 'utf8');
      task('tools/foo/.harness/tasks/_default/todo/owned/index.md');
      const plan = await planTaskIndexes(root);
      await applyTaskIndexes(plan);
      assert.equal(fs.readFileSync(owner, 'utf8'), before);
      assert.equal(new AgentsNode(owner).parse(before).children.filter(ref => fs.realpathSync.native(ref.id) === content).length, 1);
      assert.deepEqual(fs.readdirSync(path.dirname(content)).filter(name => /^(INDEX|index)\.md$/.test(name)), [entryName]);
      assert.equal((await planTaskIndexes(root)).edits.length, 0);
    });
  }

test('migration identity comparison preserves unrelated linked registrations without following them', async t => {
  const { root, write, task } = fixture(t);
  await applyTaskIndexes(await planTaskIndexes(root));
  const material = write('material/index.md', '# Linked material\n');
  const link = path.join(root, 'linked'); fs.symlinkSync(path.dirname(material), link);
  const owner = path.join(root, 'AGENTS.md');
  const node = new AgentsNode(owner).parse(fs.readFileSync(owner, 'utf8'));
  node.addChild('local', { id: path.join(link, 'index.md'), name: 'Linked material', description: 'Keep link' });
  fs.writeFileSync(owner, node.serialize());
  write('tools/foo/AGENTS.md', '# Owner\n');
  task('tools/foo/.harness/tasks/_default/todo/owned/index.md');
  const plan = await planTaskIndexes(root);
  await applyTaskIndexes(plan);
  assert.ok(fs.readFileSync(owner, 'utf8').includes('- [Linked material](<linked/index.md>) — Keep link'));
  assert.equal(fs.readFileSync(material, 'utf8'), '# Linked material\n');
  assert.ok(fs.lstatSync(link).isSymbolicLink());
});
