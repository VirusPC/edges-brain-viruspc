#!/usr/bin/env node
/**
 * Move Edges-unrelated skills from extensions/skills to shared-extensions/skills.
 *
 * Preview by default. `--apply` writes. Safe to re-run: an already moved
 * skill plans nothing. Source and destination both present is a conflict.
 *
 * Strips per-skill `version` and deletes `CHANGELOG.md`. shared-extensions
 * versions the layer, not each skill.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const UNRELATED_SKILL_NAMES = [
  "paper-10-questions",
  "summarize-ai-article",
  "summarize-ai-article-ultra",
  "weekly-ai-blogs-digest",
  "horizontal-vertical-research",
  "learn-repo",
] as const;

type Action =
  | { kind: "move"; name: string; from: string; to: string }
  | { kind: "conflict"; name: string; from: string; to: string }
  | { kind: "missing"; name: string };

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

function argValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function skillNames(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .filter((name) => existsSync(path.join(root, name, "SKILL.md")))
    .sort();
}

function frontmatterField(text: string, key: string): string | undefined {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return undefined;
  const line = frontmatter[1]!.split(/\r?\n/).find((item) => item.startsWith(`${key}:`));
  return line?.slice(key.length + 1).trim();
}

export function stripVersionField(text: string): string {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return text;
  const frontmatter = text.slice(0, end).replace(/\r?\nversion\s*:\s*[^\r\n]*/, "");
  return frontmatter + text.slice(end);
}

function readName(dir: string): string {
  const text = readFileSync(path.join(dir, "SKILL.md"), "utf8");
  return frontmatterField(text, "name") ?? path.basename(dir);
}

export function planMoves(sourceRoot: string, destRoot: string, names: readonly string[] = UNRELATED_SKILL_NAMES): Action[] {
  return names.map((name) => {
    const from = path.join(sourceRoot, name);
    const to = path.join(destRoot, name);
    const sourceReady = existsSync(path.join(from, "SKILL.md"));
    const destReady = existsSync(path.join(to, "SKILL.md"));
    if (sourceReady && destReady) return { kind: "conflict", name, from, to };
    if (sourceReady) return { kind: "move", name, from, to };
    if (destReady) return { kind: "missing", name };
    return { kind: "missing", name };
  });
}

function duplicateNames(sourceRoot: string, destRoot: string, actions: Action[]): string[] {
  const leaving = new Set(actions.filter((action) => action.kind === "move").map((action) => action.name));
  const names = [
    ...skillNames(sourceRoot).filter((name) => !leaving.has(name)).map((name) => readName(path.join(sourceRoot, name))),
    ...skillNames(destRoot).map((name) => readName(path.join(destRoot, name))),
    ...actions.filter((action) => action.kind === "move").map((action) => readName(action.from)),
  ];
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates].sort();
}

function moveDirectory(from: string, to: string): void {
  mkdirSync(path.dirname(to), { recursive: true });
  try {
    execFileSync("git", ["mv", from, to], { stdio: "pipe" });
  } catch {
    renameSync(from, to);
  }
}

function finishSkill(dir: string): void {
  const skillFile = path.join(dir, "SKILL.md");
  const text = readFileSync(skillFile, "utf8");
  const stripped = stripVersionField(text);
  if (stripped !== text) writeFileSync(skillFile, stripped);
  const changelog = path.join(dir, "CHANGELOG.md");
  if (existsSync(changelog)) rmSync(changelog);
}

export function applyMoves(actions: Action[]): void {
  for (const action of actions) {
    if (action.kind !== "move") continue;
    moveDirectory(action.from, action.to);
    finishSkill(action.to);
  }
}

function runSelfTest(): void {
  const root = mkdtempSync(path.join(tmpdir(), "move-unrelated-skills-"));
  const source = path.join(root, "extensions", "skills");
  const dest = path.join(root, "shared-extensions", "skills");
  mkdirSync(path.join(source, "paper-10-questions"), { recursive: true });
  mkdirSync(path.join(source, "edges-note"), { recursive: true });
  writeFileSync(
    path.join(source, "paper-10-questions", "SKILL.md"),
    "---\nname: paper-10-questions\ndescription: read a paper\nversion: 1.0.0\n---\n\n# Paper\n",
  );
  writeFileSync(path.join(source, "paper-10-questions", "CHANGELOG.md"), "# log\n");
  writeFileSync(
    path.join(source, "edges-note", "SKILL.md"),
    "---\nname: edges-note\ndescription: notes\nversion: 1.2.0\n---\n",
  );
  const preview = planMoves(source, dest, ["paper-10-questions"]);
  if (preview.length !== 1 || preview[0]!.kind !== "move") {
    throw new Error(`expected one move, got ${JSON.stringify(preview)}`);
  }
  applyMoves(preview);
  const moved = readFileSync(path.join(dest, "paper-10-questions", "SKILL.md"), "utf8");
  if (moved.includes("version:")) throw new Error("version field remained");
  if (existsSync(path.join(dest, "paper-10-questions", "CHANGELOG.md"))) throw new Error("changelog remained");
  if (existsSync(path.join(source, "paper-10-questions"))) throw new Error("source remained");
  if (frontmatterField(moved, "name") !== "paper-10-questions") throw new Error("name changed");
  if (readFileSync(path.join(source, "edges-note", "SKILL.md"), "utf8").includes("version:") === false) {
    throw new Error("unrelated skill was stripped");
  }
  const again = planMoves(source, dest, ["paper-10-questions"]).filter((action) => action.kind === "move" || action.kind === "conflict");
  if (again.length !== 0) throw new Error(`expected empty plan, got ${JSON.stringify(again)}`);
  mkdirSync(path.join(source, "paper-10-questions"), { recursive: true });
  writeFileSync(path.join(source, "paper-10-questions", "SKILL.md"), "---\nname: paper-10-questions\n---\n");
  const conflict = planMoves(source, dest, ["paper-10-questions"]);
  if (conflict[0]?.kind !== "conflict") throw new Error("expected conflict");
  rmSync(root, { recursive: true, force: true });
  console.log("ok: self-test passed");
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    runSelfTest();
    return;
  }
  const apply = args.includes("--apply");
  const sourceRoot = path.resolve(argValue(args, "--source") ?? path.join(repoRoot, "extensions", "skills"));
  const destRoot = path.resolve(argValue(args, "--dest") ?? path.join(repoRoot, "shared-extensions", "skills"));
  const actions = planMoves(sourceRoot, destRoot);
  const duplicates = duplicateNames(sourceRoot, destRoot, actions);
  let pending = 0;
  for (const action of actions) {
    if (action.kind === "move") {
      pending += 1;
      console.log(`move ${action.name}: ${path.relative(repoRoot, action.from)} -> ${path.relative(repoRoot, action.to)}`);
    } else if (action.kind === "conflict") {
      pending += 1;
      console.error(`conflict ${action.name}: both ${action.from} and ${action.to} exist`);
    }
  }
  if (duplicates.length) {
    console.error(`duplicate skill names: ${duplicates.join(", ")}`);
    process.exitCode = 1;
  }
  if (actions.some((action) => action.kind === "conflict" || (action.kind === "missing" && !existsSync(path.join(destRoot, action.name, "SKILL.md"))))) {
    for (const action of actions) {
      if (action.kind === "missing" && !existsSync(path.join(destRoot, action.name, "SKILL.md"))) {
        console.error(`missing ${action.name}`);
      }
    }
    process.exitCode = 1;
  }
  if (!pending && !duplicates.length) {
    console.log("No unrelated-skill drift.");
    return;
  }
  if (!apply) {
    console.log(`\n${pending} skill(s) would change. Re-run with --apply to write.`);
    if (process.exitCode) return;
    return;
  }
  if (process.exitCode) return;
  applyMoves(actions);
  console.log(`applied ${actions.filter((action) => action.kind === "move").length} move(s).`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
