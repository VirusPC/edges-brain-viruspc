import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { placeHarnessMaterial } from "../../domain/config/harness-materials.js";
import { AgentsNode } from "../../domain/models/agents/agents-node.js";
import type { NodeReference } from "../../domain/core/types.js";
import { identifyNodeType, isHarnessMaterial, resolveHref } from "../../domain/models/node/layout.js";
import { extractLocalBlock } from "../../domain/models/node/document.js";
import { NodeService } from "../node/node-service.js";
import { AGENTS_FILE_NAME, isScope } from "../memory/paths.js";
import { memoryNodes } from "../memory/service.js";
import {
  SCOPE_README_ENTRY_DESCRIPTION,
  SCOPE_README_ENTRY_NAME,
} from "./modules.js";

const LIST_ITEM =
  /^[-*+] \[([^\]]*)\]\((<[^>]+>|[^)\s]+)\)(?:\s*[—–-]\s*(.*?))?\s*$/;

function scopeReadmePath(scopeDir: string): string {
  return placeHarnessMaterial(scopeDir, "readme").absPath;
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

/** Materials under `<scope>/.harness/`. Content leaves and other system entries stay on AGENTS. */
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
  const readme = scopeReadmePath(agents.directoryPath);
  const out: NodeReference[] = [];
  for (const line of block.split("\n")) {
    const item = listItemHref(line);
    if (!item) continue;
    const id = resolveHref(agents.path, item.href);
    if (!id || id === readme || known.has(id)) continue;
    if (!identifyNodeType(id) || !isLayerMaterial(agents.directoryPath, id)) continue;
    out.push({
      id,
      ...(item.label ? { name: item.label } : {}),
      ...(item.description ? { description: item.description } : {}),
    });
  }
  return out;
}

function materialsToMove(scopeDir: string, agents: AgentsNode): NodeReference[] {
  const readme = scopeReadmePath(scopeDir);
  return [
    ...agents.localChildren.filter(
      (child) => child.id !== readme && isLayerMaterial(scopeDir, child.id),
    ),
    ...unparsedLocalMaterials(agents),
  ];
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

function materialLine(readmeFile: string, reference: NodeReference): string {
  const href = relative(dirname(readmeFile), reference.id).split(sep).join("/");
  const label = reference.name ?? href;
  const description = reference.description ? ` — ${reference.description}` : "";
  return `- [${label}](<${href}>)${description}`;
}

/** Gitignored type indexes may be absent in a public checkout. Keep the link without a graph walk. */
function appendAbsentMaterials(readmeFile: string, missing: readonly NodeReference[]): void {
  if (!missing.length) return;
  let text = readFileSync(readmeFile, "utf8");
  const fresh = missing.filter((child) => {
    const href = relative(dirname(readmeFile), child.id).split(sep).join("/");
    return !text.includes(href);
  });
  if (!fresh.length) return;
  const end = "<!-- project-entries-local:end -->";
  if (!text.includes(end)) throw new Error(`Missing entries block: ${readmeFile}`);
  const block = fresh.map((child) => materialLine(readmeFile, child)).join("\n");
  text = text.replace(end, () => `${block}\n${end}`);
  writeFileSync(readmeFile, text.endsWith("\n") ? text : `${text}\n`);
}

export type ScopeReadmeMigration = {
  moved: string[];
  createdReadme: boolean;
  addedPointer: boolean;
};

/**
 * Move this scope's `.harness/` material links from AGENTS 本层 onto `.harness/README.md`.
 * `write: false` only reports what would change.
 */
export async function migrateScopeMaterialIndex(
  scopeDir: string,
  options: { write?: boolean; service?: NodeService } = {},
): Promise<ScopeReadmeMigration> {
  const empty = { moved: [] as string[], createdReadme: false, addedPointer: false };
  if (!isScope(scopeDir)) return empty;
  const agentsPath = join(scopeDir, AGENTS_FILE_NAME);
  if (!existsSync(agentsPath)) return empty;
  let agents: AgentsNode;
  try {
    agents = new AgentsNode(agentsPath).parse(readFileSync(agentsPath, "utf8"));
  } catch {
    return empty;
  }
  const readme = scopeReadmePath(scopeDir);
  const moving = materialsToMove(scopeDir, agents);
  const createdReadme = !existsSync(readme);
  const addedPointer = !agents.localChildren.some((child) => child.id === readme);
  const report = {
    moved: moving.map((child) => child.id),
    createdReadme,
    addedPointer,
  };
  if (options.write === false || (!moving.length && !createdReadme && !addedPointer)) return report;

  const service = options.service ?? memoryNodes(scopeDir);
  const { ensureScopeReadme, linkScopeReadme } = await import("./service.js");
  await ensureScopeReadme(scopeDir, service);
  const present = moving.filter((child) => existsSync(child.id));
  const absent = moving.filter((child) => !existsSync(child.id));
  for (const child of present) await linkScopeReadme(scopeDir, child, service);
  appendAbsentMaterials(readme, absent);
  const movedIds = new Set(report.moved);
  const kept = agents.localChildren.filter((child) => !movedIds.has(child.id));
  if (!kept.some((child) => child.id === readme)) {
    kept.unshift({
      id: readme,
      name: SCOPE_README_ENTRY_NAME,
      description: SCOPE_README_ENTRY_DESCRIPTION,
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
  return report;
}
