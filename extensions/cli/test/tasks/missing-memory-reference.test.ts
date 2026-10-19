import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createTask, updateTask } from "../../src/services/tasks/write.js";
import { moveTaskStatus } from "../../src/services/tasks/move.js";
import { nodeBoardWriter } from "./utils/helpers.js";

async function missing(file: string): Promise<boolean> {
  try {
    await access(file);
    return false;
  } catch {
    return true;
  }
}

test("tasks writes succeed when the scope links a missing users memory index", async () => {
  const repo = await realpath(await mkdtemp(path.join(tmpdir(), "edges-tasks-missing-users-")));
  const io = { fs: nodeBoardWriter(), now: new Date("2026-10-19T00:00:00Z") };
  try {
    await mkdir(path.join(repo, ".harness"), { recursive: true });
    await writeFile(
      path.join(repo, "AGENTS.md"),
      `# repo

<!-- project-harness-local:start -->
## 本层系统维护信息

- [本层 harness 材料索引](<.harness/README.md>) — 本层 harness 材料的组织清单。
<!-- project-harness-local:end -->
`,
    );
    await writeFile(
      path.join(repo, ".harness/README.md"),
      `# 本层 harness 材料索引

<!-- project-entries-local:start -->
## 本层内容

- [.harness/memory/users/README.md](<memory/users/README.md>) — 绑定本仓库、不宜公开的个人材料。本机文件，不进 git。
<!-- project-entries-local:end -->
`,
    );
    assert.equal(await missing(path.join(repo, ".harness/memory/users/README.md")), true);

    const created = await createTask(
      repo,
      { title: "Backlog without users memory", status: "backlog" },
      io,
    );
    assert.match(created.path, /^\.harness\/tasks\/_default\/backlog\//);
    assert.match(await readFile(path.join(repo, created.path), "utf8"), /Backlog without users memory/);
    assert.equal(await missing(path.join(repo, ".harness/memory/users/README.md")), true);

    const projectReadme = path.join(repo, ".harness/tasks/_default/README.md");
    const listed = await readFile(projectReadme, "utf8");
    await writeFile(
      projectReadme,
      listed.replace(
        "<!-- project-entries-local:end -->",
        "- [gone](backlog/gone/INDEX.md) — missing task\n<!-- project-entries-local:end -->",
      ),
    );

    const updated = await updateTask(
      repo,
      created.stem,
      { title: "Still without users memory" },
      { ...io, now: new Date("2026-10-19T01:00:00Z") },
    );
    assert.equal(updated.path, created.path);
    assert.match(await readFile(path.join(repo, updated.path), "utf8"), /Still without users memory/);

    const moved = await moveTaskStatus(repo, created.stem, "todo", {
      ...io,
      now: new Date("2026-10-19T02:00:00Z"),
    });
    assert.equal(moved.to, "todo");
    assert.match(moved.path, /^\.harness\/tasks\/_default\/todo\//);
    assert.equal(await missing(path.join(repo, ".harness/memory/users/README.md")), true);
  } finally {
    await rm(repo, { recursive: true, force: true });
  }
});
