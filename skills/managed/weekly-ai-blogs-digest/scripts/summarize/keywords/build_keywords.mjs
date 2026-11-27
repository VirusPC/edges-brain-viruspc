/**
 * 在采集快照上选出本期关键词，并按 references/04 的 weight 公式写入 keywords.json。
 *
 * 词必须是快照标题或正文里的连续片段，或 model-releases.json 的官方名。
 * mentions 是窗口内快照条目数，sources 是这些条目链接的 hostname 数。
 * 不读周报正文，也不从 #### 条数现算。
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { keywordWeight } from "./keyword_weight.mjs";

export const SCORES = { model: 5, product: 4, concept: 3 };

/** 整词相等才排除。窗口前就有的产品名，即使本期被大量提到也不入词云。 */
export const BLOCKED_PRODUCTS = [
  "Codex",
  "Claude Code",
  "OpenRouter",
  "Cursor",
  "Devin",
  "Kiro",
  "GitHub",
  "GitLab",
  "ChatGPT",
  "Claude",
  "Gemini",
  "Amp",
  "Pierre",
  "Kimi",
  "千问",
  "混元",
  "LangSmith",
  "llama.cpp",
  "Grok Bot",
  "DeepSeek",
  "Octop",
];

const EXCLUDED_SOURCES = new Set(["linux-do-welfare"]);

const ANNOUNCE =
  /introducing|announcing|welcome|正式发布|正式开源|正式上线|上线|开源|发布/i;

const EN_STOP = new Set(
  `the a an of to for and or in on with our how we you your is are was be this that from by at as into over new now its it their them they not just more than about what when where who why which across per via using use used can may will latest first after before have has been onto out all one two get got read see here there today week amazon google openai meta anthropic bedrock nvidia build building introducing announcing starting making update coming most some any each both such also still only very then`.split(
    /\s+/,
  ),
);

const CJK_STOP = new Set(
  "如何 实践 技术 发布 正式 开源 模型 我们 一个 可以 通过 以及 进行 基于 构建 能力 系统 数据 应用 平台 团队 企业 智能 开发 使用 支持 实现 方案 研究 工作 内容 用户 产品 服务 功能 问题 方式 过程 结果 相关 目前 已经 开始 完成 提供 包括 需要 可能 主要 不同 自己 这个 这些 一种 没有 不是 还是 就是 如果 因为 所以 但是 然后 同时 其中 之后 之前 关于 针对 面向 用于 来自 成为 进入 上线 推出 新增 更新 优化 提升 带来 看到 分享 介绍 解读 思考 探索 落地 规模 安全 代码 编程 测试 分析 设计 架构 流程 工具 框架 接口 引擎 算法 训练 推理 生成 理解 知识 今天 本周 系列 深度 官方 更多 什么 怎么 为什么 这样 美团 腾讯 阿里 字节 百度 快手 蚂蚁 京东 华为 小米 淘宝 时代 业务 商家 经营 行业 论文 语言 重塑 下一 交付".split(
    /\s+/,
  ),
);

const COMPANY_PREFIX = /^(美团|腾讯|阿里巴巴|阿里|字节|百度|快手|蚂蚁|京东|华为|NVIDIA|Google|OpenAI)\s*/;

/**
 * @param {string} word
 */
export function isBlockedProduct(word) {
  const normalized = String(word || "").trim().toLowerCase();
  return BLOCKED_PRODUCTS.some((item) => item.toLowerCase() === normalized);
}

/**
 * @param {string} text
 * @param {string} word
 */
export function textHasWord(text, word) {
  const hay = String(text || "");
  const needle = String(word || "").trim();
  if (!needle) return false;
  if (!/[A-Za-z0-9]/.test(needle)) return hay.includes(needle);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^A-Za-z0-9])${escaped}(?=$|[^A-Za-z0-9])`, "i").test(hay);
}

/**
 * @param {string} link
 */
export function hostnameOf(link) {
  try {
    return new URL(link).hostname;
  } catch {
    return "";
  }
}

const LEADING_SKIP =
  /^(We|How|The|This|That|Build|Building|From|Your|Our|Why|What|When|Read|See|Now|New|A|An|Using|After|Before|I|It)\b/u;

const MODEL_SPAN =
  /[A-Z][A-Za-z0-9-]*(?:[ +-][A-Z][A-Za-z0-9-]*)*[ +-]?\d+(?:\.\d+){0,2}(?:-[A-Za-z0-9]+)*(?:[ ]+[A-Z][A-Za-z0-9.+-]*){0,2}/g;

const TRAILING_NAME_STOP = new Set(["security", "evaluation", "results", "guide", "track", "features", "update"]);

/** 名字里的这些词表示功能、工具或评测，不是新模型。 */
const FEATURE_TOKENS = new Set(["security", "review", "code", "evaluation", "benchmark", "test", "tests", "tool", "tools"]);

const GENERIC_CONCEPTS = new Set(
  `code review,software development,coding agent,frontier model,hugging face,open source,open models,machine learning,bedrock agentcore,devin desktop,devin security,devin cli,linked billing,claude platform,knowledge base,knowledge work,agentic software,agentic software development,managed knowledge base,managed knowledge`.split(
    ",",
  ),
);

/**
 * @param {string} value
 */
function normalizeTitle(value) {
  return String(value || "")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 评测、基准和测试报告不是模型发布。
 * @param {string} title
 */
export function isEvaluationTitle(title) {
  return /\b(evaluation|evaluations|benchmark|benchmarks)\b|评测|测评/i.test(normalizeTitle(title));
}

/**
 * 带版本号的安全功能、评审工具、代码工具算产品。评测标题里抽到的名字也不是模型。
 * @param {string} name
 * @param {string} [title]
 */
export function releaseKind(name, title = "") {
  const tokens = String(name || "")
    .split(/\s+/)
    .map((token) => token.toLowerCase());
  if (tokens.some((token) => FEATURE_TOKENS.has(token)) || isEvaluationTitle(title)) return "product";
  return "model";
}

/**
 * 只从发布标题里取型号，不从正文里的任意数字生长名字。
 * 评测标题整条跳过，避免剥掉 Evaluation / Security 后留下残片。
 * @param {string} title
 * @returns {string[]}
 */
export function modelNamesInTitle(title) {
  const clean = normalizeTitle(title);
  if (!clean || isEvaluationTitle(clean)) return [];
  const clauses = [];
  const intro = clean.match(/^(?:Introducing:?|Announcing|Welcome)\s+(.+)$/i);
  if (intro) {
    const [head, subtitle] = intro[1].split(/[:：]/);
    clauses.push(head);
    if (subtitle && !spansInClause(head).length) clauses.push(subtitle);
  }
  if (/正式发布|正式开源|正式上线|开源|发布|上线/.test(clean)) {
    for (const part of clean.split(/[:：，,]/)) clauses.push(part);
  }
  if (startsWithModel(clean)) clauses.push(subtitleHead(clean));
  const tail = clean.match(/([A-Z][A-Za-z]*\d[\w.-]*)$/);
  if (tail && /\b(with|featuring)\b/i.test(clean)) clauses.push(tail[1]);
  const names = [];
  const seen = new Set();
  for (const clause of clauses) {
    for (const name of spansInClause(clause)) {
      const key = name.toLowerCase();
      if (seen.has(key) || isBlockedProduct(name) || /\b(19|20)\d{2}$/.test(name)) continue;
      seen.add(key);
      names.push(name);
    }
  }
  return names.filter(
    (name) => !names.some((other) => other !== name && (other.endsWith(` ${name}`) || other.startsWith(`${name}-`) || other.startsWith(`${name} `))),
  );
}

/**
 * @param {string} title
 */
function subtitleHead(title) {
  return normalizeTitle(title).split(/[:：]|\s[—–-]\s/)[0].trim();
}

function startsWithModel(title) {
  const stripped = title.replace(COMPANY_PREFIX, "").trim();
  if (!stripped || LEADING_SKIP.test(stripped)) return false;
  const head = subtitleHead(stripped);
  const names = spansInClause(head.split(/\s+(?:and|or|与|和)\s+/i)[0]);
  if (!names.length || !head.startsWith(names[0])) return false;
  const rest = head.slice(names[0].length).trim();
  if (!rest) return true;
  if (/^is now available\b/i.test(rest)) return false;
  return /^(and|or|与|和)\b/i.test(rest) || /^(正式发布|正式开源|正式上线|开源|发布|上线)\b/.test(rest);
}

/**
 * @param {string} clause
 * @returns {string[]}
 */
function spansInClause(clause) {
  const names = [];
  const parts = String(clause || "")
    .replace(/^(?:Introducing:?|Announcing|Welcome)\s+/i, "")
    .split(/\s+(?:and|or|与|和)\s+/i);
  for (const part of parts) {
    const match = part.match(MODEL_SPAN);
    if (!match) continue;
    let name = match[0].replace(/\s+/g, " ").trim().replace(/[，,].*$/, "").trim();
    name = name.replace(/^(?:Introducing:?|Announcing|Welcome)\s+/i, "");
    let tokens = name.split(" ");
    while (tokens.length > 1 && TRAILING_NAME_STOP.has(tokens[tokens.length - 1].toLowerCase())) tokens.pop();
    let cut = 0;
    tokens.forEach((token, index) => {
      if (EN_STOP.has(token.toLowerCase())) cut = index + 1;
    });
    tokens = tokens.slice(cut);
    name = tokens.join(" ").replace(COMPANY_PREFIX, "").trim();
    if (!name || /^\d/.test(name) || !/[A-Za-z]/.test(name) || !/\d/.test(name)) continue;
    if (name.length < 3 || name.length > 40) continue;
    if (/\b[a-z]{3,}\b/.test(name)) continue;
    if (/^[A-Z]\d+(?:\s|$)/.test(name)) continue;
    names.push(name);
  }
  return names;
}

/**
 * @param {string} title
 * @returns {string[]}
 */
export function productNamesInTitle(title) {
  const clean = normalizeTitle(title).replace(/[\u2728\uFE0F]/g, " ").replace(/\s+/g, " ").trim();
  let body = "";
  const intro = clean.match(/^(?:Introducing:?|Announcing|Welcome)\s+(.+)$/i);
  const cnRelease = clean.match(/^(.+?)\s*正式(?:发布|开源|上线)/);
  const cnOpen = clean.match(/(?:^|[｜|])\s*(?:腾讯|美团|阿里|字节)?开源\s+([A-Za-z][\w.+-]{1,40})\s*$/);
  if (intro) body = intro[1];
  else if (cnRelease) body = cnRelease[1];
  else if (cnOpen) body = cnOpen[1];
  else return [];
  body = body.split(/[:：]/)[0].trim();
  if (!body || /\b(for|in|on|with|to)\b/i.test(body)) return [];
  const parts = body.split(/\s*(?:,|，|\band\b|与|和)\s*/i);
  const names = [];
  for (const part of parts) {
    const name = leadingProductName(part);
    if (name) names.push(name);
  }
  return names;
}

/**
 * @param {string} title
 * @returns {string | null}
 */
export function productNameInTitle(title) {
  return productNamesInTitle(title)[0] || null;
}

/**
 * @param {string} part
 */
function leadingProductName(part) {
  const tokens = String(part || "")
    .replace(COMPANY_PREFIX, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const kept = [];
  for (const token of tokens) {
    if (EN_STOP.has(token.toLowerCase())) break;
    if (/^[a-z]/.test(token)) break;
    if (!/^[A-Z0-9]/.test(token) && !/^[\u4e00-\u9fff]/.test(token)) break;
    kept.push(token);
    if (kept.length >= 4) break;
  }
  const name = kept.join(" ").trim();
  if (!name || isBlockedProduct(name) || name.length < 3 || name.length > 48) return null;
  return name;
}

/**
 * @param {{ title: string, text: string }[]} entries
 */
export function conceptPhrases(entries) {
  /** @type {Map<string, { display: string, titles: number }>} */
  const found = new Map();
  for (const entry of entries) {
    const title = entry.title || "";
    const tokens = title.match(/[A-Za-z][A-Za-z0-9.+-]*/g) || [];
    const seen = new Set();
    for (const size of [2, 3]) {
      for (let index = 0; index <= tokens.length - size; index += 1) {
        const gram = tokens.slice(index, index + size);
        if (gram.some((token) => EN_STOP.has(token.toLowerCase()) || token.length < 4)) continue;
        if (!gram.some((token) => token.length >= 6 || token.includes("-"))) continue;
        if (GENERIC_CONCEPTS.has(gram.join(" ").toLowerCase())) continue;
        const key = gram.join(" ").toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const display = gram.join(" ");
        const row = found.get(key) || { display, titles: 0 };
        row.titles += 1;
        if (display.split(" ").some((token) => /[A-Z]/.test(token[1] || "") || token.includes("-"))) {
          row.display = display;
        }
        found.set(key, row);
      }
    }
    for (const run of title.match(/[\u4e00-\u9fff]{3,8}/g) || []) {
      if (CJK_STOP.has(run) || /来啦|议程|报名|截止|征稿|直播/.test(run)) continue;
      if ([...CJK_STOP].some((stop) => run.includes(stop))) continue;
      const key = `cjk:${run}`;
      const row = found.get(key) || { display: run, titles: 0 };
      row.titles += 1;
      found.set(key, row);
    }
  }
  const phrases = [...found.entries()]
    .filter(([, row]) => row.titles >= 2)
    .map(([, row]) => row.display);
  return phrases.filter(
    (phrase) => !phrases.some((other) => other !== phrase && other.toLowerCase().startsWith(`${phrase.toLowerCase()} `)),
  );
}

/**
 * @param {string} issueDir
 */
export function readIssueEntries(issueDir) {
  const feeds = readJson(path.join(issueDir, "feeds.json"));
  const full = readJson(path.join(issueDir, "feeds-full.json"));
  if (!feeds || !Array.isArray(feeds.items)) {
    return { entries: [], window: null, gap: "没有 feeds.json 或其中没有 items" };
  }
  const window = feeds.window && feeds.window.since && feeds.window.until ? feeds.window : null;
  const byLink = new Map();
  const pools = [feeds.items];
  if (full && Array.isArray(full.items)) pools.push(full.items);
  let skippedWelfare = 0;
  let skippedDate = 0;
  for (const pool of pools) {
    for (const item of pool) {
      const date = String(item?.date || "").slice(0, 10);
      if (item?.source && EXCLUDED_SOURCES.has(item.source)) {
        skippedWelfare += 1;
        continue;
      }
      if (!window || !date || date < window.since || date > window.until) {
        skippedDate += 1;
        continue;
      }
      const link = String(item.link || "");
      const summary = String(item.summary || "");
      const title = String(item.title || "");
      const prev = byLink.get(link);
      if (prev && prev.summary.length >= summary.length) continue;
      byLink.set(link || `${item.source}:${title}:${date}:${byLink.size}`, {
        title,
        link,
        source: String(item.source || ""),
        date,
        summary,
        text: `${title}\n${summary}`,
      });
    }
  }
  return {
    entries: [...byLink.values()],
    window,
    skippedWelfare,
    skippedDate,
    gap: window ? null : "feeds.json 没有 window.since / window.until",
  };
}

/**
 * @param {string} issueDir
 */
export function readModelReleases(issueDir) {
  const file = path.join(issueDir, "model-releases.json");
  if (!existsSync(file)) return { models: [], gap: "没有 model-releases.json" };
  const data = readJson(file);
  if (!data) return { models: [], gap: "model-releases.json 无法解析" };
  if (data.skipped || data.ok === false) {
    const reason = String(data.reason || "model-releases.json 标记为 skipped").replace(/\s+/g, " ").trim();
    return { models: [], gap: reason.length > 180 ? `${reason.slice(0, 180)}…` : reason };
  }
  const models = Array.isArray(data.models) ? data.models : [];
  return {
    models: models
      .map((model) => ({
        name: String(model?.name || "").trim(),
        url: String(model?.release_url || "").trim(),
      }))
      .filter((model) => model.name),
    gap: null,
  };
}

/**
 * @param {string} issuesRoot
 * @param {string} issue
 */
export function priorTexts(issuesRoot, issue) {
  if (!issuesRoot || !existsSync(issuesRoot)) return [];
  const texts = [];
  for (const name of readdirSync(issuesRoot)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(name) || name >= issue) continue;
    const loaded = readIssueEntries(path.join(issuesRoot, name));
    for (const entry of loaded.entries) texts.push(entry.text || entry.title);
  }
  return texts;
}

/**
 * @param {string} issuesRoot
 * @param {string} issue
 * @param {{ snapshot?: { repo?: string, commit?: string | null, ref?: string | null }, priorMeta?: { issue: string, commit?: string | null, ref?: string | null }[] }} [meta]
 */
export function buildKeywordDocument(issuesRoot, issue, meta = {}) {
  const issueDir = path.join(issuesRoot, issue);
  const loaded = readIssueEntries(issueDir);
  const releases = readModelReleases(issueDir);
  const earlier = priorTexts(issuesRoot, issue);
  const gaps = [];
  if (loaded.gap) gaps.push(loaded.gap);
  if (releases.gap) gaps.push(releases.gap);
  if (!earlier.length) gaps.push("没有更早的 issues/ 快照，不能用标题排除窗口前已经公开的名字");

  /** @type {Map<string, string[]>} */
  const urls = new Map();
  for (const model of releases.models) {
    if (!model.url) continue;
    const list = urls.get(model.url) || [];
    list.push(model.name);
    urls.set(model.url, list);
  }

  /** @type {Map<string, { word: string, kind: string, score: number }>} */
  const selected = new Map();
  const add = (word, kind) => {
    const clean = String(word || "").replace(/\s+/g, " ").trim();
    if (!clean || isBlockedProduct(clean)) return;
    const key = clean.toLowerCase();
    const prev = selected.get(key);
    const rank = { model: 3, product: 2, concept: 1 };
    if (prev && rank[prev.kind] >= rank[kind]) return;
    selected.set(key, { word: clean, kind, score: SCORES[kind] });
  };

  const seenEarlier = (name) => earlier.some((text) => textHasWord(text, name));
  for (const model of releases.models) {
    if (seenEarlier(model.name)) continue;
    add(model.name, "model");
  }

  for (const entry of loaded.entries) {
    for (const name of modelNamesInTitle(entry.title)) {
      if (seenEarlier(name)) continue;
      add(name, releaseKind(name, entry.title));
    }
    if (!(ANNOUNCE.test(entry.title) || startsWithModel(entry.title))) continue;
    if (modelNamesInTitle(entry.title).length) continue;
    for (const product of productNamesInTitle(entry.title)) {
      if (seenEarlier(product)) continue;
      if ([...selected.values()].some((item) => item.kind === "model" && (textHasWord(product, item.word) || textHasWord(item.word, product)))) continue;
      if (modelNamesInTitle(entry.title).some((name) => textHasWord(product, name) || textHasWord(name, product))) continue;
      add(product, "product");
    }
  }

  for (const phrase of conceptPhrases(loaded.entries)) {
    if (isBlockedProduct(phrase)) continue;
    if ([...selected.values()].some((item) => {
      if (textHasWord(item.word, phrase) || textHasWord(phrase, item.word)) return true;
      return item.word.split(/\s+/).some((token) => token.length >= 5 && new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`, "i").test(phrase));
    })) continue;
    if (phrase.length < 2) continue;
    const carriesOldName = phrase.split(/\s+/).some((token) => /\d/.test(token) && seenEarlier(token));
    if (carriesOldName) continue;
    add(phrase, "concept");
  }

  const words = [...selected.values()].flatMap((item) => {
    const hosts = [];
    const seen = new Set();
    let example = "";
    for (const entry of loaded.entries) {
      const byText = textHasWord(entry.text, item.word);
      const byRelease = item.kind === "model" && (urls.get(entry.link) || []).includes(item.word);
      if (!byText && !byRelease) continue;
      if (entry.title && textHasWord(entry.title, item.word)) {
        if (!example || !textHasWord(example, item.word)) example = normalizeTitle(entry.title).slice(0, 120);
      } else if (!example && entry.title) example = normalizeTitle(entry.title).slice(0, 120);
      const host = hostnameOf(entry.link);
      if (host && !seen.has(host)) {
        seen.add(host);
        hosts.push(host);
      }
    }
    // 官方名写在 model-releases 里、但发布链接没有对应 feed 条目时，仍算这条快照记录。
    if (item.kind === "model") {
      for (const model of releases.models) {
        if (model.name !== item.word) continue;
        const already = loaded.entries.some((entry) => entry.link && entry.link === model.url);
        if (already) continue;
        const host = hostnameOf(model.url);
        if (host && !seen.has(host)) {
          seen.add(host);
          hosts.push(host);
        }
        if (!example) example = model.name;
      }
    }
    const mentions = countMentions(loaded.entries, urls, item);
    if (mentions < 1) return [];
    const scored = {
      word: item.word,
      kind: item.kind,
      score: item.score,
      mentions,
      sources: hosts.length,
    };
    return [{
      ...scored,
      weight: keywordWeight(scored),
      hosts,
      example,
    }];
  });

  markTheme(words);
  if (meta.themeLabel) applyThemeLabel(words, meta.themeLabel);
  words.sort(byPresentation);
  const capped = capWords(words);

  return {
    version: 1,
    issue,
    window: loaded.window,
    snapshot: {
      repo: meta.snapshot?.repo || "VirusPC/ai-news-data",
      commit: meta.snapshot?.commit || null,
      ref: meta.snapshot?.ref || null,
    },
    prior: meta.priorMeta || [],
    corpus: {
      entries: loaded.entries.length,
      excluded_sources: [...EXCLUDED_SOURCES],
      text: "同一 link 取 feeds.json 与 feeds-full.json 里更长的 summary；date 须落在 window 内",
    },
    gaps,
    omitted: capped.omitted.map((item) => item.word),
    words: capped.kept.map(publicWord),
  };
}

/**
 * @param {{ kind: string, weight: number, mentions: number, word: string }[]} words
 */
/**
 * 主题只从概念里选。sources 更高的优先，相同再比 mentions。
 * 型号和产品不因为 score 更高而成为主题。没有概念就不标。
 * @param {{ kind: string, sources: number, mentions: number, word: string, theme?: boolean }[]} words
 */
export function markTheme(words) {
  for (const item of words) delete item.theme;
  const concepts = words.filter((item) => item.kind === "concept");
  if (!concepts.length) return null;
  concepts.sort((a, b) => b.sources - a.sources || b.mentions - a.mentions || a.word.localeCompare(b.word, "zh"));
  concepts[0].theme = true;
  return concepts[0].word;
}

/**
 * 清洗时把已选中的主题写成读者表达。证据短语必须就是这条主题，不能另造话题。
 * @param {{ word: string, theme?: boolean, example?: string, evidence?: string }[]} words
 * @param {{ evidence: string, word: string }} label
 */
export function applyThemeLabel(words, label) {
  const evidence = String(label?.evidence || "").trim();
  const word = String(label?.word || "").trim();
  if (!evidence || !word) throw new Error("主题清洗要有 evidence 和 word");
  const theme = words.find((item) => item.theme);
  if (!theme) throw new Error("没有主题，不能改写");
  if (theme.word.toLowerCase() !== evidence.toLowerCase()) {
    throw new Error(`主题是 ${theme.word}，和证据 ${evidence} 对不上`);
  }
  if (words.some((item) => item !== theme && item.word.toLowerCase() === word.toLowerCase())) {
    throw new Error("主题表达和另一条词重复");
  }
  theme.evidence = evidence;
  theme.word = word;
  return words;
}

function byPresentation(a, b) {
  return Number(Boolean(b.theme)) - Number(Boolean(a.theme))
    || b.weight - a.weight
    || b.mentions - a.mentions
    || a.word.localeCompare(b.word, "zh");
}

function capWords(words) {
  const theme = words.filter((item) => item.theme);
  const models = words.filter((item) => item.kind === "model" && !item.theme);
  const rest = words.filter((item) => item.kind !== "model" && !item.theme);
  const room = Math.max(0, 16 - models.length - theme.length);
  const keptRest = rest.slice(0, room);
  const omitted = rest.slice(room);
  return { kept: [...theme, ...models, ...keptRest].sort(byPresentation), omitted };
}

/**
 * @param {any[]} entries
 * @param {Map<string, string[]>} urls
 * @param {{ word: string, kind: string }} item
 */
function countMentions(entries, urls, item) {
  let mentions = 0;
  for (const entry of entries) {
    const byText = textHasWord(entry.text, item.word);
    const byRelease = item.kind === "model" && (urls.get(entry.link) || []).includes(item.word);
    if (byText || byRelease) mentions += 1;
  }
  if (item.kind === "model") {
    for (const [url, names] of urls) {
      if (!names.includes(item.word)) continue;
      if (entries.some((entry) => entry.link === url)) continue;
      mentions += 1;
    }
  }
  return mentions;
}

/**
 * @param {any} item
 */
function publicWord(item) {
  const word = {
    word: item.word,
    kind: item.kind,
    score: item.score,
    mentions: item.mentions,
    sources: item.sources,
    weight: item.weight,
    hosts: item.hosts,
    example: item.example,
  };
  if (item.theme) word.theme = true;
  if (item.evidence) word.evidence = item.evidence;
  return word;
}

/**
 * @param {string} file
 */
function readJson(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { issuesRoot: "", issue: "", out: "", snapshotCommit: null, snapshotRef: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) fail(`缺少 ${arg} 的值`);
      i += 1;
      return value;
    };
    if (arg === "--issues-root") out.issuesRoot = next();
    else if (arg === "--issue") out.issue = next();
    else if (arg === "--out") out.out = next();
    else if (arg === "--snapshot-commit") out.snapshotCommit = next();
    else if (arg === "--snapshot-ref") out.snapshotRef = next();
    else if (arg === "--help" || arg === "-h") {
      console.log("node scripts/build_keywords.mjs --issues-root <dir> --issue YYYY-MM-DD --out keywords.json");
      process.exit(0);
    } else fail(`未知参数 ${arg}`);
  }
  if (!out.issuesRoot || !out.issue || !out.out) fail("需要 --issues-root、--issue 和 --out");
  return out;
}

/** 与 references/summarize/keywords.md 一致。权重 5 是 keywordWeight 的上限。 */
export const THEME_TAG_WEIGHT = 5;

/** 与 overview/validate.py 的 NO_MODEL 一致。refs 为空时这枚 tag 不进词云。 */
export const NO_MODEL_TEXT = "本周无重要模型发布";

export const TAG_RULES_SINCE = "0.0.9";

/**
 * 没有记录版本时按现行规则。有记录时，只有达到 minimum 才启用此后新增的规则。
 * @param {string | null | undefined} recorded
 * @param {string} minimum
 */
export function versionReached(recorded, minimum) {
  const got = parseVersion(recorded);
  const need = parseVersion(minimum);
  if (!got || !need) return true;
  for (let index = 0; index < 3; index += 1) {
    if (got[index] !== need[index]) return got[index] > need[index];
  }
  return true;
}

/**
 * @param {string | null | undefined} value
 * @returns {number[] | null}
 */
function parseVersion(value) {
  const match = String(value ?? "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * 抽词并标好 theme 之后调用。只提高权重、并入 targets，或追加新词。
 * 不删除已有词，也不因为 tag 本身把 theme 写成 true。
 * @param {{ name: string, weight: number, targets: string[], theme?: boolean }[]} keywords
 * @param {{ text?: string, tag?: string, refs?: { id?: string }[] }[]} themes
 */
export function mergeOverviewTags(keywords, themes) {
  const next = keywords.map((item) => ({
    ...item,
    targets: [...(item.targets || [])],
  }));
  for (const theme of themes || []) {
    if (!theme || typeof theme.tag !== "string") continue;
    const tag = theme.tag.trim();
    if (!tag) continue;
    const ids = [];
    for (const ref of theme.refs || []) {
      if (ref && typeof ref.id === "string" && ref.id && !ids.includes(ref.id)) ids.push(ref.id);
    }
    if (theme.text === NO_MODEL_TEXT && ids.length === 0) continue;
    if (!ids.length) continue;
    const existing = next.find((item) => item.name.trim().toLowerCase() === tag.toLowerCase());
    if (existing) {
      existing.weight = Math.max(Number(existing.weight) || 0, THEME_TAG_WEIGHT);
      for (const id of ids) {
        if (!existing.targets.includes(id)) existing.targets.push(id);
      }
    } else {
      next.push({ name: tag, weight: THEME_TAG_WEIGHT, targets: ids });
    }
  }
  next.sort(
    (a, b) =>
      Number(Boolean(b.theme)) - Number(Boolean(a.theme)) ||
      b.weight - a.weight ||
      a.name.localeCompare(b.name, "zh"),
  );
  return next;
}

/**
 * @param {string} issueDir
 */
function readOverview(issueDir) {
  const file = path.join(issueDir, "summary", "overview.json");
  if (!existsSync(file)) return null;
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`summary/overview.json 无法解析: ${error instanceof Error ? error.message : error}`);
  }
  if (!data || !Array.isArray(data.themes)) throw new Error("summary/overview.json 没有 themes");
  return data;
}

/**
 * @param {{ skill?: { version?: string }, themes?: { tag?: string }[] }} overview
 */
function assertThemeTags(overview) {
  if (!versionReached(overview?.skill?.version, TAG_RULES_SINCE)) return;
  const themes = Array.isArray(overview.themes) ? overview.themes : [];
  for (let index = 0; index < themes.length; index += 1) {
    const tag = themes[index]?.tag;
    if (typeof tag !== "string" || !tag.trim()) {
      throw new Error(`第 ${index + 1} 条主线缺少 tag`);
    }
  }
}

/**
 * 从 summary 卡片提炼词，不把整条标题当成一个词。
 * 有 overview.json 时，在抽词和 theme 标记之后把主线 tag 并入。
 * @param {string} issuesRoot
 * @param {string} issue
 */
export function summaryKeywords(issuesRoot, issue) {
  const issueDir = path.join(issuesRoot, issue);
  const loaded = readSummaryCorpus(issueDir);
  const earlier = [];
  if (existsSync(issuesRoot)) {
    for (const name of readdirSync(issuesRoot)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(name) || name >= issue) continue;
      earlier.push(...readSummaryCorpus(path.join(issuesRoot, name)).entries.map((entry) => entry.text));
    }
  }
  const selected = new Map();
  const rank = { model: 3, product: 2, concept: 1 };
  const add = (word, kind) => {
    const clean = String(word || "").replace(/\s+/g, " ").trim();
    if (!clean || isBlockedProduct(clean)) return;
    const key = clean.toLowerCase();
    const prev = selected.get(key);
    if (prev && rank[prev.kind] >= rank[kind]) return;
    selected.set(key, { word: clean, kind });
  };
  const seenEarlier = (name) => earlier.some((text) => textHasWord(text, name));
  for (const model of loaded.models) {
    if (!seenEarlier(model)) add(model, "model");
  }
  for (const entry of loaded.entries) {
    for (const name of modelNamesInTitle(entry.title)) {
      if (!seenEarlier(name)) add(name, releaseKind(name, entry.title));
    }
    if (!(ANNOUNCE.test(entry.title) || startsWithModel(entry.title))) continue;
    if (modelNamesInTitle(entry.title).length) continue;
    for (const product of productNamesInTitle(entry.title)) {
      if (seenEarlier(product) || isBlockedProduct(product)) continue;
      add(product, "product");
    }
  }
  for (const phrase of conceptPhrases(loaded.entries)) {
    if (phrase.length < 2 || seenEarlier(phrase)) continue;
    add(phrase, "concept");
  }
  const words = [...selected.values()].flatMap((item) => {
    const targets = [];
    const hosts = new Set();
    for (const entry of loaded.mentions) {
      if (entry.id === item.word || textHasWord(entry.text, item.word)) {
        if (!targets.includes(entry.id)) targets.push(entry.id);
        const host = hostnameOf(entry.link);
        if (host) hosts.add(host);
      }
    }
    if (!targets.length) return [];
    const scored = {
      word: item.word,
      kind: item.kind,
      mentions: targets.length,
      sources: hosts.size || 1,
    };
    return [{
      name: item.word,
      weight: keywordWeight(scored),
      targets,
      kind: item.kind,
      theme: false,
    }];
  });
  const concepts = words.filter((item) => item.kind === "concept");
  concepts.sort((a, b) => b.targets.length - a.targets.length || a.name.localeCompare(b.name, "zh"));
  if (concepts[0]) concepts[0].theme = true;
  words.sort((a, b) => Number(b.theme) - Number(a.theme) || b.weight - a.weight || a.name.localeCompare(b.name, "zh"));
  const models = words.filter((item) => item.kind === "model");
  const theme = words.filter((item) => item.theme);
  const rest = words.filter((item) => item.kind !== "model" && !item.theme);
  const kept = [...theme, ...models, ...rest.slice(0, Math.max(0, 16 - models.length - theme.length))];
  kept.sort((a, b) => Number(b.theme) - Number(a.theme) || b.weight - a.weight || a.name.localeCompare(b.name, "zh"));
  let keywords = kept.map((item) => {
    const word = { name: item.name, weight: item.weight, targets: item.targets };
    if (item.theme) word.theme = true;
    return word;
  });
  const overview = readOverview(path.join(issuesRoot, issue));
  if (overview) keywords = mergeOverviewTags(keywords, overview.themes);
  return { keywords };
}

function readSummaryCorpus(issueDir) {
  const entries = [];
  const mentions = [];
  const models = [];
  const summary = path.join(issueDir, "summary");
  const pushMention = (id, text, link) => {
    if (!id) return;
    mentions.push({ id: String(id), text: String(text || ""), link: String(link || "") });
  };
  for (const lane of ["articles", "projects", "models"]) {
    const laneDir = path.join(summary, lane);
    if (!existsSync(laneDir)) continue;
    for (const name of readdirSync(laneDir)) {
      const full = path.join(laneDir, name);
      if (!name.endsWith(".json") || name === "index.json") {
        if (name === "boards") {
          for (const boardName of readdirSync(full)) {
            if (!boardName.endsWith(".json")) continue;
            const board = JSON.parse(readFileSync(path.join(full, boardName), "utf8"));
            for (const item of board.items || []) {
              pushMention(item.id, item.name, "");
            }
          }
        }
        continue;
      }
      const card = JSON.parse(readFileSync(full, "utf8"));
      if (!card?.id) continue;
      const title = String(card.title || card.name || card.id);
      const text = cardText(card);
      const link = String(card.link || (String(card.id).startsWith("http") ? card.id : ""));
      if (lane === "models") models.push(String(card.id));
      entries.push({ title, text, link });
      pushMention(card.id, text, link);
    }
  }
  return { entries, mentions, models };
}

function cardText(card) {
  const parts = [card.title, card.lede, card.purpose, card.change];
  for (const section of Object.values(card.sections || {})) parts.push(section);
  for (const point of card.points || []) parts.push(point && point.text);
  return parts
    .filter((part) => typeof part === "string" && part.trim())
    .map(stripInlineMarkup)
    .join("\n");
}

function stripInlineMarkup(value) {
  return String(value || "")
    .replace(/<mark class="note-card-hl">([^<>]*)<\/mark>/g, "$1")
    .replace(/<a href="https?:\/\/[^"]+">([^<>]*)<\/a>/g, "$1");
}

function main() {
  try {
    const dir = process.argv[process.argv.indexOf("--issue-dir") + 1];
    if (!dir || dir.startsWith("--")) fail("需要 --issue-dir issues/YYYY-MM-DD");
    const overview = readOverview(dir);
    if (!overview) fail("关键词要在本周总结之后写，缺少 summary/overview.json");
    assertThemeTags(overview);
    const issue = path.basename(dir);
    const doc = summaryKeywords(path.dirname(dir), issue);
    const out = path.join(dir, "summary", "keywords.json");
    writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
    console.log(`${doc.keywords.length} keywords -> ${out}`);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) main();
