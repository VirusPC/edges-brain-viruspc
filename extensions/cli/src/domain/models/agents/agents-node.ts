import path, { relative, dirname } from "node:path";
import {
  InternalNode,
  type InternalChildLists,
  type InternalCreateInput,
} from "../core/internal-node.js";
import { InternalSyntax, type SyntaxContent, type SyntaxReference } from "./syntax.js";
import { validateChild } from "../core/relations.js";
import {
  resolveEntryHref,
  identifyNodeType,
  isHarnessMaterial,
} from "../layout.js";
import type { NodeReference } from "../core/types.js";
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

export interface AgentsCreateInput extends InternalCreateInput {
  constraints?: readonly string[];
}

export interface AgentsUpdateInput extends AgentsCreateInput {}

export interface AgentsContent {
  readonly constraints: readonly string[];
  readonly localChildren: readonly Readonly<NodeReference>[];
  readonly descendantChildren: readonly Readonly<NodeReference>[];
}

export class AgentsNode extends InternalNode<
  AgentsCreateInput,
  AgentsUpdateInput
> {
  override readonly type = "agents";
  #constraints: string[] = [];
  #compose: ComposeRecord[] = [];
  #syntax = new InternalSyntax("");
  #hrefs = new Map<string, string>();
  get content(): AgentsContent {
    const lists = this.childLists();
    return {
      constraints: [...this.#constraints],
      localChildren: lists.localChildren,
      descendantChildren: lists.descendantChildren,
    };
  }
  get constraints(): readonly string[] {
    return [...this.#constraints];
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
    this.#constraints = next.constraints;
    this.installChildLists(next);
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
  #indexed(): Content {
    const lists = this.childLists();
    return {
      constraints: [...this.#constraints],
      localChildren: lists.localChildren,
      descendantChildren: lists.descendantChildren,
    };
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
    return this.#syntax.serialize(this.#syntaxContent(this.#indexed()));
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
  #commitAll(next: Content): this {
    this.#validateContent(next);
    this.#syntax.serialize(this.#syntaxContent(next));
    super.commitChildLists(next);
    this.#constraints = [...next.constraints];
    return this;
  }
  protected override commitChildLists(next: InternalChildLists): void {
    this.#commitAll({ constraints: [...this.#constraints], ...next });
  }
  override validate(): void {
    super.validate();
    this.#validateContent(this.#indexed());
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
    this.#syntax.serialize(this.#syntaxContent(this.#indexed()));
    return this;
  }
  unregisterCompose(name: string): this {
    const trimmed = name.trim();
    if (!trimmed)
      throw new Error(`${this.path}: compose entry name is required`);
    if (!this.#compose.some((entry) => entry.name === trimmed))
      throw new Error(`${this.path}: compose entry not found: ${trimmed}`);
    this.#compose = this.#compose.filter((entry) => entry.name !== trimmed);
    this.#syntax.serialize(this.#syntaxContent(this.#indexed()));
    return this;
  }
  protected override structureConflictError(): string {
    return `${this.path}: body conflicts with structured Internal sections.`;
  }
  protected override bodyConflictsWithStructure(input: AgentsCreateInput): boolean {
    return (
      input.body !== undefined &&
      (input.constraints !== undefined ||
        input.localChildren !== undefined ||
        input.descendantChildren !== undefined)
    );
  }
  protected override applyStructure(input: AgentsCreateInput): void {
    const current = this.childLists();
    this.#commitAll({
      constraints: [...(input.constraints ?? this.#constraints)],
      localChildren: [...(input.localChildren ?? current.localChildren)],
      descendantChildren: [
        ...(input.descendantChildren ?? current.descendantChildren),
      ],
    });
  }
  setConstraints(items: readonly string[]): this {
    const lists = this.childLists();
    return this.#commitAll({ ...lists, constraints: [...items] });
  }
}
