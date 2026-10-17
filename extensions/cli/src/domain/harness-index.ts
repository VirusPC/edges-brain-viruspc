import { existsSync, readFileSync } from "node:fs";
import { ReadmeNode } from "./models/readme/readme-node.js";
import { placeHarnessMaterial } from "./config/harness-materials.js";
import { canonicalPath } from "../utils/filesystem.js";

/** AGENTS 本层指向材料索引的那条组成的标题。 */
export const HARNESS_INDEX_NAME = "本层 harness 材料索引";

/** 那条组成的 description。 */
export const HARNESS_INDEX_DESCRIPTION =
  "本层 harness 材料的组织清单。各材料只在这里登记。";

/** 真系统路径：`<scope>/.harness/README.md`。 */
export function harnessIndexPath(scopeDir: string): string {
  return placeHarnessMaterial(scopeDir, "readme").absPath;
}

/** `--super` 落点：`<scope>/README.md`（readme 材料，scope 目录即 harness）。 */
export function superViewHarnessIndexPath(scopeDir: string): string {
  return placeHarnessMaterial(scopeDir, "readme", { super: true }).absPath;
}

/** 标准组织清单种子。无 YAML frontmatter。 */
export function harnessIndexSeed(): string {
  return `# ${HARNESS_INDEX_NAME}\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n<!-- project-entries-local:end -->\n`;
}

/**
 * `--super` 优先挂载的入口 README。
 * 1. `<scope>/.harness/README.md` 存在则只挂它（真索引；与对外根 README 不是同一份文件）。
 * 2. 否则作用域根 `README.md` 存在则只挂它。
 * 3. 否则返回 undefined，调用方按 harness-materials.json 扁平挂载。
 */
export function preferredSuperHarnessIndex(scopeDir: string): string | undefined {
  const real = harnessIndexPath(scopeDir);
  if (existsSync(real)) return real;
  const superView = superViewHarnessIndexPath(scopeDir);
  if (existsSync(superView)) return superView;
  return undefined;
}

/** 索引 README 的组成边。文件不存在时返回 undefined，调用方再读 AGENTS 本层。 */
export function materialOwnershipPaths(scopeDir: string): Set<string> | undefined {
  const file = harnessIndexPath(scopeDir);
  if (!existsSync(file)) return undefined;
  let node: ReadmeNode;
  try {
    node = new ReadmeNode(file).parse(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
  return new Set(
    node.children.flatMap((reference) => {
      const id = canonicalPath(reference.id);
      return id ? [id] : [];
    }),
  );
}
