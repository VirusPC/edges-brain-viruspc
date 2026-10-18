import path, { relative, dirname } from "node:path";
import { BaseNode } from "../core/base-node.js";
import { InternalSyntax, type SyntaxContent, type SyntaxReference } from "./syntax.js";
import { referenceOf, validateChild, validateGroup } from "../core/relations.js";
import {
  resolveEntryHref,
  identifyNodeType,
  isHarnessMaterial,
} from "../layout.js";
import type { ChildGroup, NodeReference, NodeCreateInput } from "../core/types.js";
import {
  composeAgentsPath,
  readComposeSuffix,
  resolveComposeDirectory,
  sameComposeSuffix,
  toComposeEntry,
  writeComposeSuffix,
  type ComposeEntry,
  type ComposeRecord,
} from "./compose.js";

type Content = {
  -readonly [Key in keyof AgentsContent]: Array<AgentsContent[Key][number]>;
};

export interface AgentsCreateInput extends NodeCreateInput {
  constraints?: readonly string[];
  localChildren?: readonly NodeReference[];
  descendantChildren?: readonly NodeReference[];
}

export interface AgentsUpdateInput extends AgentsCreateInput {}

export interface AgentsContent {
  readonly constraints: readonly string[];
  readonly localChildren: readonly Readonly<NodeReference>[];
  readonly descendantChildren: readonly Readonly<NodeReference>[];
}

const section = (group: ChildGroup) =>
  group === "local" ? "localChildren" : "descendantChildren";

export class AgentsNode extends BaseNode<
  AgentsCreateInput,
  AgentsUpdateInput
> {
  override readonly type = "agents";
  #content: Content = {
    constraints: [],
    localChildren: [],
    descendantChildren: [],
  };
  #compose: ComposeRecord[] = [];
  #syntax = new InternalSyntax("");
  #hrefs = new Map<string, string>();
  get content(): AgentsContent {
    return structuredClone(this.#content);
  }
  get constraints(): readonly string[] {
    return [...this.#content.constraints];
  }
  get localChildren(): readonly Readonly<NodeReference>[] {
    return structuredClone(this.#content.localChildren);
  }
  get descendantChildren(): readonly Readonly<NodeReference>[] {
    return structuredClone(this.#content.descendantChildren);
  }
  override get children(): readonly Readonly<NodeReference>[] {
    return [...this.localChildren, ...this.descendantChildren];
  }
  get composeEntries(): readonly ComposeEntry[] {
    return this.#compose.map(toComposeEntry);
  }
  override get composeChildren(): readonly Readonly<NodeReference>[] {
    return this.composeEntries.map((entry) => ({
      id: entry.id,
      name: entry.name,
      ...(entry.description === undefined
        ? {}
        : { description: entry.description }),
    }));
  }
  protected override parseBody(markdown: string): void {
    const syntax = new InternalSyntax(markdown, (href) => {
        const id = resolveEntryHref(this.path, href);
        return !!id && identifyNodeType(id) !== undefined;
      }),
      parsed = syntax.content(),
      hrefs = new Map<string, string>();
    const references = (entries: readonly SyntaxReference[]): NodeReference[] =>
      entries.flatMap((entry) => {
        const id = resolveEntryHref(this.path, entry.target);
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
      constraints: [...parsed.constraints],
      localChildren: references(parsed.localChildren),
      descendantChildren: references(parsed.descendantChildren),
    };
    const compose = (parsed.compose ?? []).map((entry) =>
      this.#composeRecord(entry),
    );
    this.#validateContent(next);
    this.#validateCompose(compose);
    this.#content = next;
    this.#compose = compose;
    this.#syntax = syntax;
    this.#hrefs = hrefs;
  }
  #composeRecord(entry: SyntaxReference): ComposeRecord {
    const name = entry.label?.trim() ?? "";
    if (!name)
      throw new Error(`${this.path}: compose entry name is required`);
    const directory = resolveComposeDirectory(this.path, entry.target);
    const fields = readComposeSuffix(entry.description);
    return {
      directory,
      href: entry.target,
      name,
      authored: entry.description,
      ...fields,
    };
  }
  #composeSyntax(records: readonly ComposeRecord[]): SyntaxReference[] {
    return records.map((entry) => {
      const unchanged =
        entry.authored !== undefined &&
        sameComposeSuffix(entry.authored, entry.description, entry.remote);
      const description = unchanged
        ? entry.authored
        : writeComposeSuffix(entry.description, entry.remote);
      return {
        target: entry.href,
        label: entry.name,
        ...(description === undefined ? {} : { description }),
      };
    });
  }
  #syntaxContent(content: Content): SyntaxContent {
    const references = (items: NodeReference[]): SyntaxReference[] =>
      items.map((ref) => ({
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
    return {
      constraints: content.constraints,
      localChildren: references(content.localChildren),
      descendantChildren: references(content.descendantChildren),
      compose: this.#composeSyntax(this.#compose),
    };
  }
  protected override serializeBody(): string {
    return this.#syntax.serialize(this.#syntaxContent(this.#content));
  }
  #validateContent(content: Content): void {
    const seen = new Set<string>();
    for (const reference of [
      ...content.localChildren,
      ...content.descendantChildren,
    ]) {
      validateChild(reference);
      const childType = identifyNodeType(reference.id);
      if (
        childType === undefined ||
        (childType === "readme" && !isHarnessMaterial(reference.id))
      )
        throw new Error(
          `${this.path}: child must identify a directory entry: ${reference.id}`,
        );
      if (seen.has(reference.id))
        throw new Error(
          `${this.path}: child already indexed in local/descendant sections: ${reference.id}`,
        );
      seen.add(reference.id);
    }
    if (content.constraints.some((value) => typeof value !== "string"))
      throw new Error(`${this.path}: constraints must be strings.`);
  }
  #validateCompose(records: readonly ComposeRecord[]): void {
    const names = new Set<string>();
    const directories = new Set<string>();
    for (const entry of records) {
      if (!entry.name.trim())
        throw new Error(`${this.path}: compose entry name is required`);
      if (entry.directory === dirname(this.path))
        throw new Error(
          `${this.path}: compose entry cannot target its own directory`,
        );
      validateChild({ id: composeAgentsPath(entry.directory) });
      if (names.has(entry.name))
        throw new Error(
          `${this.path}: compose entry already registered: ${entry.name}`,
        );
      if (directories.has(entry.directory))
        throw new Error(
          `${this.path}: compose directory already registered: ${entry.directory}`,
        );
      names.add(entry.name);
      directories.add(entry.directory);
    }
  }
  #replaceContent(next: Content): this {
    this.#validateContent(next);
    this.#syntax.serialize(this.#syntaxContent(next));
    this.#content = next;
    return this;
  }
  override validate(): void {
    super.validate();
    this.#validateContent(this.#content);
    this.#validateCompose(this.#compose);
    this.serializeBody();
  }
  registerCompose(input: {
    name: string;
    directory: string;
    href?: string;
    description?: string;
    remote?: string;
  }): this {
    const name = input.name.trim();
    if (!name)
      throw new Error(`${this.path}: compose entry name is required`);
    const directory = path.resolve(input.directory);
    const relativeHref = relative(dirname(this.path), directory)
      .split(path.sep)
      .join("/");
    const href = input.href ?? (relativeHref || ".");
    const description = input.description?.trim() || undefined;
    const remote = input.remote?.trim() || undefined;
    const next = [
      ...this.#compose.filter((entry) => entry.name !== name),
      { directory, href, name, description, remote },
    ];
    this.#validateCompose(next);
    this.#compose = next;
    this.#syntax.serialize(this.#syntaxContent(this.#content));
    return this;
  }
  unregisterCompose(name: string): this {
    const trimmed = name.trim();
    if (!trimmed)
      throw new Error(`${this.path}: compose entry name is required`);
    if (!this.#compose.some((entry) => entry.name === trimmed))
      throw new Error(`${this.path}: compose entry not found: ${trimmed}`);
    this.#compose = this.#compose.filter((entry) => entry.name !== trimmed);
    this.#syntax.serialize(this.#syntaxContent(this.#content));
    return this;
  }
  protected override applyInput(input: AgentsCreateInput): void {
    const structured =
      input.constraints !== undefined ||
      input.localChildren !== undefined ||
      input.descendantChildren !== undefined;
    if (input.body !== undefined && structured)
      throw new Error(
        `${this.path}: body conflicts with structured Internal sections.`,
      );
    super.applyInput(input);
    this.#replaceContent({
      constraints: [...(input.constraints ?? this.#content.constraints)],
      localChildren: (input.localChildren ?? this.#content.localChildren).map(
        referenceOf,
      ),
      descendantChildren: (
        input.descendantChildren ?? this.#content.descendantChildren
      ).map(referenceOf),
    });
  }
  setConstraints(items: readonly string[]): this {
    return this.#replaceContent({ ...this.#content, constraints: [...items] });
  }
  addChild(group: ChildGroup, reference: NodeReference): this {
    validateGroup(group);
    validateChild(reference);
    if (this.children.some((child) => child.id === reference.id))
      throw new Error(`${this.path}: Child already indexed: ${reference.id}`);
    const next = structuredClone(this.#content);
    next[section(group)].push(referenceOf(reference));
    return this.#replaceContent(next);
  }
  updateChild(
    id: string,
    patch: Partial<Pick<NodeReference, "name" | "description">>,
  ): this {
    if (!this.children.some((child) => child.id === id))
      throw new Error(`${this.path}: Child is not indexed: ${id}`);
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
    if (!reference)
      throw new Error(`${this.path}: Child is not indexed: ${id}`);
    if (this.#content[section(group)].some((child) => child.id === id))
      return this;
    const next = structuredClone(this.#content);
    for (const key of ["localChildren", "descendantChildren"] as const)
      next[key] = next[key].filter((child) => child.id !== id);
    next[section(group)].push(reference);
    return this.#replaceContent(next);
  }
}
