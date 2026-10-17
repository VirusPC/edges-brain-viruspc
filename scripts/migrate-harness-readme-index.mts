#!/usr/bin/env node
/**
 * Move edges-scope AGENTS.md「本层系统维护信息」material links into `.harness/README.md`.
 * AGENTS 本层 keeps one pointer. Descendants, constraints, and prose stay.
 *
 * Preview by default. `--apply` writes. Safe to re-run: a migrated scope plans nothing.
 */
import path from "node:path";
import { discoverScopes, isScope } from "../extensions/cli/src/services/scope.js";
import { harnessIndexDrift, migrateScopeMaterialIndex } from "../extensions/cli/src/services/harness-index.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const rootFlag = args.indexOf("--root");
const root = path.resolve(rootFlag >= 0 ? args[rootFlag + 1]! : process.cwd());

const scopes = discoverScopes(root).filter((dir) => {
  const rel = path.relative(root, dir);
  if (!rel || rel === ".") return isScope(dir);
  return !rel.split(path.sep).includes("posts") && isScope(dir);
});

let pending = 0;
for (const scope of scopes) {
  const drift = harnessIndexDrift(scope);
  if (!drift.moves.length && !drift.needsReadme && !drift.needsPointer) continue;
  pending += 1;
  const rel = path.relative(root, scope) || ".";
  console.log(
    `${rel}: readme=${drift.needsReadme ? "create" : "keep"} pointer=${drift.needsPointer ? "add" : "keep"} moves=${drift.moves.length}`,
  );
  for (const id of drift.moves) console.log(`  - ${path.relative(root, id)}`);
  if (apply) await migrateScopeMaterialIndex(scope);
}

if (!pending) console.log("No harness-index drift.");
else if (!apply) console.log(`\n${pending} scope(s) would change. Re-run with --apply to write.`);
