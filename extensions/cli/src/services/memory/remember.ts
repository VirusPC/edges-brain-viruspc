import { ENTRY_NAMES } from "../../domain/config/layout.js";
import { isLeafEntryName } from "../../domain/models/node/layout.js";
import { AgentsNode } from "../../domain/models/agents/agents-node.js";
import { typeIndexPath } from './types.js';
import { assertImportType } from "../import-entry.js";
import { MemoryNode, SkillNode } from "../../domain/models/index.js";
import { memoryNodes } from "./service.js";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, basename, dirname, join } from "node:path";
import { isScope, rejectLegacy, resolveRoot, resolveTarget } from "./paths.js";
import { ensureLayerTypeGitignore } from "./types.js";
import {
  AUDIT_FIELDS,
  ORIGIN_FIELDS,
  agentContext,
  gitIdentity,
} from "./provenance.js";
import { syncTargetAgents } from "./agents.js";
import {
  buildEntryFields,
  entryName,
  entryOutputName,
  refreshIndex,
  renderEntry,
  resolveMemoryPath,
} from "./entries.js";
import {
  logicalFields,
  strictFrontmatterData,
} from "../../domain/models/memory/documents.js";
export interface RememberMemoryOptions {
  targetDir: string;
  type: string;
  slug: string;
  importEntry?: string;
  title?: string;
  description?: string;
  content?: string;
  originSessionId?: string;
  agentClient?: string;
  username?: string;
  email?: string;
  env?: NodeJS.ProcessEnv;
}
export async function rememberMemory(options: RememberMemoryOptions) {
  const target = resolveTarget(options.targetDir);
  rejectLegacy(target);
  if (!isScope(target)) throw new Error("目标目录尚未初始化，请先执行 init");
  const file = resolveMemoryPath(target, options.type, options.slug);
  const exists = existsSync(file),
    service = memoryNodes(target);
  if (options.importEntry) {
    if (options.content !== undefined)
      throw new Error("importEntry conflicts with content");
    const source = resolve(options.importEntry);
    const expected =
      entryOutputName(options.type, target) === ENTRY_NAMES.skill
        ? ENTRY_NAMES.skill
        : ENTRY_NAMES.leaf;
    if (
      expected === ENTRY_NAMES.skill
        ? basename(source) !== expected
        : !isLeafEntryName(basename(source))
    )
      throw new Error(`${source}: expected ${expected} entry`);
    assertImportType(source, expected === ENTRY_NAMES.skill ? "skill" : "memory");
    const imported =
      expected === ENTRY_NAMES.skill ? new SkillNode(source) : new MemoryNode(source);
    imported.parse(readFileSync(source, "utf8")).validate();
    if (
      imported instanceof MemoryNode &&
      imported.memoryType !== undefined &&
      imported.memoryType !== options.type
    )
      throw new Error(`${source}: memoryType must be ${options.type}`);
    const destination = join(dirname(file), basename(source));
    ensureLayerTypeGitignore(target, options.type, [destination]);
    await service.import(source, destination, { indexGroup: "local" });
    await refreshIndex(target, options.type, service);
    const agentsAction = await syncTargetAgents(target, resolveRoot(target), service);
    return {
      operation: "remember",
      targetDir: target,
      type: options.type,
      name: entryName(destination, options.type, target),
      title: options.title || imported.name,
      path: relative(target, destination),
      index: relative(target, typeIndexPath(target, options.type)),
      action: "created",
      agentsAction,
      provenance: {},
    };
  }
  const Model =
    entryOutputName(options.type, target) === ENTRY_NAMES.skill
      ? SkillNode
      : MemoryNode;
  const node = exists
    ? await service.get<MemoryNode | SkillNode>(file, Model)
    : new Model(file);
  if (!node) throw new Error(`Missing memory entry: ${file}`);
  // Derive edits from the same snapshot that NodeService will validate on save.
  const previousSource = exists ? node.serialize() : undefined;
  const existing =
    previousSource === undefined
      ? {}
      : logicalFields(strictFrontmatterData(previousSource));
  const detected = { ...agentContext(options.env), ...gitIdentity(target) };
  const name = entryName(file, options.type, target);
  const fields = buildEntryFields(
    name,
    options.type,
    options.title,
    options.description,
    existing,
    detected,
    {
      originSessionId: options.originSessionId,
      agentClient: options.agentClient,
      username: options.username,
      email: options.email,
    },
    target,
  );
  const rendered = renderEntry(
    fields,
    options.content!,
    entryOutputName(options.type, target),
    previousSource,
  );
  ensureLayerTypeGitignore(target, options.type, [file]);
  const draft = new Model(file).parse(rendered);
  const input = {
    name,
    description: fields.description,
    metadata: draft.metadata,
    body: draft.body,
    ...(node instanceof MemoryNode ? { memoryType: options.type } : {}),
  };
  if (exists) await service.update(node, input);
  else await service.create(node, input, { indexGroup: "local" });
  await refreshIndex(target, options.type, service);
  const agentsAction = await syncTargetAgents(target, resolveRoot(target), service);
  return {
    operation: "remember",
    targetDir: target,
    type: options.type,
    name,
    title: fields.title || name,
    path: relative(target, file),
    index: relative(target, typeIndexPath(target, options.type)),
    action: exists ? "updated" : "created",
    agentsAction,
    provenance: Object.fromEntries(
      [...ORIGIN_FIELDS, ...AUDIT_FIELDS]
        .filter((k) => fields[k])
        .map((k) => [k, fields[k]]),
    ),
  };
}
