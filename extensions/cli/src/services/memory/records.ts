import { existsSync } from "node:fs";
import { relative } from "node:path";
import { memoryNodes } from "./service.js";
import { resolveTarget } from "./paths.js";
import { resolveMemoryPath } from "./entries.js";

function slugOf(file: string, type: string, skill: boolean): string {
  if (skill) {
    const parts = file.split("/");
    return parts[parts.length - 2] ?? file;
  }
  const base = file.split("/").pop() ?? file;
  const prefix = `${type}_`;
  return base.startsWith(prefix) ? base.slice(prefix.length, -".md".length) : base.replace(/\.md$/, "");
}

export async function listMemoryEntries(
  targetDir: string | undefined,
  type?: string,
  mode: { all?: boolean; super?: boolean; withComposed?: boolean } = {},
) {
  const target = resolveTarget(targetDir ?? process.cwd());
  const { NodeService } = await import("../node/node-service.js");
  const { MemoryNode } = await import("../../domain/models/memory/memory-node.js");
  const { buildSystemForest } = await import("../node/system-forest-service.js");
  const { scopeTraversal } = await import("../../domain/operations/traverse.js");
  const nodes = mode.all
    ? (await buildSystemForest(target, { includeSuper: mode.super === true, withComposed: mode.withComposed === true, form: "independent" })).flat()
    : await new NodeService({ managedRoot: target })
      .query(target, { types: ["memory"], ...scopeTraversal(mode) })
      .value();
  const items = nodes.flatMap((node) => {
    if (!(node instanceof MemoryNode)) return [];
    const memoryType = node.memoryType ?? "";
    if (type && memoryType !== type) return [];
    const rel = relative(target, node.path);
    return [{
      type: memoryType,
      slug: slugOf(rel, memoryType, node.path.endsWith(`${"/"}SKILL.md`)),
      path: rel,
    }];
  });
  return { targetDir: target, items };
}

export async function getMemoryEntry(targetDir: string | undefined, type: string, slug: string) {
  const target = resolveTarget(targetDir ?? process.cwd());
  const file = resolveMemoryPath(target, type, slug);
  const node = await memoryNodes(target).get(file);
  if (!node) {
    throw new Error(`memory entry not found: ${type} ${slug}`);
  }
  return {
    targetDir: target,
    type,
    slug,
    path: relative(target, file),
    title: node.name,
    description: node.description,
  };
}

export async function deleteMemoryEntry(targetDir: string | undefined, type: string, slug: string) {
  const target = resolveTarget(targetDir ?? process.cwd());
  const file = resolveMemoryPath(target, type, slug);
  if (!existsSync(file)) {
    throw new Error(`memory entry not found: ${type} ${slug}`);
  }
  const service = memoryNodes(target);
  const node = await service.get(file);
  if (!node) {
    throw new Error(`memory entry not found: ${type} ${slug}`);
  }
  await service.destroy(node);
  return { targetDir: target, type, slug, path: relative(target, file) };
}
