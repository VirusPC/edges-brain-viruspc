import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listProjectDocuments, projectsRoot } from './projects.mjs';

const ORIGIN = 'https://edges.viruspc.tech/teaching/';
const LESSON_RE = /(?:^|\/)(?:lesson-\d+\.html|lessons\/[^/]+\.html)$/i;
const REFERENCE_RE = /(?:^|\/)reference\/[^/]+\.html$/i;
const NOTES_RE = /(?:^|\/)notes\/[^/]+\.html$/i;

/** @type {Map<string, ReturnType<typeof buildTeachingCatalog>>} */
const cache = new Map();

/**
 * @param {string} [repoRoot]
 */
export function buildTeachingCatalog(repoRoot = defaultRepoRoot()) {
  const root = path.resolve(repoRoot);
  const hit = cache.get(root);
  if (hit) return hit;
  const teachingRoot = path.join(root, 'teaching');
  const topics = topicOrder(teachingRoot);
  const projectRoutes = projectRouteMap();
  /** @type {Map<string, { rel: string, abs: string, topic: string, canonicalRel: string }>} */
  const htmlFiles = new Map();
  /** @type {any[]} */
  const pages = [];
  /** @type {any[]} */
  const topicModels = [];

  for (const topic of topics) {
    const topicDir = path.join(teachingRoot, topic.id);
    const files = listTopicFiles(topicDir);
    const html = files.filter((rel) => rel.endsWith('.html') && rel !== 'index.html');
    const canonical = canonicalMap(topicDir, html);
    for (const rel of html) {
      const key = `${topic.id}/${rel}`;
      htmlFiles.set(key, {
        rel: key,
        abs: path.join(topicDir, rel),
        topic: topic.id,
        canonicalRel: canonical.get(rel) || rel,
      });
    }
    const indexAbs = path.join(topicDir, 'index.html');
    const indexHtml = fs.existsSync(indexAbs) ? fs.readFileSync(indexAbs, 'utf8') : '';
    const model = modelTopic({
      topic,
      topicDir,
      html,
      canonical,
      indexHtml,
      files,
      projectRoutes,
      repoRoot: root,
    });
    topicModels.push(model);
    for (const page of model.pages) pages.push(page);
  }

  const catalog = {
    root,
    teachingRoot,
    topics: topicModels,
    pages,
    htmlFiles,
    projectRoutes,
  };
  cache.set(root, catalog);
  return catalog;
}

export function defaultRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

/**
 * @param {string} base trailing-slash site base, such as `/edges-brain-viruspc/`
 * @param {string} route path without a leading slash
 */
export function publicHref(base, route) {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  const clean = String(route).replace(/^\/+/, '').replace(/\/+$/, '');
  if (/\.(?:xml|svg|html|txt|json|css|js|png|jpe?g|gif|webp|ico|pdf)$/i.test(clean)) {
    return `${prefix}${clean}`;
  }
  return `${prefix}${clean}/`;
}

/**
 * @param {ReturnType<typeof buildTeachingCatalog>} catalog
 * @param {string} fromRel path from `teaching/`, posix
 * @param {string} url
 * @param {string} base
 */
export function rewriteTeachingUrl(catalog, fromRel, url, base) {
  const split = splitUrl(url);
  if (!split || split.external) return null;
  const fromAbs = path.join(catalog.teachingRoot, ...fromRel.split('/'));
  const fromDir = path.dirname(fromAbs);
  const resolved = path.resolve(fromDir, split.pathname);
  const teachingRel = relativePosix(catalog.teachingRoot, resolved);
  if (teachingRel && !teachingRel.startsWith('..')) {
    const stat = statOf(resolved);
    if (stat === 'dir' || /(^|\/)index\.html$/i.test(teachingRel)) {
      const topic = teachingRel.split('/')[0];
      if (topic && catalog.topics.some((item) => item.id === topic) && (stat === 'dir' || teachingRel === `${topic}/index.html`)) {
        return withHash(publicHref(base, `teaching/${topic}`), split.hash);
      }
    }
    if (stat === 'file') {
      if (/\.html$/i.test(teachingRel)) {
        const file = catalog.htmlFiles.get(teachingRel);
        const topic = file?.topic || teachingRel.split('/')[0];
        const leaf = (file?.canonicalRel || teachingRel.slice(teachingRel.indexOf('/') + 1)).replace(/\.html$/i, '');
        return withHash(publicHref(base, `teaching/${topic}/${leaf}`), split.hash);
      }
      if (/\.md$/i.test(teachingRel)) {
        const route = markdownRoute(teachingRel);
        return route ? withHash(publicHref(base, `teaching/${route}`), split.hash) : null;
      }
      if (/\.(?:js|png|jpe?g|gif|webp|svg)$/i.test(teachingRel)) {
        return withHash(publicHref(base, `teaching-static/${teachingRel}`), split.hash);
      }
    }
    return null;
  }
  const projectRel = relativePosix(path.join(catalog.root, 'projects'), resolved);
  if (projectRel && !projectRel.startsWith('..') && statOf(resolved) === 'file') {
    const doc = catalog.projectRoutes.get(projectRel);
    if (doc?.kind === 'md') return withHash(publicHref(base, `projects/${doc.routeId}`), split.hash);
  }
  return null;
}

/**
 * Two lesson files are the same lesson when the shorter token set is almost
 * entirely inside the longer one. Nearby but different lessons stay apart.
 *
 * @param {string} left
 * @param {string} right
 */
export function sameLessonText(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  const small = Math.min(a.size, b.size);
  if (small < 40) return false;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / small >= 0.9;
}

export function visibleText(html) {
  return decodeBasic(stripTags(stripEmbedded(html))).replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} teachingRoot
 */
function topicOrder(teachingRoot) {
  const index = fs.readFileSync(path.join(teachingRoot, 'index.html'), 'utf8');
  /** @type {{ id: string, title: string }[]} */
  const topics = [];
  for (const anchor of anchors(index)) {
    const match = anchor.href.match(/^\.\/([^/?#]+)\/$/);
    if (!match) continue;
    const id = match[1];
    const dir = path.join(teachingRoot, id);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    if (topics.some((item) => item.id === id)) continue;
    topics.push({ id, title: anchor.text || id });
  }
  return topics;
}

/**
 * @param {string} topicDir
 * @param {string[]} html
 */
function canonicalMap(topicDir, html) {
  const lessons = html.filter((rel) => LESSON_RE.test(rel));
  const indexAbs = path.join(topicDir, 'index.html');
  const indexLinks = fs.existsSync(indexAbs)
    ? anchors(fs.readFileSync(indexAbs, 'utf8'))
        .map((anchor) => normalizeRel(anchor.href))
        .filter((rel) => rel && lessons.includes(rel))
    : [];
  /** @type {Map<string, string>} */
  const map = new Map();
  const texts = new Map(lessons.map((rel) => [rel, visibleText(fs.readFileSync(path.join(topicDir, rel), 'utf8'))]));
  const used = new Set();
  for (let i = 0; i < lessons.length; i += 1) {
    if (used.has(lessons[i])) continue;
    for (let j = i + 1; j < lessons.length; j += 1) {
      if (used.has(lessons[j])) continue;
      if (!sameLessonText(texts.get(lessons[i]) || '', texts.get(lessons[j]) || '')) continue;
      const left = lessons[i];
      const right = lessons[j];
      const leftAt = indexLinks.indexOf(left);
      const rightAt = indexLinks.indexOf(right);
      let canonical = left;
      if (leftAt >= 0 && rightAt < 0) canonical = left;
      else if (rightAt >= 0 && leftAt < 0) canonical = right;
      else if (leftAt >= 0 && rightAt >= 0) canonical = leftAt <= rightAt ? left : right;
      else continue;
      const alias = canonical === left ? right : left;
      map.set(alias, canonical);
      used.add(alias);
      used.add(canonical);
    }
  }
  return map;
}

/**
 * @param {{
 *   topic: { id: string, title: string },
 *   topicDir: string,
 *   html: string[],
 *   canonical: Map<string, string>,
 *   indexHtml: string,
 *   files: string[],
 *   projectRoutes: Map<string, { routeId: string, kind: string }>,
 *   repoRoot: string,
 * }} input
 */
function modelTopic(input) {
  const { topic, topicDir, html, canonical, indexHtml, files, projectRoutes, repoRoot } = input;
  /** @type {any[]} */
  const pages = [];
  /** @type {any[]} */
  const lessons = [];
  /** @type {any[]} */
  const secondary = [];
  /** @type {any[]} */
  const references = [];
  /** @type {any[]} */
  const notes = [];
  /** @type {any[]} */
  const materials = [];
  const seenLessons = new Set();
  /** @type {Set<string>} */
  const made = new Set();

  const consumeHtml = (rel, titleHint, roleHint) => {
    const key = `${topic.id}/${rel}`;
    if (made.has(key)) return pages.find((page) => page.rel === key) || null;
    const abs = path.join(topicDir, rel);
    if (!fs.existsSync(abs)) return null;
    made.add(key);
    const raw = fs.readFileSync(abs, 'utf8');
    const canonicalRel = canonical.get(rel) || rel;
    const role = roleHint || roleFor(rel, canonicalRel);
    const title = lessonTitle(titleHint, raw) || rel;
    const route = `${topic.id}/${rel.replace(/\.html$/i, '')}`;
    const page = {
      route,
      abs,
      rel: `${topic.id}/${rel}`,
      topic: topic.id,
      kind: 'html',
      role: rel === canonicalRel ? role : 'secondary',
      title,
      canonicalRoute: rel === canonicalRel ? null : `${topic.id}/${canonicalRel.replace(/\.html$/i, '')}`,
      origin: `${ORIGIN}${topic.id}/${rel}`,
    };
    pages.push(page);
    return page;
  };

  if (indexHtml) {
    for (const anchor of anchors(indexHtml)) {
      const rel = normalizeRel(anchor.href);
      if (!rel || rel.startsWith('..')) {
        const project = projectTarget(topicDir, anchor.href, projectRoutes, repoRoot);
        if (project) notes.push({ title: anchor.text || project.title, path: project.path });
        continue;
      }
      if (rel === 'index.html' || rel.endsWith('/index.html')) continue;
      if (/\.html$/i.test(rel)) {
        if (LESSON_RE.test(rel)) {
          const canonicalRel = canonical.get(rel) || rel;
          if (seenLessons.has(canonicalRel)) {
            if (rel !== canonicalRel) {
              const page = consumeHtml(rel, secondaryLabel(anchor), 'secondary');
              if (page && !secondary.some((item) => item.path === `teaching/${page.route}`)) {
                secondary.push({ title: page.title, path: `teaching/${page.route}` });
              }
            }
            continue;
          }
          seenLessons.add(canonicalRel);
          const page = consumeHtml(canonicalRel, anchor.text, 'primary');
          if (page) lessons.push({ title: page.title, path: `teaching/${page.route}` });
          if (rel !== canonicalRel) {
            const alias = consumeHtml(rel, secondaryLabel(anchor), 'secondary');
            if (alias) secondary.push({ title: alias.title, path: `teaching/${alias.route}` });
          }
          continue;
        }
        const page = consumeHtml(rel, anchor.text, roleFor(rel, rel));
        if (!page) continue;
        if (page.role === 'reference') references.push({ title: page.title, path: `teaching/${page.route}` });
        else notes.push({ title: page.title, path: `teaching/${page.route}` });
        continue;
      }
    }
  } else {
    for (const rel of html.filter((item) => /^lessons\//.test(item)).sort(compareRel)) {
      const page = consumeHtml(rel, '', 'primary');
      if (!page) continue;
      seenLessons.add(rel);
      lessons.push({ title: page.title, path: `teaching/${page.route}` });
    }
  }

  for (const rel of html) {
    if (pages.some((page) => page.rel === `${topic.id}/${rel}`)) continue;
    const page = consumeHtml(rel, '', roleFor(rel, canonical.get(rel) || rel));
    if (!page) continue;
    if (!indexHtml && page.role === 'reference') references.push({ title: page.title, path: `teaching/${page.route}` });
    else if (!indexHtml && page.role === 'note') notes.push({ title: page.title, path: `teaching/${page.route}` });
  }

  if (!indexHtml) {
    references.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  }

  for (const rel of files.filter((item) => item.endsWith('.md')).sort(compareRel)) {
    const abs = path.join(topicDir, rel);
    const raw = fs.readFileSync(abs, 'utf8');
    const route = markdownRoute(`${topic.id}/${rel}`);
    const title = markdownTitle(raw, path.basename(rel, '.md'));
    pages.push({
      route,
      abs,
      rel: `${topic.id}/${rel}`,
      topic: topic.id,
      kind: 'md',
      role: 'material',
      title,
      canonicalRoute: null,
      origin: `${ORIGIN}${topic.id}/${rel}`,
    });
    materials.push({ title, path: `teaching/${route}` });
  }

  return {
    id: topic.id,
    title: topic.title,
    hasIndex: Boolean(indexHtml),
    lessons: lessons.map((lesson, index) => ({
      ...lesson,
      number: String(index + 1).padStart(2, '0'),
    })),
    secondary,
    references,
    notes,
    materials,
    pages,
  };
}

/**
 * @param {string} rel
 * @param {string} canonicalRel
 */
function roleFor(rel, canonicalRel) {
  if (rel !== canonicalRel) return 'secondary';
  if (LESSON_RE.test(rel)) return 'primary';
  if (REFERENCE_RE.test(rel)) return 'reference';
  if (NOTES_RE.test(rel)) return 'note';
  return 'note';
}

/**
 * @param {{ text: string, context: string }} anchor
 */
function secondaryLabel(anchor) {
  if (anchor.context.includes('便携版') || anchor.text.includes('便携版')) return '便携版';
  if (/\.html?$/i.test(anchor.text)) return '便携版';
  return anchor.text;
}

/**
 * @param {string} topicDir
 * @param {string} href
 * @param {Map<string, { routeId: string, kind: string }>} projectRoutes
 * @param {string} repoRoot
 */
function projectTarget(topicDir, href, projectRoutes, repoRoot) {
  const split = splitUrl(href);
  if (!split || split.external) return null;
  const resolved = path.resolve(topicDir, split.pathname);
  const rel = relativePosix(path.join(repoRoot, 'projects'), resolved);
  if (!rel || rel.startsWith('..')) return null;
  const doc = projectRoutes.get(rel);
  if (!doc || doc.kind !== 'md') return null;
  return { path: `projects/${doc.routeId}`, title: path.basename(rel) };
}

function projectRouteMap() {
  /** @type {Map<string, { routeId: string, kind: string }>} */
  const map = new Map();
  for (const doc of listProjectDocuments(projectsRoot())) {
    map.set(`${doc.projectId}/${doc.relPosix}`.split(path.sep).join('/'), {
      routeId: doc.routeId,
      kind: doc.kind,
    });
  }
  return map;
}

/**
 * @param {string} dir
 */
function listTopicFiles(dir) {
  /** @type {string[]} */
  const out = [];
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'repos' || entry.name === 'node_modules') continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(current, entry.name), rel);
      else if (entry.isFile()) out.push(rel);
    }
  };
  walk(dir, '');
  return out;
}

/**
 * @param {string} html
 */
function anchors(html) {
  const clean = stripEmbedded(html);
  /** @type {{ href: string, text: string, context: string }[]} */
  const found = [];
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of clean.matchAll(re)) {
    const hrefMatch = match[1].match(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (!hrefMatch) continue;
    const href = (hrefMatch[1] ?? hrefMatch[2] ?? '').trim();
    const text = decodeBasic(stripTags(match[2])).replace(/\s+/g, ' ').trim();
    const context = decodeBasic(stripTags(clean.slice(Math.max(0, match.index - 40), match.index)));
    found.push({ href, text, context });
  }
  return found;
}

/**
 * @param {string} href
 */
function normalizeRel(href) {
  const split = splitUrl(href);
  if (!split || split.external) return '';
  const parts = [];
  for (const part of split.pathname.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') return '';
    parts.push(part);
  }
  return parts.join('/');
}

/**
 * @param {string} url
 */
function splitUrl(url) {
  const value = String(url || '').trim();
  if (!value || value.startsWith('#') || /^(?:[a-z]+:|\/\/)/i.test(value) || value.startsWith('mailto:')) {
    return null;
  }
  const hashAt = value.indexOf('#');
  const hash = hashAt >= 0 ? value.slice(hashAt) : '';
  const before = hashAt >= 0 ? value.slice(0, hashAt) : value;
  const queryAt = before.indexOf('?');
  const pathname = queryAt >= 0 ? before.slice(0, queryAt) : before;
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  if (/^(?:[a-z]+:|\/\/)/i.test(decoded)) return null;
  return { pathname: decoded, hash, external: false };
}

/**
 * @param {string} root
 * @param {string} target
 */
function relativePosix(root, target) {
  const rel = path.relative(root, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return '';
  return rel.split(path.sep).join('/');
}

/**
 * @param {string} file
 */
function statOf(file) {
  if (!fs.existsSync(file)) return '';
  const stat = fs.statSync(file);
  if (stat.isDirectory()) return 'dir';
  if (stat.isFile()) return 'file';
  return '';
}

/**
 * @param {string} teachingRel `topic/file.md`
 */
function markdownRoute(teachingRel) {
  const parts = teachingRel.split('/');
  const topic = parts.shift();
  if (!topic || parts.length === 0) return '';
  const last = parts[parts.length - 1].replace(/\.md$/i, '');
  parts[parts.length - 1] = last;
  return `${topic}/read/${parts.join('/')}`;
}

/**
 * @param {string} raw
 * @param {string} fallback
 */
function markdownTitle(raw, fallback) {
  const fm = raw.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (fm) {
    const title = fm[0].match(/^title:\s*['"]?(.+?)['"]?\s*$/m);
    if (title) return title[1].trim();
  }
  const body = raw.replace(/^---[\s\S]*?---\s*/, '');
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return fallback;
}

/**
 * @param {string} raw
 */
function headingTitle(raw) {
  const h1 = stripEmbedded(raw).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) {
    const text = decodeBasic(stripTags(h1[1])).replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  const title = raw.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!title) return '';
  return decodeBasic(stripTags(title[1])).replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} title
 */
function cleanTitle(title) {
  const text = String(title || '').replace(/\s+/g, ' ').trim();
  if (!text || /\.html?$/i.test(text)) return '';
  return text;
}

function lessonTitle(hint, raw) {
  const cleaned = cleanTitle(hint);
  if (cleaned && !/[→>]+\s*$/.test(cleaned) && !/^开始/.test(cleaned)) return cleaned;
  return headingTitle(raw);
}

/**
 * @param {string} html
 */
function stripEmbedded(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
}

/**
 * @param {string} html
 */
function stripTags(html) {
  return html.replace(/<[^>]+>/g, ' ');
}

/**
 * @param {string} value
 */
function decodeBasic(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * @param {string} text
 */
function tokens(text) {
  const value = text.toLowerCase();
  return new Set(value.match(/[\u4e00-\u9fff]{2,}|[a-z][a-z0-9@^+-]{2,}/g) || []);
}

/**
 * @param {string} left
 * @param {string} right
 */
function compareRel(left, right) {
  return left.localeCompare(right, 'en', { numeric: true });
}

/**
 * @param {string} href
 * @param {string} hash
 */
function withHash(href, hash) {
  return hash ? `${href}${hash}` : href;
}

/**
 * @param {ReturnType<typeof buildTeachingCatalog>} catalog
 */
export function teachingStaticFiles(catalog) {
  /** @type {{ rel: string, abs: string }[]} */
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'repos' || entry.name === 'node_modules') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (/\.(?:js|png|jpe?g|gif|webp|svg)$/i.test(entry.name)) {
        const rel = relativePosix(catalog.teachingRoot, abs);
        if (rel) out.push({ rel, abs });
      }
    }
  };
  walk(catalog.teachingRoot);
  return out;
}

/**
 * @param {string} url
 */
