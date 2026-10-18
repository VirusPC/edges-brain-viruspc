import { homedir } from "node:os";
import path from "node:path";
import { BaseNode } from "../../core/base-node.js";
import type { ChildGroup, NodeReference } from "../../core/types.js";
import { validateChild } from "../../core/relations.js";
import {
  COMPOSE_ENTRY_DIR,
  COMPOSED_CHECKOUT_ROOT,
  ENTRY_NAMES,
} from "../../config/layout.js";

const REMOTE = /(?:^|\s)remote:\s*(\S+)/;

export interface ComposeEntry {
  directory: string;
  id: string;
  href: string;
  name: string;
  description?: string;
  remote?: string;
}

export interface ComposeCheckout {
  name: string;
  directory: string;
  remote?: string;
}

export interface ComposeChildInput {
  name: string;
  directory?: string;
  href?: string;
  description?: string;
  remote?: string;
}

export interface ComposeLink {
  target: string;
  label?: string;
  description?: string;
}

interface ComposeItem {
  directory: string;
  href: string;
  name: string;
  description?: string;
  remote?: string;
  authored?: string;
}

export function composeEntryPath(ownerPath: string): string {
  return path.join(path.dirname(ownerPath), COMPOSE_ENTRY_DIR, ENTRY_NAMES.readme);
}

function readComposeSuffix(suffix: string | undefined): { description?: string; remote?: string } {
  if (!suffix) return {};
  const match = REMOTE.exec(suffix);
  if (!match || match[1] === undefined) return { description: suffix };
  const remote = match[1];
  const text = `${suffix.slice(0, match.index)} ${suffix.slice(match.index + match[0].length)}`
    .replace(/\s+/g, " ")
    .trim();
  return { remote, ...(text ? { description: text } : {}) };
}

function sameComposeSuffix(authored: string, description?: string, remote?: string): boolean {
  const parsed = readComposeSuffix(authored);
  return parsed.description === description && parsed.remote === remote;
}

function writeComposeSuffix(description?: string, remote?: string): string | undefined {
  const text = description?.trim();
  const url = remote?.trim();
  if (text && url) return `${text} remote: ${url}`;
  if (url) return `remote: ${url}`;
  return text || undefined;
}

function expandHome(href: string): string {
  if (href === "~") return homedir();
  if (href.startsWith("~/")) return path.join(homedir(), href.slice(2));
  return href;
}

function resolveDirectory(ownerPath: string, href: string): string {
  const value = expandHome(href.trim());
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("#") || value.startsWith("//"))
    throw new Error(`${ownerPath}: compose entry must be a local directory: ${href}`);
  const pathname = value.split(/[?#]/, 1)[0] ?? "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new Error(`${ownerPath}: invalid encoded compose path ${href}`);
  }
  if (!decoded) throw new Error(`${ownerPath}: compose entry path is empty`);
  return path.resolve(path.dirname(ownerPath), decoded);
}

function agentsPath(directory: string): string {
  return path.resolve(directory, ENTRY_NAMES.internal);
}

function singleDirectoryName(name: string): boolean {
  return name !== "." && name !== ".." && !name.includes("/") && !name.includes("\\");
}

/**
 * Virtual index of composed repositories. The id is `<owner dir>/.compose/README.md`.
 * The block stays on the owning AGENTS.md; this node is never its own file.
 */
export class ComposeNode extends BaseNode {
  // #region Identity and path
  override readonly type = "compose";
  #ownerPath: () => string;

  constructor(ownerPath: string) {
    super(composeEntryPath(ownerPath));
    this.#ownerPath = () => ownerPath;
  }

  /** Follow the owning AGENTS.md after `setNodePath`. */
  track(ownerPath: () => string): void {
    this.#ownerPath = ownerPath;
  }

  override get path(): string {
    return composeEntryPath(this.#ownerPath());
  }
  // #endregion

  // #region Entries
  #items: ComposeItem[] = [];

  entries(): ComposeEntry[] {
    return this.#items.map((item) => ({
      directory: item.directory,
      id: agentsPath(item.directory),
      href: item.href,
      name: item.name,
      ...(item.description === undefined ? {} : { description: item.description }),
      ...(item.remote === undefined ? {} : { remote: item.remote }),
    }));
  }

  override get localChildren(): readonly Readonly<{ id: string; name?: string; description?: string }>[] {
    return this.children;
  }
  override get descendantChildren(): readonly Readonly<{ id: string; name?: string; description?: string }>[] {
    return [];
  }
  override get children(): readonly Readonly<{ id: string; name?: string; description?: string }>[] {
    return this.#items.map((item) => ({
      id: agentsPath(item.directory),
      name: item.name,
      ...(item.description === undefined ? {} : { description: item.description }),
    }));
  }
  // #endregion

  // #region Mutations
  override addChild(input: ComposeChildInput | ChildGroup, _reference?: NodeReference): this {
    if (typeof input === "string")
      throw new Error(`${this.path}: compose entry takes { name, directory?, description?, remote?, href? }`);
    const name = input.name.trim();
    if (!name) throw new Error(`${this.#ownerPath()}: compose entry name is required`);
    const located = this.#locate(name, input.directory ?? input.href);
    const description = input.description?.trim() || undefined;
    const remote = input.remote?.trim() || undefined;
    const next = this.#items.filter((item) => item.name !== name);
    next.push({ ...located, name, description, remote });
    this.#validate(next);
    this.#items = next;
    return this;
  }

  removeChild(id: string): this {
    const next = this.#items.filter((item) => agentsPath(item.directory) !== id);
    if (next.length === this.#items.length)
      throw new Error(`${this.#ownerPath()}: compose entry not found: ${id}`);
    this.#items = next;
    return this;
  }

  updateChild(id: string, patch: { name?: string; description?: string; remote?: string }): this {
    const index = this.#items.findIndex((item) => agentsPath(item.directory) === id);
    const current = index < 0 ? undefined : this.#items[index];
    if (!current) throw new Error(`${this.#ownerPath()}: compose entry not found: ${id}`);
    const name = patch.name === undefined ? current.name : patch.name.trim();
    if (!name) throw new Error(`${this.#ownerPath()}: compose entry name is required`);
    const description = patch.description === undefined ? current.description : patch.description.trim() || undefined;
    const remote = patch.remote === undefined ? current.remote : patch.remote.trim() || undefined;
    const next = this.#items.map((item, at) => at === index ? { ...item, name, description, remote, authored: undefined } : item);
    this.#validate(next);
    this.#items = next;
    return this;
  }
  // #endregion

  // #region Checkout
  checkout(name: string): ComposeCheckout {
    const item = this.#items.find((entry) => entry.name === name);
    if (!item) throw new Error(`${this.#ownerPath()}: compose entry not found: ${name}`);
    return {
      name: item.name,
      directory: item.directory,
      ...(item.remote === undefined ? {} : { remote: item.remote }),
    };
  }
  // #endregion

  // #region Block links
  loadLinks(entries: readonly ComposeLink[]): void {
    const next = entries.map((entry) => this.#fromLink(entry));
    this.#validate(next);
    this.#items = next;
  }

  links(): ComposeLink[] {
    return this.#items.map((item) => {
      const unchanged = item.authored !== undefined && sameComposeSuffix(item.authored, item.description, item.remote);
      const description = unchanged ? item.authored : writeComposeSuffix(item.description, item.remote);
      return {
        target: item.href,
        label: item.name,
        ...(description === undefined ? {} : { description }),
      };
    });
  }
  // #endregion

  // #region Parse and serialize
  override parse(_markdown: string): this {
    throw new Error("ComposeNode is runtime-only and cannot be parsed.");
  }
  override serialize(): string {
    throw new Error("ComposeNode is runtime-only and is never written to disk.");
  }
  // #endregion

  #locate(name: string, raw: string | undefined): { directory: string; href: string } {
    const owner = this.#ownerPath();
    if (raw === undefined) {
      if (!singleDirectoryName(name))
        throw new Error(`${owner}: compose entry name must be a single directory name: ${name}`);
      const href = `${COMPOSED_CHECKOUT_ROOT}/${name}`;
      return { href, directory: resolveDirectory(owner, href) };
    }
    const trimmed = raw.trim();
    const directory = resolveDirectory(owner, trimmed);
    const href = trimmed === "~" || trimmed.startsWith("~/") ? trimmed : directory;
    return { directory, href };
  }

  #fromLink(entry: ComposeLink): ComposeItem {
    const owner = this.#ownerPath();
    const name = entry.label?.trim() ?? "";
    if (!name) throw new Error(`${owner}: compose entry name is required`);
    const href = entry.target;
    const fields = readComposeSuffix(entry.description);
    return {
      directory: resolveDirectory(owner, href),
      href,
      name,
      authored: entry.description,
      ...fields,
    };
  }

  check(): void {
    this.#validate(this.#items);
  }

  #validate(items: readonly ComposeItem[]): void {
    const owner = this.#ownerPath();
    const names = new Set<string>();
    const directories = new Set<string>();
    for (const item of items) {
      if (!item.name.trim()) throw new Error(`${owner}: compose entry name is required`);
      if (path.resolve(item.directory) === path.resolve(path.dirname(owner)))
        throw new Error(`${owner}: compose entry cannot target its own directory`);
      validateChild({ id: agentsPath(item.directory) });
      if (names.has(item.name)) throw new Error(`${owner}: compose entry already registered: ${item.name}`);
      if (directories.has(item.directory))
        throw new Error(`${owner}: compose directory already registered: ${item.directory}`);
      names.add(item.name);
      directories.add(item.directory);
    }
  }
}
