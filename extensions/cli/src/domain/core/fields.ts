import type { BaseNode } from "./base-node.js";
import type { Metadata } from "./types.js";

export function domainFields(metadata: Readonly<Metadata> | undefined): Metadata {
  const value = metadata?.metadata;
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new Error('Domain metadata must be a mapping.');
  return value as Metadata;
}
export function scalar(value: unknown): string {
  return ['string', 'number', 'boolean'].includes(typeof value) ? String(value) : '';
}
export function setDomainField(node: BaseNode, key: string, value: unknown): void {
  const fields = { ...domainFields(node.metadata) };
  if (value === undefined) delete fields[key]; else fields[key] = value;
  node.setMetadata('metadata', fields);
}
