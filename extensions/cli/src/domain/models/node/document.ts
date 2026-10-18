import { isDeepStrictEqual } from "node:util";
import type { DocumentCodec } from "../../../utils/markdown/types.js";
import {
  appendBlock,
  blockPattern,
  escapeRegExp,
} from "../../core/node-content/blocks.js";
import type { AgentsDocument, AgentsItem } from "../../core/node-content/document.js";
import {
  decodeBody as readBody,
  parseNode as readNode,
} from "../../core/node-content/parse.js";
import { serializeNode as writeNode } from "../../core/node-content/serialize.js";
import {
  COMMENT_REWRITES,
  CONSTRAINTS_START,
  DESCENDANTS_END,
  DESCENDANTS_START,
  ENTRIES_SECTIONS,
  HARNESS_GRAMMAR,
  INNER_BLOCK_ORDER,
  INTERNAL_SECTIONS,
  LEGACY_CHILDREN_END,
  LEGACY_CHILDREN_START,
  LEGACY_IMPORTANT_START,
  LEGACY_LOCAL_END,
  LEGACY_LOCAL_START,
  LEGACY_OUTER_END,
  LEGACY_OUTER_START,
  LOCAL_END,
  LOCAL_START,
  OUTER_END,
  OUTER_START,
  TITLE_REWRITES,
} from "../../config/sections.js";

export type { AgentsDocument, AgentsItem, AgentsLink, SectionKey } from "../../core/node-content/document.js";
export { agentsLinks, createAgentsDocument } from "../../core/node-content/document.js";
export { appendBlock, blockPattern, escapeRegExp };

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

export function decodeBody(source: string) {
  return readBody(source, HARNESS_GRAMMAR);
}

export function parseNode(source: string) {
  return readNode(source, HARNESS_GRAMMAR);
}

export function serializeNode(
  model: AgentsDocument,
  originalSource?: string,
) {
  return writeNode(model, originalSource, HARNESS_GRAMMAR);
}

export const agentsDocumentCodec: DocumentCodec<AgentsDocument, "agents"> = {
  type: "agents",
  parse: parseNode,
  serialize: serializeNode,
};

export interface SyntaxReference {
  target: string;
  label?: string;
  description?: string;
}
export interface SyntaxContent {
  constraints: readonly string[];
  localChildren: readonly SyntaxReference[];
  descendantChildren: readonly SyntaxReference[];
  compose?: readonly SyntaxReference[];
}

// Existing type indexes use the same local ownership semantics, with different markers.
function adaptEntries(source: string): string {
  return source.replace(
    /^<!-- project-memory-entries:(start|end) -->$/gm,
    "<!-- project-harness-local:$1 -->",
  );
}
export type SyntaxProfile = "agents" | "entries";

const PAIRS = [
  [ENTRIES_SECTIONS.localChildren, INTERNAL_SECTIONS.localChildren],
  [ENTRIES_SECTIONS.descendantChildren, INTERNAL_SECTIONS.descendantChildren],
] as const;

function toEntriesProfile(source: string): string {
  let out = source;
  for (const [entries, agents] of PAIRS)
    out = out.replaceAll(`<!-- ${entries.marker}:`, `<!-- ${agents.marker}:`);
  return out;
}

function fromEntriesProfile(rendered: string): string {
  let out = rendered;
  for (const [entries, agents] of PAIRS)
    out = out
      .replaceAll(`<!-- ${agents.marker}:`, `<!-- ${entries.marker}:`)
      .replaceAll(
        new RegExp(
          `(<!-- ${entries.marker}:start -->\\r?\\n)## ${agents.heading}`,
          "g",
        ),
        `$1## ${entries.heading}`,
      );
  return out;
}

function constraintText(item: AgentsItem): string {
  return item.content
    .map((run) => (run.kind === "text" ? run.value : run.label))
    .join("");
}
function indexedReferences(item: AgentsItem): SyntaxReference[] {
  return item.content.flatMap((run, index) => {
    if (run.kind !== "link") return [];
    let suffix = "";
    for (
      let i = index + 1;
      i < item.content.length && item.content[i].kind === "text";
      i++
    )
      suffix += (item.content[i] as { value: string }).value;
    const description = suffix.replace(/^\s*[—–-]\s*/, "").trim();
    return [
      {
        target: run.target,
        label: run.label,
        ...(description ? { description } : {}),
      },
    ];
  });
}
function renderReference(reference: SyntaxReference): AgentsItem {
  return {
    content: [
      {
        kind: "link",
        target: reference.target,
        label: reference.label ?? reference.target,
      },
      ...(reference.description === undefined
        ? []
        : [{ kind: "text" as const, value: ` — ${reference.description}` }]),
    ],
  };
}
function rebuildIndexes(
  original: AgentsItem[],
  references: readonly Readonly<SyntaxReference>[],
  indexItems: ReadonlySet<AgentsItem>,
  isIndexed: (href: string) => boolean,
): AgentsItem[] {
  const remaining = [...references];
  const next: AgentsItem[] = [];
  for (const item of original) {
    const before = indexItems.has(item)
      ? indexedReferences(item).filter((reference) =>
          isIndexed(reference.target),
        )
      : [];
    if (!before.length) {
      next.push(item);
      continue;
    }
    const selected = remaining.splice(0, before.length);
    const unchanged = isDeepStrictEqual(before, selected);
    if (indexedReferences(item).length > 1 && !unchanged)
      throw new Error(
        "Cannot edit a multi-link index item without changing surrounding authored text.",
      );
    next.push(...(unchanged ? [item] : selected.map(renderReference)));
  }
  return [...next, ...remaining.map(renderReference)];
}

/** Immutable source snapshot used only to preserve unmodeled Markdown during edits. */
export class InternalSyntax {
  readonly #source: string;
  readonly #model: AgentsDocument;
  readonly #entries: boolean;
  readonly #profile: SyntaxProfile;
  readonly #isIndexed: (href: string) => boolean;
  readonly #indexItems = new Set<AgentsItem>();
  constructor(
    source: string,
    isIndexed: (href: string) => boolean = () => true,
    profile: SyntaxProfile = "agents",
  ) {
    this.#profile = profile;
    this.#isIndexed = isIndexed;
    this.#entries = /^<!-- project-memory-entries:start -->$/m.test(source);
    this.#source = adaptEntries(
      this.#profile === "entries" ? toEntriesProfile(source) : source,
    );
    const decoded = decodeBody(this.#source);
    this.#model = decoded.model;
    for (const key of ["memory", "children", "compose"] as const) {
      decoded.bindings[key].forEach((binding, index) => {
        const itemSource = this.#source.slice(binding.start, binding.end);
        const references = indexedReferences(this.#model[key][index]);
        // Compose targets are directories, not AGENTS/README entry filenames.
        const selected =
          key === "compose"
            ? references
            : references.filter((reference) => isIndexed(reference.target));
        // Only list items carry index ownership; prose links remain source content.
        if (/^(?:[-+*]|\d+[.)])\s/.test(itemSource) && selected.length > 0)
          this.#indexItems.add(this.#model[key][index]);
      });
    }
  }
  content(): SyntaxContent {
    return {
      constraints: this.#model.constraints.map(constraintText),
      localChildren: this.#model.memory
        .filter((item) => this.#indexItems.has(item))
        .flatMap(indexedReferences)
        .filter((reference) => this.#isIndexed(reference.target)),
      descendantChildren: this.#model.children
        .filter((item) => this.#indexItems.has(item))
        .flatMap(indexedReferences)
        .filter((reference) => this.#isIndexed(reference.target)),
      compose: this.#model.compose
        .filter((item) => this.#indexItems.has(item))
        .flatMap(indexedReferences),
    };
  }
  serialize(content: SyntaxContent): string {
    if (/<!-- task-projects:(?:start|end) -->/.test(this.#source))
      throw new Error("migration-required: run pnpm --filter @viruspc/edges exec tsx ../../scripts/migrate-agents-indexes.mts --root /absolute/scope --write");
    const originalConstraints = this.#model.constraints;
    const used = new Set<number>();
    const constraints = content.constraints.map((value) => {
      const index = originalConstraints.findIndex(
        (item, i) => !used.has(i) && constraintText(item) === value,
      );
      if (index >= 0) {
        used.add(index);
        return originalConstraints[index];
      }
      return { content: [{ kind: "text" as const, value }] };
    });
    const model: AgentsDocument = {
      constraints,
      memory: rebuildIndexes(
        this.#model.memory,
        content.localChildren,
        this.#indexItems,
        this.#isIndexed,
      ),
      children: rebuildIndexes(
        this.#model.children,
        content.descendantChildren,
        this.#indexItems,
        this.#isIndexed,
      ),
      compose: rebuildIndexes(
        this.#model.compose,
        content.compose ??
          this.#model.compose
            .filter((item) => this.#indexItems.has(item))
            .flatMap(indexedReferences),
        this.#indexItems,
        () => true,
      ),
      references: this.#model.references,
    };
    const rendered = serializeNode(model, this.#source);
    if (this.#profile === "entries") return fromEntriesProfile(rendered);
    return this.#entries
      ? rendered
          .replace(
            /^<!-- project-harness-local:(start|end) -->$/gm,
            "<!-- project-memory-entries:$1 -->",
          )
          .replace(
            /^<!-- project-memory-local:(start|end) -->$/gm,
            "<!-- project-memory-entries:$1 -->",
          )
      : rendered;
  }
}
