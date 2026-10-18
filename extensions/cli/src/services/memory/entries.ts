import { AgentsNode } from "../../domain/models/agents/agents-node.js";
import { ReadmeNode } from "../../domain/models/readme/readme-node.js";
import {
  ENTRY_NAMES,
  LEGACY_LEAF_ENTRY,
} from "../../domain/config/layout.js";
import { isLeafEntryName } from "../../domain/models/node/layout.js";
import { ENTRIES_SECTIONS } from "../../domain/config/sections.js";
import {
  escapeIndexText,
  encodeIndexPath,
} from "../../domain/core/node-content/serialize.js";
import { listTypeFiles, typeContentDir, typeIndexPath } from './types.js';
import { canonicalPath, isWithinPath } from '../../utils/filesystem.js';

import { memoryNodes, prepareMemoryWrite } from './service.js';
import { NodeService } from '../node/node-service.js';
import { parseDocument } from '../../utils/markdown/document.js';
import * as fs from "node:fs";
import { basename, dirname, join, parse } from "node:path";
import {
  ENTRIES_START,
  ENTRIES_END,
  ENTRIES_LOCAL_START,
  ENTRIES_LOCAL_END,
  indexFiles,
  upsertBlock,
} from "./blocks.js";
import {
  assertScopePath,
  isExternalType,
  isFile,
  readText,
  relativeLink,
} from "./paths.js";
import {
  discoverLayerTypes,
  ensureLayerTypeGitignore,
  layerTypeSpecs,
  layerWritableTypes,
  rejectUnwritableType,
  typeIndexTemplateName,
} from "./types.js";
import {
  ENTRY_LINE_TEMPLATE,
  fillPlaceholders,
  readIndexTemplate,
  readTemplate,
  renderLine,
} from "./templates.js";
import {
  frontmatterData,
  logicalFields,
  FLAT_COMPAT_KEYS,
  preserveEntryMetadata,
} from "../../domain/models/memory/documents.js";
import { ORIGIN_FIELDS, AUDIT_FIELDS, nowTimestamp } from "./provenance.js";
export const AGENT_SKILL_FORMAT_TYPES = new Set(["managed", "referenced"]);
export const memoryEntryTypes = (target?: string) =>
  target
    ? layerWritableTypes(target)
    : Object.keys(indexFiles()).filter((n) => !isExternalType(n));
export const isSkillFormat = (target: string, name: string) =>
  AGENT_SKILL_FORMAT_TYPES.has(name) ||
  layerTypeSpecs(target).some((s) => s.name === name && s.format === "skills");
export const entryOutputName = (name: string, target?: string) =>
  (target ? isSkillFormat(target, name) : AGENT_SKILL_FORMAT_TYPES.has(name))
    ? ENTRY_NAMES.skill
    : ENTRY_NAMES.leaf;
export const entryName = (file: string, name: string, target?: string) =>
  entryOutputName(name, target) === ENTRY_NAMES.skill ||
  isLeafEntryName(basename(file))
    ? basename(dirname(file))
    : parse(file).name;
export const parseFrontmatter = (file: string): Record<string, string> =>
  logicalFields(frontmatterData(readText(file)));
export const topLevelFrontmatterKeys = (file: string) =>
  new Set(Object.keys(frontmatterData(readText(file))));
export const hasLegacyFlatFrontmatter = (file: string) =>
  FLAT_COMPAT_KEYS.some((k) => topLevelFrontmatterKeys(file).has(k));
export const yamlScalar = (value: string) =>
  JSON.stringify(value.split(/\s+/).join(" ").trim());
export function renderEntry(
  fields: Record<string, string>,
  content: string,
  outputName: string = ENTRY_NAMES.leaf,
  previousSource?: string,
): string {
  if (!content.trim()) throw new Error("content 不能为空");
  const template = readTemplate(outputName),
    declared = new Set([...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
  const undeclared = Object.keys(fields).filter(
    (k) => fields[k] && !declared.has(k),
  );
  if (undeclared.length)
    throw new Error(
      `${outputName} 缺少占位符，字段会丢失: ${undeclared.join(", ")}`,
    );
  const values = Object.fromEntries(
    Object.entries(fields)
      .filter(([, v]) => v)
      .map(([k, v]) => [k, yamlScalar(v)]),
  );
  values.content = content.trim();
  return preserveEntryMetadata(
    fillPlaceholders(template, values).trimEnd() + "\n",
    previousSource,
  );
}
export function resolveMemoryPath(
  target: string,
  name: string,
  slug?: string,
): string {
  if (!memoryEntryTypes(target).includes(name))
    throw new Error(rejectUnwritableType(target, name));
  const normalized = (slug ?? "").trim().toLowerCase(),
    directory = typeContentDir(target, name);
  if (isSkillFormat(target, name)) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) ||
      normalized.length > 64
    )
      throw new Error(
        `--slug 在 ${name} 里是技能目录名，必须是 kebab-case 且不超过 64 字符`,
      );
    return assertScopePath(
      join(directory, normalized, ENTRY_NAMES.skill),
      target,
    );
  }
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(normalized))
    throw new Error(
      "--slug 必须是小写 snake_case，例如 reuse_existing_constants",
    );
  if (
    Object.keys(discoverLayerTypes(target)).some((n) =>
      normalized.startsWith(`${n}_`),
    )
  )
    throw new Error("--slug 不要带类型前缀，脚本会按 --type 自动加上");
  const flat = assertScopePath(
    join(directory, `${name}_${normalized}.md`),
    target,
  );
  const ownedDir = join(directory, `${name}_${normalized}`);
  const owned = assertScopePath(
    !fs.existsSync(join(ownedDir, ENTRY_NAMES.leaf)) &&
      fs.existsSync(join(ownedDir, LEGACY_LEAF_ENTRY))
      ? join(ownedDir, LEGACY_LEAF_ENTRY)
      : join(ownedDir, ENTRY_NAMES.leaf),
    target,
  );
  if (fs.existsSync(flat))
    throw new Error(
      `Legacy memory entry requires explicit directory migration: ${flat}`,
    );
  return owned;
}
export function buildEntryFields(
  name: string,
  type: string,
  title: string | undefined,
  description: string | undefined,
  existing: Record<string, string>,
  detected: Record<string, string>,
  overrides: Record<string, string | undefined>,
  target?: string,
): Record<string, string> {
  const skill = target
      ? isSkillFormat(target, type)
      : AGENT_SKILL_FORMAT_TYPES.has(type),
    resolvedTitle = (title || existing.title || "").trim(),
    resolvedDescription = (description || existing.description || "").trim();
  if (!resolvedTitle && !skill) throw new Error("新建记忆必须提供 --title");
  if (!resolvedDescription) throw new Error("新建记忆必须提供 --description");
  const fields: Record<string, string> = {
    name,
    title: resolvedTitle,
    description: resolvedDescription,
  };
  if (!skill) fields.type = type;
  for (const key of ORIGIN_FIELDS) {
    const value = overrides[key] || existing[key] || detected[key];
    if (value) fields[key] = value;
  }
  for (const key of AUDIT_FIELDS) {
    const value = overrides[key] || detected[key] || existing[key];
    if (value) fields[key] = value;
  }
  fields.updatedAt = nowTimestamp();
  return fields;
}
/** README type indexes use ReadmeNode; a not-yet-migrated AGENTS.md index keeps its legacy model. */
export const typeIndexNode = (file: string): AgentsNode | ReadmeNode =>
  basename(file) === ENTRY_NAMES.readme ? new ReadmeNode(file) : new AgentsNode(file);
/** An existing legacy AGENTS.md index keeps its dialect. A missing index is created as README. */
export function typeIndexTemplate(file: string, name: string): string {
  const template = readIndexTemplate(typeIndexTemplateName(name), name, name);
  if (basename(file) === ENTRY_NAMES.readme) return template;
  return template
    .replace(`${ENTRIES_LOCAL_START}\n## ${ENTRIES_SECTIONS.localChildren.heading}\n\n`, `${ENTRIES_START}\n`)
    .replace(ENTRIES_LOCAL_END, ENTRIES_END);
}
export function buildEntryIndex(
  target: string,
  name: string,
  legacy = false,
): string {
  const base = dirname(typeIndexPath(target, name));
  const files = listTypeFiles(
    target,
    name,
    isSkillFormat(target, name) ? "*/SKILL.md" : `${name}_*.md`,
  );
  const entries = files.map((file) => {
    const fields = parseFrontmatter(file);
    return renderLine(ENTRY_LINE_TEMPLATE, {
      title: escapeIndexText(
        fields.title || fields.name || entryName(file, name, target),
      ),
      path: encodeIndexPath(
        relativeLink(isExternalType(name) ? file : canonicalPath(file), base),
      ),
      description: escapeIndexText(
        fields.description || "缺少 description，请补齐 frontmatter。",
      ),
    });
  });
  const lines = entries.join("\n") || "- 暂无条目。";
  if (legacy) return [ENTRIES_START, lines, ENTRIES_END].join("\n");
  return [
    ENTRIES_LOCAL_START,
    `## ${ENTRIES_SECTIONS.localChildren.heading}`,
    "",
    lines,
    ENTRIES_LOCAL_END,
  ].join("\n");
}
export function expectedIndexDocument(
  target: string,
  name: string,
  source?: string,
): string {
  const file = assertScopePath(typeIndexPath(target, name), target);
  const existing =
    source ??
    (isFile(file)
      ? readText(file)
      : typeIndexTemplate(file, name));
  const legacy = basename(file) !== ENTRY_NAMES.readme;
  const generated = typeIndexNode(file).parse(buildEntryIndex(target, name, legacy));
  const node = typeIndexNode(file).parse(generated.localChildren.length ? existing.replace(/^- 暂无条目。\r?\n/gm, "") : existing);
  const desired = new Map(generated.localChildren.map(ref => [ref.id, ref]));
  const base = canonicalPath(typeContentDir(target, name));
  const own = (id: string) => isWithinPath(id, base) && (isSkillFormat(target, name) || basename(dirname(id)).startsWith(name + '_') || basename(id).startsWith(name + '_'));
  const localChildren = node.localChildren.flatMap(ref => {
    const next = desired.get(ref.id);
    if (next) { desired.delete(ref.id); return [next]; }
    return own(ref.id) ? [] : [ref];
  });
  localChildren.push(...desired.values());
  node.update({ localChildren }, { operation: "update" });
  return node.serialize();
}
export async function refreshIndex(
  target: string,
  name: string,
  service = memoryNodes(target),
): Promise<string> {
  target = canonicalPath(target);
  const file = assertScopePath(typeIndexPath(target, name), target);
  ensureLayerTypeGitignore(target, name);
  if (name in discoverLayerTypes(target) && !isExternalType(name))
    fs.mkdirSync(dirname(file), { recursive: true });
  const entry = prepareMemoryWrite(target, file);
  const node = (await service.get(entry)) as AgentsNode | ReadmeNode | undefined;
  const existed = !!node, before = node?.body ?? "";
  const source = existed
    ? before
    : typeIndexTemplate(file, name);
  const after = expectedIndexDocument(target, name, source);
  if (!existed || before !== after) {
    if (node) await service.update(node, { body: after });
    else await service.create(typeIndexNode(entry), parseDocument(after), { indexGroup: "local" });
    return existed ? "updated" : "created";
  }
  return "preserved";
}
