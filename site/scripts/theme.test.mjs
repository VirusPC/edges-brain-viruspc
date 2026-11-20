import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { bindThemeToggle, readStoredTheme, resolvedTheme, writeStoredTheme } from '../src/lib/theme.mjs';

function harness({ stored = null, systemDark = false, throwOnWrite = false } = {}) {
  const memory = { theme: stored };
  const storage = {
    getItem(key) {
      return memory[key] ?? null;
    },
    setItem(key, value) {
      if (throwOnWrite) throw new Error('blocked');
      memory[key] = value;
    },
  };
  const attrs = {};
  if (stored) attrs['data-theme'] = stored;
  const root = {
    setAttribute(key, value) { attrs[key] = value; },
    getAttribute(key) { return attrs[key] ?? null; },
    hasAttribute(key) { return Object.prototype.hasOwnProperty.call(attrs, key); },
    removeAttribute(key) { delete attrs[key]; },
  };
  const button = {
    attrs: {},
    listeners: {},
    setAttribute(key, value) { this.attrs[key] = value; },
    getAttribute(key) { return this.attrs[key]; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    removeEventListener() {},
    click() { this.listeners.click(); },
  };
  const media = {
    matches: systemDark,
    listener: null,
    addEventListener(_type, fn) { this.listener = fn; },
    removeEventListener() {},
  };
  const events = [];
  const view = {
    localStorage: storage,
    matchMedia() { return media; },
    dispatchEvent(event) { events.push(event.type); },
  };
  const doc = {
    documentElement: root,
    querySelector() { return button; },
  };
  bindThemeToggle(doc, view, storage);
  return { attrs, button, media, events, storage };
}

test('a stored choice is read, and a bad store is ignored', () => {
  assert.equal(readStoredTheme({ getItem: () => 'dark' }), 'dark');
  assert.equal(readStoredTheme({ getItem: () => 'blue' }), null);
  assert.equal(readStoredTheme({ getItem: () => { throw new Error('no'); } }), null);
  assert.equal(writeStoredTheme({ setItem() { throw new Error('no'); } }, 'dark'), false);
});

test('without a choice the page follows the system, and a choice stays put', () => {
  assert.equal(resolvedTheme(null, true), 'dark');
  assert.equal(resolvedTheme(null, false), 'light');
  assert.equal(resolvedTheme('light', true), 'light');
  assert.equal(resolvedTheme('dark', false), 'dark');
});

test('clicking the button saves the opposite theme and asks charts to repaint', () => {
  const page = harness({ systemDark: true });
  assert.equal(page.button.attrs['aria-label'], '切换为白天模式');
  page.button.click();
  assert.equal(page.attrs['data-theme'], 'light');
  assert.equal(page.storage.getItem('theme'), 'light');
  assert.deepEqual(page.events, ['themechange']);
  assert.equal(page.button.attrs['aria-pressed'], 'true');
  page.media.matches = true;
  page.media.listener();
  assert.deepEqual(page.events, ['themechange']);
});

test('before a choice, a system change still repaints; a blocked store still switches', () => {
  const following = harness({ systemDark: false });
  assert.equal(following.button.attrs['aria-pressed'], 'false');
  following.media.matches = true;
  following.media.listener();
  assert.deepEqual(following.events, ['themechange']);
  assert.equal(following.attrs['data-theme'], undefined);

  const blocked = harness({ systemDark: false, throwOnWrite: true });
  blocked.button.click();
  assert.equal(blocked.attrs['data-theme'], 'dark');
  assert.equal(blocked.storage.getItem('theme'), null);
});

test('the shared header has the toggle and applies a saved choice before paint', () => {
  const layout = fs.readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  assert.match(layout, /data-theme-toggle/);
  assert.match(layout, /切换为黑夜模式/);
  assert.match(layout, /is:inline/);
  assert.match(layout, /localStorage\.getItem\('theme'\)/);
  assert.match(layout, /theme-icon-sun/);
  assert.match(layout, /theme-icon-moon/);
  const head = layout.slice(0, layout.indexOf('<body'));
  assert.ok(head.indexOf('localStorage.getItem') < head.indexOf('rel="stylesheet"') || !head.includes('rel="stylesheet"'));
});
