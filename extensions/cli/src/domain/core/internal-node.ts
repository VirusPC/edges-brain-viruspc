import { referenceOf, validateChild, validateGroup } from "./relations.js";
import { BaseNode } from "./base-node.js";
import type { ChildGroup, NodeCreateInput, NodeReference, NodeUpdateInput } from "./types.js";

export interface InternalCreateInput extends NodeCreateInput {
  localChildren?: readonly NodeReference[];
  descendantChildren?: readonly NodeReference[];
}

function assertIndexed(path: string, lists: readonly (readonly NodeReference[])[]): void {
  const seen = new Set<string>();
  for (const reference of lists.flat()) {
    validateChild(reference);
    if (seen.has(reference.id))
      throw new Error(`${path}: child already indexed in local/descendant sections: ${reference.id}`);
    seen.add(reference.id);
  }
}

/** Local and descendant children shared by AgentsNode and ReadmeNode. */
export abstract class InternalNode<
  CreateInput extends InternalCreateInput = InternalCreateInput,
  UpdateInput extends NodeUpdateInput = NodeUpdateInput,
> extends BaseNode<CreateInput, UpdateInput> {
  protected locals: NodeReference[] = [];
  protected descendants: NodeReference[] = [];

  override get localChildren(): readonly Readonly<NodeReference>[] {
    return structuredClone(this.locals);
  }
  override get descendantChildren(): readonly Readonly<NodeReference>[] {
    return structuredClone(this.descendants);
  }
  override get children(): readonly Readonly<NodeReference>[] {
    return [...this.localChildren, ...this.descendantChildren];
  }

  /** Store children, then let the subclass rewrite its document. */
  protected replace(local: readonly NodeReference[], descendant: readonly NodeReference[]): void {
    const nextLocal = local.map(referenceOf);
    const nextDescendant = descendant.map(referenceOf);
    assertIndexed(this.path, [nextLocal, nextDescendant]);
    const previousLocal = this.locals;
    const previousDescendant = this.descendants;
    this.locals = nextLocal;
    this.descendants = nextDescendant;
    try {
      this.sync();
    } catch (error) {
      this.locals = previousLocal;
      this.descendants = previousDescendant;
      throw error;
    }
  }
  /** Rewrite the document from the current children. */
  protected sync(): void {
    this.serializeBody();
  }

  override addChild(group: ChildGroup, reference: NodeReference): this {
    validateGroup(group);
    validateChild(reference);
    if ([...this.locals, ...this.descendants].some((child) => child.id === reference.id))
      throw new Error(`${this.path}: Child already indexed: ${reference.id}`);
    const local = [...this.locals];
    const descendant = [...this.descendants];
    (group === "local" ? local : descendant).push(referenceOf(reference));
    this.replace(local, descendant);
    return this;
  }
  updateChild(id: string, patch: Partial<Pick<NodeReference, "name" | "description">>): this {
    if (![...this.locals, ...this.descendants].some((child) => child.id === id))
      throw new Error(`${this.path}: Child is not indexed: ${id}`);
    const apply = (list: readonly NodeReference[]) =>
      list.map((child) => (child.id === id ? referenceOf({ ...child, ...patch, id }) : child));
    this.replace(apply(this.locals), apply(this.descendants));
    return this;
  }
  removeChild(id: string): this {
    const omit = (list: readonly NodeReference[]) => list.filter((child) => child.id !== id);
    this.replace(omit(this.locals), omit(this.descendants));
    return this;
  }
  moveChild(id: string, group: ChildGroup): this {
    validateGroup(group);
    const reference = [...this.locals, ...this.descendants].find((child) => child.id === id);
    if (!reference) throw new Error(`${this.path}: Child is not indexed: ${id}`);
    if ((group === "local" ? this.locals : this.descendants).some((child) => child.id === id))
      return this;
    const local = this.locals.filter((child) => child.id !== id);
    const descendant = this.descendants.filter((child) => child.id !== id);
    (group === "local" ? local : descendant).push(reference);
    this.replace(local, descendant);
    return this;
  }

  protected override applyInput(input: CreateInput): void {
    if (
      input.body !== undefined &&
      (input.localChildren !== undefined || input.descendantChildren !== undefined)
    )
      throw new Error(`${this.path}: body conflicts with structured sections.`);
    super.applyInput(input);
    if (input.localChildren !== undefined || input.descendantChildren !== undefined)
      this.replace(input.localChildren ?? this.locals, input.descendantChildren ?? this.descendants);
  }
  override validate(): void {
    super.validate();
    assertIndexed(this.path, [this.locals, this.descendants]);
    this.sync();
  }
}
