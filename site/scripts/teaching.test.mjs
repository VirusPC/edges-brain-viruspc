import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { lessonStoresLocally, transformLessonHtml } from '../src/lib/teaching-html.mjs';
import {
  buildTeachingCatalog,
  defaultRepoRoot,
  publicHref,
  rewriteTeachingUrl,
  sameLessonText,
  visibleText,
} from '../src/lib/teaching.mjs';

const root = defaultRepoRoot();
const catalog = buildTeachingCatalog(root);
const base = '/edges-brain-viruspc/';

test('twelve topics follow the public index and do not invent progress', () => {
  assert.deepEqual(catalog.topics.map((topic) => topic.id), [
    'dsh-coding-agent-course',
    'agent-evals',
    'always-on-agents',
    'super-agent',
    'changelog',
    'cloud-coding-agent',
    'crewai',
    'dsh',
    'link-external-repo',
    'obsidian-cli',
    'openhands',
    'snorkeling-english',
  ]);
  for (const topic of catalog.topics) {
    assert.ok(topic.lessons.length > 0, `${topic.id} has a real lesson`);
    assert.equal(topic.lessons[0].number, '01');
  }
});

test('agent-evals counts the indexed lessons and keeps the parallel draft reachable', () => {
  const topic = catalog.topics.find((item) => item.id === 'agent-evals');
  assert.deepEqual(topic.lessons.map((lesson) => lesson.path), [
    'teaching/agent-evals/lesson-01',
    'teaching/agent-evals/lesson-02',
    'teaching/agent-evals/lesson-03',
    'teaching/agent-evals/lesson-04',
    'teaching/agent-evals/lesson-05',
    'teaching/agent-evals/lesson-06',
  ]);
  assert.equal(topic.lessons[1].title, '三类 grader');
  assert.equal(topic.secondary.length, 0);
  const parallel = catalog.pages.find((page) => page.route === 'agent-evals/lessons/0002-three-grader-types');
  assert.equal(parallel.canonicalRoute, 'agent-evals/lesson-02');
  assert.equal(parallel.role, 'secondary');
});

test('different lessons are not treated as the same text', () => {
  const lesson = (name) => visibleText(fs.readFileSync(path.join(root, 'teaching/agent-evals', name), 'utf8'));
  assert.equal(sameLessonText(lesson('lesson-02.html'), lesson('lessons/0002-three-grader-types.html')), true);
  assert.equal(sameLessonText(lesson('lesson-02.html'), lesson('lesson-03.html')), false);
});

test('dsh portable copy is a secondary entry and is not a second lesson', () => {
  const topic = catalog.topics.find((item) => item.id === 'dsh');
  assert.equal(topic.lessons.length, 1);
  assert.match(topic.lessons[0].path, /lessons\/0001-web-profile-not-model$/);
  assert.equal(topic.secondary.length, 1);
  assert.equal(topic.secondary[0].title, '便携版');
  assert.match(topic.secondary[0].path, /lesson-01$/);
  assert.ok(topic.notes.some((item) => item.path.startsWith('projects/2026-11-09--dsh/')));
});

test('topics without an index still list their real lessons', () => {
  for (const id of ['changelog', 'link-external-repo', 'obsidian-cli']) {
    const topic = catalog.topics.find((item) => item.id === id);
    assert.equal(topic.hasIndex, false);
    assert.ok(topic.lessons.every((lesson) => lesson.path.includes('/lessons/')));
  }
});

test('nested parallel links canonicalize and project notes stay inside the site', () => {
  const baseHref = rewriteTeachingUrl(
    catalog,
    'agent-evals/reference/eval-atoms.html',
    '../lessons/0002-three-grader-types.html',
    base,
  );
  assert.equal(baseHref, '/edges-brain-viruspc/teaching/agent-evals/lesson-02/');
  const projectHref = rewriteTeachingUrl(
    catalog,
    'dsh/index.html',
    '../../projects/2026-11-09--dsh/notes/2026-11-09--dsh-sdk-怎么用/INDEX.md',
    base,
  );
  assert.equal(projectHref, '/edges-brain-viruspc/projects/2026-11-09--dsh/notes/2026-11-09--dsh-sdk-怎么用/');
  const scriptHref = rewriteTeachingUrl(
    catalog,
    'cloud-coding-agent/lessons/0001-life-of-a-task.html',
    '../assets/quiz.js',
    base,
  );
  assert.equal(scriptHref, '/edges-brain-viruspc/teaching-static/cloud-coding-agent/assets/quiz.js');
  assert.equal(rewriteTeachingUrl(catalog, 'agent-evals/lesson-02.html', 'https://www.anthropic.com/x', base), null);
  assert.equal(publicHref(base, 'teaching/agent-evals/lesson-02'), '/edges-brain-viruspc/teaching/agent-evals/lesson-02/');
});

test('lesson html keeps quiz hooks and drops global style', () => {
  const raw = fs.readFileSync(path.join(root, 'teaching/agent-evals/lesson-02.html'), 'utf8');
  const transformed = transformLessonHtml(raw, {
    rewrite: (url) => rewriteTeachingUrl(catalog, 'agent-evals/lesson-02.html', url, base),
    cheatsheetHref: '/edges-brain-viruspc/teaching/agent-evals/reference/eval-atoms/',
  });
  assert.match(transformed.html, /data-choice="B"/);
  assert.match(transformed.html, /data-answer="B"/);
  assert.match(transformed.html, /function grade/);
  assert.match(transformed.html, /优先写确定性代码检查条件/);
  assert.match(transformed.html, /术语速查/);
  assert.match(transformed.html, /aria-live="polite"/);
  assert.doesNotMatch(transformed.html, /<style|stylesheet|--accent:\s*#9a3412|filter:\s*invert/);
  const cloud = fs.readFileSync(path.join(root, 'teaching/cloud-coding-agent/lessons/0001-life-of-a-task.html'), 'utf8');
  const cloudLesson = transformLessonHtml(cloud, {
    rewrite: (url) => rewriteTeachingUrl(catalog, 'cloud-coding-agent/lessons/0001-life-of-a-task.html', url, base),
  });
  assert.match(cloudLesson.html, /\/edges-brain-viruspc\/teaching-static\/cloud-coding-agent\/assets\/quiz\.js/);
  assert.doesNotMatch(cloudLesson.html, /src="\.\.\/assets\/quiz\.js"/);
  assert.equal(lessonStoresLocally(raw, path.join(root, 'teaching/agent-evals/lesson-02.html')), false);
});

test('svg sheets are not inverted and dsh controls stay on the original lesson', () => {
  const svg = transformLessonHtml('<body><svg viewBox="0 0 10 10"><text>图</text></svg></body>');
  assert.match(svg.html, /class="lesson-sheet"/);
  assert.match(svg.html, /<svg/);
  assert.doesNotMatch(svg.html, /invert/);
  const dsh = fs.readFileSync(path.join(root, 'teaching/dsh-coding-agent-course/lessons/0002-agent-and-driver.html'), 'utf8');
  const form = transformLessonHtml(dsh, {
    rewrite: (url) => rewriteTeachingUrl(catalog, 'dsh-coding-agent-course/lessons/0002-agent-and-driver.html', url, base),
  });
  assert.match(form.html, /id="check"/);
  assert.match(form.html, /id="export"/);
  assert.match(form.html, /导出作答 Markdown/);
  assert.equal(lessonStoresLocally(dsh, path.join(root, 'teaching/dsh-coding-agent-course/lessons/0002-agent-and-driver.html')), true);
  const other = transformLessonHtml(fs.readFileSync(path.join(root, 'teaching/agent-evals/lesson-02.html'), 'utf8'));
  assert.doesNotMatch(other.html, /导出作答 Markdown/);
});

test('routes are unique and prep markdown is outside the lesson list', () => {
  const routes = catalog.pages.map((page) => page.route);
  assert.equal(new Set(routes).size, routes.length);
  const topic = catalog.topics.find((item) => item.id === 'agent-evals');
  assert.ok(topic.materials.some((item) => item.path.includes('/read/')));
  assert.ok(topic.lessons.every((lesson) => !lesson.path.includes('/read/')));
});
