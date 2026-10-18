import { dirname, join } from "node:path";
import { ENTRY_NAMES } from "../../config/layout.js";
import { AgentsNode } from "../agents/agents-node.js";
import type { NodeReference } from "../../core/types.js";

/** Runtime-only name segment; the entry never exists on disk. */
export const SUPER_ENTRY_DIR = ".super";

/**
 * Virtual AGENTS for `scopeDir`, created only by an explicit `--super`.
 * Composition is harness-materials README mounts (supplied by the caller)
 * treated as this virtual system's system two. Never parsed from or written to disk.
 */
export class SuperAgentsNode extends AgentsNode {
  readonly scopeDir: string;
  readonly #mounts: readonly NodeReference[];

  constructor(scopeDir: string, mounts: readonly NodeReference[] = []) {
    super(join(dirname(scopeDir), SUPER_ENTRY_DIR, ENTRY_NAMES.internal));
    this.scopeDir = scopeDir;
    this.#mounts = mounts.map((mount) => ({ ...mount }));
  }

  override get compose(): undefined {
    return undefined;
  }
  override get localChildren(): readonly Readonly<NodeReference>[] {
    return structuredClone([...this.#mounts]);
  }
  override get descendantChildren(): readonly Readonly<NodeReference>[] {
    return [];
  }
  override get children(): readonly Readonly<NodeReference>[] {
    return this.localChildren;
  }

  override validate(): void {}

  override serialize(): string {
    throw new Error("SuperAgentsNode is runtime-only and is never written to disk.");
  }
  protected override parseBody(): void {
    throw new Error("SuperAgentsNode is runtime-only and cannot be parsed.");
  }
  protected override serializeBody(): string {
    return "";
  }
  override addChild(): this {
    throw new Error("SuperAgentsNode composition is fixed at construction.");
  }
  override updateChild(): this {
    return this.addChild();
  }
  override removeChild(): this {
    return this.addChild();
  }
  override moveChild(): this {
    return this.addChild();
  }
  override setConstraints(): this {
    return this.addChild();
  }
}
