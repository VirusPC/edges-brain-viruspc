import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  countArticles,
  coverageWindow,
  formatCoverage,
  isLegacyIssue,
  issueTitle,
  listAiNewsFiles,
  summaryLine,
} from '../src/lib/ai-news.mjs';
import { formatISODate, noteDateFromName } from '../src/lib/select.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const aiNewsRoot = path.join(repoRoot, 'ai-news');

const backfillKeywords = {
  '2026-08-14-ai-news.md': 'GPT-5.6 Sol 的 Ultrafast，DeepSeek V4 Pro',
  '2026-08-21-ai-news.md': 'Cursor 并入 SpaceX',
  '2026-08-28-ai-news.md': 'GPT-5.6 进入 Kiro',
  '2026-09-04-ai-news.md': 'GPT-6 Astra，Fable 5.1 进入 Devin',
  '2026-09-18-ai-news.md': 'Claude Fable 5.1 发布',
  '2026-09-25-ai-news.md': 'GPT-6 Sol 与 Luna，Claude Opus 5.5',
  '2026-10-02-ai-news.md': 'GPT-6.1 Sol 与 dots',
  '2026-10-09-ai-news.md': 'GPT-6 面向所有人，Claude Haiku 5.5',
  '2026-10-16-ai-news.md': 'Gemini 4 Argon 进入 Antigravity',
  '2026-10-23-ai-news.md': 'MiniMax M3.1 Flash，DeepSeek V4.1 Flash',
};

test('issue files are the dated digests, not the readme, charts, or notes', () => {
  const files = listAiNewsFiles(aiNewsRoot);
  const notes = fs.readdirSync(aiNewsRoot).filter((name) => name.endsWith('.notes.md'));
  assert.equal(files.includes('README.md'), false);
  assert.equal(notes.includes('2026-11-06-ai-news.notes.md'), true);
  assert.equal(files.includes('2026-11-06-ai-news.notes.md'), false);
  assert.equal(files.at(0), '2026-08-14-ai-news.md');
});

test('coverage is the seven days before the publish date', () => {
  const date = noteDateFromName('2026-11-06-ai-news.md');
  const { start, end } = coverageWindow(date);
  assert.equal(formatISODate(start), '2026-10-30');
  assert.equal(formatISODate(end), '2026-11-05');
  assert.equal(formatCoverage(start, end), '2026-10-30～11-05');
  assert.equal(issueTitle(date), '2026-11-06 AI 资讯');

  const september = noteDateFromName('2026-09-04-ai-news.md');
  const window = coverageWindow(september);
  assert.equal(formatCoverage(window.start, window.end), '2026-08-28～09-03');

  const yearTurn = coverageWindow(noteDateFromName('2026-01-02'));
  assert.equal(formatCoverage(yearTurn.start, yearTurn.end), '2025-12-26～2026-01-01');
});

test('keyword line and legacy article counts follow the digest shape', () => {
  const latest = fs.readFileSync(path.join(aiNewsRoot, '2026-11-06-ai-news.md'), 'utf8');
  assert.equal(isLegacyIssue(latest), false);
  assert.equal(summaryLine(latest, false), '交付闭环：OpenAI 收购 Pierre，Amp 接入 GitLab');
  assert.match(latest, /较上周无新榜/);
  assert.match(latest, /llm-arena-top15-2026-10-28-marked\.png/);
  assert.doesNotMatch(latest, /llm-arena-top15-2026-11-06/);
  assert.match(latest, /keywords-cloud-2026-11-06\.png/);

  const september = fs.readFileSync(path.join(aiNewsRoot, '2026-09-25-ai-news.md'), 'utf8');
  assert.match(september, /较上周无新榜/);
  assert.match(september, /llm-arena-top15-2026-09-13-marked\.png/);

  const previous = fs.readFileSync(path.join(aiNewsRoot, '2026-10-30-ai-news.md'), 'utf8');
  assert.equal(summaryLine(previous, false), 'Cursor 扩展供应链后门');

  for (const [name, keyword] of Object.entries(backfillKeywords)) {
    const body = fs.readFileSync(path.join(aiNewsRoot, name), 'utf8');
    assert.equal(isLegacyIssue(body), false, name);
    assert.equal(summaryLine(body, false), keyword, name);
    assert.match(body, /本期于 2026-11 按新版格式补录。/);
    assert.equal(countArticles(body), 0, name);
  }
});

test('item titles link to the source and quote blocks are gone', () => {
  for (const name of listAiNewsFiles(aiNewsRoot)) {
    const body = fs.readFileSync(path.join(aiNewsRoot, name), 'utf8');
    assert.equal(body.includes('原始链接'), false, name);
    assert.match(body, /^#### (?:&lt;[^&]+&gt;)?\[[^\]]+\]\(https?:\/\//m, name);
    if (name === '2026-11-13-ai-news.md') {
      assert.match(body, /^### LLM Arena$/m, name);
      assert.match(body, /^### Artificial Analysis$/m, name);
      assert.match(body, /^### OpenRouter$/m, name);
      assert.doesNotMatch(body, /^### 模型发布$/m, name);
      assert.doesNotMatch(body, /^#### 整体排名$/m, name);
      const model = body.split(/^## 二、模型进展$/m)[1].split(/^## 三、/m)[0];
      const arena = model.indexOf('### LLM Arena');
      const analysis = model.indexOf('### Artificial Analysis');
      const openrouter = model.indexOf('### OpenRouter');
      const releases = model.search(/^#### \[/m);
      assert.ok(
        arena >= 0 && arena < analysis && analysis < openrouter && openrouter < releases,
        name,
      );
      assert.doesNotMatch(model.slice(arena, releases), /^#### /m, name);
      assert.match(model.slice(releases), /^#### \[/m, name);
      assert.match(model, /openrouter-usage-top15-2026-11-13-marked\.png/);
      assert.match(model, /openrouter-programming-top15-2026-11-13-marked\.png/);
      assert.match(model, /openrouter-apps-top15-2026-11-13-marked\.png/);
    }
    if (name === '2026-11-20-ai-news.md') {
      const model = body.split(/^## 二、模型进展$/m)[1].split(/^## 三、/m)[0];
      const analysis = model.indexOf('### Artificial Analysis');
      const arena = model.indexOf('### LLM Arena');
      const openrouter = model.indexOf('### OpenRouter');
      const releases = model.search(/^#### \[/m);
      assert.doesNotMatch(model, /^### 模型发布$/m);
      assert.ok(
        analysis >= 0 && analysis < arena && arena < openrouter && openrouter < releases,
        name,
      );
      for (const title of [
        '&lt;开源&gt;&lt;腾讯&gt;[登上 GitHub Trending｜腾讯开源 LoopForge]',
        '&lt;Agent 与 Harness&gt;&lt;腾讯&gt;[用 Super-agent 的理念拆解 Octop 团队模式]',
        '&lt;Agent 与 Harness&gt;&lt;腾讯&gt;[不只是 Memory：Ontology 如何让 Coding Agent 越用越懂项目]',
      ]) {
        assert.ok(body.includes(`#### ${title}`), title);
      }
      assert.doesNotMatch(body, /同一周腾讯另有两篇|其他短讯/);
      const selected = ['四、国内进展', '五、国际进展']
        .map((heading) => body.split(new RegExp(`^## ${heading}$`, 'm'))[1]?.split(/^## /m)[0] ?? '')
        .join('\n');
      const items = selected.split(/^#### /m).slice(1);
      assert.equal(items.length, 34);
      let folded = 0;
      let unread = 0;
      for (const item of items) {
        const links = item.match(/\[[^\]]+\]\(https?:\/\//g) || [];
        assert.equal(links.length, 1, `merged article: ${item.slice(0, 80)}`);
        const details = item.match(/<details class="article-more">[\s\S]*?<\/details>/g) || [];
        if (details.length === 0) {
          assert.match(item, /订阅源里只有这些/);
          unread += 1;
          continue;
        }
        assert.equal(details.length, 1, item.slice(0, 80));
        assert.doesNotMatch(details[0], /\n\n/);
        for (const label of ['解决什么问题：', '如何解决：', '效果怎样：', '洞察与启发：', '相关工作：']) {
          assert.match(details[0], new RegExp(`<strong>${label}</strong>`));
        }
        folded += 1;
      }
      assert.equal(folded, 31);
      assert.equal(unread, 3);
      assert.equal((selected.match(/订阅源里只有这些/g) || []).length, 3);
      assert.doesNotMatch(selected, /微信原文这次没打开|这次没打开原文/);
      const projects = body.split(/^## 三、项目开源$/m)[1].split(/^## 四、/m)[0];
      assert.match(projects, /GitHub Trending（weekly \/ all 前 5）/);
      const projectItems = projects.split(/^#### /m).slice(1);
      assert.equal(projectItems.length, 6);
      assert.match(projectItems[0], /^GitHub Trending（weekly \/ all 前 5）/);
      assert.doesNotMatch(projectItems[0], /<details/);
      for (const item of projectItems.slice(1)) {
        assert.doesNotMatch(item, /&lt;/);
        const details = item.match(/<details class="article-more">[\s\S]*?<\/details>/g) || [];
        assert.equal(details.length, 1, item.slice(0, 60));
        for (const label of ['解决什么问题：', '如何解决：', '效果怎样：', '洞察与启发：', '相关工作：']) {
          assert.match(details[0], new RegExp(`<strong>${label}</strong>`));
        }
        assert.doesNotMatch(details[0], /做 agent infra|做业务时|后续可以怎么做/);
      }
    }
  }

  const latest = fs.readFileSync(path.join(aiNewsRoot, '2026-11-06-ai-news.md'), 'utf8');
  assert.match(
    latest,
    /^#### \[Kiroween 黑客松：报名可领约 4000 积分\]\(https:\/\/kiroween\.devpost\.com\)$/m,
  );
  assert.match(latest, /以官方 Devpost 页面为准。 \[社区帖\]\(https:\/\/linux\.do\/t\/topic\/3101137\)/);
  assert.match(latest, /^#### \[BOTKEEP：3 个月免费托管\]\(https:\/\/linux\.do\/t\/topic\/3102454\)$/m);
  assert.match(
    latest,
    /^- \*\*\[OpenAI Images 2\.6\]\(https:\/\/openai\.com\/index\/introducing-images-2-6\)\*\*：图像生成更新。$/m,
  );
  assert.match(
    latest,
    /^#### &lt;交付闭环&gt;\[OpenAI 收购 Pierre\]\(https:\/\/openai\.com\/index\/openai-to-acquire-pierre\)$/m,
  );
  assert.match(latest, /"word":"交付闭环","score":5,"mentions":2,"sources":2,"weight":4\.1/);
  assert.doesNotMatch(latest, /^#### \[整体排名\]/m);
});

const PRIMARY_CATEGORIES = ['模型', '产品', 'Agent 与 Harness', '工程实践', '开源', '行业'];

function progressItems(body, heading) {
  const chunk = body.split(new RegExp(`^## ${heading}$`, 'm'))[1]?.split(/^## /m)[0] ?? '';
  return [...chunk.matchAll(/^#### .+$/gm)].map((match) => match[0]);
}

function selectedArticleItems(body) {
  const selected = body.split(/^## [〇一二三四五六七八九十]+、精选文章$/m)[1]?.split(/^## /m)[0];
  if (selected) return [...selected.matchAll(/^#### .+$/gm)].map((match) => match[0]);
  return ['四、国内进展', '五、国际进展'].flatMap((section) => progressItems(body, section));
}

test('selected-article items from 2026-11-20 on have one primary category', () => {
  const primaries = new Set(PRIMARY_CATEGORIES);
  const checked = [];
  for (const name of listAiNewsFiles(aiNewsRoot)) {
    if (name.slice(0, 10) < '2026-11-20') continue;
    const body = fs.readFileSync(path.join(aiNewsRoot, name), 'utf8');
    const lines = selectedArticleItems(body);
    assert.ok(lines.length > 0, `${name} has no selected-article items`);
    for (const line of lines) {
      const match = line.match(/^#### &lt;([^&]+)&gt;((?:&lt;[^&]+&gt;)*)\s*\S/);
      assert.ok(match, `${name} is missing a primary category: ${line}`);
      assert.ok(primaries.has(match[1]), `${name} primary is not one of the six: ${match[1]}`);
      checked.push(`${name} ${match[1]}`);
    }
  }
  assert.ok(checked.length >= 18, `expected the 2026-11-20 items to be checked, got ${checked.length}`);
});

test('a missing keyword chapter is legacy even when the date is recent', () => {
  const body = '## 本周风向\n\n## 文章总结列表\n\n### 一条 - 2026-11-01\n';
  assert.equal(isLegacyIssue(body), true);
  assert.equal(summaryLine(body, true), '1 篇');
  assert.equal(summaryLine('没有列表', true), '');
  assert.equal(summaryLine('## 一、本周关键词\n\n<br/>\n', false), '');
});
