#!/usr/bin/env node
/**
 * Move the five product-eval directories out of edges/ into projects/2026-06-21--Agent产品评测/.
 *
 * Preview (default): node scripts/migrations/move-agent-product-eval.mjs
 * Apply:            node scripts/migrations/move-agent-product-eval.mjs --apply
 *
 * Idempotent. Refuses to edit evaluations/, posts/, .edges/tasks/, or the
 * 2026-10-31 harness-eval project. Uses git mv so history follows the trees.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../..');
const apply = process.argv.includes('--apply');

const PROJECT_REL = 'projects/2026-06-21--Agent产品评测';
const DIRS = [
  '_eval_agent_desktop',
  '_eval_ai_product',
  '_eval_api',
  '_eval_cli',
  '_eval_web',
];
const BLURBS = {
  _eval_agent_desktop: '桌面 Agent 的形态、会话、多模态、代码与云端能力。',
  _eval_ai_product: 'grok-bot、multi-agent、multica 等产品笔记。',
  _eval_api: '订阅制会员与 API key。',
  _eval_cli: 'CLI 产品体验，含 kimi、codex 与 remote control。',
  _eval_web: 'Web 产品笔记（raft）。',
};
const PROTECTED_PREFIXES = [
  'evaluations/',
  'posts/',
  '.edges/tasks/',
  'projects/2026-10-31--仓库快照下的端到端-harness-评测/',
];
const EDGES_README = 'edges/README.md';
const PROJECTS_README = 'projects/README.md';
const EDGES_SENTENCE =
  'Agent 与 AI 产品的对照笔记放在 [Agent产品评测](<../projects/2026-06-21--Agent%E4%BA%A7%E5%93%81%E8%AF%84%E6%B5%8B/INDEX.md>)。五个目录仍用原名：`_eval_agent_desktop`、`_eval_ai_product`、`_eval_api`、`_eval_cli`、`_eval_web`。';
const EDGES_ANCHOR =
  '以上是新增内容和后续维护的约定。历史导入内容已完成目录入口转换，但尚未全部按准入标准整理；目录化不代表其结论已经验证，现有内容也尚未按上述观察维度记录。';
const PROJECTS_ENTRY =
  '- [Agent产品评测](<2026-06-21--Agent%E4%BA%A7%E5%93%81%E8%AF%84%E6%B5%8B/INDEX.md>) — Agent、CLI、API 与 Web 产品对照笔记，目录名保持 `_eval_agent_desktop`、`_eval_ai_product`、`_eval_api`、`_eval_cli`、`_eval_web`。';
const PROJECTS_ANCHOR = '<!-- edges-entries-local:start -->\n## 本层内容\n\n';

const conflicts = [];
const actions = [];

function abs(rel) {
  return path.join(repoRoot, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function isSymlink(rel) {
  return exists(rel) && fs.lstatSync(abs(rel)).isSymbolicLink();
}

function read(rel) {
  return fs.readFileSync(abs(rel), 'utf8');
}

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', ...opts });
}

function encodePath(rel) {
  return rel.split('/').map((part) => encodeURIComponent(part)).join('/');
}

function childIndexes(dirName) {
  const root = abs(path.posix.join(PROJECT_REL, dirName));
  const source = exists(path.posix.join('edges', dirName))
    ? abs(path.posix.join('edges', dirName))
    : root;
  if (!fs.existsSync(source)) return [];
  return fs.readdirSync(source, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'zh'))
    .map((name) => {
      const indexRel = path.posix.join(dirName, name, 'INDEX.md');
      const present = fs.existsSync(path.join(source, name, 'INDEX.md'));
      return { name, indexRel, present };
    });
}

function desiredIndex() {
  const sections = DIRS.map((dirName) => {
    const children = childIndexes(dirName);
    const items = children.map((child) => (
      child.present
        ? `- [${child.name}](<${encodePath(child.indexRel)}>)`
        : `- ${child.name}`
    ));
    return [
      `## ${dirName}`,
      '',
      BLURBS[dirName],
      '',
      ...items,
      '',
    ].join('\n');
  });
  return [
    '# Agent产品评测',
    '',
    '桌面 Agent、其它 AI 产品、API、CLI 与 Web 的对照笔记。日期取最早的粘贴图 `Pasted image 20260621155432.png`（2026-06-21）。',
    '',
    '仓库快照下的端到端 harness 评测在 [另一个 Project](<../2026-10-31--%E4%BB%93%E5%BA%93%E5%BF%AB%E7%85%A7%E4%B8%8B%E7%9A%84%E7%AB%AF%E5%88%B0%E7%AB%AF-harness-%E8%AF%84%E6%B5%8B/INDEX.md>)。',
    '',
    ...sections,
    '',
  ].join('\n');
}

function desiredEdgesReadme(current) {
  if (current.includes(EDGES_SENTENCE)) return current;
  if (!current.includes(EDGES_ANCHOR)) {
    conflicts.push(`${EDGES_README}: 找不到插入锚点`);
    return current;
  }
  return current.replace(EDGES_ANCHOR, `${EDGES_ANCHOR}\n\n${EDGES_SENTENCE}`);
}

function desiredProjectsReadme(current) {
  if (current.includes(PROJECTS_ENTRY)) return current;
  if (!current.includes(PROJECTS_ANCHOR)) {
    conflicts.push(`${PROJECTS_README}: 找不到 edges-entries 锚点`);
    return current;
  }
  return current.replace(PROJECTS_ANCHOR, `${PROJECTS_ANCHOR}${PROJECTS_ENTRY}\n`);
}

function replaceOldPaths(text) {
  let next = text;
  let count = 0;
  for (const dirName of DIRS) {
    const from = `edges/${dirName}`;
    const to = `${PROJECT_REL}/${dirName}`;
    const parts = next.split(from);
    count += parts.length - 1;
    next = parts.join(to);
  }
  return { next, count };
}

function isProtected(rel) {
  const normalized = rel.split(path.sep).join('/');
  return PROTECTED_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}

function trackedOldPathFiles() {
  const args = ['grep', '-I', '-l', '-z'];
  for (const dirName of DIRS) args.push('-e', `edges/${dirName}`);
  let output = '';
  try {
    output = git(args);
  } catch (error) {
    if (error.status === 1) return [];
    throw error;
  }
  return output.split('\0').filter(Boolean);
}

function planMoves() {
  for (const dirName of DIRS) {
    const from = `edges/${dirName}`;
    const to = `${PROJECT_REL}/${dirName}`;
    if (isSymlink(from) || isSymlink(to)) {
      conflicts.push(`符号链接：${from} 或 ${to}`);
      continue;
    }
    const source = exists(from);
    const dest = exists(to);
    if (source && dest) conflicts.push(`源和目标同时存在：${from} -> ${to}`);
    else if (!source && !dest) conflicts.push(`源和目标都不存在：${from}`);
    else if (source && !dest) actions.push(`git mv ${from} -> ${to}`);
    else actions.push(`already moved ${to}`);
  }
}

function planDocuments() {
  const indexRel = `${PROJECT_REL}/INDEX.md`;
  const desired = desiredIndex();
  if (!exists(indexRel)) actions.push(`write ${indexRel}`);
  else if (read(indexRel) !== desired) conflicts.push(`${indexRel}: 已存在且与脚本生成内容不一致`);
  else actions.push(`unchanged ${indexRel}`);

  for (const [rel, transform] of [
    [EDGES_README, desiredEdgesReadme],
    [PROJECTS_README, desiredProjectsReadme],
  ]) {
    if (!exists(rel)) {
      conflicts.push(`缺少 ${rel}`);
      continue;
    }
    const current = read(rel);
    const next = transform(current);
    if (next !== current) actions.push(`update ${rel}`);
    else actions.push(`unchanged ${rel}`);
  }
}

function planRewrites() {
  const scriptRel = path.relative(repoRoot, scriptPath).split(path.sep).join('/');
  for (const rel of trackedOldPathFiles()) {
    if (rel === scriptRel) continue;
    if (isProtected(rel)) {
      conflicts.push(`受保护路径仍含旧路径，不改：${rel}`);
      continue;
    }
    const { count } = replaceOldPaths(read(rel));
    if (count > 0) actions.push(`rewrite ${count} path(s) in ${rel}`);
  }
}

function writeFile(rel, contents) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), contents);
}

function applyMoves() {
  fs.mkdirSync(abs(PROJECT_REL), { recursive: true });
  for (const dirName of DIRS) {
    const from = `edges/${dirName}`;
    const to = `${PROJECT_REL}/${dirName}`;
    if (exists(from) && !exists(to)) git(['mv', '--', from, to]);
  }
}

function applyDocuments() {
  const indexRel = `${PROJECT_REL}/INDEX.md`;
  const desired = desiredIndex();
  if (!exists(indexRel)) writeFile(indexRel, desired);
  for (const [rel, transform] of [
    [EDGES_README, desiredEdgesReadme],
    [PROJECTS_README, desiredProjectsReadme],
  ]) {
    const current = read(rel);
    const next = transform(current);
    if (next !== current) writeFile(rel, next.endsWith('\n') ? next : `${next}\n`);
  }
}

function applyRewrites() {
  const scriptRel = path.relative(repoRoot, scriptPath).split(path.sep).join('/');
  for (const rel of trackedOldPathFiles()) {
    if (rel === scriptRel || isProtected(rel)) continue;
    const current = read(rel);
    const { next, count } = replaceOldPaths(current);
    if (count > 0) writeFile(rel, next);
  }
}

function verify() {
  const problems = [];
  for (const dirName of DIRS) {
    if (exists(`edges/${dirName}`)) problems.push(`仍在 edges/：${dirName}`);
    if (!exists(`${PROJECT_REL}/${dirName}`)) problems.push(`目标缺少：${dirName}`);
  }
  const leftovers = trackedOldPathFiles().filter((rel) => {
    const scriptRel = path.relative(repoRoot, scriptPath).split(path.sep).join('/');
    return rel !== scriptRel;
  });
  for (const rel of leftovers) problems.push(`仍引用旧路径：${rel}`);
  return problems;
}

if (git(['rev-parse', '--show-toplevel']).trim() !== repoRoot) {
  throw new Error(`脚本必须在仓库根运行，当前解析到 ${repoRoot}`);
}

planMoves();
planDocuments();
planRewrites();

console.log(apply ? 'apply' : 'preview');
for (const action of actions) console.log(`  ${action}`);
if (conflicts.length) {
  console.error('conflicts:');
  for (const conflict of conflicts) console.error(`  ${conflict}`);
  process.exit(1);
}
if (!apply) {
  console.log('preview only; re-run with --apply');
  process.exit(0);
}

applyMoves();
applyDocuments();
applyRewrites();
const problems = verify();
if (problems.length) {
  console.error('verify failed:');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log('verify ok');
