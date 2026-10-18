import { basename, dirname, join } from "node:path";
import { BaseNode } from "../core/base-node.js";
import { ENTRY_NAMES, normalizeNodeType } from "../models/layout.js";
import type { NodeReference } from "../core/types.js";
import { validateChild } from "../core/relations.js";

export interface ScopeTraversalOptions {
  /** When true, expand only localChildren. Default false: local ∪ descendants. */
  localOnly?: boolean;
  includeHarness?: boolean;
  /** Explicit `--super`: root traversal at a runtime SuperAgentsNode. */
  super?: boolean;
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

function expandedChildren(
  node: BaseNode,
  options: ScopeTraversalOptions,
): readonly NodeReference[] {
  const structural = options.localOnly
    ? (node.localChildren ?? node.children)
    : node.children;
  // The Compose block belongs to the current layer, so localOnly still follows it.
  return [...structural, ...(node.composeChildren ?? [])];
}

/** True when the reference is only a Compose edge, not a structural child. */
export function isComposeOnlyReference(
  parent: BaseNode,
  reference: NodeReference,
): boolean {
  const compose = parent.composeChildren;
  if (!compose?.some((item) => item.id === reference.id)) return false;
  return !parent.children.some((item) => item.id === reference.id);
}

export interface NodeQueryOptions extends ScopeTraversalOptions {
  types?: readonly string[];
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
  async function* visit(node: BaseNode): AsyncGenerator<BaseNode> {
    if (active.has(node.path))
      throw new Error(`Composition cycle: ${node.path}`);
    if (seen.has(node.path)) return;
    seen.add(node.path);
    active.add(node.path);
    try {
      if (!options.types || options.types.map(normalizeNodeType).includes(node.type)) yield node;
      const harness = options.includeHarness ? node.harness : undefined;
      for (const reference of [
        ...expandedChildren(node, options),
        ...(harness ? [harness] : []),
      ]) {
        validateChild(reference);
        const target = resolve(node, reference);
        if (target === undefined) continue;
        if (active.has(target)) {
          // README harness → AGENTS is a dual link, not a composition cycle.
          if (reference === harness) continue;
          throw new Error(`Composition cycle: ${target}`);
        }
        if (!seen.has(target))
          yield* visit(await load(node, reference, target));
      }
    } finally {
      active.delete(node.path);
    }
  }
  for (const root of roots instanceof BaseNode ? [roots] : roots)
    yield* visit(root);
}
