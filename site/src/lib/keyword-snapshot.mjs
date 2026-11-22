import fs from 'node:fs';
import path from 'node:path';
import { keywordWeight } from '../../../skills/managed/weekly-ai-blogs-digest/scripts/keyword_cloud_style.mjs';

/**
 * Snapshot keywords.json is `{ words: [...] }`. The digest comment is the same
 * array, copied at write time so the page can render before that file is on main.
 * @param {any} data
 */
export function wordsFromDocument(data) {
  const list = Array.isArray(data) ? data : data?.words;
  if (!Array.isArray(list)) return [];
  const words = [];
  for (const item of list) {
    const word = String(item?.word ?? '').trim();
    if (!word) continue;
    words.push({ word, weight: keywordWeight({ ...item, word }) });
  }
  return words;
}

/**
 * @param {string} markdown
 */
export function wordsFromComment(markdown) {
  const section = keywordSection(markdown);
  if (!section) return [];
  const comment = section.match(/<!--\s*keywords-cloud\s*([\s\S]*?)-->/);
  if (!comment) return [];
  try {
    return wordsFromDocument(JSON.parse(comment[1].trim()));
  } catch {
    return [];
  }
}

/**
 * Prefer the snapshot file. The comment is only the copy step 4 wrote from it.
 * @param {string | null} dataRoot
 * @param {string} issueDate
 * @param {string} markdown
 */
export function loadKeywordWords(dataRoot, issueDate, markdown) {
  const file = dataRoot && issueDate
    ? path.join(dataRoot, 'issues', issueDate, 'keywords.json')
    : '';
  if (file && fs.existsSync(file)) {
    try {
      const words = wordsFromDocument(JSON.parse(fs.readFileSync(file, 'utf8')));
      if (words.length) return words;
    } catch {
      // Fall through to the comment copied from the same snapshot.
    }
  }
  return wordsFromComment(markdown);
}

/**
 * @param {{ word: string }[]} words
 */
export function keywordAlt(words) {
  return words.map((word) => word.word).join('、');
}

/**
 * @param {string} markdown
 */
function keywordSection(markdown) {
  const match = /^##[ \t]*一、本周关键词[ \t]*$/m.exec(String(markdown || ''));
  if (!match) return '';
  const rest = markdown.slice(match.index + match[0].length);
  const next = rest.search(/^##[ \t]+\S/m);
  return next === -1 ? rest : rest.slice(0, next);
}
