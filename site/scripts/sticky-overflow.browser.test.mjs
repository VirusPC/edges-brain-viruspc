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

function fixtureHtml() {
  const global = readFileSync(path.join(siteRoot, 'src/styles/global.css'), 'utf8');
  const filter = readFileSync(path.join(siteRoot, 'src/styles/ai-news-filter.css'), 'utf8');
  const chips = Array.from({ length: 18 }, (_, index) => (
    `<button type="button" class="ai-news-filter-word" data-label="常驻 Agent ${index}"><span class="ai-news-filter-face">常驻 Agent ${index}</span></button>`
  )).join('');
  const articleChips = Array.from({ length: 14 }, (_, index) => (
    `<button type="button" class="ai-news-filter-all" data-label="来源 ${index}"><span class="ai-news-filter-face">来源 ${index}</span></button>`
  )).join('');
  const wide = '宽'.repeat(80);
  return `<!doctype html>
<html>
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
    <h2>四、精选文章</h2>
    <div class="ai-news-selected">
      <div class="ai-news-filter ai-news-article-bar">
        <div class="ai-news-filter-row">${articleChips}</div>
      </div>
      <div class="table-wrap">
        <table><tr><td style="white-space: nowrap">${wide}</td></tr></table>
      </div>
      <div style="height: 1600px"></div>
    </div>
  </div>
</article>
<script>
  const root = document.querySelector('.prose');
  const keyword = document.querySelector('.ai-news-keyword-bar');
  const article = document.querySelector('.ai-news-article-bar');
  const heading = [...document.querySelectorAll('.prose > h2')].find((node) => node.textContent.includes('精选文章'));
  const wrap = document.querySelector('.table-wrap');
  const row = keyword.querySelector('.ai-news-filter-row');
  const articleRow = article.querySelector('.ai-news-filter-row');
  const chip = keyword.querySelector('button');
  const articleChip = article.querySelector('button');
  root.style.setProperty('--ai-news-keyword-bar-h', keyword.offsetHeight + 'px');
  root.style.setProperty('--ai-news-heading-top', keyword.offsetHeight + 'px');
  root.style.setProperty('--ai-news-article-top', (keyword.offsetHeight + heading.offsetHeight) + 'px');
  const proseStyle = getComputedStyle(root);
  const rowStyle = getComputedStyle(row);
  const ancestors = [];
  let node = root;
  while (node) {
    const style = getComputedStyle(node);
    ancestors.push({
      tag: node.tagName,
      cls: String(node.className || '').slice(0, 60),
      overflowX: style.overflowX,
      overflowY: style.overflowY,
    });
    node = node.parentElement;
  }
  const box = (el) => Math.round(el.getBoundingClientRect().top * 100) / 100;
  const hit = (button, dy) => {
    const rect = button.getBoundingClientRect();
    const found = document.elementFromPoint(Math.min(rect.left + 12, rect.right - 4), rect.top + dy);
    return Boolean(found && (found === button || button.contains(found)));
  };
  const ends = (button) => {
    const height = button.getBoundingClientRect().height;
    return {
      above: hit(button, -8),
      below: hit(button, height + 8),
      center: hit(button, height / 2),
    };
  };
  const before = { keyword: box(keyword), heading: box(heading), article: box(article), scrollY: window.scrollY };
  window.scrollTo(0, 700);
  const pinned = { keyword: box(keyword), heading: box(heading), article: box(article), scrollY: window.scrollY };
  window.scrollTo(0, 980);
  const later = { keyword: box(keyword), heading: box(heading), article: box(article), scrollY: window.scrollY };
  const touch = { keyword: ends(chip), article: ends(articleChip) };
  const sizes = {
    keywordRow: Math.round(row.getBoundingClientRect().height * 100) / 100,
    keywordButton: Math.round(chip.getBoundingClientRect().height * 100) / 100,
    articleRow: Math.round(articleRow.getBoundingClientRect().height * 100) / 100,
    articleButton: Math.round(articleChip.getBoundingClientRect().height * 100) / 100,
  };
  wrap.scrollLeft = 80;
  row.scrollLeft = 48;
  articleRow.scrollLeft = 36;
  const payload = {
    innerWidth: window.innerWidth,
    match960: matchMedia('(max-width: 960px)').matches,
    match560: matchMedia('(max-width: 560px)').matches,
    prose: { overflowX: proseStyle.overflowX, overflowY: proseStyle.overflowY },
    row: { overflowX: rowStyle.overflowX, overflowY: rowStyle.overflowY },
    sizes,
    keywordScrollLeft: row.scrollLeft,
    articleScrollLeft: articleRow.scrollLeft,
    ancestors,
    before,
    pinned,
    later,
    table: {
      clientWidth: wrap.clientWidth,
      scrollWidth: wrap.scrollWidth,
      scrollLeft: wrap.scrollLeft,
    },
    keywordRowScrolls: row.scrollWidth > row.clientWidth + 1,
    touch,
  };
  const out = document.createElement('pre');
  out.id = 'out';
  out.textContent = JSON.stringify(payload);
  document.body.append(out);
</script>
</body>
</html>`;
}

/**
 * @param {string} html
 * @param {number} width
 */
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

function evaluate(html, width) {
  const bin = chromeBin();
  assert.ok(bin, 'Set CHROME_PATH to a Chrome or Chromium binary');
  return mkdtemp(path.join(tmpdir(), 'sticky-overflow-')).then(async (dir) => {
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

test('at 800px the weekly prose clips both axes and the plaques stay pinned', async () => {
  const measured = await evaluate(fixtureHtml(), 800);
  assert.equal(measured.innerWidth, 800);
  assert.equal(measured.match960, true);
  assert.equal(measured.match560, false);
  assert.deepEqual(measured.prose, { overflowX: 'clip', overflowY: 'clip' });
  assert.equal(measured.ancestors[0].overflowX, 'clip');
  assert.equal(measured.ancestors[0].overflowY, 'clip');
  for (const ancestor of measured.ancestors.slice(1)) {
    assert.equal(ancestor.overflowX, 'visible', ancestor.cls || ancestor.tag);
    assert.equal(ancestor.overflowY, 'visible', ancestor.cls || ancestor.tag);
  }
  assert.ok(measured.pinned.scrollY > measured.before.scrollY);
  assert.ok(measured.later.scrollY > measured.pinned.scrollY);
  for (const key of ['keyword', 'heading', 'article']) {
    assert.ok(Math.abs(measured.later[key] - measured.pinned[key]) <= 0.5, `${key} moved from ${measured.pinned[key]} to ${measured.later[key]}`);
    assert.ok(measured.pinned[key] < 120, `${key} did not pin (${measured.pinned[key]})`);
  }
  assert.ok(measured.table.scrollWidth > measured.table.clientWidth + 20);
  assert.ok(measured.table.scrollLeft >= 40, `table scrollLeft stayed ${measured.table.scrollLeft}`);
  assert.equal(measured.keywordRowScrolls, true);
  assert.ok(measured.keywordScrollLeft >= 24, `keyword scrollLeft stayed ${measured.keywordScrollLeft}`);
  assert.equal(measured.row.overflowX, 'auto');
  assert.equal(measured.row.overflowY, 'hidden');
  assert.ok(measured.sizes.keywordRow >= 44, `keyword row ${measured.sizes.keywordRow}`);
  assert.ok(measured.sizes.keywordButton <= 28, `keyword chip grew to ${measured.sizes.keywordButton}`);
  assert.deepEqual(measured.touch.keyword, { above: true, below: true, center: true });
  assert.equal(measured.touch.article.center, true);
});

test('at 390px a scrolling article row keeps a 44px hit target and still scrolls', async () => {
  const measured = await evaluate(fixtureHtml(), 390);
  assert.equal(measured.innerWidth, 390);
  assert.equal(measured.match560, true);
  assert.deepEqual(measured.prose, { overflowX: 'clip', overflowY: 'clip' });
  assert.ok(measured.later.scrollY > measured.pinned.scrollY);
  for (const key of ['keyword', 'heading', 'article']) {
    assert.ok(Math.abs(measured.later[key] - measured.pinned[key]) <= 0.5, `${key} moved from ${measured.pinned[key]} to ${measured.later[key]}`);
  }
  assert.ok(measured.sizes.keywordRow >= 44);
  assert.ok(measured.sizes.articleRow >= 44, `article row ${measured.sizes.articleRow}`);
  assert.ok(measured.sizes.keywordButton <= 28);
  assert.ok(measured.sizes.articleButton <= 28, `article chip grew to ${measured.sizes.articleButton}`);
  assert.deepEqual(measured.touch.keyword, { above: true, below: true, center: true });
  assert.deepEqual(measured.touch.article, { above: true, below: true, center: true });
  assert.ok(measured.keywordScrollLeft >= 24);
  assert.ok(measured.articleScrollLeft >= 16, `article scrollLeft stayed ${measured.articleScrollLeft}`);
  assert.ok(measured.table.scrollLeft >= 40);
});
