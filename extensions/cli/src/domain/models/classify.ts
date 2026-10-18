import { basename } from "node:path";
import { tasksBoardDirName } from "../config/harness-materials.js";
import { ENTRY_NAMES, isLeafEntryName, type NodeType } from "./layout.js";
import { TASK_STATUSES } from "./tasks/types.js";

export interface DirectoryContract {
  module?: string;
  format?: string;
  name?: string;
}

export type DirectoryClassifier = (
  entryPath: string,
  contract?: DirectoryContract,
) => NodeType | undefined;

/** Checked in this order. Later registerDirectoryClassifier calls run first. */
const classifiers: DirectoryClassifier[] = [
  (_entry, contract) => (contract?.module === "memory" ? "memory" : undefined),
  (entry) => {
    const board = tasksBoardDirName().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(
      `(?:^|/)${board}/(?:[^/]+/)*(?:${TASK_STATUSES.join("|")})/[^/]+/(?:INDEX|index)\\.md$`,
    ).test(entry)
      ? "task"
      : undefined;
  },
  (entry) =>
    /(?:^|\/)notes\/(?:[^/]+\/)+(?:INDEX|index)\.md$/.test(entry) ? "note" : undefined,
  (entry) =>
    /(?:^|\/)(?<!memory\/)projects\/(?:[^/]+\/)+(?:INDEX|index)\.md$/.test(entry)
      ? "project"
      : undefined,
];

/** Register a directory contract; return a disposer for scoped registrations. */
export function registerDirectoryClassifier(
  classifier: DirectoryClassifier,
): () => void {
  classifiers.unshift(classifier);
  return () => {
    const index = classifiers.indexOf(classifier);
    if (index >= 0) classifiers.splice(index, 1);
  };
}

export function identifyNodeType(
  entryPath: string,
  contract?: DirectoryContract,
): NodeType | undefined {
  const filename = basename(entryPath);
  if (filename === ENTRY_NAMES.internal) return "agents";
  if (filename === ENTRY_NAMES.readme) return "readme";
  if (filename === ENTRY_NAMES.skill) return "skill";
  if (!isLeafEntryName(filename)) return undefined;
  for (const classify of classifiers) {
    const type = classify(entryPath, contract);
    if (type !== undefined) return type;
  }
  return "text";
}
