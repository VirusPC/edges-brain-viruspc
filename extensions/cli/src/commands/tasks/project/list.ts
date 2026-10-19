import { Command } from "commander";
import type { CliContext } from "../../../context.js";
import { runTasksCommand, succeed } from "../run.js";
import { listProjectsInScope } from "../../../services/tasks/service.js";

export function addProjectListCommand(project: Command, ctx: CliContext): void {
  project
    .command("list")
    .description("List Task Project metadata")
    .option("--json", "Write JSON to stdout (always on)")
    .action(async () => {
      await runTasksCommand(ctx, async (runtime) => {
        const projects = await listProjectsInScope(runtime.location.scopeDir, {
          all: ctx.all === true,
          super: ctx.super === true,
          withComposed: ctx.withComposed === true,
        });
        return succeed({ status: "success", command: "project.list", projects });
      });
    });
}
