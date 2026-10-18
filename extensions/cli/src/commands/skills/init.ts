import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { initSkills, SkillsInstallError } from "../../services/skills/service.js";
import { fail, failWithExit, succeed } from "../result.js";

const HELP = "See edges skills init --help for usage.\n";
const AFTER_HELP = `
Tokens after -- are forwarded to skills add.
  edges skills init -- -g -y --agent claude-code
`;

export function addSkillInitCommand(skills: Command, ctx: CliContext): void {
  skills
    .command("init")
    .description("Initialize skill type indexes, install bundled skills, and scope AGENTS.md. Does not read --super.")
    .option("--target-dir <directory>", "Explicit target scope (otherwise use --scope or scope discovery)")
    .option("--root-dir <directory>", "Boundary for the scope tree")
    .option("--description <text>", "Description in the parent scope index")
    .option("--skill-types <types...>", "Select skill types: managed referenced")
    .allowExcessArguments(false)
    .addHelpText("after", AFTER_HELP)
    .action(
      async (options: {
        targetDir?: string;
        rootDir?: string;
        description?: string;
        skillTypes?: string[];
      }) => {
        try {
          const result = await initSkills({
            ...options,
            skillsInstallArgs: ctx.skillsInstallArgs,
            env: ctx.env,
          });
          ctx.result = succeed({ ...result, command: "skills.init" });
        } catch (error) {
          if (error instanceof SkillsInstallError) {
            ctx.result = failWithExit(
              error.exitCode || 1,
              "SKILLS_INSTALL_FAILED",
              error.message,
              HELP,
            );
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          ctx.result = fail("VALIDATION_ERROR", message, HELP);
        }
      },
    );
}
