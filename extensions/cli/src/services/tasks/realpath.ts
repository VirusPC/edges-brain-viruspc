import { realpathSync } from "node:fs";
import path from "node:path";
import { isWithinPath } from "../../utils/filesystem.js";
import { TasksError } from "../../domain/models/tasks/types.js";

/** JS realpath keeps caller casing on macOS; native realpath is the directory-entry spelling used by node paths. */
export type TaskBoardRealpath = {
  javascript(target: string): string;
  native(target: string): string;
};

const systemTaskBoardRealpath: TaskBoardRealpath = {
  javascript: (target) => realpathSync(target),
  native: (target) => realpathSync.native(target),
};

let taskBoardRealpath: TaskBoardRealpath = systemTaskBoardRealpath;

/** Tests simulate a case-insensitive scope alias. Production calls keep the system implementation. */
export function useTaskBoardRealpathForTests(realpath?: TaskBoardRealpath): void {
  taskBoardRealpath = realpath ?? systemTaskBoardRealpath;
}

/** Directory-entry spelling shared with node.path. JS realpath keeps caller casing on macOS. */
export function nativeTaskPath(target: string): string {
  return taskBoardRealpath.native(target);
}

export function relativePathInsideScope(scopeRoot: string, file: string): string {
  const rel = path.relative(scopeRoot, file);
  if (!rel || !isWithinPath(file, scopeRoot)) {
    throw new TasksError(
      "VALIDATION_ERROR",
      "path is outside selected task board",
    );
  }
  return rel;
}
