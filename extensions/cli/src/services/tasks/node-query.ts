import { isWithinPath } from '../../utils/filesystem.js';
import { nativeTaskPath } from "./realpath.js";
import * as fs from "node:fs";
import path from "node:path";
import { harnessMaterialById, tasksBoardDirName } from "../../domain/config/harness-materials.js";
import { ENTRY_NAMES } from "../../domain/config/layout.js";
import { identifyNodeType } from "../../domain/models/node/layout.js";
import { BaseNode, AgentsNode, ReadmeNode, TaskNode } from "../../domain/models/index.js";
import { domainFields, scalar } from "../../domain/core/fields.js";
import { decodeBody } from "../../domain/models/node/document.js";
import {
  assertProjectDualWrite,
  projectIdFromDir,
} from "../../domain/models/tasks/project.js";
import { TasksError } from "../../domain/models/tasks/types.js";
import { checkPath } from "../node/node-files.js";

import { NodeService } from "../node/node-service.js";
import { collectSystemRoots } from "../node/system-roots.js";
import { query } from "../../domain/operations/query.js";
import { traverse } from "../../domain/operations/traverse.js";
import {
  isTaskStatus,
  type TaskBoardLocation,
  type TaskPurpose,
} from "./paths.js";

/**
 * Board discovery without physical directory enumeration.
 * - `super: true` — configured tasks material only
 * - `super: false` — existing board system entry only (legacy system-entry projects)
 * - omit `super` — union both faces (org-list + system-entry); default for list/get
 */
export async function taskBoardQuery(
  target: TaskBoardLocation,
  types: readonly string[] = ["task"],
  options: { super?: boolean } = {},
) {
  if (!fs.existsSync(target.boardDir))
    return query(async function* (): AsyncGenerator<BaseNode> {});
  const root = checkPath(
    path.resolve(
      nativeTaskPath(target.scopeDir),
      path.relative(target.scopeDir, target.boardDir),
    ),
  );
  const materialEntry = path.join(root, path.basename(harnessMaterialById("tasks").path));
  const systemEntry = path.join(root, ENTRY_NAMES.internal);
  const faces =
    options.super === true
      ? (["content"] as const)
      : options.super === false
        ? (["agents"] as const)
        : (["content", "agents"] as const);
  const hasMaterial = fs.existsSync(materialEntry);
  const hasSystem = systemEntry !== materialEntry && fs.existsSync(systemEntry);
  const service = new NodeService({
    managedRoot: root,
    modelForReference: (_parent, _reference, entry) => {
      if (!isWithinPath(entry, root))
        throw new TasksError(
          "VALIDATION_ERROR",
          "path is outside selected task board",
        );
      return undefined;
    },
  });
  if (!hasMaterial && !hasSystem)
    throw new TasksError(
      "VALIDATION_ERROR",
      `Task board material missing: ${materialEntry}`,
    );
  if (!hasMaterial && hasSystem) {
    const board = await service.get(systemEntry, AgentsNode);
    if (!board || !decodeBody(board.body).sections.memory.present)
      throw new TasksError(
        "VALIDATION_ERROR",
        `Task board index missing; migrate this board: ${systemEntry}`,
      );
  }
  return query(async function* () {
    const seen = new Set<string>();
    const accept = (node: BaseNode) => {
      if (seen.has(node.path)) return false;
      seen.add(node.path);
      return true;
    };
    for (const face of faces) {
      if (face === "content") {
        if (!hasMaterial) continue;
        const material = identifyNodeType(materialEntry) === "agents"
          ? await service.get(materialEntry, AgentsNode)
          : await service.get(materialEntry, ReadmeNode);
        if (!material) continue;
        for await (const node of traverse(
          material,
          { types, localOnly: true },
          (_parent, reference) => {
            if (!isWithinPath(reference.id, root))
              throw new TasksError(
                "VALIDATION_ERROR",
                "path is outside selected task board",
              );
            if (!fs.existsSync(reference.id)) return undefined;
            return reference.id;
          },
          async (_parent, _reference, target) => {
            const node = await service.get(target);
            if (!node) throw new Error(`Missing referenced node: ${target}`);
            return node;
          },
        )) {
          if (accept(node)) yield node;
        }
        continue;
      }
      if (!hasSystem) continue;
      const board = await service.get(systemEntry, AgentsNode);
      if (!board || !decodeBody(board.body).sections.memory.present) continue;
      const nodes = await service
        .query(root, { types, localOnly: true })
        .value();
      for (const node of nodes) {
        if (accept(node)) yield node;
      }
    }
  });
}
export async function listTaskNodes(
  target: TaskBoardLocation,
): Promise<TaskNode[]> {
  return (await taskBoardQuery(target))
    .filter((node): node is TaskNode => node instanceof TaskNode)
    .value();
}
/** Task boards reached from system entries and linked tasks material. Not a directory scan. */
export async function listTaskBoardLocations(
  root: string,
  options: { super?: boolean; withComposed?: boolean } = {},
): Promise<TaskBoardLocation[]> {
  const canonicalRoot = nativeTaskPath(root);
  const dirs = await collectTaskBoardDirs(canonicalRoot, options);
  return [...dirs]
    .sort((a, b) => a.localeCompare(b))
    .map((dir) => boardLocationOf(dir, canonicalRoot));
}

async function collectTaskBoardDirs(
  canonicalRoot: string,
  options: { super?: boolean; withComposed?: boolean } = {},
): Promise<Set<string>> {
  const service = new NodeService({ managedRoot: canonicalRoot });
  const materialName = path.basename(harnessMaterialById("tasks").path);
  const boardDirs = new Set<string>();
  const note = (file: string) => {
    const dir = path.dirname(file);
    if (path.basename(dir) !== tasksBoardDirName()) return;
    const name = path.basename(file);
    if (name === ENTRY_NAMES.internal || name === materialName) boardDirs.add(dir);
  };
  const queryOptions = {
    types: ["agents"] as const,
    includeHarness: true,
    ...(options.withComposed ? { withComposed: true as const } : {}),
  };
  const linked: AgentsNode[] = [];
  const scopeEntry = path.join(canonicalRoot, ENTRY_NAMES.internal);
  // A missing scope AGENTS.md makes the real-root query throw. `--super` uses the
  // virtual root instead, and still keeps `--with-composed` on a real entry.
  if (fs.existsSync(scopeEntry) || options.super !== true) {
    linked.push(...await service
      .query(canonicalRoot, queryOptions)
      .filter((node): node is AgentsNode => node instanceof AgentsNode)
      .value());
  }
  if (options.super === true) {
    linked.push(...await service
      .query(canonicalRoot, { ...queryOptions, super: true })
      .filter((node): node is AgentsNode => node instanceof AgentsNode)
      .value());
  }
  for (const node of linked) {
    note(node.path);
    for (const child of node.children) note(child.id);
  }
  for (const agentsPath of collectSystemRoots(canonicalRoot)) {
    const node = await service.get(agentsPath, AgentsNode);
    if (!node) continue;
    note(node.path);
    for (const child of node.children) note(child.id);
  }
  return boardDirs;
}

export async function listRepositoryTaskNodes(
  root: string,
  options: { super?: boolean } = {},
): Promise<TaskNode[]> {
  const canonicalRoot = nativeTaskPath(root);
  const service = new NodeService({ managedRoot: canonicalRoot });
  if (options.super) {
    return service
      .query(canonicalRoot, { types: ["task"], super: true })
      .filter((node): node is TaskNode => node instanceof TaskNode)
      .value();
  }
  // System entries whose directory is the tasks board, plus the configured material
  // hung from any system root. The material path comes from harness-materials.
  const boardDirs = await collectTaskBoardDirs(canonicalRoot);
  const seen = new Set<string>();
  const out: TaskNode[] = [];
  for (const boardDir of boardDirs) {
    for (const task of await listTaskNodes(
      boardLocationOf(boardDir, canonicalRoot),
    )) {
      if (seen.has(task.path)) continue;
      seen.add(task.path);
      out.push(task);
    }
  }
  return out;
}
/** Classify a board from physical ownership, never from the reference used to reach it. */
export function boardLocationOf(
  board: string,
  root: string,
): TaskBoardLocation {
  if (path.basename(board) !== tasksBoardDirName())
    throw new TasksError(
      "VALIDATION_ERROR",
      `Invalid task board layout: ${board}`,
    );
  const relative = path.relative(path.resolve(root), board);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new TasksError(
      "VALIDATION_ERROR",
      `Task board is outside selected root: ${board}`,
    );
  const owner = path.dirname(board);
  const purpose: TaskPurpose =
    path.basename(owner) === ".harness" ? "maintenance" : "domain";
  return {
    scopeDir: purpose === "maintenance" ? path.dirname(owner) : owner,
    purpose,
    boardDir: path.resolve(board),
  };
}
export function taskLocationOf(node: TaskNode, root: string) {
  const stem = path.basename(node.directoryPath),
    statusDir = path.dirname(node.directoryPath);
  const status = path.basename(statusDir),
    projectDir = path.dirname(statusDir);
  const location = boardLocationOf(
    path.dirname(projectDir),
    path.resolve(root),
  );
  if (!isTaskStatus(status))
    throw new TasksError(
      "VALIDATION_ERROR",
      `Invalid task status directory: ${node.path}`,
    );
  const fields = Object.fromEntries(
    Object.entries(domainFields(node.metadata)).map(([key, value]) => [
      key,
      scalar(value),
    ]),
  );
  const project = assertProjectDualWrite(path.basename(projectDir), fields);
  if (fields["edges-tasks-status"] && fields["edges-tasks-status"] !== status)
    throw new TasksError(
      "VALIDATION_ERROR",
      `edges-tasks-status dual-write mismatch: ${node.path}`,
    );
  return {
    source: {
      scope:
        path
          .relative(path.resolve(root), location.scopeDir)
          .split(path.sep)
          .join("/") || ".",
      purpose: location.purpose,
    },
    project,
    status,
    stem,
  };
}
export function projectLocationOf(node: AgentsNode, root: string) {
  const board = path.dirname(node.directoryPath);
  if (path.basename(board) !== tasksBoardDirName()) return undefined;
  const location = boardLocationOf(board, root);
  const project = projectIdFromDir(path.basename(node.directoryPath));
  return {
    location,
    project,
    source: {
      scope:
        path.relative(root, location.scopeDir).split(path.sep).join("/") || ".",
      purpose: location.purpose,
    },
  };
}
