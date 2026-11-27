import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { entryAnchor } from '../src/lib/entry-anchor.mjs';
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

test('an issue without body slices is composed from chapters and card fields', () => {
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
    title: '一篇',
    link: article,
    lede: '正文。',
    category: '实践',
    company: '月之暗面',
    sections: {
      解决什么问题: '问题。',
      如何解决: '做法。',
      效果怎样: '结果。',
      洞察与启发: '启发。',
      相关工作: '相关。',
    },
  }));
  fs.writeFileSync(path.join(root, 'summary', 'models', 'boards', 'aa.json'), JSON.stringify({
    id: 'Artificial Analysis',
    caption: '这张榜最前面是新模型。',
    highlights: ['Example'],
    arena_publish_date: null,
  }));
  fs.writeFileSync(path.join(root, 'summary', 'models', 'example.json'), JSON.stringify({
    id: 'Example 1',
    title: 'Example 1 发布',
    link: 'https://example.com/model',
    lede: 'Example 1 这周发布。',
    price: { text: '暂无' },
    speed: { text: '暂无' },
    effect: { text: '暂无' },
    points: [
      { label: '上线', text: '周三上线。' },
      { label: '成绩', text: '数字 <mark class="note-card-hl">62.1</mark>。' },
    ],
  }));
  fs.writeFileSync(path.join(root, 'summary', 'overview.json'), JSON.stringify({
    skill: { name: 'weekly-ai-blogs-digest', version: '0.0.8' },
    themes: [
      { kind: 'model', text: 'Example 写进这一期。', refs: [{ id: 'Example', label: 'Example' }] },
      { kind: 'other', text: '一篇说明了变化。', refs: [{ id: article, label: '一篇' }] },
      { kind: 'other', text: '另一条主线也在。', refs: [{ id: article, label: '另一条' }] },
    ],
  }));
  fs.writeFileSync(path.join(root, 'summary', 'index.json'), JSON.stringify({
    articles_coverage: { raw: 2, selected: 1 },
    window: { issue: '2026-11-13', since: '2026-11-06', until: '2026-11-12' },
    chapters: [
      { title: '本周概览' },
      { title: '模型进展', boards: ['Artificial Analysis'], cards: ['Example 1'] },
      { title: '精选文章', groups: [{ title: '国外模型厂', cards: [article] }] },
      { title: '精选推文', cards: [] },
    ],
  }));
  const markdown = composeIssueMarkdown(root);
  assert.match(markdown, /^覆盖窗口：2026-11-06 00:00:00 至 2026-11-12 23:59:59（UTC；生成日 2026-11-13，不含当天）。/);
  assert.match(markdown, /## 一、本周概览\n\n<div class="weekly-overview">[\s\S]*<article class="weekly-overview-card">[\s\S]*Example<\/a> 写进这一期。[\s\S]*<\/div>\n\n## 二、模型进展\n\n### Artificial Analysis\n\n!\[Artificial Analysis Intelligence Index Top 15，2026-11-13\]\(board-chart:aa:2026-11-13\)/);
  assert.doesNotMatch(markdown, /marked\.png/);
  assert.match(markdown, new RegExp(`<!--entry-anchor:${entryAnchor(article)} entry-id:`));
  fs.writeFileSync(path.join(root, 'summary', 'overview.json'), JSON.stringify({
    skill: { name: 'weekly-ai-blogs-digest', version: '0.0.9' },
    themes: [
      { kind: 'model', text: 'Example 写进这一期。', refs: [{ id: 'Example', label: 'Example' }] },
      { kind: 'other', text: '一篇说明了变化。', refs: [{ id: article, label: '一篇' }] },
      { kind: 'other', tag: '验证评测', text: '另一条主线也在。', refs: [{ id: article, label: '另一条' }] },
    ],
  }));
  assert.throws(() => composeIssueMarkdown(root), /0\.0\.9 主线缺少 tag/);
  fs.writeFileSync(path.join(root, 'summary', 'overview.json'), JSON.stringify({
    skill: { name: 'weekly-ai-blogs-digest', version: '0.0.9' },
    themes: [
      { kind: 'model', tag: '进入工作流', text: 'Example 写进这一期。', refs: [{ id: 'Example', label: 'Example' }] },
      { kind: 'other', tag: '常驻 Agent', text: '一篇说明了变化。', refs: [{ id: article, label: '一篇' }] },
      { kind: 'other', tag: '验证评测', text: '另一条主线也在。', refs: [{ id: article, label: '另一条' }] },
    ],
  }));
  assert.match(composeIssueMarkdown(root), /data-keyword="进入工作流"/);
  fs.writeFileSync(path.join(root, 'summary', 'articles', 'post.json'), JSON.stringify({
    id: article,
    title: '一篇',
    link: article,
    lede: '正文。',
    category: '实践',
    company: '月之暗面',
  }));
  assert.equal(composeIssueMarkdown(root), null, '缺 sections 的卡让 compose 失败');
  fs.writeFileSync(path.join(root, 'summary', 'articles', 'post.json'), JSON.stringify({
    id: article,
    title: '一篇',
    link: article,
    category: '实践',
    company: '月之暗面',
    sections: {
      解决什么问题: '问题。',
      如何解决: '做法。',
      效果怎样: '结果。',
      洞察与启发: '启发。',
      相关工作: '相关。',
    },
  }));
  assert.equal(composeIssueMarkdown(root), null, '缺 lede 的卡让 compose 失败');
  fs.writeFileSync(path.join(root, 'summary', 'articles', 'post.json'), JSON.stringify({
    id: article,
    title: '一篇',
    link: article,
    lede: '正文。',
    category: '实践',
    company: '月之暗面',
    sections: {
      解决什么问题: '问题。',
      如何解决: '做法。',
      效果怎样: '结果。',
      洞察与启发: '启发。',
      相关工作: '相关。',
    },
  }));
  fs.writeFileSync(path.join(root, 'summary', 'models', 'example.json'), JSON.stringify({
    id: 'Example 1',
    title: 'Example 1 发布',
    link: 'https://example.com/model',
    points: [],
  }));
  assert.equal(composeIssueMarkdown(root), null, '缺 lede 的模型卡让 compose 失败');
  fs.writeFileSync(path.join(root, 'summary', 'models', 'example.json'), JSON.stringify({
    id: 'Example 1',
    title: 'Example 1 发布',
    link: 'https://example.com/model',
    lede: 'Example 1 这周发布。',
    price: { text: '暂无' },
    speed: { text: '暂无' },
    effect: { text: '暂无' },
    points: [
      { label: '上线', text: '周三上线。' },
      { label: '成绩', text: '数字 <mark class="note-card-hl">62.1</mark>。' },
    ],
  }));
  fs.rmSync(path.join(root, 'summary', 'overview.json'));
  assert.throws(() => composeIssueMarkdown(root), /缺少 summary\/overview.json/);
  assert.match(markdown, /这张榜最前面是新模型。/);
  assert.match(markdown, /红圈：Example。/);
  assert.match(markdown, /## 四、精选文章\n\n<aside class="info-card ai-news-coverage">[\s\S]*原文 2 篇，精选 1 篇。[\s\S]*### 国外模型厂\n\n<!--entry-anchor:[^>]+-->\n\n<!--summary-card:[A-Za-z0-9_-]+-->\n\n#### \[一篇\]\(https:\/\/example.com\/post\)\n\n正文。\n\n## 五、精选推文/);
  assert.match(markdown, new RegExp(`<!--entry-anchor:${entryAnchor(article)} entry-id:${encodeURIComponent(article)}-->`));
  const payload = markdown.match(/<!--summary-card:([A-Za-z0-9_-]+)-->/);
  assert.ok(payload, '文章卡带 summary-card 注释');
  const card = JSON.parse(Buffer.from(payload[1], 'base64url').toString('utf8'));
  assert.equal(card.category, '实践');
  assert.equal(card.company, 'Kimi');
  assert.equal(card.lede, '正文。');
  assert.deepEqual(Object.keys(card.sections), ['解决什么问题', '如何解决', '效果怎样', '洞察与启发', '相关工作']);
  assert.equal(card.sections.如何解决, '做法。');
  assert.equal(card.points, undefined);
  assert.doesNotMatch(markdown, /&lt;|details class="article-more"/);
  assert.match(markdown, /#### \[Example 1 发布\]\(https:\/\/example.com\/model\)\n\nExample 1 这周发布。\n\n<aside class="info-card">\n<p class="info-card-label"><span>发布要点<\/span><\/p>\n<ul>\n<li><strong>上线<\/strong> 周三上线。<\/li>\n<li><strong>成绩<\/strong> 数字 <mark class="note-card-hl">62\.1<\/mark>。<\/li>\n<\/ul>\n<p class="info-card-note">来源：<a href="https:\/\/example.com\/model">Example 1 发布<\/a><\/p>\n<\/aside>/);
  assert.equal((markdown.match(/<!--summary-card:/g) || []).length, 1, '模型卡不走 summary-card payload');
  assert.match(markdown, /## 五、精选推文\n/);
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
