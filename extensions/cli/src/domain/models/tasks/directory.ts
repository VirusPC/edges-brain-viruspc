import { tasksBoardDirName } from "../../config/harness-materials.js";
import type { DirectoryClassifier } from "../../core/directory.js";
import { TASK_STATUSES } from "./types.js";

export const taskDirectory: DirectoryClassifier = (entry) => {
  const board = tasksBoardDirName().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?:^|/)${board}/(?:[^/]+/)*(?:${TASK_STATUSES.join("|")})/[^/]+/(?:INDEX|index)\\.md$`,
  ).test(entry)
    ? "task"
    : undefined;
};
