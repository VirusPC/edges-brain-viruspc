import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const load = () => import("../../../../scripts/migrate-recursive-layout.mts");
function put(root: string, rel: string, text: string) {
  const p = join(root, rel);
  fs.mkdirSync(join(p, ".."), { recursive: true });
  fs.writeFileSync(p, text);
  return p;
}
const hash = (p: string) =>
  createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const git = (root: string, ...args: string[]) =>
  execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
function fixture(t: any) {
  const root = fs.realpathSync(
    fs.mkdtempSync(join(tmpdir(), "instance-port-")),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  git(root, "init", "-q");
  put(
    root,
    "AGENTS.md",
    "# root\n<!-- project-memory:start -->\n<!-- project-memory-local:start -->\n<!-- project-memory-local:end -->\n<!-- project-memory-children:start -->\n<!-- project-memory-children:end -->\n<!-- project-memory:end -->\n",
  );
  put(root, ".gitignore", "**/.memory/users/\n**/.harness/memory/users/\n");
  put(root, "knowledge/posts/README.md", "# protected\n");
  put(
    root,
    "knowledge/teaching/lesson/page.md",
    "[task](../../tasks/demo/backlog/domain.md)\n",
  );
  put(root, "knowledge/tasks/demo/AGENTS.md", "# authored project\n");
  put(root, "knowledge/tasks/AGENTS.md", "# board manual\n");
  put(root, "knowledge/tasks/demo/backlog/domain.md", "# domain\n");
  put(root, "knowledge/tasks/demo/backlog/maintenance.md", "# maintenance\n");
  put(root, "observation/README.md", "# Observation\nCurrent duties.\n");
  git(root, "add", ".");
  git(
    root,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.com",
    "commit",
    "-qm",
    "fixture",
  );
  const pin = git(root, "rev-parse", "HEAD");
  git(
    root,
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${pin},evaluation/third_party/locomo`,
  );
  const manifest = {
    tasks: ["domain", "maintenance"].map((stem) => ({
      source: `knowledge/tasks/demo/backlog/${stem}.md`,
      target: `${stem === "domain" ? "tasks" : ".harness/tasks"}/demo/backlog/${stem}.md`,
      sha256: hash(join(root, `knowledge/tasks/demo/backlog/${stem}.md`)),
    })),
    protectedPostHashes: {
      "knowledge/posts/README.md": hash(
        join(root, "knowledge/posts/README.md"),
      ),
    },
    gitlink: {
      source: "evaluation/third_party/locomo",
      target: ".harness/evaluation/third_party/locomo",
      sha: pin,
    },
  };
  return { root, manifest };
}
function snapshot(root: string) {
  const r: Record<string, string> = {};
  function scan(p: string) {
    for (const n of fs.readdirSync(p)) {
      if (n === ".git") continue;
      const f = join(p, n);
      if (fs.statSync(f).isDirectory()) scan(f);
      else r[f] = hash(f);
    }
  }
  scan(root);
  return r;
}
function legacy(root: string, owner: string, title: string, extra = "") {
  put(
    root,
    `${owner}.memory/projects/AGENTS.md`,
    extra +
      `# Projects\n${title}\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n`,
  );
  put(
    root,
    `${owner}AGENTS.md`,
    "# scope\n<!-- project-memory:start -->\n<!-- project-memory-local:start -->\n- [projects](.memory/projects/AGENTS.md) — projects\n<!-- project-memory-local:end -->\n<!-- project-memory-children:start -->\n<!-- project-memory-children:end -->\n<!-- project-memory:end -->\n",
  );
}
test("instance routes tasks and gitlink while protected posts retain bytes", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load(),
    before = snapshot(root);
  m.runInstanceMigration(root, manifest, false);
  assert.deepEqual(snapshot(root), before);
  assert.equal(m.runInstanceMigration(root, manifest, true).status, "migrated");
  for (const item of manifest.tasks)
    assert.equal(hash(join(root, item.target)), item.sha256);
  assert.equal(
    hash(join(root, "knowledge/posts/README.md")),
    manifest.protectedPostHashes["knowledge/posts/README.md"],
  );
  assert.match(
    fs.readFileSync(join(root, "teaching/lesson/page.md"), "utf8"),
    /\.\.\/\.\.\/tasks\/demo/,
  );
  git(root, "add", "-A");
  assert.match(
    git(root, "ls-files", "--stage", manifest.gitlink.target),
    new RegExp(manifest.gitlink.sha),
  );
  const after = snapshot(root);
  m.runInstanceMigration(root, manifest, true);
  assert.deepEqual(snapshot(root), after);
});
test("instance refuses unknown owners without mutation", async (t) => {
  const { root, manifest } = fixture(t);
  put(root, "unknown/.memory/users/private.md", "secret");
  const before = snapshot(root),
    m = await load();
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /unknown-legacy-owner/,
  );
  assert.deepEqual(snapshot(root), before);
});
test("instance preserves owner-local metadata, introductions and AGENTS registrations", async (t) => {
  const { root, manifest } = fixture(t);
  legacy(root, "", "root intro", "---\nvendor: shared\n---\n");
  legacy(root, "extensions/", "module intro", "---\nother: kept\n---\n");
  put(
    root,
    "extensions/.memory/projects/project_example.md",
    "---\nname: example\ndescription: fixture\n---\nbody\n",
  );
  const m = await load();
  m.runInstanceMigration(root, manifest, true);
  const rootIndex = fs.readFileSync(
    join(root, ".harness/memory/projects/AGENTS.md"),
    "utf8",
  );
  const index = fs.readFileSync(
    join(root, "extensions/.harness/memory/projects/AGENTS.md"),
    "utf8",
  );
  assert.match(rootIndex, /root intro/);
  assert.match(rootIndex, /vendor: shared/);
  assert.doesNotMatch(rootIndex, /module intro/);
  assert.match(index, /module intro/);
  assert.match(index, /other: kept/);
  assert.match(
    fs.readFileSync(join(root, "extensions/AGENTS.md"), "utf8"),
    /project-memory:start/,
  );
});
test("metadata merge cannot silently discard authored fields", async () => {
  const m = await load();
  assert.throws(
    () =>
      m.mergeIndexMetadata(
        "---\nvendor: first\n---\n",
        "---\nvendor: second\n---\n",
      ),
    /metadata-conflict/,
  );
});
test("upgraded checkout routes ignored remnants into their original module", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  m.runInstanceMigration(root, manifest, true);
  put(root, "extensions/AGENTS.md", "# module\n");
  put(
    root,
    "extensions/.memory/users/AGENTS.md",
    "# private manual\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
  );
  put(root, "extensions/.memory/users/user_x.md", "secret");
  fs.chmodSync(join(root, "extensions/.memory"), 0o700);
  m.runInstanceMigration(root, manifest, true);
  assert.equal(
    fs.readFileSync(
      join(root, "extensions/.harness/memory/users/user_x.md"),
      "utf8",
    ),
    "secret",
  );
  assert.equal(
    fs.statSync(join(root, "extensions/.harness/memory/users")).mode & 0o777,
    0o700,
  );
  assert.match(
    fs.readFileSync(
      join(root, "extensions/.harness/memory/users/AGENTS.md"),
      "utf8",
    ),
    /private manual/,
  );
});
test("pending old instance journal adds missing official private index on resume", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  m.runInstanceMigration(root, manifest, true);
  const agents = join(root, "AGENTS.md");
  fs.writeFileSync(
    agents,
    fs
      .readFileSync(agents, "utf8")
      .replace(
        "<!-- project-memory-local:end -->",
        "- [users](.harness/memory/users/AGENTS.md) — users\n<!-- project-memory-local:end -->",
      ),
  );
  const job = m.makeInstancePlan(root, manifest);
  job.root = root;
  put(root, ".recursive-layout-migration/journal.json", JSON.stringify(job));
  m.runInstanceMigration(root, manifest, true);
  assert.match(
    fs.readFileSync(join(root, ".harness/memory/users/AGENTS.md"), "utf8"),
    /project-memory-entries:start/,
  );
});
test("pending instance journal detects later target edit before any write", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  const job = m.makeInstancePlan(root, manifest);
  job.root = root;
  put(root, ".recursive-layout-migration/journal.json", JSON.stringify(job));
  put(root, manifest.tasks[0]!.target, "later edit");
  const before = snapshot(root);
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /resume-target-edited/,
  );
  assert.deepEqual(snapshot(root), before);
});

for (const [label, field] of [
  ["quoted", "'private-key': second"],
  ["non-ASCII", "作者: second"],
])
  test(`metadata merge rejects unsupported ${label} keys`, async () => {
    const m = await load();
    assert.throws(
      () =>
        m.mergeIndexMetadata(
          "---\nvendor: shared\n---\n",
          `---\nvendor: shared\n${field}\n---\n`,
        ),
      /metadata-structure-needs-review/,
    );
  });
test("protected post edits and links requiring rewrite refuse before migration", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  put(
    root,
    "knowledge/posts/README.md",
    "[task](../tasks/demo/backlog/domain.md)\n",
  );
  manifest.protectedPostHashes["knowledge/posts/README.md"] = hash(
    join(root, "knowledge/posts/README.md"),
  );
  const before = snapshot(root);
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /protected-post-link-needs-human/,
  );
  assert.deepEqual(snapshot(root), before);
  manifest.protectedPostHashes["knowledge/posts/README.md"] = "wrong";
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /protected-post-hash-mismatch/,
  );
  assert.deepEqual(snapshot(root), before);
});
test("reviewed source and gitlink hashes cannot drift silently", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  manifest.tasks[0]!.sha256 = "wrong";
  const before = snapshot(root);
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /reviewed-source-hash-mismatch/,
  );
  assert.deepEqual(snapshot(root), before);
  manifest.tasks[0]!.sha256 = hash(join(root, manifest.tasks[0]!.source));
  manifest.gitlink.sha = "0000000000000000000000000000000000000000";
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /gitlink-pin-mismatch/,
  );
  assert.deepEqual(snapshot(root), before);
});
test("private indexes of different owners remain separate", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  for (const owner of ["", "extensions/"]) {
    legacy(root, owner, "manual");
    put(
      root,
      owner + ".memory/users/AGENTS.md",
      `# private ${owner} manual\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n`,
    );
  }
  m.runInstanceMigration(root, manifest, true);
  assert.match(
    fs.readFileSync(
      join(root, "extensions/.harness/memory/users/AGENTS.md"),
      "utf8",
    ),
    /private extensions/,
  );
  assert.doesNotMatch(
    fs.readFileSync(join(root, ".harness/memory/users/AGENTS.md"), "utf8"),
    /private extensions/,
  );
});
test("missing adopted custom type refuses before ignore or journal writes", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  m.runInstanceMigration(root, manifest, true);
  const agents = join(root, "AGENTS.md");
  fs.writeFileSync(
    agents,
    fs
      .readFileSync(agents, "utf8")
      .replace(
        "<!-- project-memory-local:end -->",
        "- [custom](.harness/memory/custom/AGENTS.md) — custom\n<!-- project-memory-local:end -->",
      ),
  );
  const before = snapshot(root);
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /missing-adopted-type-index/,
  );
  assert.deepEqual(snapshot(root), before);
});
test("instance interrupted private copy resumes its persisted plan", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  m.runInstanceMigration(root, manifest, true);
  put(root, "extensions/AGENTS.md", "# module\n");
  put(
    root,
    "extensions/.memory/users/AGENTS.md",
    "# private intro\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
  );
  put(root, "extensions/.memory/users/user_x.md", "private");
  fs.chmodSync(join(root, "extensions/.memory"), 0o700);
  fs.mkdirSync(join(root, ".harness/memory/users"), {
    recursive: true,
    mode: 0o755,
  });
  fs.chmodSync(join(root, ".harness/memory/users"), 0o755);
  const moduleUrl = new URL(
    "../../../../scripts/migrate-recursive-layout.mts",
    import.meta.url,
  ).href;
  const script = `import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';import {execFileSync} from 'node:child_process';import {dirname} from 'node:path';const root=${JSON.stringify(root)};const rename=fs.renameSync;fs.renameSync=(source,target)=>{if(String(target).includes('/.harness/memory/users/')){if((fs.statSync(dirname(target)).mode&0o777)!==0o700)throw Error('privacy-mode-not-ready');execFileSync('git',['-C',root,'check-ignore','-q','--no-index',String(target)]);throw Error('injected-before-private-copy');}return rename(source,target);};syncBuiltinESMExports();const m=await import(${JSON.stringify(moduleUrl)});try{m.runInstanceMigration(root,${JSON.stringify(manifest)},true);}catch(e){console.error(e.message);process.exitCode=71;}`;
  let error: any;
  try {
    execFileSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", script],
      { encoding: "utf8", stdio: "pipe" },
    );
  } catch (e) {
    error = e;
  }
  assert.equal(error.status, 71);
  assert.match(error.stderr, /injected-before-private-copy/);
  assert.equal(
    fs.existsSync(join(root, "extensions/.memory/users/user_x.md")),
    true,
  );
  assert.equal(m.runInstanceMigration(root, manifest, true).status, "migrated");
  assert.equal(
    fs.readFileSync(
      join(root, "extensions/.harness/memory/users/user_x.md"),
      "utf8",
    ),
    "private",
  );
});

test("flat private index destination receives private permissions", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  m.runInstanceMigration(root, manifest, true);
  put(
    root,
    ".memory/USER.md",
    "# flat private\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
  );
  m.runInstanceMigration(root, manifest, true);
  assert.equal(
    fs.statSync(join(root, ".harness/memory/users")).mode & 0o777,
    0o700,
  );
  assert.match(
    fs.readFileSync(join(root, ".harness/memory/users/AGENTS.md"), "utf8"),
    /flat private/,
  );
});
test("private remnants preserve external relative links after local layout conversion", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  m.runInstanceMigration(root, manifest, true);
  put(root, "extensions/AGENTS.md", "# module\n");
  put(
    root,
    "extensions/.memory/users/AGENTS.md",
    "# manual\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
  );
  put(
    root,
    "extensions/.memory/users/user_x.md",
    "[target](../../target.txt)\n",
  );
  put(root, "extensions/target.txt", "kept");
  m.runInstanceMigration(root, manifest, true);
  assert.equal(
    fs.readFileSync(
      join(root, "extensions/.harness/memory/users/user_x.md"),
      "utf8",
    ),
    "[target](../../../target.txt)\n",
  );
  assert.equal(
    fs.readFileSync(join(root, "extensions/target.txt"), "utf8"),
    "kept",
  );
});
test("instance newly added source and changed directory permissions prevent resume", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  legacy(root, "", "manual");
  put(root, ".memory/projects/project_x.md", "body");
  const job = m.makeInstancePlan(root, manifest);
  job.root = root;
  put(root, ".recursive-layout-migration/journal.json", JSON.stringify(job));
  put(root, ".memory/projects/new.bin", "new");
  let before = snapshot(root);
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /legacy-source-added-after-preflight/,
  );
  assert.deepEqual(snapshot(root), before);
  fs.unlinkSync(join(root, ".memory/projects/new.bin"));
  fs.chmodSync(join(root, ".memory/projects"), 0o700);
  before = snapshot(root);
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /resume-source-directory-mode-changed/,
  );
  assert.deepEqual(snapshot(root), before);
});
test("instance keeps custom skills module ownership after local layout conversion", async (t) => {
  const { root, manifest } = fixture(t);
  legacy(root, "", "root");
  put(
    root,
    ".memory/docs/AGENTS.md",
    "<!-- project-memory-type:start -->\nname: guide\nmodule: skills\nwritable: false\ngitignore: true\nformat: ordinary\n<!-- project-memory-type:end -->\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
  );
  put(
    root,
    ".memory/docs/guide_x.md",
    "---\nname: x\ndescription: doc\n---\nbody",
  );
  const m = await load();
  m.runInstanceMigration(root, manifest, true);
  assert.equal(
    fs.readFileSync(join(root, ".harness/skills/docs/guide_x.md"), "utf8"),
    "---\nname: x\ndescription: doc\n---\nbody",
  );
  assert.equal(fs.existsSync(join(root, ".harness/memory/docs")), false);
  git(root, "check-ignore", ".harness/skills/docs/guide_x.md");
});

test("instance destination collision leaves source and destination unchanged", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  put(root, manifest.tasks[0]!.target, "newer target");
  const before = snapshot(root);
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /target-content-conflict/,
  );
  assert.deepEqual(snapshot(root), before);
});

for (const kind of ["users", "docs"])
  for (const resume of [false, true])
    test(`nested negations block ${kind} private bytes before ${resume ? "resumed" : "planned"} copy`, async (t) => {
      const { root, manifest } = fixture(t),
        m = await load();
      m.runInstanceMigration(root, manifest, true);
      const fields =
        kind === "docs"
          ? "<!-- project-memory-type:start -->\nname: docs\nwritable: false\ngitignore: true\nformat: ordinary\n<!-- project-memory-type:end -->\n"
          : "";
      put(
        root,
        `.memory/${kind}/AGENTS.md`,
        fields +
          "# private\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
      );
      const leaf = kind === "users" ? "user_new.md" : "docs_new.md";
      put(root, `.memory/${kind}/${leaf}`, "private bytes");
      put(
        root,
        ".harness/.gitignore",
        `!memory/${kind}/\n!memory/${kind}/**\nmemory/${kind}/AGENTS.md\n`,
      );
      if (resume) {
        const job = m.makeInstancePlan(root, manifest);
        job.root = root;
        put(
          root,
          ".recursive-layout-migration/journal.json",
          JSON.stringify(job),
        );
      }
      const journal = join(root, ".recursive-layout-migration/journal.json"),
        before = fs.readFileSync(journal);
      assert.throws(
        () => m.runInstanceMigration(root, manifest, true),
        /ignore-coverage-failed/,
      );
      assert.equal(
        fs.existsSync(join(root, `.harness/memory/${kind}/${leaf}`)),
        false,
      );
      assert.equal(
        fs.existsSync(join(root, `.harness/memory/${kind}/AGENTS.md`)),
        false,
      );
      assert.deepEqual(fs.readFileSync(journal), before);
      assert.equal(
        fs.readFileSync(join(root, `.memory/${kind}/${leaf}`), "utf8"),
        "private bytes",
      );
    });

for (const change of ["source-sha", "source-mode", "target-sha", "target-mode"])
  test(`saved gitlink rejects ${change} drift before any write`, async (t) => {
    const { root, manifest } = fixture(t),
      m = await load(),
      job = m.makeInstancePlan(root, manifest);
    job.root = root;
    put(root, ".recursive-layout-migration/journal.json", JSON.stringify(job));
    const blob = change.endsWith("mode")
      ? git(root, "hash-object", "-w", "--stdin")
      : git(
          root,
          "-c",
          "user.name=Fixture",
          "-c",
          "user.email=fixture@example.com",
          "commit-tree",
          git(root, "rev-parse", "HEAD^{tree}"),
          "-m",
          "later pin",
        );
    const source = change.startsWith("source"),
      path = source ? manifest.gitlink.source : manifest.gitlink.target;
    git(
      root,
      "update-index",
      "--add",
      "--cacheinfo",
      `${change.endsWith("mode") ? "100644" : "160000"},${blob},${path}`,
    );
    const before = snapshot(root),
      index = git(root, "ls-files", "--stage");
    assert.throws(
      () => m.runInstanceMigration(root, manifest, true),
      /gitlink.*mismatch/,
    );
    assert.deepEqual(snapshot(root), before);
    assert.equal(git(root, "ls-files", "--stage"), index);
  });
test("saved gitlink accepts a completed interrupted move", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load(),
    job = m.makeInstancePlan(root, manifest);
  job.root = root;
  put(root, ".recursive-layout-migration/journal.json", JSON.stringify(job));
  git(
    root,
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${manifest.gitlink.sha},${manifest.gitlink.target}`,
  );
  git(root, "update-index", "--force-remove", manifest.gitlink.source);
  fs.mkdirSync(join(root, manifest.gitlink.target), { recursive: true });
  assert.equal(m.runInstanceMigration(root, manifest, true).status, "migrated");
  assert.equal(
    git(root, "ls-files", "--stage", manifest.gitlink.target),
    `160000 ${manifest.gitlink.sha} 0\t${manifest.gitlink.target}`,
  );
  assert.equal(git(root, "ls-files", "--stage", manifest.gitlink.source), "");
});
for (const flag of ["--help", "-h"])
  test(`instance ${flag} exits successfully without touching filesystem`, (t) => {
    const { root } = fixture(t),
      before = snapshot(root);
    const script = new URL(
      "../../../../scripts/migrate-recursive-layout.mts",
      import.meta.url,
    );
    const loader = import.meta.resolve("tsx");
    const output = execFileSync(
      process.execPath,
      ["--import", loader, script.pathname, flag],
      { cwd: root, encoding: "utf8", stdio: "pipe" },
    );
    assert.match(output, /Usage:.*migrate-recursive-layout/);
    for (const option of ["--worktree", "--manifest", "--dry-run", "--apply"])
      assert.ok(output.includes(option));
    assert.deepEqual(snapshot(root), before);
  });

test("journal negation is rejected before recording any planned bytes", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  put(
    root,
    ".gitignore",
    "**/.recursive-layout-migration/\n!.recursive-layout-migration/\n!.recursive-layout-migration/**\n",
  );
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /ignore-coverage-failed/,
  );
  assert.equal(fs.existsSync(join(root, ".recursive-layout-migration")), false);
  assert.equal(fs.existsSync(join(root, manifest.tasks[0]!.target)), false);
});
test("completed gitlink move rejects a later destination pin before resume", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load(),
    job = m.makeInstancePlan(root, manifest);
  job.root = root;
  put(root, ".recursive-layout-migration/journal.json", JSON.stringify(job));
  const next = git(
    root,
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.com",
    "commit-tree",
    git(root, "rev-parse", "HEAD^{tree}"),
    "-m",
    "later pin",
  );
  git(
    root,
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${next},${manifest.gitlink.target}`,
  );
  git(root, "update-index", "--force-remove", manifest.gitlink.source);
  const before = snapshot(root),
    index = git(root, "ls-files", "--stage");
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /gitlink.*mismatch/,
  );
  assert.deepEqual(snapshot(root), before);
  assert.equal(git(root, "ls-files", "--stage"), index);
});

test("saved gitlink resumes after destination was added but source was not removed", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load(),
    job = m.makeInstancePlan(root, manifest);
  job.root = root;
  put(root, ".recursive-layout-migration/journal.json", JSON.stringify(job));
  git(
    root,
    "update-index",
    "--add",
    "--cacheinfo",
    `160000,${manifest.gitlink.sha},${manifest.gitlink.target}`,
  );
  assert.equal(
    git(root, "ls-files", "--stage", manifest.gitlink.source),
    `160000 ${manifest.gitlink.sha} 0\t${manifest.gitlink.source}`,
  );
  assert.equal(m.runInstanceMigration(root, manifest, true).status, "migrated");
  assert.equal(git(root, "ls-files", "--stage", manifest.gitlink.source), "");
  assert.equal(
    git(root, "ls-files", "--stage", manifest.gitlink.target),
    `160000 ${manifest.gitlink.sha} 0\t${manifest.gitlink.target}`,
  );
});
test("saved gitlink refuses an intermediate pair with a conflicted target stage", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load(),
    job = m.makeInstancePlan(root, manifest);
  job.root = root;
  put(root, ".recursive-layout-migration/journal.json", JSON.stringify(job));
  execFileSync("git", ["-C", root, "update-index", "--index-info"], {
    input: `160000 ${manifest.gitlink.sha} 2\t${manifest.gitlink.target}\n`,
    encoding: "utf8",
  });
  const before = snapshot(root),
    index = git(root, "ls-files", "--stage");
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /gitlink.*mismatch/,
  );
  assert.deepEqual(snapshot(root), before);
  assert.equal(git(root, "ls-files", "--stage"), index);
});

for (const failure of ["missing-binary", "broken-repository"] as const)
  test(`instance migration refuses ${failure} before journal or destination writes`, async (t) => {
    const { root, manifest } = fixture(t),
      m = await load();
    put(
      root,
      ".gitignore",
      "**/.recursive-layout-migration/\n!.recursive-layout-migration/\n!.recursive-layout-migration/**\n",
    );
    const before = snapshot(root),
      oldPath = process.env.PATH;
    if (failure === "missing-binary")
      process.env.PATH = join(root, "missing-bin");
    else {
      fs.rmSync(join(root, ".git"), { recursive: true });
      fs.symlinkSync("missing-repository", join(root, ".git"));
    }
    try {
      assert.throws(
        () => m.runInstanceMigration(root, manifest, true),
        /git|ENOENT/i,
      );
    } finally {
      if (oldPath === undefined) delete process.env.PATH;
      else process.env.PATH = oldPath;
    }
    assert.equal(
      fs.existsSync(join(root, ".recursive-layout-migration")),
      false,
    );
    assert.equal(fs.existsSync(join(root, manifest.tasks[0]!.target)), false);
    assert.deepEqual(snapshot(root), before);
  });

test("instance root generator registers owned modules in three sections and preserves manual prose", async (t) => {
  const { root, manifest } = fixture(t);
  const file = join(root, "AGENTS.md");
  fs.writeFileSync(
    file,
    fs
      .readFileSync(file, "utf8")
      .replace(
        "<!-- project-memory-local:end -->",
        "- [manual](manual.md) — user pointer\n<!-- project-memory-local:end -->",
      ) + "\n## Authored guidance\nKeep this prose.\n",
  );
  const { runInstanceMigration } = await load();
  runInstanceMigration(root, manifest, true);
  const source = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(source, /## 工作与模块入口|## 下层作用域/);
  assert.match(source, /## Authored guidance\nKeep this prose\./);
  assert.match(source, /\[manual\]\(manual.md\)/);
  const { LegacyIndex: AgentsNode } =
    await import("../../../../scripts/legacy-index.mjs");
  const node = new AgentsNode(file).parse(source);
  assert.ok(
    node.children.some(
      (ref) =>
        ref.target === ".harness/tasks/AGENTS.md" && ref.kind === "local",
    ),
  );
  assert.ok(
    node.children.some(
      (ref) =>
        ref.target === "extensions/AGENTS.md" && ref.kind === "descendant",
    ),
  );
  assert.equal(
    node.children.filter(
      (ref) => ref.target === ".harness/evaluation/AGENTS.md",
    ).length,
    1,
  );
});

test("corrected instance ownership keeps public and custom private records at their original owner", async (t) => {
  const { root, manifest } = fixture(t);
  legacy(root, "", "root");
  legacy(root, "extensions/", "module");
  put(root, "extensions/.memory/projects/project_local.md", "latest");
  put(
    root,
    "extensions/.memory/docs/AGENTS.md",
    "<!-- project-memory-type:start -->\nname: secret\nmodule: memory\nwritable: true\ngitignore: true\nformat: ordinary\n<!-- project-memory-type:end -->\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
  );
  put(root, "extensions/.memory/docs/secret_x.md", "private fixture");
  const m = await load();
  m.runInstanceMigration(root, manifest, true);
  assert.equal(
    fs.readFileSync(
      join(root, "extensions/.harness/memory/projects/project_local.md"),
      "utf8",
    ),
    "latest",
  );
  assert.equal(
    fs.readFileSync(
      join(root, "extensions/.harness/memory/docs/secret_x.md"),
      "utf8",
    ),
    "private fixture",
  );
  assert.match(
    fs.readFileSync(join(root, "extensions/AGENTS.md"), "utf8"),
    /\.harness\/memory\/projects\/AGENTS.md/,
  );
  assert.equal(
    fs.existsSync(join(root, ".harness/memory/projects/project_local.md")),
    false,
  );
  const before = snapshot(root);
  m.runInstanceMigration(root, manifest, true);
  assert.deepEqual(snapshot(root), before);
});
test("pending historical promotion journals refuse before replaying wrong ownership", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  put(root, "extensions/.memory/users/private.md", "private fixture");
  const generic = await import("../../src/services/memory/migrate.js");
  const job = {
    root,
    phase: "planned",
    operations: [
      {
        source: join(root, "extensions/.memory/users/private.md"),
        target: join(root, ".harness/memory/users/private.md"),
        before: generic.fileState("private fixture"),
        after: generic.fileState("private fixture"),
        originalTarget: null,
      },
    ],
    directories: [],
    private: [],
    watchedSources: [],
    legacyOwners: [],
    protected: {},
    diagnostics: [],
    gitlink: null,
  };
  put(root, ".recursive-layout-migration/journal.json", JSON.stringify(job));
  const before = snapshot(root);
  assert.throws(
    () => m.runInstanceMigration(root, manifest, true),
    /historical-owner-promotion-journal-needs-review/,
  );
  assert.deepEqual(snapshot(root), before);
});
test("private remnant adoption registers its original node and keeps custom private paths out of public diagnostics", async (t) => {
  const { root, manifest } = fixture(t),
    m = await load();
  m.runInstanceMigration(root, manifest, true);
  put(root, "extensions/AGENTS.md", "# module\n");
  put(
    root,
    "extensions/.memory/docs/AGENTS.md",
    "<!-- project-memory-type:start -->\nname: secret\nmodule: skills\nwritable: false\ngitignore: true\nformat: ordinary\n<!-- project-memory-type:end -->\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n",
  );
  put(root, "extensions/.memory/docs/secret_x.md", "private fixture");
  const result = m.runInstanceMigration(root, manifest, true);
  assert.equal(
    result.publicPathMap.some(
      (item) =>
        item.source.includes("/docs/") || item.target.includes("/docs/"),
    ),
    false,
  );
  assert.match(
    fs.readFileSync(join(root, "extensions/AGENTS.md"), "utf8"),
    /\.harness\/skills\/docs\/AGENTS.md/,
  );
});

test("instance root generator demotes ADR directory ownership to ordinary local navigation", async (t) => {
  const { root, manifest } = fixture(t);
  const file = join(root, "AGENTS.md");
  const navigation = "[架构决策](<docs/adr/>) — 架构决策入口。";
  fs.writeFileSync(
    file,
    fs
      .readFileSync(file, "utf8")
      .replace(
        "<!-- project-memory-local:end -->",
        `- ${navigation}\n<!-- authored comment -->\nKeep manual prose.\n<!-- project-memory-local:end -->`,
      ),
  );
  const { runInstanceMigration } = await load();
  runInstanceMigration(root, manifest, true);
  const source = fs.readFileSync(file, "utf8");
  const { AgentsNode } = await import("../../src/domain/models/agents/agents-node.js");
  assert.equal(
    new AgentsNode(file)
      .parse(source)
      .children.some((ref) => ref.target === "docs/adr/"),
    false,
  );
  const local = source
    .split("<!-- project-memory-local:start -->")[1]!
    .split("<!-- project-memory-local:end -->")[0]!;
  assert.ok(local.includes(`\n${navigation}\n`));
  assert.match(source, /<!-- authored comment -->\nKeep manual prose\./);
  assert.doesNotMatch(source, /## 工作与模块入口|## 下层作用域/);
});
