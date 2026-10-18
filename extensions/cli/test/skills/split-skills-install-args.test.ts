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

test("commands other than init keep `--` and the tokens after it", () => {
  const argv = ["skills", "list", "--", "nope"];
  assert.deepEqual(splitSkillsInstallArgs(argv), { argv: [...argv], skillsInstallArgs: [] });
});

test("skills get keeps the target after --", () => {
  const argv = ["skills", "get", "--", "edges-note"];
  assert.deepEqual(splitSkillsInstallArgs(argv), { argv: [...argv], skillsInstallArgs: [] });
});

test("notes get keeps a path after --", () => {
  const argv = ["--scope", "/tmp", "notes", "get", "--", "-weird/INDEX.md"];
  assert.deepEqual(splitSkillsInstallArgs(argv), { argv: [...argv], skillsInstallArgs: [] });
});

test("a non-init option whose value is literally -- stays in argv", () => {
  const argv = ["notes", "create", "--title", "--", "--body", "kept"];
  assert.deepEqual(splitSkillsInstallArgs(argv), { argv: [...argv], skillsInstallArgs: [] });
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
