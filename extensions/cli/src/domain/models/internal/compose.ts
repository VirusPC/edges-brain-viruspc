import path from "node:path";
import { homedir } from "node:os";
import { ENTRY_NAMES } from "../layout.js";

const REMOTE = /(?:^|\s)remote:\s*(\S+)/;

/** One composed repository registered in an AGENTS.md Compose block. */
export interface ComposeEntry {
  /** Absolute directory the checkout occupies. */
  directory: string;
  /** Absolute path of that directory's AGENTS.md. Traverse loads this id. */
  id: string;
  /** Path as written in the Compose block, relative to the owning AGENTS.md when possible. */
  href: string;
  name: string;
  description?: string;
  remote?: string;
}

export interface ComposeRecord {
  directory: string;
  href: string;
  name: string;
  description?: string;
  remote?: string;
  /** Suffix as written after the link, kept so an unchanged block round-trips. */
  authored?: string;
}

export function readComposeSuffix(suffix: string | undefined): {
  description?: string;
  remote?: string;
} {
  if (!suffix) return {};
  const match = REMOTE.exec(suffix);
  if (!match) return { description: suffix };
  const remote = match[1];
  const text = `${suffix.slice(0, match.index)} ${suffix.slice(match.index + match[0].length)}`
    .replace(/\s+/g, " ")
    .trim();
  return { remote, ...(text ? { description: text } : {}) };
}

export function sameComposeSuffix(
  authored: string,
  description?: string,
  remote?: string,
): boolean {
  const parsed = readComposeSuffix(authored);
  return parsed.description === description && parsed.remote === remote;
}

export function writeComposeSuffix(
  description?: string,
  remote?: string,
): string | undefined {
  const text = description?.trim();
  const url = remote?.trim();
  if (text && url) return `${text} remote: ${url}`;
  if (url) return `remote: ${url}`;
  return text || undefined;
}

export function resolveComposeDirectory(agentsFile: string, href: string): string {
  let value = href.trim();
  if (value === "~") value = homedir();
  else if (value.startsWith("~/")) value = path.join(homedir(), value.slice(2));
  if (
    /^[a-z][a-z\d+.-]*:/i.test(value) ||
    value.startsWith("#") ||
    value.startsWith("//")
  )
    throw new Error(
      `${agentsFile}: compose entry must be a local directory: ${href}`,
    );
  const pathname = value.split(/[?#]/, 1)[0] ?? "";
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new Error(`${agentsFile}: invalid encoded compose path ${href}`);
  }
  if (!decoded)
    throw new Error(`${agentsFile}: compose entry path is empty`);
  return path.resolve(path.dirname(agentsFile), decoded);
}

export function composeAgentsPath(directory: string): string {
  return path.resolve(directory, ENTRY_NAMES.internal);
}

export function toComposeEntry(record: ComposeRecord): ComposeEntry {
  return {
    directory: record.directory,
    id: composeAgentsPath(record.directory),
    href: record.href,
    name: record.name,
    ...(record.description ? { description: record.description } : {}),
    ...(record.remote ? { remote: record.remote } : {}),
  };
}
