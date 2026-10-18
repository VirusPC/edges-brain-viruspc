import { indexTaskFixtureBoard, writeFixtureIndex } from "./helpers.js";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { run } from "../../../src/program.js";
import { generateTasksSite } from "../../../src/services/tasks/generate-site.js";

test("generateTasksSite writes HTML with review payload and created title", async () => {
  const repo = await mkdtemp(path.join(realpathSync(tmpdir()), "edges-site-"));
  try {
    const env = { ...process.env, EDGES_REPO: repo };
    const created = await run(
      ["--super", "tasks", "create", "--title", "Board Alpha", "--status", "todo"],
      { env },
    );
    assert.equal(created.exitCode, 0);
    await writeFixtureIndex(path.join(repo, "AGENTS.md"), ["tasks/README.md"]);
    const outPath = path.join(repo, "tasks/_site/index.html");
    const result = await generateTasksSite({ repoPath: repo, outPath, env });
    assert.equal(result.path, path.resolve(outPath));
    assert.ok(result.groupCount >= 1);
    assert.ok(result.itemCount >= 1);
    const html = await readFile(outPath, "utf8");
    assert.match(html, /edges-review-payload/);
    assert.match(html, /Board Alpha/);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("aggregate site preserves duplicate stems with portable scope/purpose/project identities", async () => {
  const repo = await mkdtemp(path.join(realpathSync(tmpdir()), "edges-site-all-"));
  try {
    const { execFileSync } = await import("node:child_process");
    execFileSync("git", ["init", "-q", repo]);
    const env = { EDGES_REPO: repo };
    for (const purpose of ["domain", "maintenance"]) {
      const result = await run(
        [
          "--scope",
          repo,
          ...(purpose === "domain" ? ["--super"] : []),
          "tasks",
          "create",
          "--title",
          "Same",
        ],
        { env },
      );
      assert.equal(result.exitCode, 0, result.stdout);
    }
    // Existing records may share a stem across Task Projects; no stored rename is permitted.
    const { mkdir, writeFile } = await import("node:fs/promises");
    const listed = JSON.parse(
      (await run(["--scope", repo, "tasks", "list"], { env })).stdout,
    );
    const original = listed.tasks[0];
    await mkdir(path.join(repo, "tasks/cli/backlog", original.stem), {
      recursive: true,
    });
    await writeFile(
      path.join(repo, "tasks/cli/backlog", `${original.stem}/index.md`),
      (await readFile(path.join(repo, original.path), "utf8")).replace(
        "edges-task-project: default",
        "edges-task-project: cli",
      ),
    );
    await indexTaskFixtureBoard(path.join(repo,'tasks'));
    await writeFixtureIndex(path.join(repo,'AGENTS.md'), ['tasks/AGENTS.md','.harness/tasks/AGENTS.md']);
    const outPath = path.join(repo, "site/index.html");
    await generateTasksSite({ repoPath: repo, outPath, env });
    const html = await readFile(outPath, "utf8");
    const payload = JSON.parse(
      html.match(
        /<script type="application\/json" id="edges-review-payload">([\s\S]*?)<\/script>/,
      )![1]!,
    );
    assert.equal(payload.items.length, 3);
    assert.equal(new Set(payload.items.map((item: any) => item.id)).size, 3);
    assert.equal(payload.items[0].stem, payload.items[1].stem);
    assert.deepEqual(
      payload.items.map((item: any) => item.source.purpose).sort(),
      ["domain", "domain", "maintenance"],
    );
    assert.ok(
      payload.items.every(
        (item: any) =>
          item.source.scope === "." &&
          ["default", "cli"].includes(item.project),
      ),
    );
    assert.ok(!JSON.stringify(payload).includes(repo));
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});

test("standalone scope aggregate resolves nested sources relative to selected root", async () => {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const root = await mkdtemp(path.join(realpathSync(tmpdir()), "edges-standalone-"));
  try {
    const child = path.join(root, ".harness/evaluation");
    await mkdir(child, { recursive: true });
    await writeFixtureIndex(path.join(child,'AGENTS.md'), ['.harness/tasks/AGENTS.md']);
    for (const scope of [root, child]) {
      const result = await run(
        ["--scope", scope, "tasks", "create", "--title", "Same"],
        { env: {} },
      );
      assert.equal(result.exitCode, 0, result.stdout);
    }
    await writeFixtureIndex(path.join(root,'AGENTS.md'), ['.harness/tasks/AGENTS.md'], ['.harness/evaluation/AGENTS.md']);
    const outPath = path.join(root, "site/index.html");
    await generateTasksSite({ repoPath: root, outPath });
    const html = await readFile(outPath, "utf8");
    const payload = JSON.parse(
      html.match(
        /<script type="application\/json" id="edges-review-payload">([\s\S]*?)<\/script>/,
      )![1]!,
    );
    assert.deepEqual(
      payload.items.map((item: any) => item.source.scope).sort(),
      [".", ".harness/evaluation"],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
