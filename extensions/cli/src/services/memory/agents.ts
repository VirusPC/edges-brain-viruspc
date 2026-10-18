import { canonicalPath, isWithinPath } from '../../utils/filesystem.js';
export { ownershipTarget } from './paths.js';
import { AgentsNode } from "../../domain/models/agents/agents-node.js";
import { discoverScopes } from '../scope.js';
import { memoryNodes, prepareMemoryWrite } from './service.js';
import { NodeService } from '../node/node-service.js';
import { parseDocument } from '../../utils/markdown/document.js';
import { join, dirname, basename, relative, sep } from "node:path";
import {
  AUTO_START,
  CHILDREN_START,
  CHILDREN_END,
  IMPORTANT_START,
  LOCAL_START,
  LOCAL_END,
  OUTER_START,
  LEGACY_OUTER_START,
  LEGACY_IMPORTANT_START,
  LEGACY_LOCAL_START,
  LEGACY_CHILDREN_START,
  INDEX_ENTRY_PATTERN,
  blockPattern,
  buildChildrenBlock,
  ensureImportantBlock,
  escapeRegExp,
  extractLocalBlock,
  insertInnerBlock,
  renderAgentsDocument,
  rewriteLayerSurface,
  upsertBlock,
} from "./blocks.js";
import {
  AGENTS_FILE_NAME,
  ancestors,
  assertScopePath,
  isFile,
  isScope,
  readText,
  ownershipTarget,
} from "./paths.js";
import { ENTRY_LINE_TEMPLATE, renderLine } from "./templates.js";
import { selectedLocalBlock } from "./types.js";
export function classifyAgentsSource(source: string | undefined): "missing" | "managed" | "foreign" {
    if (source === undefined) return 'missing';
    return [
      OUTER_START,
      LEGACY_OUTER_START,
      IMPORTANT_START,
      LEGACY_IMPORTANT_START,
      LOCAL_START,
      LEGACY_LOCAL_START,
      CHILDREN_START,
      LEGACY_CHILDREN_START,
      AUTO_START,
    ].some(marker => source.includes(marker)) ? 'managed' : 'foreign';
}
export function classifyAgentsFile(file: string): "missing" | "managed" | "foreign" {
    return classifyAgentsSource(isFile(file) ? readText(file) : undefined);
}
async function syncLoadedAgents(service: NodeService, node: AgentsNode | undefined, file: string, directory: string, local: string, children: string): Promise<string> {
    const existing = node?.body;
    const state = classifyAgentsSource(existing);
    if (state === 'foreign') return 'needs-doctor';
    if (!node) {
        await service.create(new AgentsNode(file), parseDocument(renderAgentsDocument(basename(directory), local, children)), { indexGroup: 'local' });
        return 'created';
    }
    let updated = rewriteLayerSurface(existing!);
    updated = ensureImportantBlock(updated);
    if (local) updated = upsertBlock(updated, LOCAL_START, LOCAL_END, local);
    if (children) updated = upsertBlock(updated, CHILDREN_START, CHILDREN_END, children);
    updated = rewriteLayerSurface(updated);
    if (updated === existing) return 'preserved';
    await service.update(node, { body: updated });
    return 'updated';
}
export async function syncAgentsBlocks(directory: string, local = "", children = "", service = memoryNodes(directory)): Promise<string> {
    const file = prepareMemoryWrite(directory, join(directory, AGENTS_FILE_NAME));
    return syncLoadedAgents(service, await service.get(file, AgentsNode), file, directory, local, children);
}
export async function syncTargetAgents(target: string, _root: string, service = memoryNodes(target)): Promise<string> {
    const file = prepareMemoryWrite(target, join(target, AGENTS_FILE_NAME));
    const node = await service.get(file, AgentsNode);
    const surface = node ? rewriteLayerSurface(node.body) : undefined;
    const local = extractLocalBlock(surface ?? "") ?? selectedLocalBlock([]);
    return syncLoadedAgents(service, node, file, target, local, "");
}
export const normalizeIndexDescription = (target: string, description?: string) => description?.trim().replace(/\s+/g, " ") ||
    `${basename(target)} 目录的项目记忆与规范入口。`;
export function mergeIndexEntry(document: string, relativeAgents: string, entry: string, descriptionGiven: boolean): [
    string,
    boolean
] {
    document = rewriteLayerSurface(document);
    const pattern = blockPattern(CHILDREN_START, CHILDREN_END), block = document.match(pattern)?.[0];
    if (!block)
        return [
            insertInnerBlock(document, CHILDREN_START, buildChildrenBlock(entry)),
            true,
        ];
    const entryPattern = new RegExp(`^- \\[[^\\]]*\\]\\(${escapeRegExp(relativeAgents)}\\)(?: — .*)?$`, "m");
    if (entryPattern.test(block) && !descriptionGiven)
        return [document, false];
    const updated = entryPattern.test(block)
        ? block.replace(entryPattern, () => entry)
        : block.replace(CHILDREN_END, () => `${entry}\n${CHILDREN_END}`);
    return updated === block
        ? [document, false]
        : [document.replace(pattern, () => updated), true];
}
export const ancestorsUpTo = (start: string, root: string) => isWithinPath(start, root)
    ? ancestors(start).filter((p) => isWithinPath(p, root))
    : [start];
export function readOwnershipEntries(file: string) {
    return isFile(file) ? new AgentsNode(file).parse(readText(file)).children : [];
}
export function readIndexEntries(file: string): [string, string][] {
    return (isFile(file) ? new AgentsNode(file).parse(readText(file)).descendantChildren : [])
        .filter(entry => entry.id.endsWith(AGENTS_FILE_NAME))
        .map(entry => [relative(dirname(file), entry.id), entry.description ?? '']);
}
export function registeredIndexAnchors(target: string, root: string): string[] {
    return discoverScopes(root).filter(owner => readOwnershipEntries(join(owner, AGENTS_FILE_NAME))
        .some(entry => canonicalPath(entry.id) === canonicalPath(join(target, AGENTS_FILE_NAME))));
}
export async function dropIndexEntries(file: string, relatives: Set<string>): Promise<boolean> {
    const service = memoryNodes(dirname(file));
    const node = await service.get(prepareMemoryWrite(dirname(file), file), AgentsNode);
    if (!node) return false;
    const descendantChildren = node.descendantChildren.filter(ref => !relatives.has(relative(node.directoryPath, ref.id)));
    if (descendantChildren.length === node.descendantChildren.length) return false;
    await service.update(node, { descendantChildren });
    return true;
}
export function findIndexAnchor(target: string, root: string): string {
    if (target === root)
        return root;
    const registered = registeredIndexAnchors(target, root);
    if (registered.length) return registered[0]!;
    for (const candidate of ancestors(dirname(target))) {
        if (candidate === root)
            break;
        if (isScope(candidate))
            return candidate;
    }
    return root;
}
export async function syncIndexEntry(anchor: string, target: string, description?: string): Promise<[string, string | null, string | null]> {
    if (anchor === target) return ['not-applicable', null, null];
    const service = memoryNodes(anchor);
    const file = prepareMemoryWrite(anchor, join(anchor, AGENTS_FILE_NAME));
    const node = await service.get(file, AgentsNode);
    if (!node) return ['missing-owner', null, null];
    const id = canonicalPath(join(target, AGENTS_FILE_NAME));
    const registered = node.children.find(ref => canonicalPath(ref.id) === id);
    const rel = relative(anchor, id), normalized = normalizeIndexDescription(target, description);
    if (registered && (description === undefined || registered.description === normalized)) return ['preserved', rel, null];
    const patch = (refs: typeof node.localChildren) => refs.map(ref => ref.id === registered?.id ? { ...ref, description: normalized } : ref);
    const localChildren = patch(node.localChildren), descendantChildren = patch(node.descendantChildren);
    if (!registered) {
        const harness = join(anchor, ".harness");
        const group = id === harness || id.startsWith(harness + sep) ? "local" : "descendant";
        (group === "local" ? localChildren : descendantChildren).push({ id, name: rel, description: normalized });
    }
    await service.update(node, { localChildren, descendantChildren });
    return ['updated', rel, normalized];
}
