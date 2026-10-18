import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { listSkills, presentListed } from "../../services/skills/service.js";
import { collectRepeat } from "../metadata.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";

const HELP = "See edges skills --help for usage.\n";

export function addSkillListCommand(skill: Command, ctx: CliContext): void {
  skill
    .command("list")
    .description("List skills reached by scope traversal")
    .option("--filter <field=value>", "Repeatable field filter", collectRepeat, [])
    .option("--group-by <field>", "Group filtered skills by one field")
    .action(async (opts: { filter?: string[]; groupBy?: string }) => {
      try {
        const items = await listSkills(ctx.env, { all: ctx.all, super: ctx.super, withComposed: ctx.withComposed });
        ctx.result = succeed(presentListed("skills.list", items, opts));
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
