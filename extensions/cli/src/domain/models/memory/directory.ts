import type { DirectoryClassifier } from "../../core/directory.js";

export const memoryDirectory: DirectoryClassifier = (_entry, contract) =>
  contract?.module === "memory" ? "memory" : undefined;
