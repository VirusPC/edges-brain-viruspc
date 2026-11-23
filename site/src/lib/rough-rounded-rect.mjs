/**
 * Rough.js rounded-rect stroke for AI News cards.
 * One seeded path per size. No fill, no second stroke.
 * Card heights depend on the viewport, fonts, filters, details, and the
 * leaderboard, so the path is built for the measured box instead of stretching
 * one fixed SVG.
 */
import rough from 'roughjs/bundled/rough.esm.js';

export const ROUGH_OUTLINE = {
  roughness: 0.7,
  bowing: 0.8,
  strokeWidth: 1.2,
  disableMultiStroke: true,
  preserveVertices: true,
};

/** Keyword clouds keep the previous filter seed. Each other card has its own prime. */
export const ROUGH_SEEDS = {
  note: 11,
  sources: 17,
  board: 23,
  facts: 37,
  release: 41,
  article: 53,
  cloud: 2,
};

const generator = rough.generator();
const cache = new Map();
const CACHE_LIMIT = 240;

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 */
export function roundedRectPath(x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const x2 = x + width;
  const y2 = y + height;
  if (r <= 0) return `M${x} ${y} L${x2} ${y} L${x2} ${y2} L${x} ${y2} Z`;
  return [
    `M${x + r} ${y}`,
    `L${x2 - r} ${y}`,
    `A${r} ${r} 0 0 1 ${x2} ${y + r}`,
    `L${x2} ${y2 - r}`,
    `A${r} ${r} 0 0 1 ${x2 - r} ${y2}`,
    `L${x + r} ${y2}`,
    `A${r} ${r} 0 0 1 ${x} ${y2 - r}`,
    `L${x} ${y + r}`,
    `A${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 * @param {number} seed
 */
export function roughOutlinePath(width, height, radius, seed) {
  const w = Math.round(width);
  const h = Math.round(height);
  const r = Math.round(radius * 10) / 10;
  if (w < 8 || h < 8) return '';
  const key = `${seed}:${w}:${h}:${r}`;
  const hit = cache.get(key);
  if (hit != null) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const inset = ROUGH_OUTLINE.strokeWidth / 2;
  const source = roundedRectPath(
    inset,
    inset,
    Math.max(0, w - ROUGH_OUTLINE.strokeWidth),
    Math.max(0, h - ROUGH_OUTLINE.strokeWidth),
    r,
  );
  const drawable = generator.path(source, { ...ROUGH_OUTLINE, stroke: '#000', seed });
  const set = drawable.sets.find((item) => item.type === 'path');
  const path = set ? generator.opsToPath(set, 2) : '';
  cache.set(key, path);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  return path;
}

/**
 * @param {string} className
 * @param {string} [label]
 */
export function seedForCard(className, label = '') {
  const names = new Set(String(className || '').split(/\s+/).filter(Boolean));
  if (names.has('keyword-cloud')) return ROUGH_SEEDS.cloud;
  if (names.has('model-board')) return ROUGH_SEEDS.board;
  if (names.has('model-facts')) return ROUGH_SEEDS.facts;
  if (names.has('info-card')) {
    if (names.has('ai-news-sources')) return ROUGH_SEEDS.sources;
    return String(label).includes('发布要点') ? ROUGH_SEEDS.release : ROUGH_SEEDS.note;
  }
  if (names.has('article-card') || names.has('note-card')) return ROUGH_SEEDS.article;
  return 0;
}
