import { dirname, relative } from "node:path";
import { BaseNode } from "../core/base-node.js";
import { InternalSyntax, type SyntaxReference } from "../agents/syntax.js";
import {
  referenceOf,
  validateChild,
  validateGroup,
} from "../core/relations.js";
import { identifyNodeType, resolveEntryHref } from "../layout.js";
import type {
  ChildGroup,
  NodeCreateInput,
  NodeReference,
} from "../core/types.js";

export interface ReadmeCreateInput extends NodeCreateInput {
  localChildren?: readonly NodeReference[];
  descendantChildren?: readonly NodeReference[];
}

interface Content {
  localChildren: NodeReference[];
  descendantChildren: NodeReference[];
}

const section = (group: ChildGroup) =>
  group === "local" ? "localChildren" : "descendantChildren";

/** README.md composition: project-entries-local / project-entries-descendants. */
export class ReadmeNode extends BaseNode<ReadmeCreateInput, ReadmeCreateInput> {
  override readonly type = "readme";
  #content: Content = { localChildren: [], descendantChildren: [] };
  #syntax = new InternalSyntax("", undefined, "entries");
  #hrefs = new Map<string, string>();

  get localChildren(): readonly Readonly<NodeReference>[] {
    return structuredClone(this.#content.localChildren);
  }
  get descendantChildren(): readonly Readonly<NodeReference>[] {
    return structuredClone(this.#content.descendantChildren);
  }
  override get children(): readonly Readonly<NodeReference>[] {
    return [...this.localChildren, ...this.descendantChildren];
  }

  protected override parseBody(markdown: string): void {
    const syntax = new InternalSyntax(
      markdown,
      (href) => {
        const id = resolveEntryHref(this.path, href, true);
        return !!id && identifyNodeType(id) !== undefined;
      },
      "entries",
    );
    const parsed = syntax.content();
    const hrefs = new Map<string, string>();
    const references = (entries: readonly SyntaxReference[]): NodeReference[] =>
      entries.flatMap((entry) => {
        const id = resolveEntryHref(this.path, entry.target, true);
        if (!id) return [];
        hrefs.set(id, entry.target);
        return [
          {
            id,
            ...(entry.label === undefined ? {} : { name: entry.label }),
            ...(entry.description === undefined
              ? {}
              : { description: entry.description }),
          },
        ];
      });
    const next = {
      localChildren: references(parsed.localChildren),
      descendantChildren: references(parsed.descendantChildren),
    };
    this.#validate(next);
    this.#content = next;
    this.#syntax = syntax;
    this.#hrefs = hrefs;
  }

  #refs(items: NodeReference[]): SyntaxReference[] {
    return items.map((ref) => ({
      target:
        this.#hrefs.get(ref.id) ??
        relative(dirname(this.path), ref.id)
          .split("/")
          .map((part) => encodeURIComponent(part))
          .join("/"),
      ...(ref.name === undefined ? {} : { label: ref.name }),
      ...(ref.description === undefined
        ? {}
        : { description: ref.description }),
    }));
  }

  protected override serializeBody(): string {
    return this.#syntax.serialize({
      constraints: [],
      localChildren: this.#refs(this.#content.localChildren),
      descendantChildren: this.#refs(this.#content.descendantChildren),
    });
  }

  #validate(content: Content): void {
    const seen = new Set<string>();
    for (const reference of [
      ...content.localChildren,
      ...content.descendantChildren,
    ]) {
      validateChild(reference);
      if (seen.has(reference.id))
        throw new Error(`${this.path}: child already listed: ${reference.id}`);
      seen.add(reference.id);
    }
  }

  protected override applyInput(input: ReadmeCreateInput): void {
    if (
      input.body !== undefined &&
      (input.localChildren !== undefined ||
        input.descendantChildren !== undefined)
    )
      throw new Error(`${this.path}: body conflicts with structured sections.`);
    super.applyInput(input);
    const next = {
      localChildren: (input.localChildren ?? this.#content.localChildren).map(
        referenceOf,
      ),
      descendantChildren: (
        input.descendantChildren ?? this.#content.descendantChildren
      ).map(referenceOf),
    };
    this.#validate(next);
    this.#content = next;
  }

  #replaceContent(next: Content): this {
    this.#validate(next);
    this.#syntax.serialize({
      constraints: [],
      localChildren: this.#refs(next.localChildren),
      descendantChildren: this.#refs(next.descendantChildren),
    });
    this.#content = next;
    return this;
  }

  addChild(group: ChildGroup, reference: NodeReference): this {
    validateGroup(group);
    validateChild(reference);
    if (this.children.some((child) => child.id === reference.id))
      throw new Error(`${this.path}: Child already listed: ${reference.id}`);
    const next = structuredClone(this.#content);
    next[section(group)].push(referenceOf(reference));
    return this.#replaceContent(next);
  }

  updateChild(
    id: string,
    patch: Partial<Pick<NodeReference, "name" | "description">>,
  ): this {
    if (!this.children.some((child) => child.id === id))
      throw new Error(`${this.path}: Child is not listed: ${id}`);
    const next = structuredClone(this.#content);
    for (const group of ["localChildren", "descendantChildren"] as const)
      next[group] = next[group].map((child) =>
        child.id === id ? referenceOf({ ...child, ...patch, id }) : child,
      );
    return this.#replaceContent(next);
  }

  removeChild(id: string): this {
    const next = structuredClone(this.#content);
    for (const group of ["localChildren", "descendantChildren"] as const)
      next[group] = next[group].filter((child) => child.id !== id);
    return this.#replaceContent(next);
  }

  moveChild(id: string, group: ChildGroup): this {
    validateGroup(group);
    const reference = this.children.find((child) => child.id === id);
    if (!reference) throw new Error(`${this.path}: Child is not listed: ${id}`);
    if (this.#content[section(group)].some((child) => child.id === id))
      return this;
    const next = structuredClone(this.#content);
    for (const key of ["localChildren", "descendantChildren"] as const)
      next[key] = next[key].filter((child) => child.id !== id);
    next[section(group)].push(reference);
    return this.#replaceContent(next);
  }

  override validate(): void {
    super.validate();
    this.#validate(this.#content);
    this.serializeBody();
  }
}
