import { scopeDir, type BoardTarget } from "./paths.js";
import path from "node:path";
import { getTask, type BoardWriter } from "./board.js";
import { TaskNode } from "../../domain/models/tasks/task-node.js";
import { setDomainField } from "../../domain/core/fields.js";
import { taskNodes, taskFile, moveTaskEntry, ensureTaskDestination } from "./write.js";
import { sidecarRelPath, taskRelPath, withEntryName } from "./paths.js";
import { TasksError, type TaskStatus } from "../../domain/models/tasks/types.js";

export async function moveTaskStatus(
  repoPath: BoardTarget,
  target: string,
  next: TaskStatus,
  io: { fs: BoardWriter; now: Date },
): Promise<{
  stem: string;
  from: TaskStatus;
  to: TaskStatus;
  path: string;
  sidecarPath: string;
}> {
  const record = await getTask(repoPath, target, io.fs);
  const destRel = withEntryName(
    taskRelPath(record.project, next, record.stem, repoPath),
    record.path,
  );
  const destSidecarRel = sidecarRelPath(
    record.project,
    next,
    record.stem,
    repoPath,
  );
  if (record.status === next) {
    return {
      stem: record.stem,
      from: record.status,
      to: next,
      path: record.path,
      sidecarPath: record.sidecarPath,
    };
  }

  const destAbs = path.join(scopeDir(repoPath), destRel);
  if (await io.fs.exists(destAbs)) {
    throw new TasksError(
      "BOARD_IO_ERROR",
      `destination already exists: ${destRel}`,
    );
  }

  await ensureTaskDestination(repoPath, record.project, next, io.fs);
  const sourceAbs = path.join(scopeDir(repoPath), record.path);
  const service = taskNodes(repoPath);
  const node = await service.get(taskFile(repoPath, record.path), TaskNode);
  if (!node)
    throw new TasksError("TASK_NOT_FOUND", `task not found: ${target}`);
  node.status = next;
  setDomainField(node, "edges-updated-at", io.now.toISOString());
  await moveTaskEntry(
    repoPath,
    service,
    node,
    destRel,
    record.sidecarPath,
    destSidecarRel,
    io.fs,
  );

  return {
    stem: record.stem,
    from: record.status,
    to: next,
    path: destRel,
    sidecarPath: destSidecarRel,
  };
}
