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

test('a current routine link is labeled as current and does not claim the skill was recorded', () => {
  const commit = '12133e826f9adad0d9677487a6c56ce7bcdfee42';
  const html = coverageCardHtml(source, {
    rules: null,
    routineCurrent: {
      repo: 'VirusPC/edges-brain-viruspc',
      commit,
      path: '.edges/routines/weekly-ai-blogs-digest/INDEX.md',
      name: 'weekly-ai-blogs-digest',
    },
    data: {
      repo: 'VirusPC/ai-news-data',
      commit: '5e2e06f851fc5317cd3cb845fbec2eb920bbde59',
      path: 'issues/2026-11-20',
      kind: 'tree',
    },
  });
  assert.match(html, /<dt>生成规则<\/dt><dd class="info-card-wrap">/);
  assert.match(html, new RegExp(`blob/${commit}/\\.edges/routines/weekly-ai-blogs-digest/INDEX\\.md`));
  assert.match(html, />12133e8 weekly-ai-blogs-digest</);
  assert.match(html, /<span class="info-card-current">（当前版本）<\/span> · skill 未记录/);
  assert.doesNotMatch(html, /<dt>生成规则<\/dt><dd class="info-card-wrap">未记录<\/dd>/);
  assert.doesNotMatch(html, /\/blob\/main\/|\/tree\/main\//);
});

test('a recorded execution commit stays unlabeled as current', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const html = coverageCardHtml(source, {
    rules: {
      repo: 'VirusPC/edges-brain-viruspc',
      commit,
      routine: '.edges/routines/weekly-ai-blogs-digest/INDEX.md',
      skill: 'skills/managed/weekly-ai-blogs-digest/SKILL.md',
    },
    routineCurrent: {
      repo: 'VirusPC/edges-brain-viruspc',
      commit: '12133e826f9adad0d9677487a6c56ce7bcdfee42',
      path: '.edges/routines/weekly-ai-blogs-digest/INDEX.md',
      name: 'weekly-ai-blogs-digest',
    },
    data: null,
  });
  assert.match(html, new RegExp(`blob/${commit}/\\.edges/routines/weekly-ai-blogs-digest/INDEX\\.md`));
  assert.doesNotMatch(html, /当前版本|12133e8|skill 未记录/);
});

test('a recorded data snapshot is linked by full SHA, and a missing rules commit stays unrecorded', () => {
  const html = coverageCardHtml(source, {
    rules: null,
    data: {
      repo: 'VirusPC/ai-news-data',
      commit: '5e2e06f851fc5317cd3cb845fbec2eb920bbde59',
      path: 'issues/2026-11-20',
      kind: 'tree',
    },
  });
  assert.match(html, /<dt>生成规则<\/dt><dd class="info-card-wrap">未记录<\/dd>/);
  assert.match(html, /href="https:\/\/github.com\/VirusPC\/ai-news-data\/tree\/5e2e06f851fc5317cd3cb845fbec2eb920bbde59\/issues\/2026-11-20"/);
  assert.match(html, />5e2e06f issues\/2026-11-20</);
  assert.doesNotMatch(html, /\/tree\/main\/|\/blob\/main\/|href="[^"]*HEAD/);
});

test('rules links use the resolved commit for the routine file and the skill file', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567';
  const html = coverageCardHtml(source, {
    rules: {
      repo: 'VirusPC/edges-brain-viruspc',
      commit,
      routine: '.edges/routines/weekly-ai-blogs-digest/INDEX.md',
      skill: 'skills/managed/weekly-ai-blogs-digest/SKILL.md',
    },
    data: null,
  });
  assert.match(html, new RegExp(`blob/${commit}/\\.edges/routines/weekly-ai-blogs-digest/INDEX\\.md`));
  assert.match(html, new RegExp(`blob/${commit}/skills/managed/weekly-ai-blogs-digest/SKILL\\.md`));
  assert.match(html, />0123456 \.edges\/routines\/weekly-ai-blogs-digest\/INDEX.md</);
  assert.match(html, />0123456 skills\/managed\/weekly-ai-blogs-digest\/SKILL.md</);
  assert.match(html, /<dt>数据版本<\/dt><dd class="info-card-wrap">未记录<\/dd>/);
  assert.doesNotMatch(html, /\/tree\/main\/|\/blob\/main\//);
});

test('main, a short SHA, and a missing comment do not become links', () => {
  const html = coverageCardHtml(source, {
    rules: { repo: 'VirusPC/edges-brain-viruspc', commit: 'main', routine: '.edges/routines/weekly-ai-blogs-digest/INDEX.md', skill: 'skills/managed/weekly-ai-blogs-digest/SKILL.md' },
    data: { repo: 'VirusPC/ai-news-data', commit: '5e2e06f', path: 'issues/2026-11-20', kind: 'tree' },
  });
  assert.match(html, /生成规则<\/dt><dd class="info-card-wrap">未记录<\/dd>/);
  assert.match(html, /数据版本<\/dt><dd class="info-card-wrap">未记录<\/dd>/);
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(coverageCardHtml(older), /生成规则|数据版本|未记录/);
});

test('the provenance comment is consumed by the first remark card', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'paragraph', children: [{ type: 'text', value: source }] },
      { type: 'html', value: '<!-- provenance\n{"rules":null,"data":{"repo":"VirusPC/ai-news-data","commit":"5e2e06f851fc5317cd3cb845fbec2eb920bbde59","path":"issues/2026-11-20","kind":"tree"}}\n-->' },
      { type: 'paragraph', children: [{ type: 'text', value: older }] },
    ],
  };
  shiftCoverageWindows(tree);
  assert.equal(tree.children.length, 2);
  assert.match(tree.children[0].value, /5e2e06f851fc5317cd3cb845fbec2eb920bbde59/);
  assert.match(tree.children[0].value, /未记录/);
  assert.doesNotMatch(tree.children[1].value, /生成规则|5e2e06f/);
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
