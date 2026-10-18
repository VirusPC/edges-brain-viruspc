import { basename, dirname, join } from "node:path";
import { BaseNode } from "../core/base-node.js";
import { ENTRY_NAMES } from "../config/layout.js";
import { normalizeNodeType } from "../models/node/layout.js";
import type { NodeReference } from "../core/types.js";
import { validateChild } from "../core/relations.js";

export interface ScopeTraversalOptions {
  /** When true, expand only localChildren. Default false: local ∪ descendants. */
  localOnly?: boolean;
  includeHarness?: boolean;
  /** Explicit `--super`: root traversal at a runtime SuperAgentsNode. */
  super?: boolean;
  /** Explicit `--with-composed`: pass through ComposeNode and yield external entry nodes. */
  withComposed?: boolean;
  /**
   * Forest assembly: do not descend into these absolute entry paths
   * (other system roots). Used outside traverse's single-system contract.
   */
  excludeRoots?: ReadonlySet<string>;
}
/** Same-directory README next to an AGENTS.md (content face). Not an AGENTS child. */
export function contentFaceReadme(node: BaseNode): NodeReference | undefined {
  if (node.type !== "agents") return undefined;
  if (basename(node.path) !== ENTRY_NAMES.internal) return undefined;
  return { id: join(dirname(node.path), ENTRY_NAMES.readme) };
}

function structuralChildren(
  node: BaseNode,
  options: ScopeTraversalOptions,
): readonly NodeReference[] {
  return options.localOnly ? (node.localChildren ?? node.children) : node.children;
}

export interface NodeQueryOptions extends ScopeTraversalOptions {
  types?: readonly string[];
}

/** Root `--super` / `--with-composed` as query options. */
export function scopeTraversal(flags: { super?: boolean; withComposed?: boolean } = {}): Pick<NodeQueryOptions, "super" | "withComposed"> {
  return {
    ...(flags.super ? { super: true } : {}),
    ...(flags.withComposed ? { withComposed: true } : {}),
  };
}

/** Preorder, demand-driven traversal; IO and directory contracts belong to the service. */
export async function* traverse(
  roots: BaseNode | Iterable<BaseNode>,
  options: NodeQueryOptions,
  resolve: (parent: BaseNode, reference: NodeReference) => string | undefined,
  load: (
    parent: BaseNode,
    reference: NodeReference,
    target: string,
  ) => Promise<BaseNode>,
): AsyncGenerator<BaseNode> {
  const seen = new Set<string>(),
    active = new Set<string>();
  const matches = (node: BaseNode) =>
    node.type !== "compose" &&
    (!options.types || options.types.map(normalizeNodeType).includes(node.type));

  async function* visit(node: BaseNode, stop: boolean): AsyncGenerator<BaseNode> {
    if (active.has(node.path))
      throw new Error(`Composition cycle: ${node.path}`);
    if (seen.has(node.path)) return;
    seen.add(node.path);
    active.add(node.path);
    try {
      if (matches(node)) yield node;
      if (stop) return;
      const harness = options.includeHarness ? node.harness : undefined;
      for (const reference of structuralChildren(node, options))
        yield* step(node, reference, harness, "expand");
      if (options.withComposed && node.compose)
        yield* step(node, node.compose, harness, "mount");
      if (harness) yield* step(node, harness, harness, "expand");
    } finally {
      active.delete(node.path);
    }
  }

  async function* step(
    parent: BaseNode,
    reference: NodeReference,
    harness: NodeReference | undefined,
    mode: "expand" | "mount" | "entry",
  ): AsyncGenerator<BaseNode> {
    validateChild(reference);
    const target = resolve(parent, reference);
    if (target === undefined) return;
    if (active.has(target)) {
      if (reference === harness) return;
      throw new Error(`Composition cycle: ${target}`);
    }
    if (seen.has(target)) return;
    const loaded = await load(parent, reference, target);
    if (mode === "mount") {
      if (active.has(loaded.path))
        throw new Error(`Composition cycle: ${loaded.path}`);
      if (seen.has(loaded.path)) return;
      seen.add(loaded.path);
      active.add(loaded.path);
      try {
        for (const child of loaded.children)
          yield* step(loaded, child, undefined, "entry");
      } finally {
        active.delete(loaded.path);
      }
      return;
    }
    yield* visit(loaded, mode === "entry");
  }

  for (const root of roots instanceof BaseNode ? [roots] : roots)
    yield* visit(root, false);
}
