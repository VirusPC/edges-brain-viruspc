import test from "node:test";
import assert from "node:assert/strict";
import { TASK_STATUSES } from "../../../src/domain/models/tasks/types.js";
import {
  isTaskStatus,
  boardRoot,
  taskBoardLocation,
  taskRelPath,
  sidecarRelPath,
  isTaskMarkdownName,
  parseTarget,
} from "../../../src/services/tasks/paths.js";

test("TASK_STATUSES is the seven ADR 0002 values in folder order", () => {
  assert.deepEqual(TASK_STATUSES, [
    "backlog",
    "todo",
    "in_progress",
    "in_review",
    "done",
    "blocked",
    "cancelled",
  ]);
});

test("isTaskStatus rejects Run-layer and old enums", () => {
  assert.equal(isTaskStatus("in_progress"), true);
  assert.equal(isTaskStatus("completed"), false);
  assert.equal(isTaskStatus("open"), false);
  assert.equal(isTaskStatus("status"), false);
});

test("paths join tasks/<project-dir>/<status> and sidecar dotfile", () => {
  assert.equal(boardRoot("/repo"), "/repo/.harness/tasks");
  assert.equal(
    taskRelPath("default", "in_progress", "2026-09-11--cli"),
    ".harness/tasks/_default/in_progress/2026-09-11--cli/INDEX.md",
  );
  assert.equal(
    sidecarRelPath("default", "in_progress", "2026-09-11--cli"),
    ".harness/tasks/_default/in_progress/2026-09-11--cli/.2026-09-11--cli.log.md",
  );
  const domain = taskBoardLocation("/repo", { super: true });
  assert.equal(boardRoot(domain), "/repo/tasks");
  assert.equal(
    taskRelPath("cli", "todo", "2026-09-11--cli", domain),
    "tasks/cli/todo/2026-09-11--cli/INDEX.md",
  );
});

test("isTaskMarkdownName skips sidecar, AGENTS, README", () => {
  assert.equal(isTaskMarkdownName("2026-09-11--cli.md"), true);
  assert.equal(isTaskMarkdownName(".2026-09-11--cli.log.md"), false);
  assert.equal(isTaskMarkdownName("AGENTS.md"), false);
  assert.equal(isTaskMarkdownName("README.md"), false);
});

test("parseTarget still accepts stem or new-layout path", () => {
  assert.deepEqual(parseTarget("2026-09-11--cli"), {
    kind: "stem",
    stem: "2026-09-11--cli",
  });
  assert.deepEqual(
    parseTarget("tasks/_default/done/2026-09-11--cli/INDEX.md"),
    {
      kind: "path",
      stem: "2026-09-11--cli",
    },
  );
  assert.deepEqual(parseTarget("tasks/cli/todo/2026-09-11--cli/INDEX.md"), {
    kind: "path",
    stem: "2026-09-11--cli",
  });
});
