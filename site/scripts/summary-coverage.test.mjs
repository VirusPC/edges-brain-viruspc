import assert from 'node:assert/strict';
import test from 'node:test';
import { articlesCoverageNote, withArticlesCoverage } from '../src/lib/summary-issue.mjs';

const chapter = '## 三、项目开源\n\n一段。\n\n## 四、精选文章\n\n### 国内模型厂\n\n#### 一篇\n';

test('the note names raw and cleaned counts and skips a missing field', () => {
  assert.equal(articlesCoverageNote({ raw: 204, cleaned: 205 }), '原文 204 篇，清洗后 205 篇。');
  assert.equal(articlesCoverageNote(undefined), '');
  assert.equal(articlesCoverageNote(null), '');
  assert.equal(articlesCoverageNote({}), '');
  assert.equal(articlesCoverageNote({ raw: 1 }), '');
  assert.equal(articlesCoverageNote({ raw: '204', cleaned: 205 }), '');
  assert.equal(articlesCoverageNote({ raw: 1.5, cleaned: 2 }), '');
  assert.equal(articlesCoverageNote({ raw: -1, cleaned: 2 }), '');
});

test('the note sits after the selected-articles heading and nowhere else', () => {
  const withNote = withArticlesCoverage(chapter, { raw: 204, cleaned: 205 });
  assert.match(withNote, /## 四、精选文章\n\n<p class="ai-news-coverage">原文 204 篇，清洗后 205 篇。<\/p>\n\n### 国内模型厂/);
  assert.equal(withNote.includes('## 三、项目开源\n\n<p'), false);
  assert.equal(withArticlesCoverage(chapter, undefined), chapter);
  assert.equal(withArticlesCoverage(withNote, { raw: 1, cleaned: 1 }), withNote);
  assert.equal(withArticlesCoverage('## 一、本周关键词\n', { raw: 3, cleaned: 3 }), '## 一、本周关键词\n');
});
