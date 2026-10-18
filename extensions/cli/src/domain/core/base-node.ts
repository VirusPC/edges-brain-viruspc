import { dirname, isAbsolute, normalize } from "node:path";
import { parseDocument, serializeDocument } from "../../utils/markdown/document.js";
import { nodeRelations, nodePath } from "./relations.js";
import type { ChildGroup, Metadata, NodeReference, NodeCreateInput, NodeUpdateInput, NodeContext } from "./types.js";

/**
 * Extension contract: subclasses support construction with only an absolute path.
 * Body hooks must round-trip their serialized representation: parsing a value
 * returned by serializeBody() and serializing again must preserve that value.
 * Lifecycle drafts use that inverse pair to copy subclass-owned body state.
 */
export class BaseNode<
  CreateInput extends NodeCreateInput = NodeCreateInput,
  UpdateInput extends NodeUpdateInput = NodeUpdateInput,
> implements NodeReference {
  // #region Identity and path
  readonly type: string = "base";
  readonly #initialPath: string;
  get path(): string {
    return nodePath(this) ?? this.#initialPath;
  }
  get directoryPath(): string {
    return dirname(this.path);
  }
  get id(): string {
    return this.path;
  }
  // #endregion

  // #region Metadata
  #metadata: Metadata | undefined;
  get name(): string | undefined {
    return this.#metadata?.name as string | undefined;
  }
  set name(value: string | undefined) {
    if (value === undefined) this.removeMetadata("name");
    else this.setMetadata("name", value);
  }
  get description(): string | undefined {
    return this.#metadata?.description as string | undefined;
  }
  set description(value: string | undefined) {
    if (value === undefined) this.removeMetadata("description");
    else this.setMetadata("description", value);
  }
  get metadata(): Readonly<Metadata> | undefined {
    return structuredClone(this.#metadata);
  }
  // #endregion

  // #region Body
  #body = "";
  get body(): string {
    return this.serializeBody();
  }
  set body(markdown: string) {
    this.parseBody(markdown);
  }
  // #endregion

  // #region Relations
  get parent(): Readonly<NodeReference> | undefined {
    return nodeRelations(this).parent;
  }
  get harness(): Readonly<NodeReference> | undefined {
    return nodeRelations(this).harness;
  }
  // #endregion

  // #region Composition
  /** Present only on nodes that own composition; undefined means no composition fields. */
  get localChildren(): readonly Readonly<NodeReference>[] | undefined {
    return undefined;
  }
  get descendantChildren(): readonly Readonly<NodeReference>[] | undefined {
    return undefined;
  }
  get children(): readonly Readonly<NodeReference>[] {
    return [];
  }
  /** One edge to a ComposeNode. Undefined when this node has no composed repositories. */
  get compose(): Readonly<NodeReference> | undefined {
    return undefined;
  }
  get isLeaf(): boolean {
    return this.localChildren === undefined && this.children.length === 0;
  }
  // #endregion

  constructor(path: string) {
    if (!isAbsolute(path)) throw new Error("Node path must be absolute.");
    this.#initialPath = normalize(path);
  }

  // #region Parse and serialize
  parse(markdown: string): this {
    try {
      const document = parseDocument(markdown);
      this.validateMetadata(document.metadata);
      this.parseBody(document.body);
      this.#metadata = structuredClone(document.metadata);
      return this;
    } catch (cause) {
      throw new Error(
        `${this.path}: ${cause instanceof Error ? cause.message : String(cause)}`,
        { cause },
      );
    }
  }
  serialize(): string {
    return serializeDocument({
      metadata: this.#metadata,
      body: this.serializeBody(),
    });
  }
  protected parseBody(markdown: string): void {
    this.#body = markdown;
  }
  protected serializeBody(): string {
    return this.#body;
  }
  // #endregion

  // #region Metadata methods
  protected validateMetadata(metadata: Metadata | undefined): void {
    if (
      metadata !== undefined &&
      (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    )
      throw new Error(`${this.path}: metadata must be a mapping.`);
    for (const field of ["name", "description"])
      if (
        metadata?.[field] !== undefined &&
        typeof metadata[field] !== "string"
      )
        throw new Error(`${this.path}: ${field} must be a string.`);
  }
  setMetadata(key: string, value: unknown): void {
    const next = { ...this.#metadata, [key]: structuredClone(value) };
    this.validateMetadata(next);
    this.#metadata = next;
  }
  removeMetadata(key: string): void {
    if (this.#metadata === undefined) return;
    const next = { ...this.#metadata };
    delete next[key];
    this.validateMetadata(next);
    this.#metadata = next;
  }
  // #endregion

  // #region Composition methods
  /** InternalNode implements index editing. Other nodes own no composition. */
  addChild(_group: ChildGroup, _reference: NodeReference): this {
    throw new Error(`${this.path}: node does not own composition; cannot add child.`);
  }
  // #endregion

  // #region Lifecycle
  protected applyInput(input: NodeCreateInput): void {
    if (input.metadata !== undefined) {
      this.validateMetadata(input.metadata);
      this.#metadata = {
        ...this.#metadata,
        ...structuredClone(input.metadata),
      };
    }
    if ("name" in input) this.name = input.name;
    if ("description" in input) this.description = input.description;
    if (input.body !== undefined) this.body = input.body;
  }
  protected mutate(input: NodeCreateInput, fresh: boolean): this {
    const draft = new (this.constructor as new (path: string) => BaseNode)(
      this.path,
    );
    const originalBody = fresh ? undefined : this.serializeBody();
    if (!fresh) {
      draft.#metadata = structuredClone(this.#metadata);
      draft.parseBody(originalBody!);
    }
    draft.applyInput(input);
    draft.validate();
    const nextBody = draft.serializeBody();
    if (fresh || nextBody !== originalBody) this.parseBody(nextBody);
    this.#metadata = structuredClone(draft.#metadata);
    return this;
  }
  create(input: CreateInput, _context: NodeContext): this {
    return this.mutate(input, true);
  }
  update(input: UpdateInput, _context: NodeContext): this {
    return this.mutate(input, false);
  }
  destroy(_context: NodeContext): void {
    this.validate();
    // Physical deletion units and affected references are coordinated by Service.
  }
  validate(): void {
    this.validateMetadata(this.#metadata);
  }
  // #endregion
}
