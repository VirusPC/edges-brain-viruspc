#!/usr/bin/env node
/**
 * Preview (default): node scripts/migrations/adopt-routines.mjs --framework /path/to/edges
 * Apply: add --apply using Node 22 (the validated migration runtime).
 * The framework checkout must provide the routines CLI and its development dependencies.
 * This migration uses a fixed, reviewable source snapshot; it never contacts a runtime platform.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const BASE = '5247f323c5a1ed960c43dba0ed11acba7d0a8580';
const script = fileURLToPath(import.meta.url);
const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
if (args.includes('--help') || !value('--framework')) {
  console.log('node scripts/migrations/adopt-routines.mjs --framework /path/to/edges [--scope /path/to/brain] [--apply]');
  process.exit(args.includes('--help') ? 0 : 1);
}
const framework = path.resolve(value('--framework'));
const scope = path.resolve(value('--scope') ?? path.join(path.dirname(script), '../..'));
const apply = args.includes('--apply');
if (apply && Number(process.versions.node.split('.')[0]) !== 22) {
  throw new Error('Run --apply with Node 22; this migration validates NodeService import with that runtime.');
}
const loader = path.join(framework, 'packages/cli/node_modules/tsx/dist/loader.mjs');
if (process.env.EDGES_ROUTINES_MIGRATION_LOADER !== framework) {
  if (!fs.existsSync(loader)) throw new Error(`Missing framework development dependency: ${loader}`);
  const result = spawnSync(process.execPath, ['--import', loader, script, ...args], {
    stdio: 'inherit', env: { ...process.env, EDGES_ROUTINES_MIGRATION_LOADER: framework },
  });
  process.exit(result.status ?? 1);
}
const sourceModule = (name) => import(pathToFileURL(path.join(framework, 'packages/cli/src', name)).href);
const { NodeService } = await sourceModule('services/node/node-service.ts');
const { SkillNode, ReadmeNode, RoutineNode } = await sourceModule('domain/models/index.ts');
const { parseDocument } = await sourceModule('utils/markdown/document.ts');
if (!RoutineNode) throw new Error('The selected framework checkout does not provide RoutineNode.');
const absolute = (relative) => path.join(scope, relative);
const git = (...argv) => execFileSync('git', ['-C', scope, ...argv], { encoding: 'utf8' });
if (git('rev-parse', '--show-toplevel').trim() !== scope) throw new Error('--scope must be the brain repository root.');
const original = (relative) => git('show', `${BASE}:${relative}`);
const read = (relative) => fs.existsSync(absolute(relative)) ? fs.readFileSync(absolute(relative), 'utf8') : undefined;
const agentsBefore = read('AGENTS.md');
const changes = [];
const conflicts = [];
const plans = [];
function safePath(relative) {
  let current = scope;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) conflicts.push(`Symbolic link: ${current}`);
  }
}
function replace(source, before, after) {
  if (!source.includes(before)) throw new Error(`Missing expected source text: ${before}`);
  return source.replaceAll(before, after);
}
function plan(relative, desired, kind = 'document', baseline = original(relative)) {
  safePath(relative);
  const canonical = (text) => kind === 'skill' && text !== undefined
    ? new SkillNode(absolute(relative)).parse(text).serialize() : text;
  desired = canonical(desired);
  baseline = canonical(baseline);
  const current = read(relative);
  const bodyOnly = kind === 'memory' || kind === 'task';
  const equal = (a, b) => a !== undefined && (bodyOnly
    ? parseDocument(a).body.trim() === parseDocument(b).body.trim()
      && JSON.stringify({ ...parseDocument(a).metadata, metadata: undefined }) === JSON.stringify({ ...parseDocument(b).metadata, metadata: undefined })
    : canonical(a) === b);
  if (equal(current, desired)) return;
  if (!equal(current, baseline)) conflicts.push(`Changed since migration baseline: ${relative}`);
  else { plans.push({ relative, desired, kind }); changes.push(`update ${relative}`); }
}
const ordinary = ['daily-conversation-deposit', 'weekly-retrospective'];
const names = [...ordinary, 'grokbot-langfuse-export'];
const descriptions = {
  'daily-conversation-deposit': '每日 05:00 运行日复盘，调用每日沉淀扫描 Skill，候选与当日复盘经 PR 写入对应子仓。',
  'weekly-retrospective': '每周一 08:08 运行周复盘，调用周复盘 Skill，经 PR 写入公开脑 retrospectives/weekly。',
  'grokbot-langfuse-export': '每小时调用现有导出 Skill，把全部 Grok Bot 助手会话按真实时间写入 Langfuse。',
};
const routineBodies = new Map();
const skills = new Map();
const paths = (name) => ({ old: `projects/routines/${name}`, next: `.harness/routines/${name}` });
for (const name of names) {
  const { old, next } = paths(name);
  let body = original(`${old}/schedule.md`);
  if (!ordinary.includes(name)) {
    body = replace(body, '意图在同目录 [SKILL.md](SKILL.md)', `意图在现有导出目录 [SKILL.md](../../../${old}/SKILL.md)`);
    body = replace(body, '- skill: [SKILL.md](SKILL.md)', `- skill: [SKILL.md](../../../${old}/SKILL.md)`);
    body = body.replaceAll('](evaluations/', `](../../../${old}/evaluations/`);
  }
  body += `\n## 定义来源与运行入口\n\n仓库中的本入口是期望定义；外部平台负责实际调度与执行。\n\n- repository: [VirusPC/edges-brain-viruspc](https://github.com/VirusPC/edges-brain-viruspc)\n- entry: \`${next}/INDEX.md\`\n- ref: 默认读取仓库默认分支的最新版本；接入方明确指定的 branch、tag 或 commit 优先于默认值。\n\n平台每次运行前必须按所选 ref 重新读取本 \`INDEX.md\`，再读取这里引用的 Skill，依据本次读到的内容执行。默认分支或显式 branch/tag 应先解析为本次 commit，入口与 Skill 使用同一版本。所选 ref 不存在或任一文件读取失败就停止本次运行并报告来源、ref、路径与失败原因，不回退到默认分支，也不沿用以前保存的提示词。\n\n\`owner\` 只是原有作者标签，不表示平台账号、授权状态或运行状态。\n`;
  routineBodies.set(name, body);
  const desired = new RoutineNode(absolute(`${next}/INDEX.md`)).create({ name, description: descriptions[name], body }, { operation: 'create' }).serialize();
  const current = read(`${next}/INDEX.md`);
  safePath(`${next}/INDEX.md`);
  if (current === undefined) changes.push(`create ${next}/INDEX.md`);
  else if (current !== desired) conflicts.push(`Existing routine differs from planned definition: ${next}/INDEX.md`);
  const oldSchedule = read(`${old}/schedule.md`);
  safePath(`${old}/schedule.md`);
  if (oldSchedule !== undefined && oldSchedule !== original(`${old}/schedule.md`)) conflicts.push(`Schedule changed: ${old}/schedule.md`);
  if (!ordinary.includes(name)) {
    if (oldSchedule !== undefined) changes.push(`remove ${old}/schedule.md`);
    continue;
  }
  const baselineSkill = original(`${old}/SKILL.md`);
  const desiredSkill = new SkillNode(absolute(`${next}/SKILL.md`)).parse(replace(baselineSkill, '[schedule.md](schedule.md)', '[INDEX.md](INDEX.md)')).serialize();
  skills.set(name, desiredSkill);
  const oldSkill = read(`${old}/SKILL.md`);
  const newSkill = read(`${next}/SKILL.md`);
  if (oldSkill !== undefined && oldSkill !== baselineSkill) conflicts.push(`Skill changed: ${old}/SKILL.md`);
  if (oldSkill === undefined && newSkill === undefined) conflicts.push(`Missing both source and destination Skill: ${name}`);
  const normalizedSkill = new SkillNode(absolute(`${next}/SKILL.md`)).parse(baselineSkill).serialize();
  if (newSkill !== undefined && ![baselineSkill, normalizedSkill, desiredSkill].includes(newSkill)) conflicts.push(`Destination Skill conflict: ${next}/SKILL.md`);
  for (const directory of [old, next]) {
    safePath(directory);
    if (!fs.existsSync(absolute(directory))) continue;
    const allowed = directory === old ? ['SKILL.md', 'schedule.md'] : ['SKILL.md', 'schedule.md', 'INDEX.md'];
    for (const file of fs.readdirSync(absolute(directory))) if (!allowed.includes(file)) conflicts.push(`Unexpected migration resource: ${directory}/${file}`);
  }
  const copiedSchedule = read(`${next}/schedule.md`);
  if (copiedSchedule !== undefined && copiedSchedule !== original(`${old}/schedule.md`)) conflicts.push(`Copied schedule changed: ${next}/schedule.md`);
  if (oldSkill !== undefined) changes.push(`relocate ${old}/ -> ${next}/ (NodeService import + destroy)`);
  if (newSkill !== desiredSkill) changes.push(`update ${next}/SKILL.md schedule link`);
  if (copiedSchedule !== undefined || oldSchedule !== undefined) changes.push(`replace ${name}/schedule.md with INDEX.md`);
}

let researchReadme = original('projects/routines/README.md');
researchReadme = replace(researchReadme,
  'Routine 专项工作区：跨平台 routine 的形态调研，以及 skill 与日程怎么放。不定义跨厂商的统一类型。\n\n默认把日程和内容分开。打进同一份文件不再是首选。两种放法：一个目录里放极简日程文件，内容来自 Skill（日程引用 Skill）；或者一份 Skill 和它的日程文件放在同一目录。四种形态是业界分类，见调研笔记。定义不放进 `notes/`。',
  'Routine 调研与实现材料。现行例程定义统一登记在根 [.harness/routines/README.md](../../.harness/routines/README.md)，每条以 `INDEX.md` 记录日程并引用 Skill；外部平台每次运行重新读取定义与 Skill。平台日程字段保留各自表达，不定义跨厂商的统一日程类型。\n\n本目录保留跨平台调研，以及带代码、npm 依赖和 git submodule 的 Grok Bot 导出实现。日复盘、周复盘的 Skill 与定义已迁入 `.harness/routines/`。');
researchReadme = replace(researchReadme, '## 示例', '## 现行例程');
const examplesStart = researchReadme.indexOf('- [daily-conversation-deposit/');
const examplesEnd = researchReadme.indexOf('\n## 改名对照');
researchReadme = researchReadme.slice(0, examplesStart)
  + '- [日复盘](../../.harness/routines/daily-conversation-deposit/INDEX.md) — 每日沉淀扫描；定义引用同目录 Skill，产出经 PR 写入对应子仓。\n'
  + '- [周复盘](../../.harness/routines/weekly-retrospective/INDEX.md) — 回顾上一个自然周；结果写入 [`retrospectives/weekly/`](../../retrospectives/weekly/README.md)。\n'
  + '- [Grok Bot → Langfuse 导出](../../.harness/routines/grokbot-langfuse-export/INDEX.md) — 每小时导出全部助手会话；[Skill](grokbot-langfuse-export/SKILL.md) 与 [代码说明](grokbot-langfuse-export/README.md) 保留在现有实现目录。\n'
  + researchReadme.slice(examplesEnd);
plan('projects/routines/README.md', researchReadme);
for (const [period, name] of [['daily', ordinary[0]], ['weekly', ordinary[1]]]) {
  const relative = `retrospectives/${period}/README.md`;
  plan(relative, replace(original(relative), `../../projects/routines/${name}/SKILL.md`, `../../.harness/routines/${name}/INDEX.md`));
}
for (const filename of ['SKILL.md', 'README.md']) {
  const relative = `projects/routines/grokbot-langfuse-export/${filename}`;
  let desired = replace(original(relative), '[schedule.md](schedule.md)', '[Routine INDEX.md](../../../.harness/routines/grokbot-langfuse-export/INDEX.md)');
  if (filename === 'SKILL.md') desired = replace(desired, '运行频率见 schedule.md。', '运行频率见 .harness/routines/grokbot-langfuse-export/INDEX.md。');
  plan(relative, desired, filename === 'SKILL.md' ? 'skill' : 'document');
}
const evaluationGuide = 'projects/routines/grokbot-langfuse-export/evaluations/frequency-usage/README.md';
plan(evaluationGuide, replace(original(evaluationGuide), '[`schedule.md`](../../schedule.md)',
  '[Routine `INDEX.md`](../../../../../.harness/routines/grokbot-langfuse-export/INDEX.md)'));
const memory = '.harness/memory/projects/project_workspace_is_deposit_entry/INDEX.md';
let memoryText = original(memory);
for (const name of ordinary) memoryText = replace(memoryText, `projects/routines/${name}/SKILL.md`, `.harness/routines/${name}/SKILL.md`);
plan(memory, memoryText, 'memory');
const taskChanges = [
  ['2026-10-24--Grok-Bot-会话每小时写入-Langfuse', '`schedule.md`', '`.harness/routines/grokbot-langfuse-export/INDEX.md`'],
  ['2026-10-25--日复盘旁路接入-LangfuseCodexCursorGrok-主源仍用-ReadTranscript', 'projects/routines/daily-conversation-deposit/', '.harness/routines/daily-conversation-deposit/'],
  ['2026-10-25--收口周复盘-PR-370统一-READMEskill-文案后合入', 'projects/routines/weekly-retrospective/SKILL.md', '.harness/routines/weekly-retrospective/SKILL.md'],
];
for (const [stem, before, after] of taskChanges) {
  const relative = `.harness/tasks/_default/backlog/${stem}/INDEX.md`;
  plan(relative, replace(original(relative), before, after), 'task');
}
if (read('.harness/routines/README.md') === undefined) changes.unshift('initialize routines module and register .harness/routines/README.md');
if (conflicts.length) { console.error(JSON.stringify({ mode: apply ? 'apply' : 'preview', conflicts }, null, 2)); process.exit(1); }
console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', base: BASE, scope, changes, platformsChanged: false }, null, 2));
if (!apply || changes.length === 0) process.exit(0);

function cli(...argv) {
  const output = execFileSync(process.execPath, ['--import', loader, path.join(framework, 'packages/cli/src/index.ts'), '--scope', scope, ...argv], { cwd: framework, encoding: 'utf8', env: process.env });
  console.log(output.trim());
}
if (read('.harness/routines/README.md') === undefined) cli('routines', 'init');
for (const name of ordinary) {
  const { old, next } = paths(name);
  if (read(`${next}/SKILL.md`) === undefined) {
    // Bound discovery to the destination module so importing does not rewrite historical links.
    const service = new NodeService({ managedRoot: absolute('.harness/routines') });
    await service.import(absolute(`${old}/SKILL.md`), absolute(`${next}/SKILL.md`));
  }
  if (read(`${next}/SKILL.md`) !== skills.get(name)) {
    const service = new NodeService({ managedRoot: absolute('.harness/routines') });
    const skill = await service.get(absolute(`${next}/SKILL.md`), SkillNode);
    await service.update(skill, { body: parseDocument(skills.get(name)).body });
  }
  if (read(`${next}/schedule.md`) !== undefined) fs.unlinkSync(absolute(`${next}/schedule.md`));
  if (read(`${old}/SKILL.md`) !== undefined) {
    const service = new NodeService({ managedRoot: absolute('projects/routines') });
    await service.destroy(await service.get(absolute(`${old}/SKILL.md`), SkillNode));
  }
}
for (const name of names) {
  const { old, next } = paths(name);
  if (read(`${next}/INDEX.md`) === undefined) cli('routines', 'create', name, '--description', descriptions[name], '--body', routineBodies.get(name));
  if (!ordinary.includes(name) && read(`${old}/schedule.md`) !== undefined) fs.unlinkSync(absolute(`${old}/schedule.md`));
}
// Skills remain resources of their routine, not parallel entries in the routine index.
{
  const service = new NodeService({ managedRoot: absolute('.harness/routines') });
  const board = await service.get(absolute('.harness/routines/README.md'), ReadmeNode);
  const importedSkills = new Set(ordinary.map((name) => absolute(`${paths(name).next}/SKILL.md`)));
  const children = board.localChildren.filter((child) => !importedSkills.has(child.id));
  if (children.length !== board.localChildren.length) await service.update(board, { localChildren: children });
}
for (const item of plans) {
  if (item.kind === 'memory') {
    cli('memory', 'remember', '--type', 'project', '--slug', 'workspace_is_deposit_entry', '--content', parseDocument(item.desired).body);
  } else if (item.kind === 'task') {
    cli('tasks', 'update', item.relative, '--body', parseDocument(item.desired).body);
  } else {
    const service = new NodeService({ managedRoot: scope });
    const node = await service.get(absolute(item.relative));
    const desired = parseDocument(item.desired);
    await service.update(node, { body: desired.body, ...(item.kind === 'skill' ? { description: desired.metadata.description } : {}) });
  }
}
// Module init may normalize unrelated legacy material pointers. Keep this migration scoped.
if (agentsBefore !== undefined && read('AGENTS.md') !== agentsBefore) {
  const service = new NodeService({ managedRoot: scope });
  await service.update(await service.get(absolute('AGENTS.md')), { body: parseDocument(agentsBefore).body });
}
console.log('Applied. Run the same command again to verify changes: [].');
