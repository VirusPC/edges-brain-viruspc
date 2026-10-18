import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  defaultReviewPageAssetDir,
  loadBuiltReviewShell,
  parseReviewPageInput,
  renderReviewPageHtml,
  resolveReviewPageOutPath,
  writeReviewPage,
} from "../../../src/services/tasks/review-page.js";
import { TasksError } from "../../../src/domain/models/tasks/types.js";

const sample = {
  groups: [
    { id: "default", title: "Default", description: "ungrouped" },
    { id: "cli", title: "CLI", description: "edges CLI" },
  ],
  items: [
    {
      stem: "2026-09-13--demo",
      current: "default",
      suggested: "cli",
      title: "Demo",
      description: "demo task",
      note: "",
    },
  ],
};

test("parseReviewPageInput accepts valid payload", () => {
  const parsed = parseReviewPageInput(sample);
  assert.equal(parsed.groups.length, 2);
  assert.equal(parsed.items[0]?.stem, "2026-09-13--demo");
});

test("parseReviewPageInput rejects unknown suggested group", () => {
  assert.throws(
    () =>
      parseReviewPageInput({
        ...sample,
        items: [{ ...sample.items[0], suggested: "missing" }],
      }),
    (error: unknown) => {
      assert.equal((error as TasksError).errorCode, "VALIDATION_ERROR");
      assert.match((error as Error).message, /review-page item 2026-09-13--demo suggested group not found: missing/);
      return true;
    },
  );
});

test("parseReviewPageInput rejects duplicate stems", () => {
  assert.throws(
    () =>
      parseReviewPageInput({
        groups: sample.groups,
        items: [sample.items[0], { ...sample.items[0] }],
      }),
    (error: unknown) => {
      assert.equal((error as TasksError).errorCode, "VALIDATION_ERROR");
      assert.match((error as Error).message, /duplicate review-page item stem: 2026-09-13--demo/);
      return true;
    },
  );
});

test("renderReviewPageHtml embeds payload JSON and escape-safe stem", () => {
  const template = `<!doctype html><html><body>
<script type="application/json" id="edges-review-payload">{}</script>
</body></html>`;
  const html = renderReviewPageHtml(sample as never, template);
  assert.match(html, /id="edges-review-payload"/);
  assert.match(html, /2026-09-13--demo/);
  assert.doesNotMatch(html, /id="edges-review-payload">\{\}<\/script>/);
});

test("resolveReviewPageOutPath uses --out or tmp default", () => {
  assert.equal(resolveReviewPageOutPath("/tmp/out.html", 1, "/tmp"), path.resolve("/tmp/out.html"));
  assert.equal(
    resolveReviewPageOutPath(undefined, 1710000000000, "/tmp"),
    path.join("/tmp", "edges-review-page-1710000000000.html"),
  );
});

test("renderReviewPageHtml rejects a template without the payload script", () => {
  assert.throws(
    () => renderReviewPageHtml(sample as never, "<html></html>"),
    (error: unknown) => {
      assert.equal((error as TasksError).errorCode, "VALIDATION_ERROR");
      assert.match((error as Error).message, /review-page template missing edges-review-payload script/);
      return true;
    },
  );
});

test("loadBuiltReviewShell inlines js and css and keeps the payload slot", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "edges-shell-"));
  try {
    await writeFile(
      path.join(dir, "index.html"),
      `<!doctype html><html><head><link rel="stylesheet" crossorigin href="./review.css"></head><body><script type="application/json" id="edges-review-payload">{}</script><script type="module" crossorigin src="./review.js"></script></body></html>`,
    );
    await writeFile(path.join(dir, "review.js"), "window.__review = true;</script>");
    await writeFile(path.join(dir, "review.css"), "body{color:red}</style>");
    const shell = await loadBuiltReviewShell((abs) => readFile(abs, "utf8"), dir);
    assert.match(shell, /<script type="module">window\.__review = true;<\\\/script>/);
    assert.match(shell, /<style type='text\/css'>body\{color:red\}<\\\/style>/);
    assert.doesNotMatch(shell, /src="\.\/review\.js"/);
    assert.doesNotMatch(shell, /href="\.\/review\.css"/);
    const html = renderReviewPageHtml(sample as never, shell);
    assert.match(html, /2026-09-13--demo/);
    assert.doesNotMatch(html, /id="edges-review-payload">\{\}<\/script>/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadBuiltReviewShell names the build command when an asset is missing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "edges-shell-"));
  try {
    await assert.rejects(
      () => loadBuiltReviewShell((abs) => readFile(abs, "utf8"), dir),
      (error: unknown) => {
        assert.equal((error as TasksError).errorCode, "VALIDATION_ERROR");
        assert.match((error as Error).message, /review-page asset missing:/);
        assert.match((error as Error).message, /pnpm --filter @viruspc\/edges run build:tasks-review-app/);
        return true;
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("default asset dir is the gitignored review-page build", () => {
  assert.match(defaultReviewPageAssetDir(), /project[/\\]assets[/\\]review-page[/\\]?$/);
});

test("writeReviewPage writes utf8 html", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "edges-rp-"));
  try {
    const target = path.join(dir, "out.html");
    await writeReviewPage(target, "<html>ok</html>", writeFile);
    assert.equal(await readFile(target, "utf8"), "<html>ok</html>");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("parseReviewPageInput keeps a thin doc and allows a missing doc", () => {
  const withDoc = parseReviewPageInput({
    groups: sample.groups,
    items: [{
      ...sample.items[0],
      status: "todo",
      priority: "low",
      doc: {
        name: "demo",
        description: "demo task",
        metadata: { "edges-task-assignee": "Ada", "extra-key": "kept" },
        body: "",
      },
    }],
  });
  assert.equal(withDoc.items[0]?.doc?.body, "");
  assert.equal(withDoc.items[0]?.doc?.metadata["extra-key"], "kept");
  assert.equal(withDoc.items[0]?.status, "todo");
  assert.equal(withDoc.items[0]?.priority, "low");

  const withoutDoc = parseReviewPageInput(sample);
  assert.equal(withoutDoc.items[0]?.doc, undefined);
});

test("parseReviewPageInput rejects a doc that is missing body", () => {
  assert.throws(
    () =>
      parseReviewPageInput({
        groups: sample.groups,
        items: [{
          ...sample.items[0],
          doc: { name: "demo", description: "d", metadata: {} },
        }],
      }),
    (error: unknown) => {
      assert.equal((error as TasksError).errorCode, "VALIDATION_ERROR");
      assert.match((error as Error).message, /review-page doc\/body/);
      return true;
    },
  );
});

test('legacy review items cannot bypass duplicate stem validation with ignored transport IDs', () => {
  assert.throws(() => parseReviewPageInput({
    groups: [{ id: 'default', title: 'Default' }],
    items: [
      { id: 'one', stem: 'same', current: 'default', suggested: 'default' },
      { id: 'two', stem: 'same', current: 'default', suggested: 'default' },
    ],
  }), /duplicate/);
});

test('source-aware review payload requires valid real project identities on groups and items', () => {
  const source = { scope: '.', purpose: 'domain' };
  const group = { id: '[".","domain","cli"]', title: 'CLI', source, project: 'cli' };
  const item = { id: '[".","domain","cli","same"]', stem: 'same', current: group.id, suggested: group.id, source, project: 'cli' };
  for (const project of [undefined, null, 1, [], { value: 'cli' }, group.id, '_default', '']) {
    assert.throws(() => parseReviewPageInput({ groups: [{ ...group, project }], items: [item] }), /project/);
    assert.throws(() => parseReviewPageInput({ groups: [group], items: [{ ...item, project }] }), /project/);
  }
  const parsed = parseReviewPageInput({ groups: [group], items: [item] });
  assert.equal(parsed.groups[0]?.project, 'cli');
  assert.equal(parsed.items[0]?.project, 'cli');
  assert.equal(parsed.items[0]?.stem, 'same');
});

test('review JSON preserves extended metadata and rejects invalid contract fields', () => {
  const doc = { name: '', description: '', metadata: { custom: { nested: true }, tags: ['a'], count: 1, enabled: false, extra: null }, body: '' };
  const input = { groups: sample.groups, items: [{ ...sample.items[0], doc }] };
  const before = structuredClone(input);
  assert.deepEqual(parseReviewPageInput(input).items[0]?.doc, doc);
  assert.deepEqual(input, before);
  for (const badDoc of [ { ...doc, extra: true }, { ...doc, metadata: { 'edges-tasks-status': 'unknown' } }, { ...doc, metadata: { 'edges-updated-at': 'today' } }, { ...doc, metadata: { 'edges-title': 1 } } ]) {
    assert.throws(() => parseReviewPageInput({ ...input, items: [{ ...input.items[0], doc: badDoc }] }), /doc/);
  }
});
