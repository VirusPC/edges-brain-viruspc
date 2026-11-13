import assert from 'node:assert/strict';
import test from 'node:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { remarkCategoryPills } from '../src/plugins/remark-category-pills.mjs';

const source = [
  '## 四、国内进展',
  '',
  '#### &lt;研发提效&gt;[阿里：对企业级 AI 研发提效的思考与实践](https://example.com/a)',
  '',
  '#### &lt;Data Agent&gt;[高德：从业务问题到可信数据](https://example.com/b)',
  '',
  '#### &lt;开源&gt; MiniMax 没有包进链接',
  '',
  '#### 整体排名',
  '',
  '#### [没有前缀的标题](https://example.com/c)',
  '',
  '#### 见 &lt;开源&gt; 这种不是开头',
  '',
].join('\n');

test('leading heading labels become a data attribute and leave the title text', async () => {
  const processor = await createMarkdownProcessor({
    gfm: true,
    smartypants: false,
    syntaxHighlight: false,
    remarkPlugins: [remarkCategoryPills],
  });
  const result = await processor.render(source, {
    fileURL: new URL('file:///tmp/ai-news/sample.md'),
  });
  const html = result.code;

  assert.match(html, /<h4\b[^>]*\bdata-cat="研发提效"[^>]*>\s*<a href="https:\/\/example.com\/a">阿里：对企业级 AI 研发提效的思考与实践<\/a>\s*<\/h4>/);
  assert.match(html, /<h4\b[^>]*\bdata-cat="Data Agent"[^>]*>\s*<a href="https:\/\/example.com\/b">高德：从业务问题到可信数据<\/a>\s*<\/h4>/);
  assert.match(html, /<h4\b[^>]*\bdata-cat="开源"[^>]*>\s*MiniMax 没有包进链接\s*<\/h4>/);
  assert.match(html, /<h4\b[^>]*>\s*整体排名\s*<\/h4>/);
  assert.match(html, /<h4\b[^>]*>\s*<a href="https:\/\/example.com\/c">没有前缀的标题<\/a>\s*<\/h4>/);
  assert.match(html, /<h4 id="见-开源-这种不是开头">见 (?:&lt;|&#x3C;)开源(?:>|&gt;) 这种不是开头<\/h4>/);
  assert.doesNotMatch(html, /data-cat="整体排名"|data-cat="没有前缀的标题"|data-cat="四、国内进展"|data-cat="开源"[^>]*>见/);

  const labeled = [...html.matchAll(/<h4\b[^>]*\bdata-cat="[^"]+"[^>]*>[\s\S]*?<\/h4>/g)].map((match) => match[0]);
  assert.equal(labeled.length, 3);
  for (const heading of labeled) {
    const visible = heading.replace(/<h4\b[^>]*>/, '').replace(/<\/h4>$/, '');
    assert.doesNotMatch(visible, /&lt;|&#x3C;|data-cat/, heading);
  }

  const texts = result.metadata.headings.map((heading) => heading.text);
  assert.deepEqual(texts, [
    '四、国内进展',
    '阿里：对企业级 AI 研发提效的思考与实践',
    '高德：从业务问题到可信数据',
    'MiniMax 没有包进链接',
    '整体排名',
    '没有前缀的标题',
    '见 <开源> 这种不是开头',
  ]);
  assert.equal(texts.filter((text) => text.startsWith('<')).length, 0);
  assert.equal(texts.includes('研发提效'), false);
  assert.equal(texts.includes('Data Agent'), false);
  assert.equal(texts.includes('开源'), false);
});
