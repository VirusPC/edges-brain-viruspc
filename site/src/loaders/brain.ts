import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createMarkdownProcessor, type MarkdownProcessor } from '@astrojs/markdown-remark';
import matter from 'gray-matter';
import type { Loader } from 'astro/loaders';
import {
  FIXTURE_ID,
  dateForPost,
  excerpt,
  formatISODate,
  isFixtureId,
  listDatedNoteDirs,
  listPostFiles,
  noteDateFromName,
  stripMatchingFirstHeading,
  titleForNote,
  titleForPost,
} from '../lib/select.mjs';
import {
  fallbackDocumentName,
  listProjectDocuments,
  titleForProject,
} from '../lib/projects.mjs';

type LoaderContext = Parameters<Loader['load']>[0];

interface Normalized {
  id: string;
  abs: string;
  sourcePath: string;
  title: string;
  date?: string;
  description?: string;
  draft?: boolean;
  hasPage?: boolean;
  isHub?: boolean;
  projectId?: string;
  projectTitle?: string;
  projectDate?: string;
  skipRender?: boolean;
  body: string;
  raw: string;
}

function repoRootFrom(configRoot: URL) {
  return path.resolve(fileURLToPath(configRoot), '..');
}

function readMarkdown(abs: string): { data: Record<string, unknown>; content: string; raw: string } {
  const raw = fs.readFileSync(abs, 'utf8');
  try {
    const parsed = matter(raw);
    return {
      raw,
      data: (parsed.data ?? {}) as Record<string, unknown>,
      content: parsed.content,
    };
  } catch {
    return { raw, data: {}, content: raw };
  }
}

function stringField(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === 'string' ? value.trim() : '';
}

let markdownProcessor: Promise<MarkdownProcessor> | undefined;

function markdownFor(context: LoaderContext) {
  markdownProcessor ??= createMarkdownProcessor({
    ...context.config.markdown,
    image: context.config.image,
  });
  return markdownProcessor;
}

async function storeEntries(context: LoaderContext, entries: Normalized[]) {
  const { store, parseData, generateDigest, logger } = context;
  const processor = await markdownFor(context);
  store.clear();
  const root = fileURLToPath(context.config.root);
  for (const entry of entries) {
    const rawData: Record<string, unknown> = {
      title: entry.title,
      sourcePath: entry.sourcePath,
    };
    if (entry.date) rawData.date = entry.date;
    if (entry.description) rawData.description = entry.description;
    if (entry.draft) rawData.draft = true;
    if (entry.hasPage != null) rawData.hasPage = entry.hasPage;
    if (entry.isHub != null) rawData.isHub = entry.isHub;
    if (entry.projectId) rawData.projectId = entry.projectId;
    if (entry.projectTitle) rawData.projectTitle = entry.projectTitle;
    if (entry.projectDate) rawData.projectDate = entry.projectDate;
    const data = await parseData({
      id: entry.id,
      data: rawData,
      filePath: entry.skipRender ? undefined : entry.abs,
    });
    if (entry.skipRender) {
      store.set({
        id: entry.id,
        data,
        digest: generateDigest(entry.raw),
        rendered: { html: '', metadata: { headings: [], imagePaths: [] } },
      });
      continue;
    }
    let rendered;
    try {
      const result = await processor.render(entry.body, {
        frontmatter: data,
        fileURL: pathToFileURL(entry.abs),
      });
      const imagePaths = [
        ...(result.metadata.localImagePaths ?? []),
        ...(result.metadata.remoteImagePaths ?? []),
      ];
      rendered = {
        html: result.code,
        metadata: {
          ...result.metadata,
          imagePaths,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Render failed for ${entry.sourcePath}: ${message}`);
      throw new Error(`Render failed for ${entry.sourcePath}: ${message}`, { cause: error });
    }
    store.set({
      id: entry.id,
      data,
      body: entry.body,
      filePath: path.relative(root, entry.abs).split(path.sep).join('/'),
      digest: generateDigest(entry.raw),
      rendered,
      assetImports: rendered.metadata.imagePaths,
    });
  }
}

function bindWatcher(
  watcher: LoaderContext['watcher'],
  dirs: string[],
  sync: () => Promise<void>,
  logger: LoaderContext['logger'],
  state: { bound: boolean },
) {
  if (!watcher || state.bound) return;
  state.bound = true;
  for (const dir of dirs) {
    if (fs.existsSync(dir)) watcher.add(dir);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      sync().catch((error: unknown) => {
        logger.error(error instanceof Error ? error.message : String(error));
      });
    }, 80);
  };
  watcher.on('add', schedule);
  watcher.on('change', schedule);
  watcher.on('unlink', schedule);
}

export function postsLoader(): Loader {
  const state = { bound: false };
  return {
    name: 'brain-posts',
    load: async (context) => {
      const root = repoRootFrom(context.config.root);
      const postsRoot = path.join(root, 'posts');
      const fixture =
        process.env.SITE_INCLUDE_FIXTURE === '1'
          ? path.join(fileURLToPath(context.config.root), 'fixtures', 'sample-post.md')
          : '';

      const sync = async () => {
        const entries: Normalized[] = [];
        for (const rel of listPostFiles(postsRoot)) {
          const abs = path.join(postsRoot, rel);
          const parsed = readMarkdown(abs);
          const title = titleForPost(parsed.content, rel, stringField(parsed.data, 'title'));
          const date = dateForPost(rel, parsed.data.date);
          const description =
            stringField(parsed.data, 'description') || excerpt(parsed.content) || undefined;
          entries.push({
            id: rel.replace(/\.mdx?$/i, ''),
            abs,
            sourcePath: `posts/${rel}`,
            title,
            date: date ? formatISODate(date) : undefined,
            description,
            draft: parsed.data.draft === true,
            body: stripMatchingFirstHeading(parsed.content, title),
            raw: parsed.raw,
          });
        }
        if (fixture && fs.existsSync(fixture)) {
          const parsed = readMarkdown(fixture);
          const title = titleForPost(parsed.content, 'sample-post.md', stringField(parsed.data, 'title'));
          const date = dateForPost('sample-post.md', parsed.data.date);
          if (!entries.some((entry) => isFixtureId(entry.id))) {
            entries.push({
              id: FIXTURE_ID,
              abs: fixture,
              sourcePath: 'site/fixtures/sample-post.md',
              title,
              date: date ? formatISODate(date) : undefined,
              description: stringField(parsed.data, 'description') || excerpt(parsed.content),
              draft: false,
              body: stripMatchingFirstHeading(parsed.content, title),
              raw: parsed.raw,
            });
          }
        }
        const publishable = entries.filter((entry) => !entry.draft);
        if (publishable.length === 0 && fs.existsSync(path.join(postsRoot, 'README.md'))) {
          publishable.push({
            id: '__empty',
            abs: path.join(postsRoot, 'README.md'),
            sourcePath: 'posts/README.md',
            title: 'empty',
            draft: true,
            body: '',
            raw: 'empty',
          });
        }
        await storeEntries(context, publishable);
      };

      await sync();
      bindWatcher(context.watcher, [postsRoot], sync, context.logger, state);
    },
  };
}

export function notesLoader(): Loader {
  const state = { bound: false };
  return {
    name: 'brain-notes',
    load: async (context) => {
      const root = repoRootFrom(context.config.root);
      const notesRoot = path.join(root, 'notes');

      const sync = async () => {
        const entries: Normalized[] = [];
        for (const folder of listDatedNoteDirs(notesRoot)) {
          const abs = path.join(notesRoot, folder, 'INDEX.md');
          const parsed = readMarkdown(abs);
          const title = titleForNote(parsed.content, folder, stringField(parsed.data, 'title'));
          const date = noteDateFromName(folder);
          if (!date) continue;
          entries.push({
            id: folder,
            abs,
            sourcePath: `notes/${folder}/INDEX.md`,
            title,
            date: formatISODate(date),
            description:
              stringField(parsed.data, 'description') || excerpt(parsed.content) || undefined,
            draft: false,
            body: stripMatchingFirstHeading(parsed.content, title),
            raw: parsed.raw,
          });
        }
        await storeEntries(context, entries);
      };

      await sync();
      bindWatcher(context.watcher, [notesRoot], sync, context.logger, state);
    },
  };
}

export function projectsLoader(): Loader {
  const state = { bound: false };
  return {
    name: 'brain-projects',
    load: async (context) => {
      const root = repoRootFrom(context.config.root);
      const projectsRoot = path.join(root, 'projects');

      const sync = async () => {
        const entries: Normalized[] = [];
        for (const doc of listProjectDocuments(projectsRoot)) {
          const abs = path.join(projectsRoot, doc.projectId, doc.relPosix);
          const isPage = doc.kind === 'md';
          const parsed = isPage ? readMarkdown(abs) : { data: {}, content: '', raw: doc.relPosix };
          const title = titleForProject(
            fallbackDocumentName(doc.projectId, doc.relPosix),
            parsed.content,
            stringField(parsed.data, 'title'),
          );
          entries.push({
            id: doc.collectionId,
            abs,
            sourcePath: `projects/${doc.projectId}/${doc.relPosix}`,
            title,
            date: doc.date ? formatISODate(doc.date) : undefined,
            description: isPage
              ? stringField(parsed.data, 'description') || excerpt(parsed.content) || undefined
              : undefined,
            hasPage: isPage,
            isHub: doc.isHub,
            projectId: doc.projectId,
            projectDate: doc.projectDate ? formatISODate(doc.projectDate) : undefined,
            skipRender: !isPage,
            body: isPage ? stripMatchingFirstHeading(parsed.content, title) : '',
            raw: parsed.raw,
          });
        }
        const hubTitle = new Map<string, string>();
        for (const entry of entries) {
          if (entry.isHub && entry.projectId) hubTitle.set(entry.projectId, entry.title);
        }
        for (const entry of entries) {
          entry.projectTitle =
            (entry.projectId && hubTitle.get(entry.projectId)) ||
            titleForProject(entry.projectId ?? entry.title, '', '');
        }
        await storeEntries(context, entries);
      };

      await sync();
      bindWatcher(context.watcher, [projectsRoot], sync, context.logger, state);
    },
  };
}
