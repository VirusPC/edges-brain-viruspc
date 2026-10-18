import { TaskNode } from "./task-node.js";
import { setDomainField } from "../../core/fields.js";
import { createMarkdownCodec } from "../../../utils/markdown/document.js";
import type { DocumentCodec, MarkdownDocument, Metadata, MetadataValue } from "../../../utils/markdown/types.js";
import matter from "gray-matter";
import type { TaskPriority, TaskProjectId, TaskStatus } from "./types.js";

export type ParsedTaskDoc = {
  name: string;
  description: string;
  metadata: Record<string, string>;
  body: string;
  rawFrontmatter: string;
};

function scalar(value: MetadataValue | undefined): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function fields(value: MetadataValue | undefined): Metadata {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new Error("Task metadata must be a mapping.");
  return value as Metadata;
}

const taskFormat = createMarkdownCodec("task");
export const taskDocumentCodec: DocumentCodec<MarkdownDocument<"task">, "task"> = {
  type: "task",
  parse(source) {
    const document = taskFormat.parse(source);
    fields(fields(document.metadata).metadata);
    return document;
  },
  serialize(document, originalSource) {
    fields(fields(document.metadata).metadata);
    return taskFormat.serialize(document, originalSource);
  },
};

export function parseTaskDoc(markdown: string): ParsedTaskDoc {
  const document = taskDocumentCodec.parse(markdown);
  const header = document.metadata ?? {};
  const metadata = Object.fromEntries(Object.entries(fields(header.metadata))
    .filter(([, value]) => value === null || typeof value !== "object")
    .map(([key, value]) => [key, scalar(value)]));
  return {
    name: scalar(header.name), description: scalar(header.description), metadata,
    body: document.body, rawFrontmatter: matter(markdown, {}).matter ?? "",
  };
}

export function setMetadataField(markdown: string, key: string, value: string): string {
  const document = new TaskNode('/task.md').parse(markdown);
  if (document.metadata === undefined) return markdown;
  setDomainField(document, key, value);
  return document.serialize();
}

export function setTopLevelField(markdown: string, key: "name" | "description", value: string): string {
  const document = new TaskNode('/task.md').parse(markdown);
  if (document.metadata === undefined) return markdown;
  document.setMetadata(key, value);
  return document.serialize();
}

export function taskBody(body: string): string {
  return `\n${body.startsWith("\n") ? body.slice(1) : body}${body && !body.endsWith("\n") ? "\n" : ""}`;
}

export function replaceBody(markdown: string, body: string): string {
  const document = new TaskNode('/task.md').parse(markdown);
  document.body = document.metadata === undefined ? body : taskBody(body);
  return document.serialize();
}

export function renderNewTaskDoc(input: {
  name: string;
  description: string;
  title: string;
  status: TaskStatus;
  project?: TaskProjectId;
  priority?: TaskPriority;
  assignee?: string;
  updatedAt: string;
  body: string;
}): string {
  const metadata: Metadata = {
    "edges-type": "task",
    "edges-title": input.title,
    "edges-tasks-status": input.status,
  };
  if (input.project && input.project !== "default") metadata["edges-task-project"] = input.project;
  if (input.priority && input.priority !== "none") metadata["edges-task-priority"] = input.priority;
  if (input.assignee) metadata["edges-task-assignee"] = input.assignee;
  metadata["edges-updated-at"] = input.updatedAt;
  return taskDocumentCodec.serialize({ metadata: { name: input.name, description: input.description, metadata }, body: taskBody(input.body) });
}
