import { isWithinPath } from '../utils/filesystem.js';
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { identifyNodeType } from "../domain/models/layout.js";
import { indexContract, physicalParentNode } from "./node/node-layout.js";
import { checkPath } from "./node/node-files.js";

/** A source checkout/worktree bounds discovery; standalone files use filesystem ancestry. */
function sourceBoundary(source: string): string {
  let directory = dirname(source);
  while (!existsSync(join(directory, ".git"))) {
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return directory;
}
/** Business adapters may import an unclassified external entry, but never retype a known domain. */
export function assertImportType(
  rawSource: string,
  expected: string,
  sourceRoot?: string,
): string {
  const source = checkPath(resolve(rawSource));
  const boundary =
    sourceRoot === undefined
      ? sourceBoundary(source)
      : checkPath(resolve(sourceRoot));
  if (!isWithinPath(source, boundary))
    throw new Error(`${source}: source escapes discovery boundary ${boundary}`);
  const parent = physicalParentNode(source, boundary);
  const type = identifyNodeType(
    source,
    parent ? indexContract(parent) : undefined,
  );
  if (type !== expected && type !== "text")
    throw new Error(
      `${source}: source type ${type ?? "unknown"} cannot be imported as ${expected}`,
    );
  return source;
}
