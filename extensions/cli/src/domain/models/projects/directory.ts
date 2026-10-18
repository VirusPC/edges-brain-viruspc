import type { DirectoryClassifier } from "../../core/directory.js";

export const projectDirectory: DirectoryClassifier = (entry) =>
  /(?:^|\/)(?<!memory\/)projects\/(?:[^/]+\/)+(?:INDEX|index)\.md$/.test(entry)
    ? "project"
    : undefined;
