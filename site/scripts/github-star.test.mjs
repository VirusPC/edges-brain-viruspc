import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const css = fs.readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const layout = fs.readFileSync(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');

test('the star control keeps its link, label, size, and filled star', () => {
  assert.match(layout, /class="github-star"[\s\S]*href="https:\/\/github.com\/VirusPC\/edges-brain-viruspc"/);
  assert.match(layout, /aria-label="在 GitHub 打开个人大脑仓库，由你自己点 Star"/);
  assert.match(layout, /<span>Star<\/span>/);
  const star = layout.slice(layout.indexOf('class="github-star"'), layout.indexOf('class="theme-toggle"'));
  assert.match(star, /fill="currentColor"/);
  assert.doesNotMatch(star, /fill="none"|api\.github\.com\/user\/starred/);
  assert.match(css, /\.github-star\s*\{[^}]*height:\s*2\.25rem/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*\.github-star\s*\{\s*height:\s*2\.75rem/);
  assert.match(css, /\.github-star:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--note\)/);
  assert.match(css, /\.github-star:hover\s*\{[^}]*text-decoration:\s*none/);
});

test('light star colors reuse note wash and note, and dark uses the warm pair', () => {
  assert.match(css, /--star-ink:\s*var\(--note\)/);
  assert.match(css, /--star-bg:\s*var\(--note-wash\)/);
  assert.match(css, /--star-line:\s*#e1baa1/);
  const forced = css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf('@media (prefers-color-scheme: dark)'));
  const system = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'));
  for (const block of [forced, system]) {
    assert.match(block, /--star-ink:\s*#e09a62/);
    assert.match(block, /--star-bg:\s*#40291a/);
    assert.match(block, /--star-line:\s*#5c331c/);
  }
});

test('the theme toggle keeps its outline button', () => {
  assert.match(css, /\.theme-toggle\s*\{[^}]*background:\s*transparent/);
  assert.match(css, /\.theme-toggle\s*\{[^}]*border:\s*1px solid var\(--rule-strong\)/);
  assert.match(css, /\.theme-toggle:hover\s*\{\s*background:\s*var\(--panel\)/);
  assert.doesNotMatch(css, /\.theme-toggle[^{]*\{[^}]*--star-/);
});
