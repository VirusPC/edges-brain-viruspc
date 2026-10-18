import path, { relative, dirname } from "node:path";
import { InternalNode, type InternalCreateInput } from "../core/internal-node.js";
import { InternalSyntax, type SyntaxContent, type SyntaxReference } from "./syntax.js";
import { validateChild } from "../core/relations.js";
import { resolveEntryHref, identifyNodeType, isHarnessMaterial } from "../layout.js";
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

export interface AgentsCreateInput extends InternalCreateInput {
  constraints?: readonly string[];
}
export interface AgentsUpdateInput extends AgentsCreateInput {}
export interface AgentsContent {
  readonly constraints: readonly string[];
  readonly localChildren: readonly Readonly<NodeReference>[];
  readonly descendantChildren: readonly Readonly<NodeReference>[];
}

export class AgentsNode extends InternalNode<AgentsCreateInput, AgentsUpdateInput> {
  override readonly type = "agents";
  #constraints: string[] = [];
  #compose: ComposeRecord[] = [];
  #syntax = new InternalSyntax("");
  #hrefs = new Map<string, string>();

  get content(): AgentsContent {
    return {
      constraints: [...this.#constraints],
      localChildren: this.localChildren,
      descendantChildren: this.descendantChildren,
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
      ...(entry.description === undefined ? {} : { description: entry.description }),
    }));
  }

  protected override parseBody(markdown: string): void {
    const syntax = new InternalSyntax(markdown, (href) => {
      const id = resolveEntryHref(this.path, href);
      return !!id && identifyNodeType(id) !== undefined;
    });
    const parsed = syntax.content();
    const hrefs = new Map<string, string>();
    const references = (entries: readonly SyntaxReference[]): NodeReference[] =>
      entries.flatMap((entry) => {
        const id = resolveEntryHref(this.path, entry.target);
        if (!id) return [];
        hrefs.set(id, entry.target);
        return [{
          id,
          ...(entry.label === undefined ? {} : { name: entry.label }),
          ...(entry.description === undefined ? {} : { description: entry.description }),
        }];
      });
    const compose = (parsed.compose ?? []).map((entry) => this.#composeRecord(entry));
    this.#validateCompose(compose);
    const previous = {
      constraints: this.#constraints,
      compose: this.#compose,
      syntax: this.#syntax,
      hrefs: this.#hrefs,
    };
    this.#constraints = [...parsed.constraints];
    this.#compose = compose;
    this.#syntax = syntax;
    this.#hrefs = hrefs;
    try {
      this.replace(references(parsed.localChildren), references(parsed.descendantChildren));
    } catch (error) {
      this.#constraints = previous.constraints;
      this.#compose = previous.compose;
      this.#syntax = previous.syntax;
      this.#hrefs = previous.hrefs;
      throw error;
    }
  }
  #composeRecord(entry: SyntaxReference): ComposeRecord {
    const name = entry.label?.trim() ?? "";
    if (!name) throw new Error(`${this.path}: compose entry name is required`);
    const directory = resolveComposeDirectory(this.path, entry.target);
    const fields = readComposeSuffix(entry.description);
    return { directory, href: entry.target, name, authored: entry.description, ...fields };
  }
  #composeSyntax(records: readonly ComposeRecord[]): SyntaxReference[] {
    return records.map((entry) => {
      const unchanged =
        entry.authored !== undefined &&
        sameComposeSuffix(entry.authored, entry.description, entry.remote);
      const description = unchanged ? entry.authored : writeComposeSuffix(entry.description, entry.remote);
      return {
        target: entry.href,
        label: entry.name,
        ...(description === undefined ? {} : { description }),
      };
    });
  }
  #links(items: readonly NodeReference[]): SyntaxReference[] {
    return items.map((ref) => ({
      target:
        this.#hrefs.get(ref.id) ??
        relative(dirname(this.path), ref.id).split("/").map((part) => encodeURIComponent(part)).join("/"),
      ...(ref.name === undefined ? {} : { label: ref.name }),
      ...(ref.description === undefined ? {} : { description: ref.description }),
    }));
  }
  #document(): SyntaxContent {
    return {
      constraints: this.#constraints,
      localChildren: this.#links(this.locals),
      descendantChildren: this.#links(this.descendants),
      compose: this.#composeSyntax(this.#compose),
    };
  }
  protected override serializeBody(): string {
    return this.#syntax.serialize(this.#document());
  }
  protected override sync(): void {
    for (const reference of [...this.locals, ...this.descendants]) {
      const childType = identifyNodeType(reference.id);
      if (childType === undefined || (childType === "readme" && !isHarnessMaterial(reference.id)))
        throw new Error(`${this.path}: child must identify a directory entry: ${reference.id}`);
    }
    if (this.#constraints.some((value) => typeof value !== "string"))
      throw new Error(`${this.path}: constraints must be strings.`);
    this.serializeBody();
  }
  #validateCompose(records: readonly ComposeRecord[]): void {
    const names = new Set<string>();
    const directories = new Set<string>();
    for (const entry of records) {
      if (!entry.name.trim()) throw new Error(`${this.path}: compose entry name is required`);
      if (entry.directory === dirname(this.path))
        throw new Error(`${this.path}: compose entry cannot target its own directory`);
      validateChild({ id: composeAgentsPath(entry.directory) });
      if (names.has(entry.name))
        throw new Error(`${this.path}: compose entry already registered: ${entry.name}`);
      if (directories.has(entry.directory))
        throw new Error(`${this.path}: compose directory already registered: ${entry.directory}`);
      names.add(entry.name);
      directories.add(entry.directory);
    }
  }
  #edit(apply: () => void): void {
    const constraints = this.#constraints;
    const compose = this.#compose;
    apply();
    try {
      this.sync();
    } catch (error) {
      this.#constraints = constraints;
      this.#compose = compose;
      throw error;
    }
  }
  override validate(): void {
    super.validate();
    this.#validateCompose(this.#compose);
  }
  registerCompose(input: { name: string; directory: string; href?: string; description?: string; remote?: string }): this {
    const name = input.name.trim();
    if (!name) throw new Error(`${this.path}: compose entry name is required`);
    const directory = path.resolve(input.directory);
    const relativeHref = relative(dirname(this.path), directory).split(path.sep).join("/");
    const href = input.href ?? (relativeHref || ".");
    const description = input.description?.trim() || undefined;
    const remote = input.remote?.trim() || undefined;
    const next = [...this.#compose.filter((entry) => entry.name !== name), { directory, href, name, description, remote }];
    this.#validateCompose(next);
    this.#edit(() => { this.#compose = next; });
    return this;
  }
  unregisterCompose(name: string): this {
    const trimmed = name.trim();
    if (!trimmed) throw new Error(`${this.path}: compose entry name is required`);
    if (!this.#compose.some((entry) => entry.name === trimmed))
      throw new Error(`${this.path}: compose entry not found: ${trimmed}`);
    this.#edit(() => { this.#compose = this.#compose.filter((entry) => entry.name !== trimmed); });
    return this;
  }
  protected override applyInput(input: AgentsCreateInput): void {
    if (
      input.body !== undefined &&
      (input.constraints !== undefined || input.localChildren !== undefined || input.descendantChildren !== undefined)
    )
      throw new Error(`${this.path}: body conflicts with structured sections.`);
    this.#edit(() => {
      if (input.constraints !== undefined) this.#constraints = [...input.constraints];
      super.applyInput(input);
    });
  }
  setConstraints(items: readonly string[]): this {
    this.#edit(() => { this.#constraints = [...items]; });
    return this;
  }
}
