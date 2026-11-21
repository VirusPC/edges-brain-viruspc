/**
 * Replace a keyword-cloud image with an inline SVG.
 * The file stays transparent and unframed. The rect is the no-JS outline.
 * The page replaces it with a Rough.js path.
 * Dark mode recolors `.kw-*` from the page stylesheet.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLOUD_SRC = /keywords-cloud-[^/]+\.(?:png|webp|jpe?g|svg)$/i;

export function rehypeKeywordCloud() {
  return (tree, file) => {
    inlineKeywordClouds(tree, file);
  };
}

/**
 * @param {any} tree
 * @param {{ path?: string, history?: string[] }} [file]
 */
export function inlineKeywordClouds(tree, file) {
  const dir = directoryOf(file);
  walk(tree, dir);
}

/**
 * @param {any} node
 * @param {string} dir
 */
function walk(node, dir) {
  const children = node?.children;
  if (!Array.isArray(children)) return;
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const image = child?.tagName === 'p' ? onlyCloudImage(child) : null;
    if (image) {
      const raw = cloudNode(image, dir);
      if (raw) children[index] = raw;
      continue;
    }
    if (child?.tagName === 'img' && isCloud(child)) {
      const raw = cloudNode(child, dir);
      if (raw) children[index] = raw;
      continue;
    }
    walk(child, dir);
  }
}

/**
 * @param {any} paragraph
 */
function onlyCloudImage(paragraph) {
  const images = [];
  for (const child of paragraph.children || []) {
    if (child?.type === 'text' && !String(child.value || '').trim()) continue;
    if (child?.tagName === 'img') {
      images.push(child);
      continue;
    }
    return null;
  }
  if (images.length !== 1 || !isCloud(images[0])) return null;
  return images[0];
}

/**
 * @param {any} node
 */
function isCloud(node) {
  const src = node?.properties?.src || node?.properties?.url;
  return typeof src === 'string' && CLOUD_SRC.test(src.split('?')[0]);
}

/**
 * @param {any} image
 * @param {string} dir
 */
function cloudNode(image, dir) {
  const src = String(image.properties?.src || image.properties?.url || '');
  const svgFile = resolveSvg(src, dir);
  if (!svgFile) return null;
  let svg = fs.readFileSync(svgFile, 'utf8').replace(/^\uFEFF?<\?xml[^>]*\?>\s*/, '');
  if (!svg.includes('class="keyword-cloud-art"')) {
    svg = svg.replace(/<svg\b/, '<svg class="keyword-cloud-art" focusable="false" aria-hidden="true"');
  }
  const alt = typeof image.properties?.alt === 'string' ? image.properties.alt : '';
  return { type: 'raw', value: cloudHtml(svg, alt) };
}

/**
 * @param {string} svg
 * @param {string} alt
 */
export function cloudHtml(svg, alt) {
  const label = escapeHtml(alt.trim() || '本周关键词');
  return `<div class="keyword-cloud">
<svg class="keyword-cloud-outline" aria-hidden="true" focusable="false">
<rect></rect>
</svg>
<div class="keyword-cloud-art-wrap" role="img" aria-label="${label}">
${svg}
</div>
</div>`;
}

/**
 * @param {string} src
 * @param {string} dir
 */
function resolveSvg(src, dir) {
  const decoded = safeDecode(src.split('?')[0].split(/\s+/)[0]);
  const absolute = path.resolve(dir, decoded);
  const svg = absolute.replace(/\.(png|webp|jpe?g)$/i, '.svg');
  if (svg !== absolute && fs.existsSync(svg) && fs.statSync(svg).isFile()) return svg;
  if (absolute.toLowerCase().endsWith('.svg') && fs.existsSync(absolute)) return absolute;
  return null;
}

/**
 * @param {any} file
 */
function directoryOf(file) {
  const raw = file?.path || file?.history?.[0];
  if (!raw) return process.cwd();
  const asString = String(raw);
  const filePath = asString.startsWith('file:') ? fileURLToPath(asString) : asString;
  return path.dirname(filePath);
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * @param {string} value
 */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
