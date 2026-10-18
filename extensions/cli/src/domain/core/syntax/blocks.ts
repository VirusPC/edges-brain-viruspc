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
export const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const blockPattern = (start: string, end: string) =>
  new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
export const appendBlock = (text: string, block: string) =>
  text +
  (text.endsWith("\n\n") ? "" : text.endsWith("\n") ? "\n" : "\n\n") +
  block;

const COMMENT_REWRITES: Array<[RegExp, string]> = [
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
const TITLE_REWRITES: Array<[RegExp, string]> = [
  [/^## 本层重要约束\s*$/gm, "## 本层硬约束"],
  [/^## (?:本层记忆|本层组成)\s*$/gm, "## 本层系统维护信息"],
  [/^## (?:下层记忆索引|下层作用域|下层节点)\s*$/gm, "## 下层系统维护信息"],
];
export function rewriteLayerSurface(source: string): string {
  let next = source;
  for (const [from, to] of COMMENT_REWRITES) next = next.replace(from, to);
  for (const [from, to] of TITLE_REWRITES) next = next.replace(from, to);
  return next;
}
export const hasConstraintsMarker = (source: string) =>
  source.includes(CONSTRAINTS_START) || source.includes(LEGACY_IMPORTANT_START);
export const extractLocalBlock = (source: string) =>
  source.match(blockPattern(LOCAL_START, LOCAL_END))?.[0] ??
  source.match(blockPattern(LEGACY_LOCAL_START, LEGACY_LOCAL_END))?.[0];
export const extractDescendantsBlock = (source: string) =>
  source.match(blockPattern(DESCENDANTS_START, DESCENDANTS_END))?.[0] ??
  source.match(blockPattern(LEGACY_CHILDREN_START, LEGACY_CHILDREN_END))?.[0];

export function insertInnerBlock(
  document: string,
  start: string,
  block: string,
): string {
  if (!document.includes(OUTER_START) && !document.includes(LEGACY_OUTER_START))
    document = appendBlock(document, `${OUTER_START}\n${OUTER_END}`);
  const outerEnd = document.includes(OUTER_END) ? OUTER_END : LEGACY_OUTER_END;
  const anchor =
    INNER_BLOCK_ORDER.slice(INNER_BLOCK_ORDER.indexOf(start) + 1).find((m) =>
      document.includes(m),
    ) ?? outerEnd;
  const position = document.indexOf(anchor);
  if (position < 0)
    throw new Error("Missing project-harness outer closing marker");
  return `${document.slice(0, position).trimEnd()}\n\n${block}\n${document.slice(position)}`;
}
export function upsertBlock(
  document: string,
  start: string,
  end: string,
  block: string,
): string {
  const starts = document.split(start).length - 1,
    ends = document.split(end).length - 1;
  if (
    starts !== ends ||
    starts > 1 ||
    (starts === 1 && document.indexOf(end) < document.indexOf(start))
  )
    throw new Error("Malformed managed block markers");
  const newline = document.includes("\r\n") ? "\r\n" : "\n";
  block = block.replace(/\r?\n/g, newline);
  const pattern = blockPattern(start, end);
  return pattern.test(document)
    ? document.replace(pattern, () => block)
    : INNER_BLOCK_ORDER.includes(start)
      ? insertInnerBlock(document, start, block)
      : `${appendBlock(document, block)}\n`;
}
