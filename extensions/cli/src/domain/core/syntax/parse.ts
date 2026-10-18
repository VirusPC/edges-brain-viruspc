import type { AgentsDocument, SectionKey, AgentsItem, AgentsLink } from "./document.js";
import type { BlockGrammar } from "./grammar.js";
import { escapeRegExp } from "./blocks.js";
import type { Nodes as AstNode } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { parseDocument } from "../../../utils/markdown/document.js";

type Binding = {
  start: number;
  end: number;
  prefix: string;
  protected: boolean;
};

function start(node: AstNode): number {
  return node.position?.start.offset ?? 0;
}

function end(node: AstNode): number {
  return node.position?.end.offset ?? 0;
}

/** Private codec representation: source ranges never enter AgentsDocument. */
export function decodeBody(source: string, grammar: BlockGrammar) {
  const markerPattern = new RegExp(
    `^<!-- (${Object.keys(grammar.markers).map(escapeRegExp).join("|")}):(start|end) -->$`,
  );
  const ast = fromMarkdown(source);
  const model: AgentsDocument = { constraints: [], memory: [], children: [], compose: [], references: [] };

  const bindings: Record<SectionKey, Binding[]> = {
    constraints: [],
    memory: [],
    children: [],
    compose: [],
  };

  const sections: Record<SectionKey, { present: boolean; insert: number }> = {
    constraints: { present: false, insert: source.length },
    memory: { present: false, insert: source.length },
    children: { present: false, insert: source.length },
    compose: { present: false, insert: source.length },
  };

  const references: Binding[] = [];

  const definitions = new Map<string, string>();

  const pending: AstNode[] = [ast];
  while (pending.length) {
    const node = pending.pop();
    if (!node) continue;
    if (node.type === "definition" && !definitions.has(node.identifier))
      definitions.set(node.identifier, node.url);
    if ("children" in node)
      for (let i = node.children.length - 1; i >= 0; i--)
        pending.push(node.children[i]);
  }

  function text(node: AstNode): string {
    if ("value" in node) return node.value;
    if ("children" in node) return node.children.map(text).join("");
    return node.type === "break" ? "\n" : "";
  }

  function link(node: AstNode): AgentsLink | undefined {
    const target =
      node.type === "link"
        ? node.url
        : node.type === "linkReference"
          ? definitions.get(node.identifier)
          : undefined;
    return target === undefined
      ? undefined
      : { kind: "link", label: text(node), target };
  }

  function runs(node: AstNode): AgentsItem["content"] {
    const value = link(node);
    if (value) return [value];
    if (node.type === "text" || node.type === "inlineCode")
      return [{ kind: "text", value: node.value }];
    if (node.type === "break") return [{ kind: "text", value: "\n" }];
    if (!("children" in node)) return [];

    const result: AgentsItem["content"] = [];
    for (const child of node.children)
      for (const run of runs(child)) {
        const last = result.at(-1);
        if (last?.kind === "text" && run.kind === "text")
          last.value += run.value;
        else result.push(run);
      }
    return result;
  }

  function unsupported(node: AstNode): boolean {
    if (["image", "imageReference", "html", "code"].includes(node.type))
      return true;
    return "children" in node && node.children.some(unsupported);
  }

  function ordinaryReferences(node: AstNode): void {
    const value = link(node);
    if (value) {
      model.references.push(value);
      references.push({
        start: start(node),
        end: end(node),
        prefix: "",
        protected: unsupported(node),
      });
      return;
    }
    if ("children" in node) node.children.forEach(ordinaryReferences);
  }

  function item(node: AstNode, section: SectionKey): void {
    const content = runs(node);
    if (!content.length) return;
    const list = node.type === "listItem";
    const paragraph =
      list &&
      node.children.length === 1 &&
      node.children[0].type === "paragraph"
        ? node.children[0]
        : undefined;
    model[section].push({ content });
    bindings[section].push({
      start: start(node),
      end: end(node),
      prefix: paragraph
        ? source.slice(start(node), start(paragraph))
        : node.type === "heading" && node.children.length
          ? source.slice(start(node), start(node.children[0]))
          : "",
      protected:
        unsupported(node) || (list && !paragraph) || node.type === "blockquote",
    });
  }

  let active: SectionKey | undefined;

  let marked: SectionKey | undefined;
  let headingDepth = 0;
  let outsideInsert = 0;
  let unsafe = false;
  let appendAt = source.length;

  function close(offset: number): void {
    if (active) sections[active].insert = offset;
    active = undefined;
    headingDepth = 0;
  }

  function open(section: SectionKey): void {
    if (sections[section].present) unsafe = true;
    sections[section].present = true;
    active = section;
  }

  for (const block of ast.children) {
    if (!active) outsideInsert = start(block);
    if (block.type === "html") {
      const marker = block.value
        .trim()
        .match(markerPattern);
      if (marker) {
        const section = grammar.markers[marker[1]];
        if (marker[2] === "start") {
          if (marked) unsafe = true;
          close(start(block));
          open(section);
          marked = section;
        } else {
          if (marked !== section) unsafe = true;
          close(start(block));
          marked = undefined;
        }
        if (!active) outsideInsert = end(block);
        continue;
      }
      if (grammar.outerEnds.includes(block.value.trim())) {
        appendAt = start(block);
        if (!marked) close(start(block));
      }
      if (!active) outsideInsert = end(block);
      continue;
    }
    if (block.type === "heading") {
      let isSectionHeading = false;
      if (!marked) {
        if (active && block.depth <= headingDepth) close(start(block));
        const section = grammar.headings[text(block)];
        if (section) {
          if (active) close(start(block));
          open(section);
          headingDepth = block.depth;
          isSectionHeading = true;
        }
      }
      if (!active) ordinaryReferences(block);
      else if (
        !isSectionHeading &&
        runs(block).some((run) => run.kind === "link")
      )
        item(block, active);
      if (!active) outsideInsert = end(block);
      continue;
    }
    if (!active) ordinaryReferences(block);
    else if (block.type === "list") {
      for (const child of block.children) item(child, active);
    } else if (block.type === "paragraph" || block.type === "blockquote")
      item(block, active);
    if (!active) outsideInsert = end(block);
  }
  if (marked) unsafe = true;
  const referencesInsert = active ? outsideInsert : source.length;
  close(source.length);
  return {
    model,
    bindings,
    references,
    sections,
    unsafe,
    appendAt,
    referencesInsert,
  };
}

export function parseNode(source: string, grammar: BlockGrammar): AgentsDocument {
  const document = parseDocument(source);
  const model = decodeBody(document.body, grammar).model;
  if (document.metadata !== undefined) model.metadata = document.metadata;
  return model;
}
