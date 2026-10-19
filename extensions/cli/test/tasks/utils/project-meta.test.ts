import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { domainBoard, nodeBoardWriter } from "./helpers.js";
import {
  DEFAULT_PROJECT_DESCRIPTION,
  DEFAULT_PROJECT_TITLE,
  ensureProjectMetadata,
  oneLineDescription,
  parseProjectAgents,
  parseProjectDescription,
  parseProjectTitle,
  projectAgentsRelPath,
  renderProjectAgents,
  seedDescriptionFor,
  seedTitleFor,
} from "../../../src/services/tasks/project-meta.js";

const defaultRecord = {
  project: "default" as const,
  dir: "_default",
  title: "Default",
  description:
    "Ungrouped tasks that have not been assigned a named Task Project.",
  path: "tasks/_default/AGENTS.md",
};
const cliRecord = {
  project: "cli",
  dir: "cli",
  title: "CLI",
  description: "edges CLI\nwork",
  path: "tasks/cli/AGENTS.md",
};

test("seed copy for default and user slugs", () => {
  assert.equal(DEFAULT_PROJECT_TITLE, "Default");
  assert.equal(
    DEFAULT_PROJECT_DESCRIPTION,
    "Ungrouped tasks that have not been assigned a named Task Project.",
  );
  assert.equal(seedTitleFor("default"), "Default");
  assert.equal(seedTitleFor("cli"), "cli");
  assert.equal(seedDescriptionFor("default"), DEFAULT_PROJECT_DESCRIPTION);
  assert.equal(seedDescriptionFor("cli"), "Task Project cli.");
});

test("parseProjectTitle and parseProjectDescription accept trimmed bounds", () => {
  assert.equal(parseProjectTitle("  CLI  "), "CLI");
  assert.equal(parseProjectDescription("  edges CLI work  "), "edges CLI work");
  for (const raw of ["", "   ", "x".repeat(121), "has\nnewline"]) {
    try {
      parseProjectTitle(raw);
      assert.fail(`expected title throw for ${JSON.stringify(raw)}`);
    } catch (error) {
      assert.equal(
        (error as { errorCode: string }).errorCode,
        "VALIDATION_ERROR",
      );
      assert.match((error as Error).message, /invalid Task Project title/);
    }
  }
  for (const raw of ["", "   ", "x".repeat(2001)]) {
    try {
      parseProjectDescription(raw);
      assert.fail(`expected description throw for ${JSON.stringify(raw)}`);
    } catch (error) {
      assert.equal(
        (error as { errorCode: string }).errorCode,
        "VALIDATION_ERROR",
      );
      assert.match(
        (error as Error).message,
        /invalid Task Project description/,
      );
    }
  }
});

test("render and parse round-trip title, description, and optional pointers", () => {
  const rendered = renderProjectAgents({
    title: "Default",
    description: DEFAULT_PROJECT_DESCRIPTION,
  });
  assert.match(rendered, /^# Default\n\nUngrouped tasks that have not been assigned a named Task Project\.\n/);
  assert.match(rendered, /<!-- project-harness-constraints:start -->/);
  assert.match(rendered, /<!-- project-harness-local:start -->/);
  assert.match(rendered, /<!-- project-harness-descendants:start -->/);
  const defaultParsed = parseProjectAgents(rendered);
  assert.equal(defaultParsed.title, "Default");
  assert.equal(defaultParsed.description, DEFAULT_PROJECT_DESCRIPTION);
  assert.match(defaultParsed.tail ?? "", /<!-- project-harness-descendants:end -->/);

  const withPointers = renderProjectAgents({
    title: "CLI",
    description: "edges CLI work",
    pointers: "## Pointers\n\n- [readme](../../../extensions/cli/README.md)",
  });
  const parsed = parseProjectAgents(withPointers);
  assert.equal(parsed.title, "CLI");
  assert.equal(parsed.description, "edges CLI work");
  assert.match(parsed.pointers ?? "", /README.md/);
});

test("parseProjectAgents rejects frontmatter and accepts sparse node sections", () => {
  try {
    parseProjectAgents("---\nname: x\n---\n# T\n\nD\n");
    assert.fail("expected frontmatter throw");
  } catch (error) {
    assert.equal(
      (error as { errorCode: string }).errorCode,
      "VALIDATION_ERROR",
    );
    assert.match((error as Error).message, /must not have YAML frontmatter/);
  }
  assert.equal(
    parseProjectAgents(
      "# T\n\nD\n\n<!-- project-memory:start -->\n<!-- project-memory:end -->\n",
    ).description,
    "D",
  );
  assert.equal(
    parseProjectAgents(
      "# T\n\nD\n\n<!-- project-harness:start -->\n<!-- project-harness:end -->\n",
    ).description,
    "D",
  );
});

test("oneLineDescription collapses newlines", () => {
  assert.equal(oneLineDescription("edges CLI\nwork"), "edges CLI work");
});

test("projectAgentsRelPath uses _default for default", () => {
  assert.equal(projectAgentsRelPath("default"), ".harness/tasks/_default/AGENTS.md");
  assert.equal(projectAgentsRelPath("cli"), ".harness/tasks/cli/AGENTS.md");
});

test("ensureProjectMetadata seeds _default and root index without moving Task files", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-proj-"));
  try {
    const taskRel = "tasks/_default/backlog/2026-09-13--keep/index.md";
    await mkdir(path.dirname(path.join(repo, taskRel)), { recursive: true });
    await writeFile(path.join(repo, taskRel), "# keep\n", "utf8");
    await mkdir(path.join(repo, "tasks/cli/todo/2026-09-13--other"), { recursive: true });
    await writeFile(
      path.join(repo, "tasks/cli/todo/2026-09-13--other/index.md"),
      "---\nmetadata:\n  edges-task-project: cli\n  edges-tasks-status: todo\n---\n\nx\n",
      "utf8",
    );
    const rootAgents = path.join(repo, "tasks/AGENTS.md");
    await writeFile(
      rootAgents,
      `# tasks\n\n<!-- project-memory:start -->\n\n- keep-index\n<!-- project-memory:end -->\n`,
      "utf8",
    );

    // Metadata must be created by the operation under test, not the fixture helper.
    await assert.rejects(readFile(path.join(repo, "tasks/_default/README.md")));
    await assert.rejects(readFile(path.join(repo, "tasks/cli/README.md")));
    const records = await ensureProjectMetadata(domainBoard(repo), nodeBoardWriter(), undefined, ["cli"]);
    assert.equal(records[0]?.project, "default");
    assert.equal(
      records.some((item) => item.project === "cli"),
      true,
    );

    const seeded = await readFile(
      path.join(repo, "tasks/_default/README.md"),
      "utf8",
    );
    assert.match(seeded, /^# Default\n/);
    const cliReadme = await readFile(
      path.join(repo, "tasks/cli/README.md"),
      "utf8",
    );
    assert.match(cliReadme, /^# cli\n/);
    assert.match(cliReadme, /Task Project cli\./);

    const root = await readFile(rootAgents, "utf8");
    assert.match(root, /- keep-index/);
    assert.doesNotMatch(root, /task-projects:/);
    const { ReadmeNode } = await import("../../../src/domain/models/readme/readme-node.js");
    const rootReadme = path.join(repo, "tasks/README.md");
    const entries = new ReadmeNode(rootReadme).parse(await readFile(rootReadme, "utf8"));
    assert.deepEqual(entries.localChildren.map(ref => path.basename(path.dirname(ref.id))).sort(), ["_default", "cli"]);
    await assert.rejects(readFile(path.join(repo, "tasks/_default/AGENTS.md")));
    await assert.rejects(readFile(path.join(repo, "tasks/cli/AGENTS.md")));

    const task = await readFile(path.join(repo, taskRel), "utf8");
    assert.equal(task, "# keep\n");
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("ensureProjectMetadata does not seed a README for an AGENTS-only directory", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-proj-agents-only-"));
  try {
    await mkdir(path.join(repo, "tasks/legacy"), { recursive: true });
    const agents = "# Legacy\n\nlegacy work\n";
    await writeFile(path.join(repo, "tasks/legacy/AGENTS.md"), agents, "utf8");
    await writeFile(
      path.join(repo, "tasks/AGENTS.md"),
      "# tasks\n\n<!-- project-harness-local:start -->\n## 本层系统维护信息\n\n- [Legacy](legacy/AGENTS.md) — legacy work\n<!-- project-harness-local:end -->\n",
      "utf8",
    );
    await ensureProjectMetadata(domainBoard(repo), nodeBoardWriter(), undefined, ["legacy"]);
    assert.equal(await readFile(path.join(repo, "tasks/legacy/AGENTS.md"), "utf8"), agents);
    await assert.rejects(readFile(path.join(repo, "tasks/legacy/README.md"), "utf8"));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("ensureProjectMetadata skipId leaves that README.md missing", async () => {
  const repo = await mkdtemp(path.join(tmpdir(), "edges-proj-"));
  try {
    await mkdir(path.join(repo, "tasks"), { recursive: true });
    await ensureProjectMetadata(domainBoard(repo), nodeBoardWriter(), "default");
    await assert.rejects(
      readFile(path.join(repo, "tasks/_default/README.md"), "utf8"),
    );
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("project reads reject unindexed directories without creating metadata", async () => {
  const { getProject, listProjects } =
    await import("../../../src/services/tasks/project-meta.js");
  const { access } = await import("node:fs/promises");
  const repo = await mkdtemp(path.join(tmpdir(), "edges-project-read-"));
  try {
    await mkdir(path.join(repo, "tasks/cli/todo"), { recursive: true });
    const fs = nodeBoardWriter();
    await assert.rejects(listProjects(domainBoard(repo), fs), /Task board material missing|index missing.*migrate/i);
    await assert.rejects(getProject(domainBoard(repo), 'cli', fs), /Task board material missing|index missing.*migrate/i);
    for (const rel of [
      "tasks/cli/AGENTS.md",
      "tasks/AGENTS.md",
      "tasks/_default",
      "tasks/missing",
    ]) {
      await assert.rejects(access(path.join(repo, rel)));
    }
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
