import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

/**
 * @param {'light' | 'dark'} theme
 */
function fixtureHtml(theme) {
  const global = readFileSync(path.join(siteRoot, 'src/styles/global.css'), 'utf8');
  const filter = readFileSync(path.join(siteRoot, 'src/styles/ai-news-filter.css'), 'utf8');
  const chips = Array.from({ length: 18 }, (_, index) => (
    `<button type="button" class="ai-news-filter-word" data-label="常驻 Agent ${index}"><span class="ai-news-filter-face">常驻 Agent ${index}</span></button>`
  )).join('');
  const articleRows = ['文章类型', '来源类型', '来源公司'].map((label) => {
    const rowChips = Array.from({ length: 6 }, (_, index) => (
      `<button type="button" class="ai-news-filter-all" data-label="${label} ${index}"><span class="ai-news-filter-face">${label} ${index}</span></button>`
    )).join('');
    return `<div class="ai-news-filter-row"><span class="ai-news-filter-label">${label}</span>${rowChips}</div>`;
  }).join('');
  return `<!doctype html>
<html data-theme="${theme}">
<head>
<meta charset="utf-8">
<style>
${global}
${filter}
</style>
</head>
<body class="is-post has-toc">
<article class="post has-toc">
  <div class="prose">
    <h2>一、本周概览</h2>
    <div style="height: 420px"></div>
    <div class="ai-news-filter ai-news-keyword-bar">
      <div class="ai-news-filter-row">${chips}</div>
    </div>
    <h2>二、模型进展</h2>
    <div style="height: 240px"></div>
    <article class="note-card article-card">
      <h4 class="note-card-title" id="entry-model-demo">模型演示</h4>
      <div style="height: 150px"></div>
    </article>
    <div style="height: 600px"></div>
    <h2>四、精选文章</h2>
    <div class="ai-news-selected">
      <div class="ai-news-filter ai-news-article-bar">
        ${articleRows}
      </div>
      <article class="note-card article-card">
        <h4 class="note-card-title" id="entry-claude-ship">Claude Ship</h4>
        <div style="height: 150px"></div>
      </article>
      <div style="height: 500px"></div>
      <article class="note-card article-card">
        <h4 class="note-card-title" id="entry-conductor-mode">conductor mode</h4>
        <div style="height: 150px"></div>
      </article>
      <div style="height: 1600px"></div>
    </div>
  </div>
</article>
<script>
(async () => {
  const root = document.querySelector('.prose');
  const keyword = document.querySelector('.ai-news-keyword-bar');
  const article = document.querySelector('.ai-news-article-bar');
  const headings = Array.from(document.querySelectorAll('.prose > h2'));
  const modelsHeading = headings.find((node) => node.textContent.indexOf('模型进展') !== -1);
  const articlesHeading = headings.find((node) => node.textContent.indexOf('精选文章') !== -1);
  const keywordH = keyword.offsetHeight;
  const headingH = articlesHeading.offsetHeight;
  const articleH = article.offsetHeight;
  root.style.setProperty('--ai-news-keyword-bar-h', keywordH + 'px');
  root.style.setProperty('--ai-news-heading-top', keywordH + 'px');
  root.style.setProperty('--ai-news-article-top', (keywordH + headingH) + 'px');
  root.style.setProperty('--ai-news-stack-h', (keywordH + headingH + articleH) + 'px');
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const round = (value) => Math.round(value * 100) / 100;
  const rect = (el) => {
    const box = el.getBoundingClientRect();
    return { top: round(box.top), bottom: round(box.bottom) };
  };
  const waitFrames = () => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
  const jump = async (id, headingEl) => {
    location.hash = id;
    await waitFrames();
    const title = document.getElementById(id);
    const card = title.closest('.article-card');
    const titleRect = rect(title);
    return {
      id,
      scrollY: round(window.scrollY),
      innerHeight: window.innerHeight,
      titleTop: titleRect.top,
      titleBottom: titleRect.bottom,
      cardBottom: rect(card).bottom,
      keyword: rect(keyword),
      heading: rect(headingEl),
      articleBar: rect(article),
    };
  };
  const model = await jump('entry-model-demo', modelsHeading);
  const claudeShip = await jump('entry-claude-ship', articlesHeading);
  const conductor = await jump('entry-conductor-mode', articlesHeading);
  const payload = {
    theme: document.documentElement.getAttribute('data-theme') || '',
    innerWidth: window.innerWidth,
    remPx,
    sizes: {
      keywordH,
      headingH,
      articleH,
      articleTop: keywordH + headingH,
      stackH: keywordH + headingH + articleH,
    },
    model,
    claudeShip,
    conductor,
  };
  const out = document.createElement('pre');
  out.id = 'out';
  out.textContent = JSON.stringify(payload);
  document.body.append(out);
})();
</script>
</body>
</html>`;
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

/**
 * @param {string} html
 * @param {number} width
 */
function evaluate(html, width) {
  const bin = chromeBin();
  assert.ok(bin, 'Set CHROME_PATH to a Chrome or Chromium binary');
  return mkdtemp(path.join(tmpdir(), 'entry-scroll-margin-')).then(async (dir) => {
    const htmlPath = path.join(dir, 'fixture.html');
    const userData = path.join(dir, 'profile');
    await writeFile(htmlPath, html);
    const port = 9600 + Math.floor(Math.random() * 300);
    const child = spawn(bin, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userData}`,
      '--remote-allow-origins=*',
      'about:blank',
    ], { stdio: 'ignore' });
    let timer;
    const fail = new Promise((_, reject) => {
      timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('Chrome layout check exceeded 20s'));
      }, 20000);
    });
    try {
      return await Promise.race([fail, readMeasured(child, port, htmlPath, width)]);
    } finally {
      clearTimeout(timer);
      child.kill('SIGKILL');
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @param {number} port
 * @param {string} htmlPath
 * @param {number} width
 */
async function readMeasured(child, port, htmlPath, width) {
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
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 5000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
      else resolve(message.result);
    });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const created = await send('Target.createTarget', { url: 'about:blank' });
  const attached = await send('Target.attachToTarget', { targetId: created.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  }, sessionId);
  await send('Page.navigate', { url: `file://${htmlPath}` }, sessionId);
  const text = await send('Runtime.evaluate', {
    expression: `new Promise((resolve) => {
      const read = () => document.getElementById('out')?.textContent || '';
      if (read()) resolve(read());
      else {
        const started = Date.now();
        const timer = setInterval(() => {
          const value = read();
          if (value || Date.now() - started > 4000) {
            clearInterval(timer);
            resolve(value);
          }
        }, 50);
      }
    })`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  ws.close();
  child.kill('SIGKILL');
  assert.ok(text.result?.value, 'missing measurement output');
  return JSON.parse(text.result.value);
}

/**
 * @param {any} measured
 * @param {string} label
 */
function assertEntryJumps(measured, label) {
  const { sizes, remPx } = measured;
  const slack = 0.35 * remPx;
  assert.ok(sizes.articleH > 0, `${label}: article bar missing`);
  assert.ok(sizes.stackH > sizes.articleTop, `${label}: stack did not include the article bar`);
  for (const key of ['claudeShip', 'conductor']) {
    const jump = measured[key];
    const stackBottom = jump.articleBar.bottom;
    assert.ok(jump.scrollY > 0, `${label}: ${key} did not scroll`);
    assert.ok(Math.abs(stackBottom - sizes.stackH) <= 1, `${label}: ${key} article bar not pinned (${stackBottom} vs ${sizes.stackH})`);
    assert.ok(jump.titleTop >= stackBottom - 1, `${label}: ${key} title under the sticky stack (top ${jump.titleTop}, stack bottom ${stackBottom})`);
    assert.ok(jump.titleTop <= stackBottom + slack + 2, `${label}: ${key} title too far below the stack (top ${jump.titleTop}, expected about ${round(stackBottom + slack)})`);
    assert.ok(jump.titleTop < jump.innerHeight, `${label}: ${key} title out of the viewport`);
    assert.ok(jump.cardBottom > stackBottom + 1, `${label}: ${key} card entirely under the sticky stack`);
  }
  const model = measured.model;
  const headingBottom = model.heading.bottom;
  assert.ok(model.scrollY > 0, `${label}: model entry did not scroll`);
  assert.ok(Math.abs(headingBottom - sizes.articleTop) <= 1, `${label}: model chapter title not pinned below the keyword bar (${headingBottom} vs ${sizes.articleTop})`);
  assert.ok(model.titleTop >= headingBottom - 1, `${label}: model title under keyword bar + chapter title (top ${model.titleTop}, heading bottom ${headingBottom})`);
  assert.ok(model.titleTop <= headingBottom + slack + 2, `${label}: model title pushed down for an article bar that is not pinned there (top ${model.titleTop}, heading bottom ${headingBottom})`);
  assert.ok(model.titleTop < model.innerHeight, `${label}: model title out of the viewport`);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

for (const width of [800, 390]) {
  for (const theme of ['light', 'dark']) {
    test(`overview jumps land below the pinned stack at ${width}px in ${theme}`, async () => {
      const measured = await evaluate(fixtureHtml(theme), width);
      assert.equal(measured.innerWidth, width);
      assert.equal(measured.theme, theme);
      assertEntryJumps(measured, `${width}px ${theme}`);
    });
  }
}
