import assert from 'node:assert/strict';
import test from 'node:test';
import { coverageCardHtml, shiftCoverageWindows } from '../src/plugins/remark-coverage-window.mjs';

const source = '覆盖窗口：2026-11-13 00:00:00 至 2026-11-19 23:59:59（UTC；生成日 2026-11-20，不含当天）。';
const older = '覆盖窗口：2026-11-06～2026-11-12（生成日 2026-11-13）。';

test('a UTC coverage window becomes a Beijing remark card', () => {
  const html = coverageCardHtml(source);
  assert.ok(html);
  assert.match(html, /^<aside class="remark-card">/);
  assert.match(html, /备注/);
  assert.match(html, /<mark class="remark-mark">11-13 08:00 → 11-20 07:59<\/mark>/);
  assert.match(html, /<dt>时区<\/dt><dd>北京时间<\/dd>/);
  assert.match(html, /<dt>生成日<\/dt><dd>2026-11-20<\/dd>/);
  assert.match(html, /不含生成当天/);
  assert.doesNotMatch(html, /00:00:00|23:59:59|UTC/);
});

test('adding eight hours can cross into the next year', () => {
  const html = coverageCardHtml(
    '覆盖窗口：2026-12-31 10:00:00 至 2026-12-31 20:00:00（UTC；生成日 2027-01-01，不含当天）。',
  );
  assert.match(html, /<mark class="remark-mark">2026-12-31 18:00 → 2027-01-01 04:00<\/mark>/);
  assert.match(html, /<dt>生成日<\/dt><dd>2027-01-01<\/dd>/);
});

test('a date-only coverage line becomes a remark card without inventing a timezone', () => {
  const html = coverageCardHtml(older);
  assert.match(html, /^<aside class="remark-card">/);
  assert.match(html, /<mark class="remark-mark">11-06 → 11-12<\/mark>/);
  assert.match(html, /<dt>生成日<\/dt><dd>2026-11-13<\/dd>/);
  assert.doesNotMatch(html, /时区|北京时间|不含生成当天/);
});

test('other sentences stay out of the card', () => {
  const openrouter = '数据取自 OpenRouter，统计窗口 2026-11-13 至 2026-11-19（UTC 完整日）。';
  assert.equal(coverageCardHtml(openrouter), null);
  assert.equal(coverageCardHtml('覆盖窗口：还没写完'), null);
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
