import { initScope, type InitScopeOptions } from "../init/service.js";
import { type BoardTarget } from "./paths.js";
import { getTask, listTasks, type BoardFs, type TaskListOpts } from "./board.js";

export type { TaskListOpts };
import { messagesForRun, parseRunLog, resolveRunId, type TaskRun } from "./runlog.js";
import { TasksError, type TaskListItem, type TaskRecord } from "../../domain/models/tasks/types.js";

export async function listTasksService(
  repoPath: BoardTarget,
  opts: TaskListOpts,
  fs: BoardFs,
): Promise<TaskListItem[]> {
  return listTasks(repoPath, opts, fs);
}

export async function getTaskService(repoPath: BoardTarget, target: string, fs: BoardFs): Promise<TaskRecord> {
  return getTask(repoPath, target, fs);
}

export async function findRun(
  repoPath: BoardTarget,
  runId: string,
  taskStem: string | undefined,
  fs: BoardFs,
): Promise<{ run: TaskRun; messages: Array<{ seq: number; at?: string; text: string }> }> {
  const resolved = resolveRunId(runId, taskStem);
  const record = await getTask(repoPath, resolved.stem, fs);
  const parsed = parseRunLog(record.sidecarMarkdown ?? "", record.stem);
  if (parsed.runs.length === 0) {
    throw new TasksError("RUN_NOT_FOUND", `run not found: ${resolved.runId}`);
  }
  const run = parsed.runs.find((item) => item.runId === resolved.runId);
  if (!run) {
    throw new TasksError("RUN_NOT_FOUND", `run not found: ${resolved.runId}`);
  }
  return { run, messages: messagesForRun(parsed, resolved.runId) };
}

export { createTask, updateTask } from "./write.js";
export { createProject, getProject, listProjectsInScope, updateProject, projectRecordFromEntry } from "./project-meta.js";
export { renderReviewPageFromText } from "./review-page.js";
export { asTasksError, openTasksRuntime } from "./result.js";
export { formatRunsTable, formatRunMessagesTable } from "./format.js";
export { parseRunLog };
export { isTaskStatus, subjectTaskBoard } from "./paths.js";
export { nativeTaskPath, relativePathInsideScope } from "./realpath.js";
export { moveTaskStatus } from "./move.js";
export function initTasks(options: Omit<InitScopeOptions, "modules">) {
  return initScope({ ...options, modules: ["tasks"] });
}

export { isTasksBoardReadmeNode, tasksBoardDirName, tasksBoardReadmeExists, tasksBoardReadmePath } from "./board-material.js";
export { listTaskNodes } from "./node-query.js";
export { gitRoot } from "../scope.js";
export { NodeService } from "../node/node-service.js";
export { buildSystemForest } from "../node/system-forest-service.js";
export { groupRecords, matchesFilters, parseFieldFilter, type FieldFilter } from "../list-query.js";
