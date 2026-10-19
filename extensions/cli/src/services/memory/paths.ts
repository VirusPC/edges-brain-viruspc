import { ENTRY_NAMES } from "../../domain/config/layout.js";
import { isScope } from "../scope.js";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  expandHomePath,
  canonicalPath,
  isWithinPath,
  firstSymlink,
  findAncestor,
} from "../../utils/filesystem.js";
export const MEMORY_DIR_NAME = ".harness/memory";
export function readText(file: string): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    fs.readFileSync(file),
  );
}
export function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch (e) {
    if (["ENOENT", "ENOTDIR"].includes((e as NodeJS.ErrnoException).code ?? ""))
      return false;
    throw e;
  }
}
export function isDirectory(file: string): boolean {
  try {
    return fs.statSync(file).isDirectory();
  } catch (e) {
    if (["ENOENT", "ENOTDIR"].includes((e as NodeJS.ErrnoException).code ?? ""))
      return false;
    throw e;
  }
}
export function isSymlink(file: string): boolean {
  try {
    return fs.lstatSync(file).isSymbolicLink();
  } catch (e) {
    if (["ENOENT", "ENOTDIR"].includes((e as NodeJS.ErrnoException).code ?? ""))
      return false;
    throw e;
  }
}
export function ownershipTarget(
  owner: string,
  href: string,
): string | undefined {
  if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(href)) return undefined;
  try {
    return canonicalPath(
      path.resolve(owner, decodeURIComponent(href.split(/[?#]/, 1)[0]!)),
    );
  } catch {
    return undefined;
  }
}
export function assertOwned(file: string, owner: string): string {
  if (!isWithinPath(file, owner))
    throw new Error(`Path is outside selected owner: ${file}`);
  if (!isWithinPath(canonicalPath(file), canonicalPath(owner)))
    throw new Error(`Path resolves outside selected owner: ${file}`);
  return file;
}
export function assertScopePath(file: string, target: string): string {
  assertOwned(file, target);
  const linked = firstSymlink(file, target);
  if (linked) throw new Error(`Managed path contains a symbolic link: ${linked}`);
  return file;
}
export function rejectLegacy(target: string): void {
  if (
    fs.existsSync(path.join(target, ".memory")) ||
    (isFile(path.join(target, ENTRY_NAMES.internal)) &&
      readText(path.join(target, ENTRY_NAMES.internal)).includes("](.memory/"))
  )
    throw new Error(
      "migration-required: run edges memory migrate --dry-run, then edges memory migrate",
    );
}
export function resolveTarget(raw: string): string {
  const target = canonicalPath(
    expandHomePath(raw),
  );
  if (!isDirectory(target))
    throw new Error(`目标目录不存在或不是目录: ${target}`);
  return target;
}
export function ancestors(start: string): string[] {
  const result = [start];
  while (path.dirname(start) !== start) {
    start = path.dirname(start);
    result.push(start);
  }
  return result;
}
export { isScope } from "../scope.js";
export function resolveRoot(target: string, rawRoot?: string): string {
  if (rawRoot) {
    const root = resolveTarget(rawRoot);
    if (!isWithinPath(target, root))
      throw new Error(`root-dir 必须是 target-dir 的祖先目录: ${root}`);
    const crossed = findAncestor(target,
      directory => directory !== root && fs.existsSync(path.join(directory, ".git")),
      directory => directory === root);
    if (crossed) throw new Error("root-dir cannot cross another Git root or submodule");
    return root;
  }
  return (
    findAncestor(target, p => fs.existsSync(path.join(p, ".git"))) ??
    findAncestor(target, isScope) ??
    target
  );
}
export const memoryDir = (target: string) => path.join(target, MEMORY_DIR_NAME);
export const moduleForType = (name: string): "memory" | "skills" =>
  ["managed", "referenced"].includes(name) ? "skills" : "memory";
export const typeDirName = (name: string) =>
  ["managed", "referenced"].includes(name) || name.endsWith("s")
    ? name
    : `${name}s`;
export const typeFromDirName = (name: string) =>
  (
    ({
      users: "user",
      feedbacks: "feedback",
      projects: "project",
      references: "reference",
    }) as Record<string, string>
  )[name] ?? name;
export const AGENTS_FILE_NAME = ENTRY_NAMES.internal;
export const TYPE_INDEX_FILE_NAME = ENTRY_NAMES.readme;
export const typeIndexRelpath = (name: string, module = moduleForType(name)) =>
  `.harness/${module}/${typeDirName(name)}/${TYPE_INDEX_FILE_NAME}`;
/** Pre-migration type indexes lived in AGENTS.md; reads accept them until the directory is split. */
export const legacyTypeIndexRelpath = (name: string, module = moduleForType(name)) =>
  `.harness/${module}/${typeDirName(name)}/${AGENTS_FILE_NAME}`;
export const isExternalType = (name: string) => name === "referenced";
export const relativeOrName = (file: string, root: string) =>
  isWithinPath(file, root) ? path.relative(root, file) || "." : path.basename(file);
export const relativeLink = (file: string, base: string) =>
  path.relative(base, file).split(path.sep).join("/");
