import test from "node:test";
import assert from "node:assert/strict";
import { classifyAgentsSource } from "../../src/services/memory/agents.js";
import { ensureImportantBlock } from "../../src/services/memory/blocks.js";
import { rewriteLayerSurface } from "../../src/domain/models/node/document.js";

const legacy = `<!-- project-memory:start -->
<!-- project-memory-important:start -->
## 本层硬约束

- Keep.
<!-- project-memory-important:end -->
<!-- project-memory-local:start -->
## 本层记忆
<!-- project-memory-local:end -->
<!-- project-memory:end -->
`;

test("legacy layer markers still count as managed", () => {
  assert.equal(classifyAgentsSource(legacy), "managed");
  assert.equal(ensureImportantBlock(legacy), legacy);
});

test("type indexes are not classified as managed layer entries", () => {
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
  assert.equal(classifyAgentsSource(typeIndex), "foreign");
  assert.equal(rewriteLayerSurface(typeIndex), typeIndex);
});

test("refreshing a legacy file rewrites the layer surface", () => {
  const updated = rewriteLayerSurface(legacy);
  assert.match(updated, /project-harness-constraints/);
  assert.doesNotMatch(updated, /project-memory-important/);
});
