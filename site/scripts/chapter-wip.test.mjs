import assert from 'node:assert/strict';
import test from 'node:test';
import { markChapterWip } from '../src/plugins/rehype-chapter-wip.mjs';

function heading(value) {
  return { type: 'element', tagName: 'h2', properties: {}, children: [{ type: 'text', value }] };
}

test('planned tweet and podcast chapters get a construction badge without changing the title', () => {
  const tweets = heading('五、精选推文');
  const podcasts = heading('六、精选播客');
  const selected = heading('四、精选文章');
  const tree = { type: 'root', children: [selected, tweets, podcasts] };
  markChapterWip(tree, { path: '/tmp/2026-11-20-ai-news.md' });
  assert.equal(selected.properties.dataWip, undefined);
  assert.equal(tweets.properties.dataWip, '建设中');
  assert.equal(tweets.properties.ariaLabel, '五、精选推文，建设中');
  assert.equal(tweets.children[0].value, '五、精选推文');
  assert.equal(podcasts.properties.dataWip, '建设中');
  assert.equal(podcasts.children[0].value, '六、精选播客');
  markChapterWip(tree, { path: '/tmp/2026-11-20-ai-news.md' });
  assert.equal(tweets.properties.ariaLabel, '五、精选推文，建设中');
});

test('the badge stays off other pages', () => {
  const tweets = heading('五、精选推文');
  markChapterWip({ type: 'root', children: [tweets] }, { path: '/tmp/about.md' });
  assert.equal(tweets.properties.dataWip, undefined);
});
