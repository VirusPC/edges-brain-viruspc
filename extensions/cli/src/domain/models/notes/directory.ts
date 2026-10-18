import type { DirectoryClassifier } from "../../core/directory.js";

export const noteDirectory: DirectoryClassifier = (entry) =>
  /(?:^|\/)notes\/(?:[^/]+\/)+(?:INDEX|index)\.md$/.test(entry) ? "note" : undefined;
