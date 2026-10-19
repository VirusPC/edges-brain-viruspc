import { isWithinPath, findAncestor, firstSymlink, canonicalPath } from '../../utils/filesystem.js';
import { isGitBoundary } from '../scope.js';
import { WRITE_LOCK_NAME, assertNoWriteLock } from "./node-lock.js";
import * as fs from "node:fs";
import path from "node:path";
import { BaseNode, AgentsNode, SuperAgentsNode } from "../../domain/models/index.js";
import type { ChildGroup, NodeReference } from "../../domain/models/index.js";
import type { ScopeTraversalOptions, NodeQueryOptions } from "../../domain/operations/traverse.js";
import { ENTRY_NAMES } from "../../domain/config/layout.js";
import {
  identifyNodeType,
  lifecycleUnits,
  assertMovableLayout,
  normalizeNodeType,
} from "../../domain/models/node/layout.js";
import { referenceOf, setNodePath } from "../../domain/core/relations.js";
import {
  checkPath,
  readEntry,
  saveEntries,
  validateEntry,
  type EntryFile,
  type FileChange,
} from "./node-files.js";
import {
  resourceSnapshot,
  validateResources,
  recoveryPath,
  type ResourceSnapshot,
} from "./node-resources.js";
import { isTasksBoardMaterial } from "../../domain/config/harness-materials.js";
import { createSuperAgentsNode } from "./super-root.js";
import {
  coLocated,
  carryReferenceSuffix,
  directoryEntries,
  indexContract,
  isComposite,
  modelAt,
  parseComposite,
  type CompositeNode,
  physicalParent,
  physicalParentNode,
  rewriteLinks,
  type Model,
} from "./node-layout.js";
import { query, type AsyncQuery } from "../../domain/operations/query.js";
import { traverse, contentFaceReadme } from "../../domain/operations/traverse.js";
import { NodeCache } from "./node-cache.js";

type Operation = "create" | "update" | "move" | "destroy" | "import";
export interface NodeWriteContext {
  operation: Operation;
  node: BaseNode;
  parent?: CompositeNode;
}
export interface NodeRegistrationOptions {
  indexGroup?: ChildGroup;
}
export interface NodeServiceOptions {
  managedRoot: string;
  models?: Readonly<Record<string, Model>>;
  readOnlyReference?: (
    parent: BaseNode,
    reference: NodeReference,
    target: string,
  ) => boolean;
  assertWrite?: (context: NodeWriteContext) => void | Promise<void>;
  modelForReference?: (
    parent: BaseNode,
    reference: NodeReference,
    target: string,
  ) => Model | undefined;
}
interface Planned {
  node: BaseNode;
  before?: EntryFile;
  source: string;
}
const clone = <T extends BaseNode>(node: T, file = node.path): T =>
  new (node.constructor as Model<T>)(file).parse(node.serialize());

/** Coordinates directory IO and indexes. References are discovery, not ownership. */
/** Parent registration follows the subject system. Paths inside `.harness` stay local. A nested AGENTS entry is a descendant system. */
function registrationGroup(parent: BaseNode, node: BaseNode): ChildGroup {
  const harness = path.join(parent.directoryPath, ".harness");
  if (node.path === harness || node.path.startsWith(harness + path.sep)) return "local";
  if (path.basename(node.path) === ENTRY_NAMES.internal && path.dirname(node.path) !== parent.directoryPath) return "descendant";
  return "local";
}

export class NodeService {
  readonly managedRoot: string;
  readonly #options: NodeServiceOptions;
  readonly #cache: NodeCache;
  readonly #navigationReadOnly = new WeakSet<BaseNode>();
  constructor(options: NodeServiceOptions) {
    if (!options?.managedRoot)
      throw new Error("NodeService requires an explicit managedRoot");
    this.managedRoot = canonicalPath(checkPath(options.managedRoot));
    this.#options = options;
    this.#cache = new NodeCache(this.managedRoot);
  }
  #boundary(file: string): string {
    file = canonicalPath(checkPath(file));
    if (!isWithinPath(file, this.managedRoot))
      throw new Error(`Node path escapes managedRoot: ${file}`);
    if (!identifyNodeType(file))
      throw new Error(`Unsupported node entry layout: ${file}`);
    return file;
  }
  #parentNode(file: string): CompositeNode | undefined {
    return physicalParentNode(file, this.managedRoot);
  }
  #model(file: string): Model | undefined {
    return modelAt(
      file,
      indexContract(this.#parentNode(file) ?? new BaseNode(file)),
      this.#options.models,
    );
  }
  async #read(
    file: string,
    Model?: Model,
    readOnly = false,
    resources = true,
  ): Promise<BaseNode | undefined> {
    file = path.resolve(file);
    // A case-insensitive filesystem can resolve different spellings to one
    // entry. Keep one cache identity, without resolving permitted read-only links.
    if (!firstSymlink(file)) file = canonicalPath(file);
    const cached = this.#cache.loaded.get(file);
    const Requested = Model;
    // Base requests constrain the authoritative model rather than downgrade it.
    Model = cached
      ? cached.constructor as Model
      : !Model || Model === BaseNode || path.basename(file) === ENTRY_NAMES.internal
        ? this.#model(file)
        : Model;
    if (!Model) return undefined;
    if (
      Requested &&
      !(Model.prototype instanceof Requested) &&
      Model !== Requested
    )
      throw new Error(`Incompatible node model for ${file}: ${Requested.name}`);
    const parent = this.#parentNode(file);
    readOnly ||=
      this.#cache.isReadOnly(file) ||
      (!!parent && indexContract(parent)?.writable === false);
    if (cached) {
      if (readOnly) this.#cache.markReadOnly(cached);
      if (resources) this.#cache.captureResources(cached);
      return cached;
    }
    const entry = readEntry(file, readOnly);
    if (!entry) return undefined;
    const node = new Model(entry.path).parse(entry.source);
    node.validate();
    this.#cache.remember(node, entry, readOnly, resources);
    return node;
  }
  /** Read an entry and its resource snapshot for lifecycle operations.
   * Also upgrades the same instance previously loaded through query(). */
  async get(file: string): Promise<BaseNode | undefined>;
  async get<T extends BaseNode>(
    file: string,
    Model: Model<T>,
  ): Promise<T | undefined>;
  async get(file: string, Model?: Model): Promise<BaseNode | undefined> {
    return this.#read(path.resolve(file), Model);
  }
  /** Per-edge policy must run even when traversal has already loaded the target. */
  #referenceReadOnly(parent: BaseNode, reference: NodeReference): boolean {
    const readonly =
      this.#cache.state.get(parent)?.readOnly === true ||
      this.#navigationReadOnly.has(parent) ||
      indexContract(parent)?.writable === false ||
      this.#options.readOnlyReference?.(parent, reference, reference.id) === true;
    const file = firstSymlink(reference.id) ? reference.id : canonicalPath(reference.id);
    const cached = this.#cache.loaded.get(file);
    if (readonly && cached) this.#cache.markReadOnly(cached);
    return readonly;
  }
  async #reference(
    parent: BaseNode,
    reference: NodeReference,
    readonly: boolean,
    types?: readonly string[],
    resources = true,
  ): Promise<BaseNode> {
    const file = firstSymlink(reference.id) ? reference.id : canonicalPath(reference.id);
    const explicit = this.#options.modelForReference?.(parent, reference, reference.id);
    const Model = explicit ?? modelAt(reference.id, indexContract(parent), this.#options.models);
    if (types && Model) {
      const navigation = new Model(reference.id);
      if (navigation.isLeaf && !types.map(normalizeNodeType).includes(navigation.type)) {
        // The directory contract proves this body cannot contribute children.
        // Keep layout-defined maintenance discovery even when its body is omitted.
        this.#cache.relations(navigation);
        if (readonly) {
          this.#navigationReadOnly.add(navigation);
          const cached = this.#cache.loaded.get(file);
          if (cached) this.#cache.markReadOnly(cached);
        }
        return navigation;
      }
    }
    // A layout-derived model is only a navigation hint; #read resolves the authoritative one.
    const node = await this.#read(file, explicit, readonly, resources);
    if (!node) throw new Error(`Missing referenced node: ${reference.id}`);
    return node;
  }
  /**
   * Runtime-only super entry. Mounts `.harness/README.md` when it exists;
   * otherwise flat harness-materials paths (empty allowed).
   */
  #superRoot(scopePath: string): SuperAgentsNode {
    return createSuperAgentsNode(scopePath);
  }
  /** Deferred, streaming reads with entry snapshots only. Before moving or
   * destroying a returned node, call get(node.path) to capture its resources. */
  query(scopePath: string, options: NodeQueryOptions = {}): AsyncQuery<BaseNode> {
    const service = this;
    return query(async function* () {
      const entry = path.basename(scopePath) === ENTRY_NAMES.internal
        ? path.resolve(scopePath) : path.join(path.resolve(scopePath), ENTRY_NAMES.internal);
      const root = options.super
        ? service.#superRoot(scopePath)
        : await service.#read(entry, AgentsNode, false, false);
      if (!root)
        throw new Error(
          `Missing scope entry: ${entry}. Add AGENTS.md or pass --super to traverse the content face (README) as a virtual system.`,
        );
      // resolve and load are sequential; carry this edge's policy into its one load.
      let readonly = false;
      yield* traverse(root, options, (parent, reference) => {
        if (options.excludeRoots?.has(reference.id)) return undefined;
        if (reference.id === parent.compose?.id) return reference.id;
        if (!fs.existsSync(reference.id)) return undefined;
        const composeEntry = parent.type === "compose";
        if (options.includeHarness && !composeEntry) {
          if (!isWithinPath(reference.id, service.managedRoot)) return undefined;
          // Symlinked mirrors (e.g. installed .agents/skills) are discovered through their real path.
          if (firstSymlink(reference.id, service.managedRoot)) return undefined;
          try {
            if (!isWithinPath(fs.realpathSync(reference.id), service.managedRoot)) return undefined;
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
        }
        readonly =
          !isWithinPath(reference.id, service.managedRoot) ||
          service.#referenceReadOnly(parent, reference);
        return reference.id;
      }, (parent, reference) => {
        if (reference.id === parent.compose?.id && parent instanceof AgentsNode)
          return Promise.resolve(parent.composeNode());
        return service.#reference(parent, reference, readonly, options.types, false);
      });
    });
  }
  /** Materialize query and capture lifecycle resource snapshots before resolving,
   * so later directory drift remains detectable. */
  async list(scopePath: string, options: ScopeTraversalOptions = {}): Promise<BaseNode[]> {
    const nodes = await this.query(scopePath, options).toArray().value();
    for (const node of nodes) this.#cache.captureResources(node);
    return nodes;
  }
  #existing(node: BaseNode, resources = false): EntryFile {
    const state = this.#cache.state.get(node);
    if (!state)
      throw new Error(
        `Node has no read snapshot; load before saving: ${node.path}`,
      );
    this.#boundary(node.path);
    if (
      state.readOnly ||
      this.#cache.isReadOnly(node.path) ||
      this.#cache.isReadOnly(state.file.realPath)
    )
      throw new Error(`Read-only node source: ${node.path}`);
    validateEntry(state.file);
    if (resources && !state.resources && node.directoryPath !== this.managedRoot)
      throw new Error(`Query has no resource snapshot; reload with get before moving or destroying: ${node.path}`);
    if (resources && state.resources) validateResources(state.resources);
    return state.file;
  }
  /** Reachable registered nodes plus explicitly loaded nodes, including maintenance trees.
   * list deliberately has a narrower traversal policy and never uses this helper.
   * Content faces are separate roots (not AGENTS child edges). */
  async #registered(deferred: (file: string) => boolean = () => false): Promise<Map<string, BaseNode>> {
    const result = new Map<string, BaseNode>();
    const root = await this.#read(
      path.join(this.managedRoot, ENTRY_NAMES.internal),
      AgentsNode,
    );
    const service = this;
    function* roots(): Iterable<BaseNode> {
      if (root) yield root;
      for (const [file, node] of [...service.#cache.loaded])
        if (isWithinPath(file, service.managedRoot) && fs.existsSync(file)) yield node;
    }
    const maintenanceOnly = (node: BaseNode, ref: NodeReference) =>
      node.harness?.id === ref.id && !node.children.some(child => child.id === ref.id);
    let readonly = false;
    const resolve = (parent: BaseNode, ref: NodeReference) => {
      if (ref.id === parent.compose?.id) return undefined;
      if (!isWithinPath(ref.id, this.managedRoot) || deferred(ref.id)) return undefined;
      // A symlink registration points elsewhere; it is not this node's index entry.
      if (firstSymlink(ref.id)) return undefined;
      // A missing target is an absent edge. Skip it; do not fail the command.
      if (!this.#cache.loaded.has(ref.id) && !fs.existsSync(ref.id)) return undefined;
      // Optional harness reads retain their existing #read policy.
      readonly = maintenanceOnly(parent, ref) ? false : this.#referenceReadOnly(parent, ref);
      return ref.id;
    };
    const load = async (parent: BaseNode, ref: NodeReference) => {
      if (maintenanceOnly(parent, ref)) {
        const harness = await this.#read(ref.id, AgentsNode);
        if (!harness) throw new Error(`Missing referenced node: ${ref.id}`);
        return harness;
      }
      return this.#reference(parent, ref, readonly);
    };
    const agentsFaces: BaseNode[] = [];
    for await (const node of traverse(roots(), { includeHarness: true }, resolve, load)) {
      result.set(node.path, node);
      if (contentFaceReadme(node)) agentsFaces.push(node);
    }
    // Walk each co-located README as its own root — virtual system two, not an AGENTS edge.
    for (const agents of agentsFaces) {
      const face = contentFaceReadme(agents);
      if (!face || result.has(face.id) || deferred(face.id) || !fs.existsSync(face.id)) continue;
      const readme = await this.#read(face.id);
      if (!readme) continue;
      for await (const node of traverse(readme, {}, resolve, load))
        result.set(node.path, node);
    }
    return result;
  }
  async #validateGraph(
    plan: Map<string, Planned>,
    removed: (file: string) => boolean = () => false,
  ): Promise<void> {
    function* roots(): Iterable<BaseNode> {
      for (const write of plan.values()) yield write.node;
    }
    let readonly = false;
    for await (const _node of traverse(
      roots(),
      {},
      (_parent, ref) => {
        if (ref.id === _parent.compose?.id) return undefined;
        if (removed(ref.id))
          throw new Error(`Reference to removed node: ${ref.id}`);
        // Leave symlink registrations in place; do not follow them as the node.
        if (firstSymlink(ref.id)) return undefined;
        // Pre-existing links to absent files (gitignored users/README, deleted entries)
        // are skipped. A reference this operation would newly persist still fails.
        if (!fs.existsSync(ref.id) && !plan.has(ref.id)) {
          if (this.#persistedReference(plan, _parent, ref.id)) return undefined;
          throw new Error(`Missing referenced node: ${ref.id}`);
        }
        readonly = this.#referenceReadOnly(_parent, ref);
        return ref.id;
      },
      (parent, ref, target) => {
        const proposed = plan.get(target);
        return proposed ? Promise.resolve(proposed.node) : this.#reference(parent, ref, readonly);
      },
    )) { /* Exhaust the graph before any write IO. */ }
  }
  /** True when `refId` is already on disk for `parent`, so a missing target is not this write's fault. */
  #persistedReference(
    plan: ReadonlyMap<string, Planned>,
    parent: BaseNode,
    refId: string,
  ): boolean {
    const planned = plan.get(parent.path);
    if (!planned) return true;
    if (!planned.before) return false;
    const disk = parseComposite(planned.before.path, planned.before.source);
    return disk.children.some((child) => child.id === refId);
  }
  #proposedParent(
    file: string,
    plan: ReadonlyMap<string, Planned>,
  ): CompositeNode | undefined {
    const parent = physicalParent(
      file,
      this.managedRoot,
      (candidate) => plan.has(candidate) || fs.existsSync(candidate),
      (candidate) => plan.get(candidate)?.source ?? readEntry(candidate)?.source,
    );
    if (!parent) return undefined;
    const proposed = plan.get(parent);
    if (proposed) return parseComposite(parent, proposed.source);
    const entry = readEntry(parent);
    return entry ? parseComposite(parent, entry.source) : undefined;
  }
  async #preflight(
    operation: Operation,
    plan: Map<string, Planned>,
  ): Promise<void> {
    for (const write of plan.values()) {
      this.#boundary(write.node.path);
      const parent = this.#proposedParent(write.node.path, plan);
      if (parent && indexContract(parent)?.writable === false)
        throw new Error(`Read-only destination contract: ${write.node.path}`);
      if (
        this.#cache.isReadOnly(write.node.path) ||
        (write.before && this.#cache.isReadOnly(write.before.path))
      )
        throw new Error(`Read-only node source: ${write.node.path}`);
      if (write.before) validateEntry(write.before);
      else if (this.#cache.loaded.has(write.node.path) || fs.existsSync(write.node.path))
        throw new Error(`Node target already exists: ${write.node.path}`);
      write.node.validate();
      await this.#options.assertWrite?.({
        operation,
        node: write.node,
        parent: this.#parentNode(write.node.path),
      });
    }
  }
  #plan(
    node: BaseNode,
    source = node.serialize(),
    before?: EntryFile,
  ): Planned {
    const draft = clone(node);
    draft.parse(source);
    draft.validate();
    // An explicit typed get cannot bypass authoritative AGENTS validation.
    const authoritative =
      path.basename(node.path) === ENTRY_NAMES.internal
        ? new AgentsNode(node.path).parse(source)
        : draft;
    return { node: authoritative, before, source };
  }
  async #save(
    operation: Operation,
    plan: Map<string, Planned>,
  ): Promise<void> {
    await this.#validateGraph(plan);
    await this.#preflight(operation, plan);
    saveEntries(
      [...plan.values()].map((w) => ({
        path: w.node.path,
        before: w.before,
        source: w.source,
      })),
    );
    this.#cache.refresh(undefined, undefined, new Set(plan.keys()));
  }
  async #registration(
    node: BaseNode,
    group?: ChildGroup,
  ): Promise<Planned | undefined> {
    // The tasks board file is placed from harness-materials. The tasks service
    // links a maintenance board; super mounts it and does not hang it here.
    if (isTasksBoardMaterial(node.path, this.managedRoot)) return undefined;
    // Same-dir README next to AGENTS is the content face, not registered as AGENTS' child.
    if (
      coLocated(node.path) ||
      path.basename(node.directoryPath) === ".harness" ||
      (path.basename(node.path) === ENTRY_NAMES.readme &&
        fs.existsSync(path.join(node.directoryPath, ENTRY_NAMES.internal)))
    )
      return undefined;
    const parentPath = physicalParent(node.path, this.managedRoot);
    if (!parentPath) return undefined;
    const parent = await this.get(parentPath);
    if (!isComposite(parent)) return undefined;
    if (indexContract(parent)?.writable === false)
      throw new Error(`Read-only node source: ${node.path}`);
    const before = this.#existing(parent),
      draft = clone(parent);
    if (draft.children.some((ref) => ref.id === node.id)) return undefined;
    const resolved = group === "local" || group === "descendant" ? group : registrationGroup(parent, node);
    draft.addChild(resolved, referenceOf(node));
    return this.#plan(draft, draft.serialize(), before);
  }
  async create<T extends BaseNode>(
    node: T,
    input: Parameters<T["create"]>[0],
    registrationOptions: NodeRegistrationOptions = {},
  ): Promise<T> {
    const file = this.#boundary(node.path);
    if (path.basename(node.path) === ENTRY_NAMES.internal && !(node instanceof AgentsNode))
      throw new Error(`AGENTS creation requires an AgentsNode model: ${node.path}`);
    if (this.#cache.loaded.has(file) || fs.existsSync(file))
      throw new Error(`Node target already exists: ${node.path}`);
    const draft = clone(node, file);
    draft.create(input, {
      operation: "create",
      parent: this.#parentNode(file),
    });
    draft.validate();
    const plan = new Map<string, Planned>([[draft.path, this.#plan(draft)]]);
    const registration = await this.#registration(draft, registrationOptions.indexGroup);
    if (registration) plan.set(registration.node.path, registration);
    await this.#save("create", plan);
    setNodePath(node, file);
    node.parse(draft.serialize());
    this.#cache.remember(node, readEntry(node.path)!);
    return node;
  }
  async update<T extends BaseNode>(
    node: T,
    input: Parameters<T["update"]>[0],
  ): Promise<T> {
    const before = this.#existing(node),
      draft = clone(node);
    draft.update(input, {
      operation: "update",
      parent: this.#parentNode(node.path),
    });
    draft.validate();
    await this.#save(
      "update",
      new Map([[node.path, this.#plan(draft, draft.serialize(), before)]]),
    );
    return node;
  }
  #unit(node: BaseNode): readonly string[] {
    const units = lifecycleUnits(node.path, coLocated(node.path));
    for (const unit of units) {
      checkPath(unit);
      if (unit === this.managedRoot || !isWithinPath(unit, this.managedRoot))
        throw new Error(`Cannot relocate or destroy managed root: ${unit}`);
      assertNoWriteLock(unit);
    }
    return units;
  }
  async move<T extends BaseNode>(node: T, destinationPath: string): Promise<T> {
    this.#existing(node, true);
    const destination = this.#boundary(destinationPath);
    if (node.path === destination) return node;
    assertMovableLayout(node.path, coLocated(node.path));
    const sourceRoot = this.#unit(node)[0]!,
      destRoot = path.dirname(destination);
    if (path.basename(node.path) !== path.basename(destination))
      throw new Error("Move cannot change entry layout");
    if (
      identifyNodeType(
        node.path,
        indexContract(this.#parentNode(node.path) ?? node),
      ) !==
      identifyNodeType(
        destination,
        indexContract(this.#parentNode(destination) ?? node),
      )
    )
      throw new Error("Move cannot change known business type");
    if (isWithinPath(destRoot, sourceRoot) || isWithinPath(sourceRoot, destRoot))
      throw new Error("Move cannot nest owned directories");
    if (fs.existsSync(destRoot))
      throw new Error(`Node destination already exists: ${destRoot}`);
    const relocate = (file: string) => {
      if (firstSymlink(file)) return file;
      // Resolve directory casing aliases before deciding whether the target moves.
      const source = canonicalPath(file);
      return isWithinPath(source, sourceRoot)
        ? path.join(destRoot, path.relative(sourceRoot, source))
        : file;
    };
    for (const file of this.#cache.loaded.keys())
      if (isWithinPath(file, destRoot))
        throw new Error(`Node destination already managed: ${file}`);
    // Pending references into the destination resolve against relocated drafts in #validateGraph.
    const registered = await this.#registered((file) => isWithinPath(file, destRoot));
    registered.set(node.path, node);
    for (const parentPath of [
      physicalParent(node.path, this.managedRoot),
      physicalParent(destination, this.managedRoot),
    ])
      if (parentPath && !registered.has(parentPath)) {
        const parent = await this.get(parentPath);
        if (isComposite(parent)) registered.set(parentPath, parent);
      }
    for (const file of directoryEntries(sourceRoot))
      if (!registered.has(file)) {
        const child = await this.#read(file);
        if (child) registered.set(file, child);
      }
    const oldParent = physicalParent(node.path, this.managedRoot),
      newParent = physicalParent(destination, this.managedRoot);
    let group: ChildGroup | undefined,
      reference: NodeReference = referenceOf(node);
    const old = oldParent
      ? (registered.get(oldParent) as CompositeNode | undefined)
      : undefined;
    if (old) {
      const match = old.children.find(
        (ref) => !firstSymlink(ref.id) && canonicalPath(ref.id) === node.path,
      );
      if (match) {
        reference = match;
        group = old.localChildren.some((ref) => ref.id === match.id)
          ? "local"
          : "descendant";
      }
    }
    const plan = new Map<string, Planned>();
    for (const entry of registered.values()) {
      const before = this.#cache.state.get(entry)!.file,
        target = relocate(entry.path);
      let draft = clone(entry);
      const currentSource = entry.serialize();
      let authored = currentSource;
      if (
        entry.path === oldParent &&
        oldParent !== newParent &&
        isComposite(draft)
      ) {
        draft.removeChild(reference.id);
        authored = draft.serialize();
      }
      let source = rewriteLinks(authored, entry.path, target, relocate);
      draft = clone(draft, target).parse(source);
      if (
        entry.path === newParent &&
        group !== undefined &&
        oldParent !== newParent &&
        isComposite(draft) &&
        !draft.children.some((ref) => ref.id === destination)
      ) {
        draft.addChild(group, { ...reference, id: destination });
        if (old) carryReferenceSuffix(old, draft, reference.id, destination);
        source = draft.serialize();
      }
      const text = source;
      // Baselines classify affected references only; output always uses current state.
      const persistedReferenceMoves =
        rewriteLinks(before.source, entry.path, target, relocate) !== before.source;
      const needsRegistration = group !== undefined && entry.path === newParent && oldParent !== newParent &&
        isComposite(entry) &&
        !parseComposite(entry.path, before.source).children.some(ref => ref.id === destination);
      if (target !== entry.path || text !== currentSource || persistedReferenceMoves || needsRegistration)
        plan.set(target, this.#plan(draft, text, before));
    }
    if (group !== undefined && newParent && !registered.has(newParent)) {
      const parent = (await this.get(newParent)) as CompositeNode,
        draft = clone(parent);
      draft.addChild(group, { ...reference, id: destination });
      if (old) carryReferenceSuffix(old, draft, reference.id, destination);
      plan.set(
        newParent,
        this.#plan(draft, draft.serialize(), this.#existing(parent)),
      );
    }
    // Destination snapshots still point at the source until the rename commits.
    await this.#validateGraph(plan, (file) => isWithinPath(file, sourceRoot));
    await this.#preflight("move", plan);
    for (const write of plan.values())
      if (write.before && isWithinPath(write.before.path, sourceRoot)) {
        const oldType = identifyNodeType(
          write.before.path,
          indexContract(this.#parentNode(write.before.path) ?? write.node),
        );
        const newType = identifyNodeType(
          write.node.path,
          indexContract(
            this.#proposedParent(write.node.path, plan) ?? write.node,
          ),
        );
        if (oldType !== newType)
          throw new Error(
            `Move cannot change known business type: ${write.before.path} (${oldType} -> ${newType})`,
          );
      }
    const snapshot = resourceSnapshot(sourceRoot);
    this.#existing(node, true);
    validateResources(snapshot);
    fs.mkdirSync(path.dirname(destRoot), { recursive: true });
    checkPath(destRoot);
    if (fs.existsSync(destRoot))
      throw new Error(`Node destination already exists: ${destRoot}`);
    fs.renameSync(sourceRoot, destRoot);
    try {
      const changes: FileChange[] = [...plan.values()].map((w) => ({
        path: w.node.path,
        before:
          w.before && isWithinPath(w.before.path, sourceRoot)
            ? {
                ...w.before,
                path: relocate(w.before.path),
                realPath: relocate(w.before.realPath),
                realDirectory: relocate(w.before.realDirectory),
              }
            : w.before,
        source: w.source,
      }));
      for (const write of plan.values())
        await this.#options.assertWrite?.({
          operation: "move",
          node: write.node,
          parent: this.#parentNode(write.node.path),
        });
      saveEntries(changes);
    } catch (cause) {
      try {
        validateResources({ ...snapshot, root: destRoot });
        if (fs.existsSync(sourceRoot)) throw new Error("Source recreated");
        fs.renameSync(destRoot, sourceRoot);
      } catch {
        throw new Error(
          `Node move failed; recover directory from ${destRoot}; affected ${sourceRoot}. ${String(cause)}`,
          { cause },
        );
      }
      throw new Error(
        `Node move failed; source restored at ${sourceRoot}. ${String(cause)}`,
        { cause },
      );
    }
    this.#cache.refresh(relocate, undefined, new Set(plan.keys()));
    return node;
  }
  async destroy(node: BaseNode): Promise<void> {
    this.#existing(node, true);
    node.destroy({ operation: "destroy", parent: this.#parentNode(node.path) });
    const units = this.#unit(node).filter((unit) => fs.existsSync(unit));
    const removed = (file: string) => units.some((unit) => isWithinPath(file, unit));
    const plan = new Map<string, Planned>();
    for (const entry of (await this.#registered()).values())
      if (!removed(entry.path) && isComposite(entry)) {
        const draft = clone(entry);
        const deleted = draft.children.filter((ref) => removed(ref.id));
        const before = this.#cache.state.get(entry)!.file;
        const persistedReferences = parseComposite(entry.path, before.source).children;
        if (deleted.length === 0 && !persistedReferences.some(ref => removed(ref.id))) continue;
        for (const ref of deleted) draft.removeChild(ref.id);
        plan.set(entry.path, this.#plan(draft, draft.serialize(), before));
      }
    await this.#validateGraph(plan, removed);
    // Registered discovery may have found a later read-only edge to this target.
    this.#existing(node, true);
    await this.#preflight("destroy", plan);
    await this.#options.assertWrite?.({
      operation: "destroy",
      node,
      parent: this.#parentNode(node.path),
    });
    const staged = units.map((unit) => ({
      unit,
      recovery: recoveryPath(unit),
      snapshot: fs.statSync(unit).isDirectory()
        ? resourceSnapshot(unit)
        : undefined,
      file: fs.statSync(unit).isFile() ? readEntry(unit) : undefined,
    }));
    for (const stage of staged) {
      const recoveryEntry = stage.file
        ? stage.recovery
        : path.join(stage.recovery, path.basename(node.path));
      await this.#options.assertWrite?.({
        operation: "destroy",
        node: clone(node, recoveryEntry),
        parent: this.#parentNode(node.path),
      });
    }
    this.#existing(node, true);
    for (const stage of staged) {
      if (stage.snapshot) validateResources(stage.snapshot);
      else validateEntry(stage.file!);
    }
    const moved: typeof staged = [];
    try {
      for (const stage of staged) {
        fs.renameSync(stage.unit, stage.recovery);
        moved.push(stage);
      }
      saveEntries(
        [...plan.values()].map((w) => ({
          path: w.node.path,
          before: w.before,
          source: w.source,
        })),
      );
    } catch (cause) {
      const remaining: string[] = [];
      for (const stage of moved.reverse())
        try {
          if (stage.snapshot)
            validateResources({ ...stage.snapshot, root: stage.recovery });
          else
            validateEntry({
              ...stage.file!,
              path: stage.recovery,
              realPath: stage.recovery,
            });
          if (fs.existsSync(stage.unit)) throw new Error("Source recreated");
          fs.renameSync(stage.recovery, stage.unit);
        } catch {
          remaining.push(stage.recovery);
        }
      throw new Error(
        `Node destroy failed: ${String(cause)}. Recovery locations: ${remaining.join(", ") || "(none; restored)"}`,
        { cause },
      );
    }
    for (const stage of staged)
      try {
        if (stage.snapshot)
          validateResources({ ...stage.snapshot, root: stage.recovery });
        else
          validateEntry({
            ...stage.file!,
            path: stage.recovery,
            realPath: stage.recovery,
          });
        fs.rmSync(stage.recovery, { recursive: true });
      } catch (cause) {
        this.#cache.refresh(
          undefined,
          removed,
          new Set([...plan.keys(), ...units]),
        );
        throw new Error(
          `Node deleted; cleanup incomplete; recovery remains at ${stage.recovery}`,
          { cause },
        );
      }
    this.#cache.refresh(
      undefined,
      removed,
      new Set([...plan.keys(), ...units]),
    );
  }
  async import(
    sourceEntry: string,
    destinationEntry: string,
    registrationOptions: NodeRegistrationOptions = {},
  ): Promise<BaseNode> {
    const source = checkPath(sourceEntry),
      destination = this.#boundary(destinationEntry),
      sourceRoot = path.dirname(source),
      destRoot = path.dirname(destination);
    if (
      !identifyNodeType(source) ||
      path.basename(source) !== path.basename(destination)
    )
      throw new Error("Import cannot change entry layout");
    if (isWithinPath(destRoot, sourceRoot) || isWithinPath(sourceRoot, destRoot))
      throw new Error("Import cannot nest source and destination");
    if (fs.existsSync(destRoot))
      throw new Error(`Node destination already exists: ${destRoot}`);
    const relocate = (file: string) =>
      isWithinPath(file, sourceRoot)
        ? path.join(destRoot, path.relative(sourceRoot, file))
        : file;
    const snapshot = resourceSnapshot(sourceRoot);
    for (const [relative, identity] of snapshot.entries)
      if (identity.includes(":link:"))
        throw new Error(
          `Import refuses symbolic links: ${path.join(sourceRoot, relative)}`,
        );
    const plan = new Map<string, Planned>();
    for (const file of directoryEntries(sourceRoot)) {
      const sourceParent = physicalParent(file, sourceRoot);
      const parentEntry = sourceParent ? readEntry(sourceParent) : undefined;
      const contract = parentEntry
        ? indexContract(parseComposite(parentEntry.path, parentEntry.source))
        : undefined;
      const Model = modelAt(
        relocate(file),
        contract ??
          indexContract(this.#parentNode(relocate(file)) ?? new BaseNode(file)),
        this.#options.models,
      )!;
      const entry = readEntry(file)!;
      const node = new Model(file).parse(entry.source);
      node.validate();
      const target = relocate(file),
        draft = new Model(target).parse(
          rewriteLinks(entry.source, file, target, relocate),
        );
      draft.validate();
      plan.set(target, this.#plan(draft));
    }
    const main = plan.get(destination);
    if (!main) throw new Error(`Missing source entry: ${source}`);
    const registration = await this.#registration(main.node, registrationOptions.indexGroup);
    if (registration) plan.set(registration.node.path, registration);
    await this.#validateGraph(plan);
    await this.#preflight("import", plan);
    validateResources(snapshot);
    fs.mkdirSync(path.dirname(destRoot), { recursive: true });
    checkPath(destRoot);
    fs.mkdirSync(destRoot);
    let copied: ResourceSnapshot | undefined;
    try {
      fs.cpSync(sourceRoot, destRoot, {
        filter: source => path.basename(source) !== WRITE_LOCK_NAME,
        recursive: true,
        errorOnExist: true,
        force: false,
      });
      copied = resourceSnapshot(destRoot);
      validateResources(snapshot);
      const changes = [...plan.values()].map((w) => ({
        path: w.node.path,
        before: isWithinPath(w.node.path, destRoot)
          ? readEntry(w.node.path)
          : w.before,
        source: w.source,
      }));
      saveEntries(changes);
    } catch (cause) {
      // Only remove the copied identity. Partial copies and intervening edits remain recoverable.
      try {
        if (!copied) throw new Error("Copy did not complete");
        validateResources(copied);
        fs.rmSync(destRoot, { recursive: true });
      } catch {
        throw new Error(
          `Import failed; recovery remains at ${destRoot}. ${String(cause)}`,
          { cause },
        );
      }
      throw cause;
    }
    this.#cache.refresh(undefined, undefined, new Set(plan.keys()));
    return (await this.#read(destination, main.node.constructor as Model))!;
  }
}
