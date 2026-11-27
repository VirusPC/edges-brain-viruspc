import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { parseArticleCard, splitNoteCards } from '../src/lib/note-card-model.mjs';
import { composeIssueMarkdown } from '../src/lib/summary-issue.mjs';
import { rehypeArticleCards } from '../src/plugins/rehype-article-cards.mjs';
import { remarkEntryAnchor } from '../src/plugins/remark-entry-anchor.mjs';

const SECTIONS = {
  解决什么问题: '问题。',
  如何解决: '做法。',
  效果怎样: '结果。',
  洞察与启发: '启发。',
  相关工作: '相关。',
};

function writeIssue() {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ai-news-fields-')), '2026-11-27');
  fs.mkdirSync(path.join(root, 'summary', 'articles'), { recursive: true });
  fs.mkdirSync(path.join(root, 'summary', 'projects'), { recursive: true });
  fs.writeFileSync(path.join(root, 'summary', 'articles', 'post.json'), JSON.stringify({
    id: 'https://example.com/a',
    title: '阿里：对企业级 AI 研发提效的思考与实践',
    link: 'https://example.com/a',
    lede: '一句导语。',
    category: '实践',
    company: '淘宝',
    sections: SECTIONS,
  }));
  fs.writeFileSync(path.join(root, 'summary', 'projects', 'repo.json'), JSON.stringify({
    id: 'https://github.com/a/b',
    title: 'a/b',
    link: 'https://github.com/a/b',
    lede: '项目导语。',
    category: '开源',
    company: '腾讯',
    sections: SECTIONS,
  }));
  fs.writeFileSync(path.join(root, 'summary', 'overview.json'), JSON.stringify({
    skill: { name: 'weekly-ai-blogs-digest', version: '0.0.8' },
    themes: [
      { kind: 'other', text: '一篇说明了变化。', refs: [{ id: 'https://example.com/a', label: '一篇' }] },
      { kind: 'other', text: '项目也在。', refs: [{ id: 'https://github.com/a/b', label: 'a/b' }] },
      { kind: 'other', text: '另一条主线也在。', refs: [{ id: 'https://example.com/a', label: '另一条' }] },
    ],
  }));
  fs.writeFileSync(path.join(root, 'summary', 'index.json'), JSON.stringify({
    chapters: [
      { title: '本周概览' },
      { title: '项目开源', cards: ['https://github.com/a/b'] },
      { title: '精选文章', groups: [{ title: '国内非模型厂', cards: ['https://example.com/a'] }] },
    ],
  }));
  return root;
}

test('card fields become the category and company, with no heading prefix', async () => {
  const markdown = composeIssueMarkdown(writeIssue());
  assert.ok(markdown, '字段齐全的 issue 能 compose');
  assert.match(markdown, /#### \[阿里：对企业级 AI 研发提效的思考与实践\]\(https:\/\/example\.com\/a\)/);
  assert.match(markdown, /#### \[a\/b\]\(https:\/\/github\.com\/a\/b\)/);
  assert.doesNotMatch(markdown, /&lt;|&#x3C;|details class="article-more"/);
  for (const line of markdown.split('\n').filter((item) => item.startsWith('####'))) {
    assert.doesNotMatch(line, /<|>/, `标题行没有 <分类><公司> 前缀：${line}`);
  }

  const processor = await createMarkdownProcessor({
    gfm: true,
    smartypants: false,
    syntaxHighlight: false,
    remarkPlugins: [remarkEntryAnchor],
    rehypePlugins: [rehypeArticleCards],
  });
  const rendered = await processor.render(markdown, {
    fileURL: new URL('file:///tmp/ai-news/2026-11-27-ai-news.md'),
  });
  assert.doesNotMatch(rendered.code, /<h4\b[^>]*\bdata-cat=/, 'data-cat 不再由 remark 插件写到 h4 上');
  const cards = splitNoteCards(rendered.code).filter((block) => block.kind === 'card');
  assert.equal(cards.length, 2);
  const [project, article] = cards.map((block) => block.card);
  assert.equal(article.category, '实践');
  assert.deepEqual(article.sources, ['阿里'], '淘宝在 compose 时归并成阿里');
  assert.equal(article.title, '阿里：对企业级 AI 研发提效的思考与实践');
  assert.equal(article.sections.length, 5);
  assert.equal(project.category, '开源');
  assert.deepEqual(project.sources, ['腾讯']);
  assert.equal(project.sections.length, 5);
});

test('the company alias is canonicalized when the card is composed', () => {
  const markdown = composeIssueMarkdown(writeIssue());
  const payload = markdown.match(/<!--summary-card:([A-Za-z0-9_-]+)-->\n\n#### \[阿里/);
  assert.ok(payload, '文章卡的 payload 注释在标题前');
  const card = JSON.parse(Buffer.from(payload[1], 'base64url').toString('utf8'));
  assert.equal(card.company, '阿里');
  const parsed = parseArticleCard(`${payload[0].split('\n\n####')[0]}\n<h4><a href="https://example.com/a">阿里：对企业级 AI 研发提效的思考与实践</a></h4>`);
  assert.deepEqual(parsed.sources, ['阿里']);
});
