/**
 * Init module table. Paths are not stored here: catalog rows are material ids,
 * and placeHarnessMaterial is the only reader of harness-materials.json paths.
 * notes is not a child of memory.
 */
export const INIT_MODULE_NAMES = ["memory", "skills", "tasks", "notes", "projects"] as const;

export type InitModuleName = (typeof INIT_MODULE_NAMES)[number];

/** Orchestration order. Reported module lists keep the caller's order. */
export const MODULE_RUN_ORDER: readonly InitModuleName[] = [
  "memory",
  "skills",
  "tasks",
  "projects",
  "notes",
];

export const DEFAULT_INIT_MODULES: readonly InitModuleName[] = [
  "memory",
  "skills",
  "notes",
  "projects",
];

/** Public memory types created when `edges init` includes memory and omits --memory-types. */
export const DEFAULT_PUBLIC_MEMORY_TYPES = [
  "feedback",
  "project",
  "reference",
] as const;

/**
 * Official type name to harness-materials id.
 * `user` has no catalog row; custom types keep their TypeSpec index path.
 */
export const TYPE_MATERIAL_IDS: Readonly<Record<string, string>> = {
  feedback: "memory.feedbacks",
  project: "memory.projects",
  reference: "memory.references",
  managed: "skills.managed",
  referenced: "skills.referenced",
};

/** AGENTS 本层指向 `.harness/README.md` 的那条组成。 */
export const SCOPE_README_ENTRY_NAME = "本层 harness 材料索引";
export const SCOPE_README_ENTRY_DESCRIPTION =
  "本层 harness 材料的组织清单。各材料只在这里登记。";

export type HarnessBoardModule = {
  module: "notes" | "projects" | "tasks";
  materialId: string;
  title: string;
  description: string;
  body?: string;
};

/** projects, then notes, matching the old board list. tasks is its own module. */
export const HARNESS_BOARD_MODULES: readonly HarnessBoardModule[] = [
  {
    module: "tasks",
    materialId: "tasks",
    title: "Tasks",
    description: "任务看板。",
    body: "# Tasks\n\n<!-- project-entries-local:start -->\n## 本层内容\n<!-- project-entries-local:end -->\n",
  },
  {
    module: "projects",
    materialId: "projects",
    title: "projects",
    description: "项目内容叶子的组织清单。",
  },
  {
    module: "notes",
    materialId: "notes",
    title: "notes",
    description: "笔记内容叶子的组织清单。",
  },
];

export function harnessBoardSeed(title: string): string {
  return `# ${title}\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n<!-- project-entries-local:end -->\n`;
}
