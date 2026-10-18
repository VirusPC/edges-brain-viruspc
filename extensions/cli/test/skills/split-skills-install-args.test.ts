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

test("the first literal -- splits even when the command is not init", () => {
  assert.deepEqual(splitSkillsInstallArgs(["skills", "list", "--", "nope"]), {
    argv: ["skills", "list"],
    skillsInstallArgs: ["nope"],
  });
});

test("multi-value options before -- stay with the command in order", () => {
  assert.deepEqual(
    splitSkillsInstallArgs(["init", "--memory-types", "project", "feedback", "--", "-y", "--agent", "*"]),
    {
      argv: ["init", "--memory-types", "project", "feedback"],
      skillsInstallArgs: ["-y", "--agent", "*"],
    },
  );
  assert.deepEqual(
    splitSkillsInstallArgs(["--scope", "/tmp", "skills", "init", "--skill-types", "managed", "referenced", "--", "-g"]),
    {
      argv: ["--scope", "/tmp", "skills", "init", "--skill-types", "managed", "referenced"],
      skillsInstallArgs: ["-g"],
    },
  );
});

test("init without -- forwards nothing", () => {
  assert.deepEqual(splitSkillsInstallArgs(["--scope", "/tmp", "init", "notes"]), {
    argv: ["--scope", "/tmp", "init", "notes"],
    skillsInstallArgs: [],
  });
});
