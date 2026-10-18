import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyBundledSkills } from "../../scripts/copy-bundled-skills.js";

const MOVED_SKILL_NAMES = [
  "paper-10-questions",
  "summarize-ai-article",
  "summarize-ai-article-ultra",
  "weekly-ai-blogs-digest",
  "horizontal-vertical-research",
  "learn-repo",
] as const;

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceSkills = path.resolve(here, "../../../skills");
const sharedSkills = path.resolve(here, "../../../../shared-extensions/skills");
const packageJsonPath = path.resolve(here, "../../package.json");

async function skillDirs(root: string): Promise<string[]> {
  const names = await readdir(root);
  return names
    .filter((name) => existsSync(path.join(root, name, "SKILL.md")))
    .sort();
}

test("copyBundledSkills copies every remaining extensions skill and not the six shared skills", async (t) => {
  const dest = await mkdtemp(path.join(tmpdir(), "edges-bundled-skills-"));
  t.after(() => rm(dest, { recursive: true, force: true }));
  const copied = copyBundledSkills(sourceSkills, dest);
  const expected = await skillDirs(sourceSkills);
  assert.deepEqual(copied, expected);
  assert.ok(expected.length > 0);
  for (const name of expected) {
    assert.equal(existsSync(path.join(dest, name, "SKILL.md")), true, name);
    assert.equal(MOVED_SKILL_NAMES.includes(name as (typeof MOVED_SKILL_NAMES)[number]), false, name);
  }
  for (const name of MOVED_SKILL_NAMES) {
    assert.equal(existsSync(path.join(dest, name)), false, name);
    assert.equal(existsSync(path.join(sharedSkills, name, "SKILL.md")), true, name);
  }
  assert.equal(existsSync(path.join(dest, "README.md")), false);
  assert.equal(existsSync(path.join(dest, "AGENTS.md")), false);
});

test("the published package pins skills@1.7.2 and ships a skills directory", async () => {
  const pkg = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    files: string[];
    engines: { node: string };
    dependencies: Record<string, string>;
  };
  assert.ok(pkg.files.includes("dist"));
  assert.ok(pkg.files.includes("skills"));
  assert.equal(pkg.engines.node, ">=22.20.0");
  assert.equal(pkg.dependencies.skills, "1.7.2");
});
