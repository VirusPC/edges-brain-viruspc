import fs from 'node:fs';
import path from 'node:path';
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
 * Rebuild the issue markdown from summary/index.json blocks and card text.
 * The slices were copied from the published issue, so a faithful conversion
 * round-trips the same text the current pages render.
 * @param {string} issueDir
 * @returns {string | null}
 */
export function composeIssueMarkdown(issueDir) {
  const indexPath = path.join(issueDir, 'summary', 'index.json');
  if (!fs.existsSync(indexPath)) return null;
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const markdown = Array.isArray(index.blocks)
    ? composeFromBlocks(issueDir, index.blocks)
    : composeFromChapters(issueDir, index);
  if (markdown == null) return null;
  return withArticlesCoverage(markdown, index.articles_coverage);
}

/**
 * Older issues keep the copied body slices. A rerun that only writes
 * chapters and card files is composed from those.
 * @param {string} issueDir
 * @param {any[]} blocks
 */
function composeFromBlocks(issueDir, blocks) {
  let out = '';
  for (const block of blocks) {
    if (block?.kind === 'raw') {
      out += String(block.text ?? '');
      continue;
    }
    if (block?.kind !== 'card' || !block.id) return null;
    const card = findCard(issueDir, block.id);
    if (!card) return null;
    out += String(card.text ?? '');
  }
  return out;
}

const CHAPTER_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

const BOARD_CHARTS = {
  'Artificial Analysis': {
    heading: 'Artificial Analysis',
    file: 'aa-intelligence-top15',
    alt: 'Artificial Analysis Intelligence Index Top 15',
  },
  'LLM Arena': {
    heading: 'LLM Arena',
    file: 'llm-arena-top15',
    alt: 'LLM Arena Top 15',
  },
  'OpenRouter 本周用量': {
    heading: 'OpenRouter',
    file: 'openrouter-usage-top15',
    alt: 'OpenRouter 本周用量 Top 15',
  },
  'OpenRouter 编程用量': {
    heading: 'OpenRouter',
    file: 'openrouter-programming-top15',
    alt: 'OpenRouter 编程用量 Top 15',
  },
  'OpenRouter 应用用量': {
    heading: 'OpenRouter',
    file: 'openrouter-apps-top15',
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
  const window = windowLine(issueDir, issueDate);
  if (window) parts.push(window);
  for (let indexNumber = 0; indexNumber < index.chapters.length; indexNumber += 1) {
    const chapter = index.chapters[indexNumber];
    const number = CHAPTER_NUMBERS[indexNumber];
    if (!number || !chapter?.title) return null;
    parts.push(`## ${number}、${chapter.title}\n\n`);
    if (chapter.title === '模型进展') {
      const boards = chapterBoards(issueDate, chapter, cards);
      if (boards == null) return null;
      parts.push(boards);
    }
    if (chapter.title === '精选文章') {
      for (const group of chapter.groups || []) {
        if (!group?.title) continue;
        parts.push(`### ${group.title}\n\n`);
        if (!pushCards(parts, cards, group.cards)) return null;
      }
      continue;
    }
    if (!pushCards(parts, cards, chapter.cards)) return null;
  }
  return parts.join('');
}

/**
 * @param {string[]} parts
 * @param {Map<string, any>} cards
 * @param {string[] | undefined} ids
 */
function pushCards(parts, cards, ids) {
  for (const id of ids || []) {
    const card = cards.get(id);
    if (!card || typeof card.text !== 'string') return false;
    parts.push(`${card.text.trimEnd()}\n\n`);
  }
  return true;
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
    parts.push(`![${spec.alt}，${day}](${spec.file}-${day}-marked.png)\n\n`);
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
 * @param {string} issueDir
 * @param {string} issueDate
 */
function windowLine(issueDir, issueDate) {
  const windowPath = path.join(issueDir, 'raw', 'window.json');
  if (!fs.existsSync(windowPath)) return '';
  const window = JSON.parse(fs.readFileSync(windowPath, 'utf8'));
  if (!window?.since || !window?.until) return '';
  const day = window.issue || issueDate;
  return `覆盖窗口：${window.since} 00:00:00 至 ${window.until} 23:59:59（UTC；生成日 ${day}，不含当天）。\n\n`;
}

/**
 * @param {string} issueDir
 */
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

/**
 * @param {string} issueDir
 * @param {string} id
 */
function findCard(issueDir, id) {
  const summary = path.join(issueDir, 'summary');
  for (const lane of ['articles', 'projects', 'models']) {
    const dir = path.join(summary, lane);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json') || name === 'index.json') continue;
      const card = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      if (card?.id === id) return card;
    }
  }
  return null;
}
