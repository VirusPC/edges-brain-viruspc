import { isDeepStrictEqual } from "node:util";
import type { DocumentCodec } from "../../utils/markdown/types.js";
import { OUTER_END, OUTER_START } from "./blocks.js";
import type { AgentsDocument, AgentsItem } from "../core/syntax/document.js";
import type { BlockGrammar } from "../core/syntax/grammar.js";
import {
  decodeBody as readBody,
  parseNode as readNode,
} from "../core/syntax/parse.js";
import { serializeNode as writeNode } from "../core/syntax/serialize.js";

export type { AgentsDocument, AgentsItem, AgentsLink, SectionKey } from "../core/syntax/document.js";
export { agentsLinks, createAgentsDocument } from "../core/syntax/document.js";

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
      throw new Error("migration-required: run pnpm --filter edges-cli exec tsx ../../scripts/migrate-agents-indexes.mts --root /absolute/scope --write");
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
