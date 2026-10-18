import { readEntry, saveEntries } from '../node/node-files.js';
import { canonicalPath, findAncestor } from "../../utils/filesystem.js";
import { AgentsNode } from "../../domain/models/agents/agents-node.js";
import { ReadmeNode } from "../../domain/models/readme/readme-node.js";
import * as fs from "node:fs";
import { ENTRY_NAMES, LEGACY_LEAF_ENTRY } from "../../domain/config/layout.js";
import { join, dirname, basename, relative, resolve } from "node:path";
import { assertPrivateIgnored } from "./ignore.js";
import { parseDocument } from "../../utils/markdown/document.js";
import {
  LOCAL_END,
  TYPE_META_START,
  TYPE_META_END,
  ENTRIES_START,
  ENTRIES_LOCAL_START,
  blockPattern,
  buildLocalBlock,
  escapeRegExp,
  indexFiles,
} from "./blocks.js";
import {
  AGENTS_FILE_NAME,
  assertScopePath,
  assertOwned,
  isExternalType,
  isSymlink,
  isDirectory,
  isFile,
  moduleForType,
  readText,
  TYPE_INDEX_FILE_NAME,
  typeFromDirName,
  typeIndexRelpath,
  legacyTypeIndexRelpath,
} from "./paths.js";
import {
  SCOPE_README_ENTRY_DESCRIPTION,
  SCOPE_README_ENTRY_NAME,
} from "../init/modules.js";
export const MEMORY_TYPE_NAMES = [
  "user",
  "feedback",
  "project",
  "reference",
] as const;
export const SKILL_TYPE_NAMES = ["managed", "referenced"] as const;
export const SEED_TYPE_NAMES: readonly string[] = [
  ...MEMORY_TYPE_NAMES,
  ...SKILL_TYPE_NAMES,
];
export interface TypeSpec {
  name: string;
  indexFile: string;
  description: string;
  writable: boolean;
  gitignore: boolean;
  format: "ordinary" | "skills";
  module: "memory" | "skills";
}
export const TYPE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
export const seedIndexFiles = indexFiles;
export const typeIndexTemplateName = (name: string) =>
  `${name.toUpperCase()}.md`;
export const indexFileName = (name: string, module?: "memory" | "skills") =>
  typeIndexRelpath(name, module);
const isTypeIndexSource = (text: string) =>
  [ENTRIES_START, ENTRIES_LOCAL_START, TYPE_META_START].some((m) =>
    text.includes(m),
  );
const TYPE_INDEX_FILES: readonly string[] = [TYPE_INDEX_FILE_NAME, AGENTS_FILE_NAME];
export function validateTypeName(value: string): string {
  const name = value.trim();
  if (SEED_TYPE_NAMES.includes(name.toLowerCase()))
    throw new Error(`不能用 add-type 登记官方种子类型: ${name.toLowerCase()}`);
  if (!TYPE_NAME_PATTERN.test(name))
    throw new Error(
      "--name 必须是小写 snake_case，例如 docs 或 my_type，不能用 kebab-case",
    );
  return name;
}
/** Type comments contain YAML, parsed by the same safe document codec as entries. */
export function parseTypeMeta(text: string): TypeSpec | undefined {
  const block = text.match(blockPattern(TYPE_META_START, TYPE_META_END))?.[0];
  if (!block) return;
  const fields =
    parseDocument(
      `---\n${block.slice(TYPE_META_START.length, -TYPE_META_END.length).trim()}\n---\n`,
    ).metadata ?? {};
  const name = fields.name;
  if (typeof name !== "string" || !TYPE_NAME_PATTERN.test(name))
    throw new Error("Invalid type metadata name");
  if (!SEED_TYPE_NAMES.includes(name)) {
    const missing = ["gitignore", "writable"].filter((k) => !(k in fields));
    if (missing.length)
      throw new Error(
        `Missing custom type privilege metadata; restore original permissions: ${missing.join(", ")}`,
      );
  }
  const module = fields.module ?? moduleForType(name);
  if (module !== "memory" && module !== "skills")
    throw new Error("Invalid type module");
  for (const key of ["writable", "gitignore"])
    if (key in fields && typeof fields[key] !== "boolean")
      throw new Error(`Invalid type flag: ${key}`);
  const format = fields.format ?? "ordinary";
  if (format !== "ordinary" && format !== "skills")
    throw new Error("Invalid type format");
  return {
    name,
    indexFile: indexFileName(name, module),
    description: String(fields.description ?? ""),
    writable: (fields.writable ?? true) as boolean,
    gitignore: (fields.gitignore ?? false) as boolean,
    format,
    module,
  };
}
export function seedDescription(name: string): string {
  return (
    buildLocalBlock().match(
      new RegExp(`\\]\\(${escapeRegExp(indexFileName(name))}\\) — (.*)`),
    )?.[1] ?? name
  );
}
export function seedSpec(name: string): TypeSpec {
  const module = moduleForType(name);
  return {
    name,
    indexFile: indexFileName(name),
    description: seedDescription(name),
    writable: name !== "referenced",
    gitignore: name === "user",
    format: module === "skills" ? "skills" : "ordinary",
    module,
  };
}
/** Resolve only authored local ownership edges through the common node model. */
export function localOwnershipPaths(
  target: string,
  source?: string,
): Set<string> {
  const file = join(resolve(target), AGENTS_FILE_NAME);
  const text = source ?? (isFile(file) ? readText(file) : "");
  const node = new AgentsNode(file).parse(text);
  return new Set(
    node.localChildren.flatMap((reference) => {
      const path = canonicalPath(reference.id);
      return path ? [path] : [];
    }),
  );
}
/** One type directory has one index; README wins over a not-yet-migrated AGENTS.md. */
function setCandidate(
  candidates: Map<string, { module: "memory" | "skills"; dirname: string }>,
  rel: string,
  module: "memory" | "skills",
  dirname: string,
): void {
  const readme = `.harness/${module}/${dirname}/${TYPE_INDEX_FILE_NAME}`;
  if (rel !== readme && candidates.has(readme)) return;
  if (rel === readme)
    candidates.delete(`.harness/${module}/${dirname}/${AGENTS_FILE_NAME}`);
  candidates.set(rel, { module, dirname });
}
export function layerTypeSpecs(target: string): TypeSpec[] {
  const candidates = new Map<
    string,
    { module: "memory" | "skills"; dirname: string }
  >();
  for (const file of layerReadmePaths(target) ?? localOwnershipPaths(target)) {
    const rel = relative(canonicalPath(target), file);
    const [harness, module, directory, entry, ...rest] = rel.split("/");
    if (
      harness === ".harness" &&
      (module === "memory" || module === "skills") &&
      directory &&
      entry !== undefined &&
      TYPE_INDEX_FILES.includes(entry) &&
      !rest.length
    )
      setCandidate(candidates, rel, module, directory);
  }
  for (const module of ["memory", "skills"] as const) {
    const container = assertScopePath(join(target, ".harness", module), target);
    if (isDirectory(container))
      for (const child of fs.readdirSync(container).sort())
        for (const name of TYPE_INDEX_FILES) {
          const file = join(container, child, name);
          assertScopePath(file, target);
          if (isFile(file) && isTypeIndexSource(readText(file)))
            setCandidate(
              candidates,
              `.harness/${module}/${child}/${name}`,
              module,
              child,
            );
        }
  }
  const result = new Map<string, TypeSpec>();
  for (const [rel, { module, dirname }] of candidates) {
    const file = assertScopePath(join(target, rel), target);
    const parsed = isFile(file) ? parseTypeMeta(readText(file)) : undefined;
    const name = parsed?.name ?? typeFromDirName(dirname);
    if (!parsed && !SEED_TYPE_NAMES.includes(name))
      throw new Error(
        `Missing custom type index/metadata; restore original permissions: ${rel}`,
      );
    if (parsed && parsed.module !== module)
      throw new Error(`Type module disagrees with path: ${rel}`);
    if (
      SEED_TYPE_NAMES.includes(name) &&
      rel !== indexFileName(name) &&
      rel !== legacyTypeIndexRelpath(name)
    )
      throw new Error(`Official type path conflict: ${name}`);
    if (result.has(name) && result.get(name)!.indexFile !== rel)
      throw new Error(`Duplicate type identity: ${name}`);
    const spec = { ...(parsed ?? seedSpec(name)), indexFile: rel, module };
    if (name === "user" && !spec.gitignore)
      throw new Error("user must remain private (gitignore: true)");
    if (name === "managed" && (!spec.writable || spec.format !== "skills"))
      throw new Error("managed must remain writable skills");
    if (name === "referenced" && (spec.writable || spec.format !== "skills"))
      throw new Error("referenced must remain index-only skills");
    result.set(name, spec);
  }
  const order = (name: string) =>
    SEED_TYPE_NAMES.includes(name)
      ? SEED_TYPE_NAMES.indexOf(name)
      : SEED_TYPE_NAMES.length;
  return [...result.values()].sort((a, b) => order(a.name) - order(b.name));
}
export const discoverLayerTypes = (target: string): Record<string, string> =>
  Object.fromEntries(layerTypeSpecs(target).map((s) => [s.name, s.indexFile]));
export const layerWritableTypes = (target: string) =>
  layerTypeSpecs(target)
    .filter((s) => s.writable)
    .map((s) => s.name);
export function rejectUnwritableType(target: string, name: string): string {
  return layerTypeSpecs(target).some((s) => s.name === name && !s.writable)
    ? `--type ${name} 只索引，不能 remember`
    : `--type 未在该层登记为可写类型: ${name}。已登记可写类型: ${layerWritableTypes(target).join(", ") || "(none)"}`;
}
export function gitignorePatterns(
  name: string,
  module = moduleForType(name),
  indexFile = indexFileName(name, module),
): string[] {
  const directory = dirname(indexFile);
  return [`${directory}/`, `**/${directory}/`];
}
export const findGitRoot = (start: string) =>
  findAncestor(start, p => fs.existsSync(join(p, ".git")));
export function ensureTypeGitignore(
  root: string,
  name: string,
  module = moduleForType(name),
  indexFile?: string,
): string {
  if (!fs.existsSync(join(root, ".git"))) return "skipped-no-git";
  const file = assertScopePath(join(root, ".gitignore"), root);
  const entry = readEntry(file);
  const before = entry?.source ?? "";
  const missing = gitignorePatterns(name, module, indexFile).filter(
    (p) => !before.split(/\r?\n/).includes(p),
  );
  if (!missing.length) return "preserved";
  saveEntries([{ path: file, before: entry, source: `${before.trimEnd()}\n\n# Private harness type ${name}\n${missing.join("\n")}\n`, createMode: 0o600 }]);
  return "updated";
}
export function ensureLayerTypeGitignore(
  target: string,
  name: string,
  destinations: readonly string[] = [],
): void {
  const spec = layerTypeSpecs(target).find((s) => s.name === name),
    root = findGitRoot(target);
  if (spec?.gitignore) {
    if (root) ensureTypeGitignore(root, name, spec.module, spec.indexFile);
    const files = [join(target, spec.indexFile), ...destinations];
    // Ignored parent directories also cover the shared writer's private temporary files.
    assertPrivateIgnored(root ?? target, files, files.map(dirname));
  }
}
/** Children of `<scope>/.harness/README.md` when that organization list exists. */
export function layerReadmePaths(target: string): Set<string> | undefined {
  const file = join(resolve(target), ".harness", ENTRY_NAMES.readme);
  if (!isFile(file)) return undefined;
  try {
    const node = new ReadmeNode(file).parse(readText(file));
    return new Set(
      node.children.flatMap((reference) => {
        const id = canonicalPath(reference.id);
        return id ? [id] : [];
      }),
    );
  } catch {
    return undefined;
  }
}

/** AGENTS 本层只留指向 `.harness/README.md` 的一条。类型行登记在那份 README 上。 */
export function selectedLocalBlock(_specs: TypeSpec[] = []): string {
  let block = buildLocalBlock().replace(
    /^- \[.*\]\(\.harness\/.*\).*\n?/gm,
    "",
  );
  const line = `- [${SCOPE_README_ENTRY_NAME}](.harness/README.md) — ${SCOPE_README_ENTRY_DESCRIPTION}`;
  if (!block.includes("](.harness/README.md)") && !block.includes("](<.harness/README.md>)"))
    block = block.replace(LOCAL_END, () => `${line}\n${LOCAL_END}`);
  return block;
}

/** Existing leftover AGENTS indexes stay readable. A missing index is always the README path. */
export function typeIndexPath(target: string, name: string): string {
  const rel = discoverLayerTypes(target)[name];
  if (!rel) return join(target, typeIndexRelpath(name));
  const preferred = join(target, rel);
  if (basename(preferred) !== TYPE_INDEX_FILE_NAME && !isFile(preferred))
    return join(target, typeIndexRelpath(name));
  return preferred;
}
export const typeContentDir = (target: string, name: string) =>
  isExternalType(name)
    ? join(target, ".agents/skills")
    : dirname(typeIndexPath(target, name));
export function listTypeFiles(
  target: string,
  name: string,
  pattern = "*.md",
): string[] {
  const directory = typeContentDir(target, name),
    external = isExternalType(name);
  if (!external) assertScopePath(directory, target);
  if (!fs.existsSync(directory))
    throw new Error(`source-scan-error: missing source ${directory}`);
  if (!isDirectory(directory))
    throw new Error(`source-scan-error: not a directory ${directory}`);
  const paths: string[] = [],
    seen = new Set<string>();
  for (const item of fs.readdirSync(directory).sort()) {
    if (item.startsWith(".node-")) continue;
    const child = join(directory, item);
    if (isSymlink(child) && !fs.existsSync(child))
      throw new Error(`source-scan-error: broken link ${child}`);
    if (
      pattern !== "*/SKILL.md" &&
      item.startsWith(`${name}_`) &&
      item.endsWith(".md") &&
      isFile(child)
    )
      throw new Error(
        `migration-required: legacy standalone memory entry ${child}; use explicit directory migration`,
      );
    let candidate: string;
    if (pattern === "*/SKILL.md") {
      if (!isDirectory(child)) continue;
      candidate = join(child, ENTRY_NAMES.skill);
      if (!fs.existsSync(candidate)) {
        if (isSymlink(candidate))
          throw new Error(`source-scan-error: broken link ${candidate}`);
        continue;
      }
    } else if (isDirectory(child) && item.startsWith(`${name}_`)) {
      candidate = join(child, ENTRY_NAMES.leaf);
      if (!isFile(candidate)) candidate = join(child, LEGACY_LEAF_ENTRY);
      if (!isFile(candidate)) continue;
    } else {
      continue;
    }
    if (!external) assertOwned(candidate, directory);
    readText(candidate);
    const real = canonicalPath(candidate);
    if (!seen.has(real)) {
      seen.add(real);
      paths.push(candidate);
    }
  }
  return paths;
}
