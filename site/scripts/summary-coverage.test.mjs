import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { articlesCoverageNote, composeIssueMarkdown, withArticlesCoverage } from '../src/lib/summary-issue.mjs';

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

test('an issue without body slices is composed from chapters and card text', () => {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ai-news-issue-')), '2026-11-13');
  const article = 'https://example.com/post';
  fs.mkdirSync(path.join(root, 'raw'), { recursive: true });
  fs.mkdirSync(path.join(root, 'summary', 'articles'), { recursive: true });
  fs.mkdirSync(path.join(root, 'summary', 'models', 'boards'), { recursive: true });
  fs.writeFileSync(path.join(root, 'raw', 'window.json'), JSON.stringify({
    issue: '2026-11-13',
    since: '2026-11-06',
    until: '2026-11-12',
  }));
  fs.writeFileSync(path.join(root, 'summary', 'articles', 'post.json'), JSON.stringify({
    id: article,
    text: '#### [一篇](https://example.com/post)\n\n正文。\n',
  }));
  fs.writeFileSync(path.join(root, 'summary', 'models', 'boards', 'aa.json'), JSON.stringify({
    id: 'Artificial Analysis',
    caption: '这张榜最前面是新模型。',
    highlights: ['Example'],
    arena_publish_date: null,
  }));
  fs.writeFileSync(path.join(root, 'summary', 'index.json'), JSON.stringify({
    articles_coverage: { raw: 2, selected: 1 },
    chapters: [
      { title: '本周关键词' },
      { title: '模型进展', boards: ['Artificial Analysis'], cards: [] },
      { title: '精选文章', groups: [{ title: '国外模型厂', cards: [article] }] },
      { title: '精选推文', cards: [] },
    ],
  }));
  const markdown = composeIssueMarkdown(root);
  assert.match(markdown, /^覆盖窗口：2026-11-06 00:00:00 至 2026-11-12 23:59:59（UTC；生成日 2026-11-13，不含当天）。/);
  assert.match(markdown, /## 一、本周关键词\n\n## 二、模型进展\n\n### Artificial Analysis\n\n!\[Artificial Analysis Intelligence Index Top 15，2026-11-13\]\(aa-intelligence-top15-2026-11-13-marked\.png\)/);
  assert.match(markdown, /这张榜最前面是新模型。/);
  assert.match(markdown, /红圈：Example。/);
  assert.match(markdown, /## 三、精选文章\n\n<aside class="info-card ai-news-coverage">[\s\S]*原文 2 篇，精选 1 篇。[\s\S]*### 国外模型厂\n\n#### \[一篇\]\(https:\/\/example.com\/post\)/);
  assert.match(markdown, /## 四、精选推文\n/);
  assert.match(markdown, /<aside class="info-card ai-news-coverage">[\s\S]*原文 2 篇，精选 1 篇。/);
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
