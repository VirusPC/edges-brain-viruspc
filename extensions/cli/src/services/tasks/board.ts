import { isWithinPath, firstSymlink } from "../../utils/filesystem.js";
import { query } from "../../domain/operations/query.js";
import {
  nativeTaskPath,
  relativePathInsideScope,
} from "./realpath.js";
import { TaskNode, AgentsNode, ReadmeNode } from "../../domain/models/index.js";
import { taskBoardQuery, taskLocationOf, listRepositoryTaskNodes } from "./node-query.js";
import { resolveBoard, scopeDir, taskBoardLocation, type BoardTarget } from "./paths.js";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  rmdir as fsRmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { parseTaskDoc } from "../../domain/models/tasks/frontmatter.js";
import {
  taskDocFromParsed,
  type TaskDoc,
} from "../../domain/models/tasks/task-doc.js";
import { priorityFromMetadata } from "../../domain/models/tasks/priority.js";
import { sortTasksByPriority } from "../../domain/operations/tasks.js";
import {
  assertProjectDualWrite,
  DEFAULT_TASK_PROJECT,
  DEFAULT_TASK_PROJECT_DIR,
  isUserProjectSlug,
  projectDirName,
  type TaskProjectId,
} from "../../domain/models/tasks/project.js";
import { isLeafEntryName } from "../../domain/models/node/layout.js";
import {
  boardRoot,
  parseTarget,
  sidecarRelPath,
  legacyTaskRelPath,
  taskRelPath,
} from "./paths.js";
import {
  TASK_STATUSES,
  TasksError,
  type TaskListItem,
  type TaskPriority,
  type TaskRecord,
  type TaskStatus,
} from "../../domain/models/tasks/types.js";

export {
  nativeTaskPath,
  relativePathInsideScope,
  useTaskBoardRealpathForTests,
  type TaskBoardRealpath,
} from "./realpath.js";

export type BoardFs = {
  readFile(abs: string): Promise<string>;
  readdir(abs: string): Promise<string[]>;
  exists(abs: string): Promise<boolean>;
};

export type BoardWriter = BoardFs & {
  writeFile(abs: string, contents: string): Promise<void>;
  mkdirp(abs: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  unlink(abs: string): Promise<void>;
  rmdir(abs: string): Promise<void>;
};

export async function assertBoardPath(
  target: BoardTarget | undefined,
  abs: string,
): Promise<void> {
  if (target === undefined) return;
  const originalScope = path.resolve(scopeDir(target));
  const scope = nativeTaskPath(originalScope);
  const board = path.join(scope, path.relative(originalScope, boardRoot(target)));
  if (isWithinPath(abs, originalScope)) abs = path.join(scope, path.relative(originalScope, abs));
  if (!isWithinPath(abs, board)) {
    throw new TasksError(
      "VALIDATION_ERROR",
      "path is outside selected task board",
    );
  }
  if (firstSymlink(abs, scope))
    throw new TasksError("VALIDATION_ERROR", "task board paths must not cross symlinks");
}

export function createNodeBoardFs(target?: BoardTarget): BoardFs {
  return {
    async readFile(abs: string): Promise<string> {
      await assertBoardPath(target, abs);
      return readFile(abs, "utf8");
    },
    async readdir(abs: string): Promise<string[]> {
      await assertBoardPath(target, abs);
      return readdir(abs);
    },
    async exists(abs: string): Promise<boolean> {
      await assertBoardPath(target, abs);
      try {
        await access(abs);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function createNodeBoardWriter(target?: BoardTarget): BoardWriter {
  return {
    ...createNodeBoardFs(target),
    async writeFile(abs: string, contents: string): Promise<void> {
      await assertBoardPath(target, abs);
      await writeFile(abs, contents, "utf8");
    },
    async mkdirp(abs: string): Promise<void> {
      await assertBoardPath(target, abs);
      await mkdir(abs, { recursive: true });
    },
    async rename(from: string, to: string): Promise<void> {
      await assertBoardPath(target, from);
      await assertBoardPath(target, to);
      await rename(from, to);
    },
    async unlink(abs: string): Promise<void> {
      await assertBoardPath(target, abs);
      await unlink(abs);
    },
    async rmdir(abs: string): Promise<void> {
      await assertBoardPath(target, abs);
      await fsRmdir(abs);
    },
  };
}

function countSidecarRuns(markdown: string): number {
  const rows = markdown
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("|"));
  let seenHeader = false;
  let count = 0;
  for (const row of rows) {
    const trimmed = row.trim();
    if (trimmed.includes("---") || /^\|[\s|:.-]+\|$/.test(trimmed)) {
      continue;
    }
    if (!seenHeader) {
      seenHeader = true;
      continue;
    }
    count += 1;
  }
  return count;
}

export async function listProjectIds(
  repoPath: BoardTarget,
  fs: BoardFs,
): Promise<TaskProjectId[]> {
  const target = resolveBoard(repoPath);
  // Content face (board README) holds org-list projects; real AGENTS still holds
  // system-entry projects and legacy README links awaiting migration.
  const [fromContent, fromAgents] = await Promise.all([
    (await taskBoardQuery(target, ["agents", "readme"], { super: true })).value(),
    (await taskBoardQuery(target, ["agents", "readme"], { super: false })).value(),
  ]);
  const nodes = [...fromContent, ...fromAgents];
  const boardPath = boardRoot(repoPath);
  const board = await fs.exists(boardPath) ? nativeTaskPath(boardPath) : boardPath;
  const names = new Set(nodes
    .filter(node => (node instanceof AgentsNode || node instanceof ReadmeNode) && path.dirname(node.directoryPath) === board)
    .map(node => path.basename(node.directoryPath)));
  const ids: TaskProjectId[] = [...names]
    .filter(name => name === DEFAULT_TASK_PROJECT_DIR || isUserProjectSlug(name))
    .map(name => name === DEFAULT_TASK_PROJECT_DIR ? DEFAULT_TASK_PROJECT : name);
  return ids.sort((a, b) => {
    if (a === DEFAULT_TASK_PROJECT) {
      return -1;
    }
    if (b === DEFAULT_TASK_PROJECT) {
      return 1;
    }
    return a.localeCompare(b);
  });
}

function scopeNodeRoot(repoPath: BoardTarget): string {
  return nativeTaskPath(scopeDir(repoPath));
}

export type ListedTask = {
  item: TaskListItem;
  doc: TaskDoc;
};

async function readListItem(
  repoPath: BoardTarget,
  project: TaskProjectId,
  status: TaskStatus,
  stem: string,
  fs: BoardFs,
  providedNode?: TaskNode,
): Promise<ListedTask> {
  let rel = taskRelPath(project, status, stem, repoPath);
  if (
    !providedNode &&
    !(await fs.exists(path.join(scopeDir(repoPath), rel)))
  )
    rel = legacyTaskRelPath(project, status, stem, repoPath);
  const sidecarRel = sidecarRelPath(project, status, stem, repoPath);
  const abs = path.join(scopeDir(repoPath), rel);
  const sidecarAbs = path.join(scopeDir(repoPath), sidecarRel);
  const markdown = providedNode?.serialize() ?? await fs.readFile(abs);
  const node = providedNode ?? new TaskNode(nativeTaskPath(abs)).parse(markdown);
  const scopeRoot = scopeNodeRoot(repoPath);
  rel = relativePathInsideScope(scopeRoot, node.path);
  taskLocationOf(node, scopeRoot);
  const parsed = parseTaskDoc(markdown);
  const doc = taskDocFromParsed(parsed);
  const resolvedProject = assertProjectDualWrite(
    projectDirName(project),
    doc.metadata,
  );
  let runCount = 0;
  if (await fs.exists(sidecarAbs)) {
    runCount = countSidecarRuns(await fs.readFile(sidecarAbs));
  }
  return {
    doc,
    item: {
      stem,
      title: doc.metadata["edges-title"] || doc.name || stem,
      status,
      description: doc.description,
      path: rel,
      sidecarPath: sidecarRel,
      runCount,
      priority: priorityFromMetadata(doc.metadata),
      project: resolvedProject,
    },
  };
}

export type TaskListOpts = {
  status?: TaskStatus;
  priorities?: TaskPriority[];
  projects?: TaskProjectId[];
  sort?: "priority";
};

export async function listTasksWithDocs(
  repoPath: BoardTarget,
  opts: TaskListOpts,
  fs: BoardFs,
): Promise<Array<TaskListItem & { doc: TaskDoc }>> {
  const target = resolveBoard(repoPath);
  const root = scopeNodeRoot(repoPath);
  const filtered = await (await taskBoardQuery(target))
    .filter((node): node is TaskNode => node instanceof TaskNode)
    .map(node => ({ node, location: taskLocationOf(node, root) }))
    .filter(({ location }) => !opts.status || location.status === opts.status)
    .filter(({ node }) => !opts.priorities?.length || opts.priorities.includes(node.priority))
    .filter(({ location }) => !opts.projects?.length || opts.projects.includes(location.project))
    .map(async ({ node, location }) => {
      const listed = await readListItem(repoPath, location.project, location.status, location.stem, fs, node);
      return { ...listed.item, doc: listed.doc };
    }).value();
  // Keep the established project/status/stem ordering independently of index order.
  filtered.sort((a,b) => (a.project === b.project ? 0 : a.project === DEFAULT_TASK_PROJECT ? -1 : b.project === DEFAULT_TASK_PROJECT ? 1 : a.project.localeCompare(b.project))
    || TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status) || a.stem.localeCompare(b.stem));

  if (opts.sort === "priority") {
    return sortTasksByPriority(filtered);
  }
  if (opts.sort !== undefined) {
    throw new TasksError(
      "VALIDATION_ERROR",
      `invalid --sort: ${String(opts.sort)} (expected priority)`,
    );
  }
  return filtered;
}

export async function listTasks(
  repoPath: BoardTarget,
  opts: TaskListOpts,
  fs: BoardFs,
): Promise<TaskListItem[]> {
  const rows = await listTasksWithDocs(repoPath, opts, fs);
  return rows.map(({ doc: _doc, ...item }) => item);
}

async function findByStem(
  repoPath: BoardTarget,
  stem: string,
  fs: BoardFs,
): Promise<Array<{ project: TaskProjectId; status: TaskStatus }>> {
  const target = resolveBoard(repoPath);
  const root = scopeNodeRoot(repoPath);
  return (await taskBoardQuery(target))
    .filter((node): node is TaskNode => node instanceof TaskNode)
    .map(node => taskLocationOf(node, root))
    .filter(location => location.stem === stem)
    .map(({ project, status }) => ({ project, status })).value();
}

async function loadRecord(
  repoPath: BoardTarget,
  project: TaskProjectId,
  status: TaskStatus,
  stem: string,
  fs: BoardFs,
): Promise<TaskRecord> {
  const item = (await readListItem(repoPath, project, status, stem, fs)).item;
  const abs = path.join(scopeDir(repoPath), item.path);
  const sidecarAbs = path.join(scopeDir(repoPath), item.sidecarPath);
  const markdown = await fs.readFile(abs);
  const doc = parseTaskDoc(markdown);
  const sidecarExists = await fs.exists(sidecarAbs);
  const sidecarMarkdown = sidecarExists
    ? await fs.readFile(sidecarAbs)
    : undefined;
  return {
    ...item,
    name: doc.name,
    metadata: doc.metadata,
    body: doc.body,
    sidecarExists,
    sidecarMarkdown,
  };
}

export async function getTask(
  repoPath: BoardTarget,
  target: string,
  fs: BoardFs,
): Promise<TaskRecord> {
  const parsed = parseTarget(target);
  if (parsed.kind === "path") {
    const abs = path.isAbsolute(target)
      ? target
      : path.join(scopeDir(repoPath), target);
    if (!isLeafEntryName(path.basename(abs)) || !(await fs.exists(abs))) {
      throw new TasksError("TASK_NOT_FOUND", `task not found: ${target}`);
    }
    const rel = path.relative(
      boardRoot(repoPath),
      path.dirname(path.dirname(abs)),
    );
    const parts = rel.split(path.sep).filter(Boolean);
    if (parts.length !== 2 || !TASK_STATUSES.includes(parts[1] as TaskStatus)) {
      throw new TasksError("TASK_NOT_FOUND", `task not found: ${target}`);
    }
    const project =
      parts[0] === DEFAULT_TASK_PROJECT_DIR ? DEFAULT_TASK_PROJECT : parts[0];
    if (project !== DEFAULT_TASK_PROJECT && !isUserProjectSlug(project)) {
      throw new TasksError("TASK_NOT_FOUND", `task not found: ${target}`);
    }
    return loadRecord(
      repoPath,
      project,
      parts[1] as TaskStatus,
      parsed.stem,
      fs,
    );
  }

  const hits = await findByStem(repoPath, parsed.stem, fs);
  if (hits.length === 0) {
    throw new TasksError("TASK_NOT_FOUND", `task not found: ${target}`);
  }
  if (hits.length > 1) {
    throw new TasksError(
      "AMBIGUOUS_TASK",
      `stem ${parsed.stem} exists in multiple project/status folders`,
    );
  }
  return loadRecord(
    repoPath,
    hits[0]!.project,
    hits[0]!.status,
    parsed.stem,
    fs,
  );
}

export type RepositoryTaskItem = TaskListItem & {
  doc: TaskDoc;
  source: { scope: string; purpose: import("./paths.js").TaskPurpose };
};
/** Shared projection for repository CLI lists and the persistent dashboard. */
export async function listRepositoryTasksWithDocs(
  root: string, opts: TaskListOpts = {},
  traversal: { super?: boolean } = {},
): Promise<RepositoryTaskItem[]> {
  root = nativeTaskPath(root);
  const nodes = await listRepositoryTaskNodes(root, traversal);
  const rows = await query(async function* () { yield* nodes; })
    .map(node => ({ node, location: taskLocationOf(node, root) }))
    .filter(({ location }) => !opts.status || location.status === opts.status)
    .filter(({ node }) => !opts.priorities?.length || opts.priorities.includes(node.priority))
    .filter(({ location }) => !opts.projects?.length || opts.projects.includes(location.project))
    .map(async ({ node, location }) => {
      const { source, project, status, stem } = location;
      const target = taskBoardLocation(path.resolve(root, source.scope), { super: source.purpose === "domain" });
      const listed = await readListItem(target, project, status, stem, createNodeBoardFs(target), node);
      return { ...listed.item, doc: listed.doc, source,
        path: relativePathInsideScope(root, node.path),
        sidecarPath: relativePathInsideScope(root, path.join(target.scopeDir, listed.item.sidecarPath)) };
    }).value();
  rows.sort((a,b) => a.source.scope.localeCompare(b.source.scope) || a.source.purpose.localeCompare(b.source.purpose)
    || (a.project === b.project ? 0 : a.project === DEFAULT_TASK_PROJECT ? -1 : b.project === DEFAULT_TASK_PROJECT ? 1 : a.project.localeCompare(b.project))
    || TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status) || a.stem.localeCompare(b.stem));
  if (opts.sort === 'priority') return sortTasksByPriority(rows);
  if (opts.sort !== undefined) throw new TasksError('VALIDATION_ERROR', `invalid --sort: ${String(opts.sort)} (expected priority)`);
  return rows;
}
