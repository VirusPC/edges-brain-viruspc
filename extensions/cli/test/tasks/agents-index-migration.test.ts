import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { AgentsNode } from "../../src/domain/models/agents/agents-node.js";
import { planAgentsIndexes, applyAgentsIndexes } from '../../../../scripts/migrate-agents-indexes.mts';
function fixture(t: { after(fn: () => void): void }, source: string) {
 const root=fs.mkdtempSync(path.join(fs.realpathSync(tmpdir()),'agents-migration-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const file=path.join(root,'AGENTS.md');fs.writeFileSync(file,source);return {root,file};
}
const legacy='<!-- task-projects:start -->\nCustom prose\n- [Project](project/AGENTS.md) — Description\n<!-- task-projects:end -->';
for(const nested of [false,true]) for(const crlf of [false,true]) test(`migration preserves prose and is idempotent nested=${nested} crlf=${crlf}`,async t=>{
 let source='# Board\n\n'+(nested?'<!-- project-memory-local:start -->\n':'')+legacy+(nested?'\n<!-- project-memory-local:end -->':'')+'\nTail\n';
 if(crlf) source=source.replaceAll('\n','\r\n');
 const {root,file}=fixture(t,source);const plan=planAgentsIndexes(root);
 assert.equal(fs.readFileSync(file,'utf8'),source);assert.equal(plan.edits.length,1);
 await applyAgentsIndexes(plan); const after=fs.readFileSync(file,'utf8');
 assert.match(after,/Custom prose/);assert.match(after,/Tail/);assert.doesNotMatch(after,/task-projects:/);
 const node=new AgentsNode(file).parse(after);assert.deepEqual(node.localChildren,[{id:path.join(root,'project/AGENTS.md'),name:'Project',description:'Description'}]);
 assert.equal(planAgentsIndexes(root).edits.length,0);if(crlf)assert.equal(after.replaceAll('\r\n','').includes('\n'),false);
});
test('migration rejects conflicts and source drift before writing',async t=>{
 const {root,file}=fixture(t,'# Board\n'+legacy+'\n');const plan=planAgentsIndexes(root);
 fs.appendFileSync(file,'drift\n');await assert.rejects(()=>applyAgentsIndexes(plan),/changed|modified|snapshot/i);
 fs.writeFileSync(file,'<!-- project-memory-children:start -->\n- [Project](project/AGENTS.md) — Description\n<!-- project-memory-children:end -->\n'+legacy);
 assert.throws(()=>planAgentsIndexes(root),/conflict/i);
});
for(const source of ['<!-- task-projects:start -->',legacy+'\n'+legacy,'<!-- task-projects:end -->\n<!-- task-projects:start -->']) test('migration rejects malformed markers '+source.length,t=>{
 const {root}=fixture(t,source);assert.throws(()=>planAgentsIndexes(root),/marker/i);
});
test('migration deduplicates matching identities and preserves unrelated links',async t=>{
 const source='<!-- project-memory-local:start -->\n- [Other](other/AGENTS.md) — Keep\n- [Project](project/AGENTS.md) — Description\n<!-- project-memory-local:end -->\n'+legacy.replace('<!-- task-projects:end -->','- [Project](<project/AGENTS.md>) — Description\n<!-- task-projects:end -->');
 const {root,file}=fixture(t,source);await applyAgentsIndexes(planAgentsIndexes(root));
 const node=new AgentsNode(file).parse(fs.readFileSync(file,'utf8'));
 assert.equal(node.children.length,2);assert.equal(node.children[0].name,'Other');
});
test('migration honors the shared write lock before any backup or document writes',async t=>{
 const {root,file}=fixture(t,legacy);const plan=planAgentsIndexes(root);
 const {acquireWriteLock}=await import('../../src/services/node/node-lock.js');const release=await acquireWriteLock(root);
 try {await assert.rejects(async()=>applyAgentsIndexes(plan),/write lock busy/);assert.equal(fs.readFileSync(file,'utf8'),legacy);}
 finally {await release();}
});

for (const gitForm of ['directory', 'file'] as const) test('migration skips nested Git boundary with ' + gitForm + ' marker', async t => {
 const { root, file } = fixture(t, legacy);
 const nested = path.join(root, 'nested'); fs.mkdirSync(nested);
 if (gitForm === 'directory') fs.mkdirSync(path.join(nested, '.git'));
 else fs.writeFileSync(path.join(nested, '.git'), 'gitdir: ../external-git\n');
 const nestedFile = path.join(nested, 'AGENTS.md'); fs.writeFileSync(nestedFile, legacy);
 const plan = planAgentsIndexes(root);
 assert.deepEqual(plan.edits.map(edit => edit.path), [file]);
 await applyAgentsIndexes(plan);
 assert.equal(fs.readFileSync(nestedFile, 'utf8'), legacy);
});
