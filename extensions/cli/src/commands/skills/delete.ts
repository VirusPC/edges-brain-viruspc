import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { deleteSkill } from "../../services/skills/service.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";

const HELP = "See edges skills --help for usage.\n";

export function addSkillDeleteCommand(skill: Command, ctx: CliContext): void {
  skill
    .command("delete")
    .description("Delete one skill")
    .argument("<target>", "SKILL.md path or skill name")
    .action(async (target: string) => {
      try {
        const removed = await deleteSkill(ctx.env, target, { all: ctx.all, super: ctx.super, withComposed: ctx.withComposed });
        ctx.result = succeed({ command: "skills.delete", path: removed.path });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
