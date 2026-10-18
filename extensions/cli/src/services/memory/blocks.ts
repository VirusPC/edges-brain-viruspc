import { ENTRY_NAMES } from "../../domain/config/layout.js";
import { readTemplate } from "./templates.js";
import { typeFromDirName } from "./paths.js";
import {
  OUTER_START,
  OUTER_END,
  IMPORTANT_START,
  IMPORTANT_END,
  LOCAL_START,
  LOCAL_END,
  CHILDREN_START,
  CHILDREN_END,
  AUTO_START,
  AUTO_END,
  ENTRIES_START,
  ENTRIES_END,
  TYPE_META_START,
  TYPE_META_END,
  INNER_BLOCK_ORDER,
  INDEX_ENTRY_PATTERN,
} from '../../domain/config/sections.js';
import {
  escapeRegExp,
  blockPattern,
  appendBlock,
  insertInnerBlock,
  upsertBlock,
  hasConstraintsMarker,
} from '../../domain/models/node/document.js';
export * from '../../domain/config/sections.js';
export * from '../../domain/models/node/document.js';
export function loadAgentsTemplate(): string {
  const text = readTemplate(ENTRY_NAMES.internal);
  let position = -1;
  for (const marker of [
    OUTER_START,
    IMPORTANT_START,
    IMPORTANT_END,
    LOCAL_START,
    LOCAL_END,
    CHILDREN_START,
    CHILDREN_END,
    OUTER_END,
  ]) {
    const index = text.indexOf(marker);
    if (
      index < 0 ||
      index <= position ||
      text.indexOf(marker, index + 1) !== -1
    )
      throw new Error(`Invalid AGENTS template marker: ${marker}`);
    position = index;
  }
  return text;
}
export function extractBlock(start: string, end: string): string {
  const block = loadAgentsTemplate().match(blockPattern(start, end))?.[0];
  if (!block) throw new Error(`Missing template block: ${start}`);
  return block;
}
export function indexFiles(): Record<string, string> {
  return Object.fromEntries(
    [
      ...extractBlock(LOCAL_START, LOCAL_END).matchAll(
        /\]\((\.harness\/(?:memory|skills)\/([^/]+)\/(?:README|AGENTS)\.md)\)/g,
      ),
    ].map((m) => [typeFromDirName(m[2]!), m[1]!]),
  );
}
export const buildImportantBlock = () =>
  extractBlock(IMPORTANT_START, IMPORTANT_END);
export const buildLocalBlock = () => extractBlock(LOCAL_START, LOCAL_END);
export const buildChildrenBlock = (entries: string) =>
  extractBlock(CHILDREN_START, CHILDREN_END).replace(
    "{index_entries}",
    () => entries,
  );
export const ensureImportantBlock = (document: string) =>
  hasConstraintsMarker(document)
    ? document
    : insertInnerBlock(document, IMPORTANT_START, buildImportantBlock());
export function renderAgentsDocument(
  title: string,
  local: string,
  children: string,
): string {
  return (
    loadAgentsTemplate()
      .replace("{title}", () => title)
      .replace(blockPattern(LOCAL_START, LOCAL_END), () => local)
      .replace(blockPattern(CHILDREN_START, CHILDREN_END), () => children)
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}
