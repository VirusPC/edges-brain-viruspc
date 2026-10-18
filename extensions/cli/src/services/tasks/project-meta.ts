import { AgentsNode } from "../../domain/models/agents/agents-node.js";
import { ReadmeNode } from "../../domain/models/readme/readme-node.js";
import { decodeBody } from '../../domain/models/agents/parse.js';
import { createAgentsDocument } from "../../domain/models/agents/document.js";
import { placeHarnessMaterial } from "../../domain/config/harness-materials.js";
import { ENTRIES_SECTIONS, ENTRY_NAMES } from "../../domain/models/layout.js";
import { serializeNode } from '../../domain/models/agents/serialize.js';
import { NodeService } from '../node/node-service.js';
import { assertBoardPath } from './board.js';
import { scopeDir, boardRel, type BoardTarget } from "./paths.js";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { NodeReference } from "../../domain/models/core/types.js";
import { realpathSync } from "node:fs";
import { existsSync } from "node:fs";
import { listProjectIds, type BoardFs, type BoardWriter } from "./board.js";
import { boardRoot } from "./paths.js";
import { parseTaskProject, projectDirName } from "../../domain/models/tasks/project.js";
import {
  DEFAULT_TASK_PROJECT,
  TasksError,
  type TaskProjectId,
  type TaskProjectRecord,
} from "../../domain/models/tasks/types.js";

export type { TaskProjectRecord };

export const PROJECT_MEMORY_START = "<!-- project-memory:start -->";
export const PROJECT_MEMORY_END = "<!-- project-memory:end -->";

export const DEFAULT_PROJECT_TITLE = "Default";
export const DEFAULT_PROJECT_DESCRIPTION =
  "Ungrouped tasks that have not been assigned a named Task Project.";

const TITLE_MESSAGE = "invalid Task Project title (expected 1–120 characters, no newlines)";
const DESCRIPTION_MESSAGE = "invalid Task Project description (expected 1–2000 characters)";

export function seedTitleFor(id: TaskProjectId): string {
  return id === DEFAULT_TASK_PROJECT ? DEFAULT_PROJECT_TITLE : id;
}

export function seedDescriptionFor(id: TaskProjectId): string {
  return id === DEFAULT_TASK_PROJECT
    ? DEFAULT_PROJECT_DESCRIPTION
    : `Task Project ${id}.`;
}

export function parseProjectTitle(raw: string): string {
  const title = raw.trim();
  if (title.length < 1 || title.length > 120 || /[\r\n]/.test(title)) {
    throw new TasksError("VALIDATION_ERROR", TITLE_MESSAGE);
  }
  return title;
}

export function parseProjectDescription(raw: string): string {
  const description = raw.trim();
  if (description.length < 1 || description.length > 2000) {
    throw new TasksError("VALIDATION_ERROR", DESCRIPTION_MESSAGE);
  }
  return description;
}

export function parseProjectAgents(markdown: string): {
  title: string;
  description: string;
  pointers?: string;
  tail?: string;
} {
  if (markdown.startsWith("---")) {
    throw new TasksError(
      "VALIDATION_ERROR",
      "Task Project AGENTS.md must not have YAML frontmatter",
    );
  }

  const lines = markdown.split("\n");
  const heading = lines[0] ?? "";
  const match = heading.match(/^# (.+)$/);
  if (!match) {
    throw new TasksError("VALIDATION_ERROR", TITLE_MESSAGE);
  }
  const title = parseProjectTitle(match[1]);

  const body = markdown.slice(heading.length + 1);
  const boundary = body.search(
    /^(?:## |<!-- (?:project-harness|project-memory|project-entries|task-projects)(?::|-))/m,
  );
  const descriptionSource = boundary === -1 ? body : body.slice(0, boundary);
  const description = parseProjectDescription(descriptionSource);
  if (boundary === -1) return { title, description };
  const tail = body.slice(descriptionSource.trimEnd().length);
  return { title, description, pointers: body.slice(boundary).startsWith('## Pointers') ? body.slice(boundary) : undefined, tail };

}

export function renderProjectAgents(input: {
  title: string;
  description: string;
  pointers?: string;
  tail?: string;
}): string {
  if (input.tail !== undefined) return `# ${input.title}\n\n${input.description}${input.tail}`;
  let out = `# ${input.title}\n\n${input.description}\n`;
  if (input.pointers !== undefined && input.pointers.length > 0) {
    const block = input.pointers.startsWith("## Pointers")
      ? input.pointers.trimEnd()
      : `## Pointers\n\n${input.pointers.trim()}`;
    out += `\n${block}\n`;
  }
  return out + "\n" + serializeNode(createAgentsDocument());
}

const EMPTY_ENTRIES = `<!-- ${ENTRIES_SECTIONS.localChildren.marker}:start -->\n## ${ENTRIES_SECTIONS.localChildren.heading}\n<!-- ${ENTRIES_SECTIONS.localChildren.marker}:end -->\n`;
const ENTRIES_MARKER = /^<!-- project-entries-(?:local|descendants):start -->$/m;

/** Task Project org list: title, description and an (initially empty) project-entries list. */
export function renderProjectReadme(input: { title: string; description: string }): string {
  return `# ${input.title}\n\n${input.description}\n\n${EMPTY_ENTRIES}`;
}

export function oneLineDescription(description: string): string {
  return description.replace(/\r?\n/g, " ").replace(/[ \t]+/g, " ").trim();
}

function isDefaultProject(record: TaskProjectRecord): boolean {
  return record.dir === "_default" || record.dir === "default" || record.project === "default";
}

function sortProjectRecords(projects: TaskProjectRecord[]): TaskProjectRecord[] {
  return [...projects].sort((a, b) => {
    const aDefault = isDefaultProject(a);
    const bDefault = isDefaultProject(b);
    if (aDefault !== bDefault) {
      return aDefault ? -1 : 1;
    }
    return a.dir.localeCompare(b.dir);
  });
}

export function projectAgentsRelPath(id: TaskProjectId, target: BoardTarget = ""): string {
  return `${boardRel(target)}/${projectDirName(id)}/AGENTS.md`;
}

function projectReadmeRelPath(id: TaskProjectId, target: BoardTarget = ""): string {
  return `${boardRel(target)}/${projectDirName(id)}/README.md`;
}

/** A Task Project's entry: its README.md org list, or an AGENTS.md when the user initialised the
 * project as a system entry. AGENTS wins when both exist; new projects get a README. */
async function resolveProjectEntry(
  repoPath: BoardTarget,
  id: TaskProjectId,
  fs: BoardFs,
): Promise<{ rel: string; abs: string; exists: boolean; kind: "agents" | "readme" }> {
  const scope = realpathSync(scopeDir(repoPath));
  const agents = projectAgentsRelPath(id, repoPath);
  if (await fs.exists(path.join(scope, agents)))
    return { rel: agents, abs: path.join(scope, agents), exists: true, kind: "agents" };
  const readme = projectReadmeRelPath(id, repoPath);
  if (await fs.exists(path.join(scope, readme)))
    return { rel: readme, abs: path.join(scope, readme), exists: true, kind: "readme" };
  return { rel: readme, abs: path.join(scope, readme), exists: false, kind: "readme" };
}

function boardIsVirtual(repoPath: BoardTarget): boolean {
  return typeof repoPath === "string" || repoPath.purpose === "domain";
}
/** Absolute tasks material from harness-materials. Virtual boards sit on the scope; maintenance boards sit under `.harness`. */
function tasksMaterialAbsPath(repoPath: BoardTarget): string {
  return placeHarnessMaterial(realpathSync(scopeDir(repoPath)), "tasks", {
    super: boardIsVirtual(repoPath),
  }).absPath;
}
function boardSystemEntryAbsPath(repoPath: BoardTarget): string {
  return path.join(path.dirname(tasksMaterialAbsPath(repoPath)), ENTRY_NAMES.internal);
}

async function collectProjectIds(repoPath: BoardTarget, fs: BoardFs, additional: readonly TaskProjectId[] = []): Promise<TaskProjectId[]> {
  const listed = (await fs.exists(tasksMaterialAbsPath(repoPath)) || await fs.exists(boardSystemEntryAbsPath(repoPath)))
    ? await listProjectIds(repoPath, fs) : [];
  const ids: TaskProjectId[] = [DEFAULT_TASK_PROJECT];
  for (const id of new Set([...listed, ...additional])) {
    if (id !== DEFAULT_TASK_PROJECT) {
      ids.push(id);
    }
  }
  return ids;
}

export async function readProjectRecord(
  repoPath: BoardTarget,
  id: TaskProjectId,
  fs: BoardFs,
): Promise<TaskProjectRecord> {
  const entry = await resolveProjectEntry(repoPath, id, fs);
  if (!entry.exists) {
    if (!(await listProjectIds(repoPath, fs)).includes(id)) {
      throw new TasksError("PROJECT_NOT_FOUND", `project not found: ${id}`);
    }
    return {
      project: id,
      dir: projectDirName(id),
      title: seedTitleFor(id),
      description: seedDescriptionFor(id),
      path: entry.rel,
    };
  }
  return projectRecordFromEntry(realpathSync(scopeDir(repoPath)), {
    path: entry.abs,
    body: await fs.readFile(entry.abs),
  });
}

/** Decode an already reached project entry without discovering or loading siblings. */
export function projectRecordFromEntry(
  scope: string,
  entry: { path: string; body: string },
): TaskProjectRecord {
  const dir = path.basename(path.dirname(entry.path));
  const parsed = parseProjectAgents(entry.body);
  return {
    project: dir === "_default" ? DEFAULT_TASK_PROJECT : dir,
    dir,
    title: parsed.title,
    description: parsed.description,
    path: path.relative(scope, entry.path).split(path.sep).join("/"),
  };
}

function projectNodes(target: BoardTarget): NodeService {
  const scope = realpathSync(scopeDir(target)), owner = path.join(scope, ENTRY_NAMES.internal);
  return new NodeService({ managedRoot: scope, assertWrite: async ({ node }) => {
    if (node.path === owner && existsSync(owner)) return;
    await assertBoardPath({ scopeDir: scope, purpose: typeof target === "string" ? "domain" : target.purpose, boardDir: path.join(scope, boardRel(target)) }, node.path);
  } });
}
function selectedGroup(target: BoardTarget) { return typeof target === 'string' ? undefined : target.indexGroup; }

async function prepareProjectWrite(target: BoardTarget, service: NodeService): Promise<void> {
  await assertBoardPath(target, tasksMaterialAbsPath(target));
  const owner = await service.get(path.join(realpathSync(scopeDir(target)), ENTRY_NAMES.internal), AgentsNode);
  const legacy = boardSystemEntryAbsPath(target);
  for (const file of [owner?.path, existsSync(legacy) ? legacy : undefined]) {
    if (!file) continue;
    const node = file === owner?.path ? owner : await service.get(file, AgentsNode);
    if (node && /<!-- task-projects:(?:start|end) -->/.test(node.body))
      throw new TasksError('VALIDATION_ERROR', 'migration-required: run pnpm --filter edges-cli exec tsx ../../scripts/migrate-agents-indexes.mts --root ' + scopeDir(target) + ' --write');
  }
  if (owner && decodeBody(owner.body).unsafe) throw new TasksError('VALIDATION_ERROR', 'Malformed owning scope index: ' + owner.path);
}

export async function refreshProjectIndex(
  repoPath: BoardTarget,
  writer: BoardWriter,
  additional: readonly TaskProjectId[] = [],
  service = projectNodes(repoPath),
): Promise<TaskProjectRecord[]> {
  await prepareProjectWrite(repoPath, service);
  const records: TaskProjectRecord[] = [];
  for (const id of await collectProjectIds(repoPath, writer, additional)) {
    if (!(await resolveProjectEntry(repoPath, id, writer)).exists) {
      continue;
    }
    records.push(await readProjectRecord(repoPath, id, writer));
  }

  const material = tasksMaterialAbsPath(repoPath);
  const boardDir = path.dirname(material);
  const systemEntry = path.join(boardDir, ENTRY_NAMES.internal);
  const board = existsSync(systemEntry) ? await service.get(systemEntry, AgentsNode) : undefined;
  const list = await ensureBoardMaterial(repoPath, service);
  const sorted = sortProjectRecords(records);
  const updatesFor = (kind: string) => new Map(sorted
    .filter(record => path.basename(record.path) === kind)
    .map(record => [path.resolve(boardDir, record.dir, kind), { name: record.title, description: oneLineDescription(record.description) }]));
  // System-entry projects stay under the board AGENTS; org-list projects belong to the board README (Q13).
  const agentsUpdates = updatesFor(ENTRY_NAMES.internal), readmeUpdates = updatesFor(ENTRY_NAMES.readme);
  const synced = (node: AgentsNode | ReadmeNode, updates: Map<string, { name: string; description: string }>, moved: ReadonlySet<string> = new Set()) => {
    const update = (refs: readonly NodeReference[]) => refs.filter(ref => !moved.has(ref.id)).map(ref => updates.has(ref.id) ? { ...ref, ...updates.get(ref.id) } : ref);
    const localChildren = update(node.localChildren), descendantChildren = update(node.descendantChildren);
    for (const [id, fields] of updates) if (!node.children.some(ref => ref.id === id)) localChildren.push({ id, ...fields });
    const unchanged = isDeepStrictEqual([localChildren, descendantChildren], [node.localChildren, node.descendantChildren]);
    return unchanged ? undefined : { localChildren, descendantChildren };
  };
  if (board) {
    const boardChildren = synced(board, agentsUpdates, new Set(readmeUpdates.keys()));
    if (boardChildren) await service.update(board, boardChildren);
  }
  const listChildren = synced(list, readmeUpdates);
  if (listChildren) await service.update(list, listChildren);
  const owner = await service.get(path.join(realpathSync(scopeDir(repoPath)), ENTRY_NAMES.internal), AgentsNode);
  const harnessPrefix = owner ? path.join(owner.directoryPath, ".harness") + path.sep : "";
  // A child already sitting in the board directory counts as hung, whatever its filename.
  const alreadyHung = owner?.children.some((ref) => path.dirname(ref.id) === boardDir) === true;
  if (owner && material.startsWith(harnessPrefix) && !alreadyHung) {
    const group = selectedGroup(repoPath) ?? "local";
    await service.update(owner, {
      localChildren: group === "local" ? [...owner.localChildren, { id: material }] : owner.localChildren,
      descendantChildren: group === "descendant" ? [...owner.descendantChildren, { id: material }] : owner.descendantChildren,
    });
  }
  return records;
}

/** The configured tasks material; an existing prose file gains an empty project-entries list. */
async function ensureBoardMaterial(repoPath: BoardTarget, service: NodeService): Promise<ReadmeNode> {
  const abs = tasksMaterialAbsPath(repoPath);
  const existing = await service.get(abs, ReadmeNode);
  if (!existing) return service.create(new ReadmeNode(abs), { body: "# Tasks\n\n" + EMPTY_ENTRIES });
  if (!ENTRIES_MARKER.test(existing.body))
    await service.update(existing, { body: existing.body.trimEnd() + "\n\n" + EMPTY_ENTRIES });
  return existing;
}

export async function ensureProjectMetadata(
  repoPath: BoardTarget,
  writer: BoardWriter,
  skipId?: TaskProjectId,
  additional: readonly TaskProjectId[] = [],
  service = projectNodes(repoPath),
): Promise<TaskProjectRecord[]> {
  await prepareProjectWrite(repoPath, service);
  await ensureBoardMaterial(repoPath, service);

  for (const id of await collectProjectIds(repoPath, writer, additional)) {
    if (skipId === id) {
      continue;
    }
    const entry = await resolveProjectEntry(repoPath, id, writer);
    if (!entry.exists) {
      await service.create(new ReadmeNode(entry.abs), { body: renderProjectReadme({
          title: seedTitleFor(id),
          description: seedDescriptionFor(id),
        }) }, { indexGroup: "local" });
    } else {
      await readProjectRecord(repoPath, id, writer);
    }
  }

  return refreshProjectIndex(repoPath, writer, additional, service);
}

export async function listProjects(
  repoPath: BoardTarget,
  writer: BoardWriter,
): Promise<TaskProjectRecord[]> {
  const records: TaskProjectRecord[] = [];
  for (const id of await listProjectIds(repoPath, writer)) {
    records.push(await readProjectRecord(repoPath, id, writer));
  }
  return records;
}

export async function getProject(
  repoPath: BoardTarget,
  raw: string,
  writer: BoardWriter,
): Promise<TaskProjectRecord> {
  const id = parseTaskProject(raw);
  return readProjectRecord(repoPath, id, writer);
}

export async function createProject(
  repoPath: BoardTarget,
  input: { project: string; title: string; description: string },
  writer: BoardWriter,
): Promise<TaskProjectRecord> {
  const id = parseTaskProject(input.project);
  const title = parseProjectTitle(input.title);
  const description = parseProjectDescription(input.description);
  const service = projectNodes(repoPath);
  await ensureProjectMetadata(repoPath, writer, id, [], service);
  const entry = await resolveProjectEntry(repoPath, id, writer);
  if (entry.exists) {
    throw new TasksError("VALIDATION_ERROR", `project already exists: ${id}`);
  }
  const rel = entry.rel;
  await service.create(new ReadmeNode(entry.abs), { body: renderProjectReadme({ title, description }) }, { indexGroup: "local" });
  await refreshProjectIndex(repoPath, writer, [id], service);
  return {
    project: id,
    dir: projectDirName(id),
    title,
    description,
    path: rel,
  };
}

export async function updateProject(
  repoPath: BoardTarget,
  raw: string,
  patch: { title?: string; description?: string },
  writer: BoardWriter,
): Promise<TaskProjectRecord> {
  if (patch.title === undefined && patch.description === undefined) {
    throw new TasksError(
      "VALIDATION_ERROR",
      "project update requires at least one of --title, --description",
    );
  }
  const id = parseTaskProject(raw);
  // A named write may seed its existing project directory without discovering siblings.
  const projectExists = await writer.exists(path.join(boardRoot(repoPath), projectDirName(id)));
  const service = projectNodes(repoPath);
  await ensureProjectMetadata(repoPath, writer, undefined, projectExists ? [id] : [], service);
  const entry = await resolveProjectEntry(repoPath, id, writer);
  const rel = entry.rel;
  if (!entry.exists) {
    throw new TasksError("PROJECT_NOT_FOUND", `project not found: ${id}`);
  }
  const node = entry.kind === "readme"
    ? (await service.get(entry.abs, ReadmeNode))!
    : (await service.get(entry.abs, AgentsNode))!;
  const parsed = parseProjectAgents(node.body);
  const title = patch.title === undefined ? parsed.title : parseProjectTitle(patch.title);
  const description =
    patch.description === undefined
      ? parsed.description
      : parseProjectDescription(patch.description);
  const body = renderProjectAgents({
    title,
    description,
    pointers: parsed.pointers,
    tail: parsed.tail ?? (entry.kind === "readme" ? "\n" : undefined),
  });
  if (entry.kind === "readme") await service.update(node as ReadmeNode, { body });
  else await service.update(node as AgentsNode, { body });
  await refreshProjectIndex(repoPath, writer, [], service);
  return {
    project: id,
    dir: projectDirName(id),
    title,
    description,
    path: rel,
  };
}
