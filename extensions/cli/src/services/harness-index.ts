import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { AgentsNode } from "../domain/models/internal/agents-node.js";
import { ReadmeNode } from "../domain/models/readme/readme-node.js";
import type { NodeReference } from "../domain/models/core/types.js";
import {
  HARNESS_INDEX_DESCRIPTION,
  HARNESS_INDEX_NAME,
  harnessIndexPath,
  harnessIndexSeed,
} from "../domain/harness-index.js";
import { identifyNodeType, isHarnessMaterial, resolveHref } from "../domain/models/layout.js";
import { extractLocalBlock } from "../domain/models/internal/blocks.js";
import { NodeService } from "./node/node-service.js";
import { AGENTS_FILE_NAME, isScope } from "./memory/paths.js";
import { memoryNodes } from "./memory/service.js";

const LIST_ITEM =
  /^[-*+] \[([^\]]*)\]\((<[^>]+>|[^)\s]+)\)(?:\s*[—–-]\s*(.*?))?\s*$/;

export async function ensureHarnessReadme(
  scopeDir: string,
  service: NodeService,
): Promise<"created" | "preserved"> {
  const file = harnessIndexPath(scopeDir);
  if (existsSync(file)) return "preserved";
  await service.create(new ReadmeNode(file), { body: harnessIndexSeed() });
  return "created";
}

export async function ensureAgentsPointer(
  scopeDir: string,
  service: NodeService,
): Promise<void> {
  const agents = await service.get(join(scopeDir, AGENTS_FILE_NAME), AgentsNode);
  if (!agents) return;
  const index = harnessIndexPath(scopeDir);
  if (agents.localChildren.some((child) => child.id === index)) return;
  await service.update(agents, {
    localChildren: [
      ...agents.localChildren,
      {
        id: index,
        name: HARNESS_INDEX_NAME,
        description: HARNESS_INDEX_DESCRIPTION,
      },
    ],
    descendantChildren: [...agents.descendantChildren],
  });
}

/** Add or fill a material entry on `.harness/README.md`. Does not overwrite an existing description. */
export async function registerMaterial(
  scopeDir: string,
  reference: NodeReference,
  service: NodeService,
): Promise<void> {
  await ensureHarnessReadme(scopeDir, service);
  const index = harnessIndexPath(scopeDir);
  const node = await service.get(index, ReadmeNode);
  if (!node) throw new Error(`Missing harness index: ${index}`);
  const existing = node.localChildren.find((child) => child.id === reference.id);
  if (!existing) {
    await service.update(node, {
      localChildren: [...node.localChildren, reference],
      descendantChildren: [...node.descendantChildren],
    });
    return;
  }
  const name = existing.name ?? reference.name;
  const description = existing.description ?? reference.description;
  if (name === existing.name && description === existing.description) return;
  await service.update(node, {
    localChildren: node.localChildren.map((child) =>
      child.id === reference.id
        ? {
            ...child,
            ...(name === undefined ? {} : { name }),
            ...(description === undefined ? {} : { description }),
          }
        : child,
    ),
    descendantChildren: [...node.descendantChildren],
  });
}

function listItemHref(line: string): { href: string; label: string; description?: string } | undefined {
  const match = line.match(LIST_ITEM);
  if (!match) return undefined;
  let href = match[2]!;
  if (href.startsWith("<") && href.endsWith(">")) href = href.slice(1, -1);
  href = href.split(/[?#]/, 1)[0]!;
  const description = match[3]?.trim();
  return {
    href,
    label: match[1] ?? "",
    ...(description ? { description } : {}),
  };
}

/** Harness materials live under `<scope>/.harness/`. Content leaves and system entries stay on AGENTS. */
function isLayerMaterial(scopeDir: string, id: string): boolean {
  const rel = relative(scopeDir, id).split(sep).join("/");
  if (rel === ".harness/README.md") return false;
  if (rel === ".harness" || rel.startsWith(".harness/")) return true;
  return isHarnessMaterial(id);
}

function unparsedLocalMaterials(agents: AgentsNode): NodeReference[] {
  const block = extractLocalBlock(agents.body);
  if (!block) return [];
  const known = new Set(agents.localChildren.map((child) => child.id));
  const index = harnessIndexPath(agents.directoryPath);
  const out: NodeReference[] = [];
  for (const line of block.split("\n")) {
    const item = listItemHref(line);
    if (!item) continue;
    const id = resolveHref(agents.path, item.href);
    if (!id || id === index || known.has(id)) continue;
    if (!identifyNodeType(id) || !isLayerMaterial(agents.directoryPath, id)) continue;
    out.push({
      id,
      ...(item.label ? { name: item.label } : {}),
      ...(item.description ? { description: item.description } : {}),
    });
  }
  return out;
}

function stripMovedListLines(source: string, agentsPath: string, moved: ReadonlySet<string>): string {
  const block = extractLocalBlock(source);
  if (!block) return source;
  const next = block
    .split("\n")
    .filter((line) => {
      const item = listItemHref(line);
      if (!item) return true;
      const id = resolveHref(agentsPath, item.href);
      return !id || !moved.has(id);
    })
    .join("\n");
  if (next === block) return source;
  return source.replace(block, () => next);
}

export function harnessIndexDrift(scopeDir: string): {
  moves: string[];
  needsReadme: boolean;
  needsPointer: boolean;
} {
  const empty = { moves: [] as string[], needsReadme: false, needsPointer: false };
  if (!isScope(scopeDir)) return empty;
  const agentsPath = join(scopeDir, AGENTS_FILE_NAME);
  if (!existsSync(agentsPath)) return empty;
  let agents: AgentsNode;
  try {
    agents = new AgentsNode(agentsPath).parse(readFileSync(agentsPath, "utf8"));
  } catch {
    return empty;
  }
  const index = harnessIndexPath(scopeDir);
  return {
    moves: [
      ...agents.localChildren.filter(
        (child) => child.id !== index && isLayerMaterial(scopeDir, child.id),
      ),
      ...unparsedLocalMaterials(agents),
    ].map((child) => child.id),
    needsReadme: !existsSync(index),
    needsPointer: !agents.localChildren.some((child) => child.id === index),
  };
}

function materialLine(indexFile: string, reference: NodeReference): string {
  const href = relative(dirname(indexFile), reference.id).split(sep).join("/");
  const label = reference.name ?? href;
  const description = reference.description ? ` — ${reference.description}` : "";
  return `- [${label}](<${href}>)${description}`;
}

/** Private type indexes may be gitignored and absent in a public checkout. Keep the link without a graph walk. */
function appendAbsentMaterials(indexFile: string, missing: readonly NodeReference[]): void {
  if (!missing.length) return;
  let text = readFileSync(indexFile, "utf8");
  const fresh = missing.filter((child) => {
    const href = relative(dirname(indexFile), child.id).split(sep).join("/");
    return !text.includes(href);
  });
  if (!fresh.length) return;
  const end = "<!-- project-entries-local:end -->";
  if (!text.includes(end)) throw new Error(`Missing entries block: ${indexFile}`);
  const block = fresh.map((child) => materialLine(indexFile, child)).join("\n");
  text = text.replace(end, () => `${block}\n${end}`);
  writeFileSync(indexFile, text.endsWith("\n") ? text : `${text}\n`);
}

export async function migrateScopeMaterialIndex(
  scopeDir: string,
  service: NodeService = memoryNodes(scopeDir),
): Promise<{ moved: string[] }> {
  if (!isScope(scopeDir)) return { moved: [] };
  await ensureHarnessReadme(scopeDir, service);
  const agentsPath = join(scopeDir, AGENTS_FILE_NAME);
  const agents = await service.get(agentsPath, AgentsNode);
  if (!agents) return { moved: [] };
  const index = harnessIndexPath(scopeDir);
  const moving = [
    ...agents.localChildren.filter(
      (child) => child.id !== index && isLayerMaterial(scopeDir, child.id),
    ),
    ...unparsedLocalMaterials(agents),
  ];
  const present = moving.filter((child) => existsSync(child.id));
  const absent = moving.filter((child) => !existsSync(child.id));
  for (const child of present) await registerMaterial(scopeDir, child, service);
  appendAbsentMaterials(index, absent);
  const movedIds = new Set(moving.map((child) => child.id));
  const kept = agents.localChildren.filter((child) => !movedIds.has(child.id));
  if (!kept.some((child) => child.id === index)) {
    kept.unshift({
      id: index,
      name: HARNESS_INDEX_NAME,
      description: HARNESS_INDEX_DESCRIPTION,
    });
  }
  const sameChildren =
    agents.localChildren.length === kept.length &&
    agents.localChildren.every(
      (child, i) =>
        child.id === kept[i]?.id &&
        child.name === kept[i]?.name &&
        child.description === kept[i]?.description,
    );
  let source = readFileSync(agentsPath, "utf8");
  if (!sameChildren) {
    const draft = new AgentsNode(agents.path).parse(source);
    draft.update(
      { localChildren: kept, descendantChildren: [...agents.descendantChildren] },
      { operation: "update" },
    );
    source = draft.serialize();
  }
  source = stripMovedListLines(source, agents.path, movedIds);
  const before = readFileSync(agentsPath, "utf8");
  if (source !== before) writeFileSync(agentsPath, source.endsWith("\n") ? source : `${source}\n`);
  return { moved: moving.map((child) => child.id) };
}
