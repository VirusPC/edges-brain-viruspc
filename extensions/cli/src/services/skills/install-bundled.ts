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

export function setBundledSkillsSpawnForTests(spawnImpl: BundledSkillsSpawn | undefined): void {
  spawnForTests = spawnImpl;
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

/** Absolute path of the skills directory shipped in this package, or the repo source tree. */
export function resolveBundledSkillsDir(moduleUrl: string = import.meta.url): string {
  const root = packageRootFrom(path.dirname(fileURLToPath(moduleUrl)));
  const packed = path.join(root, "skills");
  if (directoryHasSkill(packed)) return path.resolve(packed);
  const source = path.resolve(root, "../skills");
  if (directoryHasSkill(source)) return source;
  throw new SkillsInstallError(
    `skills@${VERCEL_SKILLS_VERSION} could not be started: bundled skills directory not found`,
    1,
  );
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
    const message = error instanceof Error ? error.message : String(error);
    throw new SkillsInstallError(`skills@${VERCEL_SKILLS_VERSION} could not be started: ${message}`, 1);
  }
  if (code !== 0) {
    throw new SkillsInstallError(`skills@${VERCEL_SKILLS_VERSION} add exited ${code}`, code);
  }
}
