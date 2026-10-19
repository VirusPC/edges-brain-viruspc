import assert from "node:assert/strict";
import { test } from "node:test";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  BaseNode,
  AgentsNode,
  LeafNode,
  MemoryNode,
  NoteNode,
  SkillNode,
  TaskNode,
} from "../../src/domain/models/index.js";
import { NodeService } from "../../src/services/node/node-service.js";
function fixture(t: { after(fn: () => void): void }) {
  const root = fs.mkdtempSync(
    path.join(fs.realpathSync(tmpdir()), "node-service-"),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = (name: string) => path.join(root, name);
  const write = (name: string, source: string) => {
    fs.mkdirSync(path.dirname(file(name)), { recursive: true });
    fs.writeFileSync(file(name), source);
    return file(name);
  };
  return { root, file, write, service: new NodeService({ managedRoot: root }) };
}
function index(local = "", descendants = "") {
  return `# Scope\n\n<!-- project-memory-important:start -->\nKeep constraints.\n<!-- project-memory-important:end -->\n<!-- project-memory-local:start -->\n${local}\n<!-- project-memory-local:end -->\n<!-- project-memory-children:start -->\n${descendants}\n<!-- project-memory-children:end -->\n`;
}
function typeIndex(module: string, writable: boolean, entries = "") {
  return `<!-- project-memory-type:start -->\nname: ${writable ? "managed" : "referenced"}\nmodule: ${module}\nwritable: ${writable}\n<!-- project-memory-type:end -->\n<!-- project-memory-entries:start -->\n${entries}\n<!-- project-memory-entries:end -->\n`;
}
for (const operation of ["update", "create", "attach"] as const) {
  test(`post-commit read failure records and recovers the committed ${operation} destination`, async (t) => {
    const { file, write, service } = fixture(t);
    write("AGENTS.md", index());
    write("child/index.md", "child");
    const parent = (await service.get(file("AGENTS.md"), AgentsNode))!;
    const child = (await service.get(file("child/index.md")))!;
    const target =
      operation === "create"
        ? file("new/index.md")
        : operation === "update"
          ? child.path
          : parent.path;
    const before =
      operation === "create" ? undefined : fs.readFileSync(target, "utf8");
    const { default: mutableFs } = await import("node:fs");
    const { syncBuiltinESMExports } = await import("node:module");
    const rename = mutableFs.renameSync,
      link = mutableFs.linkSync,
      open = mutableFs.openSync;
    let committed = false,
      failed = false;
    const renameMock = t.mock.method(
      mutableFs,
      "renameSync",
      (source: fs.PathLike, dest: fs.PathLike) => {
        rename(source, dest);
        if (dest === target) committed = true;
      },
    );
    const linkMock = t.mock.method(
      mutableFs,
      "linkSync",
      (source: fs.PathLike, dest: fs.PathLike) => {
        link(source, dest);
        if (dest === target) committed = true;
      },
    );
    const openMock = t.mock.method(
      mutableFs,
      "openSync",
      (...args: Parameters<typeof open>) => {
        if (committed && !failed && args[0] === target) {
          failed = true;
          throw new Error("Post-commit inspection failure");
        }
        return open(...args);
      },
    );
    syncBuiltinESMExports();
    t.after(() => {
      renameMock.mock.restore();
      linkMock.mock.restore();
      openMock.mock.restore();
      syncBuiltinESMExports();
    });
    child.body = "updated";
    const action =
      operation === "create"
        ? service.create(new LeafNode(target), { body: "new" }, { indexGroup: "local" })
        : operation === "update"
          ? service.update(child, {})
          : attach(service, parent, child, "local");
    await assert.rejects(action, (error) => {
      assert.ok(String(error).includes(`Affected: ${target}`));
      return true;
    });
    if (before === undefined) assert.equal(fs.existsSync(target), false);
    else assert.equal(fs.readFileSync(target, "utf8"), before);
  });
}

test("post-commit temporary cleanup failure recovers created file rather than leaving an unreported mutation", async (t) => {
  const { file, service } = fixture(t);
  const { default: mutableFs } = await import("node:fs");
  const { syncBuiltinESMExports } = await import("node:module");
  const unlink = mutableFs.unlinkSync;
  let failed = false;
  const mocked = t.mock.method(
    mutableFs,
    "unlinkSync",
    (target: fs.PathLike) => {
      if (!failed && String(target).endsWith(".tmp")) {
        failed = true;
        throw new Error("Temporary cleanup failure");
      }
      return unlink(target);
    },
  );
  syncBuiltinESMExports();
  t.after(() => {
    mocked.mock.restore();
    syncBuiltinESMExports();
  });
  const target = file("new/index.md");
  await assert.rejects(
    service.create(new LeafNode(target), { body: "new" }, { indexGroup: "local" }),
    (error) => {
      assert.ok(String(error).includes(`Affected: ${target}`));
      return true;
    },
  );
  assert.equal(fs.existsSync(target), false);
});

test("structured create dispatches task defaults and refuses conflicts before changing the input", async (t) => {
  const { file, write, service } = fixture(t);
  write("AGENTS.md", index());
  const task = new TaskNode(file("tasks/backlog/one/index.md"));
  assert.equal(
    await service.create(task, { title: "One", body: "body" }, { indexGroup: "local" }),
    task,
  );
  assert.equal(task.title, "One");
  assert.equal(task.status, "backlog");
  assert.equal(task.parent?.id, file("AGENTS.md"));
  const fresh = new LeafNode(task.path);
  await assert.rejects(service.create(fresh, { body: "wrong" }, { indexGroup: "local" }), /exists/);
  assert.equal(fresh.body, "");
});
test("default get uses layout and physical ancestors, ignoring YAML type claims and ordinary navigation", async (t) => {
  const { file, write, service } = fixture(t);
  write("AGENTS.md", index("- [one](one/index.md)"));
  write("one/index.md", "---\ntype: task\n---\nbody");
  write("README.md", "docs");
  const node = (await service.get(file("one/index.md")))!;
  assert.equal(node.type, "text");
  assert.equal(node.parent?.id, file("AGENTS.md"));
  assert.equal((await service.get(file("README.md")))?.type, "readme");
  write("notes.txt", "plain");
  assert.equal(await service.get(file("notes.txt")), undefined);
  assert.equal(await service.get(file("missing/index.md")), undefined);
  write("invalid/index.md", "---\nname: [\n---\n");
  await assert.rejects(service.get(file("invalid/index.md")));
});
test("local traversal skips missing and malformed descendants before loading while missing roots fail", async (t) => {
  const { root, file, write, service } = fixture(t);
  write(
    "AGENTS.md",
    index("- [A](a/AGENTS.md)", "- [Missing](missing/AGENTS.md)"),
  );
  write("a/AGENTS.md", index("- [B](../elsewhere/b/AGENTS.md)"));
  write(
    "elsewhere/b/AGENTS.md",
    index("- [Leaf](../../data/a%20b/index.md#part)"),
  );
  write("data/a b/index.md", "leaf");
  const expectedPaths = [
    "AGENTS.md",
    "a/AGENTS.md",
    "elsewhere/b/AGENTS.md",
    "data/a b/index.md",
  ].map(file);
  assert.deepEqual(
    (await service.list(root, { localOnly: true })).map((n) => n.path),
    expectedPaths,
  );
  // Default traversal skips the absent referenced descendant, retaining every local node.
  assert.deepEqual((await service.list(root)).map((n) => n.path), expectedPaths);
  write("missing/AGENTS.md", "---\nmalformed: [\n---\n");
  const fresh = new NodeService({ managedRoot: root });
  assert.deepEqual(
    (await fresh.list(root, { localOnly: true })).map((n) => n.path),
    expectedPaths,
  );
  await assert.rejects(
    fresh.list(root),
    /missing\/AGENTS\.md/,
  );
  await assert.rejects(service.list(file("absent")), /Missing/);
  assert.equal(
    (await service.get(file("data/a b/index.md")))!.parent?.id,
    file("AGENTS.md"),
  );
});
test("composition cycles reject while diamond crossreferences do not invent conflicting parents", async (t) => {
  const { root, file, write, service } = fixture(t);
  write("AGENTS.md", index("- [A](a/AGENTS.md)\n- [B](b/AGENTS.md)"));
  write("a/AGENTS.md", index("- [Leaf](../leaf/index.md)"));
  write("b/AGENTS.md", index("- [Leaf](../leaf/index.md)"));
  write("leaf/index.md", "leaf");
  assert.equal((await service.list(root)).length, 4);
  assert.equal(
    (await service.get(file("leaf/index.md")))!.parent?.id,
    file("AGENTS.md"),
  );
  write("b/AGENTS.md", index("- [root](../AGENTS.md)"));
  await assert.rejects(new NodeService({managedRoot: root}).list(root), /cycle/i);
});
test("registered type contracts choose memory and custom constructors without YAML inference", async (t) => {
  const { root, file, write, service } = fixture(t);
  write("AGENTS.md", index("- [Memory](mem/AGENTS.md)"));
  write("mem/AGENTS.md", typeIndex("memory", true, "- [One](one/index.md)"));
  write("mem/one/index.md", "body");
  assert.ok((await service.list(root))[2] instanceof MemoryNode);
  assert.ok(
    (await service.get(file("mem/one/index.md"))) instanceof MemoryNode,
  );
  const custom = new NodeService({
    managedRoot: root,
    modelForReference: (_p, _r, target) =>
      target === file("mem/one/index.md") ? NoteNode : undefined,
  });
  assert.ok((await custom.list(root))[2] instanceof NoteNode);
});
test("update refuses missing, stale and substituted sources and retains ordinary existing file mode", async (t) => {
  const { file, write, service } = fixture(t);
  write("note/index.md", "# Before\n");
  fs.chmodSync(file("note/index.md"), 0o640);
  const note = (await service.get(file("note/index.md"), NoteNode))!;
  await service.update(note, { body: "# After\n" });
  assert.equal(fs.statSync(note.path).mode & 0o777, 0o640);
  write("note/index.md", "# External\n");
  await assert.rejects(
    service.update(note, { body: "wrong" }),
    /source changed/i,
  );
  assert.equal(note.title, "After");
  const fresh = (await service.get(note.path))!;
  fs.renameSync(note.path, file("note/old.md"));
  write("note/index.md", "# External\n");
  await assert.rejects(service.update(fresh, {}), /identity|changed/i);
  fs.unlinkSync(note.path);
  await assert.rejects(service.update(fresh, {}), /Missing/);
  await assert.rejects(
    service.update(new LeafNode(file("new/index.md")), {}),
    /snapshot/,
  );
});
test("symlink reads and destination writes fail without changing targets", async (t) => {
  const { file, write, service } = fixture(t);
  write("outside/index.md", "safe");
  fs.symlinkSync(file("outside"), file("linked"));
  await assert.rejects(service.get(file("linked/index.md")), /symbolic/);
  await assert.rejects(
    service.create(new LeafNode(file("linked/new/index.md")), { body: "bad" }, { indexGroup: "local" }),
    /symbolic/,
  );
  assert.equal(fs.readFileSync(file("outside/index.md"), "utf8"), "safe");
});
test("index-only attach and detach retain physical parent, label and prose", async (t) => {
  const { file, write, service } = fixture(t);
  write("AGENTS.md", index());
  write("a/AGENTS.md", index());
  write("b/index.md", "child");
  const parent = (await service.get(file("a/AGENTS.md"), AgentsNode))!,
    child = (await service.get(file("b/index.md")))!;
  await attach(service, parent, child, "descendant");
  parent.updateChild(child.id, { name: "Kept", description: "Details" });
  await service.update(parent, {});
  assert.equal(child.parent?.id, file("AGENTS.md"));
  assert.equal(parent.descendantChildren[0]?.name, "Kept");
  await detach(service, parent, child);
  assert.equal(child.parent?.id, file("AGENTS.md"));
  assert.equal(parent.children.length, 0);
});
test("authoritative AGENTS graph validation catches cycles from typed BaseNode and unsaved edits", async (t) => {
  const { file, write, service } = fixture(t);
  write("a/AGENTS.md", index("- [B](../b/AGENTS.md)"));
  write("b/AGENTS.md", index());
  const a = (await service.get(file("a/AGENTS.md"), BaseNode))!,
    b = (await service.get(file("b/AGENTS.md"), AgentsNode))!;
  await assert.rejects(attach(service, b, a, "local"), /cycle/i);
  assert.equal(b.children.length, 0);
  await assert.rejects(
    service.update(a, { body: index("- [self](AGENTS.md)") }),
    /cycle/i,
  );
  assert.equal(a.children.length, 1);
  assert.equal(a.children[0]?.id, file("b/AGENTS.md"));
  await assert.rejects(
    service.create(new AgentsNode(file("new/AGENTS.md")), {
      body: index("- [self](AGENTS.md)"),
    }, { indexGroup: "local" }),
    /cycle/i,
  );
  assert.equal(fs.existsSync(file("new/AGENTS.md")), false);
});
test("referenced indexes permit linked reads and index detach but retain conservative readonly origin", async (t) => {
  const { root, file, write, service } = fixture(t);
  write("AGENTS.md", index("- [Refs](refs/AGENTS.md)"));
  write(
    "refs/AGENTS.md",
    typeIndex("skills", false, "- [Skill](linked/SKILL.md)"),
  );
  write(
    "installed/SKILL.md",
    "---\nname: fixture\ndescription: Test fixture\n---\noriginal",
  );
  fs.symlinkSync(file("installed"), file("refs/linked"));
  const nodes = await service.list(root),
    parent = nodes[1] as AgentsNode,
    skill = nodes[2]!;
  await assert.rejects(
    service.update(skill, { body: "bad" }),
    /read.only|symbolic/i,
  );
  await detach(service, parent, skill);
  const alias = (await service.get(file("installed/SKILL.md")))!;
  await assert.rejects(service.destroy(alias), /read.only/i);
  assert.equal(
    fs.readFileSync(alias.path, "utf8"),
    "---\nname: fixture\ndescription: Test fixture\n---\noriginal",
  );
});
test("business write hook denies mutations before index or source bytes change", async (t) => {
  const { root, file, write } = fixture(t);
  write("AGENTS.md", index());
  const service = new NodeService({
    managedRoot: root,
    assertWrite: ({ node }) => {
      if (node.path.includes("/private/"))
        throw new Error("Private destination is not ignored");
    },
  });
  await assert.rejects(
    service.create(new LeafNode(file("private/index.md")), { body: "secret" }, { indexGroup: "local" }),
    /not ignored/,
  );
  assert.equal(fs.existsSync(file("private/index.md")), false);
  assert.equal(
    (await service.get(file("AGENTS.md"), AgentsNode))!.children.length,
    0,
  );
});
test("ambiguous multi-link source edit refuses deletion without losing prose or relations", async (t) => {
  const { file, write, service } = fixture(t);
  write("AGENTS.md", index("- [One](one/index.md) and [Two](two/index.md)"));
  write("one/index.md", "one");
  write("two/index.md", "two");
  const parent = (await service.get(file("AGENTS.md"), AgentsNode))!,
    one = (await service.get(file("one/index.md")))!;
  const before = fs.readFileSync(parent.path, "utf8");
  await assert.rejects(detach(service, parent, one), /multi-link/i);
  assert.equal(fs.readFileSync(parent.path, "utf8"), before);
  assert.equal(one.parent?.id, parent.id);
});
test("encoded directory delimiters stay distinct from href query and fragment", async (t) => {
  const { root, file, write, service } = fixture(t);
  write(
    "AGENTS.md",
    index(
      "- [Hash](a%23b/index.md#heading)\n- [Percent](a%2523b/index.md?q=1)\n- [Question](a%3Fb/index.md)\n- [Literal](a%25b/index.md)",
    ),
  );
  for (const name of ["a#b", "a%23b", "a?b", "a%b"])
    write(`${name}/index.md`, "body");
  assert.deepEqual(
    (await service.list(root)).map((n) => n.path),
    [
      "AGENTS.md",
      "a#b/index.md",
      "a%23b/index.md",
      "a?b/index.md",
      "a%b/index.md",
    ].map(file),
  );
});
test("shared cached references save current constraints and reference changes", async (t) => {
  const { file, write, service } = fixture(t);
  write("AGENTS.md", index("- [Child](child/index.md)"));
  write("child/index.md", "child");
  const first = (await service.get(file("AGENTS.md"), AgentsNode))!,
    second = (await service.get(first.path, AgentsNode))!,
    dirty = (await service.get(first.path, AgentsNode))!;
  dirty.setConstraints(["Unsaved"]);
  second.updateChild(file("child/index.md"), { name: "Changed" });
  await service.update(second, {});
  assert.equal(first.children[0]?.name, "Changed");
  assert.deepEqual(dirty.constraints, ["Unsaved"]);
});

/** Tests exercise the public model-edit + service-update composition. */
async function attach(
  service: NodeService,
  parent: AgentsNode,
  child: BaseNode,
  group: "local" | "descendant",
) {
  const draft = new AgentsNode(parent.path).parse(parent.serialize());
  draft.addChild(group, child);
  await service.update(parent, { body: draft.body });
}
async function detach(
  service: NodeService,
  parent: AgentsNode,
  child: BaseNode,
) {
  const draft = new AgentsNode(parent.path).parse(parent.serialize());
  draft.removeChild(child.id);
  await service.update(parent, { body: draft.body });
}

test('query defers reads and find closes before hit children or later siblings', async t => {
  const { root, write, service } = fixture(t);
  const pending = service.query(root);
  write('AGENTS.md', index('- [branch](branch/AGENTS.md)\n- [missing](missing/AGENTS.md)'));
  write('branch/AGENTS.md', index('- [hit](hit/AGENTS.md)'));
  write('branch/hit/AGENTS.md', '---\ncategory: hit\n---\n' + index('- [missing](missing/AGENTS.md)'));
  const hit = await pending.find(node => node.metadata?.category === 'hit').value();
  assert.equal(hit?.path, path.join(root, 'branch/hit/AGENTS.md'));
  const all = await pending.toArray().value();
  assert.ok(all.some(node => node.path === path.join(root, 'branch/hit/AGENTS.md')));
  assert.ok(!all.some(node => node.path.endsWith(`${path.sep}missing${path.sep}AGENTS.md`)));
});
test('typed queries keep internal navigation, skip unrelated bodies and preserve harness discovery', async t => {
  const { root, write, service } = fixture(t);
  write('AGENTS.md', index('- [tasks](tasks/AGENTS.md)\n- [memory](memory/AGENTS.md)', '- [child](child/AGENTS.md)'));
  write('tasks/AGENTS.md', index('- [one](_default/todo/one/index.md)'));
  write('tasks/_default/todo/one/index.md', '---\nname: one\nmetadata:\n  edges-tasks-status: todo\n---\nOne');
  write('memory/AGENTS.md', typeIndex('memory', true, '- [bad](bad/index.md)'));
  write('memory/bad/index.md', '---\nbad: [\n---\n');
  write('memory/bad/AGENTS.md', index('- [maintenance](.harness/tasks/AGENTS.md)'));
  write('memory/bad/.harness/tasks/AGENTS.md', index('- [two](_default/todo/two/index.md)'));
  write('memory/bad/.harness/tasks/_default/todo/two/index.md', 'Two');
  write('child/AGENTS.md', index('- [third](tasks/_default/todo/three/index.md)'));
  write('child/tasks/_default/todo/three/index.md', 'Three');
  assert.deepEqual((await service.query(root, { types: ['task'], localOnly: true }).value()).map(n => path.basename(n.directoryPath)), ['one']);
  assert.deepEqual((await service.query(root, { types: ['task'] }).value()).map(n => path.basename(n.directoryPath)), ['one','three']);
  assert.deepEqual((await service.query(root, { types: ['task'], includeHarness: true }).value()).map(n => path.basename(n.directoryPath)), ['one','two','three']);
  await assert.rejects(service.list(root), /bad\/index.md/);
  write('tasks/_default/todo/one/index.md', '---\nbad: [\n---\n');
  await assert.rejects(new NodeService({managedRoot: root}).query(root, { types: ['task'] }).value(), /one\/index.md/);
});
test('harness traversal deduplicates composition arrivals and detects cycles', async t => {
  const { root, write, service } = fixture(t);
  write('AGENTS.md', index('- [harness](.harness/AGENTS.md)'));
  write('.harness/AGENTS.md', index());
  assert.equal((await service.query(root, { includeHarness: true }).value()).length, 2);
  write('.harness/AGENTS.md', index('- [root](../AGENTS.md)'));
  await assert.rejects(new NodeService({managedRoot: root}).query(root, { includeHarness: true }).value(), /Composition cycle/);
});

test('query reads do not snapshot unselected physical resources; explicit get upgrades lifecycle snapshot', async t => {
  const { root, write, file, service } = fixture(t);
  write('AGENTS.md', index('- [branch](branch/AGENTS.md)'));
  write('branch/AGENTS.md', index());
  fs.symlinkSync('/unselected/missing', file('branch/unselected'));
  const nodes = await service.query(root).value();
  assert.equal(nodes.length,2);
  fs.unlinkSync(file('branch/unselected'));
  await assert.rejects(service.move(nodes[1]!, file('new/AGENTS.md')), /reload|snapshot/i);
  await service.get(file('branch/AGENTS.md'));
  await service.move(nodes[1]!, file('new/AGENTS.md'));
  assert.equal(fs.existsSync(file('new/AGENTS.md')), true);
});
test('global query omits out-of-root references and linked installations while missing local entries still fail', async t => {
  const { root, write, file, service } = fixture(t);
  const outside = fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()),'external-node-'));
  t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  fs.writeFileSync(path.join(outside,'SKILL.md'),'---\nbad: [\n---\n');
  write('AGENTS.md', index(`- [external](${outside}/SKILL.md)\n- [installed](installed/SKILL.md)`));
  fs.symlinkSync(outside,file('installed'));
  assert.equal((await service.query(root,{includeHarness:true}).value()).length,1);
  write('AGENTS.md',index('- [missing](missing/AGENTS.md)'));
  const skipped = await new NodeService({managedRoot: root}).query(root,{includeHarness:true}).value();
  assert.deepEqual(skipped.map(node => node.path), [path.join(root, 'AGENTS.md')]);
});

test('writes skip a pre-existing missing reference instead of rejecting the command', async t => {
  const { write, file, service } = fixture(t);
  write('AGENTS.md', index('- [harness](.harness/README.md)\n- [leaf](leaf/index.md)'));
  write('.harness/README.md', `# Harness\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n- [users](memory/users/README.md) — private\n<!-- project-entries-local:end -->\n`);
  write('leaf/index.md', 'Leaf\n');
  assert.equal(fs.existsSync(file('.harness/memory/users/README.md')), false);
  const created = await service.create(new LeafNode(file('extra/index.md')), { body: 'Extra\n' }, { indexGroup: 'local' });
  assert.match(fs.readFileSync(created.path, 'utf8'), /Extra/);
  const leaf = (await service.get(file('leaf/index.md'), LeafNode))!;
  await service.destroy(leaf);
  assert.equal(fs.existsSync(file('leaf/index.md')), false);
  assert.equal(fs.existsSync(created.path), true);
});

test('typed navigation through a readonly leaf retains readonly origin for its harness children', async t => {
  const { root, write, service } = fixture(t);
  write('AGENTS.md',index('- [memory](memory/AGENTS.md)'));
  write('memory/AGENTS.md',typeIndex('memory',false,'- [leaf](leaf/index.md)'));
  write('memory/leaf/index.md','---\nbad: [\n---\n');
  write('memory/leaf/AGENTS.md',index('- [task](.harness/tasks/_default/todo/one/index.md)'));
  write('memory/leaf/.harness/tasks/_default/todo/one/index.md','Task');
  const tasks=await service.query(root,{types:['task'],includeHarness:true}).value();
  assert.equal(tasks.length,1);
  await assert.rejects(service.update(tasks[0]!,{description:'changed'}),/Read-only/);
});

for (const operation of ['move', 'destroy'] as const) {
  test(`legacy list supports ${operation} with the resource snapshot taken before returning`, async t => {
    const { root, write, file, service } = fixture(t);
    write('AGENTS.md', index('- [item](item/index.md)'));
    write('item/index.md', 'Item');
    write('item/attachment.txt', 'original');
    const node = (await service.list(root))[1]!;
    if (operation === 'move') {
      await service.move(node, file('moved/index.md'));
      assert.equal(fs.readFileSync(file('moved/attachment.txt'), 'utf8'), 'original');
    } else {
      await service.destroy(node);
      assert.equal(fs.existsSync(file('item')), false);
    }
  });
  test(`legacy list rejects resource drift before ${operation}`, async t => {
    const { root, write, file, service } = fixture(t);
    write('AGENTS.md', index('- [item](item/index.md)'));
    write('item/index.md', 'Item');
    write('item/attachment.txt', 'original');
    const node = (await service.list(root))[1]!;
    write('item/attachment.txt', 'external edit');
    await assert.rejects(operation === 'move' ? service.move(node, file('moved/index.md')) : service.destroy(node), /Node resources changed/);
    assert.equal(fs.readFileSync(file('item/attachment.txt'), 'utf8'), 'external edit');
  });
}
test('legacy list refuses entry changes between traversal and resource snapshot capture', async t => {
  const { root, write } = fixture(t);
  write('AGENTS.md', index('- [first](first/index.md)\n- [later](later/index.md)'));
  write('first/index.md', 'first'); write('later/index.md', 'later');
  const service = new NodeService({ managedRoot: root, modelForReference: (_parent, reference) => {
    if (reference.id.endsWith('/later/index.md')) write('first/index.md', 'changed during traversal');
    return undefined;
  } });
  await assert.rejects(service.list(root), /Node source changed/);
});

test('planned graph validation resolves a diamond target once and keeps managed identities', async t => {
  const {root, file, write} = fixture(t);
  write('AGENTS.md', index('- [A](a/AGENTS.md)\n- [B](b/AGENTS.md)'));
  write('a/AGENTS.md', index('- [Shared](../shared/index.md)'));
  write('b/AGENTS.md', index('- [Shared](../shared/index.md)'));
  write('shared/index.md', 'shared');
  const arrivals: string[] = [];
  const service = new NodeService({managedRoot: root, modelForReference: (_parent, _ref, target) => { arrivals.push(target); return undefined; }});
  const parent = (await service.get(file('AGENTS.md'), AgentsNode))!;
  const shared = (await service.get(file('shared/index.md')))!;
  await service.update(parent, {description: 'updated'});
  assert.equal(arrivals.filter(target => target === shared.id).length, 1);
  assert.strictEqual(await service.get(shared.id), shared);
  assert.strictEqual(await service.get(parent.id), parent);
});

test('graph validation excludes harness relations while query explicitly includes them', async t => {
  const {root, file, write, service} = fixture(t);
  write('AGENTS.md', index('- [Item](item/index.md)'));
  write('item/index.md', 'item');
  write('item/AGENTS.md', index('- [Root](../AGENTS.md)'));
  const parent = (await service.get(file('AGENTS.md'), AgentsNode))!;
  await service.update(parent, {description: 'composition remains acyclic'});
  assert.equal(parent.description, 'composition remains acyclic');
  await assert.rejects(service.query(root, {includeHarness: true}).value(), /Composition cycle/);
});

for (const operation of ['query', 'validate', 'destroy'] as const) {
  test(`${operation} checks a later readonly diamond edge before deduplication`, async t => {
    const {root, file, write} = fixture(t);
    const originals = new Map([
      ['AGENTS.md', index('- [A](a/AGENTS.md)\n- [B](b/AGENTS.md)')],
      ['a/AGENTS.md', index('- [Target](../target/index.md)')],
      ['b/AGENTS.md', index('- [Target](../target/index.md)')],
      ['target/index.md', 'target'],
    ]);
    for (const [name, body] of originals) write(name, body);
    let laterEdgeChecks = 0;
    let targetLoads = 0;
    const service = new NodeService({managedRoot: root,
      readOnlyReference: (parent, ref) => {
        const readonly = parent.path === file('b/AGENTS.md') && ref.id === file('target/index.md');
        if (readonly) laterEdgeChecks++;
        return readonly;
      },
      modelForReference: (_parent, _ref, target) => {if(target === file('target/index.md')) targetLoads++; return undefined;},
    });
    const target = (await service.get(file('target/index.md')))!;
    target.body = 'caller unsaved body';
    if (operation === 'query') await service.query(root).value();
    if (operation === 'validate') {
      const parent = (await service.get(file('AGENTS.md'), AgentsNode))!;
      await service.update(parent, {});
      originals.set('AGENTS.md', fs.readFileSync(file('AGENTS.md'), 'utf8'));
    }
    await assert.rejects(service.destroy(target), /Read-only node source/);
    assert.ok(laterEdgeChecks > 0);
    assert.equal(targetLoads, 1);
    assert.strictEqual(await service.get(target.path), target);
    assert.equal(target.body, 'caller unsaved body');
    for (const [name, body] of originals) assert.equal(fs.readFileSync(file(name),'utf8'), body);
  });
}

test('new system entries register as descendants without a caller group', async t => {
  const { file, write, service } = fixture(t);
  write('AGENTS.md', index());
  await service.create(new AgentsNode(file('new/AGENTS.md')), { body: '# New\n' });
  const owner = (await service.get(file('AGENTS.md'), AgentsNode))!;
  assert.deepEqual(owner.localChildren, []);
  assert.equal(owner.descendantChildren[0]?.id, file('new/AGENTS.md'));
});
test('import registers a non-system file locally when no group is passed', async t => {
 const {root,file,write,service}=fixture(t);write('AGENTS.md',index());
 const source=fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()),'registration-import-'));t.after(()=>fs.rmSync(source,{recursive:true,force:true}));
 fs.writeFileSync(path.join(source,'index.md'),'Imported body');fs.writeFileSync(path.join(source,'asset.bin'),'resource');
 await service.import(path.join(source,'index.md'),file('imported/index.md'));
 const owner = (await service.get(file('AGENTS.md'), AgentsNode))!;
 assert.equal(owner.localChildren.some(ref => ref.id === file('imported/index.md')), true);
 assert.equal(fs.existsSync(file('imported/asset.bin')), true);
 void root;
 assert.equal(fs.readFileSync(file('imported/asset.bin'),'utf8'),'resource');
});
test('moving an unregistered node does not invent a descendant registration',async t=>{
 const {file,write,service}=fixture(t);write('AGENTS.md',index());write('source/AGENTS.md',index());write('source/item/index.md','Body');write('destination/AGENTS.md',index());
 const node=(await service.get(file('source/item/index.md')))!;
 await service.move(node,file('destination/item/index.md'));
 assert.deepEqual((await service.get(file('destination/AGENTS.md'),AgentsNode))?.children,[]);
 assert.equal(fs.readFileSync(file('destination/item/index.md'),'utf8'),'Body');
});

test('generic query supports all types and explicit task-only deferred execution', async t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'generic-query-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const note = path.join(root, 'notes/example/index.md');
  const service = new NodeService({ managedRoot: root });
  await service.create(new AgentsNode(path.join(root, 'AGENTS.md')), {});
  await service.create(new NoteNode(note), { body: '# Note\n' }, { indexGroup: 'local' });
  let seen = 0;
  const all = service.query(root, { includeHarness: true })
    .map(node => { seen += 1; return node; }).groupBy(node => node.type)
    .mapValues(nodes => nodes.length);
  assert.equal(seen, 0);
  assert.equal((await all.value()).note, 1);
  assert.ok(seen > 0);
  fs.writeFileSync(note, '---\nbroken: [\n---\n');
  // A fresh Service observes disk changes without a cached body masking type filtering.
  const fresh = new NodeService({ managedRoot: root });
  assert.deepEqual(await fresh.query(root, {
    types: ['task'], includeHarness: true,
  }).value(), []);
  await assert.rejects(new NodeService({ managedRoot: root }).query(root, {
    includeHarness: true,
  }).value());
});
