import { basename, dirname, join, resolve, sep } from "node:path";
import { harnessMaterialById, tasksBoardDirName } from "../config/harness-materials.js";

export const ENTRY_NAMES = {
  internal: "AGENTS.md",
  readme: "README.md",
  skill: "SKILL.md",
  leaf: "INDEX.md",
} as const;
/** Pre-migration spelling of the leaf entry; still read everywhere, never created. */
export const LEGACY_LEAF_ENTRY = "index.md";
export const LEAF_ENTRY_NAMES: readonly string[] = [
  ENTRY_NAMES.leaf,
  LEGACY_LEAF_ENTRY,
];
export const isLeafEntryName = (name: string): boolean =>
  LEAF_ENTRY_NAMES.includes(name);
export type NodeType =
  "agents" | "readme" | "skill" | "task" | "memory" | "note" | "text" | (string & {});

const LEGACY_NODE_TYPES: Readonly<Record<string, NodeType>> = {
  internal: "agents",
  leaf: "text",
};

/** Old spelling of a canonical type, so registries keyed by it keep resolving. */
export function legacyNodeType(type: string): string {
  for (const [old, current] of Object.entries(LEGACY_NODE_TYPES))
    if (current === type) return old;
  return type;
}

/** Old persisted/queried spellings still read; new writes only use agents/text. */
export function normalizeNodeType(type: string): NodeType {
  return LEGACY_NODE_TYPES[type] ?? type;
}
export function harnessPath(entryPath: string): string {
  return join(
    dirname(entryPath),
    ...(basename(entryPath) === ENTRY_NAMES.internal
      ? [".harness", ENTRY_NAMES.internal]
      : [ENTRY_NAMES.internal]),
  );
}
/** IO callers supply whether another content entry occupies this directory. */
export function lifecycleUnits(
  entryPath: string,
  coLocatedContent = false,
): readonly string[] {
  return basename(entryPath) === ENTRY_NAMES.internal && coLocatedContent
    ? [entryPath, join(dirname(entryPath), ".harness")]
    : [dirname(entryPath)];
}
export function assertMovableLayout(
  entryPath: string,
  coLocatedContent = false,
): void {
  if (basename(entryPath) === ENTRY_NAMES.internal && coLocatedContent)
    throw new Error(
      `${entryPath}: move the co-located content node instead of its AGENTS harness.`,
    );
}
export function resolveHref(
  entryPath: string,
  href: string,
): string | undefined {
  if (
    /^[a-z][a-z\d+.-]*:/i.test(href) ||
    href.startsWith("#") ||
    href.startsWith("//")
  )
    return undefined;
  const pathname = href.split(/[?#]/, 1)[0]!;
  if (!pathname) return undefined;
  try {
    return resolve(dirname(entryPath), decodeURIComponent(pathname));
  } catch {
    throw new Error(`${entryPath}: invalid encoded child href ${href}`);
  }
}

/** Configured tasks material, a README under `.harness/`, or a project org list under the tasks board directory. */
export function isHarnessMaterial(id: string): boolean {
  const tasksPath = harnessMaterialById("tasks").path.split(sep).join("/");
  const norm = id.split(sep).join("/");
  if (norm.endsWith("/" + tasksPath)) return true;
  return (
    basename(id) === ENTRY_NAMES.readme &&
    (dirname(id).split(sep).includes(".harness") ||
      basename(dirname(dirname(id))) === tasksBoardDirName())
  );
}

/** Exclude ordinary navigation before applying strict child-path decoding. */
export function resolveEntryHref(
  entryPath: string,
  href: string,
  includeReadme = false,
): string | undefined {
  const pathname = href.split(/[?#]/, 1)[0]!;
  let filename: string;
  try {
    filename = basename(decodeURIComponent(basename(pathname)));
  } catch {
    return undefined;
  }
  const names = [...Object.values(ENTRY_NAMES), LEGACY_LEAF_ENTRY] as string[];
  if (!names.includes(filename)) return undefined;
  const resolved = resolveHref(entryPath, href);
  if (
    resolved &&
    filename === ENTRY_NAMES.readme &&
    !includeReadme &&
    !isHarnessMaterial(resolved)
  )
    return undefined;
  return resolved;
}
