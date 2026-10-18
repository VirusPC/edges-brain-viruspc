import { isAbsolute, normalize } from "node:path";
import type { BaseNode } from "./base-node.js";
import type { ChildGroup, NodeReference } from "./types.js";
type Relations = { parent?: NodeReference; harness?: NodeReference };
const relations = new WeakMap<BaseNode, Relations>();
const paths = new WeakMap<BaseNode, string>();
export function validateChild(reference: NodeReference): void {
  if (
    !reference ||
    typeof reference.id !== "string" ||
    !isAbsolute(reference.id) ||
    normalize(reference.id) !== reference.id ||
    /[\r\n]/.test(reference.id)
  )
    throw new Error(
      "Child id must be a normalized absolute path without line breaks.",
    );
  for (const key of ["name", "description"] as const)
    if (reference[key] !== undefined && typeof reference[key] !== "string")
      throw new Error(`Child ${key} must be a string.`);
}
export function validateGroup(group: ChildGroup): void {
  if (group !== "local" && group !== "descendant")
    throw new Error("Child group must be local or descendant.");
}
export function referenceOf(node: NodeReference): NodeReference {
  validateChild(node);
  return {
    id: node.id,
    ...(node.name === undefined ? {} : { name: node.name }),
    ...(node.description === undefined
      ? {}
      : { description: node.description }),
  };
}
/** Package-internal lifecycle coordination; not exported from the public model entrypoint. */
export function setNodeRelations(node: BaseNode, value: Relations): void {
  relations.set(node, {
    ...(value.parent ? { parent: referenceOf(value.parent) } : {}),
    ...(value.harness ? { harness: referenceOf(value.harness) } : {}),
  });
}
export function nodeRelations(node: BaseNode): Relations {
  return structuredClone(relations.get(node) ?? {});
}
export function setNodePath(node: BaseNode, path: string): void {
  validateChild({ id: path });
  paths.set(node, path);
}
export function nodePath(node: BaseNode): string | undefined {
  return paths.get(node);
}
