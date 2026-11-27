import fs from 'node:fs';
import path from 'node:path';
import { canonicalCompany } from './ai-news-category-filter.mjs';
import { entryAnchor } from './entry-anchor.mjs';
import { assertOverviewTags, overviewListHtml } from './overview.mjs';
import { selectedArticlesRemarkHtml } from '../plugins/remark-coverage-window.mjs';

/**
 * Issues whose summary/index.json is present. The site renders only these.
 * @param {string | null} dataRoot
 * @returns {string[]}
 */
export function listSummaryIssues(dataRoot) {
  if (!dataRoot) return [];
  const root = path.join(dataRoot, 'issues');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .filter((name) => fs.existsSync(path.join(root, name, 'summary', 'index.json')))
    .sort();
}

/**
 * One sentence for the selected-articles note. Missing or unusable numbers
 * produce no sentence, so the page does not invent a count.
 * @param {{ raw?: unknown, selected?: unknown } | null | undefined} coverage
 * @returns {string}
 */
export function articlesCoverageNote(coverage) {
  const raw = coverage?.raw;
  const selected = coverage?.selected;
  if (!Number.isInteger(raw) || !Number.isInteger(selected)) return '';
  if (raw < 0 || selected < 0) return '';
  return `原文 ${raw} 篇，精选 ${selected} 篇。`;
}

const SELECTED_CHAPTER = /^(##[ \t]*[〇一二三四五六七八九十]+、精选文章[ \t]*)(?:\n+|$)/m;

/**
 * Put the coverage sentence after the selected-articles heading.
 * The note is not part of a card, and a period without the field is unchanged.
 * @param {string} markdown
 * @param {{ raw?: unknown, selected?: unknown } | null | undefined} coverage
 */
export function withArticlesCoverage(markdown, coverage) {
  const sentence = articlesCoverageNote(coverage);
  if (!sentence || typeof markdown !== 'string' || markdown.includes('ai-news-coverage')) {
    return markdown;
  }
  if (!SELECTED_CHAPTER.test(markdown)) return markdown;
  return markdown.replace(SELECTED_CHAPTER, `$1\n\n${selectedArticlesRemarkHtml(sentence)}\n\n`);
}

/**
 * Rebuild the issue markdown from summary chapters, the coverage window, and card fields.
 * @param {string} issueDir
 * @returns {string | null}
 */
export function composeIssueMarkdown(issueDir) {
  const indexPath = path.join(issueDir, 'summary', 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  const overviewPath = path.join(issueDir, 'summary', 'overview.json');
  if (!fs.existsSync(overviewPath)) {
    throw new Error(`缺少 summary/overview.json，站点不能构建 ${path.basename(issueDir)}`);
  }
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const markdown = composeFromChapters(issueDir, index);
  if (markdown == null) return null;
  return withArticlesCoverage(markdown, index.articles_coverage);
}

const CHAPTER_NUMBERS = {
  本周概览: '一',
  模型进展: '二',
  项目开源: '三',
  精选文章: '四',
  精选推文: '五',
  精选播客: '六',
};

const BOARD_CHARTS = {
  'Artificial Analysis': {
    heading: 'Artificial Analysis',
    kind: 'aa',
    alt: 'Artificial Analysis Intelligence Index Top 15',
  },
  'LLM Arena': {
    heading: 'LLM Arena',
    kind: 'llm-arena',
    alt: 'LLM Arena Top 15',
  },
  'OpenRouter 本周用量': {
    heading: 'OpenRouter',
    kind: 'openrouter-usage',
    alt: 'OpenRouter 本周用量 Top 15',
  },
  'OpenRouter 编程用量': {
    heading: 'OpenRouter',
    kind: 'openrouter-programming',
    alt: 'OpenRouter 编程用量 Top 15',
  },
  'OpenRouter 应用用量': {
    heading: 'OpenRouter',
    kind: 'openrouter-apps',
    alt: 'OpenRouter 应用用量 Top 15',
  },
};

/**
 * @param {string} issueDir
 * @param {any} index
 */
function composeFromChapters(issueDir, index) {
  if (!Array.isArray(index?.chapters)) return null;
  const cards = loadSummaryCards(issueDir);
  const issueDate = path.basename(issueDir);
  const parts = [];
  const window = windowLine(index, issueDate);
  if (window) parts.push(window);
  for (const chapter of index.chapters) {
    const number = CHAPTER_NUMBERS[chapter?.title];
    if (!number || !chapter?.title) return null;
    parts.push(`## ${number}、${chapter.title}\n\n`);
    if (chapter.title === '本周概览') parts.push(readOverview(issueDir));
    if (chapter.title === '模型进展') {
      const boards = chapterBoards(issueDate, chapter, cards);
      if (boards == null) return null;
      parts.push(boards);
    }
    if (chapter.title === '精选文章') {
      for (const group of chapter.groups || []) {
        if (!group?.title) continue;
        parts.push(`### ${group.title}\n\n`);
        if (!pushCards(parts, cards, group.cards, 'article')) return null;
      }
      continue;
    }
    const kind = chapter.title === '模型进展' ? 'model' : 'article';
    if (!pushCards(parts, cards, chapter.cards, kind)) return null;
  }
  return parts.join('');
}

/**
 * Cards are structured fields only. Article and project cards carry
 * title/link/lede/category/company plus the five sections; model cards
 * carry title/link/lede and a points list. Anything missing fails the
 * whole compose instead of rendering a partial card.
 * @param {string[]} parts
 * @param {Map<string, any>} cards
 * @param {string[] | undefined} ids
 * @param {'article' | 'model'} kind
 */
function pushCards(parts, cards, ids, kind) {
  for (const id of ids || []) {
    const card = cards.get(id);
    if (!card) return false;
    const anchor = entryAnchor(id);
    const markdown = kind === 'model' ? modelCardMarkdown(card) : articleCardMarkdown(card);
    if (markdown == null) return false;
    parts.push(`<!--entry-anchor:${anchor} entry-id:${encodeURIComponent(id)}-->\n\n${markdown}\n\n`);
  }
  return true;
}

const SECTION_LABELS = ['解决什么问题', '如何解决', '效果怎样', '洞察与启发', '相关工作'];

/**
 * @param {any} card
 */
function articleCardMarkdown(card) {
  const title = plainField(card.title);
  const link = plainField(card.link);
  const category = plainField(card.category);
  const company = plainField(card.company);
  const lede = richField(card.lede);
  if (!title || !link || !lede || !category || !company) return null;
  const sections = card.sections;
  if (!sections || typeof sections !== 'object') return null;
  for (const label of SECTION_LABELS) {
    if (!richField(sections[label])) return null;
  }
  const payload = {
    category,
    company: canonicalCompany(company),
    lede,
    sections: Object.fromEntries(SECTION_LABELS.map((label) => [label, sections[label]])),
  };
  const comment = `<!--summary-card:${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}-->`;
  return `${comment}\n\n#### [${escapeLinkText(title)}](${link})\n\n${lede}`;
}

/**
 * @param {any} card
 */
function modelCardMarkdown(card) {
  const title = plainField(card.title);
  const link = plainField(card.link);
  const lede = richField(card.lede);
  if (!title || !link || !lede) return null;
  const points = card.points ?? [];
  if (!Array.isArray(points)) return null;
  const items = [];
  for (const point of points) {
    const label = plainField(point?.label);
    const text = richField(point?.text);
    if (!label || !text) return null;
    items.push(`<li><strong>${escapeHtml(label)}</strong> ${text}</li>`);
  }
  const aside = [
    '<aside class="info-card">',
    '<p class="info-card-label"><span>发布要点</span></p>',
    `<ul>\n${items.join('\n')}\n</ul>`,
    `<p class="info-card-note">来源：<a href="${escapeHtml(link)}">${escapeHtml(title)}</a></p>`,
    '</aside>',
  ];
  return `#### [${escapeLinkText(title)}](${link})\n\n${lede}\n\n${aside.join('\n')}`;
}

/**
 * @param {unknown} value
 */
function plainField(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Lede, section bodies, and point text keep their inline mark and link
 * markup, so they are written as stored. Only emptiness is checked.
 * @param {unknown} value
 */
function richField(value) {
  return typeof value === 'string' && value.trim() ? value : '';
}

/**
 * @param {string} title
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeLinkText(title) {
  return title.replace(/[[\]]/g, '\\$&');
}

/**
 * @param {string} issueDate
 * @param {any} chapter
 * @param {Map<string, any>} cards
 */
function chapterBoards(issueDate, chapter, cards) {
  const parts = [];
  let openrouter = false;
  for (const id of chapter.boards || []) {
    const board = cards.get(id);
    const spec = BOARD_CHARTS[id];
    if (!board || !spec) return null;
    if (spec.heading === 'OpenRouter') {
      if (!openrouter) {
        parts.push('### OpenRouter\n\n');
        openrouter = true;
      }
    } else {
      parts.push(`### ${spec.heading}\n\n`);
      openrouter = false;
    }
    const day = spec.heading === 'LLM Arena' && board.arena_publish_date
      ? board.arena_publish_date
      : issueDate;
    parts.push(`![${spec.alt}，${day}](board-chart:${spec.kind}:${day})\n\n`);
    if (board.caption) parts.push(`${board.caption.trim()}\n\n`);
    const meta = [];
    if (board.arena_publish_date) meta.push(`榜单发布日 ${board.arena_publish_date}`);
    if (Array.isArray(board.highlights) && board.highlights.length) {
      meta.push(`红圈：${board.highlights.join('、')}。`);
    }
    if (meta.length) parts.push(`<!-- chart-meta\n${meta.join('\n')}\n-->\n\n`);
  }
  return parts.join('');
}

/**
 * @param {any} index
 * @param {string} issueDate
 */
function windowLine(index, issueDate) {
  const window = index?.window;
  if (!window?.since || !window?.until) return '';
  const day = window.issue || issueDate;
  return `覆盖窗口：${window.since} 00:00:00 至 ${window.until} 23:59:59（UTC；生成日 ${day}，不含当天）。\n\n`;
}

/**
 * @param {string} issueDir
 */
function readOverview(issueDir) {
  const file = path.join(issueDir, 'summary', 'overview.json');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`summary/overview.json 无法解析：${path.basename(issueDir)}`);
  }
  if (!Array.isArray(data?.themes) || data.themes.length < 3) {
    throw new Error(`summary/overview.json 没有本周总结：${path.basename(issueDir)}`);
  }
  assertOverviewTags(data, path.basename(issueDir));
  return overviewListHtml(data);
}

function loadSummaryCards(issueDir) {
  const map = new Map();
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!name.endsWith('.json') || name === 'index.json') continue;
      const card = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (card?.id) map.set(card.id, card);
    }
  };
  walk(path.join(issueDir, 'summary'));
  return map;
}
