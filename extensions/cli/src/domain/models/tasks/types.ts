import type { NodeCreateInput } from "../../core/types.js";

export const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["urgent", "high", "medium", "low", "none"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface TaskCreateInput extends NodeCreateInput {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
}

export interface TaskUpdateInput extends TaskCreateInput {}

export const DEFAULT_TASK_PROJECT = "default";
export const DEFAULT_TASK_PROJECT_DIR = "_default";
export type TaskProjectId = typeof DEFAULT_TASK_PROJECT | string;

export type TaskProjectRecord = {
  project: TaskProjectId;
  dir: string;
  title: string;
  description: string;
  path: string;
};

export const RUN_STATUSES = ["pending", "running", "completed", "failed", "cancelled"] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export type TasksErrorCode =
  | "VALIDATION_ERROR"
  | "TASK_NOT_FOUND"
  | "RUN_NOT_FOUND"
  | "PROJECT_NOT_FOUND"
  | "AMBIGUOUS_TASK"
  | "BOARD_IO_ERROR"
  | "UNKNOWN_ERROR";

export type TaskIdentity = {
  stem: string;
  status: TaskStatus;
  path: string;
  sidecarPath: string;
};

export type TaskListItem = {
  stem: string;
  title: string;
  status: TaskStatus;
  description: string;
  path: string;
  sidecarPath: string;
  runCount: number;
  priority: TaskPriority;
  project: TaskProjectId;
};

export type TaskRecord = TaskListItem & {
  name: string;
  metadata: Record<string, string>;
  body: string;
  sidecarExists: boolean;
  sidecarMarkdown?: string;
};

export class TasksError extends Error {
  readonly errorCode: TasksErrorCode;

  constructor(errorCode: TasksErrorCode, message: string) {
    super(message);
    this.name = "TasksError";
    this.errorCode = errorCode;
  }
}
