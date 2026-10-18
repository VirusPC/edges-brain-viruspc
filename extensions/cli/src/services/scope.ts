import { existsSync, lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { discoverDirectories, findAncestor } from '../utils/filesystem.js';
import { ENTRY_NAMES } from "../domain/config/layout.js";
import { AgentsNode } from "../domain/models/agents/agents-node.js";

export function isScope(dir: string): boolean {
  const file = path.join(path.resolve(dir), ENTRY_NAMES.internal);
  let node: AgentsNode | undefined;
  try { if (lstatSync(file).isFile()) node = new AgentsNode(file).parse(readFileSync(file, 'utf8')); }
  catch (error) { if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error; }
  return node !== undefined;
}

export function isGitBoundary(directory: string): boolean {
  return existsSync(path.join(directory, '.git'));
}

export function gitRoot(start: string): string | undefined {
  return findAncestor(path.resolve(start), isGitBoundary);
}

export class ScopeResolutionError extends Error {
  readonly errorCode = 'VALIDATION_ERROR';
  constructor() {
    super('No owning scope or Git repository found. Pass --scope <directory> or set EDGES_SCOPE.');
    this.name = 'ScopeResolutionError';
  }
}

export function resolveScope(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd(), explicit?: string): string {
  const target = explicit ?? (env.EDGES_SCOPE?.trim() || env.EDGES_REPO?.trim());
  if (target) return path.resolve(cwd, target);
  const found = findAncestor(path.resolve(cwd), dir => isScope(dir) || isGitBoundary(dir));
  if (!found) throw new ScopeResolutionError();
  return found;
}

/** CLI inventory policy. Logical child-index traversal is a separate core operation. */
export function discoverScopes(root: string): string[] {
  root = path.resolve(root);
  const ignored = new Set(['.git', 'node_modules', '.superpowers', 'dist', '_site']);
  const directories = discoverDirectories(root, dir => !ignored.has(path.basename(dir)) && !isGitBoundary(dir));
  return [root, ...directories.filter(dir => dir !== root && isScope(dir))];
}

export function portableScope(scopeDir: string, fallbackRoot = scopeDir): string {
  return path.relative(gitRoot(scopeDir) ?? fallbackRoot, scopeDir).split(path.sep).join('/') || '.';
}
