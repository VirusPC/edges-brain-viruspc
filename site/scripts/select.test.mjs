import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  dateForPost,
  excerpt,
  formatISODate,
  isDatedNoteFolder,
  isIgnoredPost,
  listDatedNoteDirs,
  listPostFiles,
  noteDateFromName,
  stripLeadingDatePrefix,
  stripMatchingFirstHeading,
  titleForNote,
  titleForPost,
} from '../src/lib/select.mjs';

test('dated folders include calendar prefixes and skip other names', () => {
  assert.equal(isDatedNoteFolder('2026-10-29--open-grokbot-全程坑点'), true);
  assert.equal(isDatedNoteFolder('2026-05-01-个人效率'), true);
  assert.equal(formatISODate(noteDateFromName('2026-05-01-个人效率')), '2026-05-01');
  assert.equal(isDatedNoteFolder('1. memory'), false);
  assert.equal(isDatedNoteFolder('.edges'), false);
  assert.equal(isDatedNoteFolder('2026-13-01--nope'), false);
  assert.equal(isDatedNoteFolder('2026-02-31--nope'), false);
});

test('titles prefer headings, then a readable slug', () => {
  assert.equal(titleForNote('# 已经写好的标题\n\n正文', '2026-01-02--slug'), '已经写好的标题');
  assert.equal(titleForNote('【背景】\n没有标题', '2026-09-11--项目memory可见性思考'), '项目memory可见性思考');
  assert.equal(titleForNote('', '2026-05-01-个人效率'), '个人效率');
  assert.equal(titleForPost('正文', 'my-essay.md', 'Front title'), 'Front title');
  assert.equal(titleForPost('# From heading', 'my-essay.md', ''), 'From heading');
  assert.equal(titleForPost('# 2026-10-29--essay\n', '2026-10-29--essay.md', ''), '2026-10-29--essay');
});

test('note titles drop a leading date that the date column already shows', () => {
  assert.equal(
    titleForNote('# 2026-10-29--open-grokbot 全程坑点\n', '2026-10-29--open-grokbot-全程坑点'),
    'open-grokbot 全程坑点',
  );
  assert.equal(titleForNote('# 2026-05-01-个人效率\n', '2026-05-01-个人效率'), '个人效率');
  assert.equal(
    titleForNote('# 2026-10-29 open-grokbot 全程坑点\n', '2026-10-29--open-grokbot-全程坑点'),
    'open-grokbot 全程坑点',
  );
  assert.equal(
    titleForNote('# 2026-03-01--2026-03-01--aiopus\n', '2026-03-01--2026-03-01--aiopus-codexmd'),
    'aiopus',
  );
  assert.equal(
    titleForNote('# 2026-10-29--open-grokbot 全程坑点\n', '2026-10-29--open-grokbot-全程坑点', '已经写好的标题'),
    '已经写好的标题',
  );
  assert.equal(
    titleForNote('# 正文\n', '2026-10-29--slug', '2026-10-29--still dated'),
    'still dated',
  );
  assert.equal(titleForNote('# 复盘 2026-10-29 之后\n', '2026-10-29--slug'), '复盘 2026-10-29 之后');
  assert.equal(titleForNote('# 2026-13-01--not a date\n', '2026-01-02--slug'), '2026-13-01--not a date');
  assert.equal(stripLeadingDatePrefix('2026-10-29'), '2026-10-29');
});

test('first heading that matches the title is removed from the body', () => {
  const body = stripMatchingFirstHeading('# 标题\n\n后文', '标题');
  assert.match(body, /^后文/);
  assert.equal(stripMatchingFirstHeading('## 别的\n\n后文', '标题').includes('## 别的'), true);
  const dated = stripMatchingFirstHeading('# 2026-10-29--open-grokbot 全程坑点\n\n后文', 'open-grokbot 全程坑点');
  assert.match(dated, /^后文/);
  assert.equal(dated.includes('2026-10-29'), false);
});

test('post dates prefer frontmatter, then a filename prefix', () => {
  assert.equal(formatISODate(dateForPost('note.md', '2024-03-08')), '2024-03-08');
  assert.equal(formatISODate(dateForPost('2026-06-16--essay.md', undefined)), '2026-06-16');
  assert.equal(dateForPost('essay.md', undefined), null);
});

test('readme is not a post; dated INDEX.md files are notes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'brain-site-'));
  const posts = path.join(root, 'posts');
  const notes = path.join(root, 'notes');
  fs.mkdirSync(path.join(posts, 'nested'), { recursive: true });
  fs.mkdirSync(path.join(notes, '2026-01-02--kept'), { recursive: true });
  fs.mkdirSync(path.join(notes, '1. memory'), { recursive: true });
  fs.mkdirSync(path.join(notes, '.edges'), { recursive: true });
  fs.writeFileSync(path.join(posts, 'README.md'), '# Posts\n');
  fs.writeFileSync(path.join(posts, 'nested', 'essay.md'), '# Essay\n');
  fs.writeFileSync(path.join(notes, '2026-01-02--kept', 'INDEX.md'), '# Kept\n');
  fs.writeFileSync(path.join(notes, '1. memory', 'INDEX.md'), '# Skip\n');
  fs.writeFileSync(path.join(notes, '2026-01-03--loose.md'), '# Loose file, not a folder\n');

  assert.equal(isIgnoredPost('README.md'), true);
  assert.deepEqual(listPostFiles(posts), ['nested/essay.md']);
  assert.deepEqual(listDatedNoteDirs(notes), ['2026-01-02--kept']);
});

test('excerpt skips the title line and collapses markdown', () => {
  const text = excerpt('# 标题\n\n一段 **说明**，含 [链接](https://example.com) 与 `code`。');
  assert.equal(text.includes('标题'), false);
  assert.match(text, /一段 说明/);
  assert.equal(text.includes('https://'), false);
});
