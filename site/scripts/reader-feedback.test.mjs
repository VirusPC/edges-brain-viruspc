import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  GISCUS,
  GISCUS_ORIGIN,
  discussionPath,
  feedbackIssueUrl,
  giscusReady,
  giscusTheme,
  pageUrlForFeedback,
} from '../src/lib/reader-feedback.mjs';
import { giscusScriptAttributes, postGiscusTheme } from '../src/lib/giscus-client.mjs';

test('comments stay off until a real discussion category id exists', () => {
  assert.equal(GISCUS.repoId, 'R_kgDOQzfxSQ');
  assert.equal(GISCUS.category, '');
  assert.equal(GISCUS.categoryId, '');
  assert.equal(giscusReady(), false);
  assert.equal(giscusReady({ ...GISCUS, category: '评论', categoryId: 'category-id' }), true);
});

test('a discussion follows the site path, including the base and one trailing slash', () => {
  assert.equal(discussionPath('/edges-brain-viruspc/posts/hello'), '/edges-brain-viruspc/posts/hello/');
  assert.equal(discussionPath('/edges-brain-viruspc/posts/hello/'), '/edges-brain-viruspc/posts/hello/');
  assert.equal(discussionPath('/edges-brain-viruspc/ai-news/2026-11-20'), '/edges-brain-viruspc/ai-news/2026-11-20/');
  assert.equal(discussionPath('/'), '/');
  assert.equal(discussionPath('https://evil.example/steal'), '/');
});

test('the issue link is a github form and only keeps a same-origin page', () => {
  const page = pageUrlForFeedback(
    'https://viruspc.github.io/edges-brain-viruspc/notes/a/?x=1#part',
    'https://viruspc.github.io',
  );
  assert.equal(page, 'https://viruspc.github.io/edges-brain-viruspc/notes/a/?x=1');
  const href = feedbackIssueUrl(page);
  const url = new URL(href);
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, '/VirusPC/edges-brain-viruspc/issues/new');
  assert.equal(url.searchParams.get('template'), 'reader-feedback.yml');
  assert.equal(url.searchParams.get('page'), page);
  assert.equal(pageUrlForFeedback('https://evil.example/phish', 'https://viruspc.github.io'), '');
  assert.equal(pageUrlForFeedback('javascript:alert(1)', 'https://viruspc.github.io'), '');
  assert.equal(feedbackIssueUrl(''), 'https://github.com/VirusPC/edges-brain-viruspc/issues/new?template=reader-feedback.yml');
});

test('giscus theme follows the site switch and messages stay on the giscus origin', () => {
  assert.equal(giscusTheme('dark', false), 'dark');
  assert.equal(giscusTheme('light', true), 'light');
  assert.equal(giscusTheme(null, true), 'dark');
  const attrs = giscusScriptAttributes('/edges-brain-viruspc/posts/a', 'dark');
  assert.equal(attrs['data-mapping'], 'specific');
  assert.equal(attrs['data-term'], '/edges-brain-viruspc/posts/a/');
  assert.equal(attrs['data-lang'], 'zh-CN');
  assert.equal(attrs['data-loading'], 'lazy');
  assert.equal(attrs.src, 'https://giscus.app/client.js');
  const calls = [];
  const iframe = { contentWindow: { postMessage: (data, origin) => calls.push([data, origin]) } };
  assert.equal(postGiscusTheme(iframe, 'light'), true);
  assert.deepEqual(calls, [[{ giscus: { setConfig: { theme: 'light' } } }, GISCUS_ORIGIN]]);
  assert.equal(postGiscusTheme({}, 'dark'), false);
  const source = fs.readFileSync(new URL('../src/lib/giscus-client.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /postMessage\([^)]+,\s*['"]\*['"]\)/);
});
