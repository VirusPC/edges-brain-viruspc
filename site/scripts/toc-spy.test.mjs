import assert from 'node:assert/strict';
import test from 'node:test';
import { currentSectionIndex } from '../src/lib/toc-spy.mjs';

test('the section at the reading line stays current until the next heading arrives', () => {
  const tops = [400, 900, 1400];
  assert.equal(currentSectionIndex(tops, 120), 0);
  assert.equal(currentSectionIndex([80, 900, 1400], 120), 0);
  assert.equal(currentSectionIndex([-200, 40, 900], 120), 1);
  assert.equal(currentSectionIndex([-800, -400, -20], 120), 2);
  assert.equal(currentSectionIndex([], 120), -1);
});
