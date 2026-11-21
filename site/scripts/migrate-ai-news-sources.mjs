/**
 * Move every published digest's selected articles into the four source-type
 * sections, and add a company tag when the publisher is known.
 * Safe to run again: existing company tags are kept and only normalized.
 *
 *   node site/scripts/migrate-ai-news-sources.mjs          # write
 *   node site/scripts/migrate-ai-news-sources.mjs --dry    # report only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPANY_ALIASES, SOURCE_GROUPS, sourceGroup } from '../src/lib/ai-news-category-filter.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const aiNews = path.join(repoRoot, 'ai-news');
const dry = process.argv.includes('--dry');

const HOSTS = [
  ['minimaxi.com', 'MiniMax'],
  ['minimax.io', 'MiniMax'],
  ['x.ai', 'xAI'],
  ['antigravity.google', 'Google'],
  ['blog.google', 'Google'],
  ['ai.google.dev', 'Google'],
  ['claude.com', 'Anthropic'],
  ['claude.dev', 'Anthropic'],
  ['anthropic.com', 'Anthropic'],
  ['ampcode.com', 'Amp'],
  ['cursor.com', 'Cursor'],
  ['openai.com', 'OpenAI'],
  ['aws.amazon.com', 'AWS'],
  ['kiro.dev', 'AWS'],
  ['langchain.com', 'LangChain'],
  ['lovable.dev', 'Lovable'],
  ['huggingface.co', 'Hugging Face'],
  ['devin.ai', 'Cognition'],
  ['cognition.ai', 'Cognition'],
  ['cognition.com', 'Cognition'],
  ['coderabbit.ai', 'CodeRabbit'],
  ['zed.dev', 'Zed'],
  ['latitude.so', 'Latitude'],
  ['warp.dev', 'Warp'],
  ['tech.meituan.com', '美团'],
  ['qwen.ai', '阿里'],
  ['aliyun.com', '阿里'],
  ['qoder.com', '阿里'],
  ['kimi.ai', 'Kimi'],
  ['kimi.com', 'Kimi'],
  ['moonshot.cn', 'Kimi'],
  ['deepseek.com', 'DeepSeek'],
  ['volcengine.com', '火山引擎'],
  ['bigmodel.cn', 'GLM'],
  ['zhipuai.cn', 'GLM'],
  ['stepfun.com', 'StepFun'],
  ['microsoft.com', 'Microsoft'],
  ['meta.com', 'Meta'],
  ['about.fb.com', 'Meta'],
  ['ai.meta.com', 'Meta'],
  ['alipay.com', '蚂蚁'],
  ['antgroup.com', '蚂蚁'],
];

const BIZ = {
  Mzk0OTYwNzc3NQ: 'DeepSeek',
  MjM5ODYwMjI2MA: '腾讯',
  Mzg4NTczNzg2OA: '阿里',
  MzAxNDEwNjk5OQ: '阿里',
  Mzg5MjU0NTI5OQ: '百度',
  MzI1MzYzMjE0MQ: '火山引擎',
  MzE5MTA3NzcxMQ: 'MiniMax',
  MzcwMjM3ODEzOA: 'Kimi',
};

const X_USERS = {
  DeepSeekHarness: 'DeepSeek',
  Alibaba_Qwen: '阿里',
};

const PREFIXES = [
  ['月之暗面', 'Kimi'],
  ['阶跃星辰', 'StepFun'],
  ['火山引擎', '火山引擎'],
  ['大淘宝', '阿里'],
  ['淘宝', '阿里'],
  ['阿里', '阿里'],
  ['腾讯', '腾讯'],
  ['字节', '字节'],
  ['快手', '快手'],
  ['美团', '美团'],
  ['百度', '百度'],
  ['通义', '阿里'],
  ['DeepSeek', 'DeepSeek'],
  ['MiniMax', 'MiniMax'],
  ['Anthropic', 'Anthropic'],
  ['OpenAI', 'OpenAI'],
  ['Google', 'Google'],
  ['Cursor', 'Cursor'],
];

function known(name) {
  if (!name) return '';
  const canonical = COMPANY_ALIASES[name] || name;
  return sourceGroup(canonical) ? canonical : '';
}

function hostCompany(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return '';
  }
  const host = parsed.hostname.replace(/^www\./, '');
  if (host === 'mp.weixin.qq.com') {
    const biz = parsed.searchParams.get('__biz') || '';
    return known(BIZ[biz.replace(/=+$/, '')] || '');
  }
  if (host === 'x.com' || host === 'twitter.com') {
    const user = parsed.pathname.split('/').filter(Boolean)[0] || '';
    return known(X_USERS[user] || '');
  }
  const hit = HOSTS.find(([suffix]) => host === suffix || host.endsWith(`.${suffix}`));
  return known(hit?.[1] || '');
}

function titleCompany(title) {
  const trimmed = title.trim();
  for (const [prefix, company] of PREFIXES) {
    if (trimmed.startsWith(`${prefix}：`) || trimmed.startsWith(`${prefix}:`)) return known(company);
  }
  return '';
}

function infer(rest) {
  const link = rest.match(/\]\((https?:\/\/[^)\s]+)\)/);
  const fromHost = link ? hostCompany(link[1]) : '';
  if (fromHost) return fromHost;
  const title = rest.match(/\[([^\]]+)\]/)?.[1] || '';
  return titleCompany(title);
}

function rewriteHeading(line) {
  const match = line.match(/^####\s+((?:&lt;[^&]+?&gt;)*)(.*)$/);
  if (!match) return { line, company: '', cat: '' };
  const labels = [...match[1].matchAll(/&lt;([^&]+?)&gt;/g)].map((item) => item[1].trim());
  const rest = match[2];
  let cat = '';
  let company = '';
  if (labels.length >= 2) {
    cat = labels[0];
    company = known(labels[1]) || infer(rest);
  } else if (labels.length === 1) {
    const named = known(labels[0]);
    if (named) company = named;
    else {
      cat = labels[0];
      company = infer(rest);
    }
  } else {
    company = infer(rest);
  }
  let next = '#### ';
  if (cat) next += `&lt;${cat}&gt;`;
  if (company) next += `&lt;${company}&gt;`;
  next += rest.startsWith('[') || rest.startsWith(' ') || rest === '' ? rest : ` ${rest}`;
  return { line: next, company, cat };
}

function regionOf(name) {
  if (name.startsWith('国内') || name === '国内进展') return 'cn';
  if (name.startsWith('国外') || name === '国际' || name === '国际进展') return 'intl';
  return '';
}

function migrate(text) {
  const lines = text.split('\n');
  let start = -1;
  let end = lines.length;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^##\s+[〇一二三四五六七八九十]+、(.+)$/);
    if (!match) continue;
    const selected = ['国内进展', '国际进展', '精选文章'].includes(match[1]);
    if (selected && start < 0) start = index;
    else if (start >= 0 && !selected) {
      end = index;
      break;
    }
  }
  if (start < 0) return { text, stats: null };
  const number = lines[start].match(/^##\s+([〇一二三四五六七八九十]+)、/)[1];
  const blocks = [];
  let region = '';
  let current = null;
  for (const line of lines.slice(start, end)) {
    const h2 = line.match(/^##\s+[〇一二三四五六七八九十]+、(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    if (h2) {
      region = regionOf(h2[1]) || region;
      if (current) blocks.push(current);
      current = null;
      continue;
    }
    if (h3) {
      region = regionOf(h3[1]) || region;
      if (current) blocks.push(current);
      current = null;
      continue;
    }
    if (line.startsWith('#### ')) {
      if (current) blocks.push(current);
      current = { region, lines: [line] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) blocks.push(current);

  const grouped = new Map(SOURCE_GROUPS.map((group) => [group.name, []]));
  const unknownHosts = new Map();
  for (const block of blocks) {
    const body = block.lines.filter((line) => !line.startsWith('## ')).join('\n').trim();
    if (!body.startsWith('#### ')) continue;
    const [heading, ...restLines] = body.split('\n');
    const rewritten = rewriteHeading(heading);
    const fallback = block.region === 'cn' ? '国内非模型厂' : block.region === 'intl' ? '国外非模型厂' : '';
    const group = sourceGroup(rewritten.company) || fallback;
    if (!group) throw new Error(`no section for ${heading}`);
    if (!rewritten.company) {
      const url = heading.match(/\]\((https?:\/\/[^)\s]+)\)/)?.[1] || '(no url)';
      let host = url;
      try {
        host = new URL(url).hostname;
      } catch {
        /* keep the raw string */
      }
      unknownHosts.set(host, (unknownHosts.get(host) || 0) + 1);
    }
    grouped.get(group).push(`${rewritten.line}\n${restLines.join('\n')}`.trim());
  }

  const parts = [`## ${number}、精选文章`];
  for (const group of SOURCE_GROUPS) {
    const items = grouped.get(group.name);
    if (!items.length) continue;
    parts.push('', `### ${group.name}`, '', items.join('\n\n'));
  }
  const next = [...lines.slice(0, start), parts.join('\n'), ...lines.slice(end)];
  return {
    text: `${next.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '')}\n`,
    stats: {
      articles: blocks.filter((block) => block.lines.some((line) => line.startsWith('#### '))).length,
      groups: SOURCE_GROUPS.map((group) => [group.name, grouped.get(group.name).length]),
      unknownHosts: [...unknownHosts.entries()].sort((a, b) => b[1] - a[1]),
    },
  };
}

const files = fs.readdirSync(aiNews).filter((name) => /^\d{4}-\d{2}-\d{2}-ai-news\.md$/.test(name)).sort();
for (const name of files) {
  const file = path.join(aiNews, name);
  const original = fs.readFileSync(file, 'utf8');
  const { text, stats } = migrate(original);
  if (!stats) {
    console.log(`${name}: no selected chapter`);
    continue;
  }
  console.log(`\n${name} ${stats.articles} articles`);
  for (const [group, count] of stats.groups) console.log(`  ${group}: ${count}`);
  if (stats.unknownHosts.length) {
    console.log('  untagged hosts:');
    for (const [host, count] of stats.unknownHosts) console.log(`    ${count}\t${host}`);
  }
  if (!dry && text !== original) fs.writeFileSync(file, text);
}
