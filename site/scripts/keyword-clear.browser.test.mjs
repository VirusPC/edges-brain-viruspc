import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(siteRoot, 'src');

function chromeBin() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return candidates.find((file) => existsSync(file)) || null;
}

function fixtureHtml() {
  const keywords = JSON.stringify({
    keywords: [
      { name: '常驻 Agent', targets: ['https://claude.com/always'] },
      { name: 'GPT-6.2 Astra', targets: [] },
    ],
  }).replaceAll('<', '\\u003c');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="/styles/global.css">
<link rel="stylesheet" href="/styles/ai-news-filter.css">
<style>
  #cloud { min-height: 280px; }
  #cloud .keyword-cloud-art { position: relative; min-height: 280px; }
  #cloud button[data-keyword] { position: absolute; transform: none; top: 18px; }
  #cloud button[data-keyword="常驻 Agent"] { left: 16px; }
  #cloud button[data-keyword="GPT-6.2 Astra"] { left: 180px; }
</style>
</head>
<body class="is-post has-toc">
<article class="post has-toc">
  <div class="prose">
    <h2>一、本周概览</h2>
    <div id="lead" style="height: 480px"></div>
    <div class="keyword-cloud" id="cloud">
      <div class="keyword-cloud-art-wrap">
        <div class="keyword-cloud-art">
          <button type="button" data-keyword="常驻 Agent" aria-pressed="false">常驻 Agent</button>
          <button type="button" data-keyword="GPT-6.2 Astra" aria-pressed="false">GPT-6.2 Astra</button>
        </div>
      </div>
      <script type="application/json" class="keyword-filter-data">${keywords}</script>
    </div>
    <h2>四、精选文章</h2>
    <h3>国内</h3>
    <article class="article-card" data-entry-id="https://claude.com/always">
      <h4 data-cat="产品" data-tags="DeepSeek">常驻</h4>
    </article>
    <article class="article-card" data-entry-id="https://example.com/other">
      <h4 data-cat="开源" data-tags="阿里">别的</h4>
    </article>
    <div style="height: 2400px"></div>
  </div>
</article>
<textarea id="note"></textarea>
<script type="module">
  import { mountCategoryFilter } from '/lib/ai-news-category-filter.mjs';
  import { mountKeywordFilter } from '/lib/ai-news-keyword-filter.mjs';
  try {
    mountCategoryFilter(document);
    mountKeywordFilter(document);
    document.documentElement.dataset.mounted = '1';
  } catch (error) {
    document.documentElement.dataset.mountError = error && error.stack ? error.stack : String(error);
  }
</script>
</body>
</html>`;
}

const MEASURE = `(() => {
  const root = document.querySelector('.prose');
  const cloud = document.querySelector('#cloud');
  const all = () => document.querySelector('.ai-news-keyword-bar button[data-filter="all"]');
  const word = () => document.querySelector('.ai-news-keyword-bar button[data-keyword="常驻 Agent"]');
  const cloudWord = () => cloud.querySelector('button[data-keyword="常驻 Agent"]');
  const cards = () => [...document.querySelectorAll('.article-card')].map((card) => card.classList.contains('ai-news-filter-hidden'));
  const articleAll = () => document.querySelector('.ai-news-article-bar .ai-news-filter-all').textContent;
  const shot = () => ({
    active: root.dataset.activeKeyword || '',
    allPressed: all().getAttribute('aria-pressed'),
    wordPressed: word().getAttribute('aria-pressed'),
    cloudOn: cloudWord().classList.contains('is-on'),
    filtering: cloud.classList.contains('is-filtering'),
    hidden: cards(),
    articleAll: articleAll(),
    count: document.querySelector('h2.has-keyword-filter .keyword-filter-count')?.textContent || '',
    allText: all().textContent,
    allClass: all().className,
  });
  const blank = () => {
    const rect = cloud.getBoundingClientRect();
    for (let y = rect.bottom - 10; y > rect.top + 8; y -= 14) {
      const x = rect.left + Math.min(24, rect.width / 2);
      const hit = document.elementFromPoint(x, y);
      if (!hit || !cloud.contains(hit)) continue;
      if (hit.closest('button, a, input, textarea, select, label')) continue;
      return { x, y, tag: hit.tagName, cls: String(hit.className || '').slice(0, 80) };
    }
    return null;
  };
  window.scrollTo(0, 0);
  all().click();
  const initial = shot();
  word().click();
  const selected = shot();
  all().click();
  const clearedByAll = shot();
  cloudWord().click();
  const selectedByCloud = shot();
  const blankHit = blank();
  if (blankHit) document.elementFromPoint(blankHit.x, blankHit.y).click();
  const clearedByBlank = shot();
  window.scrollTo(0, 0);
  word().click();
  cloudWord().focus({ preventScroll: true });
  cloudWord().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  const clearedByEscape = shot();
  const focusKept = document.activeElement === cloudWord();
  word().click();
  const field = document.querySelector('#note');
  field.focus({ preventScroll: true });
  field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  const keptInField = shot();
  all().click();
  window.scrollTo(0, 0);
  const button = all();
  const rect = button.getBoundingClientRect();
  const describe = (dy) => {
    const found = document.elementFromPoint(Math.min(rect.left + 12, rect.right - 4), rect.top + dy);
    return {
      ok: Boolean(found && (found === button || button.contains(found))),
      tag: found ? found.tagName : '',
      cls: found ? String(found.className || '').slice(0, 80) : '',
    };
  };
  const above = describe(-8);
  const below = describe(rect.height + 8);
  const center = describe(rect.height / 2);
  const hit = (item) => item.ok;
  const row = button.parentElement;
  const keywordBar = document.querySelector('.ai-news-keyword-bar');
  const heading = [...document.querySelectorAll('.prose > h2')].find((node) => node.textContent.includes('精选文章'));
  const article = document.querySelector('.ai-news-article-bar');
  const top = (el) => Math.round(el.getBoundingClientRect().top * 100) / 100;
  window.scrollTo(0, 0);
  const before = { keyword: top(keywordBar), heading: top(heading), article: top(article), scrollY: window.scrollY };
  const stuckAt = Math.ceil(article.getBoundingClientRect().top + window.scrollY + 80);
  window.scrollTo(0, stuckAt);
  const pinned = { keyword: top(keywordBar), heading: top(heading), article: top(article), scrollY: window.scrollY };
  window.scrollTo(0, stuckAt + 520);
  const later = { keyword: top(keywordBar), heading: top(heading), article: top(article), scrollY: window.scrollY };
  const prose = getComputedStyle(root);
  const chip = getComputedStyle(button);
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    theme: document.documentElement.dataset.theme || '',
    order: [...document.querySelectorAll('.ai-news-keyword-bar button')].map((node) => node.textContent),
    initial,
    selected,
    clearedByAll,
    selectedByCloud,
    blankHit,
    clearedByBlank,
    clearedByEscape,
    focusKept,
    keptInField,
    touch: { above: hit(above), below: hit(below), center: hit(center) },
    touchAt: { above, below, center, top: rect.top, left: rect.left, height: rect.height },
    sizes: {
      row: Math.round(row.getBoundingClientRect().height * 100) / 100,
      button: Math.round(rect.height * 100) / 100,
    },
    stuckClass: keywordBar.className.includes('is-stuck') || article.className.includes('is-stuck'),
    prose: { overflowX: prose.overflowX, overflowY: prose.overflowY },
    color: { bg: chip.backgroundColor, fg: chip.color },
    before,
    pinned,
    later,
    cloudTab: cloudWord().tabIndex,
    allTab: button.tabIndex,
  };
})()`;

function startServer(html) {
  const types = {
    '.css': 'text/css; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
  };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/fixture.html') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
      return;
    }
    const file = path.normalize(path.join(srcRoot, decodeURIComponent(url.pathname)));
    if (!file.startsWith(srcRoot)) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      const body = await readFile(file);
      const type = types[path.extname(file)] || 'application/octet-stream';
      response.writeHead(200, { 'content-type': type });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: typeof address === 'object' && address ? address.port : 0 });
    });
  });
}

async function waitVersion(port) {
  const deadline = Date.now() + 6000;
  let last = 'not started';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return response.json();
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`Chrome debugging port did not open (${last})`);
}

async function openChrome() {
  const bin = chromeBin();
  assert.ok(bin, 'Set CHROME_PATH to a Chrome or Chromium binary');
  const dir = await mkdtemp(path.join(tmpdir(), 'keyword-clear-'));
  const port = 9700 + Math.floor(Math.random() * 400);
  const child = spawn(bin, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(dir, 'profile')}`,
    '--remote-allow-origins=*',
    'about:blank',
  ], { stdio: 'ignore' });
  const version = await waitVersion(port);
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome socket did not open')), 4000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('Chrome socket failed'));
    }, { once: true });
  });
  let seq = 0;
  /** @type {Map<number, (message: any) => void>} */
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 8000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
      else resolve(message.result);
    });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  return {
    async close() {
      ws.close();
      child.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    },
    send,
  };
}

test('全部, cloud blank, and Escape clear the keyword in a real document', async () => {
  const { server, port } = await startServer(fixtureHtml());
  const chrome = await openChrome();
  try {
    const created = await chrome.send('Target.createTarget', { url: 'about:blank' });
    const attached = await chrome.send('Target.attachToTarget', { targetId: created.targetId, flatten: true });
    const sessionId = attached.sessionId;
    await chrome.send('Target.activateTarget', { targetId: created.targetId });
    await chrome.send('Page.enable', {}, sessionId);
    await chrome.send('Runtime.enable', {}, sessionId);

    const passes = [
      { width: 390, theme: 'light', mobile: true },
      { width: 1280, theme: 'light', mobile: false },
      { width: 390, theme: 'dark', mobile: true },
      { width: 1280, theme: 'dark', mobile: false },
    ];
    for (const pass of passes) {
      await chrome.send('Emulation.setDeviceMetricsOverride', {
        width: pass.width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      }, sessionId);
      const token = `${pass.width}-${pass.theme}`;
      await chrome.send('Page.navigate', { url: `http://127.0.0.1:${port}/fixture.html?p=${token}` }, sessionId);
      const deadline = Date.now() + 6000;
      let ready = '';
      while (Date.now() < deadline) {
        try {
          const probe = await chrome.send('Runtime.evaluate', {
            expression: `location.search.includes(${JSON.stringify(token)}) ? (document.documentElement.dataset.mounted || document.documentElement.dataset.mountError || '') : ''`,
            returnByValue: true,
          }, sessionId);
          ready = probe.result?.value || '';
          if (ready) break;
        } catch (error) {
          ready = error instanceof Error ? error.message : String(error);
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      assert.equal(ready, '1', ready || 'page did not mount');
      await chrome.send('Runtime.evaluate', {
        expression: `document.documentElement.dataset.theme = ${JSON.stringify(pass.theme)}; 'ok'`,
        returnByValue: true,
      }, sessionId);
      const measured = await chrome.send('Runtime.evaluate', {
        expression: MEASURE,
        returnByValue: true,
      }, sessionId);
      assert.equal(measured.exceptionDetails, undefined, JSON.stringify(measured.exceptionDetails));
      const page = measured.result?.value;
      assert.ok(page, 'missing measurement');
      assert.equal(page.innerWidth, pass.width, JSON.stringify(page));
      assert.deepEqual(page.order.slice(0, 1), ['全部']);
      assert.equal(page.initial.allPressed, 'true');
      assert.equal(page.initial.active, '');
      assert.equal(page.initial.articleAll, '全部 (2)');
      assert.deepEqual(page.initial.hidden, [false, false]);
      assert.equal(page.selected.active, '常驻 Agent');
      assert.equal(page.selected.allPressed, 'false');
      assert.equal(page.selected.wordPressed, 'true');
      assert.equal(page.selected.cloudOn, true);
      assert.equal(page.selected.filtering, true);
      assert.deepEqual(page.selected.hidden, [false, true]);
      assert.equal(page.selected.articleAll, '全部 (1)');
      assert.equal(page.selected.count, '1/2');
      assert.equal(page.clearedByAll.active, '');
      assert.equal(page.clearedByAll.allPressed, 'true');
      assert.equal(page.clearedByAll.cloudOn, false);
      assert.equal(page.clearedByAll.filtering, false);
      assert.deepEqual(page.clearedByAll.hidden, [false, false]);
      assert.equal(page.clearedByAll.articleAll, '全部 (2)');
      assert.equal(page.clearedByAll.count, '');
      assert.equal(page.selectedByCloud.active, '常驻 Agent');
      assert.equal(page.selectedByCloud.articleAll, '全部 (1)');
      assert.ok(page.blankHit, `no blank point in the cloud (${pass.width} ${pass.theme})`);
      assert.equal(page.clearedByBlank.active, '');
      assert.equal(page.clearedByBlank.allPressed, 'true');
      assert.deepEqual(page.clearedByBlank.hidden, [false, false]);
      assert.equal(page.clearedByBlank.articleAll, '全部 (2)');
      assert.equal(page.clearedByEscape.active, '');
      assert.equal(page.clearedByEscape.allPressed, 'true');
      assert.equal(page.focusKept, true);
      assert.equal(page.keptInField.active, '常驻 Agent');
      assert.equal(page.keptInField.allPressed, 'false');
      assert.deepEqual(page.touch, { above: true, below: true, center: true });
      assert.ok(page.sizes.row >= 44, `row ${page.sizes.row}`);
      assert.ok(page.sizes.button <= 28, `chip grew to ${page.sizes.button}`);
      assert.equal(page.allTab >= 0, true);
      assert.equal(page.cloudTab >= 0, true);
      assert.equal(page.stuckClass, false);
      assert.ok(page.later.scrollY > page.pinned.scrollY);
      for (const key of ['keyword', 'heading', 'article']) {
        assert.ok(Math.abs(page.later[key] - page.pinned[key]) <= 0.5, `${key} moved from ${page.pinned[key]} to ${page.later[key]} at ${pass.width}`);
        assert.ok(page.pinned[key] < 120, `${key} did not pin (${page.pinned[key]}) at ${pass.width}`);
      }
      if (pass.width <= 960) {
        assert.deepEqual(page.prose, { overflowX: 'clip', overflowY: 'clip' });
      }
      if (pass.theme === 'light') {
        assert.equal(page.color.bg, 'rgb(255, 250, 240)');
        assert.equal(page.color.fg, 'rgb(42, 29, 18)');
      } else {
        assert.equal(page.color.bg, 'rgb(83, 64, 47)');
        assert.equal(page.color.fg, 'rgb(255, 248, 241)');
      }
    }
  } finally {
    server.close();
    await chrome.close();
  }
});
