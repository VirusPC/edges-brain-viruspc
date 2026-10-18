import { relative, dirname } from "node:path";
import { InternalNode, type InternalCreateInput } from "../../core/internal-node.js";
import { InternalSyntax, type SyntaxContent, type SyntaxReference } from "../node/document.js";
import { identifyNodeType, resolveEntryHref, isHarnessMaterial } from "../node/layout.js";
import type { NodeReference } from "../../core/types.js";
import { ComposeNode } from "../compose/compose-node.js";

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
  #composeNode: ComposeNode;
  #syntax = new InternalSyntax("");
  #hrefs = new Map<string, string>();

  constructor(file: string) {
    super(file);
    this.#composeNode = new ComposeNode(file);
    this.#composeNode.track(() => this.path);
  }

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
  composeNode(): ComposeNode {
    return this.#composeNode;
  }
  override get compose(): Readonly<NodeReference> | undefined {
    if (this.#composeNode.children.length === 0) return undefined;
    return { id: this.#composeNode.path, name: "组合" };
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
    const previousLinks = this.#composeNode.links();
    const previous = {
      constraints: this.#constraints,
      syntax: this.#syntax,
      hrefs: this.#hrefs,
    };
    this.#constraints = [...parsed.constraints];
    this.#syntax = syntax;
    this.#hrefs = hrefs;
    try {
      this.#composeNode.loadLinks(parsed.compose ?? []);
      this.replace(references(parsed.localChildren), references(parsed.descendantChildren));
    } catch (error) {
      this.#constraints = previous.constraints;
      this.#composeNode.loadLinks(previousLinks);
      this.#syntax = previous.syntax;
      this.#hrefs = previous.hrefs;
      throw error;
    }
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
      compose: this.#composeNode.links(),
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
  #edit(apply: () => void): void {
    const constraints = this.#constraints;
    apply();
    try {
      this.sync();
    } catch (error) {
      this.#constraints = constraints;
      throw error;
    }
  }
  override validate(): void {
    super.validate();
    this.#composeNode.check();
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
