import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve local markdown images (including URL-encoded paths and Obsidian
 * `![[embeds]]`) so the build can find files that sit beside a note.
 * Missing local images become their alt text instead of failing the build.
 *
 * @param {{ repoRoot?: string }} [options]
 */
export function remarkLocalAssets(options = {}) {
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();

  return (tree, file) => {
    const dir = directoryOf(file, repoRoot);
    /** @param {any} node */
    const visit = (node) => {
      if (!node || typeof node !== 'object' || !Array.isArray(node.children)) return;
      for (let index = node.children.length - 1; index >= 0; index -= 1) {
        const child = node.children[index];
        if (child?.type === 'text' && typeof child.value === 'string' && child.value.includes('[[')) {
          const parts = splitWiki(child.value, dir, repoRoot);
          if (parts) {
            node.children.splice(index, 1, ...parts);
            for (const part of parts) {
              if (part.type === 'image') normalizeImage(part, node, node.children.indexOf(part), dir, repoRoot);
            }
            continue;
          }
        }
        if (child?.type === 'image') normalizeImage(child, node, index, dir, repoRoot);
        else if (child?.type === 'link' && typeof child.url === 'string') {
          const next = normalizeLocalUrl(child.url, dir, repoRoot);
          if (next) child.url = next;
        }
        visit(child);
      }
    };
    visit(tree);
  };
}

/**
 * @param {any} file
 * @param {string} repoRoot
 */
function directoryOf(file, repoRoot) {
  const raw = file?.path || file?.history?.[0];
  if (!raw) return repoRoot;
  const asString = String(raw);
  const filePath = asString.startsWith('file:') ? fileURLToPath(asString) : asString;
  return path.dirname(filePath);
}

/**
 * @param {string} value
 * @param {string} dir
 * @param {string} repoRoot
 */
function splitWiki(value, dir, repoRoot) {
  const pattern = /!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  /** @type {any[] | null} */
  let parts = null;
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    parts ??= [];
    if (match.index > last) parts.push({ type: 'text', value: value.slice(last, match.index) });
    const target = match[1].trim();
    const alt = (match[2] || path.basename(target)).trim();
    const resolved = resolveLocal(target, dir, repoRoot);
    if (resolved) parts.push({ type: 'image', url: resolved, alt, title: null });
    else parts.push({ type: 'text', value: match[0] });
    last = match.index + match[0].length;
  }
  if (!parts) return null;
  if (last < value.length) parts.push({ type: 'text', value: value.slice(last) });
  return parts;
}

/**
 * @param {any} node
 * @param {any} parent
 * @param {number} index
 * @param {string} dir
 * @param {string} repoRoot
 */
function normalizeImage(node, parent, index, dir, repoRoot) {
  if (typeof node.url !== 'string') return;
  if (/^(https?:|data:|mailto:|#)/.test(node.url)) return;
  const resolved = resolveLocal(node.url, dir, repoRoot);
  if (resolved) {
    node.url = resolved;
    return;
  }
  const alt = typeof node.alt === 'string' && node.alt.trim() ? `[${node.alt.trim()}]` : '';
  parent.children.splice(index, 1, { type: 'text', value: alt });
}

/**
 * @param {string} url
 * @param {string} dir
 * @param {string} repoRoot
 */
function normalizeLocalUrl(url, dir, repoRoot) {
  if (!url || /^(https?:|mailto:|data:|#)/.test(url)) return null;
  return resolveLocal(url, dir, repoRoot);
}

/**
 * @param {string} target
 * @param {string} dir
 * @param {string} repoRoot
 */
function resolveLocal(target, dir, repoRoot) {
  const decoded = safeDecode(target.split(/\s+"/)[0].replace(/^<|>$/g, ''));
  const candidates = [
    path.resolve(dir, decoded),
    path.resolve(dir, target),
    path.resolve(dir, path.basename(decoded)),
    path.resolve(repoRoot, decoded.replace(/^\/+/, '')),
  ];
  for (const candidate of candidates) {
    if (!isInside(repoRoot, candidate)) continue;
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
    let relative = path.relative(dir, candidate);
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return relative.split(path.sep).join('/');
  }
  return null;
}

/**
 * @param {string} root
 * @param {string} candidate
 */
function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

/** @param {string} value */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
