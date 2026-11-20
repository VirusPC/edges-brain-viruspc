import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { wrapArticleCards } from '../src/plugins/rehype-article-cards.mjs';
import { collectChapter } from '../src/lib/ai-news-category-filter.mjs';

function text(value) {
  return { type: 'text', value };
}

function heading(tag, value) {
  return { type: 'element', tagName: tag, properties: {}, children: [text(value)] };
}

test('selected-article items become one card and other chapters stay loose', () => {
  const release = heading('h4', 'GPT-6.2 Astra');
  const domestic = heading('h4', 'LoopForge');
  domestic.properties = { dataCat: '开源', dataTags: '腾讯' };
  const gist = { type: 'element', tagName: 'p', properties: {}, children: [text('一句')] };
  const details = { type: 'raw', value: '<details class="article-more"></details>' };
  const gap = { type: 'raw', value: '<br/>' };
  const tree = {
    type: 'root',
    children: [
      heading('h2', '二、模型进展'),
      heading('h3', '模型发布'),
      release,
      heading('h2', '四、精选文章'),
      heading('h3', '国内'),
      domestic,
      gist,
      details,
      gap,
      heading('h3', '国际'),
      heading('h4', 'Devin'),
      heading('h2', '五、其他'),
    ],
  };
  wrapArticleCards(tree);
  assert.equal(release.tagName, 'h4');
  assert.equal(tree.children[1].tagName, 'h3');
  const card = tree.children[5];
  assert.equal(card.tagName, 'div');
  assert.deepEqual(card.properties.className, ['article-card']);
  assert.deepEqual(card.children, [domestic, gist, details]);
  assert.equal(tree.children[6], gap);
  assert.equal(tree.children[7].tagName, 'h3');
  assert.equal(tree.children[8].properties.className[0], 'article-card');
  assert.equal(tree.children[8].children[0].children[0].value, 'Devin');
  assert.equal(tree.children.at(-1).children[0].value, '五、其他');
});

function element(tag, attrs = {}, children = []) {
  const node = {
    tagName: tag.toUpperCase(),
    textContent: '',
    classList: {
      contains(name) {
        return String(attrs.class || '').split(/\s+/).includes(name);
      },
    },
    getAttribute(name) {
      return attrs[name] ?? null;
    },
    querySelector(selector) {
      if (selector !== 'h4') return null;
      return children.find((child) => child.tagName === 'H4') || null;
    },
    nextElementSibling: null,
  };
  return node;
}

function chain(nodes) {
  for (let index = 0; index < nodes.length; index += 1) {
    nodes[index].nextElementSibling = nodes[index + 1] || null;
  }
  return nodes[0];
}

test('a hidden article card is one node, so the border goes with the item', () => {
  const heading = element('h4', { 'data-cat': '产品', 'data-tags': 'Cognition' });
  heading.textContent = 'Devin';
  const card = element('div', { class: 'article-card' }, [heading]);
  const chapter = element('h2');
  chapter.textContent = '四、精选文章';
  const section = element('h3');
  section.textContent = '国际';
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, 'h2');
      return [chapter];
    },
  };
  chain([chapter, section, card]);
  const collected = collectChapter(root);
  assert.equal(collected.groups.length, 1);
  assert.equal(collected.groups[0].items.length, 1);
  assert.deepEqual(collected.groups[0].items[0].nodes, [card]);
  assert.equal(collected.groups[0].items[0].cat, '产品');
  assert.deepEqual(collected.groups[0].items[0].tags, ['Cognition']);
});

test('the summary arrow stays the warm accent when open and when closed', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  assert.match(css, /\.prose details\.article-more > summary,\s*\.prose details\.article-more\[open\] > summary\s*\{[^}]*color:\s*var\(--summary\)/);
  assert.match(css, /--summary:\s*var\(--note\)/);
  assert.match(css, /\.prose details\.article-more\[open\] > summary::marker/);
  assert.match(css, /summary::-webkit-details-marker/);
  assert.match(css, /font-weight:\s*650/);
  assert.doesNotMatch(
    css.slice(css.indexOf('.prose details.article-more > summary')),
    /article-more > summary[^}]*background\s*:/,
  );
});

test('dark cards use a deep ground and light type, not the light note wash', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const forced = css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf('@media (prefers-color-scheme: dark)'));
  const system = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
  for (const block of [forced, system]) {
    assert.match(block, /--panel:\s*#121110/);
    assert.match(block, /--panel-line:\s*#6f685c/);
    assert.match(block, /--panel-ink:\s*#f6f1e7/);
    assert.match(block, /--panel-muted:\s*#d2c9bb/);
  }
  assert.match(system, /:root:not\(\[data-theme="light"\]\)/);
  assert.match(css, /\.model-board\s*\{[^}]*background:\s*var\(--panel\)/);
  assert.match(css, /\.model-facts\s*\{[^}]*background:\s*var\(--panel\)/);
  assert.match(css, /\.prose \.article-card\s*\{[^}]*background:\s*var\(--panel\)/);
  assert.match(css, /\.model-board select\s*\{[^}]*background:\s*var\(--paper\)/);
  assert.match(css, /\.model-facts-src\s*\{\s*color:\s*var\(--panel-muted\)/);
  assert.match(css, /\.model-facts dd\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.model-facts-row \{ grid-template-columns: 2\.6rem minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.model-facts-src \{ grid-column: 2; white-space: normal/);
  assert.match(forced, /color-mix\(in srgb, var\(--note\) 55%, white\)/);
  assert.doesNotMatch(forced, /\[data-theme="light"\]/);
});
