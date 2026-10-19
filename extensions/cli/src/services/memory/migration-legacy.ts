/** Legacy syntax is intentionally confined to the explicit migration. */
import * as fs from "node:fs";
import { join, basename, dirname, extname } from "node:path";
import {
  isFile,
  isDirectory,
  isSymlink,
  readText,
  AGENTS_FILE_NAME,
  typeIndexRelpath,
  legacyTypeIndexRelpath,
} from "./paths.js";
import { parseDocument } from "../../utils/markdown/document.js";
export const BUILTINS: Record<string, string> = {
  user: "users",
  feedback: "feedbacks",
  project: "projects",
  reference: "references",
  skills: "skills",
  agent_skills: "agent_skills",
};
const RENAMES: Record<string, string> = {
  skills: "managed",
  agent_skills: "referenced",
};
const START = "<!-- project-memory-type:start -->",
  END = "<!-- project-memory-type:end -->";
export interface LegacyType {
  name: string;
  directory: string;
  indexes: string[];
  module: "memory" | "skills";
  private: boolean;
  writable: boolean;
  format: "ordinary" | "skills";
  fields: Record<string, unknown>;
  synthetic: boolean;
  /** Uppercase root indexes and `<type>_<slug>.md` files, with no type directory. */
  flatRoot: boolean;
  flatEntries: string[];
  assetDirs: { source: string; entry: string }[];
  newName: string;
  relativeTarget: string;
}
export interface UnclassifiedLegacy {
  path: string;
  kind: "file" | "directory";
  suggestion: string;
}
export interface LegacyInventory extends Array<LegacyType> {
  unclassified: UnclassifiedLegacy[];
}
const FILE_SUGGESTION =
  "无法按文件名归入 project、feedback、reference、user。平铺条目应是 <type>_<slug>.md，类型索引应是 FEEDBACK.md、PROJECT.md、REFERENCE.md 或 USER.md。此文件会挪到 .project-memory-migration/unclassified/，不阻断其余迁移；确认后改名再运行 edges memory migrate。";
const DIRECTORY_SUGGESTION =
  "没有条目用「目录名/」这样的相对路径引用它，不能判断该跟哪一条记忆走。在对应的 <type>_<slug>.md 里写上这个相对路径后，再运行 edges memory migrate。目录会先挪到 .project-memory-migration/unclassified/，不阻断其余迁移。";
function make(
  spec: Omit<LegacyType, "newName" | "relativeTarget" | "flatRoot" | "flatEntries" | "assetDirs">,
): LegacyType {
  const newName = RENAMES[spec.name] ?? spec.name;
  return {
    ...spec,
    newName,
    flatRoot: false,
    flatEntries: [],
    assetDirs: [],
    relativeTarget: join(
      ".harness",
      spec.module,
      RENAMES[spec.name] ? newName : basename(spec.directory),
    ),
  };
}
function metadata(text: string): Record<string, unknown> {
  if (text.includes(START) !== text.includes(END))
    throw new Error("malformed-type-metadata");
  const body = text.match(
    /<!-- project-memory-type:start -->\r?\n([\s\S]*?)<!-- project-memory-type:end -->/,
  )?.[1];
  return body ? (parseDocument(`---\n${body}---\n`).metadata ?? {}) : {};
}
const PLURAL_DIRS = new Set(Object.values(BUILTINS));
function looksLikeTypeDirectory(path: string, name: string): boolean {
  if (isFile(join(path, AGENTS_FILE_NAME))) return true;
  if (PLURAL_DIRS.has(name) || name in BUILTINS) return true;
  const types = Object.keys(BUILTINS);
  return fs.readdirSync(path).some(
    (child) => isFile(join(path, child)) && flatTypeOf(child, types) !== undefined,
  );
}
function flatTypeOf(file: string, types: readonly string[]): string | undefined {
  const ordered = [...types].sort((a, b) => b.length - a.length);
  for (const type of ordered) {
    const prefix = `${type}_`;
    if (file.startsWith(prefix) && file.endsWith(".md") && file.length > prefix.length + 3)
      return type;
  }
  return undefined;
}
function referencesAsset(text: string, dirName: string): boolean {
  return text.includes(`${dirName}/`) || text.includes(`(${dirName})`);
}
function entryTexts(spec: LegacyType): { path: string; text: string }[] {
  const found: { path: string; text: string }[] = [];
  const add = (path: string) => {
    try {
      found.push({ path, text: readText(path) });
    } catch {
      /* unreadable entries cannot claim an asset directory */
    }
  };
  for (const path of spec.flatEntries) add(path);
  if (isDirectory(spec.directory))
    for (const name of fs.readdirSync(spec.directory)) {
      const path = join(spec.directory, name);
      if (isFile(path) && name.startsWith(`${spec.name}_`) && name.endsWith(".md"))
        add(path);
    }
  return found;
}
export function parseLegacy(
  scope: string,
  options: { strictUnclassified?: boolean } = {},
): LegacyInventory {
  const memory = join(scope, ".memory");
  if (isSymlink(memory)) throw new Error("legacy-memory-is-symlink");
  if (!isDirectory(memory)) throw new Error("legacy-memory-is-not-directory");
  const groups = new Map<string, LegacyType>();
  const flatCandidates: string[] = [];
  const looseDirs: string[] = [];
  const unclassified: UnclassifiedLegacy[] = [];
  for (const file of fs.readdirSync(memory).sort()) {
    const path = join(memory, file);
    if (isSymlink(path)) throw new Error(`legacy-type-is-symlink: ${path}`);
    let candidates: string[], guessed: string;
    if (isDirectory(path)) {
      if (!looksLikeTypeDirectory(path, file)) {
        looseDirs.push(path);
        continue;
      }
      candidates = isFile(join(path, AGENTS_FILE_NAME))
        ? [join(path, AGENTS_FILE_NAME)]
        : [];
      guessed = Object.keys(BUILTINS).find((n) => BUILTINS[n] === file) ?? file;
    } else if (/^[A-Z][A-Z0-9_]*\.md$/.test(file)) {
      candidates = [path];
      guessed = basename(path, extname(path)).toLowerCase();
    } else if (/^[a-z].+_.+\.md$/.test(file)) {
      flatCandidates.push(path);
      continue;
    } else {
      unclassified.push({ path, kind: "file", suggestion: FILE_SUGGESTION });
      continue;
    }
    for (const index of candidates) {
      if (isSymlink(index))
        throw new Error(`legacy-index-is-symlink: ${index}`);
      const text = readText(index);
      const hasEntries =
        text.includes("<!-- project-memory-entries:start -->") &&
        text.includes("<!-- project-memory-entries:end -->");
      if (!hasEntries && !(guessed in BUILTINS))
        throw new Error(`missing-entry-block: ${index}`);
      const fields = metadata(text),
        name = String(fields.name ?? guessed);
      if (!/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(name))
        throw new Error("invalid-type-name");
      if (name in BUILTINS && name !== guessed)
        throw new Error(`official-type-identity-path-conflict: ${name}`);
      if (["managed", "referenced"].includes(name))
        throw new Error(`new-builtin-name-collision: ${name}`);
      if (
        !(name in BUILTINS) &&
        (!("writable" in fields) || !("gitignore" in fields))
      )
        throw new Error(`ambiguous-custom-privileges: ${name}`);
      for (const flag of ["writable", "gitignore", "index-only"])
        if (flag in fields && typeof fields[flag] !== "boolean")
          throw new Error(`invalid-type-flag: ${flag}`);
      const writable = Boolean(fields.writable ?? name !== "agent_skills"),
        priv = Boolean(fields.gitignore ?? name === "user"),
        format = fields.format ?? (name in RENAMES ? "skills" : "ordinary");
      if ("index-only" in fields && writable === fields["index-only"])
        throw new Error("conflicting-index-only-flag");
      if (format !== "ordinary" && format !== "skills")
        throw new Error("unknown-type-format");
      if (name === "user" && !priv) throw new Error("user-must-remain-private");
      if (name === "skills" && (!writable || format !== "skills"))
        throw new Error("managed-requires-writable-skills");
      if (name === "agent_skills" && (writable || format !== "skills"))
        throw new Error("referenced-requires-index-only-skills");
      const defaultModule = name in RENAMES ? "skills" : "memory",
        module = fields.module ?? defaultModule;
      if (module !== "memory" && module !== "skills")
        throw new Error("unsupported-legacy-module");
      if (
        name in BUILTINS &&
        (module !== defaultModule ||
          (!(name in RENAMES) && format !== "ordinary"))
      )
        throw new Error("ambiguous-legacy-module");
      const directory = join(
        memory,
        isDirectory(path)
          ? file
          : (BUILTINS[name] ?? (name.endsWith("s") ? name : name + "s")),
      );
      const current = make({
          name,
          directory,
          indexes: [index],
          module,
          private: priv,
          writable,
          format,
          fields,
          synthetic: false,
        }),
        previous = groups.get(name);
      if (previous) {
        if (
          previous.directory !== directory ||
          JSON.stringify(previous.fields) !== JSON.stringify(fields) ||
          !fs.readFileSync(previous.indexes[0]!).equals(fs.readFileSync(index))
        )
          throw new Error(`legacy-index-conflict: ${name}`);
        previous.indexes.push(index);
      } else groups.set(name, current);
    }
  }
  const local = readText(join(scope, AGENTS_FILE_NAME)).match(
    /<!-- project-memory-local:start -->([\s\S]*?)<!-- project-memory-local:end -->/,
  )?.[1];
  if (local)
    for (const [name, dir] of Object.entries(BUILTINS)) {
      if (groups.has(name)) continue;
      const flat = `.memory/${name.toUpperCase()}.md`,
        nested = `.memory/${dir}/AGENTS.md`;
      if (local.includes(`](${flat})`) || local.includes(`](${nested})`))
        groups.set(
          name,
          make({
            name,
            directory: join(memory, dir),
            indexes: [
              join(scope, local.includes(`](${flat})`) ? flat : nested),
            ],
            module: name in RENAMES ? "skills" : "memory",
            private: name === "user",
            writable: name !== "agent_skills",
            format: name in RENAMES ? "skills" : "ordinary",
            fields: {},
            synthetic: true,
          }),
        );
    }
  for (const name of fs.readdirSync(memory)) {
    const path = join(memory, name);
    if (
      isDirectory(path) &&
      ![...groups.values()].some((t) => t.directory === path)
    ) {
      if (
        name === "users" &&
        (isFile(join(scope, typeIndexRelpath("user"))) ||
          isFile(join(scope, legacyTypeIndexRelpath("user"))))
      )
        groups.set(
          "user",
          make({
            name: "user",
            directory: path,
            indexes: [],
            module: "memory",
            private: true,
            writable: true,
            format: "ordinary",
            fields: {},
            synthetic: false,
          }),
        );
      else if (looksLikeTypeDirectory(path, name))
        throw new Error(`missing-type-index: ${path}`);
    }
  }
  const knownTypes = [...new Set([...Object.keys(BUILTINS), ...groups.keys()])];
  for (const path of flatCandidates) {
    const type = flatTypeOf(basename(path), knownTypes);
    if (type && type in BUILTINS && !groups.has(type))
      groups.set(
        type,
        make({
          name: type,
          directory: join(memory, BUILTINS[type]!),
          indexes: [],
          module: type in RENAMES ? "skills" : "memory",
          private: type === "user",
          writable: type !== "agent_skills",
          format: type in RENAMES ? "skills" : "ordinary",
          fields: {},
          synthetic: true,
        }),
      );
    const spec = type ? groups.get(type) : undefined;
    if (!spec) {
      unclassified.push({ path, kind: "file", suggestion: FILE_SUGGESTION });
      continue;
    }
    if (!spec.flatEntries.includes(path)) spec.flatEntries.push(path);
  }
  for (const spec of groups.values()) {
    const indexesAtRoot =
      spec.indexes.length === 0 ||
      spec.indexes.every((index) => dirname(index) === memory);
    spec.flatRoot = !isDirectory(spec.directory) && indexesAtRoot;
    if (spec.flatRoot && spec.indexes.length === 0 && spec.flatEntries.length) {
      spec.indexes.push(join(memory, `${spec.name.toUpperCase()}.md`));
      spec.synthetic = true;
    }
  }
  for (const path of looseDirs) {
    const dirName = basename(path);
    const hits: { spec: LegacyType; entry: string }[] = [];
    for (const spec of groups.values())
      for (const entry of entryTexts(spec))
        if (referencesAsset(entry.text, dirName))
          hits.push({ spec, entry: entry.path });
    const entries = [...new Set(hits.map((hit) => hit.entry))];
    if (entries.length === 1) {
      hits[0]!.spec.assetDirs.push({ source: path, entry: entries[0]! });
      continue;
    }
    unclassified.push({
      path,
      kind: "directory",
      suggestion:
        entries.length > 1
          ? `被这些条目同时引用：${entries.map((entry) => basename(entry)).join("、")}。一次只跟着一个条目迁移。请改成单一引用后再运行 edges memory migrate。目录会先挪到 .project-memory-migration/unclassified/，不阻断其余迁移。`
          : DIRECTORY_SUGGESTION,
    });
  }
  if ((options.strictUnclassified ?? true) && unclassified.length)
    throw new Error(
      `unclassified-legacy-path:\n${unclassified
        .map((item) => `${item.path}\n  ${item.suggestion}`)
        .join("\n")}`,
    );
  const result = [...groups.values()] as LegacyInventory;
  result.unclassified = unclassified;
  return result;
}
export function convertIndex(text: string, spec: LegacyType): string {
  const values = {
    name: spec.newName,
    module: spec.module,
    writable: String(spec.writable),
    gitignore: String(spec.private),
    format: spec.format,
  };
  const match = text.match(
    /<!-- project-memory-type:start -->\r?\n[\s\S]*?<!-- project-memory-type:end -->/,
  );
  if (match) {
    let block = match[0];
    for (const [key, value] of Object.entries(values)) {
      const pattern = new RegExp(`^${key}:.*$`, "m");
      block = pattern.test(block)
        ? block.replace(pattern, `${key}: ${value}`)
        : block.replace(END, `${key}: ${value}\n${END}`);
    }
    return text.replace(match[0], () => block);
  }
  return (
    START +
    "\n" +
    Object.entries(values)
      .map(([k, v]) => `${k}: ${v}\n`)
      .join("") +
    END +
    "\n\n" +
    text
  );
}
