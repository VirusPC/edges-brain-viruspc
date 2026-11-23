import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { coverageCardHtml, shiftCoverageWindows } from '../src/plugins/remark-coverage-window.mjs';

const source = '覆盖窗口：2026-11-13 00:00:00 至 2026-11-19 23:59:59（UTC；生成日 2026-11-20，不含当天）。';
const older = '覆盖窗口：2026-11-06～2026-11-12（生成日 2026-11-13）。';

test('a UTC coverage window becomes a Beijing remark card', () => {
  const html = coverageCardHtml(source);
  assert.ok(html);
  assert.match(html, /^<aside class="info-card">/);
  assert.match(html, /备注/);
  assert.match(html, /<mark class="note-card-hl">11-13 08:00 → 11-20 07:59<\/mark>/);
  assert.match(html, /class="info-card-note">不含生成当天/);
  assert.match(html, /<dt>时区<\/dt><dd>北京时间<\/dd>/);
  assert.match(html, /<dt>生成日<\/dt><dd>2026-11-20<\/dd>/);
  assert.match(html, /不含生成当天/);
  assert.doesNotMatch(html, /00:00:00|23:59:59|UTC/);
});

test('adding eight hours can cross into the next year', () => {
  const html = coverageCardHtml(
    '覆盖窗口：2026-12-31 10:00:00 至 2026-12-31 20:00:00（UTC；生成日 2027-01-01，不含当天）。',
  );
  assert.match(html, /<mark class="note-card-hl">2026-12-31 18:00 → 2027-01-01 04:00<\/mark>/);
  assert.match(html, /<dt>生成日<\/dt><dd>2027-01-01<\/dd>/);
});

test('a date-only coverage line becomes a remark card without inventing a timezone', () => {
  const html = coverageCardHtml(older);
  assert.match(html, /^<aside class="info-card">/);
  assert.match(html, /<mark class="note-card-hl">11-06 → 11-12<\/mark>/);
  assert.match(html, /<dt>生成日<\/dt><dd>2026-11-13<\/dd>/);
  assert.doesNotMatch(html, /时区|北京时间|不含生成当天/);
});

test('other sentences stay out of the card', () => {
  const openrouter = '数据取自 OpenRouter，统计窗口 2026-11-13 至 2026-11-19（UTC 完整日）。';
  assert.equal(coverageCardHtml(openrouter), null);
  assert.equal(coverageCardHtml('覆盖窗口：还没写完'), null);
});

test('skill version and routine commit are linked, and a short data SHA is not', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const dataCommit = '5e2e06f851fc5317cd3cb845fbec2eb920bbde59';
  const html = coverageCardHtml(source, {
    skill: { name: 'weekly-ai-blogs-digest', version: '0.0.5' },
    routine: {
      repo: 'VirusPC/edges-brain-viruspc',
      commit,
      path: '.edges/routines/weekly-ai-blogs-digest/INDEX.md',
    },
    data: { repo: 'VirusPC/ai-news-data', commit: dataCommit, path: 'issues/2026-11-20' },
  });
  assert.match(html, /tree\/skill\/weekly-ai-blogs-digest@0\.0\.5/);
  assert.match(html, />weekly-ai-blogs-digest@0\.0\.5</);
  assert.match(html, new RegExp(`blob/${commit}/\\.edges/routines/weekly-ai-blogs-digest/INDEX\\.md`));
  assert.match(html, />0123456</);
  assert.match(html, new RegExp(`tree/${dataCommit}/issues/2026-11-20`));
  assert.match(html, />5e2e06f</);
  assert.doesNotMatch(html, /skill 未记录|当前版本|\/tree\/main\/|\/blob\/main\//);
});

test('a missing skill or a short SHA stays unrecorded', () => {
  const html = coverageCardHtml(source, {
    skill: null,
    routine: { repo: 'VirusPC/edges-brain-viruspc', commit: 'main', path: '.edges/routines/weekly-ai-blogs-digest/INDEX.md' },
    data: { repo: 'VirusPC/ai-news-data', commit: '5e2e06f', path: 'issues/2026-11-20' },
  });
  assert.match(html, /生成规则<\/dt><dd class="info-card-wrap">未记录<\/dd>/);
  assert.match(html, /数据版本<\/dt><dd class="info-card-wrap">未记录<\/dd>/);
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(coverageCardHtml(older), /生成规则|数据版本|未记录/);
});

test('a provenance comment is not a source for the card', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'paragraph', children: [{ type: 'text', value: source }] },
      { type: 'html', value: '<!-- provenance {"rules":null} -->' },
      { type: 'paragraph', children: [{ type: 'text', value: older }] },
    ],
  };
  shiftCoverageWindows(tree, null);
  assert.equal(tree.children.length, 3);
  assert.doesNotMatch(tree.children[0].value, /生成规则/);
  assert.match(tree.children[1].value, /provenance/);
});

test('provenance rows can wrap inside the remark card', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.info-card-rows > div\s*\{[^}]*grid-template-columns:\s*4\.8em minmax\(0,\s*1fr\)/);
  assert.match(css, /\.info-card dd\.info-card-wrap\s*\{[^}]*white-space:\s*normal/);
  assert.match(css, /\.info-card a\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.info-card-current\s*\{[^}]*white-space:\s*nowrap/);
});

test('only a matching paragraph in the digest is replaced', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'paragraph', children: [{ type: 'text', value: source }] },
      { type: 'paragraph', children: [{ type: 'text', value: '统计窗口 2026-11-13 至 2026-11-19（UTC 完整日）。' }] },
      { type: 'paragraph', children: [{ type: 'text', value: older }] },
    ],
  };
  shiftCoverageWindows(tree);
  assert.equal(tree.children[0].type, 'html');
  assert.match(tree.children[0].value, /11-13 08:00 → 11-20 07:59/);
  assert.equal(tree.children[1].type, 'paragraph');
  assert.equal(tree.children[1].children[0].value, '统计窗口 2026-11-13 至 2026-11-19（UTC 完整日）。');
  assert.equal(tree.children[2].type, 'html');
  assert.match(tree.children[2].value, /11-06 → 11-12/);
});
