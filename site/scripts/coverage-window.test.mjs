import assert from 'node:assert/strict';
import test from 'node:test';
import { renderCoverageWindow, shiftCoverageWindows } from '../src/plugins/remark-coverage-window.mjs';

const source = '覆盖窗口：2026-11-13 00:00:00 至 2026-11-19 23:59:59（UTC；生成日 2026-11-20，不含当天）。';
const beijing = '覆盖窗口：2026-11-13 08:00:00 至 2026-11-20 07:59:59（北京时间；生成日 2026-11-20）。';

test('a UTC coverage window renders as Beijing time', () => {
  assert.equal(renderCoverageWindow(source), beijing);
});

test('adding eight hours can cross into the next year', () => {
  assert.equal(
    renderCoverageWindow('覆盖窗口：2026-12-31 20:00:00 至 2027-01-06 23:59:59（UTC；生成日 2027-01-07，不含当天）。'),
    '覆盖窗口：2027-01-01 04:00:00 至 2027-01-07 07:59:59（北京时间；生成日 2027-01-07）。',
  );
});

test('older coverage lines and other UTC sentences stay as written', () => {
  const older = '覆盖窗口：2026-11-06～2026-11-12（生成日 2026-11-13）。';
  const openrouter = '数据取自 OpenRouter，统计窗口 2026-11-13 至 2026-11-19（UTC 完整日）。';
  assert.equal(renderCoverageWindow(older), older);
  assert.equal(renderCoverageWindow(openrouter), openrouter);
});

test('only a matching paragraph in the digest is rewritten', () => {
  const tree = {
    type: 'root',
    children: [
      { type: 'paragraph', children: [{ type: 'text', value: source }] },
      { type: 'paragraph', children: [{ type: 'text', value: '统计窗口 2026-11-13 至 2026-11-19（UTC 完整日）。' }] },
      { type: 'paragraph', children: [{ type: 'text', value: '覆盖窗口：2026-11-06～2026-11-12（生成日 2026-11-13）。' }] },
    ],
  };
  shiftCoverageWindows(tree);
  assert.equal(tree.children[0].children[0].value, beijing);
  assert.equal(tree.children[1].children[0].value, '统计窗口 2026-11-13 至 2026-11-19（UTC 完整日）。');
  assert.equal(tree.children[2].children[0].value, '覆盖窗口：2026-11-06～2026-11-12（生成日 2026-11-13）。');
});
