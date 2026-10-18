import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BaseNode, AgentsNode, LeafNode } from '../../src/domain/models/index.js';
import { traverse } from '../../src/domain/operations/traverse.js';
import { setNodeRelations } from "../../src/domain/core/relations.js";
import type { NodeQueryOptions } from "../../src/domain/operations/traverse.js";
const leaf = (name: string) => new LeafNode(`/root/${name}/index.md`);
const scope = (name: string, local: BaseNode[] = [], descendants: BaseNode[] = []) =>
  new AgentsNode(`/root/${name}/AGENTS.md`).create({ localChildren: local.map(n => ({ id: n.id })), descendantChildren: descendants.map(n => ({ id: n.id })) }, { operation: 'create' });
function graph(nodes: BaseNode[]) {
  const entries = new Map(nodes.map(n => [n.id, n]));
  const loads: string[] = [];
  const run = (roots: BaseNode | Iterable<BaseNode>, options: NodeQueryOptions = {}) => traverse(roots, options, (_p, ref) => entries.has(ref.id) ? ref.id : undefined, async (_p, _r, id) => { loads.push(id); return entries.get(id)!; });
  return { run, loads };
}
async function collect(source: AsyncIterable<BaseNode>) { const result: BaseNode[] = []; for await (const n of source) result.push(n); return result; }
test('multiple roots share traversal identity and load on demand', async () => {
  const item = leaf('item'), root = scope('root', [item]);
  const {run, loads} = graph([root, item]);
  const pending = run([root, item]);
  assert.deepEqual(loads, []);
  const result = await collect(pending);
  assert.deepEqual(result, [root, item]);
  assert.strictEqual(result[0], root); assert.strictEqual(result[1], item);
  assert.deepEqual(loads, [item.id]);
});
test('single-root preorder defaults to all children; localOnly narrows; harness is opt-in', async () => {
  const a = leaf('a'), b = leaf('b'), maintenance = scope('maintenance');
  const child = scope('child', [a]), root = scope('root', [child], [b]);
  setNodeRelations(root, { harness: { id: maintenance.id } });
  const {run} = graph([root, child, a, b, maintenance]);
  assert.deepEqual(await collect(run(root)), [root, child, a, b]);
  assert.deepEqual(await collect(run(root, {localOnly: true})), [root, child, a]);
  assert.deepEqual(await collect(run(root, {localOnly: true})), [root, child, a]);
  assert.deepEqual(await collect(run(root, {includeHarness: true})), [root, child, a, b, maintenance]);
  assert.deepEqual(await collect(run(root, {localOnly: true, includeHarness: true})), [root, child, a, maintenance]);
});
test('diamond references and overlapping roots load each target once', async () => {
  const item = leaf('item'), a = scope('a', [item]), b = scope('b', [item]), root = scope('root', [a, b]);
  const {run, loads} = graph([root, a, b, item]);
  assert.deepEqual(await collect(run([root, b, item])), [root, a, item, b]);
  assert.deepEqual(loads, [a.id, item.id, b.id]);
});
test('cycles across roots reject', async () => {
  const a = scope('a'), b = scope('b', [a]); a.addChild('local', {id: b.id});
  await assert.rejects(collect(graph([a,b]).run([a,b])), /Composition cycle/);
});
test('type filtering keeps navigation through unmatched parents', async () => {
  const item = leaf('item'), root = scope('root', [scope('nested', [item])]);
  const nested = scope('nested', [item]);
  assert.deepEqual(await collect(graph([root,nested,item]).run(root,{types:[item.type]})), [item]);
});
test('resolve can skip targets and load errors propagate', async () => {
  const item = leaf('item'), root = scope('root',[item]);
  assert.deepEqual(await collect(traverse(root, {}, () => undefined, async () => {throw new Error('unexpected');})), [root]);
  await assert.rejects(collect(traverse(root, {}, (_p,r) => r.id, async () => {throw new Error('load failed');})), /load failed/);
});
test('breaking after the root performs no child load', async () => {
  const item = leaf('item'), root = scope('root',[item]); const {run,loads} = graph([root,item]);
  for await (const node of run(root)) { assert.strictEqual(node,root); break; }
  assert.deepEqual(loads,[]);
});
test('resolve validates repeated references before seen-target deduplication', async () => {
  const item = leaf('item'), a = scope('a',[item]), b = scope('b',[item]);
  await assert.rejects(collect(traverse([a,b],{}, (parent,ref) => {if(parent === b) throw new Error('removed reference'); return ref.id;}, async () => item)), /removed reference/);
});
test('localOnly narrows by composition presence, not by AgentsNode class', async () => {
  class Composite extends BaseNode {
    readonly #local: BaseNode[]; readonly #desc: BaseNode[];
    constructor(path: string, local: BaseNode[] = [], desc: BaseNode[] = []) { super(path); this.#local = local; this.#desc = desc; }
    override get localChildren() { return this.#local.map(n => ({ id: n.id })); }
    override get descendantChildren() { return this.#desc.map(n => ({ id: n.id })); }
    override get children() { return [...this.localChildren, ...this.descendantChildren]; }
  }
  const a = leaf('a'), b = leaf('b'), root = new Composite('/root/c/README.md', [a], [b]);
  const {run} = graph([root, a, b]);
  assert.deepEqual(await collect(run(root)), [root, a, b]);
  assert.deepEqual(await collect(run(root, {localOnly: true})), [root, a]);
});
