import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  ROUGH_OUTLINE,
  ROUGH_SEEDS,
  roughOutlinePath,
  seedForCard,
} from '../src/lib/rough-rounded-rect.mjs';

test('plan A uses one seeded stroke and no fill', () => {
  assert.equal(ROUGH_OUTLINE.roughness, 0.7);
  assert.equal(ROUGH_OUTLINE.bowing, 0.8);
  assert.equal(ROUGH_OUTLINE.strokeWidth, 1.2);
  assert.equal(ROUGH_OUTLINE.disableMultiStroke, true);
  assert.deepEqual(ROUGH_SEEDS, {
    note: 11,
    board: 23,
    facts: 37,
    release: 41,
    article: 53,
    cloud: 2,
  });
  assert.equal(seedForCard('info-card', '备注'), 11);
  assert.equal(seedForCard('model-board', ''), 23);
  assert.equal(seedForCard('model-facts', ''), 37);
  assert.equal(seedForCard('info-card', '发布要点'), 41);
  assert.equal(seedForCard('note-card article-card', ''), 53);
  assert.equal(seedForCard('keyword-cloud', ''), 2);
  assert.equal(seedForCard('ai-news-filter', ''), 0);
});

test('the same size and seed redraw the same path inside the box', () => {
  const first = roughOutlinePath(420, 160, 11.2, 11);
  const second = roughOutlinePath(420, 160, 11.2, 11);
  const other = roughOutlinePath(420, 160, 11.2, 53);
  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.equal((first.match(/M/g) || []).length > 0, true);
  assert.doesNotMatch(first, /fill/i);
  const nums = [...first.matchAll(/-?\d+(?:\.\d+)?/g)].map((item) => Number(item[0]));
  for (let index = 0; index < nums.length; index += 2) {
    assert.ok(nums[index] > -4 && nums[index] < 424, `x ${nums[index]}`);
    assert.ok(nums[index + 1] > -4 && nums[index + 1] < 164, `y ${nums[index + 1]}`);
  }
});

test('eighty distinct cards stay cheap to outline', () => {
  const started = performance.now();
  for (let index = 0; index < 80; index += 1) {
    roughOutlinePath(360 + (index % 7) * 24, 72 + index * 9, 11.2, 53);
  }
  const ms = performance.now() - started;
  assert.ok(ms < 250, `80 outlines took ${ms.toFixed(1)}ms`);
});

test('cards keep a plain border fallback and the rough stroke does not take clicks', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.info-card\s*\{[^}]*border:\s*1px solid var\(--panel-line\)/);
  assert.match(css, /\.model-facts-row\s*\{[^}]*border-top:\s*1px solid var\(--facts-line\)/);
  assert.match(css, /\.rough-outline\s*\{[^}]*pointer-events:\s*none/);
  assert.match(css, /has-rough-outline,\s*\n\.model-board\.has-rough-outline[\s\S]{0,220}border-color:\s*transparent/);
  assert.match(css, /\.keyword-cloud-outline rect\s*\{[^}]*rx:\s*var\(--ai-news-radius\)/);
  const plugin = fs.readFileSync(new URL('../src/plugins/rehype-keyword-cloud.mjs', import.meta.url), 'utf8');
  assert.match(plugin, /<rect><\/rect>/);
  assert.doesNotMatch(plugin, /feTurbulence|feDisplacementMap|id="rough"/);
  const wood = fs.readFileSync(new URL('../src/lib/ai-news-category-filter.mjs', import.meta.url), 'utf8');
  assert.match(wood, /id: 'wood-rough'/);
  assert.match(wood, /baseFrequency: '0\.02'/);
});
