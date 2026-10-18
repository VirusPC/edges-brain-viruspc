/** Entry filenames and the leaf-directory rules that use them. */

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

/** Old persisted spellings. New writes use agents and text. */
export const LEGACY_NODE_TYPES = {
  internal: "agents",
  leaf: "text",
} as const;

/**
 * Leaf INDEX.md rules, checked in this order: memory, task, note, project.
 * Task paths are filled in by the caller because the board directory name comes from harness materials.
 */
export const LEAF_DIRECTORIES = [
  { type: "memory", module: "memory" },
  { type: "task" },
  { type: "note", path: /(?:^|\/)notes\/(?:[^/]+\/)+(?:INDEX|index)\.md$/ },
  {
    type: "project",
    path: /(?:^|\/)(?<!memory\/)projects\/(?:[^/]+\/)+(?:INDEX|index)\.md$/,
  },
] as const;
