import { acquireWriteLock } from "../extensions/cli/src/services/node/node-lock.js";
import { isGitBoundary } from "../extensions/cli/src/services/scope.js";
import { rewriteLayerSurface } from "../extensions/cli/src/domain/models/node/document.js";
import {
  readEntry,
  saveEntries,
  validateEntry,
  checkPath,
  type EntryFile,
} from "../extensions/cli/src/services/node/node-files.js";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const excluded = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "posts",
  ".agents",
  ".superpowers",
]);

const LAYER_PAIRS: Array<[string, string]> = [
  ["<!-- project-memory:start -->", "<!-- project-memory:end -->"],
  ["<!-- project-harness:start -->", "<!-- project-harness:end -->"],
  [
    "<!-- project-memory-important:start -->",
    "<!-- project-memory-important:end -->",
  ],
  [
    "<!-- project-harness-constraints:start -->",
    "<!-- project-harness-constraints:end -->",
  ],
  ["<!-- project-memory-local:start -->", "<!-- project-memory-local:end -->"],
  ["<!-- project-harness-local:start -->", "<!-- project-harness-local:end -->"],
  [
    "<!-- project-memory-children:start -->",
    "<!-- project-memory-children:end -->",
  ],
  [
    "<!-- project-harness-descendants:start -->",
    "<!-- project-harness-descendants:end -->",
  ],
];

export interface LayerMarkerPlan {
  root: string;
  edits: Array<{ path: string; before: string; after: string }>;
}

const snapshots = new WeakMap<
  LayerMarkerPlan,
  { files: EntryFile[]; edits: string; root: string }
>();

function count(source: string, marker: string): number {
  return source.split(marker).length - 1;
}

function assertPaired(file: string, source: string): void {
  if (
    source.includes("<!-- project-memory:start -->") &&
    source.includes("<!-- project-harness:start -->")
  )
    throw new Error(`${file}: mixed layer outer markers`);
  for (const [start, end] of LAYER_PAIRS) {
    const starts = count(source, start);
    const ends = count(source, end);
    if (!starts && !ends) continue;
    if (starts !== 1 || ends !== 1 || source.indexOf(start) > source.indexOf(end))
      throw new Error(`${file}: malformed or duplicate layer markers`);
  }
}

function convert(file: string, source: string): string {
  const next = rewriteLayerSurface(source);
  if (next === source) return source;
  assertPaired(file, source);
  return next;
}

export function planLayerMarkerRewrite(inputRoot: string): LayerMarkerPlan {
  if (!path.isAbsolute(inputRoot)) throw new Error("--root must be absolute");
  const root = checkPath(inputRoot);
  if (root.split(path.sep).includes("posts"))
    throw new Error("Protected posts cannot be migrated");
  const files: EntryFile[] = [];
  const edits: LayerMarkerPlan["edits"] = [];
  function visit(dir: string) {
    if (dir !== root && isGitBoundary(dir)) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.isSymbolicLink() || excluded.has(item.name)) continue;
      const file = path.join(dir, item.name);
      if (item.isDirectory()) visit(file);
      else if (item.isFile() && item.name === "AGENTS.md") {
        const before = readEntry(file)!;
        files.push(before);
        const after = convert(file, before.source);
        if (after !== before.source)
          edits.push({ path: file, before: before.source, after });
      }
    }
  }
  visit(root);
  const plan = { root, edits };
  snapshots.set(plan, { files, edits: JSON.stringify(edits), root });
  return plan;
}

function applyPlan(plan: LayerMarkerPlan): void {
  const snapshot = snapshots.get(plan);
  if (
    !snapshot ||
    snapshot.root !== plan.root ||
    snapshot.edits !== JSON.stringify(plan.edits)
  )
    throw new Error("Migration plan changed; preview again");
  for (const file of snapshot.files) validateEntry(file);
  if (!plan.edits.length) return;
  const backup = path.join(
    plan.root,
    `.project-harness-markers-backup-${randomUUID()}.json`,
  );
  saveEntries([
    {
      path: backup,
      source:
        JSON.stringify(
          plan.edits.map(({ path: entry, before }) => ({
            path: entry,
            source: before,
          })),
          null,
          2,
        ) + "\n",
      createMode: 0o600,
    },
    ...plan.edits.map((edit) => ({
      path: edit.path,
      before: snapshot.files.find((file) => file.path === edit.path),
      source: edit.after,
    })),
  ]);
}

export async function applyLayerMarkerRewrite(
  plan: LayerMarkerPlan,
): Promise<void> {
  const release = await acquireWriteLock(plan.root);
  try {
    applyPlan(plan);
  } finally {
    await release();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const args = process.argv.slice(2).filter((arg) => arg !== "--");
    const at = args.indexOf("--root");
    if (
      at < 0 ||
      !args[at + 1] ||
      args.some(
        (arg, index) =>
          index !== at + 1 && !["--root", "--apply"].includes(arg),
      )
    )
      throw new Error(
        "Usage: rewrite-project-harness-markers.mts --root /absolute/scope [--apply]",
      );
    const plan = planLayerMarkerRewrite(args[at + 1]!);
    process.stdout.write(
      plan.edits.length
        ? plan.edits.map((edit) => edit.path).join("\n") + "\n"
        : "edits: 0\n",
    );
    if (args.includes("--apply")) await applyLayerMarkerRewrite(plan);
  } catch (error) {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  }
}
