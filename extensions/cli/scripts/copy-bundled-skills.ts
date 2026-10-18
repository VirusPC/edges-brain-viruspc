import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Copy skill directories (those with SKILL.md) into the npm package. */
export function copyBundledSkills(sourceDir: string, destDir: string): string[] {
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  const names: string[] = [];
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const from = path.join(sourceDir, entry.name);
    if (!existsSync(path.join(from, "SKILL.md"))) continue;
    cpSync(from, path.join(destDir, entry.name), { recursive: true, dereference: true });
    names.push(entry.name);
  }
  names.sort();
  return names;
}

const invoked = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const names = copyBundledSkills(path.resolve(cliRoot, "../skills"), path.join(cliRoot, "skills"));
  console.log(`copied ${names.length} bundled skills`);
}
