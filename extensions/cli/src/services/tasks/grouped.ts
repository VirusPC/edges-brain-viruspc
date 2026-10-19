import { validateTaskDocInput } from "./task-doc.js";
import path from "node:path";
import { nativeTaskPath } from "./realpath.js";
import { AgentsNode } from "../../domain/models/index.js";
import { query } from "../../domain/operations/query.js";
import { projectLocationOf } from "./node-query.js";
import { resolveBoard, taskBoardLocation } from "./paths.js";
import { scopeDir, type BoardTarget } from "./paths.js";
import { isTaskProjectId } from "../../domain/models/tasks/project.js";
import { NodeService } from "../node/node-service.js";
import { portableScope } from "../scope.js";
import { listRepositoryTasksWithDocs, createNodeBoardFs, listProjectIds, listTasksWithDocs, type BoardFs, type TaskListOpts } from "./board.js";
import {
  DEFAULT_PROJECT_DESCRIPTION,
  DEFAULT_PROJECT_TITLE,
  readProjectRecord,
  seedDescriptionFor,
  seedTitleFor,
} from "./project-meta.js";
import type { ReviewPageInput, ReviewPageItem } from "./review-page.js";
import { DEFAULT_TASK_PROJECT, TasksError, type TaskListItem, type TaskProjectId } from "../../domain/models/tasks/types.js";
import type { TaskDoc } from "../../domain/models/tasks/task-doc.js";

export const GROUPED_LIST_SCHEMA = "edges.tasks.grouped/v1";

export type TaskSource = { scope: string; purpose: "domain" | "maintenance" };
export function sourceIdentity(source: TaskSource, project: string, stem?: string): string {
  return JSON.stringify(stem === undefined ? [source.scope, source.purpose, project] : [source.scope, source.purpose, project, stem]);
}

export type GroupedListGroup = {
  source?: TaskSource;
  project?: string;
  id: string;
  title: string;
  description?: string;
};

export type GroupedTaskInput = TaskListItem & { doc?: TaskDoc };

export type GroupedListItem = {
  path?: string;
  source?: TaskSource;
  project?: string;
  id: string;
  stem?: string;
  group: string;
  title?: string;
  status?: string;
  description?: string;
  priority?: string;
  doc?: TaskDoc;
};

export type GroupedList = {
  schema: typeof GROUPED_LIST_SCHEMA;
  groups: GroupedListGroup[];
  items: GroupedListItem[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fallbackGroups(): GroupedListGroup[] {
  return [{ id: DEFAULT_TASK_PROJECT, title: DEFAULT_PROJECT_TITLE, description: DEFAULT_PROJECT_DESCRIPTION }];
}

function sortGroupIds(ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort((a, b) => {
    if (a === DEFAULT_TASK_PROJECT) {
      return -1;
    }
    if (b === DEFAULT_TASK_PROJECT) {
      return 1;
    }
    return a.localeCompare(b);
  });
}

export function buildGroupedList(tasks: GroupedTaskInput[], groups: GroupedListGroup[]): GroupedList {
  return {
    schema: GROUPED_LIST_SCHEMA,
    groups: groups.length > 0 ? groups : fallbackGroups(),
    items: tasks.map((task) => {
      const item: GroupedListItem = {
        id: task.stem,
        stem: task.stem,
        group: task.project,
        title: task.title,
        status: task.status,
        description: task.description,
        priority: task.priority,
      };
      if (task.doc) {
        item.doc = task.doc;
      }
      return item;
    }),
  };
}

export function parseSource(raw: unknown): TaskSource | undefined {
  if (raw === undefined) return undefined;
  if (!isPlainObject(raw) || typeof raw.scope !== "string" || !raw.scope || raw.scope.startsWith("/") || raw.scope.includes("\\") || raw.scope.split("/").includes("..") || /^[a-z]:/i.test(raw.scope) || !["domain", "maintenance"].includes(String(raw.purpose))) {
    throw new TasksError("VALIDATION_ERROR", "source requires a portable scope and domain|maintenance purpose");
  }
  return { scope: raw.scope, purpose: raw.purpose as TaskSource["purpose"] };
}
export function parseSourceProject(raw: unknown): string {
  if (typeof raw !== "string" || !isTaskProjectId(raw)) {
    throw new TasksError("VALIDATION_ERROR", "source-aware project must be a real Task Project id (default or lowercase ASCII kebab-case slug)");
  }
  return raw;
}

function parseGroup(raw: unknown): GroupedListGroup {
  if (!isPlainObject(raw) || typeof raw.id !== "string" || raw.id.trim() === "") {
    throw new TasksError("VALIDATION_ERROR", "grouped list group id must be a non-empty string");
  }
  if (typeof raw.title !== "string" || raw.title.trim() === "") {
    throw new TasksError("VALIDATION_ERROR", "grouped list group title must be a non-empty string");
  }
  const group: GroupedListGroup = { id: raw.id.trim(), title: raw.title.trim() };
  if (typeof raw.description === "string") {
    group.description = raw.description;
  }
  const source = parseSource(raw.source);
  if (source) { group.source = source; group.project = parseSourceProject(raw.project); }
  return group;
}

function parseItem(raw: unknown): GroupedListItem {
  if (!isPlainObject(raw)) {
    throw new TasksError("VALIDATION_ERROR", "grouped list item must be an object");
  }
  const idRaw = typeof raw.id === "string" ? raw.id.trim() : "";
  const stemRaw = typeof raw.stem === "string" ? raw.stem.trim() : "";
  const identity = idRaw || stemRaw;
  if (!identity) {
    throw new TasksError("VALIDATION_ERROR", "grouped list item must have id or stem");
  }
  if (typeof raw.group !== "string" || raw.group.trim() === "") {
    throw new TasksError("VALIDATION_ERROR", "grouped list item group must be a non-empty string");
  }
  const item: GroupedListItem = { id: identity, stem: stemRaw || identity, group: raw.group.trim() };
  if (typeof raw.title === "string") {
    item.title = raw.title;
  }
  if (typeof raw.status === "string") {
    item.status = raw.status;
  }
  if (typeof raw.description === "string") {
    item.description = raw.description;
  }
  if (typeof raw.priority === "string") {
    item.priority = raw.priority;
  }
  if ("doc" in raw && raw.doc !== undefined) {
    item.doc = validateTaskDocInput(raw.doc, "grouped list doc");
  }
  const source = parseSource(raw.source);
  if (source) {
    if (!stemRaw) throw new TasksError("VALIDATION_ERROR", "source-aware item requires its stored stem");
    item.source = source;
    item.project = parseSourceProject(raw.project);
  }
  return item;
}

export function groupedListToReviewPageInput(grouped: GroupedList): ReviewPageInput {
  const groups = (grouped.groups.length > 0 ? grouped.groups : fallbackGroups()).map((group) => ({
    id: group.id,
    title: group.title,
    description: group.description ?? "",
    ...(group.source ? { source: group.source, project: group.project } : {}),
  }));
  const groupIds = new Set(groups.map((group) => group.id));
  const items: ReviewPageItem[] = grouped.items.map((item) => {
    const stem = (item.stem ?? item.id).trim();
    if (!groupIds.has(item.group)) {
      throw new TasksError("VALIDATION_ERROR", `grouped item ${stem} group not found: ${item.group}`);
    }
    const mapped: ReviewPageItem = {
      stem,
      ...(item.source ? { id: item.id, source: item.source, project: item.project } : {}),
      current: item.group,
      suggested: item.group,
    };
    if (item.title !== undefined) {
      mapped.title = item.title;
    }
    if (item.description !== undefined) {
      mapped.description = item.description;
    }
    if (item.status !== undefined) {
      mapped.status = item.status;
    }
    if (item.priority !== undefined) {
      mapped.priority = item.priority;
    }
    if (item.doc !== undefined) {
      mapped.doc = item.doc;
    }
    return mapped;
  });
  return { groups, items };
}

export function parseGroupedList(raw: unknown): GroupedList {
  if (!isPlainObject(raw)) {
    throw new TasksError("VALIDATION_ERROR", "grouped list must be a JSON object");
  }
  if (raw.schema !== GROUPED_LIST_SCHEMA) {
    throw new TasksError("VALIDATION_ERROR", `grouped list schema must be ${GROUPED_LIST_SCHEMA}`);
  }
  if (!Array.isArray(raw.groups) || !Array.isArray(raw.items)) {
    throw new TasksError("VALIDATION_ERROR", "grouped list must have groups[] and items[]");
  }
  return {
    schema: GROUPED_LIST_SCHEMA,
    groups: raw.groups.map(parseGroup),
    items: raw.items.map(parseItem),
  };
}

async function resolveGroup(
  repoPath: BoardTarget,
  id: TaskProjectId,
  fs: BoardFs,
): Promise<GroupedListGroup> {
  try {
    const record = await readProjectRecord(repoPath, id, fs);
    return { id: record.project, title: record.title, description: record.description };
  } catch (error) {
    if (error instanceof TasksError && error.errorCode === "PROJECT_NOT_FOUND") {
      return { id, title: seedTitleFor(id), description: seedDescriptionFor(id) };
    }
    throw error;
  }
}

export async function listGroupedByProject(
  repoPath: BoardTarget,
  opts: TaskListOpts,
  fs: BoardFs,
  sourceScope = portableScope(scopeDir(repoPath)),
): Promise<GroupedList> {
  const tasks = await listTasksWithDocs(repoPath, opts, fs);
  const groupedTasks = await query(async function* () { yield* tasks; }).groupBy(task => task.project).value();
  const requested = opts.projects ?? [];
  const ids =
    requested.length > 0
      ? requested
      : [...(await listProjectIds(repoPath, fs)), ...Object.keys(groupedTasks)];
  const groups: GroupedListGroup[] = [];
  for (const id of sortGroupIds(ids)) {
    groups.push(await resolveGroup(repoPath, id, fs));
  }
  const grouped = buildGroupedList(tasks, groups);
  const source: TaskSource = { scope: sourceScope, purpose: resolveBoard(repoPath).purpose };
  return {
    ...grouped,
    groups: grouped.groups.map(group => ({ ...group, source, project: group.id, id: sourceIdentity(source, group.id) })),
    items: grouped.items.map(item => ({ ...item, source, project: item.group, id: sourceIdentity(source, item.group, item.stem), group: sourceIdentity(source, item.group) })),
  };
}

/** Repository groups use physical source identity, retaining registered empty projects. */
export async function listRepositoryGroupedByProject(
  root: string, opts: TaskListOpts = {},
): Promise<GroupedList> {
  root = nativeTaskPath(root);
  const tasks = await listRepositoryTasksWithDocs(root, opts);
  const groupedTasks = await query(async function* () { yield* tasks; })
    .groupBy(task => sourceIdentity(task.source, task.project)).value();
  const groups = new Map<string, GroupedListGroup>();
  const service = new NodeService({ managedRoot: root });
  const projects = await service.query(root, {
    types: ["agents"], includeHarness: true,
  })
    .filter((node): node is AgentsNode => node instanceof AgentsNode)
    .map(node => projectLocationOf(node, root))
    .filter((entry): entry is NonNullable<typeof entry> => !!entry)
    .filter(entry => !opts.projects?.length || opts.projects.includes(entry.project)).value();
  for (const { location, project, source } of projects) {
    // Identity can still come from a legacy AGENTS.md link. Title and description
    // come only from README.md; a missing org list falls back to the seed text.
    const record = await resolveGroup(location, project, createNodeBoardFs(location));
    const id = sourceIdentity(source, project);
    groups.set(id, { ...record, id, project, source });
  }
  for (const [id, rows] of Object.entries(groupedTasks)) {
    if (groups.has(id)) continue;
    const { source, project } = rows[0]!;
    const target = taskBoardLocation(path.resolve(root, source.scope), { super: source.purpose === "domain" });
    const record = await resolveGroup(target, project, createNodeBoardFs(target));
    groups.set(id, { ...record, id, source, project });
  }
  return { schema: GROUPED_LIST_SCHEMA, groups: [...groups.values()], items: tasks.map(task => ({
    id: sourceIdentity(task.source, task.project, task.stem), stem: task.stem,
    group: sourceIdentity(task.source, task.project), source: task.source, project: task.project,
    path: task.path, title: task.title, status: task.status, description: task.description, priority: task.priority, doc: task.doc,
  })) };
}
