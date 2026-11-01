import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURE_ID, listDatedNoteDirs } from '../src/lib/select.mjs';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(siteRoot, '..');
const dist = path.join(siteRoot, 'dist');
const fixtureOn = process.env.SITE_INCLUDE_FIXTURE === '1';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

const files = walk(dist);
const rels = files.map((file) => path.relative(dist, file).split(path.sep).join('/'));

function exists(rel) {
  assert.ok(rels.includes(rel), `missing ${rel}`);
}

exists('index.html');
exists('404.html');
exists('rss.xml');
exists('posts/index.html');
exists('notes/index.html');
exists('archive/index.html');
exists('about/index.html');
exists('favicon.svg');

const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
assert.match(home, /recent-posts/);
assert.match(home, /recent-notes/);
assert.match(home, /class="dash"/);

const notesPage = fs.readFileSync(path.join(dist, 'notes/index.html'), 'utf8');
assert.match(notesPage, /skin-notes/);
assert.match(notesPage, /class="dash"/);

const expectedNotes = listDatedNoteDirs(path.join(repoRoot, 'notes'));
const noteDetails = rels.filter(
  (rel) => rel.startsWith('notes/') && rel.endsWith('/index.html') && rel !== 'notes/index.html',
);
assert.equal(
  noteDetails.length,
  expectedNotes.length,
  `note pages ${noteDetails.length} != dated folders ${expectedNotes.length}`,
);

assert.equal(
  rels.some((rel) => rel === 'posts/README/index.html' || rel === 'posts/readme/index.html'),
  false,
);

const sample = rels.find((rel) => rel.includes(FIXTURE_ID));
if (fixtureOn) {
  assert.ok(sample, 'fixture post was not built');
  const html = fs.readFileSync(path.join(dist, sample), 'utf8');
  assert.match(html, /class="sidenote"/);
  assert.doesNotMatch(html, /data-footnotes|class="footnotes"/);
  assert.match(html, /skin-paper/);
  assert.match(html, /is-post/);
} else {
  assert.equal(sample, undefined);
}

const feed = fs.readFileSync(path.join(dist, 'rss.xml'), 'utf8');
assert.match(feed, /<rss/);
assert.match(feed, /<item>/);
assert.match(feed, /<link>https:\/\/viruspc\.github\.io\/edges-brain-viruspc\/<\/link>/);
assert.match(feed, /edges-brain-viruspc\/notes\//);
assert.doesNotMatch(feed, /\/posts\/README/);

const about = fs.readFileSync(path.join(dist, 'about/index.html'), 'utf8');
assert.match(about, /亲手修订后发表的成稿/);

console.log(
  `site dist ok: ${expectedNotes.length} notes, fixture ${fixtureOn ? 'on' : 'off'}, ${rels.length} files`,
);
