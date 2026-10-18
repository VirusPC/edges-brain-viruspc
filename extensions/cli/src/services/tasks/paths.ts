import path from "node:path";
import { placeHarnessMaterial, harnessMaterialById } from "../../domain/config/harness-materials.js";
import { ENTRY_NAMES, LEGACY_LEAF_ENTRY } from "../../domain/config/layout.js";
import { isLeafEntryName } from "../../domain/models/node/layout.js";
import { projectDirName } from "../../domain/models/tasks/project.js";
import {
  TASK_STATUSES,
  type TaskProjectId,
  type TaskStatus,
} from "../../domain/models/tasks/types.js";

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export type TaskPurpose = "domain" | "maintenance";
export type TaskBoardLocation = {
  scopeDir: string;
  purpose: TaskPurpose;
  boardDir: string;
};
export type BoardTarget = string | TaskBoardLocation;
/** A string scope is the real system: materials live under `<scope>/.harness`. Pass `{ super: true }` for the virtual board in the scope directory. */
export function taskBoardLocation(
  scopeDir: string,
  options: { super?: boolean } = {},
): TaskBoardLocation {
  const superFace = options.super === true;
  const { absPath } = placeHarnessMaterial(scopeDir, "tasks", { super: superFace });
  return {
    scopeDir,
    purpose: superFace ? "domain" : "maintenance",
    boardDir: path.dirname(absPath),
  };
}

/** Board of the subject system. The directory is the tasks material from harness-materials. Real systems place it under `<scope>/.harness`; `--super` places it in the scope directory. */
export function subjectTaskBoard(scopeDir: string, options: { super?: boolean } = {}): TaskBoardLocation {
  return taskBoardLocation(scopeDir, options);
}
export function resolveBoard(target: BoardTarget): TaskBoardLocation {
  return typeof target === "string" ? subjectTaskBoard(target) : target;
}
export function scopeDir(target: BoardTarget): string {
  return resolveBoard(target).scopeDir;
}
export function boardRoot(target: BoardTarget): string {
  return resolveBoard(target).boardDir;
}
export function boardRel(target: BoardTarget = ""): string {
  return path.relative(scopeDir(target), boardRoot(target));
}

export function statusDir(
  repoPath: BoardTarget,
  project: TaskProjectId,
  status: TaskStatus,
): string {
  return path.join(boardRoot(repoPath), projectDirName(project), status);
}

export function taskRelPath(
  project: TaskProjectId,
  status: TaskStatus,
  stem: string,
  target: BoardTarget = "",
): string {
  return path.join(
    boardRel(target),
    projectDirName(project),
    status,
    stem,
    ENTRY_NAMES.leaf,
  );
}

/** Same task location with the pre-migration `index.md` entry name. */
export function legacyTaskRelPath(
  project: TaskProjectId,
  status: TaskStatus,
  stem: string,
  target: BoardTarget = "",
): string {
  return path.join(
    path.dirname(taskRelPath(project, status, stem, target)),
    LEGACY_LEAF_ENTRY,
  );
}

/** Keep an existing entry's spelling when a move relocates its directory. */
export function withEntryName(destination: string, source: string): string {
  return path.join(path.dirname(destination), path.basename(source));
}

export function sidecarRelPath(
  project: TaskProjectId,
  status: TaskStatus,
  stem: string,
  target: BoardTarget = "",
): string {
  return path.join(
    boardRel(target),
    projectDirName(project),
    status,
    stem,
    `.${stem}.log.md`,
  );
}

export function stemFromFilename(name: string): string | undefined {
  if (!isTaskMarkdownName(name)) {
    return undefined;
  }
  return name.slice(0, -".md".length);
}

export function isTaskMarkdownName(name: string): boolean {
  if (!name.endsWith(".md")) {
    return false;
  }
  if (name.startsWith(".") && name.endsWith(".log.md")) {
    return false;
  }
  const materialName = path.basename(harnessMaterialById("tasks").path);
  if (name === ENTRY_NAMES.internal || name === ENTRY_NAMES.readme || name === materialName) {
    return false;
  }
  return true;
}

export function parseTarget(
  target: string,
): { kind: "stem"; stem: string } | { kind: "path"; stem: string } {
  const base = path.basename(target);
  if (isLeafEntryName(base) && target.includes("/"))
    return { kind: "path", stem: path.basename(path.dirname(target)) };
  if (target.includes("/") && base.endsWith(".md")) {
    return { kind: "path", stem: base.slice(0, -".md".length) };
  }
  if (base.endsWith(".md") && target !== base) {
    return { kind: "path", stem: base.slice(0, -".md".length) };
  }
  if (
    target.endsWith(".md") &&
    (target.includes("/") || target.includes("\\"))
  ) {
    return { kind: "path", stem: base.slice(0, -".md".length) };
  }
  if (target.includes("/") || target.includes("\\")) {
    const stem = base.endsWith(".md") ? base.slice(0, -".md".length) : base;
    return { kind: "path", stem };
  }
  const stem = target.endsWith(".md") ? target.slice(0, -".md".length) : target;
  return { kind: "stem", stem };
}
