import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  countArticles,
  coverageWindow,
  formatCoverage,
  isLegacyIssue,
  issueTitle,
  listAiNewsFiles,
  summaryLine,
} from '../src/lib/ai-news.mjs';
import { formatISODate, noteDateFromName } from '../src/lib/select.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const aiNewsRoot = path.join(repoRoot, 'ai-news');

const legacyCounts = {
  '2026-08-14-ai-coding-news.md': 83,
  '2026-08-21-ai-coding-news.md': 93,
  '2026-08-28-ai-coding-news.md': 132,
  '2026-09-04-ai-coding-news.md': 146,
  '2026-09-18-ai-coding-news.md': 56,
  '2026-09-25-ai-coding-news.md': 94,
  '2026-10-02-ai-coding-news.md': 82,
  '2026-10-09-ai-coding-news.md': 70,
  '2026-10-16-ai-coding-news.md': 63,
  '2026-10-23-ai-coding-news.md': 76,
};

test('issue files are the dated digests, not the readme or charts', () => {
  const files = listAiNewsFiles(aiNewsRoot);
  assert.equal(files.length, 12);
  assert.equal(files.includes('README.md'), false);
  assert.equal(files.at(-1), '2026-11-06-ai-coding-news.md');
  assert.equal(files.at(0), '2026-08-14-ai-coding-news.md');
});

test('coverage is the seven days before the publish date', () => {
  const date = noteDateFromName('2026-11-06-ai-coding-news.md');
  const { start, end } = coverageWindow(date);
  assert.equal(formatISODate(start), '2026-10-30');
  assert.equal(formatISODate(end), '2026-11-05');
  assert.equal(formatCoverage(start, end), '2026-10-30～11-05');
  assert.equal(issueTitle(date), '2026-11-06 AI Coding 资讯');

  const september = noteDateFromName('2026-09-04-ai-coding-news.md');
  const window = coverageWindow(september);
  assert.equal(formatCoverage(window.start, window.end), '2026-08-28～09-03');

  const yearTurn = coverageWindow(noteDateFromName('2026-01-02'));
  assert.equal(formatCoverage(yearTurn.start, yearTurn.end), '2025-12-26～2026-01-01');
});

test('keyword line and legacy article counts follow the digest shape', () => {
  const latest = fs.readFileSync(path.join(aiNewsRoot, '2026-11-06-ai-coding-news.md'), 'utf8');
  assert.equal(isLegacyIssue(latest), false);
  assert.equal(summaryLine(latest, false), '交付闭环：OpenAI 收购 Pierre，Amp 接入 GitLab');

  const previous = fs.readFileSync(path.join(aiNewsRoot, '2026-10-30-ai-coding-news.md'), 'utf8');
  assert.equal(summaryLine(previous, false), 'Cursor 扩展供应链后门');

  for (const [name, count] of Object.entries(legacyCounts)) {
    const body = fs.readFileSync(path.join(aiNewsRoot, name), 'utf8');
    assert.equal(isLegacyIssue(body), true, name);
    assert.equal(countArticles(body), count, name);
    assert.equal(summaryLine(body, true), `${count} 篇`, name);
  }
});

test('a missing keyword chapter is legacy even when the date is recent', () => {
  const body = '## 本周风向\n\n## 文章总结列表\n\n### 一条 - 2026-11-01\n';
  assert.equal(isLegacyIssue(body), true);
  assert.equal(summaryLine(body, true), '1 篇');
  assert.equal(summaryLine('没有列表', true), '');
  assert.equal(summaryLine('## 一、本周关键词\n\n<br/>\n', false), '');
});
