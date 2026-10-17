import { listHarnessMaterialAbsPaths } from "../../domain/config/harness-materials.js";
import { preferredSuperHarnessIndex } from "../../domain/harness-index.js";
import { ENTRY_NAMES } from "../../domain/models/layout.js";
import { SuperAgentsNode } from "../../domain/models/index.js";
import path from "node:path";

/**
 * Runtime SuperAgentsNode.
 * Prefer the harness entry README and expand from it.
 * Fall back to flat harness-materials mounts only when that README is absent.
 */
export function createSuperAgentsNode(scopePath: string): SuperAgentsNode {
  const scopeDir = path.basename(scopePath) === ENTRY_NAMES.internal
    ? path.dirname(path.resolve(scopePath))
    : path.resolve(scopePath);
  const preferred = preferredSuperHarnessIndex(scopeDir);
  const mounts = preferred
    ? [{ id: preferred }]
    : listHarnessMaterialAbsPaths(scopeDir).map(({ absPath }) => ({ id: absPath }));
  return new SuperAgentsNode(scopeDir, mounts);
}
