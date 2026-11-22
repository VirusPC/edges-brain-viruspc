/**
 * Convert one flat issue plus its published markdown into raw/cleaned/summary.
 * Does not fetch, reselect, or rewrite the published text.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeIssueMarkdown } from '../../../../../site/src/lib/summary-issue.mjs';
import { coverageForIssueDate, seriesFromPayload } from '../../../../../site/src/lib/model-charts.mjs';

const VERSION = '0.2.0';
const SKILL = 'weekly-ai-blogs-digest';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const PREPARE = 'skills/managed/weekly-ai-blogs-digest/references/prepare/prepare.md';
const CLEAN = 'skills/managed/weekly-ai-blogs-digest/references/clean/clean.md';
const SUMMARIZE = 'skills/managed/weekly-ai-blogs-digest/references/summarize/summarize.md';

const RAW_MODELS = [
  'aa-language-models.json',
  'openrouter-rankings-daily.json',
  'openrouter-rankings-programming.json',
  'openrouter-app-rankings.json',
  'openrouter-app-rankings-coding.json',
  'openrouter-official-endpoints.json',
];

const BOARD_FILES = {
  aa: 'aa-language-models.json',
  'openrouter-usage': 'openrouter-rankings-daily.json',
  'openrouter-programming': 'openrouter-rankings-programming.json',
  'openrouter-apps': 'openrouter-app-rankings.json',
};

export function convertIssue(dataRoot, brainRoot, issueDate) {
  const issueDir = path.join(dataRoot, 'issues', issueDate);
  const markdownPath = path.join(brainRoot, 'ai-news', `${issueDate}-ai-news.md`);
  const gaps = { raw: [], cleaned: [], summary: [] };
  if (!fs.existsSync(issueDir)) throw new Error(`缺少 ${issueDir}`);
  if (!fs.existsSync(markdownPath)) throw new Error(`缺少 ${markdownPath}`);
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const dataCommit = readDataCommit(markdown);

  copyRaw(issueDir, gaps.raw);
  writeWindow(issueDir, issueDate);
  const articles = writeCleanedArticles(issueDir, gaps.cleaned);
  const projects = writeCleanedProjects(issueDir, gaps.cleaned);
  const models = writeCleanedModels(issueDir, gaps.cleaned);
  writeCleanedBoards(issueDir, issueDate, gaps.cleaned);
  const summary = writeSummary(issueDir, markdown, models, gaps.summary, dataCommit);
  writeStages(issueDir, dataCommit, gaps);
  const composed = composeIssueMarkdown(issueDir);
  if (composed !== markdown) {
    throw new Error(`${issueDate} 拼回的正文和已发布稿不一致`);
  }
  removeFlat(issueDir);
  return { articles: articles.length, projects: projects.length, models: models.length, summary, gaps };
}

function copyRaw(issueDir, gaps) {
  const raw = path.join(issueDir, 'raw');
  copyIf(issueDir, 'feeds.json', path.join(raw, 'articles', 'feeds.json'));
  copyIf(issueDir, 'feeds.index.json', path.join(raw, 'articles', 'feeds.index.json'));
  copyIf(issueDir, 'feeds-full.json', path.join(raw, 'articles', 'feeds-full.json'));
  if (fs.existsSync(path.join(issueDir, 'user-backfill.json'))) {
    copyIf(issueDir, 'user-backfill.json', path.join(raw, 'articles', 'backfill.json'));
  }
  copyIf(issueDir, 'github-trending.json', path.join(raw, 'projects', 'github-trending.json'));
  copyIf(issueDir, 'github-trending-weekly.json', path.join(raw, 'projects', 'github-trending-weekly.json'));
  if (!fs.existsSync(path.join(raw, 'projects', 'releases.json'))) {
    gaps.push({ path: 'projects/releases.json', reason: '这期快照没有单独的仓库发布记录' });
  }
  for (const name of RAW_MODELS) {
    const payload = readJson(path.join(issueDir, name));
    if (payload && payload.skipped === true) {
      if (name !== 'openrouter-app-rankings-coding.json') {
        gaps.push({ path: `models/${name}`, reason: String(payload.reason || payload.error || '这份榜单被跳过，没有可用数据') });
      }
      continue;
    }
    if (fs.existsSync(path.join(issueDir, name))) {
      copyIf(issueDir, name, path.join(raw, 'models', name));
    } else if (name !== 'openrouter-app-rankings-coding.json') {
      gaps.push({ path: `models/${name}`, reason: '期次根目录没有这份榜单文件' });
    }
  }
  for (const name of fs.readdirSync(issueDir)) {
    if (/^llm-arena-\d{4}-\d{2}-\d{2}\.json$/.test(name)) {
      copyIf(issueDir, name, path.join(raw, 'models', name));
    }
  }
  if (!fs.readdirSync(path.join(raw, 'models')).some((name) => /^llm-arena-/.test(name))) {
    gaps.push({ path: 'models/llm-arena-YYYY-MM-DD.json', reason: '期次根目录没有 Arena 快照' });
  }
  if (fs.existsSync(path.join(issueDir, 'model-releases.json'))) {
    copyIf(issueDir, 'model-releases.json', path.join(raw, 'models', 'model-releases.json'));
  }
}

function writeWindow(issueDir, issueDate) {
  const feeds = readJson(path.join(issueDir, 'raw', 'articles', 'feeds.json'));
  const manifest = readJson(path.join(issueDir, 'manifest.json'));
  const window = feeds?.window || manifest?.coverage_window || {};
  writeJson(path.join(issueDir, 'raw', 'window.json'), {
    issue: issueDate,
    since: window.since,
    until: window.until,
  });
}

function writeCleanedArticles(issueDir, gaps) {
  const feeds = readJson(path.join(issueDir, 'raw', 'articles', 'feeds.json'));
  const items = Array.isArray(feeds?.items) ? feeds.items : [];
  const seen = new Set();
  const records = [];
  for (const item of items) {
    if (!item?.link) continue;
    const id = normalizeLink(item.link);
    if (seen.has(id)) continue;
    seen.add(id);
    records.push({
      id,
      title: String(item.title || id),
      date: String(item.date || '').slice(0, 10) || '1970-01-01',
      source: 'raw/articles/feeds.json',
      text: String(item.summary || item.title || id),
    });
  }
  if (!records.length) gaps.push({ path: 'articles/index.json', reason: 'feeds.json 没有条目' });
  writeIndexAndItems(path.join(issueDir, 'cleaned', 'articles'), records);
  return records;
}

function writeCleanedProjects(issueDir, gaps) {
  const trending = readJson(path.join(issueDir, 'raw', 'projects', 'github-trending.json'));
  const items = Array.isArray(trending?.items) ? trending.items : [];
  const seen = new Set();
  const records = [];
  for (const item of items) {
    const id = repoUrl(item?.link);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    records.push({ id, source: 'raw/projects/github-trending.json' });
  }
  if (!records.length) gaps.push({ path: 'projects/index.json', reason: 'github-trending.json 没有仓库地址' });
  writeIndexAndItems(path.join(issueDir, 'cleaned', 'projects'), records);
  return records;
}

function writeCleanedModels(issueDir, gaps) {
  const releases = readJson(path.join(issueDir, 'raw', 'models', 'model-releases.json'))
    || readJson(path.join(issueDir, 'model-releases.json'));
  const models = Array.isArray(releases?.models) ? releases.models : [];
  const source = fs.existsSync(path.join(issueDir, 'raw', 'models', 'model-releases.json'))
    ? 'raw/models/model-releases.json'
    : 'raw/models/aa-language-models.json';
  const records = [];
  for (const model of models) {
    const name = String(model?.name || '').trim();
    if (!name) continue;
    records.push({ ...model, id: name, name, source });
  }
  if (!records.length) gaps.push({ path: 'models/index.json', reason: '没有 model-releases 模型事实' });
  writeIndexAndItems(path.join(issueDir, 'cleaned', 'models'), records);
  return records;
}

function writeCleanedBoards(issueDir, issueDate, gaps) {
  const coverage = coverageForIssueDate(issueDate);
  const dir = path.join(issueDir, 'cleaned', 'models', 'boards');
  fs.mkdirSync(dir, { recursive: true });
  let wrote = 0;
  for (const [kind, filename] of Object.entries(BOARD_FILES)) {
    const payload = readJson(path.join(issueDir, 'raw', 'models', filename));
    if (!payload || payload.skipped) continue;
    const series = coverage ? seriesFromPayload(kind, payload, coverage, '', null) : null;
    if (!series?.items?.length) continue;
    writeJson(path.join(dir, `${kind}.json`), {
      id: series.label || kind,
      source: `raw/models/${filename}`,
      publish_date: null,
      items: series.items.slice(0, 15).map((item) => ({ name: item.name, value: Number(item.value) || 0 })),
    });
    wrote += 1;
  }
  const arena = fs.readdirSync(path.join(issueDir, 'raw', 'models')).find((name) => /^llm-arena-/.test(name));
  if (arena) {
    const payload = readJson(path.join(issueDir, 'raw', 'models', arena));
    const series = coverage ? seriesFromPayload('llm-arena', payload, coverage, `榜单发布日 ${payload?.leaderboard_publish_date || ''}`, null) : null;
    if (series?.items?.length) {
      writeJson(path.join(dir, 'llm-arena.json'), {
        id: 'LLM Arena',
        source: `raw/models/${arena}`,
        publish_date: payload?.leaderboard_publish_date || null,
        items: series.items.slice(0, 15).map((item) => ({ name: item.name, value: Number(item.value) || 0 })),
      });
      wrote += 1;
    }
  }
  if (!wrote) gaps.push({ path: 'models/boards', reason: '榜单数字不能整理成可画的条目' });
}

function writeSummary(issueDir, markdown, models, gaps, dataCommit) {
  const parsed = splitPublished(markdown, models, gaps);
  for (const card of parsed.cards) {
    const lane = card.lane === 'articles' ? 'articles' : card.lane === 'projects' ? 'projects' : 'models';
    let source = relativeItem(issueDir, `cleaned/${lane}`, card.id);
    if (!source) {
      ensureCleaned(issueDir, lane, card, gaps);
      source = relativeItem(issueDir, `cleaned/${lane}`, card.id);
    }
    if (source) card.doc.source = source;
  }
  const summary = path.join(issueDir, 'summary');
  for (const lane of ['articles', 'projects', 'models']) {
    fs.mkdirSync(path.join(summary, lane), { recursive: true });
    for (const name of fs.readdirSync(path.join(summary, lane))) {
      if (name.endsWith('.json')) fs.unlinkSync(path.join(summary, lane, name));
    }
  }
  const used = new Set();
  for (const card of parsed.cards) {
    const file = `${slug(card.id, used)}.json`;
    writeJson(path.join(summary, card.lane, file), card.doc);
  }
  writeBoardsSummary(issueDir);
  writeKeywords(issueDir, parsed.cards, gaps);
  const modelChapter = parsed.chapters.find((chapter) => chapter.title === '模型进展');
  if (modelChapter) {
    const boardDir = path.join(summary, 'models', 'boards');
    modelChapter.boards = fs.existsSync(boardDir)
      ? fs.readdirSync(boardDir).filter((name) => name.endsWith('.json')).sort().map((name) => readJson(path.join(boardDir, name)).id)
      : [];
  }
  writeJson(path.join(summary, 'index.json'), {
    skill: SKILL,
    version: VERSION,
    data: { commit: dataCommit },
    blocks: parsed.blocks,
    chapters: parsed.chapters,
  });
  return { cards: parsed.cards.length, chapters: parsed.chapters.map((chapter) => chapter.title) };
}

function splitPublished(markdown, models, gaps) {
  const re = /^#{2,4} /gm;
  const starts = [0];
  let match;
  while ((match = re.exec(markdown))) starts.push(match.index);
  const slices = [];
  for (let i = 0; i < starts.length; i += 1) {
    slices.push(markdown.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : markdown.length));
  }
  const blocks = [];
  const cards = [];
  let chapter = '';
  let group = '';
  const groups = [];
  const projectIds = [];
  const modelIds = [];
  for (const slice of slices) {
    const heading = slice.split('\n', 1)[0];
    if (heading.startsWith('## ')) {
      chapter = heading.replace(/^##\s+/, '').trim();
      group = '';
      blocks.push({ kind: 'raw', text: slice });
      continue;
    }
    if (heading.startsWith('### ') && chapter.includes('精选文章')) {
      group = heading.replace(/^###\s+/, '').trim();
      blocks.push({ kind: 'raw', text: slice });
      continue;
    }
    const card = heading.startsWith('#### ') ? cardFrom(slice, chapter, models) : null;
    if (!card) {
      blocks.push({ kind: 'raw', text: slice });
      continue;
    }
    blocks.push({ kind: 'card', id: card.id });
    cards.push(card);
    if (card.lane === 'projects') projectIds.push(card.id);
    if (card.lane === 'models') modelIds.push(card.id);
    if (card.lane === 'articles' && group) {
      let bucket = groups.find((item) => item.title === group);
      if (!bucket) {
        bucket = { title: group, cards: [] };
        groups.push(bucket);
      }
      bucket.cards.push(card.id);
    }
  }
  const chapters = [];
  if (markdown.includes('## 一、本周关键词') || markdown.includes('## 本周关键词')) {
    chapters.push({ title: '本周关键词' });
  }
  chapters.push(
    { title: '模型进展', boards: boardIds(pathFromCards()), cards: modelIds },
    { title: '项目开源', cards: projectIds },
    { title: '精选文章', groups: groups.filter((item) => item.cards.length) },
    { title: '精选推文', cards: [] },
    { title: '精选播客', cards: [] },
  );
  if (!chapters.some((chapter) => chapter.title === '本周关键词')) {
    gaps.push({ path: 'keywords.json', reason: '已发布正文没有本周关键词这一章' });
  }
  return { blocks, cards, chapters, gapsNote: gaps };

  function pathFromCards() {
    return null;
  }
}

function boardIds() {
  return [];
}

function cardFrom(slice, chapter, models) {
  const link = slice.match(/^####\s+(?:&lt;[^&]+&gt;|\[[^\]]+\]\([^)]+\)|[^[\n])*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
  const simple = slice.match(/^####\s+(?:&lt;[^&]+&gt;)*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/);
  const found = simple || link;
  if (!found) return null;
  const title = decode(found[1]);
  const href = found[2];
  const tags = [...slice.slice(0, slice.indexOf('[')).matchAll(/&lt;([^&]+)&gt;|<([^>]+)>/g)].map((item) => item[1] || item[2]);
  if (chapter.includes('项目开源')) {
    const id = repoUrl(href) || normalizeLink(href);
    return {
      id,
      lane: 'projects',
      doc: {
        id,
        source: 'cleaned/projects/index.json',
        purpose: title,
        change: '见本期正文。',
        text: slice,
      },
    };
  }
  if (chapter.includes('模型进展')) {
    const folded = title.replace(/\s+/g, '').toLowerCase();
    const model = models.find((item) => item.release_url === href)
      || models.find((item) => item.name && (title.includes(item.name) || folded.includes(String(item.name).replace(/\s+/g, '').toLowerCase())));
    const id = model?.name || title;
    return {
      id,
      lane: 'models',
      doc: {
        id,
        source: model ? `cleaned/models/${slug(id, new Set())}.json` : 'cleaned/models/index.json',
        price: { text: factText(model?.price) },
        speed: { text: factText(model?.speed) },
        effect: { text: factText(model?.aa) || '暂无' },
        text: slice,
      },
    };
  }
  const id = normalizeLink(href);
  return {
    id,
    lane: 'articles',
    doc: {
      id,
      source: 'cleaned/articles/index.json',
      title,
      link: id,
      sentence: firstSentence(slice, title),
      category: categoryOf(tags[0]),
      company: tags[1] || '未署名',
      text: slice,
    },
  };
}

function writeKeywords(issueDir, cards, gaps) {
  const existing = readJson(path.join(issueDir, 'keywords.json'));
  const words = Array.isArray(existing?.words) ? existing.words : [];
  if (!words.length) {
    gaps.push({ path: 'keywords.json', reason: '快照没有 keywords.json，不另选词' });
    return;
  }
  const keywords = [];
  for (const word of words) {
    const name = String(word.word || '').trim();
    if (!name) continue;
    const targets = cards.filter((card) => textHas(card.doc.text, name) || textHas(card.id, name)).map((card) => card.id);
    const boardDir = path.join(issueDir, 'summary', 'models', 'boards');
    if (fs.existsSync(boardDir)) {
      for (const file of fs.readdirSync(boardDir)) {
        if (!file.endsWith('.json')) continue;
        const board = readJson(path.join(boardDir, file));
        for (const item of board?.items || []) {
          if (textHas(item.name, name) || textHas(item.id, name)) targets.push(item.id);
        }
      }
    }
    const unique = [...new Set(targets)];
    if (!unique.length) {
      gaps.push({ path: `keywords.json#${name}`, reason: `${name} 在三路卡片里没有对上的 ID` });
      continue;
    }
    const item = { name, weight: Number(word.weight) || 1, targets: unique };
    if (word.theme === true) item.theme = true;
    keywords.push(item);
  }
  if (!keywords.length) {
    gaps.push({ path: 'keywords.json', reason: '已有词都对不上卡片 ID' });
    return;
  }
  writeJson(path.join(issueDir, 'summary', 'keywords.json'), { keywords });
}

function writeBoardsSummary(issueDir) {
  const from = path.join(issueDir, 'cleaned', 'models', 'boards');
  const to = path.join(issueDir, 'summary', 'models', 'boards');
  fs.mkdirSync(to, { recursive: true });
  if (!fs.existsSync(from)) return;
  for (const name of fs.readdirSync(from)) {
    if (!name.endsWith('.json')) continue;
    const board = readJson(path.join(from, name));
    writeJson(path.join(to, name), {
      id: board.id,
      source: `cleaned/models/boards/${name}`,
      caption: '这一期的榜单。',
      highlights: [],
      arena_publish_date: board.publish_date || null,
      items: (board.items || []).map((item) => ({
        id: `${board.id} ${item.name}`,
        name: item.name,
        value: item.value,
      })),
    });
  }
}

function writeStages(issueDir, dataCommit, gaps) {
  const stages = [
    ['raw', PREPARE],
    ['cleaned', CLEAN],
    ['summary', SUMMARIZE],
  ];
  for (const [name, entry] of stages) {
    writeJson(path.join(issueDir, name, 'stage.json'), {
      name,
      skill: SKILL,
      version: VERSION,
      path: entry,
    });
    writeJson(path.join(issueDir, name, 'gaps.json'), { gaps: gaps[name] });
  }
  const index = readJson(path.join(issueDir, 'summary', 'index.json'));
  if (index) {
    index.data = { commit: dataCommit };
    writeJson(path.join(issueDir, 'summary', 'index.json'), index);
  }
}

function removeFlat(issueDir) {
  for (const name of fs.readdirSync(issueDir)) {
    const abs = path.join(issueDir, name);
    if (name === 'raw' || name === 'cleaned' || name === 'summary') continue;
    fs.rmSync(abs, { recursive: true, force: true });
  }
}

function writeIndexAndItems(dir, records) {
  fs.mkdirSync(dir, { recursive: true });
  const used = new Set();
  writeJson(path.join(dir, 'index.json'), { ids: records.map((item) => item.id) });
  for (const record of records) writeJson(path.join(dir, `${slug(record.id, used)}.json`), record);
}

function copyIf(issueDir, name, dest) {
  const from = path.join(issueDir, name);
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(from, dest);
}

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureCleaned(issueDir, lane, card, gaps) {
  const dir = path.join(issueDir, 'cleaned', lane);
  const indexPath = path.join(dir, 'index.json');
  const index = readJson(indexPath) || { ids: [] };
  if (!index.ids.includes(card.id)) index.ids.push(card.id);
  writeJson(indexPath, index);
  const used = new Set(fs.readdirSync(dir).filter((name) => name.endsWith('.json')).map((name) => name.replace(/\.json$/, '')));
  const record = lane === 'models'
    ? { id: card.id, name: card.id, source: 'raw/models/model-releases.json' }
    : lane === 'projects'
      ? { id: card.id, source: 'raw/projects/github-trending.json' }
      : {
        id: card.id,
        title: card.doc.title || card.id,
        date: '1970-01-01',
        source: 'raw/articles/feeds.json',
        text: card.doc.sentence || card.doc.title || card.id,
      };
  writeJson(path.join(dir, `${slug(card.id, used)}.json`), record);
  gaps.push({ path: `${lane}/${card.id}`, reason: '已发布卡片的 ID 不在清洗候选里，按正文链接补了一条，没有新写摘要' });
}

function relativeItem(issueDir, lane, id) {
  const dir = path.join(issueDir, lane);
  if (!fs.existsSync(dir)) return '';
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json') || name === 'index.json') continue;
    const doc = readJson(path.join(dir, name));
    if (doc?.id === id) return `${lane}/${name}`;
  }
  return '';
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeLink(link) {
  try {
    const url = new URL(link);
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, '');
    return url.toString();
  } catch {
    return String(link || '').trim();
  }
}

function repoUrl(link) {
  try {
    const url = new URL(link);
    if (!/github\.com$/i.test(url.hostname)) return null;
    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    return `https://github.com/${match[1]}/${match[2].replace(/\.git$/, '')}`;
  } catch {
    return null;
  }
}

function slug(id, used) {
  let base = String(id).replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  if (!base) base = 'item';
  let name = base;
  let n = 2;
  while (used.has(name)) {
    name = `${base}-${n}`;
    n += 1;
  }
  used.add(name);
  return name;
}

function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function categoryOf(tag) {
  const allowed = ['模型', '架构', '产品', '实践', '开源', '其他'];
  return allowed.includes(tag) ? tag : '其他';
}

function firstSentence(slice, title) {
  const text = slice.replace(/<[^>]+>/g, ' ').replace(/[#>*[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const sentence = text.replace(title, '').trim().slice(0, 180);
  return sentence || title;
}

function factText(value) {
  if (!value || typeof value !== 'object') return '暂无';
  if (value.input == null && value.output == null && value.intelligence_index == null) return '暂无';
  if (value.intelligence_index != null) return String(value.intelligence_index);
  return '见发布事实';
}

function textHas(text, word) {
  const hay = String(text || '');
  const needle = String(word || '').trim();
  if (!needle) return false;
  if (!/[A-Za-z0-9]/.test(needle)) return hay.includes(needle);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^A-Za-z0-9])${escaped}(?=$|[^A-Za-z0-9])`, 'i').test(hay);
}

function readDataCommit(markdown) {
  const comment = markdown.match(/<!--\s*provenance\s*([\s\S]*?)-->/);
  if (!comment) return null;
  try {
    const commit = JSON.parse(comment[1].trim())?.data?.commit;
    return typeof commit === 'string' && /^[0-9a-f]{40}$/.test(commit) ? commit : null;
  } catch {
    return null;
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const args = process.argv.slice(2);
  const dataRoot = args[args.indexOf('--data') + 1];
  const brainRoot = args[args.indexOf('--brain') + 1] || ROOT;
  const only = args.includes('--issue') ? [args[args.indexOf('--issue') + 1]] : [
    '2026-10-23', '2026-10-30', '2026-11-06', '2026-11-13', '2026-11-20',
  ];
  for (const issue of only) {
    const result = convertIssue(dataRoot, brainRoot, issue);
    console.log(issue, JSON.stringify(result));
  }
}

function pathToFileURL(file) {
  return new URL(`file://${file}`);
}
