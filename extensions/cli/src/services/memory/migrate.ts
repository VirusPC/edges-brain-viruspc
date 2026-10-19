import { isWithinPath, canonicalPath } from '../../utils/filesystem.js';
/** Explicit, journaled legacy migration. All planning is read-only. */
import * as fs from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { assertPrivateIgnored } from "./ignore.js";
import { escapeIndexText, encodeIndexPath } from "../../domain/core/node-content/serialize.js";
import {
  isDirectory,
  isFile,
  isSymlink,
  readText,
  resolveTarget,
  resolveRoot,
  isScope,
  assertScopePath,
  ancestors,
} from "./paths.js";
import {
  layerTypeSpecs,
  parseTypeMeta,
  SEED_TYPE_NAMES,
} from "./types.js";
import {
  AGENTS_FILE_NAME,
  TYPE_INDEX_FILE_NAME,
  legacyTypeIndexRelpath as indexFileName,
  typeIndexRelpath,
} from "./paths.js";
import { ENTRY_NAMES } from "../../domain/config/layout.js";
import { rewriteLayerSurface } from "../../domain/models/node/document.js";
import { frontmatterData, logicalFields } from "../../domain/models/memory/documents.js";
import {
  parseLegacy,
  convertIndex,
  type LegacyType,
} from "./migration-legacy.js";
export { parseLegacy, convertIndex };
export const MIGRATION_JOURNAL = ".project-memory-migration";
export const LINK = /\[([^\]\n]*)\]\(([^)\n]+)\)/g;
export interface FileState {
  kind: "file" | "link";
  data: string;
  mode: number;
}
export interface MigrationOperation {
  source: string;
  target: string;
  before: FileState | null;
  after: FileState;
  originalTarget: FileState | null;
  retire?: { source: string; before: FileState | null }[];
}
export interface MigrationDirectory {
  source: string;
  target: string;
  mode: number;
  originalTargetMode: number | null;
  targetMode: number;
}
export interface MigrationDiagnostic {
  code: string;
  path: string;
  detail: string;
}
export interface MigrationJob {
  operations: MigrationOperation[];
  directories: string[];
  directoryMap: MigrationDirectory[];
  private: string[];
  diagnostics: MigrationDiagnostic[];
  owners: string[];
  legacyOwners: string[];
  sourceDirectoryModes?: Record<string, number>;
  watched?: { owner: string; records: { path: string; sha256: string }[] }[];
  target?: string;
  recursive?: boolean;
  phase?: string;
}
export const present = (p: string) => fs.existsSync(p) || isSymlink(p);
export const mode = (p: string) => fs.statSync(p).mode & 0o7777;
export const equal = isDeepStrictEqual;
export function state(path: string): FileState | null {
  if (!present(path)) return null;
  const s = fs.lstatSync(path);
  if (s.isSymbolicLink())
    return { kind: "link", data: fs.readlinkSync(path), mode: s.mode & 0o7777 };
  if (!s.isFile()) throw new Error(`not-a-regular-file: ${path}`);
  return fileState(fs.readFileSync(path), s.mode & 0o7777);
}
export const fileState = (data: Buffer | string, mode = 0o644): FileState => ({
  kind: "file",
  data: Buffer.from(data).toString("base64"),
  mode,
});
export const decodeState = (value: FileState) =>
  new TextDecoder("utf-8", { fatal: true }).decode(
    Buffer.from(value.data, "base64"),
  );
export const sha = (data: Buffer) =>
  createHash("sha256").update(data).digest("hex");
/** Mutable dirs allow the instance planner to prune repository-specific boundaries. */
export function* walk(
  root: string,
  excludeInstalls = false,
  owned = false,
): Generator<{ base: string; dirs: string[]; files: string[] }> {
  if (!isDirectory(root)) return;
  const dirs: string[] = [],
    files: string[] = [];
  for (const name of fs.readdirSync(root).sort()) {
    const p = join(root, name);
    if (isDirectory(p) && !isSymlink(p)) dirs.push(name);
    else files.push(name);
  }
  for (const name of [...dirs]) {
    const p = join(root, name);
    if (owned && (name === ".git" || present(join(p, ".git"))))
      throw new Error(`nested-git-inside-moving-tree: ${p}`);
    const noise =
      !owned &&
      !root.split("/").includes(".memory") &&
      [MIGRATION_JOURNAL, "node_modules"].includes(name);
    if (
      name === ".git" ||
      noise ||
      (excludeInstalls && name === ".agents") ||
      (!owned && present(join(p, ".git")))
    )
      dirs.splice(dirs.indexOf(name), 1);
  }
  yield { base: root, dirs, files };
  for (const name of dirs)
    yield* walk(join(root, name), excludeInstalls, owned);
}
export function safeAncestors(path: string, root: string) {
  if (!isWithinPath(path, root)) throw new Error(`outside-selected-scope: ${path}`);
  for (const p of ancestors(dirname(path))) {
    if (isSymlink(p)) throw new Error(`symlink-ancestor: ${p}`);
    if (p === root) break;
  }
}
export function rewriteLinks(
  text: string,
  source: string,
  destination: string,
  mapped: (p: string) => string,
): string {
  const tokens =
    /```[\s\S]*?```|~~~[\s\S]*?~~~|\[[^\]\n]*\]\([^)\n]+\)|`+[^`\n]*`+/g;
  return text.replace(tokens, (token) =>
    token.startsWith("[")
      ? token.replace(LINK, (original, label: string, raw: string) => {
          if (/^\w+:|^\/|^#/.test(raw)) return original;
          const mark = raw.indexOf("#"),
            part = mark < 0 ? raw : raw.slice(0, mark),
            fragment = mark < 0 ? "" : raw.slice(mark);
          const old = resolve(dirname(source), decodeURIComponent(part)),
            next = mapped(old);
          if (old === next && dirname(source) === dirname(destination))
            return original;
          const value =
            relative(dirname(destination), next)
              .split("/")
              .map((s) =>
                encodeURIComponent(s).replace(
                  /[!'()*]/g,
                  (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
                ),
              )
              .join("/") + fragment;
          return `[${label === raw ? value : label}](${value})`;
        })
      : token,
  );
}
export function planDirectory(
  source: string,
  target: string,
  root: string,
  priv = false,
): MigrationDirectory {
  safeAncestors(join(target, "placeholder"), root);
  if (present(target) && !isDirectory(target))
    throw new Error(`directory-target-conflict: ${target}`);
  const sourceMode = isDirectory(source) ? mode(source) : 0o700;
  let targetMode = sourceMode;
  if (priv)
    for (const p of ancestors(dirname(source))) {
      if (p === root) break;
      if (isWithinPath(p, root) && isDirectory(p)) targetMode &= mode(p);
    }
  const originalTargetMode = fs.existsSync(target) ? mode(target) : null;
  if (originalTargetMode !== null) targetMode &= originalTargetMode;
  return { source, target, mode: sourceMode, originalTargetMode, targetMode };
}
function validNewScope(scope: string) {
  const harness = join(scope, ".harness");
  if (!present(harness)) return false;
  assertScopePath(harness, scope);
  if (!isDirectory(harness) || !isScope(scope))
    throw new Error(`unrelated-harness-conflict: ${harness}`);
  const specs = layerTypeSpecs(scope),
    text = readText(join(scope, AGENTS_FILE_NAME));
  if (!specs.length || specs.some((s) => !text.includes(`](${s.indexFile})`)))
    throw new Error(`unrelated-harness-conflict: ${harness}`);
  for (const s of specs)
    if (!isFile(join(scope, s.indexFile)) && !s.gitignore)
      throw new Error(`missing-new-index: ${s.indexFile}`);
  for (const child of fs.readdirSync(harness))
    if (
      !["memory", "skills"].includes(child) &&
      !text.includes(`](.harness/${child}/AGENTS.md)`)
    )
      throw new Error(`unrelated-harness-conflict: ${child}`);
  return true;
}
export function inventory(
  owner: string,
  spec: Pick<LegacyType, "name" | "format"> &
    Partial<Pick<LegacyType, "directory" | "flatEntries">>,
): string[] {
  const flat = [...(spec.flatEntries ?? [])];
  const source =
    spec.name === "agent_skills"
      ? join(owner, ".agents/skills")
      : spec.directory!;
  if (!isDirectory(source)) {
    if (spec.name !== "agent_skills" && !present(source)) return flat;
    throw new Error("source unavailable");
  }
  const result: string[] = [],
    seen = new Set<string>();
  for (const name of fs.readdirSync(source).sort()) {
    const child = join(source, name);
    if (isSymlink(child) && !fs.existsSync(child))
      throw new Error("broken source link");
    const path = spec.format === "skills" ? join(child, ENTRY_NAMES.skill) : child;
    if (
      spec.format === "skills"
        ? !(isDirectory(child) && isFile(path))
        : !(
            isFile(child) &&
            name.startsWith(spec.name + "_") &&
            name.endsWith(".md")
          )
    )
      continue;
    const real = canonicalPath(path);
    if (
      spec.name !== "agent_skills" &&
      !isWithinPath(real, canonicalPath(spec.directory!))
    )
      throw new Error(`owned-body-symlink-escape: ${path}`);
    if (!seen.has(real)) {
      seen.add(real);
      result.push(path);
    }
  }
  for (const path of flat)
    if (!result.includes(path)) result.push(path);
  return result;
}
export function referencedDiagnostics(owner: string): MigrationDiagnostic[] {
  try {
    for (const p of inventory(owner, {
      name: "agent_skills",
      format: "skills",
    }))
      readText(p);
    return [];
  } catch {
    return [
      {
        code: "source-scan-incomplete",
        path: join(owner, ".agents/skills"),
        detail:
          "Referenced source unavailable; existing index and adoption preserved. Restore source and run project-memory-doctor.",
      },
    ];
  }
}
function rebuildEntries(
  text: string,
  owner: string,
  spec: LegacyType,
  index: string,
  mapped: (path: string) => string,
) {
  const lines = inventory(owner, spec).map((path) => {
    const f = logicalFields(frontmatterData(readText(path))),
      name =
        spec.format === "skills"
          ? basename(dirname(path))
          : basename(path, ".md");
    return `- [${escapeIndexText(f.title || f.name || name)}](${encodeIndexPath(relative(dirname(index), mapped(path)))}) — ${escapeIndexText(f.description || "缺少 description，请补齐 frontmatter。")}`;
  });
  return text.replace(
    /<!-- project-memory-entries:start -->[\s\S]*?<!-- project-memory-entries:end -->/,
    () =>
      `<!-- project-memory-entries:start -->\n${(lines.length ? lines : ["- 暂无条目。"]).join("\n")}\n<!-- project-memory-entries:end -->`,
  );
}
export function planMigration(target: string, recursive = false): MigrationJob {
  const owners = recursive
    ? [...walk(target, true)]
        .filter(({ base }) => present(join(base, ".memory")))
        .map(({ base }) => base)
    : present(join(target, ".memory"))
      ? [target]
      : [];
  const diagnostics: MigrationDiagnostic[] = [];
  if (!owners.length) {
    if (present(join(target, ".harness"))) validNewScope(target);
    for (const { base } of walk(target, true))
      if (
        (recursive || base === target) &&
        isScope(base) &&
        isFile(join(base, ".harness/skills/referenced/AGENTS.md"))
      )
        diagnostics.push(...referencedDiagnostics(base));
    return {
      operations: [],
      directories: [],
      directoryMap: [],
      private: [],
      diagnostics,
      owners: [],
      legacyOwners: [],
    };
  }
  const types: { owner: string; spec: LegacyType }[] = [],
    mappings: { old: string; next: string }[] = [],
    exact = new Map<string, string>(),
    directories = new Set<string>();
  for (const owner of owners) {
    safeAncestors(join(owner, ".memory"), target);
    if (!isScope(owner))
      throw new Error(`legacy-owner-missing-managed-entry: ${owner}`);
    const current = parseLegacy(owner, { strictUnclassified: false });
    if (validNewScope(owner) && current.some((s) => !s.private))
      throw new Error(`new-layout-only-allows-private-remnants: ${owner}`);
    const memoryRoot = join(owner, ".memory");
    for (const item of current.unclassified ?? []) {
      diagnostics.push({
        code: "unclassified-legacy-path",
        path: item.path,
        detail: item.suggestion,
      });
      const dest = join(
        owner,
        MIGRATION_JOURNAL,
        "unclassified",
        relative(memoryRoot, item.path),
      );
      if (item.kind === "directory") mappings.push({ old: item.path, next: dest });
      else exact.set(item.path, dest);
    }
    for (const spec of current) {
      const indexLeaf = spec.flatRoot ? TYPE_INDEX_FILE_NAME : AGENTS_FILE_NAME;
      const converted = parseTypeMeta(convertIndex("", spec))!,
        planned = join(spec.relativeTarget, indexLeaf),
        expected = spec.flatRoot
          ? typeIndexRelpath(converted.name, spec.module)
          : indexFileName(converted.name),
        official = SEED_TYPE_NAMES.find(
          (n) =>
            (spec.flatRoot ? typeIndexRelpath(n, spec.module) : indexFileName(n)) ===
            planned,
        );
      if (
        (official && official !== converted.name) ||
        (SEED_TYPE_NAMES.includes(converted.name) && planned !== expected)
      )
        throw new Error(`Official type path conflict: ${converted.name}`);
      if (converted.module !== spec.module)
        throw new Error(`Type module disagrees with planned path: ${planned}`);
      if (spec.synthetic)
        diagnostics.push({
          code: "legacy-index-missing",
          path: spec.indexes[0]!,
          detail:
            "Official adoption preserved; index reconstructed only from files present on this machine. No missing body data was invented.",
        });
      mappings.push({
        old: spec.directory,
        next: join(owner, spec.relativeTarget),
      });
      for (const index of spec.indexes)
        exact.set(index, join(owner, spec.relativeTarget, indexLeaf));
      for (const entry of spec.flatEntries)
        exact.set(
          entry,
          join(owner, spec.relativeTarget, basename(entry, ".md"), ENTRY_NAMES.leaf),
        );
      for (const asset of spec.assetDirs)
        mappings.push({
          old: asset.source,
          next: join(
            owner,
            spec.relativeTarget,
            basename(asset.entry, ".md"),
            basename(asset.source),
          ),
        });
      types.push({ owner, spec });
      if (spec.name === "agent_skills")
        diagnostics.push(...referencedDiagnostics(owner));
    }
  }
  mappings.sort((a, b) => b.old.split("/").length - a.old.split("/").length);
  function mapped(path: string): string {
    path = resolve(path);
    let result = exact.get(path) ?? path;
    if (result === path) {
      const mapping = mappings.find((m) => isWithinPath(path, m.old));
      if (mapping) result = join(mapping.next, relative(mapping.old, path));
    }
    return result !== path ? mapped(result) : result;
  }
  const bySource = new Map<string, string>(),
    indexSpecs = new Map(
      types.flatMap((t) => t.spec.indexes.map((i) => [i, t] as const)),
    ),
    privateDirs = types
      .filter((t) => t.spec.private)
      .map((t) => mapped(join(t.owner, t.spec.relativeTarget)));
  for (const owner of owners) {
    for (const { base, files } of walk(join(owner, ".memory"), false, true)) {
      if (!owners.includes(base) && present(join(base, ".memory")))
        throw new Error(`nested-moving-scope-requires-recursive: ${base}`);
      directories.add(base);
      for (const name of files)
        bySource.set(join(base, name), mapped(join(base, name)));
    }
    bySource.set(join(owner, AGENTS_FILE_NAME), mapped(join(owner, AGENTS_FILE_NAME)));
  }
  for (const { base, files } of walk(target, true))
    for (const name of files) {
      const path = join(base, name);
      if (isSymlink(path)) {
        const old = resolve(dirname(path), fs.readlinkSync(path));
        if (mapped(old) !== old) bySource.set(path, mapped(path));
      }
    }
  for (const owner of owners) {
    const installed = join(owner, ".agents/skills");
    if (
      isSymlink(join(owner, ".agents")) ||
      isSymlink(installed) ||
      !isDirectory(installed)
    )
      continue;
    for (const name of fs.readdirSync(installed)) {
      const path = join(installed, name);
      if (isSymlink(path)) {
        const old = resolve(dirname(path), fs.readlinkSync(path));
        if (mapped(old) !== old) bySource.set(path, mapped(path));
      }
    }
  }
  for (const [index, { spec }] of indexSpecs)
    if (spec.synthetic) bySource.set(index, mapped(index));
  const operations: MigrationOperation[] = [],
    destinations = new Map<string, FileState>();
  for (const [source, dest] of [...bySource].sort(([a], [b]) =>
    a.localeCompare(b, "en"),
  )) {
    safeAncestors(source, target);
    safeAncestors(dest, target);
    const before = state(source),
      entry = indexSpecs.get(source),
      initial = entry?.spec.synthetic
        ? fileState(
            `# ${entry.spec.name}\n\n<!-- project-memory-entries:start -->\n- 暂无条目。\n<!-- project-memory-entries:end -->\n`,
          )
        : before!;
    let after = { ...initial };
    if (initial.kind === "link")
      after.data = relative(
        dirname(dest),
        mapped(resolve(dirname(source), initial.data)),
      );
    else if (
      extname(source) === ".md" &&
      !relative(target, source).split("/").includes(".agents")
    ) {
      let text: string | undefined;
      try {
        text = decodeState(initial);
      } catch {}
      if (text !== undefined) {
        const rebuild =
          entry &&
          (entry.spec.name !== "agent_skills" ||
            !referencedDiagnostics(entry.owner).length);
        if (entry) text = convertIndex(text, entry.spec);
        if (
          entry?.spec.flatRoot &&
          !text.includes("<!-- project-memory-entries:start -->")
        )
          text +=
            "\n<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->\n";
        // Obsolete derived links need not be valid URLs. Discard them before
        // rewriting authored links, only when the source inventory is available.
        if (rebuild)
          text = text.replace(
            /<!-- project-memory-entries:start -->[\s\S]*?<!-- project-memory-entries:end -->/,
            "<!-- project-memory-entries:start -->\n<!-- project-memory-entries:end -->",
          );
        if (
          basename(source) === ENTRY_NAMES.skill &&
          types.some(
            (t) =>
              t.spec.name === "skills" &&
              dirname(dirname(source)) === t.spec.directory,
          )
        ) {
          text = text.replace(
            /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,
            (header) =>
              header.replace(
                /^(\s*(?:edges-type|type):\s*)(["']?)skills\2(\s*)$/gm,
                "$1$2managed$2$3",
              ),
          );
        }
        text = rewriteLinks(text, source, dest, mapped);
        // Render derived rows after rewriting source links: display text must not
        // be interpreted as another link, and targets use their final locations.
        if (rebuild)
          text = rebuildEntries(text, entry.owner, entry.spec, dest, mapped);
        if (rebuild && entry.spec.flatRoot)
          text = text.replace(
            /<!-- project-memory-entries:start -->\r?\n([\s\S]*?)<!-- project-memory-entries:end -->/,
            (_match, body: string) =>
              `<!-- project-entries-local:start -->\n## 本层内容\n\n${body.trim()}\n<!-- project-entries-local:end -->`,
          );
        if (
          basename(source) === AGENTS_FILE_NAME &&
          owners.includes(dirname(source))
        ) {
          for (const { owner, spec } of types) {
            if (owner !== dirname(source)) continue;
            const rel = relative(
              dirname(dest),
              join(
                owner,
                spec.relativeTarget,
                spec.flatRoot ? TYPE_INDEX_FILE_NAME : AGENTS_FILE_NAME,
              ),
            );
            if (!text.includes(`](${rel})`)) {
              const marker: string = text.includes("<!-- project-memory-local:end -->")
                ? "<!-- project-memory-local:end -->"
                : "<!-- project-harness-local:end -->";
              if (!text.includes(marker))
                throw new Error(`missing-local-adoption-block: ${source}`);
              text = text.replace(
                marker,
                `- [${spec.newName}](${rel}) — ${spec.fields.description ?? spec.newName}\n${marker}`,
              );
            }
          }
          if (types.some((item) => item.owner === dirname(source) && item.spec.flatRoot))
            text = rewriteLayerSurface(text).replace(
              /[ \t]*<!-- project-memory-auto:start -->[\s\S]*?<!-- project-memory-auto:end -->[ \t]*(?:\r?\n)?/g,
              "",
            );
        }
        after = fileState(text, initial.mode);
      }
    }
    if (source === dest && equal(before, after)) continue;
    if (destinations.has(dest) && !equal(destinations.get(dest), after))
      throw new Error(`target-map-collision: ${dest}`);
    destinations.set(dest, after);
    const existing = state(dest);
    if (dest !== source && existing && !equal(existing, after))
      throw new Error(`target-content-conflict: ${dest}`);
    operations.push({
      source,
      target: dest,
      before,
      after,
      originalTarget: existing,
    });
  }
  for (const owner of owners)
    for (const match of readText(join(owner, AGENTS_FILE_NAME)).matchAll(LINK)) {
      const raw = match[2]!;
      if (raw.startsWith(".memory/")) {
        const old = resolve(owner, raw);
        if (mapped(old) === old)
          throw new Error(`unresolved-legacy-adoption: ${old}`);
      }
    }
  const directoryMap: MigrationDirectory[] = [];
  for (const source of [...directories].sort()) {
    if (basename(source) === ".memory") continue;
    const dest = mapped(source);
    directoryMap.push(
      planDirectory(
        source,
        dest,
        target,
        privateDirs.some((p) => isWithinPath(dest, p)),
      ),
    );
  }
  for (const { owner, spec } of types) {
    const dest = mapped(join(owner, spec.relativeTarget));
    if (spec.private && !directoryMap.some((d) => d.target === dest))
      directoryMap.push(planDirectory(spec.directory, dest, target, true));
  }
  const watched: NonNullable<MigrationJob["watched"]> = [];
  for (const { owner, spec } of types) {
    if (spec.name !== "agent_skills" || referencedDiagnostics(owner).length)
      continue;
    const records = inventory(owner, spec).map((path) => {
      const op = operations.find((op) => op.source === canonicalPath(path));
      return {
        path: mapped(path),
        sha256: sha(
          op?.after.kind === "file"
            ? Buffer.from(op.after.data, "base64")
            : fs.readFileSync(path),
        ),
      };
    });
    watched.push({ owner: mapped(owner), records });
  }
  return {
    sourceDirectoryModes: Object.fromEntries(
      [...directories].map((p) => [p, mode(p)]),
    ),
    watched,
    directoryMap,
    legacyOwners: owners,
    operations,
    directories: [...directories].sort(
      (a, b) => b.split("/").length - a.split("/").length,
    ),
    private: privateDirs,
    diagnostics,
    owners: owners.map(mapped),
  };
}
export function writeState(path: string, value: FileState) {
  fs.mkdirSync(dirname(path), { recursive: true });
  if (value.kind === "link") {
    if (present(path)) fs.unlinkSync(path);
    fs.symlinkSync(value.data, path);
    return;
  }
  const temp = join(dirname(path), `.migration-${randomUUID()}`);
  try {
    const fd = fs.openSync(temp, "wx", 0o600);
    try {
      fs.writeFileSync(fd, Buffer.from(value.data, "base64"));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.chmodSync(temp, value.mode);
    fs.renameSync(temp, path);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}
export function saveJournal(path: string, data: unknown) {
  writeState(path, fileState(JSON.stringify(data), 0o600));
}
/** Check real Git precedence before journals, staging files, or private copies exist. */
export function assertMigrationIgnores(
  root: string,
  privateDirectories: readonly string[],
  destinations: readonly string[],
  journal: string,
) {
  const sensitive = destinations.filter((path) =>
    privateDirectories.some((directory) => isWithinPath(path, directory)),
  );
  const directories = new Set([
    dirname(journal),
    ...privateDirectories,
    ...sensitive.map(dirname),
  ]);
  const paths = [journal, ...sensitive];
  for (const path of [...paths, ...directories]) safeAncestors(path, root);
  assertPrivateIgnored(root, paths, [...directories]);
}
function ignoreBeforeCopy(target: string, job: MigrationJob) {
  const ignore = join(target, ".gitignore");
  safeAncestors(ignore, target);
  if (isSymlink(ignore)) throw new Error("gitignore-is-symlink");
  const existing = fs.existsSync(ignore) ? readText(ignore) : "",
    rules = [
      `/${MIGRATION_JOURNAL}/`,
      ...job.private.map((p) => `/${relative(target, p)}/`),
    ],
    missing = rules.filter((r) => !existing.split(/\r?\n/).includes(r));
  if (missing.length)
    writeState(
      ignore,
      fileState(
        `${existing.trimEnd()}\n\n# Private Project Memory migration\n${missing.join("\n")}\n`,
        fs.existsSync(ignore) ? mode(ignore) : 0o644,
      ),
    );
  assertMigrationIgnores(
    target,
    job.private,
    job.operations.map((op) => op.target),
    join(target, MIGRATION_JOURNAL, "journal.json"),
  );
}
function validateSourceInventory(job: MigrationJob) {
  const sources = new Set(
      job.operations.filter((o) => o.source !== o.target).map((o) => o.source),
    ),
    dirs = new Set(job.directories);
  for (const owner of job.legacyOwners ?? [])
    for (const { base, files } of walk(join(owner, ".memory"), false, true)) {
      if (!dirs.has(base))
        throw new Error(`source-directory-added-before-retirement: ${base}`);
      for (const name of files)
        if (!sources.has(join(base, name)))
          throw new Error(
            `source-added-before-retirement: ${join(base, name)}`,
          );
    }
}
export function preflightMigration(target: string, job: MigrationJob) {
  for (const directory of [
    ...job.directories,
    ...(job.legacyOwners ?? []),
    ...job.owners,
  ])
    safeAncestors(join(directory, "placeholder"), target);
  validateSourceInventory(job);
  if (job.operations.length && !job.sourceDirectoryModes)
    throw new Error(
      "journal-directory-permissions-missing: review legacy journal before recovery",
    );
  for (const [raw, expected] of Object.entries(
    job.sourceDirectoryModes ?? {},
  )) {
    safeAncestors(join(raw, "placeholder"), target);
    if (present(raw) && (!isDirectory(raw) || mode(raw) !== expected))
      throw new Error(`resume-source-directory-mode-changed: ${raw}`);
  }
  for (const item of job.directoryMap ?? []) {
    safeAncestors(join(item.target, "placeholder"), target);
    if (present(item.target) && !isDirectory(item.target))
      throw new Error(`directory-target-conflict: ${item.target}`);
    const actual = fs.existsSync(item.target) ? mode(item.target) : null,
      allowed = ["copied", "validated"].includes(job.phase ?? "")
        ? [item.targetMode]
        : [item.originalTargetMode, item.targetMode];
    if (!allowed.includes(actual as number))
      throw new Error(`resume-target-directory-mode-changed: ${item.target}`);
  }
  for (const op of job.operations) {
    safeAncestors(op.source, target);
    safeAncestors(op.target, target);
    const src = state(op.source),
      dst = state(op.target);
    if (
      op.source === op.target
        ? !equal(src, op.before) && !equal(src, op.after)
        : src !== null && !equal(src, op.before)
    )
      throw new Error(`resume-source-edited: ${op.source}`);
    if (
      !(
        op.source !== op.target
          ? [op.originalTarget, op.after]
          : [op.before, op.after]
      ).some((v) => equal(dst, v))
    )
      throw new Error(`resume-target-edited: ${op.target}`);
    if (op.before && src === null && !equal(dst, op.after))
      throw new Error(`resume-source-and-target-missing: ${op.source}`);
  }
  for (const p of job.private) safeAncestors(join(p, AGENTS_FILE_NAME), target);
  const ignore = join(target, ".gitignore");
  if (present(ignore) && (isSymlink(ignore) || !isFile(ignore)))
    throw new Error("unsafe-gitignore");
}
export function validateMigration(target: string, job: MigrationJob) {
  preflightMigration(target, job);
  for (const watch of job.watched ?? []) {
    const records = inventory(watch.owner, {
      name: "agent_skills",
      format: "skills",
    }).map((path) => ({ path, sha256: sha(fs.readFileSync(path)) }));
    if (!equal(records, watch.records))
      throw new Error(
        `referenced-source-changed-before-retirement: ${watch.owner}`,
      );
  }
  validateSourceInventory(job);
  for (const op of job.operations)
    if (!equal(state(op.target), op.after))
      throw new Error(`copy-validation-failed: ${op.target}`);
  for (const owner of job.owners) {
    const text = readText(join(owner, AGENTS_FILE_NAME));
    for (const spec of layerTypeSpecs(owner)) {
      if (!text.includes(`](${spec.indexFile})`))
        throw new Error(`unregistered-migrated-type: ${spec.indexFile}`);
      const index = join(owner, spec.indexFile);
      if (!isFile(index))
        throw new Error(`missing-migrated-index: ${spec.indexFile}`);
      for (const match of readText(index).matchAll(LINK)) {
        const raw = match[2]!.split("#")[0]!;
        if (!raw || /^\w+:|^\//.test(raw)) continue;
        const linked = resolve(dirname(index), decodeURIComponent(raw));
        if (
          job.operations.some((op) => op.target === linked) &&
          !present(linked)
        )
          throw new Error(`missing-mapped-reference: ${linked}`);
      }
    }
  }
}
export interface MigrateMemoryOptions {
  targetDir: string;
  rootDir?: string;
  recursive?: boolean;
  dryRun?: boolean;
}
export function migrateMemory(options: MigrateMemoryOptions) {
  const target = resolveTarget(options.targetDir),
    recursive = options.recursive ?? false,
    dryRun = options.dryRun ?? false;
  resolveRoot(target, options.rootDir);
  const journalDir = join(target, MIGRATION_JOURNAL),
    journal = join(journalDir, "journal.json");
  if (
    (fs.existsSync(journalDir) &&
      (!isDirectory(journalDir) || !isFile(journal))) ||
    isSymlink(journalDir) ||
    isSymlink(journal)
  )
    throw new Error("unsafe-journal-path");
  let stored: MigrationJob | undefined, job: MigrationJob | undefined;
  if (fs.existsSync(journal)) {
    stored = JSON.parse(readText(journal)) as MigrationJob;
    if (stored.target !== target) throw new Error("journal-target-mismatch");
    if (stored.phase !== "done") {
      if (stored.recursive !== recursive)
        throw new Error("resume-with-original-recursive-option");
      job = stored;
    }
  }
  if (!job) {
    job = planMigration(target, recursive);
    if (stored && !job.operations.length)
      job.diagnostics.push(
        ...stored.diagnostics.filter(
          (d) => d.code !== "source-scan-incomplete",
        ),
      );
    Object.assign(job, { target, recursive, phase: "planned" });
  }
  preflightMigration(target, job);
  const output = {
    ok: true,
    status: dryRun
      ? "dry-run"
      : job.diagnostics.length
        ? "unchanged-incomplete"
        : "unchanged",
    complete: !job.diagnostics.length,
    pathMap: job.operations.map(({ source, target }) => ({ source, target })),
    directoryMap: (job.directoryMap ?? []).map(({ source, target }) => ({
      source,
      target,
    })),
    diagnostics: job.diagnostics,
  };
  if (dryRun || !job.operations.length) return output;
  ignoreBeforeCopy(target, job);
  fs.mkdirSync(journalDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(journalDir, 0o700);
  saveJournal(journal, job);
  for (const item of [...job.directoryMap].sort(
    (a, b) => a.target.split("/").length - b.target.split("/").length,
  )) {
    fs.mkdirSync(item.target, { recursive: true, mode: item.targetMode });
    fs.chmodSync(item.target, item.targetMode);
  }
  for (const op of job.operations)
    if (!equal(state(op.target), op.after)) writeState(op.target, op.after);
  job.phase = "copied";
  saveJournal(journal, job);
  validateMigration(target, job);
  job.phase = "validated";
  saveJournal(journal, job);
  for (const op of job.operations)
    if (op.source !== op.target && present(op.source)) {
      if (!equal(state(op.source), op.before))
        throw new Error(`source-edited-before-retirement: ${op.source}`);
      fs.unlinkSync(op.source);
    }
  for (const p of job.directories)
    if (isDirectory(p) && !isSymlink(p)) fs.rmdirSync(p);
  job.phase = "done";
  saveJournal(journal, job);
  output.status = job.diagnostics.length ? "migrated-incomplete" : "migrated";
  return output;
}
