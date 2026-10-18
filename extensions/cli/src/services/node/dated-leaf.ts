import path from "node:path";
import { BaseNode } from "../../domain/models/index.js";
import { ENTRY_NAMES } from "../../domain/config/layout.js";
import { isLeafEntryName } from "../../domain/models/node/layout.js";
import { directoryStem } from "../../domain/models/node/stem.js";
import { NoteNode } from "../../domain/models/notes/note-node.js";
import { ProjectNode } from "../../domain/models/projects/project-node.js";
import { localDateYmd } from "../../utils/date.js";
import { isWithinPath } from "../../utils/filesystem.js";
import { parseMetadata } from "../metadata.js";
import type { Model } from "./node-layout.js";
import { openNodeSession, scopeRelativePath } from "./scope-session.js";
import { buildSystemForest } from "./system-forest-service.js";
import { scopeTraversal } from "../../domain/operations/traverse.js";

export type TitledLeaf = BaseNode & { title: string };

export type DatedLeafSpec<T extends TitledLeaf> = {
  folder: "notes" | "projects";
  Model: Model<T>;
  label: "note" | "project";
  queryType: string;
};

export const NOTE_LEAF: DatedLeafSpec<NoteNode> = {
  folder: "notes",
  Model: NoteNode,
  label: "note",
  queryType: "note",
};

export const PROJECT_LEAF: DatedLeafSpec<ProjectNode> = {
  folder: "projects",
  Model: ProjectNode,
  label: "project",
  queryType: "project",
};

export type DatedLeafFields = {
  title?: string;
  body?: string;
  metadata?: string[];
};

export type DatedLeafView = {
  path: string;
  title: string;
  body: string;
};

export type DatedLeafItem = {
  stem: string;
  path: string;
  title: string;
};

export type LeafReach = {
  all?: boolean;
  super?: boolean;
  withComposed?: boolean;
};

export function datedLeafFile<T extends TitledLeaf>(
  scope: string,
  entryPath: string,
  spec: DatedLeafSpec<T>,
): string {
  const abs = path.resolve(scope, entryPath);
  const rel = path.relative(scope, abs);
  const posix = rel.split(path.sep).join("/");
  if (
    rel.startsWith("..") ||
    path.isAbsolute(rel) ||
    !isWithinPath(abs, scope) ||
    !posix.startsWith(`${spec.folder}/`) ||
    !isLeafEntryName(path.basename(abs))
  ) {
    throw new Error(`${spec.label} path must be ${spec.folder}/<stem>/INDEX.md`);
  }
  return abs;
}

const DATED_DIRECTORY_MAX_BYTES = 255;

function titleSlug(title: string, now: Date): string {
  const prefixBytes = Buffer.byteLength(`${localDateYmd(now)}--`);
  return directoryStem(title, {
    lowercase: true,
    fallback: `untitled-${Math.floor(now.getTime() / 1000)}`,
    maxLength: DATED_DIRECTORY_MAX_BYTES - prefixBytes,
    maxLengthUnit: "bytes",
  });
}

function composeLeaf<T extends TitledLeaf>(
  spec: DatedLeafSpec<T>,
  anchor: string,
  title: string | undefined,
  body: string | undefined,
): { markdown: string; title: string } {
  if (title !== undefined && (title.length < 1 || title.length > 120)) {
    throw new Error(`${spec.label} title must be 1–120 characters`);
  }
  const draft = new spec.Model(anchor);
  draft.body = body ?? "";
  if (title !== undefined) draft.title = title;
  if (!draft.title.trim()) throw new Error(`${spec.label} title must be an H1 or --title`);
  if (draft.title.length > 120) throw new Error(`${spec.label} title must be 1–120 characters`);
  return { markdown: draft.body, title: draft.title };
}

async function loadDatedLeaf<T extends TitledLeaf>(
  env: NodeJS.ProcessEnv,
  spec: DatedLeafSpec<T>,
  entryPath: string,
): Promise<{ scope: string; node: T; file: string; service: ReturnType<typeof openNodeSession>["service"] }> {
  const { scope, service } = openNodeSession(env);
  const file = datedLeafFile(scope, entryPath, spec);
  const node = await service.get(file, spec.Model);
  if (!node) throw new Error(`${spec.label} not found: ${entryPath}`);
  return { scope, service, node, file };
}

export async function createDatedLeaf<T extends TitledLeaf>(
  env: NodeJS.ProcessEnv,
  spec: DatedLeafSpec<T>,
  input: DatedLeafFields,
): Promise<{ path: string; title: string }> {
  const { scope, service } = openNodeSession(env);
  const metadata = parseMetadata(input.metadata);
  const composed = composeLeaf(spec, path.join(scope, ENTRY_NAMES.leaf), input.title, input.body);
  const now = new Date();
  const file = path.join(scope, spec.folder, `${localDateYmd(now)}--${titleSlug(composed.title, now)}`, ENTRY_NAMES.leaf);
  const node = new spec.Model(file);
  await service.create(node, {
    body: composed.markdown,
    ...(metadata ? { metadata } : {}),
  });
  return { path: scopeRelativePath(scope, file), title: composed.title };
}

export async function getDatedLeaf<T extends TitledLeaf>(
  env: NodeJS.ProcessEnv,
  spec: DatedLeafSpec<T>,
  entryPath: string,
): Promise<DatedLeafView> {
  const { scope, node, file } = await loadDatedLeaf(env, spec, entryPath);
  return { path: scopeRelativePath(scope, file), title: node.title, body: node.body };
}

export async function updateDatedLeaf<T extends TitledLeaf>(
  env: NodeJS.ProcessEnv,
  spec: DatedLeafSpec<T>,
  entryPath: string,
  input: DatedLeafFields,
): Promise<{ path: string; title: string }> {
  const metadata = parseMetadata(input.metadata);
  if (input.title === undefined && input.body === undefined && metadata === undefined) {
    throw new Error("update must be --title, --body, or --metadata");
  }
  const { scope, service, node, file } = await loadDatedLeaf(env, spec, entryPath);
  let body = input.body;
  if (input.title !== undefined) {
    if (input.title.length < 1 || input.title.length > 120) {
      throw new Error(`${spec.label} title must be 1–120 characters`);
    }
    const draft = new spec.Model(file).parse(node.serialize());
    if (body !== undefined) draft.body = body;
    draft.title = input.title;
    body = draft.body;
  }
  const updated = await service.update(node, {
    ...(body !== undefined ? { body } : {}),
    ...(metadata ? { metadata } : {}),
  });
  return { path: scopeRelativePath(scope, file), title: updated.title };
}

export async function deleteDatedLeaf<T extends TitledLeaf>(
  env: NodeJS.ProcessEnv,
  spec: DatedLeafSpec<T>,
  entryPath: string,
): Promise<{ path: string }> {
  const { scope, service, node, file } = await loadDatedLeaf(env, spec, entryPath);
  await service.destroy(node);
  return { path: scopeRelativePath(scope, file) };
}

export async function listDatedLeaves<T extends TitledLeaf>(
  env: NodeJS.ProcessEnv,
  spec: DatedLeafSpec<T>,
  reach: LeafReach,
): Promise<DatedLeafItem[]> {
  const { scope, service } = openNodeSession(env);
  const nodes = reach.all
    ? (await buildSystemForest(scope, { includeSuper: reach.super === true, withComposed: reach.withComposed === true, form: "independent" })).flat()
    : await service
      .query(scope, { types: [spec.queryType], ...scopeTraversal(reach) })
      .value();
  return nodes.flatMap((node) => {
    if (!(node instanceof spec.Model)) return [];
    return [{
      stem: path.basename(path.dirname(node.path)),
      path: scopeRelativePath(scope, node.path),
      title: node.title,
    }];
  });
}
