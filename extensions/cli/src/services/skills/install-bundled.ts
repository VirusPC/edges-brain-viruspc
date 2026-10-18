import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VERCEL_SKILLS_VERSION = "1.7.2";

export class SkillsInstallError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number) {
    super(message);
    this.name = "SkillsInstallError";
    this.exitCode = exitCode;
  }
}

export type BundledSkillsSpawn = (
  command: string,
  args: readonly string[],
  options: { stdio: "inherit" },
) => Promise<number>;

let spawnForTests: BundledSkillsSpawn | undefined;
let refuseRealSpawn = false;

export function setBundledSkillsSpawnForTests(spawnImpl: BundledSkillsSpawn | undefined): void {
  spawnForTests = spawnImpl;
}

/** Test preload calls this. It is in-process only, so a spawned CLI is unaffected. */
export function refuseRealBundledSkillsSpawnForTests(): void {
  refuseRealSpawn = true;
}

/** `skills add <dir> --skill '*'`, then the caller's tokens unchanged. */
export function skillsAddArgs(skillsDir: string, forwarded: readonly string[]): string[] {
  return ["add", skillsDir, "--skill", "*", ...forwarded];
}

function packageRootFrom(start: string): string {
  let dir = start;
  for (;;) {
    const pkgPath = path.join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
      if (pkg.name === "@viruspc/edges") return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new SkillsInstallError(
        `skills@${VERCEL_SKILLS_VERSION} could not be started: package root not found`,
        1,
      );
    }
    dir = parent;
  }
}

function directoryHasSkill(dir: string): boolean {
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { withFileTypes: true }).some(
    (entry) => entry.isDirectory() && existsSync(path.join(dir, entry.name, "SKILL.md")),
  );
}

/**
 * Skills shipped with this package. One path, chosen from where this file lives:
 * built or installed code (`dist/`) reads `<packageRoot>/skills`;
 * source (`src/`, tsx) reads the repo tree `extensions/skills`.
 * A stale `extensions/cli/skills/` build copy is never consulted.
 */
export function resolveBundledSkillsDir(moduleUrl: string = import.meta.url): string {
  const moduleDir = path.dirname(fileURLToPath(moduleUrl));
  const root = packageRootFrom(moduleDir);
  const relativeToPackage = path.relative(root, moduleDir);
  const fromBuiltPackage =
    relativeToPackage === "dist" || relativeToPackage.startsWith(`dist${path.sep}`);
  const dir = fromBuiltPackage ? path.resolve(root, "skills") : path.resolve(root, "..", "skills");
  if (!directoryHasSkill(dir)) {
    throw new SkillsInstallError(
      `skills@${VERCEL_SKILLS_VERSION} could not be started: bundled skills directory not found`,
      1,
    );
  }
  return dir;
}

function resolveSkillsBin(): string {
  const require = createRequire(fileURLToPath(import.meta.url));
  const pkgPath = require.resolve("skills/package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    bin?: string | Record<string, string>;
  };
  const relativeBin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.skills;
  if (!relativeBin) {
    throw new SkillsInstallError(
      `skills@${VERCEL_SKILLS_VERSION} could not be started: package has no bin`,
      1,
    );
  }
  return path.join(path.dirname(pkgPath), relativeBin);
}

function defaultSpawn(
  command: string,
  args: readonly string[],
  options: { stdio: "inherit" },
): Promise<number> {
  if (refuseRealSpawn) {
    return Promise.reject(
      new SkillsInstallError("refusing to spawn the real skills installer under test", 1),
    );
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { stdio: options.stdio });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

export async function installBundledSkills(forwarded: readonly string[]): Promise<void> {
  let bin: string;
  let skillsDir: string;
  try {
    bin = resolveSkillsBin();
    skillsDir = resolveBundledSkillsDir();
  } catch (error) {
    if (error instanceof SkillsInstallError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new SkillsInstallError(`skills@${VERCEL_SKILLS_VERSION} could not be started: ${message}`, 1);
  }
  const spawnImpl = spawnForTests ?? defaultSpawn;
  let code: number;
  try {
    code = await spawnImpl(process.execPath, [bin, ...skillsAddArgs(skillsDir, forwarded)], {
      stdio: "inherit",
    });
  } catch (error) {
    if (error instanceof SkillsInstallError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new SkillsInstallError(`skills@${VERCEL_SKILLS_VERSION} could not be started: ${message}`, 1);
  }
  if (code !== 0) {
    throw new SkillsInstallError(`skills@${VERCEL_SKILLS_VERSION} add exited ${code}`, code);
  }
}
