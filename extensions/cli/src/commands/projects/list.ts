import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { listProjects, presentListed } from "../../services/projects/service.js";
import { collectRepeat } from "../metadata.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";

const HELP = "See edges projects --help for usage.\n";

export function addProjectListCommand(project: Command, ctx: CliContext): void {
  project
    .command("list")
    .description("List projects reached from the subject system")
    .option("--filter <field=value>", "Repeatable field filter", collectRepeat, [])
    .option("--group-by <field>", "Group filtered projects by one field")
    .action(async (opts: { filter?: string[]; groupBy?: string }) => {
      try {
        const items = await listProjects(ctx.env, { all: ctx.all, super: ctx.super, withComposed: ctx.withComposed });
        ctx.result = succeed(presentListed("projects.list", items, opts));
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
