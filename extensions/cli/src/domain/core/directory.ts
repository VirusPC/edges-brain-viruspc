export interface DirectoryContract {
  module?: string;
  format?: string;
  name?: string;
}

/** A model-owned rule. Core stores and runs the list; it does not name node types. */
export type DirectoryClassifier = (
  entryPath: string,
  contract?: DirectoryContract,
) => string | undefined;

const classifiers: DirectoryClassifier[] = [];

/**
 * Install model directory rules in check order.
 * Called once from the models layout entry. Later calls append.
 * Scoped extensions use {@link registerDirectoryClassifier}, which is consulted first.
 */
export function installDirectoryClassifiers(
  next: readonly DirectoryClassifier[],
): void {
  classifiers.push(...next);
}

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

export function classifyDirectory(
  entryPath: string,
  contract?: DirectoryContract,
): string | undefined {
  for (const classify of classifiers) {
    const type = classify(entryPath, contract);
    if (type !== undefined) return type;
  }
  return undefined;
}
