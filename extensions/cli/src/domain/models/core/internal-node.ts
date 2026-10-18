import { referenceOf, validateChild, validateGroup } from "./relations.js";
import { BaseNode } from "./base-node.js";
import type {
  ChildGroup,
  NodeCreateInput,
  NodeReference,
  NodeUpdateInput,
} from "./types.js";

export interface InternalCreateInput extends NodeCreateInput {
  localChildren?: readonly NodeReference[];
  descendantChildren?: readonly NodeReference[];
}

export interface InternalChildLists {
  localChildren: NodeReference[];
  descendantChildren: NodeReference[];
}

const section = (group: ChildGroup) =>
  group === "local" ? "localChildren" : "descendantChildren";

/**
 * Shared composition indexes for entry nodes that own local and descendant children.
 * AgentsNode and ReadmeNode supply their own block format, parse, and serialize.
 */
export abstract class InternalNode<
  CreateInput extends InternalCreateInput = InternalCreateInput,
  UpdateInput extends NodeUpdateInput = NodeUpdateInput,
> extends BaseNode<CreateInput, UpdateInput> {
  // #region Composition
  #children: InternalChildLists = { localChildren: [], descendantChildren: [] };

  override get localChildren(): readonly Readonly<NodeReference>[] {
    return structuredClone(this.#children.localChildren);
  }
  override get descendantChildren(): readonly Readonly<NodeReference>[] {
    return structuredClone(this.#children.descendantChildren);
  }
  override get children(): readonly Readonly<NodeReference>[] {
    return [...this.localChildren, ...this.descendantChildren];
  }
  // #endregion

  // #region Composition methods
  protected childLists(): InternalChildLists {
    return {
      localChildren: structuredClone(this.#children.localChildren),
      descendantChildren: structuredClone(this.#children.descendantChildren),
    };
  }
  protected installChildLists(next: InternalChildLists): void {
    this.#children = {
      localChildren: next.localChildren.map(referenceOf),
      descendantChildren: next.descendantChildren.map(referenceOf),
    };
  }
  protected assertChildLists(next: InternalChildLists): void {
    const seen = new Set<string>();
    for (const reference of [
      ...next.localChildren,
      ...next.descendantChildren,
    ]) {
      validateChild(reference);
      if (seen.has(reference.id))
        throw new Error(this.duplicateSectionError(reference.id));
      seen.add(reference.id);
    }
  }
  /** Validate, let the subclass refresh its document, then store the lists. */
  protected commitChildLists(next: InternalChildLists): void {
    this.assertChildLists(next);
    this.installChildLists(next);
  }
  protected duplicateChildError(id: string): string {
    return `${this.path}: Child already indexed: ${id}`;
  }
  protected missingChildError(id: string): string {
    return `${this.path}: Child is not indexed: ${id}`;
  }
  protected duplicateSectionError(id: string): string {
    return `${this.path}: child already indexed in local/descendant sections: ${id}`;
  }
  protected structureConflictError(): string {
    return `${this.path}: body conflicts with structured sections.`;
  }
  protected bodyConflictsWithStructure(input: CreateInput): boolean {
    return (
      input.body !== undefined &&
      (input.localChildren !== undefined ||
        input.descendantChildren !== undefined)
    );
  }
  protected applyStructure(input: CreateInput): void {
    const current = this.childLists();
    this.commitChildLists({
      localChildren: [...(input.localChildren ?? current.localChildren)],
      descendantChildren: [
        ...(input.descendantChildren ?? current.descendantChildren),
      ],
    });
  }
  override addChild(group: ChildGroup, reference: NodeReference): this {
    validateGroup(group);
    validateChild(reference);
    if (this.children.some((child) => child.id === reference.id))
      throw new Error(this.duplicateChildError(reference.id));
    const next = this.childLists();
    next[section(group)].push(referenceOf(reference));
    this.commitChildLists(next);
    return this;
  }
  updateChild(
    id: string,
    patch: Partial<Pick<NodeReference, "name" | "description">>,
  ): this {
    if (!this.children.some((child) => child.id === id))
      throw new Error(this.missingChildError(id));
    const next = this.childLists();
    for (const group of ["localChildren", "descendantChildren"] as const)
      next[group] = next[group].map((child) =>
        child.id === id ? referenceOf({ ...child, ...patch, id }) : child,
      );
    this.commitChildLists(next);
    return this;
  }
  removeChild(id: string): this {
    const next = this.childLists();
    for (const group of ["localChildren", "descendantChildren"] as const)
      next[group] = next[group].filter((child) => child.id !== id);
    this.commitChildLists(next);
    return this;
  }
  moveChild(id: string, group: ChildGroup): this {
    validateGroup(group);
    const reference = this.children.find((child) => child.id === id);
    if (!reference) throw new Error(this.missingChildError(id));
    if (this.#children[section(group)].some((child) => child.id === id))
      return this;
    const next = this.childLists();
    for (const key of ["localChildren", "descendantChildren"] as const)
      next[key] = next[key].filter((child) => child.id !== id);
    next[section(group)].push(referenceOf(reference));
    this.commitChildLists(next);
    return this;
  }
  // #endregion

  protected override applyInput(input: CreateInput): void {
    if (this.bodyConflictsWithStructure(input))
      throw new Error(this.structureConflictError());
    super.applyInput(input);
    this.applyStructure(input);
  }
  override validate(): void {
    super.validate();
    this.assertChildLists(this.childLists());
  }
}
