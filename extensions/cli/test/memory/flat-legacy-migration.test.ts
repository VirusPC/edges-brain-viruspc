import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { run } from "../../src/program.js";

function put(root: string, rel: string, data: string) {
  const path = join(root, rel);
  fs.mkdirSync(join(path, ".."), { recursive: true });
  fs.writeFileSync(path, data);
  return path;
}

function snapshot(root: string): unknown {
  const result: Record<string, string | null> = {};
  function walk(dir: string) {
    for (const name of fs.readdirSync(dir).sort()) {
      if (name === ".git") continue;
      const path = join(dir, name);
      const stat = fs.lstatSync(path);
      const key = path.slice(root.length);
      result[key] = stat.isDirectory()
        ? null
        : stat.isSymbolicLink()
          ? fs.readlinkSync(path)
          : fs.readFileSync(path).toString("base64");
      if (stat.isDirectory() && !stat.isSymbolicLink()) walk(path);
    }
  }
  walk(root);
  return result;
}

const entries = (line: string) =>
  `<!-- project-memory-entries:start -->\n${line}\n<!-- project-memory-entries:end -->\n`;

/** Early project-memory skill: uppercase indexes plus flat `<type>_<slug>.md`. */
function flatLegacy(t: import("node:test").TestContext) {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), "flat-legacy-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "-q", root]);
  put(
    root,
    "AGENTS.md",
    [
      "# 旧项目",
      "正文是 `<type>_<slug>.md`。",
      "<!-- project-memory:start -->",
      "<!-- project-memory-local:start -->",
      "## 本层记忆",
      "- [FEEDBACK](.memory/FEEDBACK.md) — 纠正",
      "- [PROJECT](.memory/PROJECT.md) — 项目",
      "- [REFERENCE](.memory/REFERENCE.md) — 资料",
      "<!-- project-memory-local:end -->",
      "<!-- project-memory-auto:start -->",
      "检索先读类型索引。",
      "<!-- project-memory-auto:end -->",
      "<!-- project-memory:end -->",
      "",
    ].join("\n"),
  );
  put(
    root,
    ".memory/FEEDBACK.md",
    "# FEEDBACK\n\n手写引言保留。\n" +
      entries("- [HTML 报告](feedback_html_report_display.md) — 报告怎么排"),
  );
  put(
    root,
    ".memory/PROJECT.md",
    "# PROJECT\n\n没有条目区块，靠文件名重建。\n",
  );
  put(
    root,
    ".memory/REFERENCE.md",
    "# REFERENCE\n\n" +
      entries("- [盲审](reference_rn82_blind_audit.md) — 盲审记录"),
  );
  put(
    root,
    ".memory/feedback_html_report_display.md",
    "---\nname: feedback_html_report_display\ndescription: 报告怎么排\n---\n# 展示\n\n保留正文。\n",
  );
  put(
    root,
    ".memory/project_architecture.md",
    "---\nname: project_architecture\ndescription: 架构约定\n---\n# 架构\n",
  );
  put(
    root,
    ".memory/project_rename_leftovers_20260706.md",
    "---\nname: project_rename_leftovers_20260706\ndescription: 改名残留\n---\n# 残留\n",
  );
  put(
    root,
    ".memory/reference_rn82_blind_audit.md",
    "---\nname: reference_rn82_blind_audit\ndescription: 盲审记录\n---\n# 盲审\n\n见 [证据](rn82-blind-audit-20260715-evidence/note.txt)。\n",
  );
  put(
    root,
    ".memory/rn82-blind-audit-20260715-evidence/note.txt",
    "evidence-bytes\n",
  );
  put(
    root,
    ".memory/rn82-blind-audit-20260715-evidence/audit_note.md",
    "underscored evidence name\n",
  );
  return root;
}

test("legacy rejection names edges memory migrate --dry-run", async (t) => {
  const root = flatLegacy(t);
  const result = await run(["--scope", root, "init"], { env: {} });
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stdout, /migration-required/);
  assert.match(result.stdout, /edges memory migrate --dry-run/);
  assert.doesNotMatch(result.stdout, /project-memory-migrate/);
});

test("flat legacy memory migrates into the current harness layout", async (t) => {
  const root = flatLegacy(t);
  const before = snapshot(root);
  const preview = await run(
    ["--scope", root, "memory", "migrate", "--dry-run"],
    { env: {} },
  );
  assert.equal(preview.exitCode, 0, preview.stdout);
  const dry = JSON.parse(preview.stdout);
  assert.equal(dry.ok, true);
  assert.equal(dry.status, "dry-run");
  assert.equal(dry.complete, true);
  assert.deepEqual(dry.diagnostics, []);
  const mapped = JSON.stringify(dry.pathMap);
  assert.match(
    mapped,
    /\.harness\/memory\/feedbacks\/feedback_html_report_display\/INDEX\.md/,
  );
  assert.match(
    mapped,
    /\.harness\/memory\/projects\/project_rename_leftovers_20260706\/INDEX\.md/,
  );
  assert.match(
    mapped,
    /\.harness\/memory\/references\/reference_rn82_blind_audit\/rn82-blind-audit-20260715-evidence\/note\.txt/,
  );
  assert.match(mapped, /\.harness\/memory\/feedbacks\/README\.md/);
  assert.deepEqual(snapshot(root), before);

  const applied = await run(["--scope", root, "memory", "migrate"], { env: {} });
  assert.equal(applied.exitCode, 0, applied.stdout);
  const migrated = JSON.parse(applied.stdout);
  assert.equal(migrated.status, "migrated");
  assert.equal(migrated.complete, true);
  assert.equal(fs.existsSync(join(root, ".memory")), false);
  assert.equal(
    fs.readFileSync(
      join(
        root,
        ".harness/memory/feedbacks/feedback_html_report_display/INDEX.md",
      ),
      "utf8",
    ),
    "---\nname: feedback_html_report_display\ndescription: 报告怎么排\n---\n# 展示\n\n保留正文。\n",
  );
  assert.equal(
    fs.readFileSync(
      join(
        root,
        ".harness/memory/references/reference_rn82_blind_audit/rn82-blind-audit-20260715-evidence/note.txt",
      ),
      "utf8",
    ),
    "evidence-bytes\n",
  );
  assert.equal(
    fs.readFileSync(
      join(
        root,
        ".harness/memory/references/reference_rn82_blind_audit/rn82-blind-audit-20260715-evidence/audit_note.md",
      ),
      "utf8",
    ),
    "underscored evidence name\n",
  );
  assert.match(
    fs.readFileSync(
      join(root, ".harness/memory/references/reference_rn82_blind_audit/INDEX.md"),
      "utf8",
    ),
    /\]\(rn82-blind-audit-20260715-evidence\/note\.txt\)/,
  );
  const feedbackIndex = fs.readFileSync(
    join(root, ".harness/memory/feedbacks/README.md"),
    "utf8",
  );
  assert.match(feedbackIndex, /手写引言保留/);
  assert.match(feedbackIndex, /project-entries-local:start/);
  assert.match(
    feedbackIndex,
    /feedback_html_report_display\/INDEX\.md/,
  );
  const projectIndex = fs.readFileSync(
    join(root, ".harness/memory/projects/README.md"),
    "utf8",
  );
  assert.match(projectIndex, /没有条目区块，靠文件名重建/);
  assert.match(projectIndex, /project_architecture\/INDEX\.md/);
  assert.match(projectIndex, /project_rename_leftovers_20260706\/INDEX\.md/);
  const agents = fs.readFileSync(join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /project-harness:start/);
  assert.match(agents, /project-harness-local:start/);
  assert.doesNotMatch(agents, /project-memory/);
  assert.doesNotMatch(agents, /\]\(\.memory\//);
  assert.match(agents, /\]\(\.harness\/memory\/feedbacks\/README\.md\)/);
  assert.match(agents, /正文是 `<type>_<slug>\.md`/);

  const init = await run(["--scope", root, "init", "--", "-g", "-y"], {
    env: {},
  });
  assert.equal(init.exitCode, 0, init.stdout + init.stderr);
  assert.doesNotMatch(init.stdout, /migration-required/);
  assert.doesNotMatch(init.stderr, /migration-required/);
});

test("unclassified legacy paths are listed and do not block classified entries", async (t) => {
  const root = flatLegacy(t);
  put(root, ".memory/odd.bin", "odd");
  put(root, ".memory/mystery-notes/plain.txt", "plain");
  const preview = await run(
    ["--scope", root, "memory", "migrate", "--dry-run"],
    { env: {} },
  );
  assert.equal(preview.exitCode, 0, preview.stdout);
  const dry = JSON.parse(preview.stdout);
  assert.equal(dry.ok, true);
  assert.equal(dry.status, "dry-run");
  assert.equal(dry.complete, false);
  const reported = dry.diagnostics
    .filter((item: { code: string }) => item.code === "unclassified-legacy-path")
    .map((item: { path: string }) => item.path)
    .sort();
  assert.deepEqual(reported, [
    join(root, ".memory/mystery-notes"),
    join(root, ".memory/odd.bin"),
  ]);
  assert.match(JSON.stringify(dry.diagnostics), /edges memory migrate/);
  assert.equal(fs.readFileSync(join(root, ".memory/odd.bin"), "utf8"), "odd");

  const applied = await run(["--scope", root, "memory", "migrate"], { env: {} });
  assert.equal(applied.exitCode, 0, applied.stdout);
  const migrated = JSON.parse(applied.stdout);
  assert.equal(migrated.complete, false);
  assert.equal(migrated.status, "migrated-incomplete");
  assert.equal(fs.existsSync(join(root, ".memory")), false);
  assert.equal(
    fs.readFileSync(
      join(root, ".harness/memory/projects/project_architecture/INDEX.md"),
      "utf8",
    ).includes("架构"),
    true,
  );
  assert.equal(
    fs.readFileSync(
      join(root, ".project-memory-migration/unclassified/odd.bin"),
      "utf8",
    ),
    "odd",
  );
  assert.equal(
    fs.readFileSync(
      join(root, ".project-memory-migration/unclassified/mystery-notes/plain.txt"),
      "utf8",
    ),
    "plain",
  );
  const init = await run(["--scope", root, "init", "--", "-g", "-y"], {
    env: {},
  });
  assert.equal(init.exitCode, 0, init.stdout + init.stderr);
  assert.doesNotMatch(init.stdout + init.stderr, /migration-required/);
});
