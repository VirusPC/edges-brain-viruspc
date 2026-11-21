import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { listAiNewsFiles } from '../src/lib/ai-news.mjs';
import { remarkConstructionChapters } from '../src/plugins/remark-construction-chapters.mjs';
import { remarkSelectedArticles } from '../src/plugins/remark-selected-articles.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NUMERALS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const PLACEHOLDER = '建设中，敬请期待';

test('every issue ends with the two construction chapters and no invented items', () => {
  const files = listAiNewsFiles(path.join(repoRoot, 'ai-news'));
  assert.ok(files.length >= 13);
  for (const name of files) {
    const body = fs.readFileSync(path.join(repoRoot, 'ai-news', name), 'utf8');
    const chapters = [...body.matchAll(/^## ([〇一二三四五六七八九十]+)、(.+)$/gm)].map((match) => ({
      numeral: match[1],
      name: match[2],
    }));
    const anchor = chapters.find((chapter) => chapter.name === '精选文章')
      ?? chapters.find((chapter) => chapter.name === '国内进展' || chapter.name === '国际进展');
    assert.ok(anchor, `${name} has no 精选文章`);
    const tweet = NUMERALS[NUMERALS.indexOf(anchor.numeral) + 1];
    const podcast = NUMERALS[NUMERALS.indexOf(anchor.numeral) + 2];
    const block = `## ${tweet}、精选推文\n\n${PLACEHOLDER}\n\n## ${podcast}、精选播客\n\n${PLACEHOLDER}\n`;
    assert.ok(body.endsWith(block), `${name} construction block`);
    assert.equal(body.split('精选推文').length, 2, name);
    assert.equal(body.split('精选播客').length, 2, name);
    const added = body.slice(body.lastIndexOf(`## ${tweet}、精选推文`));
    assert.equal((added.match(/https?:\/\//g) || []).length, 0, name);
    assert.doesNotMatch(added, /^#### /m, name);
  }
});

test('the current issue uses 五 and 六, and an international-only issue continues after 五', () => {
  const current = fs.readFileSync(path.join(repoRoot, 'ai-news/2026-11-20-ai-news.md'), 'utf8');
  assert.match(current, /## 五、精选推文\n\n建设中，敬请期待\n\n## 六、精选播客\n\n建设中，敬请期待\n$/);
  for (const name of ['2026-09-18-ai-news.md', '2026-10-09-ai-news.md']) {
    const body = fs.readFileSync(path.join(repoRoot, 'ai-news', name), 'utf8');
    assert.match(body, /## 六、精选推文\n\n建设中，敬请期待\n\n## 七、精选播客\n\n建设中，敬请期待\n$/);
    assert.doesNotMatch(body, /^## 五、精选推文$/m);
  }
});

test('the badge sits in the heading and stays out of the chapter-list text', async () => {
  const processor = await createMarkdownProcessor({
    gfm: true,
    smartypants: false,
    syntaxHighlight: false,
    remarkPlugins: [remarkSelectedArticles, remarkConstructionChapters],
  });
  const source = [
    '## 四、国内进展',
    '',
    '国内一条',
    '',
    '## 五、国际进展',
    '',
    '国际一条',
    '',
    '## 五、精选推文',
    '',
    '建设中，敬请期待',
    '',
    '## 六、精选播客',
    '',
    '建设中，敬请期待',
    '',
  ].join('\n');
  const result = await processor.render(source, {
    fileURL: new URL('file:///tmp/2026-11-20-ai-news.md'),
  });
  const html = result.code;
  assert.match(html, /<h2 id="五精选推文">五、精选推文<span class="tag">建设中<\/span><\/h2>/);
  assert.match(html, /<h2 id="六精选播客">六、精选播客<span class="tag">建设中<\/span><\/h2>/);
  assert.match(html, /<h2 id="四精选文章">四、精选文章<\/h2>/);
  assert.doesNotMatch(html, /<h2[^>]*>四、精选文章<span class="tag">/);
  const texts = result.metadata.headings.map((heading) => heading.text);
  assert.deepEqual(texts.filter((text) => text.includes('精选')), [
    '四、精选文章',
    '五、精选推文',
    '六、精选播客',
  ]);
  assert.equal(texts.some((text) => text.includes('建设中') || text.includes('<span')), false);

  const other = await processor.render('## 五、精选推文\n\n建设中，敬请期待\n', {
    fileURL: new URL('file:///tmp/notes.md'),
  });
  assert.doesNotMatch(other.code, /class="tag"/);
});
