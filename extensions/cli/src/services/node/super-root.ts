import { existsSync } from "node:fs";
import path from "node:path";
import { listHarnessMaterialAbsPaths, placeHarnessMaterial } from "../../domain/config/harness-materials.js";
import { ENTRY_NAMES } from "../../domain/config/layout.js";
import { SuperAgentsNode } from "../../domain/models/index.js";

/**
 * Runtime SuperAgentsNode.
 * Mount `.harness/README.md` when it exists and expand from it.
 * Otherwise flat-mount existing harness-materials paths.
 */
export function createSuperAgentsNode(scopePath: string): SuperAgentsNode {
  const scopeDir = path.basename(scopePath) === ENTRY_NAMES.internal
    ? path.dirname(path.resolve(scopePath))
    : path.resolve(scopePath);
  const readme = placeHarnessMaterial(scopeDir, "readme").absPath;
  const mounts = existsSync(readme)
    ? [{ id: readme }]
    : listHarnessMaterialAbsPaths(scopeDir).map(({ absPath }) => ({ id: absPath }));
  return new SuperAgentsNode(scopeDir, mounts);
}
