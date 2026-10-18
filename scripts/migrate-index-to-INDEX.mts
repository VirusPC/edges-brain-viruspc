#!/usr/bin/env node
/**
 * Rename content leaf entries `index.md` → `INDEX.md` (including `posts/`) and retarget links.
 *
 *  - Leaves: every regular `index.md` file below --root (symlinks and nested Git repos skipped).
 *  - Registration: traversal over the scope's AGENTS/README composition (the `traverse`
 *    operation with parse-only loading) classifies leaves as registered or unregistered and
 *    verifies that registered leaves are still reachable after the rename.
 *  - Links: Markdown destinations that resolve to a renamed leaf are rewritten in place,
 *    changing only the entry filename (authored href text is otherwise preserved).
 *  - `posts/` is protected prose: files are renamed, never edited. Links inside posts that
 *    point at renamed leaves are reported as warnings for a human to decide.
 *
 * Preview by default; `--apply` writes. Safe to re-run: a migrated tree plans nothing.
 * Directories that already hold INDEX.md next to index.md are conflicts and abort the run.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { traverse } from "../extensions/cli/src/domain/operations/traverse.js";
import {
  ENTRY_NAMES,
  LEGACY_LEAF_ENTRY,
} from "../extensions/cli/src/domain/config/layout.js";
import {
  modelAt,
  rewriteLinks,
} from "../extensions/cli/src/services/node/node-layout.js";
import { acquireWriteLock } from "../extensions/cli/src/services/node/node-lock.js";
import { isGitBoundary } from "../extensions/cli/src/services/scope.js";
import {
  checkPath,
  readEntry,
  saveEntries,
  validateEntry,
  type EntryFile,
  type FileChange,
} from "../extensions/cli/src/services/node/node-files.js";

const excluded = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".agents",
  ".superpowers",
  ".obsidian",
]);
const PROTECTED_SEGMENT = "posts";

export interface Rename {
  from: string;
  to: string;
  registered: boolean;
  protected: boolean;
}
export interface LinkEdit {
  path: string;
  before: EntryFile;
  source: string;
}
export interface IndexCasePlan {
  root: string;
  renames: Rename[];
  linkEdits: LinkEdit[];
  conflicts: string[];
  /** Protected files whose links point at renamed leaves; never edited. */
  protectedLinkWarnings: string[];
}

const rel = (root: string, file: string) =>
  path.relative(root, file).split(path.sep).join("/");

const isProtected = (root: string, file: string) =>
  rel(root, file).split("/").includes(PROTECTED_SEGMENT);

function* walk(root: string): Generator<string> {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    if (dir !== root && isGitBoundary(dir)) continue;
    for (const item of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.isSymbolicLink() || excluded.has(item.name)) continue;
      const file = path.join(dir, item.name);
      if (item.isDirectory()) stack.push(file);
      else if (item.isFile()) yield file;
    }
  }
}

/** Nodes reachable from the root AGENTS.md through composition, parse-only and fault tolerant. */
export async function reachableNodes(rootInput: string): Promise<Set<string>> {
  const root = checkPath(rootInput);
  const reached = new Set<string>();
  const entry = path.join(root, "AGENTS.md");
  if (!fs.existsSync(entry)) return reached;
  const parsed = new Map<string, ReturnType<typeof parse>>();
  function parse(file: string) {
    const document = readEntry(file);
    const Model = modelAt(file);
    if (!document || !Model) return undefined;
    return new Model(document.path).parse(document.source);
  }
  const attempt = (file: string) => {
    if (!parsed.has(file)) {
      try {
        parsed.set(file, parse(file));
      } catch {
        parsed.set(file, undefined);
      }
    }
    return parsed.get(file);
  };
  const first = attempt(entry);
  if (!first) return reached;
  for await (const node of traverse(
    first,
    {},
    (_parent, reference) => (attempt(reference.id) ? reference.id : undefined),
    async (_parent, _reference, target) => attempt(target)!,
  ))
    reached.add(node.path);
  return reached;
}

export function planIndexCaseMigration(
  inputRoot: string,
  reached: ReadonlySet<string> = new Set(),
): IndexCasePlan {
  if (!path.isAbsolute(inputRoot)) throw new Error("--root must be absolute");
  const root = checkPath(inputRoot);
  const renames: Rename[] = [];
  const conflicts: string[] = [];
  const markdown: string[] = [];

  for (const file of walk(root)) {
    if (!file.endsWith(".md")) continue;
    markdown.push(file);
    if (path.basename(file) !== LEGACY_LEAF_ENTRY) continue;
    const to = path.join(path.dirname(file), ENTRY_NAMES.leaf);
    // Exact-name listing: existsSync would alias the two spellings on case-insensitive disks.
    const siblings = fs.readdirSync(path.dirname(file));
    if (siblings.includes(ENTRY_NAMES.leaf)) {
      conflicts.push(
        `${rel(root, to)} already exists next to ${rel(root, file)}`,
      );
      continue;
    }
    renames.push({
      from: file,
      to,
      registered: reached.has(file),
      protected: isProtected(root, file),
    });
  }

  const moved = new Map(renames.map((r) => [r.from, r.to]));
  const linkEdits: LinkEdit[] = [];
  const protectedLinkWarnings: string[] = [];
  if (moved.size)
    for (const file of markdown) {
      const entry = readEntry(file);
      if (!entry) continue;
      let source: string;
      try {
        source = rewriteLinks(
          entry.source,
          file,
          file,
          (target) => moved.get(target) ?? target,
          { preserveHref: true },
        );
      } catch {
        continue;
      }
      if (source === entry.source) continue;
      if (isProtected(root, file)) protectedLinkWarnings.push(file);
      else linkEdits.push({ path: file, before: entry, source });
    }
  return { root, renames, linkEdits, conflicts, protectedLinkWarnings };
}

/** Case-safe: a hop through a temporary name works on case-insensitive filesystems too. */
function renameLeaf(from: string, to: string): void {
  const hop = `${to}.edges-rename-tmp`;
  fs.renameSync(from, hop);
  fs.renameSync(hop, to);
}

export async function applyIndexCaseMigration(
  plan: IndexCasePlan,
): Promise<void> {
  if (plan.conflicts.length)
    throw new Error(`Conflicts:\n${plan.conflicts.join("\n")}`);
  for (const edit of plan.linkEdits) {
    if (isProtected(plan.root, edit.path))
      throw new Error(`Protected file must not be edited: ${edit.path}`);
    validateEntry(edit.before);
  }
  if (!plan.renames.length && !plan.linkEdits.length) return;
  const release = await acquireWriteLock(plan.root);
  const done: Rename[] = [];
  try {
    for (const item of plan.renames) {
      if (!fs.existsSync(item.from))
        throw new Error(`Missing entry: ${item.from}`);
      renameLeaf(item.from, item.to);
      done.push(item);
    }
    const renamed = new Map(plan.renames.map((r) => [r.from, r.to]));
    const changes: FileChange[] = plan.linkEdits.map((edit) => {
      const target = renamed.get(edit.path) ?? edit.path;
      const before = target === edit.path ? edit.before : readEntry(target);
      if (!before || before.source !== edit.before.source)
        throw new Error(`Node source changed; rerun the preview: ${target}`);
      return { path: target, before, source: edit.source };
    });
    if (changes.length) saveEntries(changes);
  } catch (error) {
    for (const item of done.reverse()) {
      try {
        renameLeaf(item.to, item.from);
      } catch {
        // Surface the original failure; leftovers are visible in the next preview.
      }
    }
    throw error;
  } finally {
    await release();
  }
}

export function formatPlan(plan: IndexCasePlan): string {
  const lines: string[] = [];
  const section = (title: string, items: string[]) => {
    lines.push(`## ${title} (${items.length})`, ...items.map((i) => `- ${i}`), "");
  };
  const registered = plan.renames.filter((r) => r.registered);
  const loose = plan.renames.filter((r) => !r.registered);
  const tag = (r: Rename) =>
    `${rel(plan.root, r.from)}${r.protected ? " (posts: rename only)" : ""}`;
  section("renames: registered leaves", registered.map(tag));
  section("renames: unregistered leaves", loose.map(tag));
  section(
    "link edits",
    plan.linkEdits.map((e) => rel(plan.root, e.path)),
  );
  section(
    "protected files with links to renamed leaves (not edited)",
    plan.protectedLinkWarnings.map((f) => rel(plan.root, f)),
  );
  section("conflicts", plan.conflicts);
  return lines.join("\n");
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
        (arg, index) => index !== at + 1 && !["--root", "--apply"].includes(arg),
      )
    )
      throw new Error(
        "Usage: migrate-index-to-INDEX.mts --root /absolute/scope [--apply]",
      );
    const root = args[at + 1]!;
    const before = await reachableNodes(root);
    const plan = planIndexCaseMigration(root, before);
    process.stdout.write(formatPlan(plan));
    if (plan.conflicts.length) throw new Error("conflicts detected; aborting");
    if (args.includes("--apply")) {
      await applyIndexCaseMigration(plan);
      const after = await reachableNodes(root);
      const lost = plan.renames.filter(
        (r) => r.registered && !after.has(r.to),
      );
      if (lost.length)
        throw new Error(
          `registered leaves unreachable after rename:\n${lost.map((r) => rel(plan.root, r.to)).join("\n")}`,
        );
      process.stdout.write(
        `applied: ${plan.renames.length} renames, ${plan.linkEdits.length} link edits\n`,
      );
    } else process.stdout.write("dry-run only; pass --apply to write\n");
  } catch (error) {
    process.stderr.write(String(error) + "\n");
    process.exitCode = 1;
  }
}
