import { NodeService } from "../node/node-service.js";
import { TaskNode } from "../../domain/models/tasks/task-node.js";
import { setDomainField } from "../../domain/core/fields.js";
import { assertBoardPath, nativeTaskPath } from "./board.js";
import { scopeDir, boardRoot, type BoardTarget } from "./paths.js";
import path from "node:path";
import { getTask, listProjectIds, type BoardWriter } from "./board.js";
import { taskBody } from "../../domain/models/tasks/frontmatter.js";
import {
  sidecarRelPath,
  statusDir,
  taskRelPath,
  withEntryName,
} from "./paths.js";
import { newTaskStem, taskNameSlug } from "../../domain/models/tasks/slug.js";
import { parseTaskPriority } from "../../domain/models/tasks/priority.js";
import { parseTaskProject, projectDirName } from "../../domain/models/tasks/project.js";
import { ensureProjectMetadata } from "./project-meta.js";
import {
  DEFAULT_TASK_PROJECT,
  TASK_STATUSES,
  TasksError,
  type TaskPriority,
  type TaskProjectId,
  type TaskStatus,
} from "../../domain/models/tasks/types.js";

export type { BoardWriter };

export type TasksCreateInput = {
  title: string;
  description?: string;
  body?: string;
  status: TaskStatus;
  name?: string;
  assignee?: string;
  priority?: string;
  project?: string;
};

export function emptyRunLog(stem: string): string {
  return `# Run log: ${stem}

| # | agent | started_at | ended_at | status | error_code |
|---|---|---|---|---|---|

## Notes
`;
}

function defaultBody(title: string): string {
  return `${title}\n\n**Why:**\n\n\n**How to apply:**\n`;
}

async function stemTaken(
  repoPath: BoardTarget,
  project: TaskProjectId,
  status: TaskStatus,
  stem: string,
  fs: BoardWriter,
): Promise<boolean> {
  if (
    (await fs.exists(
      path.join(
        scopeDir(repoPath),
        taskRelPath(project, status, stem, repoPath),
      ),
    )) ||
    (await fs.exists(path.join(statusDir(repoPath, project, status), stem)))
  ) {
    return true;
  }
  const projects = await listProjectIds(repoPath, fs);
  for (const p of projects) {
    for (const s of TASK_STATUSES) {
      if (p === project && s === status) {
        continue;
      }
      const abs = path.join(
        scopeDir(repoPath),
        taskRelPath(p, s, stem, repoPath),
      );
      if (
        (await fs.exists(abs)) ||
        (await fs.exists(path.join(statusDir(repoPath, p, s), stem)))
      ) {
        return true;
      }
    }
  }
  return false;
}

async function uniqueStem(
  repoPath: BoardTarget,
  project: TaskProjectId,
  status: TaskStatus,
  base: string,
  fs: BoardWriter,
): Promise<string> {
  let stem = base;
  let n = 2;
  while (await stemTaken(repoPath, project, status, stem, fs)) {
    stem = `${base}-${n}`;
    n += 1;
  }
  return stem;
}

export async function createTask(
  repoPath: BoardTarget,
  input: TasksCreateInput,
  io: { fs: BoardWriter; now: Date },
): Promise<{
  stem: string;
  path: string;
  sidecarPath: string;
  priority: TaskPriority;
  project: TaskProjectId;
}> {
  const project =
    input.project === undefined
      ? DEFAULT_TASK_PROJECT
      : parseTaskProject(input.project);
  const priority =
    input.priority === undefined ? "none" : parseTaskPriority(input.priority);
  await ensureTaskDestination(repoPath, project, input.status, io.fs);
  const stem = await uniqueStem(
    repoPath,
    project,
    input.status,
    newTaskStem(input.title, io.now),
    io.fs,
  );
  const rel = taskRelPath(project, input.status, stem, repoPath);
  const sidecarRel = sidecarRelPath(project, input.status, stem, repoPath);
  const service = taskNodes(repoPath);
  const node = new TaskNode(taskFile(repoPath, rel));
  await service.create(node, {
    name: input.name ?? taskNameSlug(input.title),
    description: input.description ?? input.title,
    title: input.title,
    status: input.status,
    priority,
    assignee: input.assignee,
    metadata: {
      metadata: {
        "edges-type": "task",
        "edges-task-project": project,
        "edges-updated-at": io.now.toISOString(),
      },
    },
    body: input.body ?? defaultBody(input.title),
  }, { indexGroup: "local" });
  await io.fs.writeFile(
    path.join(scopeDir(repoPath), sidecarRel),
    emptyRunLog(stem),
  );
  return { stem, path: rel, sidecarPath: sidecarRel, priority, project };
}

export async function updateTask(
  repoPath: BoardTarget,
  target: string,
  patch: {
    title?: string;
    description?: string;
    body?: string;
    assignee?: string;
    priority?: string;
    project?: string;
    name?: string;
  },
  io: { fs: BoardWriter; now: Date },
): Promise<{
  stem: string;
  path: string;
  priority: TaskPriority;
  project: TaskProjectId;
}> {
  if (
    !patch.title &&
    !patch.description &&
    !patch.body &&
    !patch.assignee &&
    patch.priority === undefined &&
    patch.project === undefined &&
    patch.name === undefined
  ) {
    throw new TasksError(
      "VALIDATION_ERROR",
      "update requires at least one of --title, --description, --body, --assignee, --priority, --project, --name",
    );
  }
  if (patch.name !== undefined && !patch.name.trim()) {
    throw new TasksError("VALIDATION_ERROR", "name must be nonempty");
  }
  const parsedPriority =
    patch.priority === undefined
      ? undefined
      : parseTaskPriority(patch.priority);
  const parsedProject =
    patch.project === undefined ? undefined : parseTaskProject(patch.project);
  const record = await getTask(repoPath, target, io.fs);
  const service = taskNodes(repoPath);
  const node = await service.get(taskFile(repoPath, record.path), TaskNode);
  if (!node)
    throw new TasksError("TASK_NOT_FOUND", `task not found: ${target}`);
  if (patch.title !== undefined) node.title = patch.title;
  if (patch.description !== undefined)
    node.setMetadata("description", patch.description);
  if (patch.body !== undefined)
    node.body = node.metadata === undefined ? patch.body : taskBody(patch.body);
  if (patch.assignee !== undefined) node.assignee = patch.assignee;
  if (patch.name !== undefined) node.name = patch.name;
  if (parsedPriority !== undefined) node.priority = parsedPriority;
  if (parsedProject !== undefined)
    setDomainField(node, "edges-task-project", parsedProject);
  setDomainField(node, "edges-updated-at", io.now.toISOString());

  let destRel = record.path;
  if (parsedProject !== undefined) {
    destRel = withEntryName(
      taskRelPath(parsedProject, record.status, record.stem, repoPath),
      record.path,
    );
    const destSidecarRel = sidecarRelPath(
      parsedProject,
      record.status,
      record.stem,
      repoPath,
    );
    if (destRel !== record.path) {
      if (await io.fs.exists(path.join(scopeDir(repoPath), destRel))) {
        throw new TasksError(
          "BOARD_IO_ERROR",
          `destination already exists: ${destRel}`,
        );
      }
      await ensureTaskDestination(repoPath, parsedProject, record.status, io.fs);
      await moveTaskEntry(
        repoPath,
        service,
        node,
        destRel,
        record.sidecarPath,
        destSidecarRel,
        io.fs,
      );
    } else {
      await service.update(node, {});
    }
  } else {
    await service.update(node, {});
  }

  return {
    stem: record.stem,
    path: destRel,
    priority: parsedPriority ?? record.priority,
    project: parsedProject ?? record.project,
  };
}

/** Scope and board authorization remain with Tasks, including every NodeService write. */
export function taskNodes(target: BoardTarget): NodeService {
  return new NodeService({
    managedRoot: nativeTaskPath(boardRoot(target)),
    assertWrite: ({ node }) =>
      assertBoardPath(
        target,
        path.join(
          scopeDir(target),
          path.relative(nativeTaskPath(scopeDir(target)), node.path),
        ),
      ),
  });
}

export function taskFile(target: BoardTarget, relative: string): string {
  return path.join(nativeTaskPath(scopeDir(target)), relative);
}

export async function ensureTaskDestination(
  target: BoardTarget,
  project: TaskProjectId,
  status: TaskStatus,
  writer: BoardWriter,
): Promise<void> {
  await ensureProjectMetadata(target, writer, undefined, [project]);
  await writer.mkdirp(statusDir(target, project, status));
}

/** Runlogs and resources travel with the complete task directory. */
export async function moveTaskEntry(
  target: BoardTarget,
  service: NodeService,
  node: TaskNode,
  destination: string,
  _sourceLog: string,
  destinationLog: string,
  fs: BoardWriter,
): Promise<void> {
  const alternate = path.dirname(destination) + ".md";
  if (await fs.exists(path.join(scopeDir(target), alternate)))
    throw new TasksError(
      "BOARD_IO_ERROR",
      `destination entry already exists: ${alternate}`,
    );
  if (await fs.exists(path.join(scopeDir(target), destinationLog)))
    throw new TasksError(
      "BOARD_IO_ERROR",
      `destination runlog already exists: ${destinationLog}`,
    );
  await service.move(node, taskFile(target, destination));
}
