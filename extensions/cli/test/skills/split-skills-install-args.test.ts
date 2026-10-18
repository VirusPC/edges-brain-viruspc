import test from "node:test";
import assert from "node:assert/strict";
import { splitSkillsInstallArgs } from "../../src/services/skills/split-skills-install-args.js";

test("edges init a b -- x keeps modules a b and forwards only x", () => {
  assert.deepEqual(splitSkillsInstallArgs(["init", "a", "b", "--", "x"]), {
    argv: ["init", "a", "b"],
    skillsInstallArgs: ["x"],
  });
});

test("edges init -- -y --agent * does not treat those tokens as modules", () => {
  assert.deepEqual(splitSkillsInstallArgs(["init", "--", "-y", "--agent", "*"]), {
    argv: ["init"],
    skillsInstallArgs: ["-y", "--agent", "*"],
  });
});

test("edges skills init forwards tokens after -- in order", () => {
  assert.deepEqual(
    splitSkillsInstallArgs(["--scope", "/tmp", "skills", "init", "--", "-g", "-y", "--agent", "claude-code"]),
    {
      argv: ["--scope", "/tmp", "skills", "init"],
      skillsInstallArgs: ["-g", "-y", "--agent", "claude-code"],
    },
  );
});

test("commands other than init keep -- and the tokens after it", () => {
  const argv = ["skills", "list", "--", "nope"];
  assert.deepEqual(splitSkillsInstallArgs(argv), { argv, skillsInstallArgs: [] });
});

test("init without -- forwards nothing", () => {
  assert.deepEqual(splitSkillsInstallArgs(["--scope", "/tmp", "init", "notes"]), {
    argv: ["--scope", "/tmp", "init", "notes"],
    skillsInstallArgs: [],
  });
});
