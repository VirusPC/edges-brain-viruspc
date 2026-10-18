import type { BlockGrammar } from "../core/node-content/grammar.js";

const layer = (name: string, edge: string) =>
  `<!-- project-harness${name ? `-${name}` : ""}:${edge} -->`;
const type = (name: string, edge: string) =>
  `<!-- project-memory-${name}:${edge} -->`;
const legacyLayer = (name: string, edge: string) =>
  `<!-- project-memory${name ? `-${name}` : ""}:${edge} -->`;

export const OUTER_START = layer("", "start"),
  OUTER_END = layer("", "end");
export const CONSTRAINTS_START = layer("constraints", "start"),
  CONSTRAINTS_END = layer("constraints", "end");
export const LOCAL_START = layer("local", "start"),
  LOCAL_END = layer("local", "end");
export const DESCENDANTS_START = layer("descendants", "start"),
  DESCENDANTS_END = layer("descendants", "end");
export const IMPORTANT_START = CONSTRAINTS_START,
  IMPORTANT_END = CONSTRAINTS_END;
export const CHILDREN_START = DESCENDANTS_START,
  CHILDREN_END = DESCENDANTS_END;
export const AUTO_START = legacyLayer("auto", "start"),
  AUTO_END = legacyLayer("auto", "end");
export const ENTRIES_START = type("entries", "start"),
  ENTRIES_END = type("entries", "end");
export const ENTRIES_LOCAL_START = `<!-- project-entries-local:start -->`,
  ENTRIES_LOCAL_END = `<!-- project-entries-local:end -->`;
export const ENTRIES_DESCENDANTS_START = `<!-- project-entries-descendants:start -->`,
  ENTRIES_DESCENDANTS_END = `<!-- project-entries-descendants:end -->`;
export const TYPE_META_START = type("type", "start"),
  TYPE_META_END = type("type", "end");
export const LEGACY_OUTER_START = legacyLayer("", "start"),
  LEGACY_OUTER_END = legacyLayer("", "end");
export const LEGACY_IMPORTANT_START = legacyLayer("important", "start"),
  LEGACY_IMPORTANT_END = legacyLayer("important", "end");
export const LEGACY_LOCAL_START = legacyLayer("local", "start"),
  LEGACY_LOCAL_END = legacyLayer("local", "end");
export const LEGACY_CHILDREN_START = legacyLayer("children", "start"),
  LEGACY_CHILDREN_END = legacyLayer("children", "end");
export const INNER_BLOCK_ORDER = [
  CONSTRAINTS_START,
  LOCAL_START,
  DESCENDANTS_START,
];
export const INDEX_ENTRY_PATTERN = /^- \[[^\]]*\]\(([^)]+)\)(?: — (.*))?$/gm;

export const COMMENT_REWRITES: Array<[RegExp, string]> = [
  [/^<!-- project-memory:start -->$/gm, "<!-- project-harness:start -->"],
  [/^<!-- project-memory:end -->$/gm, "<!-- project-harness:end -->"],
  [
    /^<!-- project-memory-important:(start|end) -->$/gm,
    "<!-- project-harness-constraints:$1 -->",
  ],
  [
    /^<!-- project-memory-local:(start|end) -->$/gm,
    "<!-- project-harness-local:$1 -->",
  ],
  [
    /^<!-- project-memory-children:(start|end) -->$/gm,
    "<!-- project-harness-descendants:$1 -->",
  ],
];
export const TITLE_REWRITES: Array<[RegExp, string]> = [
  [/^## 本层重要约束\s*$/gm, "## 本层硬约束"],
  [/^## (?:本层记忆|本层组成)\s*$/gm, "## 本层系统维护信息"],
  [/^## (?:下层记忆索引|下层作用域|下层节点)\s*$/gm, "## 下层系统维护信息"],
];

/** AGENTS (project-harness) section headings and markers. */
export const INTERNAL_SECTIONS = {
  constraints: { heading: "本层硬约束", marker: "project-harness-constraints" },
  localChildren: { heading: "本层系统维护信息", marker: "project-harness-local" },
  descendantChildren: {
    heading: "下层系统维护信息",
    marker: "project-harness-descendants",
  },
} as const;
/** README (project-entries) section headings and markers. */
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

/** Harness document grammar passed into the core block parser. */
export const HARNESS_GRAMMAR: BlockGrammar = {
  markers: {
    "project-harness-constraints": "constraints",
    "project-memory-important": "constraints",
    "project-harness-local": "memory",
    "project-memory-local": "memory",
    "project-harness-descendants": "children",
    "project-memory-children": "children",
    "project-harness-compose": "compose",
  },
  headings: {
    本层重要约束: "constraints",
    本层硬约束: "constraints",
    本层记忆: "memory",
    本层组成: "memory",
    下层记忆索引: "children",
    下层节点: "children",
    下层作用域: "children",
    本层系统维护信息: "memory",
    下层系统维护信息: "children",
    组合: "compose",
  },
  outerEnds: [OUTER_END, "<!-- project-memory:end -->"],
  sections: CODEC_SECTIONS,
  outerStart: OUTER_START,
  outerEnd: OUTER_END,
};

