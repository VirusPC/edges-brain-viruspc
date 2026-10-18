import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { initTasks } from "../../services/tasks/service.js";
import { fail, succeed } from "../result.js";

const HELP = "See edges tasks init --help for usage.\n";

export function addTaskInitCommand(tasks: Command, ctx: CliContext): void {
  tasks
    .command("init")
    .description("Initialize the tasks board and scope AGENTS.md. Does not read --super.")
    .option("--target-dir <directory>", "Explicit target scope (otherwise use --scope or scope discovery)")
    .option("--root-dir <directory>", "Boundary for the scope tree")
    .option("--description <text>", "Description in the parent scope index")
    .allowExcessArguments(false)
    .action(
      async (options: {
        targetDir?: string;
        rootDir?: string;
        description?: string;
      }) => {
        try {
          const result = await initTasks({ ...options, env: ctx.env });
          ctx.result = succeed({ ...result, command: "tasks.init" });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.result = fail("VALIDATION_ERROR", message, HELP);
        }
      },
    );
}
