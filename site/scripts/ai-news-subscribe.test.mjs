import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import { entryAnchor } from '../src/lib/entry-anchor.mjs';
import {
  aiNewsIssueRecords,
  latestJsonDocument,
  overviewSiteLinks,
  pushSample,
} from '../src/lib/ai-news.mjs';
import {
  SUBSCRIBE_LABELS,
  SUBSCRIBE_PROMPT,
  applySubscribeState,
  copySubscribePrompt,
  mountSubscribeCopy,
} from '../src/lib/subscribe-copy.mjs';

const PROMPT = '请打开这个说明页，按里面的规则建立一条定时任务，查询最新的 AI 资讯：https://viruspc.github.io/edges-brain-viruspc/ai-news/subscribe/';

function issue(id, summary) {
  const [year, month, day] = id.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(Date.UTC(year, month - 1, day - 7));
  const end = new Date(Date.UTC(year, month - 1, day - 1));
  return {
    id,
    title: `${id} AI 资讯`,
    date,
    summary,
    legacy: false,
    coverageStart: start,
    coverageEnd: end,
  };
}

function rowHtml() {
  return `<div class="sub-row" data-subscribe-copy aria-live="polite">
    <button type="button" class="sub-copy">
      <span class="i-copy"></span><span class="i-check"></span><span class="i-alert"></span>
      <span class="sub-label">复制订阅提示词</span>
    </button>
    <a class="sub-help" href="/ai-news/subscribe/">说明</a>
    <div class="sub-fallback"><p class="sub-fallback-label">没能自动复制，请手动复制这段：</p><p class="sub-fallback-text">${PROMPT}</p></div>
  </div>`;
}

test('the copied sentence is the guide-page prompt and nothing else', () => {
  assert.equal(SUBSCRIBE_PROMPT, PROMPT);
  assert.equal(SUBSCRIBE_PROMPT.includes('10:00'), false);
  assert.equal(SUBSCRIBE_PROMPT.includes('21:00'), false);
  assert.deepEqual(SUBSCRIBE_LABELS, {
    default: '复制订阅提示词',
    copied: '已复制',
    failed: '复制失败',
  });
});

test('latest.json and the RSS rows share one newest-first issue list', () => {
  const records = aiNewsIssueRecords(
    [issue('2026-11-13', '上一期'), issue('2026-11-20', '这一期')],
    (id) => `https://viruspc.github.io/edges-brain-viruspc/ai-news/${id}/`,
  );
  assert.deepEqual(records.map((record) => record.id), ['2026-11-20', '2026-11-13']);
  assert.equal(records[0].description, '2026-11-13～11-19 · 这一期');
  assert.equal(records[1].description, '2026-11-06～11-12 · 上一期');
  assert.equal(records[0].link, 'https://viruspc.github.io/edges-brain-viruspc/ai-news/2026-11-20/');

  const overview = {
    themes: [
      {
        text: 'Gemini 4 Neon 放在中间。',
        refs: [{ id: 'Gemini 4 Neon', label: 'Gemini 4 Neon' }],
      },
      { text: '第二段保持原文。', refs: [] },
    ],
  };
  const doc = latestJsonDocument(records, overview, 'https://viruspc.github.io/edges-brain-viruspc/ai-news/rss.xml');
  assert.equal(doc.id, '2026-11-20');
  assert.equal(doc.title, '2026-11-20 AI 资讯');
  assert.equal(doc.url, records[0].link);
  assert.equal(doc.date, '2026-11-20');
  assert.equal(doc.rss, 'https://viruspc.github.io/edges-brain-viruspc/ai-news/rss.xml');
  assert.equal(doc.issues.length, 2);
  assert.equal(doc.issues[0].description, records[0].description);
  assert.equal(doc.overview[0].text, 'Gemini 4 Neon 放在中间。');
  assert.deepEqual(doc.overview[0].links, [{
    label: 'Gemini 4 Neon',
    url: `${records[0].link}#${entryAnchor('Gemini 4 Neon')}`,
  }]);
  assert.equal(doc.overview[1].text, '第二段保持原文。');
  assert.deepEqual(doc.overview[1].links, []);

  const sample = pushSample(overview, { title: doc.title, pageUrl: doc.url });
  assert.equal(sample.text, doc.overview[0].text);
  assert.equal(sample.url, doc.url);
  assert.equal(sample.title, doc.title);

  const empty = latestJsonDocument([], null, null);
  assert.equal(empty.id, null);
  assert.equal(empty.url, null);
  assert.deepEqual(empty.overview, []);
  assert.deepEqual(empty.issues, []);
  assert.equal(pushSample({ themes: [] }, { title: '空', pageUrl: 'https://example.test/ai-news/2026-01-01/' }), null);
});

test('overlapping ref labels keep the longer site link', () => {
  const page = 'https://viruspc.github.io/edges-brain-viruspc/ai-news/2026-11-20/';
  const links = overviewSiteLinks('GPT-6.2 Astra 进入 API。', [
    { id: 'short', label: 'Astra' },
    { id: 'long', label: 'GPT-6.2 Astra' },
  ], page);
  assert.deepEqual(links, [{ label: 'GPT-6.2 Astra', url: `${page}#${entryAnchor('long')}` }]);
});

test('copy button shows copied, then returns, and failure keeps the prompt selected in the box', async () => {
  const { document } = parseHTML(`<body>${rowHtml()}</body>`);
  const row = document.querySelector('.sub-row');
  let written = '';
  let scheduled = null;
  const copied = await copySubscribePrompt(row, {
    writeText: async (text) => { written = text; },
    schedule: (fn, ms) => { scheduled = { fn, ms }; return 1; },
    clear: () => { scheduled = null; },
  });
  assert.equal(copied, 'copied');
  assert.equal(written, PROMPT);
  assert.equal(row.querySelector('.sub-label').textContent, '已复制');
  assert.equal(row.querySelector('.sub-copy').classList.contains('is-copied'), true);
  assert.equal(scheduled.ms, 2000);
  scheduled.fn();
  assert.equal(row.querySelector('.sub-label').textContent, '复制订阅提示词');
  assert.equal(row.classList.contains('is-failed'), false);

  const failed = await copySubscribePrompt(row, { fail: true, schedule: () => 0, clear: () => {} });
  assert.equal(failed, 'failed');
  assert.equal(row.querySelector('.sub-label').textContent, '复制失败');
  assert.equal(row.classList.contains('is-failed'), true);
  assert.equal(row.querySelector('.sub-copy').classList.contains('is-failed'), true);
  assert.equal(row.querySelector('.sub-fallback-text').textContent, PROMPT);
  applySubscribeState(row, 'default');
  assert.equal(row.classList.contains('is-failed'), false);
});

test('a forced failed state and a denied click do not need a real clipboard', async () => {
  const { document } = parseHTML(`<body>${rowHtml()}</body>`);
  const row = document.querySelector('.sub-row');
  mountSubscribeCopy(document, { params: new URLSearchParams('state=failed') });
  assert.equal(row.querySelector('.sub-label').textContent, '复制失败');
  assert.equal(row.classList.contains('is-failed'), true);

  const again = parseHTML(`<body>${rowHtml()}</body>`);
  let writes = 0;
  mountSubscribeCopy(again.document, {
    params: new URLSearchParams('fail=1'),
    writeText: async () => { writes += 1; },
  });
  again.document.querySelector('.sub-copy').click();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(writes, 0);
  assert.equal(again.document.querySelector('.sub-label').textContent, '复制失败');
});

test('status colors stay the two approved pairs in light and dark', () => {
  const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
  const button = fs.readFileSync(new URL('../src/styles/subscribe.css', import.meta.url), 'utf8');
  const component = fs.readFileSync(new URL('../src/components/SubscribeCopy.astro', import.meta.url), 'utf8');
  assert.match(css, /--sub-ok:\s*#3f6b3a;/);
  assert.match(css, /--sub-err:\s*#a3392b;/);
  assert.match(css, /:root\[data-theme="dark"\][\s\S]*--sub-ok:\s*#9cc48d;/);
  assert.match(css, /:root\[data-theme="dark"\][\s\S]*--sub-err:\s*#e58f7f;/);
  assert.match(css, /prefers-color-scheme:\s*dark[\s\S]*--sub-ok:\s*#9cc48d;/);
  assert.match(css, /prefers-color-scheme:\s*dark[\s\S]*--sub-err:\s*#e58f7f;/);
  assert.match(button, /height:\s*2\.25rem;/);
  assert.match(button, /min-width:\s*10\.8em;/);
  assert.match(button, /inset:\s*-4px -2px;/);
  assert.match(button, /\.sub-copy\.is-failed\s*\{[^}]*background:\s*transparent;/);
  assert.match(button, /user-select:\s*all;/);
  assert.match(component, /M20 6 9 17l-5-5/);
  assert.match(component, /m21\.73 18-8-14a2 2 0 0 0-3\.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1\.73-3/);
  assert.match(component, /aria-live="polite"/);
  assert.doesNotMatch(component, /heroicons|fontawesome|phosphor/i);
});
