import assert from 'node:assert/strict';
import test from 'node:test';
import { articlesCoverageNote, withArticlesCoverage } from '../src/lib/summary-issue.mjs';

const chapter = '## 三、项目开源\n\n一段。\n\n## 四、精选文章\n\n### 国内模型厂\n\n#### 一篇\n';

test('the note names raw and selected counts and skips a missing field', () => {
  assert.equal(articlesCoverageNote({ raw: 205, selected: 36 }), '原文 205 篇，精选 36 篇。');
  assert.equal(articlesCoverageNote(undefined), '');
  assert.equal(articlesCoverageNote(null), '');
  assert.equal(articlesCoverageNote({}), '');
  assert.equal(articlesCoverageNote({ raw: 1 }), '');
  assert.equal(articlesCoverageNote({ raw: 205, cleaned: 205 }), '');
  assert.equal(articlesCoverageNote({ raw: '205', selected: 36 }), '');
  assert.equal(articlesCoverageNote({ raw: 1.5, selected: 2 }), '');
  assert.equal(articlesCoverageNote({ raw: -1, selected: 2 }), '');
});

test('the note reuses the remark card under the selected-articles heading', () => {
  const withNote = withArticlesCoverage(chapter, { raw: 205, selected: 36 });
  assert.match(withNote, /## 四、精选文章\n\n<aside class="info-card ai-news-coverage"><p class="info-card-label">[\s\S]*<span>备注<\/span><\/p><p>原文 205 篇，精选 36 篇。<\/p><\/aside>\n\n### 国内模型厂/);
  assert.match(withNote, /class="info-card-icon"/);
  assert.equal(withNote.includes('## 三、项目开源\n\n<aside'), false);
  assert.equal(withArticlesCoverage(chapter, undefined), chapter);
  assert.equal(withArticlesCoverage(withNote, { raw: 1, selected: 1 }), withNote);
  assert.equal(withArticlesCoverage('## 一、本周关键词\n', { raw: 3, selected: 3 }), '## 一、本周关键词\n');
});
