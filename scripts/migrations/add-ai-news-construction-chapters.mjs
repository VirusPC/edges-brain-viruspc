#!/usr/bin/env node
/**
 * Append the under-construction chapters 「精选推文」 and 「精选播客」
 * to each dated AI 资讯 issue. Idempotent. Does not rewrite other chapters.
 *
 * The displayed 「精选文章」 number is the source heading when the file
 * already uses that name, otherwise the first 「国内进展」 or 「国际进展」
 * (the site folds those into 精选文章 and keeps that number). The two new
 * chapters take the next two numerals, so they do not collide with 精选文章
 * on the rendered page.
 *
 *   node scripts/migrations/add-ai-news-construction-chapters.mjs --dry-run
 *   node scripts/migrations/add-ai-news-construction-chapters.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NUMERALS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const ISSUE_FILE = /^(\d{4}-\d{2}-\d{2})-ai-news\.md$/;
const CHAPTER = /^## ([〇一二三四五六七八九十]+)、(.+?)\s*$/;
const PLACEHOLDER = '建设中，敬请期待';

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) run(process.argv.includes('--dry-run'));

/**
 * @param {boolean} dryRun
 */
function run(dryRun) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const aiNewsRoot = path.join(repoRoot, 'ai-news');
  const files = fs.readdirSync(aiNewsRoot).filter((name) => ISSUE_FILE.test(name)).sort();
  if (files.length === 0) {
    console.error('no ai-news issues');
    process.exit(1);
  }

  let changed = 0;
  for (const name of files) {
    const filePath = path.join(aiNewsRoot, name);
    const body = fs.readFileSync(filePath, 'utf8');
    const next = appendConstructionChapters(body, name);
    if (next === body) {
      console.log(`skip ${name}`);
      continue;
    }
    changed += 1;
    const added = next.slice(body.replace(/\s*$/, '').length).trim();
    console.log(`${dryRun ? 'would write' : 'write'} ${name}\n${added}\n`);
    if (!dryRun) fs.writeFileSync(filePath, next);
  }

  console.log(`${dryRun ? 'would update' : 'updated'} ${changed} of ${files.length}`);
}

/**
 * @param {string} body
 * @param {string} name
 */
export function appendConstructionChapters(body, name) {
  const chapters = chaptersIn(body);
  const tweets = chapters.filter((chapter) => chapter.name === '精选推文');
  const podcasts = chapters.filter((chapter) => chapter.name === '精选播客');
  const anchor = selectedArticleNumeral(chapters, name);
  const tweetNumeral = numeralAfter(anchor, 1, name);
  const podcastNumeral = numeralAfter(anchor, 2, name);
  const block = constructionBlock(tweetNumeral, podcastNumeral);

  if (tweets.length || podcasts.length) {
    if (tweets.length === 1 && podcasts.length === 1 && body.replace(/\s*$/, '').endsWith(block.trimEnd())) {
      return body.endsWith('\n') ? body : `${body}\n`;
    }
    throw new Error(`${name}: 精选推文 / 精选播客 already present in an unexpected shape`);
  }

  for (const numeral of [tweetNumeral, podcastNumeral]) {
    const taken = chapters.find((chapter) => (
      chapter.numeral === numeral && chapter.name !== '国内进展' && chapter.name !== '国际进展'
    ));
    if (taken) throw new Error(`${name}: ${numeral} is already ${taken.name}`);
  }

  return `${body.replace(/\s*$/, '')}\n\n${block}`;
}

/**
 * @param {string} body
 */
function chaptersIn(body) {
  return body.split(/\r?\n/).flatMap((line) => {
    const match = line.match(CHAPTER);
    if (!match) return [];
    return [{ numeral: match[1], name: match[2] }];
  });
}

/**
 * @param {{ numeral: string, name: string }[]} chapters
 * @param {string} name
 */
function selectedArticleNumeral(chapters, name) {
  const selected = chapters.find((chapter) => chapter.name === '精选文章');
  if (selected) return selected.numeral;
  const legacy = chapters.find((chapter) => chapter.name === '国内进展' || chapter.name === '国际进展');
  if (!legacy) throw new Error(`${name}: missing 精选文章`);
  return legacy.numeral;
}

/**
 * @param {string} numeral
 * @param {number} step
 * @param {string} name
 */
function numeralAfter(numeral, step, name) {
  const index = NUMERALS.indexOf(numeral);
  const next = index < 0 ? '' : NUMERALS[index + step];
  if (!next) throw new Error(`${name}: no numeral ${step} after ${numeral}`);
  return next;
}

/**
 * @param {string} tweetNumeral
 * @param {string} podcastNumeral
 */
function constructionBlock(tweetNumeral, podcastNumeral) {
  return [
    `## ${tweetNumeral}、精选推文`,
    '',
    PLACEHOLDER,
    '',
    `## ${podcastNumeral}、精选播客`,
    '',
    PLACEHOLDER,
    '',
  ].join('\n');
}
