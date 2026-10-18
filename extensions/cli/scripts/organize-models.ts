/** One-shot source migration. Preview by default; --apply writes after preflight. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const prefix = 'extensions/cli/src/';
const models = prefix + 'domain/models/';
const operations = prefix + 'domain/operations/';
const markdown = prefix + 'utils/markdown/';
const moves = new Map<string, string>([
  ...['base-node', 'leaf-node', 'fields', 'relations'].map(name => [models + name + '.ts', models + 'core/' + name + '.ts'] as [string, string]),
  [models + 'internal-node.ts', models + 'agents/agents-node.ts'],
  ...Object.entries({ task: 'tasks', memory: 'memory', note: 'notes', skill: 'skills' }).map(([name, dir]) => [models + name + '-node.ts', models + dir + '/' + name + '-node.ts'] as [string, string]),
  [models + 'internal-syntax.ts', models + 'agents/syntax.ts'],
  [models + 'internal/model.ts', models + 'agents/document.ts'],
]);
const removed = [models + 'types.ts', models + 'internal/typed.ts', models + 'internal/index.ts'];
const oldPaths = [...moves.keys(), ...removed];
const present = oldPaths.filter(path => existsSync(resolve(root, path)));
if (!present.length) {
  const missing = [...moves.values(), models + 'core/types.ts', operations + 'tasks.ts'].filter(path => !existsSync(resolve(root, path)));
  if (missing.length) throw new Error('Incomplete migration: ' + missing.join(', '));
  console.log('Already organized; 0 changes.');
  process.exit(0);
}
if (present.length !== oldPaths.length) throw new Error('Partial migration: restore the source snapshot before retrying.');
for (const target of [...moves.values(), models + 'core/types.ts', operations + 'tasks.ts']) {
  if (existsSync(resolve(root, target))) throw new Error('Destination exists: ' + target);
}
const ownPath = relative(root, fileURLToPath(import.meta.url));
const files = execFileSync('git', ['ls-files', '-z', '--', '*.ts', '*.tsx', '*.mts', '*.mjs', '*.js'], { cwd: root, encoding: 'utf8' })
  .split('\0').filter(path => path && path !== ownPath && !path.startsWith('posts/'));
const original = new Map(files.map(path => [path, readFileSync(resolve(root, path), 'utf8')]));
const contents = new Map(original);
const read = (path: string) => {
  const source = contents.get(path);
  if (source === undefined) throw new Error('Missing source: ' + path);
  return source;
};
const ast = (path: string, source: string) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
function declarations(path: string, names: readonly string[], remove = false): string {
  const source = read(path), tree = ast(path, source);
  const selected = tree.statements.filter(statement => 'name' in statement && statement.name && ts.isIdentifier(statement.name as ts.Node) && names.includes((statement.name as ts.Identifier).text));
  if (selected.length !== names.length) throw new Error('Declaration mismatch: ' + path + ' ' + names.join(', '));
  if (remove) {
    let result = source;
    for (const statement of [...selected].reverse()) result = result.slice(0, statement.getStart(tree)) + result.slice(statement.end);
    contents.set(path, result);
  }
  return selected.map(statement => statement.getText(tree)).join('\n\n') + '\n';
}
function append(path: string, source: string) { contents.set(path, read(path).trimEnd() + '\n\n' + source); }
function replace(path: string, from: string, to: string) {
  const source = read(path);
  if (!source.includes(from)) throw new Error('Missing edit anchor: ' + path + ' ' + from);
  contents.set(path, source.replace(from, to));
}

const sharedTypes = ['Metadata', 'ChildGroup', 'NodeReference', 'NodeCreateInput', 'NodeUpdateInput', 'NodeContext'];
contents.set(models + 'core/types.ts', declarations(models + 'types.ts', sharedTypes));
append(models + 'internal-node.ts', declarations(models + 'types.ts', ['InternalCreateInput', 'InternalUpdateInput', 'InternalContent']));
append(models + 'internal-node.ts', 'import type { NodeCreateInput } from "./types.js";\n');
replace(models + 'internal-node.ts', 'type Content = {\n  constraints: string[];\n  localChildren: NodeReference[];\n  descendantChildren: NodeReference[];\n};', 'type Content = {\n  -readonly [Key in keyof InternalContent]: Array<InternalContent[Key][number]>;\n};');
append(models + 'tasks/types.ts', declarations(models + 'types.ts', ['TaskCreateInput', 'TaskUpdateInput']));
append(models + 'tasks/types.ts', 'import type { NodeCreateInput } from "../types.js";\n');
declarations(models + 'tasks/types.ts', ['TasksOutput'], true);
append(models + 'memory-node.ts', declarations(models + 'types.ts', ['MemoryCreateInput', 'MemoryUpdateInput']));
append(models + 'memory-node.ts', 'import type { NodeCreateInput } from "./types.js";\n');
append(operations + 'traverse.ts', declarations(models + 'types.ts', ['ScopeTraversalOptions', 'NodeQueryOptions']));
append(markdown + 'document.ts', declarations(models + 'internal/typed.ts', ['createMarkdownCodec']));
append(markdown + 'document.ts', "export const baseDocumentCodec = createMarkdownCodec('base');\n");
replace(markdown + 'document.ts', 'import type { MarkdownDocument }', 'import type { DocumentCodec, MarkdownDocument }');
append(models + 'memory/documents.ts', "import { createMarkdownCodec } from '../../../utils/markdown/document.js';\n\nexport const memoryDocumentCodec = createMarkdownCodec('memory');\n");
append(models + 'internal/model.ts', "import type { DocumentCodec } from '../../../utils/markdown/types.js';\nimport { parseNode } from './parse.js';\nimport { serializeNode } from './serialize.js';\n\nexport const agentsDocumentCodec: DocumentCodec<AgentsDocument, 'agents'> = {\n  type: 'agents',\n  parse: parseNode,\n  serialize: serializeNode,\n};\n");
replace(models + 'internal/parse.ts', 'import { createNodeModel } from "./model.js";\n', '');
replace(models + 'internal/parse.ts', 'const model = createNodeModel();', 'const model: AgentsDocument = { constraints: [], memory: [], children: [], references: [] };');
contents.set(operations + 'tasks.ts', "import { compareTaskPriority } from '../models/tasks/priority.js';\nimport type { TaskPriority, TaskProjectId } from '../models/tasks/types.js';\n\n" +
  declarations(models + 'tasks/priority.ts', ['filterTasksByPriority', 'sortTasksByPriority'], true) + '\n' +
  declarations(models + 'tasks/project.ts', ['filterTasksByProject'], true));
contents.set(models + 'index.ts', [
  'export { BaseNode } from "./core/base-node.js";',
  'export { LeafNode } from "./core/leaf-node.js";',
  'export { TaskNode } from "./tasks/task-node.js";',
  'export { MemoryNode } from "./memory/memory-node.js";',
  'export { NoteNode } from "./notes/note-node.js";',
  'export { SkillNode } from "./skills/skill-node.js";',
  'export { InternalNode } from "./agents/agents-node.js";',
  'export type * from "./core/types.js";',
  'export type { TaskCreateInput, TaskUpdateInput, TaskStatus, TaskPriority } from "./tasks/types.js";',
  'export type { MemoryCreateInput, MemoryUpdateInput } from "./memory/memory-node.js";',
  'export type { InternalCreateInput, InternalUpdateInput, InternalContent } from "./agents/agents-node.js";',
  'export * from "./layout.js";',
  '',
].join('\n'));

const renames = new Map(Object.entries({ NodeModel: 'AgentsDocument', createNodeModel: 'createAgentsDocument', NodeItem: 'AgentsItem', NodeLink: 'AgentsLink', NodeText: 'AgentsText', nodeLinks: 'agentsLinks' }));
const typeOwners = new Map<string, string>([
  ...sharedTypes.map(name => [name, models + 'core/types.ts'] as [string, string]),
  ...['InternalCreateInput', 'InternalUpdateInput', 'InternalContent'].map(name => [name, models + 'agents/agents-node.ts'] as [string, string]),
  ...['TaskCreateInput', 'TaskUpdateInput', 'TaskStatus', 'TaskPriority'].map(name => [name, models + 'tasks/types.ts'] as [string, string]),
  ...['MemoryCreateInput', 'MemoryUpdateInput'].map(name => [name, models + 'memory/memory-node.ts'] as [string, string]),
  ...['ScopeTraversalOptions', 'NodeQueryOptions'].map(name => [name, operations + 'traverse.ts'] as [string, string]),
]);
const codecOwners: Record<string, string> = {
  parseNode: models + 'agents/parse.ts', serializeNode: models + 'agents/serialize.ts',
  agentsDocumentCodec: models + 'agents/document.ts', memoryDocumentCodec: models + 'memory/documents.ts',
  parseDocument: markdown + 'document.ts', serializeDocument: markdown + 'document.ts', createMarkdownCodec: markdown + 'document.ts', baseDocumentCodec: markdown + 'document.ts',
  DocumentType: markdown + 'types.ts', DocumentCodec: markdown + 'types.ts', DocumentReference: markdown + 'types.ts', MarkdownDocument: markdown + 'types.ts',
};
function owner(module: string, name: string): string {
  if (module === models + 'types.ts') {
    const target = typeOwners.get(name);
    if (!target) throw new Error('Unknown shared type: ' + name);
    return target;
  }
  if (module === models + 'index.ts' && ['ScopeTraversalOptions', 'NodeQueryOptions'].includes(name)) return operations + 'traverse.ts';
  if ([models + 'internal/index.ts', models + 'internal/typed.ts'].includes(module)) {
    if (!codecOwners[name]) throw new Error('Unknown codec export: ' + name);
    return codecOwners[name]!;
  }
  if ([models + 'tasks/priority.ts', models + 'tasks/project.ts'].includes(module) && ['filterTasksByPriority', 'sortTasksByPriority', 'filterTasksByProject'].includes(name)) return operations + 'tasks.ts';
  return moves.get(module) ?? module;
}
const modulePath = (file: string, specifier: string) => relative(root, resolve(root, dirname(file), specifier)).replace(/\.js$/, '.ts');
const importPath = (file: string, target: string) => {
  const path = relative(dirname(file), target).replace(/\.ts$/, '.js');
  return path.startsWith('.') ? path : './' + path;
};
type Edit = { start: number; end: number; text: string };
const output = new Map<string, string>();
for (const [file, source] of contents) {
  if (removed.includes(file)) continue;
  const target = moves.get(file) ?? file, tree = ast(file, source), edits: Edit[] = [];
  const add = (node: ts.Node, text: string) => edits.push({ start: node.getStart(tree), end: node.end, text });
  // Only the AGENTS document declaration and its direct consumers own these names.
  const documentConsumer = file === models + 'internal/model.ts' || tree.statements.some(node =>
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier) && modulePath(file, node.moduleSpecifier.text) === models + 'internal/model.ts');
  const renamed = (name: string) => documentConsumer ? renames.get(name) ?? name : name;
  const namespaces = new Set<string>();
  for (const statement of tree.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.importClause?.namedBindings && ts.isNamespaceImport(statement.importClause.namedBindings) && modulePath(file, statement.moduleSpecifier.text) === models + 'internal/index.ts') {
      namespaces.add(statement.importClause.namedBindings.name.text);
    }
  }
  function visit(node: ts.Node): void {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.startsWith('.')) {
      const module = modulePath(file, node.moduleSpecifier.text);
      const bindings = ts.isImportDeclaration(node) ? node.importClause?.namedBindings : node.exportClause;
      const isTypeOnly = ts.isImportDeclaration(node) ? node.importClause?.isTypeOnly : node.isTypeOnly;
      const isNamespace = bindings && ts.isNamespaceImport(bindings) && namespaces.has(bindings.name.text);
      if (bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings) || isNamespace)) {
        const groups = new Map<string, string[]>();
        const elements = isNamespace ? [...new Set(Array.from(source.matchAll(new RegExp('\\b' + (bindings as ts.NamespaceImport).name.text + '\\.([A-Za-z_$][\\w$]*)', 'g')), match => match[1]!))].map(name => ({ imported: name, local: name, typeOnly: false }))
          : (bindings as ts.NamedImports | ts.NamedExports).elements.map(element => ({ imported: element.propertyName?.text ?? element.name.text, local: element.name.text, typeOnly: element.isTypeOnly }));
        for (const element of elements) {
          const destination = owner(module, element.imported);
          if (destination === target && ts.isImportDeclaration(node)) continue;
          const imported = renamed(element.imported), local = renamed(element.local);
          const item = (element.typeOnly ? 'type ' : '') + imported + (local !== imported ? ' as ' + local : '');
          groups.set(destination, [...groups.get(destination) ?? [], item]);
        }
        const lines = [...groups].map(([destination, names]) => `${ts.isImportDeclaration(node) ? 'import' : 'export'}${isTypeOnly ? ' type' : ''} { ${names.join(', ')} } from ${JSON.stringify(importPath(target, destination))};`);
        // Preserve untouched declarations to keep the mechanical diff readable.
        if (groups.size !== 1 || [...groups.keys()][0] !== module || target !== file || elements.some(element => renamed(element.imported) !== element.imported) || isNamespace) add(node, lines.join('\n'));
      } else {
        const destination = moves.get(module) ?? module;
        if (removed.includes(module)) throw new Error('Unsupported aggregate import: ' + file);
        const path = importPath(target, destination);
        if (path !== node.moduleSpecifier.text) add(node.moduleSpecifier, JSON.stringify(path));
      }
      return;
    }
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal) && node.argument.literal.text.startsWith('.')) {
      const module = modulePath(file, node.argument.literal.text), name = node.qualifier?.getText(tree) ?? '';
      const destination = owner(module, name);
      if (target !== file || destination !== module) add(node.argument.literal, JSON.stringify(importPath(target, destination)));
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text.startsWith('.')) {
      const module = modulePath(file, node.arguments[0].text);
      if (removed.includes(module)) throw new Error('Unsupported dynamic aggregate import: ' + file);
      const destination = moves.get(module) ?? module;
      if (target !== file || destination !== module) add(node.arguments[0], JSON.stringify(importPath(target, destination)));
    } else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && namespaces.has(node.expression.text)) {
      add(node, node.name.text);
      return;
    } else if (ts.isIdentifier(node) && renamed(node.text) !== node.text) {
      add(node, renamed(node.text));
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  output.set(target, result);
}
const changed = [...output].filter(([path, source]) => original.get(path) !== source);
console.log(JSON.stringify({ moves: Object.fromEntries(moves), removed, writes: changed.map(([path]) => path) }, null, 2));
if (process.argv.includes('--apply')) {
  // All discovery, declaration and destination checks completed before any writes.
  for (const [path, source] of changed) {
    mkdirSync(dirname(resolve(root, path)), { recursive: true });
    writeFileSync(resolve(root, path), source);
  }
  for (const path of oldPaths) unlinkSync(resolve(root, path));
  console.log('Applied model organization.');
}
