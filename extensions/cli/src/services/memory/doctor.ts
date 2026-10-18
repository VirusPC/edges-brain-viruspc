import { canonicalPath, isWithinPath } from '../../utils/filesystem.js';
import { listTypeFiles } from './types.js';
import { AgentsNode } from "../../domain/models/agents/agents-node.js";
import { memoryNodes, prepareMemoryWrite } from './service.js';
import { NodeService } from '../node/node-service.js';
import { parseDocument } from '../../utils/markdown/document.js';
import * as fs from "node:fs";
import { join, dirname, relative } from "node:path";
import {
  LOCAL_START,
  extractLocalBlock,
  hasConstraintsMarker,
  insertInnerBlock,
} from "./blocks.js";
import {
  AGENTS_FILE_NAME,
  assertScopePath,
  isScope,
  isSymlink,
  readText,
  rejectLegacy,
  relativeOrName,
  resolveRoot,
  resolveTarget,
} from "./paths.js";
import {
  layerTypeSpecs,
  layerReadmePaths,
  selectedLocalBlock,
  localOwnershipPaths,
} from "./types.js";
import { ensureScopeReadme, linkScopeReadme } from "../init/service.js";
import {
  classifyAgentsSource,
  classifyAgentsFile,
  dropIndexEntries,
  readIndexEntries,
  syncIndexEntry,
  syncTargetAgents,
  ownershipTarget,
} from "./agents.js";
import {
  expectedIndexDocument,
  isSkillFormat,
  parseFrontmatter,
  refreshIndex,
} from "./entries.js";
export interface MemoryFinding {
  code: string;
  issue: string;
  path: string;
  detail: string;
  owner?: string;
  type?: string;
  entry?: string;
  description?: string;
}
const safeScope = (owner: string): boolean => {
  try {
    return isScope(owner);
  } catch {
    return false;
  }
};
export function* walkOwners(root: string): Generator<string> {
  function* walk(owner: string): Generator<string> {
    if (
      owner === root ||
      fs.existsSync(join(owner, AGENTS_FILE_NAME)) ||
      fs.existsSync(join(owner, ".memory")) ||
      ["memory", "skills"].some((m) =>
        fs.existsSync(join(owner, ".harness", m)),
      )
    )
      yield owner;
    for (const entry of fs
      .readdirSync(owner, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (
        !entry.isDirectory() ||
        entry.isSymbolicLink() ||
        (entry.name.startsWith(".") && entry.name !== ".harness") ||
        entry.name === "node_modules"
      )
        continue;
      const child = join(owner, entry.name);
      if (!fs.existsSync(join(child, ".git"))) yield* walk(child);
    }
  }
  yield* walk(root);
}
export const discoverMemoryDirs = (root: string) =>
  [...walkOwners(root)].filter(safeScope);
export const finding = (
  code: string,
  file: string,
  root: string,
  detail: string,
  extra: Partial<MemoryFinding> = {},
): MemoryFinding => ({
  code,
  issue: code,
  path: relativeOrName(file, root),
  detail,
  ...extra,
});
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
// Invalid composition documents block only their own subtree and operations
// relying on that subtree. Sibling scopes remain independently repairable.
const blockedBy = (directory: string, invalid: Set<string>) =>
  [...invalid].some((owner) => isWithinPath(directory, owner));
function validAnchors(
  target: string,
  root: string,
  invalid: Set<string>,
): string[] {
  return [...walkOwners(root)].filter((owner) => {
    if (blockedBy(owner, invalid) || !safeScope(owner)) return false;
    return new AgentsNode(join(owner, AGENTS_FILE_NAME))
      .parse(readText(join(owner, AGENTS_FILE_NAME)))
      .children.some(
        (entry) =>
          canonicalPath(entry.id) === canonicalPath(join(target, AGENTS_FILE_NAME)),
      );
  });
}
function validAnchor(
  target: string,
  root: string,
  invalid: Set<string>,
): string {
  const registered = validAnchors(target, root, invalid);
  if (registered.length) return registered[0]!;
  for (
    let owner = dirname(target);
    isWithinPath(owner, root);
    owner = dirname(owner)
  ) {
    if (!blockedBy(owner, invalid) && safeScope(owner)) return owner;
    if (owner === root) break;
  }
  return root;
}
export function collectFindings(root: string): MemoryFinding[] {
  const findings: MemoryFinding[] = [],
    invalid = new Set<string>(),
    owners = [...walkOwners(root)],
    scopes = new Set(owners.filter(safeScope));
  for (const owner of owners) {
    const file = join(owner, AGENTS_FILE_NAME);
    if (fs.existsSync(file))
      try {
        new AgentsNode(file).parse(readText(file)).validate();
      } catch (error) {
        invalid.add(owner);
        findings.push(
          finding(
            "invalid-entry",
            file,
            root,
            `${errorText(error)}; correct the document and rerun doctor; invalid index entries are not repaired automatically`,
          ),
        );
      }
  }
  for (const owner of owners) {
    if (blockedBy(owner, invalid)) continue;
    try {
      rejectLegacy(owner);
    } catch (error) {
      const code = errorText(error).includes("migration-required")
        ? "migration-required"
        : "unsafe-layout";
      findings.push(finding(code, owner, root, errorText(error)));
      continue;
    }
    let specs;
    try {
      specs = layerTypeSpecs(owner);
      assertScopePath(join(owner, AGENTS_FILE_NAME), owner);
    } catch (error) {
      findings.push(finding("unsafe-layout", owner, root, errorText(error)));
      continue;
    }
    if (!specs.length) continue;
    const agents = join(owner, AGENTS_FILE_NAME),
      state = classifyAgentsFile(agents);
    if (state !== "managed")
      findings.push(
        finding(
          state === "foreign" ? "foreign-agents" : "missing-agents",
          agents,
          root,
          "Attach managed blocks preserving manual text",
        ),
      );
    else {
      const text = readText(agents);
      if (!hasConstraintsMarker(text))
        findings.push(
          finding(
            "missing-important",
            agents,
            root,
            "Missing constraints block",
          ),
        );
      const block = extractLocalBlock(text);
      if (!block)
        findings.push(
          finding("outdated-local", agents, root, "Missing type list"),
        );
      else {
        const registered = layerReadmePaths(owner) ?? localOwnershipPaths(owner, text);
        for (const spec of specs)
          if (!registered.has(canonicalPath(join(owner, spec.indexFile))))
            findings.push(
              finding(
                "unregistered-type",
                join(owner, spec.indexFile),
                root,
                "Type is missing from scope list",
                { owner: relativeOrName(owner, root) },
              ),
            );
      }
    }
    for (const spec of specs) {
      const index = join(owner, spec.indexFile);
      if (!fs.existsSync(index)) {
        findings.push(
          finding(
            "missing-index",
            index,
            root,
            "Adopted type index is missing",
            { owner: relativeOrName(owner, root), type: spec.name },
          ),
        );
        continue;
      }
      let expected;
      try {
        expected = expectedIndexDocument(owner, spec.name);
        for (const entry of listTypeFiles(
          owner,
          spec.name,
          isSkillFormat(owner, spec.name) ? "*/SKILL.md" : `${spec.name}_*.md`,
        ))
          if (!parseFrontmatter(entry).description)
            findings.push(
              finding(
                "invalid-entry",
                entry,
                root,
                "Missing closed frontmatter or description; source left unchanged",
              ),
            );
      } catch (error) {
        findings.push(
          finding(
            errorText(error).includes("migration-required")
              ? "migration-required"
              : "source-scan-error",
            index,
            root,
            errorText(error),
          ),
        );
        continue;
      }
      if (readText(index) !== expected)
        findings.push(
          finding(
            "stale-index",
            index,
            root,
            "Rebuild entries from current source",
            { owner: relativeOrName(owner, root), type: spec.name },
          ),
        );
    }
    if (scopes.has(owner)) {
      const seen = new Set<string>();
      for (const [rel, description] of readIndexEntries(agents)) {
        if (seen.has(rel)) {
          findings.push(
            finding("duplicate", agents, root, rel, {
              entry: rel,
              description,
            }),
          );
          continue;
        }
        seen.add(rel);
        const target = ownershipTarget(owner, rel),
          child = target ? dirname(target) : "";
        if (child && blockedBy(child, invalid)) continue;
        if (!child || !safeScope(child) || isSymlink(child))
          findings.push(
            finding("dead-entry", agents, root, rel, { entry: rel }),
          );
      }
    }
  }
  for (const owner of [...scopes].sort()) {
    if (owner === root || blockedBy(owner, invalid)) continue;
    try {
      if (
        layerTypeSpecs(owner).length &&
        !validAnchors(owner, root, invalid).length
      )
        findings.push(
          finding(
            "unregistered",
            owner,
            root,
            "Register adopted Memory under an entry",
          ),
        );
    } catch {
      /* unsafe-layout was reported above */
    }
  }
  return findings;
}
export async function applyFindings(
  root: string,
  findings: MemoryFinding[],
): Promise<string[]> {
  const invalid = new Set(
    findings
      .filter(
        (f) => f.code === "invalid-entry" && f.path.endsWith(AGENTS_FILE_NAME),
      )
      .map((f) => dirname(join(root, f.path))),
  );
  const repaired: string[] = [],
    blocked = new Set(
      findings
        .filter((f) => ["migration-required", "unsafe-layout"].includes(f.code))
        .map((f) => join(root, f.path)),
    );
  for (const owner of walkOwners(root)) {
    if (blocked.has(owner) || blockedBy(owner, invalid)) continue;
    try {
      const specs = layerTypeSpecs(owner);
      if (!specs.length) continue;
      const file = assertScopePath(join(owner, AGENTS_FILE_NAME), owner);
      const service = memoryNodes(owner);
      const node = await service.get(prepareMemoryWrite(owner, file), AgentsNode);
      if (
        classifyAgentsSource(
          node?.body,
        ) === "foreign"
      ) {
        await service.update(
          node!, { body:
          insertInnerBlock(
            node!.body,
            LOCAL_START,
            selectedLocalBlock(specs),
          ) },
        );
      }
      const action = await syncTargetAgents(owner, root, service);
      if (action !== "preserved")
        repaired.push(`${action}-agents: ${relativeOrName(owner, root)}`);
      for (const spec of specs)
        try {
          if (blockedBy(dirname(join(owner, spec.indexFile)), invalid))
            continue;
          const action = await refreshIndex(owner, spec.name, service);
          if (action !== "preserved")
            repaired.push(`${action}-index: ${spec.indexFile}`);
        } catch {
          /* Keep old index on failed scan. */
        }
      await ensureScopeReadme(owner, service);
      for (const spec of specs) {
        const id = join(owner, spec.indexFile);
        if (!fs.existsSync(id)) continue;
        await linkScopeReadme(
          owner,
          {
            id,
            name: spec.indexFile,
            description: spec.description || spec.name,
          },
          service,
        );
      }
    } catch {
      /* Unsafe owners remain reported by the second scan. */
    }
  }
  const registrations = new Map<
    string,
    { anchor: string; description?: string }
  >();
  for (const item of findings)
    if (
      ["dead-entry", "misplaced", "duplicate"].includes(item.code) &&
      item.entry
    ) {
      const file = join(root, item.path);
      if (
        blocked.has(dirname(file)) ||
        blockedBy(dirname(file), invalid) ||
        blockedBy(dirname(join(dirname(file), item.entry)), invalid)
      )
        continue;
      assertScopePath(file, dirname(file));
      if (["misplaced", "duplicate"].includes(item.code))
        registrations.set(dirname(join(dirname(file), item.entry)), {
          anchor: dirname(file),
          description: item.description,
        });
      if (await dropIndexEntries(file, new Set([item.entry])))
        repaired.push(`removed-entry: ${item.entry}`);
    }
  // Repairs above may have created missing AGENTS for already-adopted types.
  // Re-read current eligibility; initial findings cannot inventory those nodes.
  for (const owner of discoverMemoryDirs(root)) {
    if (blockedBy(owner, invalid)) continue;
    if (owner === root || blocked.has(owner) || registrations.has(owner))
      continue;
    try {
      if (
        layerTypeSpecs(owner).length &&
        !validAnchors(owner, root, invalid).length
      )
        registrations.set(owner, { anchor: validAnchor(owner, root, invalid) });
    } catch {
      /* Unsafe owners remain reported by the second scan. */
    }
  }
  for (const [owner, { anchor, description }] of registrations) {
    if (
      owner === root ||
      blocked.has(owner) ||
      blocked.has(anchor) ||
      blockedBy(owner, invalid) ||
      blockedBy(anchor, invalid)
    )
      continue;
    // A surviving local edge already owns this node; dedup must not replace it.
    if (validAnchors(owner, root, invalid).length) continue;
    const [action, entry] = await syncIndexEntry(anchor, owner, description);
    if (!["preserved", "not-applicable", "needs-doctor", "missing-owner"].includes(action))
      repaired.push(`registered: ${entry}`);
  }
  return repaired;
}
export interface DoctorMemoryOptions {
  targetDir: string;
  rootDir?: string;
  apply?: boolean;
}
export async function doctorMemory(options: DoctorMemoryOptions) {
  const target = resolveTarget(options.targetDir);
  let root: string;
  try {
    root = resolveRoot(target, options.rootDir);
  } catch (error) {
    // A malformed root must be diagnosable without loading it as a runtime node.
    if (options.rootDir || !fs.existsSync(join(target, AGENTS_FILE_NAME)))
      throw error;
    root = target;
  }
  const applied = options.apply ?? false,
    findings = collectFindings(root),
    repaired = applied ? await applyFindings(root, findings) : [],
    remaining = applied ? collectFindings(root) : findings;
  return {
    operation: "doctor",
    rootDir: root,
    applied,
    memoryDirs: discoverMemoryDirs(root).map((p) => relativeOrName(p, root)),
    findings,
    repaired,
    remaining,
  };
}
