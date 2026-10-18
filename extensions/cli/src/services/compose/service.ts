import { execFile } from "node:child_process";
import { existsSync, lstatSync, mkdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { AgentsNode } from "../../domain/models/index.js";
import { ENTRY_NAMES } from "../../domain/config/layout.js";
import type { ComposeCheckout, ComposeEntry } from "../../domain/models/compose/compose-node.js";
import { openNodeSession } from "../node/scope-session.js";
import type { NodeService } from "../node/node-service.js";

const execFileAsync = promisify(execFile);

export type ComposeGitAction = "cloned" | "present" | "pulled" | "pushed";

export interface ComposeGitReport {
  name: string;
  directory: string;
  remote?: string;
  action: ComposeGitAction;
}

export interface ComposeRegisterInput {
  name: string;
  /** Local directory. Omitted directories use `~/.edges/composed/<name>`. */
  directory?: string;
  description?: string;
  remote?: string;
}

async function git(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const err = error as { stderr?: string; stdout?: string; message?: string };
    throw new Error(
      (err.stderr || err.stdout || err.message || "git failed").trim(),
    );
  }
}

async function loadScope(env: NodeJS.ProcessEnv): Promise<{
  service: NodeService;
  node: AgentsNode;
}> {
  const { scope, service } = openNodeSession(env);
  const file = path.join(scope, ENTRY_NAMES.internal);
  const node = await service.get(file, AgentsNode);
  if (!node) throw new Error(`Missing scope entry: ${file}. Add AGENTS.md.`);
  return { service, node };
}

function checkouts(node: AgentsNode, name?: string): ComposeCheckout[] {
  const compose = node.composeNode();
  if (name === undefined) return compose.entries().map((entry) => compose.checkout(entry.name));
  return [compose.checkout(name)];
}

function sameRemote(left: string, right: string): boolean {
  const norm = (value: string) =>
    value.trim().replace(/\/+$/, "").replace(/\.git$/i, "");
  return norm(left) === norm(right);
}

async function isGitCheckout(directory: string): Promise<boolean> {
  if (!existsSync(directory)) return false;
  try {
    if (!lstatSync(directory).isDirectory()) return false;
    return (await git(["-C", directory, "rev-parse", "--is-inside-work-tree"])).trim() === "true";
  } catch {
    return false;
  }
}

async function requireCheckout(entry: ComposeCheckout): Promise<void> {
  if (!(await isGitCheckout(entry.directory)))
    throw new Error(`Compose checkout is missing: ${entry.name}`);
}

export async function listCompose(
  env: NodeJS.ProcessEnv,
): Promise<ComposeEntry[]> {
  const { node } = await loadScope(env);
  return node.composeNode().entries();
}

export async function registerCompose(
  env: NodeJS.ProcessEnv,
  input: ComposeRegisterInput,
): Promise<ComposeEntry> {
  const { service, node } = await loadScope(env);
  const name = input.name.trim();
  node.composeNode().addChild({
    name,
    ...(input.directory === undefined ? {} : { directory: input.directory }),
    description: input.description,
    remote: input.remote,
  });
  await service.update(node, {});
  const saved = await service.get(node.path, AgentsNode);
  const entry = saved?.composeNode().entries().find((item) => item.name === name);
  if (!entry) throw new Error(`Compose entry was not saved: ${name}`);
  return entry;
}

export async function unregisterCompose(
  env: NodeJS.ProcessEnv,
  name: string,
): Promise<ComposeEntry> {
  const { service, node } = await loadScope(env);
  const trimmed = name.trim();
  const entry = node.composeNode().entries().find((item) => item.name === trimmed);
  if (!entry) throw new Error(`Compose entry not found: ${trimmed || name}`);
  node.composeNode().removeChild(entry.id);
  await service.update(node, {});
  return entry;
}

export async function cloneCompose(
  env: NodeJS.ProcessEnv,
  name?: string,
): Promise<ComposeGitReport[]> {
  const { node } = await loadScope(env);
  const reports: ComposeGitReport[] = [];
  for (const entry of checkouts(node, name)) {
    if (!entry.remote)
      throw new Error(`Compose entry has no git remote: ${entry.name}`);
    if (await isGitCheckout(entry.directory)) {
      let origin = "";
      try {
        origin = (await git(["-C", entry.directory, "remote", "get-url", "origin"])).trim();
      } catch {
        throw new Error(`Compose checkout has no origin: ${entry.directory}`);
      }
      if (!sameRemote(origin, entry.remote))
        throw new Error(
          `Compose checkout origin does not match the registered remote: ${entry.name}`,
        );
      reports.push({
        name: entry.name,
        directory: entry.directory,
        remote: entry.remote,
        action: "present",
      });
      continue;
    }
    if (existsSync(entry.directory))
      throw new Error(
        `Compose path exists and is not a git checkout: ${entry.directory}`,
      );
    mkdirSync(path.dirname(entry.directory), { recursive: true });
    await git(["clone", entry.remote, entry.directory]);
    reports.push({
      name: entry.name,
      directory: entry.directory,
      remote: entry.remote,
      action: "cloned",
    });
  }
  return reports;
}

export async function pullCompose(
  env: NodeJS.ProcessEnv,
  name?: string,
): Promise<ComposeGitReport[]> {
  const { node } = await loadScope(env);
  const reports: ComposeGitReport[] = [];
  for (const entry of checkouts(node, name)) {
    await requireCheckout(entry);
    await git(["-C", entry.directory, "pull"]);
    reports.push({
      name: entry.name,
      directory: entry.directory,
      remote: entry.remote,
      action: "pulled",
    });
  }
  return reports;
}

export async function pushCompose(
  env: NodeJS.ProcessEnv,
  name?: string,
): Promise<ComposeGitReport[]> {
  const { node } = await loadScope(env);
  const reports: ComposeGitReport[] = [];
  for (const entry of checkouts(node, name)) {
    await requireCheckout(entry);
    await git(["-C", entry.directory, "push"]);
    reports.push({
      name: entry.name,
      directory: entry.directory,
      remote: entry.remote,
      action: "pushed",
    });
  }
  return reports;
}
