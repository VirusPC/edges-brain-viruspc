/** Shared block grammar for AGENTS (project-harness) and README (project-entries). */
export const INTERNAL_SECTIONS = {
  constraints: { heading: "本层硬约束", marker: "project-harness-constraints" },
  localChildren: { heading: "本层系统维护信息", marker: "project-harness-local" },
  descendantChildren: {
    heading: "下层系统维护信息",
    marker: "project-harness-descendants",
  },
} as const;
export const ENTRIES_SECTIONS = {
  localChildren: { heading: "本层内容", marker: "project-entries-local" },
  descendantChildren: {
    heading: "下层内容",
    marker: "project-entries-descendants",
  },
} as const;
export const COMPOSE_SECTION = {
  heading: "组合",
  marker: "project-harness-compose",
} as const;
export const CODEC_SECTIONS = {
  constraints: INTERNAL_SECTIONS.constraints,
  memory: INTERNAL_SECTIONS.localChildren,
  children: INTERNAL_SECTIONS.descendantChildren,
  compose: COMPOSE_SECTION,
} as const;
export const INDEX_MARKERS = {
  type: "project-memory-type",
  entries: "project-memory-entries",
} as const;
