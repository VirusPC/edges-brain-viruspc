import { isWithinPath, findAncestor, canonicalPath, firstSymlink } from '../../utils/filesystem.js';
import fs from "node:fs";
import path from "node:path";
import { AgentsNode, TaskNode } from "../../domain/models/index.js";
import {
  ENTRY_NAMES,
  LEAF_ENTRY_NAMES,
} from "../../domain/config/layout.js";
import {
  identifyNodeType,
  isLeafEntryName,
} from "../../domain/models/node/layout.js";
import { decodeBody } from "../../domain/models/node/document.js";
import { projectIdFromDir } from "../../domain/models/tasks/project.js";
import {
  readEntry,
  validateEntry,
  saveEntries,
  checkPath,
  type EntryFile,
} from "../node/node-files.js";

import { isGitBoundary } from "../scope.js";
import { taskLocationOf } from "./node-query.js";
import {
  parseProjectAgents,
  renderProjectAgents,
  seedTitleFor,
  seedDescriptionFor,
} from "./project-meta.js";

export interface TaskIndexMigrationPlan {
  root: string;
  tasks: string[];
  edits: Array<{ path: string; before: string | null; after: string }>;
}
interface Snapshot {
  root: string;
  files: Map<string, EntryFile>;
  discovery: string[];
  owners: Map<string, EntryFile | undefined>;
  edits: TaskIndexMigrationPlan["edits"];
}
const snapshots = new WeakMap<TaskIndexMigrationPlan, Snapshot>();
// This public migration deliberately never enters private content or foreign checkouts.
const excluded = new Set([
  ".git",
  "node_modules",
  ".agents",
  ".superpowers",
  "dist",
  "build",
  "posts",
  "journal",
  "journals",
  "repos",
]);
function discover(root: string): string[] {
  const entries: string[] = [];
  function visit(dir: string) {
    if (dir !== root && isGitBoundary(dir)) return;
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, item.name);
      if (
        excluded.has(item.name) ||
        (item.name === "users" && path.basename(dir) === "memory")
      )
        continue;
      if (item.isSymbolicLink()) {
        // Never follow links into other workspaces. Entry links are unsafe targets.
        if (
          item.name === ENTRY_NAMES.internal ||
          isLeafEntryName(item.name) ||
          item.name === "tasks"
        )
          throw new Error(`Symbolic link in migration discovery: ${file}`);
        continue;
      }
      if (item.isDirectory()) visit(file);
      else if (
        item.isFile() &&
        (item.name === ENTRY_NAMES.internal || identifyNodeType(file) === "task")
      )
        entries.push(file);
    }
  }
  visit(root);
  return entries.sort();
}

/** Physical discovery is restricted to this explicit, preview-first migration. */
export async function planTaskIndexes(
  inputRoot: string,
): Promise<TaskIndexMigrationPlan> {
  const root = checkPath(path.resolve(inputRoot));
  const discovery = discover(root);
  const files = new Map(discovery.map((file) => [file, readEntry(file)!]));
  const nodes = new Map<string, AgentsNode>();
  const owners = new Map<string, EntryFile | undefined>();
  const tasks = discovery.filter((file) => identifyNodeType(file) === "task");
  const get = (
    file: string,
    seed = `# ${path.basename(path.dirname(file))}\n`,
  ) => {
    if (!isWithinPath(file, root))
      throw new Error(`Index outside migration root: ${file}`);
    let node = nodes.get(file);
    if (!node) {
      node = new AgentsNode(file).parse(files.get(file)?.source ?? seed);
      if (decodeBody(node.body).unsafe)
        throw new Error(`Malformed index sections: ${file}`);
      for (const child of node.children)
        if (!isWithinPath(child.id, root))
          throw new Error(
            `${file}: reference outside migration root: ${child.id}`,
          );
      nodes.set(file, node);
    }
    return node;
  };
  const add = (
    parent: string,
    child: string,
    group: "local" | "descendant" = "local",
    name?: string,
    description?: string,
  ) => {
    const node = get(parent);
    const identity = canonicalPath(checkPath(child));
    const existing = node.children.find(ref => ref.id === child ||
      (!firstSymlink(ref.id) && canonicalPath(ref.id) === identity));
    if (!existing)
      node.addChild(group, {
        id: child,
        ...(name ? { name } : {}),
        ...(description ? { description } : {}),
      });
    else if (
      group === "local" &&
      node.descendantChildren.some((ref) => ref.id === existing.id)
    )
      node.moveChild(existing.id, "local");
  };
  // Connect only existing scope entries, crossing physical folders without inventing nodes.
  const connected = new Set<string>();
  const connect = (entry: string) => {
    if (entry === path.join(root, ENTRY_NAMES.internal) || connected.has(entry)) return;
    connected.add(entry);
    const dir = path.dirname(path.dirname(entry));
    const owner = isWithinPath(dir, root) ? findAncestor(dir,
      directory => files.has(path.join(directory, ENTRY_NAMES.internal)) || nodes.has(path.join(directory, ENTRY_NAMES.internal)),
      directory => directory === root) : undefined;
    if (owner) {
      const parent = path.join(owner, ENTRY_NAMES.internal);
      add(parent, entry, "descendant");
      connect(parent);
      return;
    }
    throw new Error(`No owning scope index for ${entry}`);
  };
  const boards = new Set<string>();
  for (const file of tasks) {
    const task = new TaskNode(file).parse(files.get(file)!.source);
    task.validate();
    taskLocationOf(task, root);
    const project = path.dirname(path.dirname(path.dirname(file)));
    const board = path.dirname(project);
    boards.add(board);
    const id = projectIdFromDir(path.basename(project));
    const projectEntry = path.join(project, ENTRY_NAMES.internal);
    const projectNode = get(
      projectEntry,
      renderProjectAgents({
        title: seedTitleFor(id),
        description: seedDescriptionFor(id),
      }),
    );
    const meta = parseProjectAgents(projectNode.body);
    add(projectEntry, file, "local", task.name, task.description);
    add(
      path.join(board, ENTRY_NAMES.internal),
      projectEntry,
      "local",
      meta.title,
      meta.description.replace(/\s+/g, " "),
    );
  }
  // Include already existing empty projects; retain all other index links and prose.
  for (const file of discovery)
    if (
      path.basename(file) === ENTRY_NAMES.internal &&
      path.basename(path.dirname(path.dirname(file))) === "tasks"
    ) {
      const board = path.dirname(path.dirname(file));
      boards.add(board);
      const meta = parseProjectAgents(get(file).body);
      add(
        path.join(board, ENTRY_NAMES.internal),
        file,
        "local",
        meta.title,
        meta.description.replace(/\s+/g, " "),
      );
    }
  for (const board of [...boards].sort()) {
    const boardEntry = path.join(board, ENTRY_NAMES.internal);
    const boardNode = get(boardEntry);
    const owner = path.dirname(board);
    const scope =
      path.basename(owner) === ".harness" ? path.dirname(owner) : owner;
    // Snapshot both present and absent candidates: adding an entry can change
    // whether this selected public scope is an AgentsNode or a content node.
    const candidates = [...LEAF_ENTRY_NAMES, ENTRY_NAMES.skill].map((name) =>
      path.join(scope, name),
    ).map(file => fs.existsSync(checkPath(file)) ? fs.realpathSync.native(file) : file);
    for (const file of candidates)
      if (!owners.has(file))
        owners.set(file, files.get(file) ?? readEntry(file));
    const content = candidates.find((file) => owners.get(file) !== undefined);
    const scopeEntry = path.join(scope, ENTRY_NAMES.internal);
    if (!content && !files.has(scopeEntry) && !nodes.has(scopeEntry))
      throw new Error(`Missing owning scope index: ${scopeEntry}`);
    add(
      scopeEntry,
      path.join(board, ENTRY_NAMES.internal),
      path.basename(owner) === ".harness" ? "local" : "descendant",
    );
    connect(content ?? scopeEntry);
  }
  const edits = [...nodes]
    .flatMap(([file, node]) => {
      const before = files.get(file)?.source ?? null,
        after = node.serialize();
      return before === after
        ? []
        : [{ path: path.relative(root, file), before, after }];
    })
    .sort((a, b) => a.path.localeCompare(b.path));
  const plan = {
    root,
    tasks: tasks.map((file) => path.relative(root, file)).sort(),
    edits,
  };
  snapshots.set(plan, {
    root,
    files,
    discovery,
    owners,
    edits: structuredClone(edits),
  });
  return plan;
}

/** Optimistic preflight plus the shared current-process rollback transaction. */
export async function applyTaskIndexes(
  plan: TaskIndexMigrationPlan,
): Promise<void> {
  const snapshot = snapshots.get(plan);
  if (!snapshot)
    throw new Error("Migration plan has no live source snapshot; plan again");
  if (plan.root !== snapshot.root)
    throw new Error(`Migration root changed: ${plan.root}`);
  const current = discover(plan.root);
  if (JSON.stringify(current) !== JSON.stringify(snapshot.discovery)) {
    const changed = [...new Set([...current, ...snapshot.discovery])].find(
      (file) => current.includes(file) !== snapshot.discovery.includes(file),
    );
    throw new Error(`Discovery changed; plan again: ${changed}`);
  }
  for (const entry of snapshot.files.values()) validateEntry(entry);
  for (const [file, entry] of snapshot.owners) {
    if (entry) validateEntry(entry);
    else if (fs.existsSync(checkPath(file)))
      throw new Error(`Owner entry added; plan again: ${fs.realpathSync.native(file)}`);
  }
  if (JSON.stringify(plan.edits) !== JSON.stringify(snapshot.edits))
    throw new Error(`Migration plan edits changed: ${plan.root}`);
  saveEntries(
    plan.edits.map((edit) => ({
      path: path.join(plan.root, edit.path),
      before: snapshot.files.get(path.join(plan.root, edit.path)),
      source: edit.after,
    })),
  );
}
