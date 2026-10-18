import { Command } from "commander";
import type { CliContext } from "../context.js";
import { initScope } from "../services/init/service.js";
import { fail, succeed } from "./result.js";

const HELP = "See edges init --help for usage.\n";

const AFTER_HELP = `
This command does not read --super. Materials always land under <scope>/.harness.

CREATED WHEN NO MODULE IS GIVEN
  AGENTS.md
  memory types: feedback, project, reference
  harness organization lists: notes, projects

NOT CREATED HERE
  tasks (not in the default set; edges tasks init creates only that board)
  user memory, skills (edges skills init adopts skill types), evaluation, and observation
`;

export function addInitCommand(program: Command, ctx: CliContext): void {
  program
    .command("init")
    .description(
      "Initialize AGENTS.md and selected modules. This command does not read --super.",
    )
    .argument("[module...]", "Repeatable module: memory, skills, tasks, notes, or projects")
    .option("--target-dir <directory>", "Explicit target scope (otherwise use --scope or scope discovery)")
    .option("--root-dir <directory>", "Boundary for the scope tree")
    .option("--description <text>", "Description in the parent scope index")
    .option("--memory-types <types...>", "Select memory types: project feedback reference user")
    .option("--skill-types <types...>", "Select skill types: managed referenced")
    .allowExcessArguments(false)
    .addHelpText("after", AFTER_HELP)
    .action(
      async (
        modules: string[],
        options: {
          targetDir?: string;
          rootDir?: string;
          description?: string;
          memoryTypes?: string[];
          skillTypes?: string[];
        },
      ) => {
        try {
          const result = await initScope({ ...options, modules, env: ctx.env });
          ctx.result = succeed({ ...result, command: "init" });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.result = fail("VALIDATION_ERROR", message, HELP);
        }
      },
    );
}
