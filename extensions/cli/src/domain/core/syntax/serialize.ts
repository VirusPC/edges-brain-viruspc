import type { AgentsDocument, SectionKey, AgentsLink, AgentsItem } from "./document.js";
import type { BlockGrammar } from "./grammar.js";
import { decodeBody } from "./parse.js";
import { isDeepStrictEqual as same } from "node:util";
import {
  parseDocument,
  serializeDocument,
} from "../../../utils/markdown/document.js";

const keys: SectionKey[] = ["constraints", "memory", "children", "compose"];

function renderedKeys(model: Pick<AgentsDocument, SectionKey>): SectionKey[] {
  return keys.filter((key) => key !== "compose" || model[key].length > 0);
}

const escape = (value: string): string =>
  value
    .replace(/[\\`*_[\]{}()#+!<>|&-]/g, "\\$&")
    .replace(/^(\d+)\./gm, "$1\\.");

function renderLink(value: AgentsLink): string {
  if (/[\r\n]/.test(value.target))
    throw new Error("Link targets cannot contain line breaks.");
  return `[${escape(value.label)}](<${value.target.replace(/[\\<>]/g, "\\$&")}>)`;
}

function renderItem(item: AgentsItem, prefix: string, newline: string): string {
  const content = item.content
    .map((run) => (run.kind === "link" ? renderLink(run) : escape(run.value)))
    .join("");
  return (
    prefix + content.replace(/\r?\n/g, newline + " ".repeat(prefix.length))
  );
}

function renderSection(
  key: SectionKey,
  items: AgentsItem[],
  newline: string,
  grammar: BlockGrammar,
): string {
  const { marker, heading: title } = grammar.sections[key];
  return [
    `<!-- ${marker}:start -->`,
    `## ${title}`,
    "",
    ...items.map((item) => renderItem(item, "- ", newline)),
    `<!-- ${marker}:end -->`,
    "",
  ].join(newline);
}

/** Pure serialization. Original source enables loss-preserving edits; no IO occurs here. */
function serializeBody(
  model: AgentsDocument,
  grammar: BlockGrammar,
  originalSource?: string,
): string {
  const newline = originalSource?.includes("\r\n") ? "\r\n" : "\n";
  if (originalSource === undefined) {
    const source = [
      grammar.outerStart,
      ...renderedKeys(model).map((key) =>
        renderSection(key, model[key], newline, grammar),
      ),
      grammar.outerEnd,
      "",
      ...model.references.map((ref) => `- ${renderLink(ref)}`),
      "",
    ].join(newline);
    if (!same(decodeBody(source, grammar).model, model))
      throw new Error(
        "Model cannot be represented losslessly as a node document.",
      );
    return source;
  }
  const original = decodeBody(originalSource, grammar);
  const originalText = originalSource;
  if (same(original.model, model)) return originalSource;
  if (original.unsafe)
    throw new Error("Cannot edit ambiguous or unclosed node sections.");

  const edits: { start: number; end: number; value: string; order: number }[] =
    [];

  const edit = (start: number, end: number, value: string) =>
    edits.push({ start, end, value, order: edits.length });
  for (const key of keys) {
    const previous = original.model[key];
    const next = model[key];
    const bindings = original.bindings[key];
    const used = new Set<number>();
    const matches = next.map((item) => {
      const found = previous.findIndex(
        (old, index) => !used.has(index) && same(old, item),
      );
      if (found >= 0) used.add(found);
      return found;
    });
    if (
      bindings.some((binding, index) => binding.protected && !used.has(index))
    ) {
      throw new Error(
        "Cannot replace unsupported content; preserve the original item.",
      );
    }

    function renderNext(index: number, prefix: string): string {
      const match = matches[index];
      return match >= 0
        ? originalText.slice(bindings[match].start, bindings[match].end)
        : next[index]
          ? renderItem(next[index], prefix, newline)
          : "";
    }
    for (let index = 0; index < previous.length; index++) {
      if (matches[index] === index) continue;
      const binding = bindings[index];
      const value = renderNext(index, binding.prefix);
      // A removed item takes its line break with it instead of leaving a blank line.
      const end =
        value === "" && originalText.startsWith(newline, binding.end)
          ? binding.end + newline.length
          : binding.end;
      edit(binding.start, end, value);
    }
    if (next.length > previous.length) {
      const extra = next.slice(previous.length);
      if (original.sections[key].present) {
        const offset = original.sections[key].insert;
        const before = originalText.slice(0, offset);
        // Continue an existing list directly; keep one blank line under a bare heading.
        const lead =
          before.endsWith(newline + newline) ||
          (previous.length > 0 && before.endsWith(newline))
            ? ""
            : newline;
        edit(
          offset,
          offset,
          lead +
            extra
              .map((_, index) => renderNext(previous.length + index, "- "))
              .join(newline) +
            newline,
        );
      } else {
        edit(
          original.appendAt,
          original.appendAt,
          newline + renderSection(key, extra, newline, grammar),
        );
      }
    }
  }
  for (let index = 0; index < original.model.references.length; index++) {
    if (same(original.model.references[index], model.references[index]))
      continue;
    const binding = original.references[index];
    if (binding.protected)
      throw new Error(
        "Cannot replace a reference containing unsupported content.",
      );
    edit(
      binding.start,
      binding.end,
      model.references[index] ? renderLink(model.references[index]) : "",
    );
  }
  if (model.references.length > original.model.references.length) {
    edit(
      original.referencesInsert,
      original.referencesInsert,
      newline +
        model.references
          .slice(original.model.references.length)
          .map((ref) => `- ${renderLink(ref)}`)
          .join(newline) +
        newline +
        newline,
    );
  }
  let source = originalSource;
  let boundary = source.length;
  for (const change of edits.sort(
    (a, b) => b.start - a.start || b.order - a.order,
  )) {
    if (change.end > boundary)
      throw new Error("Overlapping node edits cannot be serialized safely.");
    source =
      source.slice(0, change.start) + change.value + source.slice(change.end);
    boundary = change.start;
  }
  if (!same(decodeBody(source, grammar).model, model))
    throw new Error(
      "Model cannot be represented losslessly without changing surrounding content.",
    );
  return source;
}

export function serializeNode(
  model: AgentsDocument,
  originalSource: string | undefined,
  grammar: BlockGrammar,
): string {
  const { metadata, ...content } = model;
  const original =
    originalSource === undefined ? undefined : parseDocument(originalSource);
  const body = serializeBody(content, grammar, original?.body);
  return serializeDocument(
    metadata === undefined ? { body } : { metadata, body },
    originalSource,
  );
}

/** Display source fields as plain text inside one Markdown index row. */
export function escapeIndexText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\\`*_{}\[\]()<>!|]/g, "\\$&");
}

/** Encode source filenames so whitespace and Markdown cannot change link structure. */
export function encodeIndexPath(value: string): string {
  return value
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join("/");
}
