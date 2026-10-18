import {
  refuseRealBundledSkillsSpawnForTests,
  setBundledSkillsSpawnForTests,
} from "../src/services/skills/install-bundled.js";

/** Unit tests must not execute vercel skills or write the developer home directory. */
export function restoreBundledSkillsSpawnForTests(): void {
  setBundledSkillsSpawnForTests(async () => 0);
}

refuseRealBundledSkillsSpawnForTests();

restoreBundledSkillsSpawnForTests();
