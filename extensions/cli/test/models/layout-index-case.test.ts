import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ENTRY_NAMES,
  identifyNodeType,
  isLeafEntryName,
  normalizeNodeType,
  resolveEntryHref,
} from "../../src/domain/models/layout.js";
import { TASK_STATUSES } from "../../src/domain/models/tasks/types.js";

test("new leaf entries default to INDEX.md", () => {
  assert.equal(ENTRY_NAMES.leaf, "INDEX.md");
  assert.equal(isLeafEntryName("INDEX.md"), true);
  assert.equal(isLeafEntryName("index.md"), true);
  assert.equal(isLeafEntryName("Index.md"), false);
});

test("identifyNodeType recognises INDEX.md and legacy index.md alike", () => {
  for (const name of ["INDEX.md", "index.md"]) {
    for (const status of TASK_STATUSES)
      assert.equal(
        identifyNodeType(`/repo/tasks/_default/${status}/a/${name}`),
        "task",
      );
    assert.equal(
      identifyNodeType(`/repo/types/a/${name}`, { module: "memory" }),
      "memory",
    );
    assert.equal(identifyNodeType(`/repo/notes/a/${name}`), "note");
    assert.equal(identifyNodeType(`/repo/misc/a/${name}`), "text");
  }
  assert.equal(identifyNodeType("/repo/misc/Index.md"), undefined);
});

test("resolveEntryHref accepts both leaf spellings", () => {
  for (const name of ["INDEX.md", "index.md"])
    assert.equal(
      resolveEntryHref("/repo/AGENTS.md", `a/${name}#x`),
      `/repo/a/${name}`,
    );
});

test("rewriteLinks can swap only the entry basename and keep authored href text", async () => {
  const { rewriteLinks } = await import("../../src/services/node/node-layout.js");
  const entry = "/repo/AGENTS.md";
  const from = new Map([
    ["/repo/家 庭/a/index.md", "/repo/家 庭/a/INDEX.md"],
  ]);
  const source =
    "- [A](<家 庭/a/index.md#x>) and [B](plain/index.md)\n\n[ref]: <家 庭/a/index.md>\n";
  const out = rewriteLinks(
    source,
    entry,
    entry,
    (target) => from.get(target) ?? target,
    { preserveHref: true },
  );
  assert.equal(
    out,
    "- [A](<家 庭/a/INDEX.md#x>) and [B](plain/index.md)\n\n[ref]: <家 庭/a/INDEX.md>\n",
  );
});

test("identifyNodeType maps AGENTS.md to agents and unknown INDEX.md to text", () => {
  assert.equal(identifyNodeType("/repo/AGENTS.md"), "agents");
  assert.equal(identifyNodeType("/repo/misc/INDEX.md"), "text");
  assert.equal(identifyNodeType("/repo/README.md"), "readme");
});

test("normalizeNodeType reads legacy internal/leaf as agents/text", () => {
  assert.equal(normalizeNodeType("internal"), "agents");
  assert.equal(normalizeNodeType("leaf"), "text");
  assert.equal(normalizeNodeType("task"), "task");
});
