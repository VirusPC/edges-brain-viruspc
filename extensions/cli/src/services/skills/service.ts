import path from "node:path";
import { materialHarnessRoot } from "../../domain/config/harness-materials.js";
import { initScope, type InitScopeOptions } from "../init/service.js";
import { ENTRY_NAMES } from "../../domain/config/layout.js";
import { SkillNode } from "../../domain/models/skills/skill-node.js";
import { isWithinPath } from "../../utils/filesystem.js";
import { parseMetadata } from "../metadata.js";
import { openNodeSession, scopeRelativePath } from "../node/scope-session.js";
import { buildSystemForest } from "../node/system-forest-service.js";
import { scopeTraversal } from "../../domain/operations/traverse.js";
import type { NodeService } from "../node/node-service.js";

export { presentListed } from "../list-query.js";

export type SkillReach = {
  all?: boolean;
  super?: boolean;
  withComposed?: boolean;
};

export type SkillFields = {
  description?: string;
  body?: string;
  metadata?: string[];
};

export type SkillItem = {
  name: string;
  path: string;
  description: string;
};

export function managedSkillFile(scope: string, name: string, superRoot: boolean): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 64) {
    throw new Error(`${name}: name must be lowercase kebab-case, 1–64 characters.`);
  }
  const harness = materialHarnessRoot(scope, { super: superRoot });
  return path.join(harness, "skills", "managed", name, ENTRY_NAMES.skill);
}

async function listedSkills(
  env: NodeJS.ProcessEnv,
  reach: SkillReach,
): Promise<SkillNode[]> {
  const { scope, service } = openNodeSession(env);
  const nodes = reach.all
    ? (await buildSystemForest(scope, { includeSuper: reach.super === true, withComposed: reach.withComposed === true, form: "independent" })).flat()
    : await service
      .query(scope, { types: ["skill"], ...scopeTraversal(reach) })
      .value();
  return nodes.filter((node): node is SkillNode => node instanceof SkillNode);
}

export async function resolveSkill(
  env: NodeJS.ProcessEnv,
  target: string,
  reach: SkillReach,
): Promise<{ scope: string; service: NodeService; node: SkillNode }> {
  const { scope, managedRoot, service } = openNodeSession(env);
  const looksPath = target.includes("/") || target.endsWith(ENTRY_NAMES.skill);
  if (looksPath) {
    const abs = path.resolve(scope, target);
    if (!isWithinPath(abs, managedRoot) || path.basename(abs) !== ENTRY_NAMES.skill) {
      throw new Error(`skill not found: ${target}`);
    }
    const node = await service.get(abs, SkillNode);
    if (!node) throw new Error(`skill not found: ${target}`);
    return { scope, service, node };
  }
  const matches = (await listedSkills(env, reach)).filter((node) => node.name === target);
  if (matches.length !== 1) {
    throw new Error(matches.length === 0 ? `skill not found: ${target}` : `skill name is ambiguous: ${target}`);
  }
  const node = await service.get(matches[0]!.path, SkillNode);
  if (!node) throw new Error(`skill not found: ${target}`);
  return { scope, service, node };
}

export async function createManagedSkill(
  env: NodeJS.ProcessEnv,
  input: { name: string; description: string; body?: string; metadata?: string[]; super?: boolean },
): Promise<{ name: string; path: string }> {
  if (!input.description.trim()) throw new Error("description must be nonempty");
  const metadata = parseMetadata(input.metadata);
  const { scope, service } = openNodeSession(env);
  const file = managedSkillFile(scope, input.name, input.super === true);
  const node = new SkillNode(file);
  await service.create(node, {
    name: input.name,
    description: input.description,
    body: input.body ?? "",
    ...(metadata ? { metadata } : {}),
  });
  return { name: input.name, path: scopeRelativePath(scope, file) };
}

export async function getSkill(
  env: NodeJS.ProcessEnv,
  target: string,
  reach: SkillReach,
): Promise<{ name: string | undefined; path: string; description: string | undefined; body: string }> {
  const { scope, node } = await resolveSkill(env, target, reach);
  return {
    name: node.name,
    path: scopeRelativePath(scope, node.path),
    description: node.description,
    body: node.body,
  };
}

export async function updateSkill(
  env: NodeJS.ProcessEnv,
  target: string,
  input: SkillFields,
  reach: SkillReach,
): Promise<{ name: string | undefined; path: string }> {
  const metadata = parseMetadata(input.metadata);
  if (input.description === undefined && input.body === undefined && metadata === undefined) {
    throw new Error("update must be --description, --body, or --metadata");
  }
  const { scope, service, node } = await resolveSkill(env, target, reach);
  const updated = await service.update(node, {
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.body !== undefined ? { body: input.body } : {}),
    ...(metadata ? { metadata } : {}),
  });
  return { name: updated.name, path: scopeRelativePath(scope, updated.path) };
}

export async function deleteSkill(
  env: NodeJS.ProcessEnv,
  target: string,
  reach: SkillReach,
): Promise<{ path: string }> {
  const { scope, service, node } = await resolveSkill(env, target, reach);
  const file = node.path;
  await service.destroy(node);
  return { path: scopeRelativePath(scope, file) };
}

export function initSkills(options: Omit<InitScopeOptions, "modules">) {
  return initScope({ ...options, modules: ["skills"] });
}

export async function listSkills(env: NodeJS.ProcessEnv, reach: SkillReach): Promise<SkillItem[]> {
  const { scope, service } = openNodeSession(env);
  const nodes = reach.all
    ? (await buildSystemForest(scope, { includeSuper: reach.super === true, withComposed: reach.withComposed === true, form: "independent" })).flat()
    : await service
      .query(scope, { types: ["skill"], ...scopeTraversal(reach) })
      .value();
  return nodes.flatMap((node) => node instanceof SkillNode ? [{
    name: node.name ?? "",
    path: scopeRelativePath(scope, node.path),
    description: node.description ?? "",
  }] : []);
}
