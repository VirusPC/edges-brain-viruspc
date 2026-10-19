import assert from "node:assert/strict";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { NodeService } from "../../src/services/node/node-service.js";
import { AgentsNode, LeafNode, SkillNode } from "../../src/domain/models/index.js";
function fixture(t: any) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "directory-lifecycle-")),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = (p: string) => path.join(root, p);
  const put = (p: string, text: string) => {
    fs.mkdirSync(path.dirname(file(p)), { recursive: true });
    fs.writeFileSync(file(p), text);
  };
  return { root, file, put, service: new NodeService({ managedRoot: root }) };
}
function index(local = "", descendants = "") {
  return `# Scope\n<!-- project-memory-local:start -->\n${local}\n<!-- project-memory-local:end -->\n<!-- project-memory-children:start -->\n${descendants}\n<!-- project-memory-children:end -->\n`;
}
test("directory loading separates physical parent, composition and recursive harness", async (t) => {
  const { root, file, put, service } = fixture(t);
  put(
    "AGENTS.md",
    index(
      "- [Skill](skills/a/SKILL.md)\n- [Docs](README.md)",
      "- [Other](other/index.md)",
    ),
  );
  put(
    "skills/a/SKILL.md",
    "---\nname: fixture\ndescription: Test fixture\n---\n# Skill",
  );
  put("skills/a/AGENTS.md", index("- [Memory](memory/index.md)"));
  put("skills/a/memory/index.md", "memory");
  put("skills/a/.harness/AGENTS.md", index());
  put("other/index.md", "other");
  const nodes = await service.list(root, { localOnly: true });
  assert.deepEqual(
    nodes.map((n) => n.path),
    [file("AGENTS.md"), file("skills/a/SKILL.md")],
  );
  assert.equal(nodes[1]?.parent?.id, file("AGENTS.md"));
  assert.equal(nodes[1]?.harness?.id, file("skills/a/AGENTS.md"));
  const harness = (await service.get(nodes[1]!.harness!.id))!;
  assert.equal(harness.harness?.id, file("skills/a/.harness/AGENTS.md"));
  assert.deepEqual(
    (await service.list(harness.path, { localOnly: true })).map((n) => n.path),
    [harness.path, file("skills/a/memory/index.md")],
  );
  assert.equal(
    (await service.list(root)).length,
    3,
  );
});
test("structured creation in existing directory registers a node and updates all cached copies", async (t) => {
  const { file, put, service } = fixture(t);
  put("AGENTS.md", index());
  put("a/asset", "asset");
  const parent = (await service.get(file("AGENTS.md"), AgentsNode))!;
  const node = new LeafNode(file("a/index.md"));
  assert.equal(await service.create(node, { name: "A", body: "first" }, { indexGroup: "local" }), node);
  assert.equal(parent.localChildren[0]?.id, node.path);
  const copy = (await service.get(node.path))!;
  assert.equal(await service.update(node, { body: "second" }), node);
  assert.equal(copy.body, "second\n");
  const harness = new AgentsNode(file("a/AGENTS.md"));
  await service.create(harness, { constraints: ["rule"] }, { indexGroup: "local" });
  assert.equal(node.harness?.id, harness.id);
  assert.equal(fs.readFileSync(file("a/asset"), "utf8"), "asset");
});
test("move keeps instances and relocates resources, harness and authored href suffixes", async (t) => {
  const { file, put, service } = fixture(t);
  put("AGENTS.md", index("- [A](a/SKILL.md?view=1#top)"));
  put(
    "a/SKILL.md",
    "---\nname: fixture\ndescription: Test fixture\n---\n# A\n[out](../outside/index.md?q=1#x)\n[asset](image%23one.png)",
  );
  put("a/image#one.png", "bytes");
  put("a/AGENTS.md", index());
  put("a/.harness/AGENTS.md", index());
  put("outside/index.md", "extra prose [back](../a/SKILL.md#anchor)");
  const root = (await service.get(file("AGENTS.md"), AgentsNode))!;
  root.addChild("local", { id: file("outside/index.md") });
  await service.update(root, {});
  const node = (await service.get(file("a/SKILL.md")))!;
  const copy = (await service.get(node.path))!;
  const harness = (await service.get(file("a/AGENTS.md")))!;
  assert.equal(await service.move(node, file("deep/b/SKILL.md")), node);
  assert.equal(copy.path, node.path);
  assert.equal(harness.path, file("deep/b/AGENTS.md"));
  assert.equal(fs.existsSync(file("a")), false);
  assert.equal(fs.existsSync(file("deep/b/.harness/AGENTS.md")), true);
  assert.match(
    fs.readFileSync(file("AGENTS.md"), "utf8"),
    /deep\/b\/SKILL.md\?view=1#top/,
  );
  assert.match(
    fs.readFileSync(file("outside/index.md"), "utf8"),
    /\.\.\/deep\/b\/SKILL.md#anchor/,
  );
  assert.match(node.body, /\.\.\/\.\.\/outside\/index.md\?q=1#x/);
  assert.match(node.body, /image%23one.png/);
});
test("moving nested Internal preserves child instances and old group under new physical parent", async (t) => {
  const { file, put, service } = fixture(t);
  put("AGENTS.md", index("- [A](a/AGENTS.md)\n- [B](b/AGENTS.md)"));
  put("a/AGENTS.md", index("", "- [Tree](tree/AGENTS.md)"));
  put("b/AGENTS.md", index());
  put("a/tree/AGENTS.md", index("- [Leaf](child/index.md)"));
  put("a/tree/child/index.md", "leaf");
  const a = (await service.get(file("a/AGENTS.md"), AgentsNode))!,
    b = (await service.get(file("b/AGENTS.md"), AgentsNode))!;
  const node = (await service.get(file("a/tree/AGENTS.md")))!;
  const child = (await service.get(file("a/tree/child/index.md")))!;
  await service.move(node, file("b/tree/AGENTS.md"));
  assert.equal(node.parent?.id, b.id);
  assert.equal(child.path, file("b/tree/child/index.md"));
  assert.equal(child.parent?.id, node.id);
  assert.equal(a.children.length, 0);
  assert.equal(b.descendantChildren[0]?.id, node.id);
});
test("cross-parent move migrates only the node's own registration and leaves a symlink registration unchanged", async (t) => {
  const { file, put, service } = fixture(t);
  const aliasLine = "- [Alias](alias/index.md?alias=1#link)";
  const nodeLine = "- [Node](item/index.md?keep=1#node)";
  put("AGENTS.md", index("- [From](from/AGENTS.md)\n- [To](to/AGENTS.md)"));
  put("from/AGENTS.md", index(`${aliasLine}\n${nodeLine}`));
  put("to/AGENTS.md", index());
  put("from/item/index.md", "body");
  fs.symlinkSync("item", file("from/alias"));
  const node = (await service.get(file("from/item/index.md")))!;
  await service.move(node, file("to/item/index.md"));
  const fromText = fs.readFileSync(file("from/AGENTS.md"), "utf8");
  const toText = fs.readFileSync(file("to/AGENTS.md"), "utf8");
  assert.match(fromText, /\[Alias\]\(alias\/index\.md\?alias=1#link\)/);
  assert.equal(fromText.includes(nodeLine), false);
  assert.equal(fromText.includes("[Node]"), false);
  assert.match(toText, /\[Node\]\(<?item\/index\.md\?keep=1#node>?\)/);
  assert.equal(toText.includes("Alias"), false);
  assert.equal(toText.includes("alias/index.md"), false);
  assert.equal(fs.readlinkSync(file("from/alias")), "item");
  const fromParent = (await service.get(file("from/AGENTS.md"), AgentsNode))!;
  const toParent = (await service.get(file("to/AGENTS.md"), AgentsNode))!;
  assert.equal(
    fromParent.children.find((ref) => ref.name === "Alias")?.id,
    file("from/alias/index.md"),
  );
  assert.equal(
    fromParent.children.some((ref) => ref.id === file("from/item/index.md")),
    false,
  );
  assert.equal(
    toParent.children.find((ref) => ref.name === "Node")?.id,
    file("to/item/index.md"),
  );
  assert.equal(node.path, file("to/item/index.md"));
  assert.equal(fs.readFileSync(node.path, "utf8"), "body");
});
test("destroy co-located harness preserves content; destroy Internal deletes unit not external crossreferences", async (t) => {
  const { file, put, service } = fixture(t);
  put("AGENTS.md", index("- [A](a/SKILL.md)\n- [B](b/AGENTS.md)"));
  put("b/AGENTS.md", index("- [external](../a/SKILL.md)"));
  put(
    "a/SKILL.md",
    "---\nname: fixture\ndescription: Test fixture\n---\nskill",
  );
  put("a/AGENTS.md", index());
  put("a/.harness/AGENTS.md", index());
  put("a/asset", "asset");
  const skill = (await service.get(file("a/SKILL.md")))!;
  await service.destroy((await service.get(file("a/AGENTS.md")))!);
  assert.equal(fs.existsSync(skill.path), true);
  assert.equal(fs.existsSync(file("a/asset")), true);
  assert.equal(skill.harness, undefined);
  put("b/AGENTS.md", index("- [external](../a/SKILL.md)"));
  await service.destroy((await service.get(file("b/AGENTS.md")))!);
  assert.equal(fs.existsSync(file("b")), false);
  assert.equal(fs.existsSync(skill.path), true);
  await service.destroy(skill);
  assert.equal(fs.existsSync(file("a")), false);
});
test("move preflights occupied destinations, layout changes, roots, symlinks and co-located harness", async (t) => {
  const { root, file, put, service } = fixture(t);
  put("a/SKILL.md", "---\nname: fixture\ndescription: Test fixture\n---\na");
  put("a/AGENTS.md", index());
  put("occupied/asset", "x");
  put("AGENTS.md", index());
  const a = (await service.get(file("a/SKILL.md")))!;
  for (const destination of [
    "occupied/SKILL.md",
    "a/nested/SKILL.md",
    "b/index.md",
    "../escape/SKILL.md",
  ])
    await assert.rejects(service.move(a, file(destination)));
  fs.symlinkSync(file("occupied"), file("link"));
  await assert.rejects(service.move(a, file("link/b/SKILL.md")), /symbolic/i);
  await assert.rejects(
    service.move(
      (await service.get(file("a/AGENTS.md")))!,
      file("h/AGENTS.md"),
    ),
    /co.located/i,
  );
  await assert.rejects(
    service.destroy((await service.get(file("AGENTS.md")))!),
    /root/i,
  );
  assert.equal(
    fs.readFileSync(a.path, "utf8"),
    "---\nname: fixture\ndescription: Test fixture\n---\na",
  );
  assert.equal(fs.existsSync(root), true);
});
test("import validates complete directory before writes and leaves source untouched", async (t) => {
  const { root, file, put, service } = fixture(t);
  put("AGENTS.md", index());
  put(
    "source/SKILL.md",
    "---\nname: fixture\ndescription: Test fixture\n---\nsource",
  );
  put("source/AGENTS.md", index());
  put("source/asset", "bytes");
  const imported = await service.import(
    file("source/SKILL.md"),
    file("target/SKILL.md"), { indexGroup: "local" }
  );
  assert.equal(imported.path, file("target/SKILL.md"));
  assert.equal(fs.readFileSync(file("target/asset"), "utf8"), "bytes");
  assert.equal(
    fs.readFileSync(file("source/SKILL.md"), "utf8"),
    "---\nname: fixture\ndescription: Test fixture\n---\nsource",
  );
  put(
    "bad/SKILL.md",
    "---\nname: fixture\ndescription: Test fixture\n---\nsource",
  );
  put("bad/sub/index.md", "---\nname: [\n---\n");
  await assert.rejects(
    service.import(file("bad/SKILL.md"), file("failed/SKILL.md"), { indexGroup: "local" }),
  );
  assert.equal(fs.existsSync(file("failed")), false);
  await assert.rejects(
    service.import(file("source/SKILL.md"), file("target/SKILL.md"), { indexGroup: "local" }),
    /exists/,
  );
  fs.symlinkSync(root, file("source/link"));
  await assert.rejects(
    service.import(file("source/SKILL.md"), file("linked/SKILL.md"), { indexGroup: "local" }),
    /symbolic/i,
  );
});
