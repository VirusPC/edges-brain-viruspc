import test from "node:test";
import assert from "node:assert/strict";
import {
  INTERNAL_SECTIONS,
  INDEX_MARKERS,
} from "../../src/domain/config/sections.js";
import {
  CONSTRAINTS_START,
  LOCAL_START,
  DESCENDANTS_START,
  OUTER_START,
  ENTRIES_START,
  TYPE_META_START,
} from "../../src/domain/config/sections.js";
import { rewriteLayerSurface } from "../../src/domain/models/node/document.js";

test("canonical layer markers are project-harness, type markers stay project-memory", () => {
  assert.equal(
    INTERNAL_SECTIONS.constraints.marker,
    "project-harness-constraints",
  );
  assert.equal(INTERNAL_SECTIONS.localChildren.marker, "project-harness-local");
  assert.equal(
    INTERNAL_SECTIONS.descendantChildren.marker,
    "project-harness-descendants",
  );
  assert.equal(INTERNAL_SECTIONS.constraints.heading, "本层硬约束");
  assert.equal(INTERNAL_SECTIONS.localChildren.heading, "本层系统维护信息");
  assert.equal(INTERNAL_SECTIONS.descendantChildren.heading, "下层系统维护信息");
  assert.equal(INDEX_MARKERS.type, "project-memory-type");
  assert.equal(INDEX_MARKERS.entries, "project-memory-entries");
  assert.equal(OUTER_START, "<!-- project-harness:start -->");
  assert.equal(
    CONSTRAINTS_START,
    "<!-- project-harness-constraints:start -->",
  );
  assert.equal(LOCAL_START, "<!-- project-harness-local:start -->");
  assert.equal(
    DESCENDANTS_START,
    "<!-- project-harness-descendants:start -->",
  );
  assert.equal(TYPE_META_START, "<!-- project-memory-type:start -->");
  assert.equal(ENTRIES_START, "<!-- project-memory-entries:start -->");
});

test("rewriteLayerSurface upgrades layer comments and titles without touching type indexes", () => {
  const source = `# T

<!-- project-memory:start -->
<!-- project-memory-important:start -->
## 本层重要约束

- Keep.
<!-- project-memory-important:end -->
<!-- project-memory-local:start -->
## 本层记忆

- [A](a/AGENTS.md)
<!-- project-memory-local:end -->
<!-- project-memory-children:start -->
## 下层作用域

- [B](b/AGENTS.md)
<!-- project-memory-children:end -->
<!-- project-memory:end -->
`;
  const out = rewriteLayerSurface(source);
  assert.match(out, /<!-- project-harness:start -->/);
  assert.match(out, /<!-- project-harness-constraints:start -->/);
  assert.match(out, /## 本层硬约束/);
  assert.match(out, /## 本层系统维护信息/);
  assert.match(out, /## 下层系统维护信息/);
  assert.doesNotMatch(out, /project-memory-(important|local|children)/);
  assert.equal(rewriteLayerSurface(out), out);

  const typeIndex = `<!-- project-memory-type:start -->
name: project
module: memory
writable: true
gitignore: false
format: ordinary
<!-- project-memory-type:end -->
# PROJECT
<!-- project-memory-entries:start -->
- [x](project_x/index.md) — x
<!-- project-memory-entries:end -->
`;
  assert.equal(rewriteLayerSurface(typeIndex), typeIndex);
});
