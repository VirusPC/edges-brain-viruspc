import { validateTaskDocInput } from "./task-doc.js";
import { parseSource, parseSourceProject, type TaskSource } from "./grouped.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TasksError } from "../../domain/models/tasks/types.js";
import type { TaskDoc } from "../../domain/models/tasks/task-doc.js";

export type ReviewPageGroup = {
  source?: TaskSource;
  project?: string;
  id: string;
  title: string;
  description?: string;
};

export type ReviewPageItem = {
  id?: string;
  source?: TaskSource;
  project?: string;
  stem: string;
  current: string;
  suggested: string;
  title?: string;
  description?: string;
  note?: string;
  status?: string;
  priority?: string;
  doc?: TaskDoc;
};

export type ReviewPageInput = {
  groups: ReviewPageGroup[];
  items: ReviewPageItem[];
};

export type ReviewPageWriteFile = (
  file: string,
  data: string,
  encoding: BufferEncoding,
) => Promise<unknown>;

const PAYLOAD_SCRIPT_RE =
  /<script\s+type="application\/json"\s+id="edges-review-payload">[\s\S]*?<\/script>/;

const INVALID_INPUT = "review-page input must be a JSON object with groups[] and items[]";
const INVALID_GROUPS = "review-page groups must be a non-empty array";
const INVALID_GROUP_ID = "review-page group id must be a non-empty string";
const INVALID_GROUP_TITLE = "invalid review-page group title (expected 1–120 characters, no newlines)";
const INVALID_ITEMS = "review-page items must be an array";
const INVALID_ITEM_STEM = "review-page item stem must be a non-empty string";
const MISSING_PAYLOAD_SCRIPT = "review-page template missing edges-review-payload script";

function fail(message: string): never {
  throw new TasksError("VALIDATION_ERROR", message);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGroup(raw: unknown, seenIds: Set<string>): ReviewPageGroup {
  if (!isPlainObject(raw) || typeof raw.id !== "string" || raw.id.trim() === "") {
    fail(INVALID_GROUP_ID);
  }
  const id = raw.id.trim();
  if (seenIds.has(id)) {
    fail(`duplicate review-page group id: ${id}`);
  }
  seenIds.add(id);

  if (typeof raw.title !== "string") {
    fail(INVALID_GROUP_TITLE);
  }
  const title = raw.title.trim();
  if (title.length < 1 || title.length > 120 || /[\r\n]/.test(title)) {
    fail(INVALID_GROUP_TITLE);
  }

  const description = typeof raw.description === "string" ? raw.description : "";
  const source = parseSource(raw.source);
  return { id, title, description, ...(source ? { source, project: parseSourceProject(raw.project) } : {}) };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseItem(raw: unknown, groupIds: Set<string>, seenStems: Set<string>): ReviewPageItem {
  if (!isPlainObject(raw) || typeof raw.stem !== "string" || raw.stem.trim() === "") {
    fail(INVALID_ITEM_STEM);
  }
  const stem = raw.stem.trim();
  const source = parseSource(raw.source);
  const id = source && typeof raw.id === "string" && raw.id ? raw.id : stem;
  if (seenStems.has(id)) {
    fail(`duplicate review-page item stem: ${stem}`);
  }
  seenStems.add(id);

  const current = typeof raw.current === "string" ? raw.current.trim() : "";
  const suggested = typeof raw.suggested === "string" ? raw.suggested.trim() : "";
  if (!groupIds.has(current)) {
    fail(`review-page item ${stem} current group not found: ${current}`);
  }
  if (!groupIds.has(suggested)) {
    fail(`review-page item ${stem} suggested group not found: ${suggested}`);
  }

  const item: ReviewPageItem = { stem, current, suggested, ...(source ? { id, source, project: parseSourceProject(raw.project) } : {}) };
  const title = optionalString(raw.title);
  const description = optionalString(raw.description);
  const note = optionalString(raw.note);
  if (title !== undefined) {
    item.title = title;
  }
  if (description !== undefined) {
    item.description = description;
  }
  if (note !== undefined) {
    item.note = note;
  }
  const status = optionalString(raw.status);
  const priority = optionalString(raw.priority);
  if (status !== undefined) {
    item.status = status;
  }
  if (priority !== undefined) {
    item.priority = priority;
  }
  if ("doc" in raw && raw.doc !== undefined) {
    item.doc = validateTaskDocInput(raw.doc, "review-page doc");
  }
  return item;
}

export function parseReviewPageInput(raw: unknown): ReviewPageInput {
  if (!isPlainObject(raw) || !("groups" in raw) || !("items" in raw)) {
    fail(INVALID_INPUT);
  }
  if (!Array.isArray(raw.groups) || raw.groups.length < 1) {
    fail(INVALID_GROUPS);
  }
  if (!Array.isArray(raw.items)) {
    fail(INVALID_ITEMS);
  }

  const seenIds = new Set<string>();
  const groups = raw.groups.map((group) => parseGroup(group, seenIds));
  const seenStems = new Set<string>();
  const items = raw.items.map((item) => parseItem(item, seenIds, seenStems));
  for (const item of items) {
    if (!item.source) continue;
    for (const id of [item.current, item.suggested]) {
      const group = groups.find(group => group.id === id)!;
      if (!group.source || group.source.scope !== item.source.scope || group.source.purpose !== item.source.purpose) fail("review-page cannot assign across source boards");
    }
  }
  return { groups, items };
}

export function defaultReviewPageAssetDir(): string {
  return fileURLToPath(new URL("../../commands/tasks/project/assets/review-page/", import.meta.url));
}

function missingAsset(abs: string): never {
  fail(`review-page asset missing: ${abs} (run pnpm --filter @viruspc/edges run build:tasks-review-app)`);
}

async function readAsset(
  readFile: (abs: string) => Promise<string>,
  abs: string,
): Promise<string> {
  try {
    return await readFile(abs);
  } catch {
    missingAsset(abs);
  }
}

export async function loadBuiltReviewShell(
  readFile: (abs: string) => Promise<string>,
  assetDir?: string,
): Promise<string> {
  const dir = assetDir ?? defaultReviewPageAssetDir();
  const html = await readAsset(readFile, path.join(dir, "index.html"));
  const js = await readAsset(readFile, path.join(dir, "review.js"));
  const css = await readAsset(readFile, path.join(dir, "review.css"));
  const safeJs = js.replaceAll("</script", "<\\/script");
  const safeCss = css.replaceAll("</style", "<\\/style");
  return html
    .replace(
      /<script type="module"[^>]*><\/script>/,
      () => `<script type="module">${safeJs}</script>`,
    )
    .replace(
      /<link rel="stylesheet"[^>]*>/,
      () => `<style type='text/css'>${safeCss}</style>`,
    );
}

export function renderReviewPageHtml(input: ReviewPageInput, templateHtml: string): string {
  if (!PAYLOAD_SCRIPT_RE.test(templateHtml)) {
    fail(MISSING_PAYLOAD_SCRIPT);
  }
  const payload = JSON.stringify({ groups: input.groups, items: input.items }).replaceAll(
    "<",
    "\\u003c",
  );
  return templateHtml.replace(
    PAYLOAD_SCRIPT_RE,
    `<script type="application/json" id="edges-review-payload">${payload}</script>`,
  );
}

export function resolveReviewPageOutPath(
  outFlag: string | undefined,
  nowMs: number,
  tmpDir: string,
): string {
  if (outFlag !== undefined && outFlag !== "") {
    return path.resolve(outFlag);
  }
  return path.join(tmpDir, `edges-review-page-${nowMs}.html`);
}

export async function writeReviewPage(
  absPath: string,
  html: string,
  writeFile: ReviewPageWriteFile,
): Promise<void> {
  await writeFile(absPath, html, "utf8");
}

export type RenderReviewPageDeps = {
  readFile: (abs: string) => Promise<string>;
  writeFile: ReviewPageWriteFile;
  nowMs: number;
  tmpDir: string;
  assetDir?: string;
};

export async function renderReviewPageFromText(
  text: string,
  out: string | undefined,
  deps: RenderReviewPageDeps,
): Promise<{ path: string; groupCount: number; itemCount: number }> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new TasksError(
      "VALIDATION_ERROR",
      "review-page input must be a JSON object with groups[] and items[]",
    );
  }
  const input = parseReviewPageInput(raw);
  const shell = await loadBuiltReviewShell(deps.readFile, deps.assetDir);
  const html = renderReviewPageHtml(input, shell);
  const path = resolveReviewPageOutPath(out, deps.nowMs, deps.tmpDir);
  await writeReviewPage(path, html, deps.writeFile);
  return { path, groupCount: input.groups.length, itemCount: input.items.length };
}
