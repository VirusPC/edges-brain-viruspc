import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { assertPrivateIgnored } from "../../src/services/memory/ignore.js";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Nodes } from "mdast";
import {
  initMemory,
  rememberMemory,
  addMemoryType,
  doctorMemory,
} from "../../src/services/memory/index.js";
import { initSkills } from "../../src/services/init/service.js";
import {
  layerTypeSpecs,
  parseTypeMeta,
  validateTypeName,
} from "../../src/services/memory/types.js";
import { indexFiles } from "../../src/services/memory/blocks.js";
import {
  parseFrontmatter,
  refreshIndex,
} from "../../src/services/memory/entries.js";
function fixture(t: TestContext) {
  const dir = fs.mkdtempSync(join(tmpdir(), "memory-boundary-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
const read = (d: string, p: string) => fs.readFileSync(join(d, p), "utf8");
const put = (d: string, p: string, text: string) => {
  fs.mkdirSync(dirname(join(d, p)), { recursive: true });
  fs.writeFileSync(join(d, p), text);
};
const skill = "---\nname: same\ndescription: example\n---\nBody\n";
const base = async (t: TestContext) => {
  const d = fixture(t);
  await initMemory({ targetDir: d, memoryTypes: ["project"] });
  return d;
};
const remember = async (d: string, type: string, slug = "example") =>
  await rememberMemory({
    targetDir: d,
    type,
    slug,
    title: "Example",
    description: "example",
    content: "Body",
    username: "fixture",
    email: "fixture@example.test",
  });
const pi = ".harness/memory/projects/README.md";
test("recommendation names and custom name validation preserve type identity rules", () => {
  assert.deepEqual(Object.keys(indexFiles()), [
    "user",
    "feedback",
    "project",
    "reference",
    "managed",
    "referenced",
  ]);
  for (const name of ["User", "managed", "my-type", "My_type", "../escape"])
    assert.throws(() => validateTypeName(name));
  assert.equal(validateTypeName("my_type"), "my_type");
});
test("empty selection, unknown types and uninitialized writes do not mutate", async (t) => {
  const d = fixture(t);
  await assert.rejects(
    async () => await initMemory({ targetDir: d, memoryTypes: [] }),
  );
  await assert.rejects(
    async () => await initMemory({ targetDir: d, memoryTypes: ["docs"] }),
  );
  await assert.rejects(
    async () =>
      await addMemoryType({ targetDir: d, name: "docs", description: "Docs" }),
  );
  await assert.rejects(async () => await remember(d, "project"));
  assert.deepEqual(fs.readdirSync(d), []);
});
for (const module of ["memory", "skills"] as const)
  test(`custom skills format preserves selected ${module} module`, async (t) => {
    const d = await base(t);
    await addMemoryType({
      targetDir: d,
      module,
      name: "recipes",
      description: "Recipes",
      skillsFormat: true,
    });
    await remember(d, "recipes", "run-it");
    await initMemory({ targetDir: d });
    assert.ok(
      fs.existsSync(join(d, `.harness/${module}/recipes/run-it/SKILL.md`)),
    );
    await assert.rejects(
      async () =>
        await addMemoryType({
          targetDir: d,
          module: module === "memory" ? "skills" : "memory",
          name: "recipes",
          description: "Conflict",
        }),
    );
  });
test("custom type plural path collision cannot overwrite original type", async (t) => {
  const d = await base(t);
  await addMemoryType({ targetDir: d, name: "docs", description: "Docs" });
  const before = read(d, ".harness/memory/docs/README.md");
  await assert.rejects(
    async () =>
      await addMemoryType({
        targetDir: d,
        name: "doc",
        description: "Collision",
      }),
    /already belongs/,
  );
  assert.equal(read(d, ".harness/memory/docs/README.md"), before);
});
test("custom readonly, external source stub and no-git flags are explicit", async (t) => {
  const d = await base(t);
  const added = await addMemoryType({
    targetDir: d,
    name: "secrets",
    description: "Private",
    indexOnly: true,
    gitignore: true,
  });
  assert.equal(added.gitignoreAction, "skipped-no-git");
  await assert.rejects(async () => await remember(d, "secrets"), /只索引/);
  await assert.rejects(
    async () =>
      await addMemoryType({
        targetDir: d,
        name: "remote",
        description: "Remote",
        externalContentDir: "outside",
      }),
    /stubbed/,
  );
  assert.equal(
    (
      await addMemoryType({
        targetDir: d,
        name: "secrets",
        description: "Again",
      })
    ).flags.writable,
    false,
  );
});
test("old skills name is not a runtime alias but can be a custom ordinary type", async (t) => {
  const d = await base(t);
  await assert.rejects(async () => await remember(d, "skills"));
  await addMemoryType({
    targetDir: d,
    name: "skills",
    description: "Ordinary",
  });
  await remember(d, "skills");
  assert.ok(
    fs.existsSync(join(d, ".harness/memory/skills/skills_example/INDEX.md")),
  );
});
for (const change of [
  "writable: false\n",
  "gitignore: true\n",
  "all",
  "invalid",
])
  test(`custom permissions ${change.trim()} cannot silently default`, async (t) => {
    const d = await base(t);
    await addMemoryType({
      targetDir: d,
      name: "secrets",
      description: "Private",
      indexOnly: true,
      gitignore: true,
    });
    const index = ".harness/memory/secrets/README.md";
    let text = read(d, index);
    text =
      change === "all"
        ? text.replace(
            /<!-- project-memory-type:start -->[\s\S]*?<!-- project-memory-type:end -->/,
            "",
          )
        : change === "invalid"
          ? text.replace("writable: false", "writable: maybe")
          : text.replace(change, "");
    put(d, index, text);
    await assert.rejects(
      async () => await initMemory({ targetDir: d, memoryTypes: ["feedback"] }),
    );
    await assert.rejects(async () => await remember(d, "secrets"));
    assert.ok(
      (await doctorMemory({ targetDir: d, apply: true })).remaining.some(
        (f) => f.code === "unsafe-layout",
      ),
    );
    assert.equal(read(d, index), text);
    assert.equal(fs.existsSync(join(d, ".harness/memory/feedbacks")), false);
  });
for (const [name, field, from, to] of [
  ["user", "gitignore", "true", "false"],
  ["managed", "writable", "true", "false"],
  ["managed", "format", "skills", "ordinary"],
  ["referenced", "writable", "false", "true"],
] as const)
  test(`official ${name} rejects ${field}=${to}`, async (t) => {
    const d = fixture(t);
    if (name === "user") {
      await initMemory({ targetDir: d, memoryTypes: ["user"] });
    } else {
      await initSkills({ targetDir: d, skillTypes: [name] });
    }
    const spec = layerTypeSpecs(d)[0]!;
    const before =
      read(d, spec.indexFile) +
      `\n<!-- project-memory-type:start -->\nname: ${name}\nmodule: ${spec.module}\nwritable: ${field === "writable" ? to : spec.writable}\ngitignore: ${field === "gitignore" ? to : spec.gitignore}\nformat: ${field === "format" ? to : spec.format}\n<!-- project-memory-type:end -->\n`;
    put(d, spec.indexFile, before);
    await assert.rejects(async () => await initMemory({ targetDir: d }));
    assert.ok(
      (await doctorMemory({ targetDir: d, apply: true })).remaining.some(
        (f) => f.code === "unsafe-layout",
      ),
    );
    assert.equal(read(d, spec.indexFile), before);
  });
test("linked harness and linked managed write ancestor never escape", async (t) => {
  const d = fixture(t),
    external = fixture(t);
  fs.symlinkSync(external, join(d, ".harness"));
  await assert.rejects(
    async () => await initMemory({ targetDir: d, memoryTypes: ["project"] }),
  );
  assert.deepEqual(fs.readdirSync(external), []);
  fs.unlinkSync(join(d, ".harness"));
  await initSkills({ targetDir: d, skillTypes: ["managed"] });
  fs.symlinkSync(external, join(d, ".harness/skills/managed/escape"));
  await assert.rejects(async () => await remember(d, "managed", "escape"));
  assert.deepEqual(fs.readdirSync(external), []);
});
test("linked index and gitignore reject writes before private content", async (t) => {
  const d = fixture(t),
    outside = fixture(t);
  execFileSync("git", ["init", "-q", d]);
  await initMemory({ targetDir: d, memoryTypes: ["user"] });
  fs.unlinkSync(join(d, ".gitignore"));
  put(outside, "ignore", "Keep");
  fs.symlinkSync(join(outside, "ignore"), join(d, ".gitignore"));
  await assert.rejects(async () => await remember(d, "user"));
  assert.equal(
    fs.existsSync(join(d, ".harness/memory/users/user_example/INDEX.md")),
    false,
  );
  assert.equal(read(outside, "ignore"), "Keep");
});
test("private ignore is reestablished before remember and applies to nested user entries", async (t) => {
  const d = fixture(t);
  execFileSync("git", ["init", "-q", d]);
  const nested = join(d, "nested");
  fs.mkdirSync(nested);
  await initMemory({ targetDir: nested, rootDir: d, memoryTypes: ["user"] });
  fs.unlinkSync(join(d, ".gitignore"));
  await remember(nested, "user");
  for (const file of [
    "nested/.harness/memory/users/README.md",
    "nested/.harness/memory/users/user_example/INDEX.md",
  ])
    assert.ok(
      execFileSync("git", ["-C", d, "check-ignore", file], {
        encoding: "utf8",
      }).includes(file),
    );
});
test("source aliases deduplicate per type but same names and cross-type ownership survive", async (t) => {
  const d = fixture(t);
  await initSkills({ targetDir: d, skillTypes: ["managed", "referenced"] });
  put(d, ".harness/skills/managed/original/SKILL.md", skill);
  fs.symlinkSync("original", join(d, ".harness/skills/managed/alias"));
  fs.mkdirSync(join(d, ".agents/skills"), { recursive: true });
  fs.symlinkSync(
    join(d, ".harness/skills/managed/original"),
    join(d, ".agents/skills/linked"),
  );
  put(d, ".agents/skills/other/SKILL.md", skill);
  put(d, "child/.agents/skills/hidden/SKILL.md", skill);
  assert.equal((await initSkills({ targetDir: d })).complete, true);
  assert.equal(
    read(d, ".harness/skills/managed/README.md").split(" — example").length - 1,
    1,
  );
  assert.equal(
    read(d, ".harness/skills/referenced/README.md").split(" — example").length -
      1,
    2,
  );
});
test("broken and unreadable referenced sources preserve exact index bytes", async (t) => {
  const d = fixture(t);
  put(d, ".agents/skills/one/SKILL.md", skill);
  await initSkills({ targetDir: d, skillTypes: ["referenced"] });
  const index = ".harness/skills/referenced/README.md",
    before = read(d, index);
  fs.symlinkSync("missing", join(d, ".agents/skills/broken"));
  assert.equal((await initSkills({ targetDir: d })).complete, false);
  await doctorMemory({ targetDir: d, apply: true });
  assert.equal(read(d, index), before);
  fs.unlinkSync(join(d, ".agents/skills/broken"));
  if (process.getuid?.() !== 0) {
    fs.chmodSync(join(d, ".agents/skills/one/SKILL.md"), 0);
    t.after(() => {});
    try {
      assert.equal((await initSkills({ targetDir: d })).complete, false);
      assert.equal(read(d, index), before);
    } finally {
      fs.chmodSync(
        join(d, ".agents/skills/one/SKILL.md"),
        0o666 & ~process.umask(),
      );
    }
  }
});
test("legacy owner or legacy explicit root rejects all daily mutation", async (t) => {
  const d = fixture(t);
  put(d, ".memory/projects/project_old/INDEX.md", "old");
  const child = join(d, "child");
  fs.mkdirSync(child);
  await assert.rejects(
    async () =>
      await initMemory({
        targetDir: child,
        rootDir: d,
        memoryTypes: ["project"],
      }),
    /migration-required/,
  );
  assert.deepEqual(fs.readdirSync(child), []);
  await assert.rejects(
    async () => await remember(d, "project"),
    /migration-required/,
  );
  await assert.rejects(
    async () =>
      await addMemoryType({ targetDir: d, name: "docs", description: "Docs" }),
    /migration-required/,
  );
  assert.ok(
    (await doctorMemory({ targetDir: d, apply: true })).remaining.some(
      (f) => f.code === "migration-required",
    ),
  );
  assert.equal(read(d, ".memory/projects/project_old/INDEX.md"), "old");
  assert.equal(fs.existsSync(join(d, ".harness")), false);
});
for (const remove of ["index", "directory", "scope"])
  test(`doctor restores missing adopted ${remove} without expanding adoption`, async (t) => {
    const d = await base(t);
    fs.rmSync(
      join(
        d,
        remove === "index"
          ? pi
          : remove === "directory"
            ? ".harness/memory/projects"
            : "AGENTS.md",
      ),
      { recursive: true },
    );
    assert.equal(
      (await doctorMemory({ targetDir: d, apply: true })).remaining.length,
      0,
    );
    assert.deepEqual(
      layerTypeSpecs(d).map((s) => s.name),
      ["project"],
    );
  });
test("doctor never recreates missing custom permissions from path", async (t) => {
  const d = await base(t);
  await addMemoryType({
    targetDir: d,
    name: "secrets",
    description: "Private",
    indexOnly: true,
    gitignore: true,
  });
  fs.unlinkSync(join(d, ".harness/memory/secrets/README.md"));
  assert.ok(
    (await doctorMemory({ targetDir: d, apply: true })).remaining.some(
      (f) => f.code === "unsafe-layout",
    ),
  );
  assert.equal(
    fs.existsSync(join(d, ".harness/memory/secrets/README.md")),
    false,
  );
});
test("foreign and manual prose remain byte-identical outside managed blocks", async (t) => {
  const d = fixture(t),
    manual = "# Business\n\nManual body\n\n\n";
  put(d, "AGENTS.md", manual);
  await initMemory({ targetDir: d, memoryTypes: ["project"] });
  assert.ok(read(d, "AGENTS.md").startsWith(manual.trimEnd()));
  await doctorMemory({ targetDir: d, apply: true });
  assert.ok(read(d, "AGENTS.md").startsWith(manual.trimEnd()));
  const tail = "\n\n\nManual tail\n\n";
  put(d, "AGENTS.md", read(d, "AGENTS.md") + tail);
  await initMemory({ targetDir: d });
  await doctorMemory({ targetDir: d, apply: true });
  assert.ok(read(d, "AGENTS.md").endsWith(tail));
});
test("doctor diagnoses duplicate children and preserves description and prose", async (t) => {
  const d = await base(t),
    child = join(d, "mid/child");
  fs.mkdirSync(child, { recursive: true });
  await initMemory({
    targetDir: child,
    rootDir: d,
    memoryTypes: ["project"],
    description: "specific responsibility",
  });
  const line = read(d, "AGENTS.md")
    .split("\n")
    .find((l) => l.includes("mid/child/AGENTS.md"))!;
  put(
    d,
    "AGENTS.md",
    read(d, "AGENTS.md").replace(line, `Manual guidance\n${line}\n${line}`),
  );
  await initMemory({
    targetDir: dirname(child),
    rootDir: dirname(child),
    memoryTypes: ["project"],
  });
  const before = read(d, "AGENTS.md");
  const report = await doctorMemory({ targetDir: d, apply: true });
  assert.ok(
    report.remaining.some(
      (f) =>
        f.code === "invalid-entry" && /child already indexed/.test(f.detail),
    ),
  );
  assert.equal(read(d, "AGENTS.md"), before);
  assert.match(read(d, "AGENTS.md"), /Manual guidance/);
  assert.match(read(d, "AGENTS.md"), /specific responsibility/);
  assert.equal(
    read(d, "AGENTS.md").split("](<mid/child/AGENTS.md>)").length - 1,
    2,
  );
  assert.doesNotMatch(read(d, "mid/AGENTS.md"), /child\/AGENTS.md/);
});
test("doctor inventories all AGENTS scopes but does not initialize business or README type nodes", async (t) => {
  const d = await base(t),
    child = join(d, ".harness/evaluation/suite");
  fs.mkdirSync(child, { recursive: true });
  await initSkills({
    targetDir: child,
    rootDir: child,
    skillTypes: ["managed"],
  });
  put(d, "tasks/AGENTS.md", "# Business");
  const report = await doctorMemory({ targetDir: d, apply: true });
  assert.deepEqual(report.memoryDirs.sort(), [
    ".",
    ".harness/evaluation/suite",
    "tasks",
  ]);
  assert.equal(read(d, "tasks/AGENTS.md"), "# Business");
  assert.equal(report.remaining.length, 0);
});
test("unregistered custom types are rediscovered and metadata/manual introductions are preserved", async (t) => {
  const d = await base(t);
  await addMemoryType({ targetDir: d, name: "docs", description: "Docs" });
  put(
    d,
    ".harness/README.md",
    read(d, ".harness/README.md").replace(/^- .*memory\/docs\/README\.md.*\n/gm, ""),
  );
  const index = ".harness/memory/docs/README.md";
  put(
    d,
    index,
    "Manual type preface\n" +
      read(d, index).replace("module: memory\n", "unknown-key: retain\n"),
  );
  assert.ok(
    (await doctorMemory({ targetDir: d })).findings.some(
      (f) => f.code === "unregistered-type",
    ),
  );
  await doctorMemory({ targetDir: d, apply: true });
  await remember(d, "docs");
  await initMemory({ targetDir: d });
  assert.match(read(d, index), /unknown-key: retain/);
  assert.match(read(d, index), /^Manual type preface/);
  assert.match(read(d, ".harness/README.md"), /memory\/docs\/README\.md/);
  assert.doesNotMatch(read(d, "AGENTS.md"), /memory\/docs\/README\.md/);
});
test("standard YAML parsing supports quoted, multiline and nested metadata; nested values win", async (t) => {
  const d = await base(t);
  const file = ".harness/memory/projects/project_yaml/INDEX.md";
  put(
    d,
    file,
    '---\nname: project_yaml\ntitle: old\ndescription: >-\n  first line\n  second line\nmetadata:\n  edges-title: "new: title"\n  vendor:\n    list: [one, two]\n---\nBody\n',
  );
  assert.equal(
    parseFrontmatter(join(d, file)).description,
    "first line second line",
  );
  assert.equal(parseFrontmatter(join(d, file)).title, "new: title");
  await rememberMemory({
    targetDir: d,
    type: "project",
    slug: "yaml",
    content: "Update",
  });
  assert.match(read(d, file), /vendor:/);
  assert.equal(parseFrontmatter(join(d, file)).title, "new: title");
});
test("remember provenance keeps origin, refreshes audit and honors explicit env snapshot", async (t) => {
  const d = await base(t);
  const first = await rememberMemory({
    targetDir: d,
    type: "project",
    slug: "origin",
    title: "Origin",
    description: "Source",
    content: "one",
    env: { CURSOR_AGENT: "1", CURSOR_CONVERSATION_ID: "first" },
    username: "first",
    email: "first@example.test",
  });
  assert.equal(first.provenance.originSessionId, "first");
  const second = await rememberMemory({
    targetDir: d,
    type: "project",
    slug: "origin",
    content: "two",
    env: { CLAUDECODE: "1", CLAUDE_SESSION_ID: "second" },
    username: "last",
    email: "last@example.test",
  });
  assert.equal(second.provenance.agentClient, "cursor");
  assert.equal(second.provenance.originSessionId, "first");
  assert.equal(second.provenance.username, "last");
});
test("slug and content validation fail before writing", async (t) => {
  const d = await base(t);
  for (const slug of ["../escape", "two-words", "project_prefixed", ""])
    await assert.rejects(async () => await remember(d, "project", slug));
  await initSkills({ targetDir: d, skillTypes: ["managed"] });
  for (const slug of ["two_words", "x".repeat(65), "../escape"])
    await assert.rejects(async () => await remember(d, "managed", slug));
  await assert.rejects(
    async () =>
      await rememberMemory({
        targetDir: d,
        type: "project",
        slug: "empty",
        title: "Empty",
        description: "Empty",
        content: "  ",
      }),
  );
  assert.equal(
    fs.existsSync(join(d, ".harness/memory/projects/project_empty/INDEX.md")),
    false,
  );
});
test("custom privilege YAML rejects string booleans and executable language headers stay inert", async (t) => {
  assert.throws(
    () =>
      parseTypeMeta(
        '<!-- project-memory-type:start -->\nname: secrets\nwritable: "true"\ngitignore: false\n<!-- project-memory-type:end -->',
      ),
    /Invalid type flag/,
  );
  const d = await base(t),
    file = ".harness/memory/projects/project_js/INDEX.md";
  put(d, file, '---js\n{description: "should not execute"}\n---\nBody');
  assert.deepEqual(parseFrontmatter(join(d, file)), {});
  assert.ok(
    (await doctorMemory({ targetDir: d })).remaining.some(
      (f) => f.code === "invalid-entry",
    ),
  );
});
test("custom descriptions with YAML punctuation roundtrip without corrupting registration", async (t) => {
  const d = await base(t),
    description = "Docs: use # carefully";
  await addMemoryType({ targetDir: d, name: "docs", description });
  assert.equal(
    layerTypeSpecs(d).find((s) => s.name === "docs")?.description,
    description,
  );
  await remember(d, "docs");
  assert.equal((await doctorMemory({ targetDir: d })).remaining.length, 0);
});
test("private entry updates preserve existing OS permissions", async (t) => {
  const d = fixture(t);
  await initMemory({ targetDir: d, memoryTypes: ["user"] });
  await remember(d, "user");
  const file = join(d, ".harness/memory/users/user_example/INDEX.md");
  fs.chmodSync(file, 0o640);
  await remember(d, "user", "example");
  assert.equal(fs.statSync(file).mode & 0o777, 0o640);
});
for (const [label, source] of [
  [
    "malformed YAML",
    "---\nname: project_broken\ndescription: [broken\nmetadata:\n  vendor: retain-me\n---\nOriginal body\n",
  ],
  [
    "unterminated frontmatter",
    "---\nname: project_broken\ndescription: missing close\nmetadata:\n  vendor: retain-me\nOriginal body\n",
  ],
] as const)
  test(`remember refuses ${label} without changing entry or index`, async (t) => {
    const d = await base(t),
      file = ".harness/memory/projects/project_broken/INDEX.md";
    put(d, file, source);
    const beforeEntry = fs.readFileSync(join(d, file)),
      beforeIndex = fs.readFileSync(join(d, pi));
    await assert.rejects(
      async () =>
        await rememberMemory({
          targetDir: d,
          type: "project",
          slug: "broken",
          title: "Replacement",
          description: "Replacement",
          content: "New body",
        }),
    );
    assert.deepEqual(fs.readFileSync(join(d, file)), beforeEntry);
    assert.deepEqual(fs.readFileSync(join(d, pi)), beforeIndex);
    assert.ok(
      (await doctorMemory({ targetDir: d, apply: true })).remaining.some(
        (f) => f.code === "invalid-entry",
      ),
    );
    assert.deepEqual(fs.readFileSync(join(d, file)), beforeEntry);
  });
for (const type of ["project", "managed", "referenced"] as const)
  test(`${type} index renders multiline YAML as one safe link and plain text`, async (t) => {
    const d = fixture(t),
      directory = "tricky ) [name] #?.skill";
    const file =
      type === "project"
        ? ".harness/memory/projects/project_source/INDEX.md"
        : type === "managed"
          ? `.harness/skills/managed/${directory}/SKILL.md`
          : `.agents/skills/${directory}/SKILL.md`;
    const source =
      "---\nname: source\nmetadata:\n  edges-title: |-\n    Safe ](../../wrong.md)\n    - [Forged title](../../elsewhere.md)\ndescription: |-\n  Good summary\n  - [Forged](../../elsewhere.md) — injected\n---\nOriginal body\n";
    put(d, file, source);
    const result = type === "project"
      ? await initMemory({ targetDir: d, memoryTypes: [type] })
      : await initSkills({ targetDir: d, skillTypes: [type] });
    assert.equal(result.complete, true, JSON.stringify(result));
    const index = type === "project" ? pi : `.harness/skills/${type}/README.md`;
    const text = read(d, index)
      .split("<!-- project-entries-local:start -->")[1]!
      .split("<!-- project-entries-local:end -->")[0]!
      .replace(/^\s*## 本层内容/, "")
      .trim();
    assert.equal(text.split("\n").length, 1);
    const nodes: Nodes[] = [],
      visit = (node: Nodes) => {
        nodes.push(node);
        if ("children" in node) node.children.forEach(visit);
      };
    visit(fromMarkdown(text));
    const links = nodes.filter((n) => n.type === "link");
    assert.equal(nodes.filter((n) => n.type === "listItem").length, 1);
    assert.equal(links.length, 1);
    const expectedPath =
      type === "project"
        ? "project_source/INDEX.md"
        : type === "managed"
          ? `${directory}/SKILL.md`
          : `../../../.agents/skills/${directory}/SKILL.md`;
    assert.equal(decodeURIComponent(links[0]!.url), expectedPath);
    assert.equal(
      links[0]!.children.map((n) => ("value" in n ? n.value : "")).join(""),
      "Safe ](../../wrong.md) - [Forged title](../../elsewhere.md)",
    );
    assert.ok(
      nodes.some(
        (n) =>
          n.type === "text" &&
          n.value.includes(
            "Good summary - [Forged](../../elsewhere.md) — injected",
          ),
      ),
    );
    assert.equal(
      (await doctorMemory({ targetDir: d, apply: true })).remaining.length,
      0,
    );
    assert.equal(read(d, file), source);
  });
function exposeTypePath(scope: string, directory: string, filename: string) {
  put(
    scope,
    ".harness/.gitignore",
    `!memory/${directory}/\nmemory/${directory}/*\n${filename.includes("/") ? `!memory/${directory}/${filename.split("/")[0]}/\n` : ""}!memory/${directory}/${filename}\n`,
  );
}
for (const exposed of ["user_example/INDEX.md", "README.md"])
  test(`remember preflights private entry and index when ${exposed} is unignored`, async (t) => {
    const d = fixture(t);
    execFileSync("git", ["init", "-q", d]);
    await initMemory({ targetDir: d, memoryTypes: ["user"] });
    await remember(d, "user");
    const index = ".harness/memory/users/README.md",
      entry = ".harness/memory/users/user_example/INDEX.md";
    const oldIndex = read(d, index),
      oldEntry = read(d, entry);
    exposeTypePath(d, "users", exposed);
    await assert.rejects(
      async () =>
        await rememberMemory({
          targetDir: d,
          type: "user",
          slug: "example",
          content: "replacement secret",
        }),
      /private-ignore|忽略/,
    );
    assert.equal(read(d, entry), oldEntry);
    assert.equal(read(d, index), oldIndex);
  });
test("private index refresh refuses to write an exposed index", async (t) => {
  const d = fixture(t);
  execFileSync("git", ["init", "-q", d]);
  await initMemory({ targetDir: d, memoryTypes: ["user"] });
  const index = ".harness/memory/users/README.md",
    before = read(d, index);
  put(
    d,
    ".harness/memory/users/user_new/INDEX.md",
    "---\nname: user_new\ndescription: synthetic private description\n---\nsecret body\n",
  );
  exposeTypePath(d, "users", "README.md");
  await assert.rejects(
    async () => await refreshIndex(d, "user"),
    /private-ignore|忽略/,
  );
  assert.equal(read(d, index), before);
});
test("init and add-type refuse an exposed private index before creation", async (t) => {
  const d = fixture(t);
  execFileSync("git", ["init", "-q", d]);
  exposeTypePath(d, "users", "README.md");
  await assert.rejects(
    async () => await initMemory({ targetDir: d, memoryTypes: ["user"] }),
    /private-ignore|忽略/,
  );
  assert.equal(
    fs.existsSync(join(d, ".harness/memory/users/README.md")),
    false,
  );
  await initMemory({ targetDir: d, memoryTypes: ["project"] });
  exposeTypePath(d, "secrets", "README.md");
  await assert.rejects(
    async () =>
      await addMemoryType({
        targetDir: d,
        name: "secrets",
        description: "Synthetic private description",
        gitignore: true,
      }),
    /private-ignore|忽略/,
  );
  assert.equal(
    fs.existsSync(join(d, ".harness/memory/secrets/README.md")),
    false,
  );
});
test("doctor leaves an exposed missing private index unrepaired", async (t) => {
  const d = fixture(t);
  execFileSync("git", ["init", "-q", d]);
  await initMemory({ targetDir: d, memoryTypes: ["user"] });
  await remember(d, "user");
  const index = ".harness/memory/users/README.md";
  fs.unlinkSync(join(d, index));
  exposeTypePath(d, "users", "README.md");
  const report = await doctorMemory({ targetDir: d, apply: true });
  assert.equal(fs.existsSync(join(d, index)), false);
  assert.ok(report.remaining.some((f) => f.type === "user"));
});
test("custom private child scopes preflight effective ignores and preserve non-Git support", async (t) => {
  const d = fixture(t),
    child = join(d, "child");
  execFileSync("git", ["init", "-q", d]);
  fs.mkdirSync(child);
  await initMemory({ targetDir: child, rootDir: d, memoryTypes: ["project"] });
  await addMemoryType({
    targetDir: child,
    name: "secrets",
    description: "Private",
    gitignore: true,
  });
  await remember(child, "secrets", "allowed");
  execFileSync("git", [
    "-C",
    d,
    "check-ignore",
    "-q",
    "--no-index",
    "child/.harness/memory/secrets/secrets_allowed/INDEX.md",
  ]);
  exposeTypePath(child, "secrets", "secrets_example/INDEX.md");
  await assert.rejects(
    async () => await remember(child, "secrets"),
    /private-ignore|忽略/,
  );
  assert.equal(
    fs.existsSync(
      join(child, ".harness/memory/secrets/secrets_example/INDEX.md"),
    ),
    false,
  );
  const plain = fixture(t);
  await initMemory({ targetDir: plain, memoryTypes: ["user"] });
  await remember(plain, "user");
  assert.equal(
    fs.existsSync(join(plain, ".harness/memory/users/user_example/INDEX.md")),
    true,
  );
});
function temporaryEnvironment(t: TestContext, name: string, value: string) {
  const before = process.env[name];
  process.env[name] = value;
  t.after(() => {
    if (before === undefined) delete process.env[name];
    else process.env[name] = before;
  });
}
test("Git discovery failure cannot expose private memory through a missing GIT_DIR", async (t) => {
  const d = fixture(t);
  execFileSync("git", ["init", "-q", d]);
  await initMemory({ targetDir: d, memoryTypes: ["user"] });
  exposeTypePath(d, "users", "user_example/INDEX.md");
  const index = ".harness/memory/users/README.md",
    before = read(d, index);
  temporaryEnvironment(t, "GIT_DIR", join(d, "missing-git-dir"));
  await assert.rejects(
    async () => await remember(d, "user"),
    /private-ignore-check-failed/,
  );
  assert.equal(
    fs.existsSync(join(d, ".harness/memory/users/user_example/INDEX.md")),
    false,
  );
  assert.equal(read(d, index), before);
});
test("effective ignore checking supports genuine non-Git directories with or without Git installed", (t) => {
  const d = fixture(t);
  assert.doesNotThrow(() => assertPrivateIgnored(d, [join(d, "private.md")]));
  temporaryEnvironment(t, "PATH", join(d, "missing-bin"));
  assert.doesNotThrow(() => assertPrivateIgnored(d, [join(d, "private.md")]));
});
test("missing Git binary fails closed inside a real repository", (t) => {
  const d = fixture(t);
  execFileSync("git", ["init", "-q", d]);
  temporaryEnvironment(t, "PATH", join(d, "missing-bin"));
  assert.throws(
    () => assertPrivateIgnored(d, [join(d, "private.md")]),
    /private-ignore-check-failed/,
  );
});
test("broken ancestor worktree metadata is not mistaken for a non-Git directory", (t) => {
  const d = fixture(t),
    child = join(d, "child");
  fs.mkdirSync(child);
  put(d, ".git", "gitdir: missing-worktree-metadata\n");
  assert.throws(
    () => assertPrivateIgnored(child, [join(child, "private.md")]),
    /private-ignore-check-failed/,
  );
});
test("explicit broken Git context is rejected even outside a discovered repository", (t) => {
  const d = fixture(t);
  temporaryEnvironment(t, "GIT_DIR", join(d, "missing-git-dir"));
  assert.throws(
    () => assertPrivateIgnored(d, [join(d, "private.md")]),
    /private-ignore-check-failed/,
  );
});
test("bare repositories cannot bypass failed effective-ignore checks", (t) => {
  const d = fixture(t);
  execFileSync("git", ["init", "--bare", "-q", d]);
  assert.throws(
    () => assertPrivateIgnored(d, [join(d, "private.md")]),
    /private-ignore-check-failed/,
  );
});
for (const context of [
  "broken-link",
  "broken-environment",
  "selected-environment",
] as const)
  for (const operation of [
    "init",
    "add-type",
    "remember",
    "refresh",
    "doctor",
  ] as const)
    test(`${operation} guards private writes with ${context} and no discoverable Git root`, async (t) => {
      const d = fixture(t),
        index = ".harness/memory/users/README.md";
      await initMemory({
        targetDir: d,
        memoryTypes:
          operation === "init" || operation === "add-type"
            ? ["project"]
            : ["user"],
      });
      if (operation === "refresh")
        put(
          d,
          ".harness/memory/users/user_new/INDEX.md",
          "---\nname: user_new\ndescription: private synthetic description\n---\nbody\n",
        );
      if (operation === "doctor") fs.unlinkSync(join(d, index));
      const before = fs.existsSync(join(d, index)) ? read(d, index) : undefined;
      if (context === "broken-link")
        fs.symlinkSync("missing-repository", join(d, ".git"));
      else if (context === "broken-environment")
        temporaryEnvironment(t, "GIT_DIR", join(d, "missing-repository"));
      else {
        const repository = fixture(t);
        execFileSync("git", ["init", "-q", repository]);
        temporaryEnvironment(t, "GIT_DIR", join(repository, ".git"));
        temporaryEnvironment(t, "GIT_WORK_TREE", d);
      }
      const calls = {
        init: async () =>
          await initMemory({ targetDir: d, memoryTypes: ["user"] }),
        "add-type": async () =>
          await addMemoryType({
            targetDir: d,
            name: "secrets",
            description: "Private",
            gitignore: true,
          }),
        remember: async () => await remember(d, "user"),
        refresh: async () => await refreshIndex(d, "user"),
        doctor: async () => await doctorMemory({ targetDir: d, apply: true }),
      };
      if (operation === "doctor")
        assert.ok(
          (await calls.doctor()).remaining.some((f) => f.type === "user"),
        );
      else
        await assert.rejects(
          calls[operation],
          /private-ignore-(?:check|coverage)-failed/,
        );
      assert.equal(
        fs.existsSync(join(d, ".harness/memory/secrets/README.md")),
        false,
      );
      assert.equal(
        fs.existsSync(join(d, ".harness/memory/users/user_example/INDEX.md")),
        false,
      );
      assert.equal(
        fs.existsSync(join(d, index)) ? read(d, index) : undefined,
        before,
      );
    });
test("all private callers still work in a confirmed non-Git scope without a Git binary", async (t) => {
  const d = fixture(t),
    index = ".harness/memory/users/README.md";
  temporaryEnvironment(t, "PATH", join(d, "missing-bin"));
  await initMemory({ targetDir: d, memoryTypes: ["user"] });
  await addMemoryType({
    targetDir: d,
    name: "secrets",
    description: "Private",
    gitignore: true,
  });
  await remember(d, "user");
  await remember(d, "secrets");
  await refreshIndex(d, "user");
  fs.unlinkSync(join(d, index));
  assert.equal(
    (await doctorMemory({ targetDir: d, apply: true })).remaining.length,
    0,
  );
  assert.ok(fs.existsSync(join(d, index)));
  assert.ok(
    fs.existsSync(join(d, ".harness/memory/users/user_example/INDEX.md")),
  );
  assert.ok(
    fs.existsSync(join(d, ".harness/memory/secrets/secrets_example/INDEX.md")),
  );
});

test("type scan functions remain public after moving out of path primitives", async t => {
  const target = await base(t);
  await remember(target, "project");
  const { typeIndexPath, typeContentDir, listTypeFiles } = await import("../../src/services/memory/types.js");
  assert.equal(typeIndexPath(target, "project"), join(target, pi));
  assert.equal(typeContentDir(target, "project"), dirname(join(target, pi)));
  assert.deepEqual(listTypeFiles(target, "project"), [join(target, ".harness/memory/projects/project_example/INDEX.md")]);
  assert.equal(typeContentDir(target, "referenced"), join(target, ".agents/skills"));
});
