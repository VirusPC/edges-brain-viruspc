import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { placeHarnessMaterial } from "../../domain/config/harness-materials.js";
import { AgentsNode } from "../../domain/models/agents/agents-node.js";
import { ReadmeNode } from "../../domain/models/readme/readme-node.js";
import type { NodeReference } from "../../domain/core/types.js";
import { parseDocument } from "../../utils/markdown/document.js";
import { NodeService } from "../node/node-service.js";
import {
  findIndexAnchor,
  syncIndexEntry,
  syncTargetAgents,
} from "../memory/agents.js";
import { loadAgentsTemplate } from "../memory/blocks.js";
import { refreshIndex, typeIndexNode } from "../memory/entries.js";
import { assertPrivateIgnored } from "../memory/ignore.js";
import {
  AGENTS_FILE_NAME,
  assertScopePath,
  memoryDir,
  rejectLegacy,
  resolveRoot,
  resolveTarget,
} from "../memory/paths.js";
import { memoryNodes, prepareMemoryWrite } from "../memory/service.js";
import { resolveScope } from "../scope.js";
import { readIndexTemplate } from "../memory/templates.js";
import {
  MEMORY_TYPE_NAMES,
  SKILL_TYPE_NAMES,
  ensureTypeGitignore,
  findGitRoot,
  layerTypeSpecs,
  seedSpec,
  typeIndexTemplateName,
  type TypeSpec,
} from "../memory/types.js";
import type { InitMemoryOptions } from "../memory/init.js";
import {
  DEFAULT_INIT_MODULES,
  DEFAULT_PUBLIC_MEMORY_TYPES,
  HARNESS_BOARD_MODULES,
  INIT_MODULE_NAMES,
  MODULE_RUN_ORDER,
  SCOPE_README_ENTRY_DESCRIPTION,
  SCOPE_README_ENTRY_NAME,
  TYPE_MATERIAL_IDS,
  harnessBoardSeed,
  type HarnessBoardModule,
  type InitModuleName,
} from "./modules.js";
import { migrateScopeMaterialIndex } from "./migrate-scope-readme.js";

export type { InitMemoryOptions };

export interface InitScopeOptions {
  targetDir?: string;
  env?: NodeJS.ProcessEnv;
  rootDir?: string;
  description?: string;
  modules?: readonly string[];
  memoryTypes?: readonly string[];
  skillTypes?: readonly string[];
  /** Tokens after `--`, forwarded only to the bundled skills install. */
  skillsInstallArgs?: readonly string[];
}

function scopeReadmePath(scopeDir: string): string {
  return placeHarnessMaterial(scopeDir, "readme").absPath;
}

function scopeReadmeSeed(): string {
  return `# ${SCOPE_README_ENTRY_NAME}\n\n<!-- project-entries-local:start -->\n## 本层内容\n\n<!-- project-entries-local:end -->\n`;
}

/** `.harness/README.md` is an ordinary ReadmeNode. No YAML frontmatter. */
export async function ensureScopeReadme(scopeDir: string, service: NodeService): Promise<void> {
  const file = scopeReadmePath(scopeDir);
  if (existsSync(file)) return;
  await service.create(new ReadmeNode(file), { body: scopeReadmeSeed() });
}

export async function ensureScopeReadmePointer(scopeDir: string, service: NodeService): Promise<void> {
  const agents = await service.get(join(scopeDir, AGENTS_FILE_NAME), AgentsNode);
  if (!agents) return;
  const readme = scopeReadmePath(scopeDir);
  if (agents.localChildren.some((child) => child.id === readme)) return;
  await service.update(agents, {
    localChildren: [
      ...agents.localChildren,
      {
        id: readme,
        name: SCOPE_README_ENTRY_NAME,
        description: SCOPE_README_ENTRY_DESCRIPTION,
      },
    ],
    descendantChildren: [...agents.descendantChildren],
  });
}

/**
 * Add a child on `.harness/README.md` when NodeService will not.
 * Notes, projects, and type indexes register through physicalParent on create.
 * The tasks board is skipped there, and repairs link an existing file.
 */
export async function linkScopeReadme(
  scopeDir: string,
  reference: NodeReference,
  service: NodeService,
): Promise<void> {
  await ensureScopeReadme(scopeDir, service);
  const file = scopeReadmePath(scopeDir);
  const node = await service.get(file, ReadmeNode);
  if (!node) throw new Error(`Missing scope README: ${file}`);
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

function indexPathForSpec(target: string, spec: TypeSpec): string {
  const materialId = TYPE_MATERIAL_IDS[spec.name];
  if (materialId) return placeHarnessMaterial(target, materialId).absPath;
  return join(target, spec.indexFile);
}

function assertKnownModules(modules: readonly string[]): InitModuleName[] {
  const seen = new Set<string>();
  const out: InitModuleName[] = [];
  for (const name of modules) {
    if (!(INIT_MODULE_NAMES as readonly string[]).includes(name)) {
      throw new Error(`Unknown init module: ${name}`);
    }
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name as InitModuleName);
  }
  return out;
}

async function ensureHarnessBoard(
  target: string,
  board: HarnessBoardModule,
  service: NodeService,
): Promise<"created" | "preserved"> {
  const file = placeHarnessMaterial(target, board.materialId).absPath;
  if (existsSync(file)) return "preserved";
  await service.create(new ReadmeNode(file), {
    name: board.title,
    description: board.description,
    body: board.body ?? harnessBoardSeed(board.title),
  });
  return "created";
}

async function ensureHarnessBoards(
  target: string,
  modules: readonly string[],
  service: NodeService,
): Promise<{ created: string[]; preserved: string[] }> {
  const created: string[] = [];
  const preserved: string[] = [];
  await ensureScopeReadme(target, service);
  for (const board of HARNESS_BOARD_MODULES) {
    if (!modules.includes(board.module)) continue;
    const absPath = placeHarnessMaterial(target, board.materialId).absPath;
    const rel = relative(target, absPath);
    if ((await ensureHarnessBoard(target, board, service)) === "created") created.push(rel);
    else preserved.push(rel);
    // NodeService skips the tasks board. Link that README here.
    if (board.materialId === "tasks") {
      await linkScopeReadme(target, {
        id: absPath,
        name: board.title,
        description: board.description,
      }, service);
    }
  }
  return { created, preserved };
}

async function openScope(options: InitMemoryOptions) {
  const target = resolveTarget(options.targetDir);
  const root = resolveRoot(target, options.rootDir);
  rejectLegacy(target);
  if (target !== root) {
    rejectLegacy(root);
    assertScopePath(join(root, AGENTS_FILE_NAME), root);
  }
  loadAgentsTemplate();
  return { target, root };
}

type MemoryInitSelection = {
  operation: "init";
  targetDir: string;
  selectionRequired: true;
  recommendations: {
    modules: string[];
    memoryTypes: string[];
    skillTypes: string[];
  };
};

type MemoryInitWritten = {
  operation: "init";
  targetDir: string;
  memoryDir: string;
  agentsMd: string;
  agentsAction: string;
  rootDir: string;
  rootAgentsMd: string;
  indexAnchor: string;
  indexAction: string;
  indexEntry: string | null;
  indexDescription: string | null;
  inheritedEntries: [];
  detachedEntries: [];
  created: string[];
  preserved: string[];
  selectionRequired: false;
  complete: boolean;
  diagnostics: { code: string; type: string; message: string }[];
};

type MemoryInitResult = MemoryInitSelection | MemoryInitWritten;

/** Memory init adopts memory types only. Skill indexes belong to skills init. */
export async function initMemory(options: InitMemoryOptions): Promise<MemoryInitResult> {
  if (options.skillTypes !== undefined) {
    throw new Error("Type flags require the skills module");
  }
  return runTypeInit(options, "memory");
}

/** Skills init adopts skill types only. */
export async function initSkills(options: InitMemoryOptions): Promise<MemoryInitResult> {
  if (options.memoryTypes !== undefined) {
    throw new Error("Type flags require the memory module");
  }
  return runTypeInit(options, "skills");
}

async function runTypeInit(
  options: InitMemoryOptions,
  module: "memory" | "skills",
): Promise<MemoryInitResult> {
  const { target, root } = await openScope(options);
  let memoryTypes = options.memoryTypes;
  let skillTypes = options.skillTypes;
  const specs = new Map(
    layerTypeSpecs(target)
      .filter((spec) => spec.module === module)
      .map((spec) => [spec.name, spec]),
  );
  if (module === "skills" && skillTypes === undefined && specs.size === 0) {
    skillTypes = [...SKILL_TYPE_NAMES];
  }
  if (module === "memory" && !specs.size && memoryTypes === undefined) {
    return {
      operation: "init",
      targetDir: target,
      selectionRequired: true,
      recommendations: {
        modules: ["memory", "skills", "tasks", "projects", "notes"],
        memoryTypes: [...MEMORY_TYPE_NAMES],
        skillTypes: [...SKILL_TYPE_NAMES],
      },
    };
  }
  const selected = module === "memory" ? memoryTypes : skillTypes;
  const allowed = module === "memory" ? MEMORY_TYPE_NAMES : SKILL_TYPE_NAMES;
  for (const name of selected ?? []) {
    if (!(allowed as readonly string[]).includes(name)) {
      throw new Error(`Unknown ${module} type: ${name}; register custom types with add-type`);
    }
    if (!specs.has(name)) specs.set(name, seedSpec(name));
  }
  if (!specs.size) throw new Error("Select at least one memory or skill type");
  assertScopePath(join(target, AGENTS_FILE_NAME), target);
  for (const spec of specs.values()) assertScopePath(indexPathForSpec(target, spec), target);
  const anchor = findIndexAnchor(target, root);
  const service = memoryNodes(target);
  await ensureScopeReadme(target, service);
  const created: string[] = [];
  const preserved: string[] = [];
  const diagnostics: { code: string; type: string; message: string }[] = [];
  for (const spec of specs.values()) {
    const gitRoot = findGitRoot(target);
    if (spec.gitignore && gitRoot) {
      ensureTypeGitignore(gitRoot, spec.name, spec.module, spec.indexFile);
    }
    const file = indexPathForSpec(target, spec);
    if (spec.gitignore) assertPrivateIgnored(gitRoot ?? target, [file], [dirname(file)]);
    const entry = prepareMemoryWrite(target, file);
    const node = await service.get(entry);
    if (node) preserved.push(spec.indexFile);
    else {
      await service.create(
        typeIndexNode(entry),
        parseDocument(
          readIndexTemplate(typeIndexTemplateName(spec.name), spec.name, spec.description, {
            module: spec.module,
            format: spec.format,
            writable: String(spec.writable),
            gitignore: String(spec.gitignore),
          }),
        ),
        { indexGroup: "local" },
      );
      created.push(spec.indexFile);
    }
  }
  for (const name of specs.keys()) {
    try {
      await refreshIndex(target, name, service);
    } catch (error) {
      diagnostics.push({
        code: "source-scan-error",
        type: name,
        message: String(error instanceof Error ? error.message : error),
      });
    }
  }
  const agentsAction = await syncTargetAgents(target, root, service);
  await ensureScopeReadmePointer(target, service);
  if (
    target !== root &&
    existsSync(join(root, AGENTS_FILE_NAME)) &&
    layerTypeSpecs(root).some((spec) => spec.module === module)
  ) {
    await syncTargetAgents(root, root);
  }
  const [indexAction, indexEntry, indexDescription] = await syncIndexEntry(
    anchor,
    target,
    options.description,
  );
  return {
    operation: "init",
    targetDir: target,
    memoryDir: memoryDir(target),
    agentsMd: join(target, AGENTS_FILE_NAME),
    agentsAction,
    rootDir: root,
    rootAgentsMd: join(root, AGENTS_FILE_NAME),
    indexAnchor: anchor,
    indexAction,
    indexEntry,
    indexDescription,
    inheritedEntries: [],
    detachedEntries: [],
    created,
    preserved,
    selectionRequired: false,
    complete: !diagnostics.length,
    diagnostics,
  };
}

/** Notes/projects (and any non-memory module list) still create the scope AGENTS.md. */
async function ensureScopeEntry(options: InitMemoryOptions) {
  const { target, root } = await openScope(options);
  assertScopePath(join(target, AGENTS_FILE_NAME), target);
  const anchor = findIndexAnchor(target, root);
  const service = memoryNodes(target);
  await ensureScopeReadme(target, service);
  const agentsAction = await syncTargetAgents(target, root, service);
  await ensureScopeReadmePointer(target, service);
  const [indexAction, indexEntry, indexDescription] = await syncIndexEntry(
    anchor,
    target,
    options.description,
  );
  return {
    targetDir: target,
    agentsAction,
    indexAction,
    indexEntry,
    indexDescription,
    service,
  };
}

export async function initScope(options: InitScopeOptions) {
  const targetDir = options.targetDir ?? resolveScope(options.env ?? process.env);
  const requested =
    options.modules === undefined || options.modules.length === 0
      ? [...DEFAULT_INIT_MODULES]
      : assertKnownModules(options.modules);
  if (requested.length === 0) throw new Error("Select at least one init module");
  if (options.memoryTypes !== undefined && !requested.includes("memory")) {
    throw new Error("Type flags require the memory module");
  }
  if (options.skillTypes !== undefined && !requested.includes("skills")) {
    throw new Error("Type flags require the skills module");
  }

  const base = {
    targetDir,
    rootDir: options.rootDir,
    description: options.description,
  };
  // Shared system entry, then each module writes only its own materials.
  const scope = await ensureScopeEntry(base);
  let created: string[] = [];
  let preserved: string[] = [];
  let typeResult: MemoryInitResult | undefined;
  let diagnostics: MemoryInitWritten["diagnostics"] | undefined;
  let complete: boolean | undefined;
  for (const module of MODULE_RUN_ORDER) {
    if (!requested.includes(module)) continue;
    if (module === "memory" || module === "skills") {
      const memoryTypes =
        module === "memory"
          ? (options.memoryTypes ?? [...DEFAULT_PUBLIC_MEMORY_TYPES])
          : undefined;
      typeResult = await runTypeInit(
        { ...base, memoryTypes, skillTypes: module === "skills" ? options.skillTypes : undefined },
        module,
      );
      if (typeResult.selectionRequired) return { ...typeResult, modules: requested, skillsInstall: false as const };
      created = [...created, ...typeResult.created];
      preserved = [...preserved, ...typeResult.preserved];
      diagnostics = [...(diagnostics ?? []), ...typeResult.diagnostics];
      complete = (complete ?? true) && typeResult.complete;
      continue;
    }
    const boards = await ensureHarnessBoards(scope.targetDir, [module], memoryNodes(scope.targetDir));
    created = [...created, ...boards.created];
    preserved = [...preserved, ...boards.preserved];
  }
  await migrateScopeMaterialIndex(scope.targetDir);
  return {
    ...(typeResult ?? {}),
    targetDir: scope.targetDir,
    agentsAction: scope.agentsAction,
    indexAction: scope.indexAction,
    indexEntry: scope.indexEntry,
    indexDescription: scope.indexDescription,
    modules: requested,
    created,
    preserved,
    skillsInstall: requested.includes("skills"),
    ...(complete === undefined ? {} : { complete, diagnostics }),
  };
}
