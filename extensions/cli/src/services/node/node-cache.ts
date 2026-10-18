import { isWithinPath } from '../../utils/filesystem.js';
/** Loaded instance identity and optimistic snapshots. Not a public domain API. */
import * as fs from "node:fs";
import { BaseNode } from "../../domain/models/index.js";
import { harnessPath } from "../../domain/models/node/layout.js";
import { setNodeRelations, setNodePath } from "../../domain/core/relations.js";
import { readEntry, validateEntry, type EntryFile } from "./node-files.js";
import { resourceSnapshot, type ResourceSnapshot } from "./node-resources.js";
import { physicalParent } from "./node-layout.js";
interface Loaded {
  file: EntryFile;
  readOnly: boolean;
  resources?: ResourceSnapshot;
}
export class NodeCache {
  readonly loaded = new Map<string, BaseNode>();
  readonly state = new WeakMap<BaseNode, Loaded>();
  readonly readOnly = new Set<string>();
  constructor(readonly managedRoot: string) {}
  isReadOnly(file: string): boolean {
    return [...this.readOnly].some((root) => isWithinPath(file, root));
  }
  markReadOnly(node: BaseNode): void {
    const state = this.state.get(node)!;
    state.readOnly = true;
    this.readOnly.add(node.directoryPath);
    this.readOnly.add(state.file.realDirectory);
  }
  relations(node: BaseNode): void {
    const parent = physicalParent(node.path, this.managedRoot),
      harness = harnessPath(node.path);
    setNodeRelations(node, {
      parent: parent ? { id: parent } : undefined,
      harness: fs.existsSync(harness) ? { id: harness } : undefined,
    });
  }
  remember(node: BaseNode, file: EntryFile, readOnly = false, captureResources = true): void {
    const current = this.loaded.get(node.path);
    if (current && current !== node)
      throw new Error(`Node already managed: ${node.path}`);
    let resources: ResourceSnapshot | undefined;
    if (captureResources && node.directoryPath !== this.managedRoot && !readOnly) {
      // Preserve the entry snapshot retained by traversal; a fresh read must not
      // silently bless an edit that happened before resource capture.
      validateEntry(file);
      resources = resourceSnapshot(node.directoryPath);
      validateEntry(file);
    }
    this.state.set(node, { file, readOnly, resources });
    if (readOnly) this.markReadOnly(node);
    this.loaded.set(node.path, node);
    this.relations(node);
  }
  /** Upgrade a materialized query result while retaining its entry identity. */
  captureResources(node: BaseNode): void {
    const state = this.state.get(node);
    if (!state || state.resources || state.readOnly || node.directoryPath === this.managedRoot) return;
    this.remember(node, state.file, state.readOnly);
  }
  refresh(
    relocate: (file: string) => string = (file) => file,
    removed: (file: string) => boolean = () => false,
    changed: ReadonlySet<string> = new Set(),
  ): void {
    const instances = [...this.loaded.values()];
    this.loaded.clear();
    for (const node of instances) {
      const old = node.path,
        state = this.state.get(node)!;
      if (removed(old)) {
        this.state.delete(node);
        setNodeRelations(node, {});
        continue;
      }
      const file = relocate(old);
      if (file === old && !changed.has(file)) {
        this.loaded.set(file, node);
        this.relations(node);
        if (
          state.resources &&
          [...changed].some((target) => isWithinPath(target, node.directoryPath))
        )
          state.resources = resourceSnapshot(node.directoryPath);
        continue;
      }
      const entry = readEntry(file, state.readOnly);
      if (!entry) {
        this.state.delete(node);
        setNodeRelations(node, {});
        continue;
      }
      setNodePath(node, file);
      node.parse(entry.source);
      this.remember(node, entry, state.readOnly);
    }
  }
}
