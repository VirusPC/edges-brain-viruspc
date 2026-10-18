import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { resolveScope } from "../scope.js";
import { listRepositoryTasksWithDocs } from "./board.js";
import { loadBuiltReviewShell, parseReviewPageInput, renderReviewPageHtml } from "./review-page.js";
import { DEFAULT_TASK_PROJECT } from "../../domain/models/tasks/types.js";
import { fieldText } from "../list-query.js";

export const DEFAULT_TASKS_SITE_REL = "tasks/_site/index.html";
export function defaultTasksSiteOutPath(scopeDir: string): string { return path.join(scopeDir, DEFAULT_TASKS_SITE_REL); }
export function findEdgesRepo(startDir: string, env: NodeJS.ProcessEnv = process.env): string { return resolveScope(env, startDir); }

export async function generateTasksSite(input: {
  repoPath: string;
  outPath: string;
  env?: NodeJS.ProcessEnv;
}): Promise<{ path: string; groupCount: number; itemCount: number }> {
  const records = await listRepositoryTasksWithDocs(input.repoPath) as unknown as Record<string, unknown>[];
  const buckets = new Map<string, { id: string; title: string; source?: unknown; project?: unknown; items: Record<string, unknown>[] }>();
  for (const item of records) {
    const title = fieldText(item, "project");
    const source = item.source as { scope?: string; purpose?: string } | undefined;
    const id = source ? `${source.scope}:${source.purpose}:${title}` : title;
    const bucket = buckets.get(id) ?? { id, title, source, project: item.project, items: [] };
    bucket.items.push(item);
    buckets.set(id, bucket);
  }
  const groups = buckets.size > 0 ? [...buckets.values()] : [{ id: DEFAULT_TASK_PROJECT, title: DEFAULT_TASK_PROJECT, items: [] as Record<string, unknown>[] }];
  const page = parseReviewPageInput({
    groups: groups.map((group) => ({
      id: group.id,
      title: group.title,
      description: "",
      ...(group.source ? { source: group.source, project: group.project } : {}),
    })),
    items: groups.flatMap((group) =>
      group.items.map((item) => ({
        stem: String(item.stem),
        current: group.id,
        suggested: group.id,
        ...(typeof item.title === "string" ? { title: item.title } : {}),
        ...(typeof item.description === "string" ? { description: item.description } : {}),
        ...(typeof item.status === "string" ? { status: item.status } : {}),
        ...(typeof item.priority === "string" ? { priority: item.priority } : {}),
        ...(item.doc ? { doc: item.doc } : {}),
        ...(item.source
          ? {
              id: `${String((item.source as { scope: string }).scope)}:${String((item.source as { purpose: string }).purpose)}:${String(item.project)}:${String(item.stem)}`,
              source: item.source,
              project: item.project,
            }
          : {}),
      })),
    ),
  });
  const shell = await loadBuiltReviewShell(abs => readFile(abs, "utf8"));
  const outPath = path.resolve(input.outPath);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, renderReviewPageHtml(page, shell), "utf8");
  return { path: outPath, groupCount: page.groups.length, itemCount: page.items.length };
}
